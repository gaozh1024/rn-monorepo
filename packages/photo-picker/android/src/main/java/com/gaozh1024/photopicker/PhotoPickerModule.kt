package com.gaozh1024.photopicker

import android.content.ActivityNotFoundException
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.ext.SdkExtensions
import android.provider.MediaStore
import android.provider.OpenableColumns
import androidx.activity.result.contract.ActivityResultContracts
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.activityresult.AppContextActivityResultFallbackCallback
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.security.MessageDigest
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

private class PickerException(
  code: String,
  message: String,
  cause: Throwable? = null,
) : CodedException(code, message, cause)

class PhotoPickerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val pickerCacheDirectory: File
    get() = File(appContext.cacheDirectory, "photo-picker")

  private lateinit var pickerLauncher: AppContextActivityResultLauncher<PhotoPickerContractOptions, PhotoPickerContractResult>
  private val pickerInFlight = AtomicBoolean(false)

  override fun definition() = ModuleDefinition {
    Name("PhotoPickerModule")

    RegisterActivityContracts {
      pickerLauncher = registerForActivityResult(
        PhotoPickerContract(),
        AppContextActivityResultFallbackCallback { _, _ ->
          // The original JS coroutine cannot survive process/context replacement,
          // but the restored launcher must not leave this module permanently busy.
          pickerInFlight.set(false)
        },
      )
    }

    AsyncFunction("pickMedia") Coroutine { options: Map<String, Any?>? ->
      if (!pickerInFlight.compareAndSet(false, true)) {
        throw PickerException("PICKER_BUSY", "A media picker request is already in progress")
      }

      try {
        val normalized = normalizeOptions(options)
        val plan = resolvePlan(normalized)
        if (plan.isEmpty()) {
          throw PickerException(
            "PICKER_UNAVAILABLE",
            "No media picker candidate can serve this request " +
              "(preference=${normalized.preference}, allowDocumentFallback=${normalized.allowDocumentFallback})",
          )
        }

        // Bounded fallback: each candidate is launched at most once, and only a
        // synchronous pre-display failure moves to the next candidate. Once an
        // activity is shown, cancellation or read errors terminate the request.
        var lastLaunchFailure: PickerException? = null
        for (candidate in plan) {
          val request = buildRequest(normalized, candidate)
          val input = request.toContractOptions()
          val result = try {
            pickerLauncher.launch(input)
          } catch (error: ActivityNotFoundException) {
            lastLaunchFailure = launchFailure(candidate, "Unable to launch the resolved media picker", error)
            continue
          } catch (error: SecurityException) {
            lastLaunchFailure = launchFailure(candidate, "The resolved media picker rejected the launch", error)
            continue
          } catch (error: IllegalArgumentException) {
            lastLaunchFailure = launchFailure(candidate, "The resolved media picker received invalid launch arguments", error)
            continue
          }

          return@Coroutine when (result) {
            is PhotoPickerContractResult.Cancelled -> mapOf(
              "cancelled" to true,
              "assets" to emptyList<Map<String, Any?>>(),
              "source" to result.backend.source,
              "action" to result.backend.action,
              "backend" to backendInfoMap(request, result.backend),
            )
            is PhotoPickerContractResult.Empty -> throw PickerException(
              "PICKER_READ_FAILED",
              "The picker reported success but returned no media items; " +
                "the provider may be malfunctioning",
            )
            is PhotoPickerContractResult.Success -> {
              // Post-validation, never silent truncation.
              if (result.uris.size > request.effectiveMaxSelection) {
                throw PickerException(
                  "PICKER_SELECTION_LIMIT_EXCEEDED",
                  "The picker returned ${result.uris.size} items, exceeding the effective " +
                    "limit of ${request.effectiveMaxSelection} " +
                    "(requested ${request.requestedMaxSelection})",
                )
              }
              val assets = materializeAll(result.uris, request.mediaType, result.backend)
              mapOf(
                "cancelled" to false,
                "assets" to assets,
                "source" to result.backend.source,
                "action" to result.backend.action,
                "backend" to backendInfoMap(request, result.backend),
              )
            }
          }
        }
        throw lastLaunchFailure
          ?: PickerException("PICKER_UNAVAILABLE", "No picker candidate could be launched")
      } finally {
        pickerInFlight.set(false)
      }
    }

    AsyncFunction("getCapabilities") Coroutine { options: Map<String, Any?>? ->
      // Probe only: never opens UI, never reads media, never requests permissions.
      // The snapshot cannot guarantee that the next launch will succeed; callers
      // still handle launch failures. Probing is per (mediaType, mode): a
      // single-select result never implies multi-select support.
      val normalized = normalizeOptions(options)
      val candidates = resolvePlan(normalized)
      if (candidates.isEmpty()) {
        return@Coroutine mapOf(
          "available" to false,
          "candidates" to emptyList<Map<String, Any?>>(),
          "requestedMaxSelection" to normalized.requestedMaxSelection,
          "effectiveMaxSelection" to normalized.requestedMaxSelection,
        )
      }
      val chosen = candidates.first()
      mapOf(
        "available" to true,
        "candidates" to candidates.map { capabilityOf(it) },
        "requestedMaxSelection" to normalized.requestedMaxSelection,
        "effectiveMaxSelection" to effectiveMaxFor(chosen, normalized.allowsMultipleSelection, normalized.requestedMaxSelection),
      )
    }

    AsyncFunction("releaseMedia") { uris: List<String> ->
      val root = pickerCacheDirectory.canonicalFile
      uris.forEach { uriString ->
        val file = uriString.toFileOrNull() ?: return@forEach
        if (file.canonicalFile.path.startsWith(root.path)) {
          file.delete()
        }
      }
    }

    AsyncFunction("clearPickerCache") {
      pickerCacheDirectory.deleteRecursively()
    }
  }

  // ---------------------------------------------------------------------
  // Request normalization and backend strategy
  // ---------------------------------------------------------------------

  private data class NormalizedOptions(
    val mediaType: String,
    val requestedMaxSelection: Int,
    /** Effective selection mode: a maxSelection of 1 is always single-select. */
    val allowsMultipleSelection: Boolean,
    val preference: String,
    val allowDocumentFallback: Boolean,
    val accentColor: Long?,
    val defaultTab: String?,
    val orderedSelection: Boolean,
  )

  /** One backend candidate; vendor candidates carry their verified mode capability. */
  private data class Candidate(
    val backend: PickerBackend,
    val vendorCapability: VendorModeCapability? = null,
  )

  private data class ResolvedRequest(
    val mediaType: String,
    val requestedMaxSelection: Int,
    val allowsMultipleSelection: Boolean,
    val effectiveMaxSelection: Int,
    val backend: PickerBackend,
    val vendorCapability: VendorModeCapability?,
    val accentColor: Long?,
    val defaultTab: String?,
    val orderedSelection: Boolean,
  ) {
    fun toContractOptions(): PhotoPickerContractOptions = PhotoPickerContractOptions(
      mediaType = mediaType,
      maxSelection = effectiveMaxSelection,
      allowsMultipleSelection = allowsMultipleSelection,
      backend = backend,
      accentColor = accentColor,
      defaultTab = defaultTab,
      orderedSelection = orderedSelection,
    )
  }

  private fun buildRequest(normalized: NormalizedOptions, candidate: Candidate): ResolvedRequest {
    return ResolvedRequest(
      mediaType = normalized.mediaType,
      requestedMaxSelection = normalized.requestedMaxSelection,
      allowsMultipleSelection = normalized.allowsMultipleSelection,
      effectiveMaxSelection = effectiveMaxFor(candidate, normalized.allowsMultipleSelection, normalized.requestedMaxSelection),
      backend = candidate.backend,
      vendorCapability = candidate.vendorCapability,
      accentColor = normalized.accentColor,
      defaultTab = normalized.defaultTab,
      orderedSelection = normalized.orderedSelection,
    )
  }

  private fun normalizeOptions(options: Map<String, Any?>?): NormalizedOptions {
    val rawMediaType = options?.get("mediaType") as? String
    if (rawMediaType != null && rawMediaType != "photo" && rawMediaType != "video" && rawMediaType != "all") {
      throw PickerException("PICKER_INVALID_OPTIONS", "Unsupported mediaType: $rawMediaType")
    }
    val mediaType = rawMediaType ?: "all"

    val rawMaxSelection = options?.get("maxSelection") as? Number
    if (rawMaxSelection != null) {
      val value = rawMaxSelection.toDouble()
      if (value % 1.0 != 0.0 || value < 1.0) {
        throw PickerException(
          "PICKER_INVALID_OPTIONS",
          "maxSelection must be a positive integer, received $value",
        )
      }
    }
    val requestedMaxSelection = rawMaxSelection?.toInt() ?: 1

    val cacheMode = options?.get("cacheMode") as? String
    if (cacheMode != null && cacheMode != "copy") {
      throw PickerException("PICKER_INVALID_OPTIONS", "Unsupported cacheMode: $cacheMode")
    }

    val allowsMultipleRaw = (options?.get("allowsMultipleSelection") as? Boolean) ?: (requestedMaxSelection > 1)
    // maxSelection=1 normalizes to single-select: a caller passing
    // allowsMultipleSelection=true with a single slot must not lose a usable
    // single-select vendor backend.
    val allowsMultipleSelection = allowsMultipleRaw && requestedMaxSelection > 1

    val androidOptions = options?.get("android") as? Map<String, Any?>
    val preference = (androidOptions?.get("preference") as? String) ?: "auto"
    if (preference != "auto" && preference != "system" && preference != "gallery") {
      throw PickerException("PICKER_INVALID_OPTIONS", "Unsupported android.preference: $preference")
    }
    val allowDocumentFallback = (androidOptions?.get("allowDocumentFallback") as? Boolean) ?: true

    val nativeUi = options?.get("nativeUi") as? Map<String, Any?>
    val accentColor = (nativeUi?.get("accentColor") as? Number)?.toLong()
    val rawDefaultTab = nativeUi?.get("defaultTab") as? String
    if (rawDefaultTab != null && rawDefaultTab != "photos" && rawDefaultTab != "albums") {
      throw PickerException("PICKER_INVALID_OPTIONS", "Unsupported nativeUi.defaultTab: $rawDefaultTab")
    }
    val orderedSelection = nativeUi?.get("orderedSelection") as? Boolean ?: false

    return NormalizedOptions(
      mediaType = mediaType,
      requestedMaxSelection = requestedMaxSelection,
      allowsMultipleSelection = allowsMultipleSelection,
      preference = preference,
      allowDocumentFallback = allowDocumentFallback,
      accentColor = accentColor,
      defaultTab = rawDefaultTab,
      orderedSelection = orderedSelection,
    )
  }

  /**
   * Ordered launchable candidates. Only candidates verified for the exact
   * (mediaType, mode) combination are included; a multiple request whose
   * vendor mode is unknown skips the vendor adapter entirely instead of being
   * silently downgraded to single-select or a different media type.
   */
  private fun resolvePlan(normalized: NormalizedOptions): List<Candidate> {
    val document = Candidate(PickerBackend(PhotoPickerContract.BACKEND_OPEN_DOCUMENT, Intent.ACTION_OPEN_DOCUMENT))
    val standard = if (standardPhotoPickerAvailable()) {
      Candidate(PickerBackend(PhotoPickerContract.BACKEND_STANDARD, MediaStore.ACTION_PICK_IMAGES))
    } else {
      null
    }
    val vendor = VendorGalleryAdapters
      .resolveVerified(context, normalized.mediaType, normalized.allowsMultipleSelection)
      ?.let { (adapter, capability) ->
        Candidate(
          PickerBackend(PhotoPickerContract.BACKEND_VENDOR_GALLERY, adapter.action, adapter.id),
          capability,
        )
      }

    val ordered: List<Candidate> = when (normalized.preference) {
      "system" -> listOfNotNull(standard) + document
      "gallery" -> listOfNotNull(vendor, standard) + document
      else -> listOfNotNull(standard, vendor) + document
    }
    // The document picker participates only when the caller allows that fallback.
    return ordered
      .distinctBy { it.backend.source }
      .filter { it.backend.source != PhotoPickerContract.BACKEND_OPEN_DOCUMENT || normalized.allowDocumentFallback }
  }

  private fun standardPhotoPickerAvailable(): Boolean {
    // Context variant: covers the platform picker and OEM fallback pickers,
    // matching what the AndroidX standard chain would actually do.
    return ActivityResultContracts.PickVisualMedia.isPhotoPickerAvailable(context)
  }

  private fun launchFailure(candidate: Candidate, message: String, error: Exception): PickerException {
    return PickerException(
      "PICKER_LAUNCH_FAILED",
      "$message (${candidate.backend.source}, action=${candidate.backend.action})",
      error,
    )
  }

  /**
   * Effective limit = min(caller limit, known system limit, verified vendor
   * limit). A vendor mode with an unknown native limit never claims one; the
   * business limit is passed through and validated after the return.
   */
  private fun effectiveMaxFor(candidate: Candidate, allowsMultipleSelection: Boolean, requestedMaxSelection: Int): Int {
    val base = if (allowsMultipleSelection) requestedMaxSelection else 1
    return when {
      candidate.backend.source == PhotoPickerContract.BACKEND_VENDOR_GALLERY -> {
        val verified = candidate.vendorCapability?.verifiedMaxSelection
        if (verified != null) minOf(base, verified) else base
      }
      candidate.backend.source == PhotoPickerContract.BACKEND_STANDARD &&
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ->
        minOf(base, MediaStore.getPickImagesMaxLimit())
      else -> base
    }
  }

  // ---------------------------------------------------------------------
  // Capability reporting
  // ---------------------------------------------------------------------

  private fun capabilityOf(candidate: Candidate): Map<String, Any?> {
    val backend = candidate.backend
    return when (backend.source) {
      PhotoPickerContract.BACKEND_STANDARD -> mapOf(
        "source" to backend.source,
        "mediaTypes" to listOf("photo", "video", "all"),
        "multiple" to "supported",
        "selectionLimit" to if (isFrameworkPickerAvailable()) "native" else "post-validation",
        "maxSelection" to PhotoPickerContract.systemPickImagesMaxLimit().takeIf { it != Int.MAX_VALUE },
        "orderedSelection" to if (nativeUiSupported()) "supported" else "unknown",
        "nativeUi" to mapOf("accentColor" to nativeUiSupported(), "defaultTab" to nativeUiSupported()),
      )
      PhotoPickerContract.BACKEND_VENDOR_GALLERY -> {
        val capability = candidate.vendorCapability
        mapOf(
          "source" to backend.source,
          "mediaTypes" to listOfNotNull(capability?.mediaType),
          // Reflects the exact verified mode of this candidate, not the
          // adapter as a whole: unknown modes never appear as candidates.
          "multiple" to if (capability?.multiple == true) "supported" else "unsupported",
          "selectionLimit" to (capability?.selectionLimit ?: "post-validation"),
          "maxSelection" to capability?.verifiedMaxSelection,
          "orderedSelection" to "unknown",
          "nativeUi" to mapOf("accentColor" to false, "defaultTab" to false),
        )
      }
      else -> mapOf(
        "source" to backend.source,
        "mediaTypes" to listOf("photo", "video", "all"),
        "multiple" to "supported",
        "selectionLimit" to "post-validation",
        "maxSelection" to null,
        "orderedSelection" to "unknown",
        "nativeUi" to mapOf("accentColor" to false, "defaultTab" to false),
      )
    }
  }

  private fun backendInfoMap(request: ResolvedRequest, backend: PickerBackend): Map<String, Any?> {
    val selectionLimit = when (backend.source) {
      PhotoPickerContract.BACKEND_STANDARD -> if (isFrameworkPickerAvailable()) "native" else "post-validation"
      PhotoPickerContract.BACKEND_VENDOR_GALLERY ->
        request.vendorCapability?.selectionLimit ?: "post-validation"
      PhotoPickerContract.BACKEND_OPEN_DOCUMENT -> "post-validation"
      else -> "native"
    }
    val orderedSelectionGuaranteed =
      backend.source == PhotoPickerContract.BACKEND_STANDARD &&
        request.allowsMultipleSelection &&
        request.orderedSelection &&
        nativeUiSupported()

    val applied = mutableListOf<String>()
    val ignored = mutableListOf<String>()
    val isStandard = backend.source == PhotoPickerContract.BACKEND_STANDARD
    if (request.accentColor != null) {
      (if (isStandard) applied else ignored) += "accentColor"
    }
    if (request.defaultTab != null) {
      (if (isStandard) applied else ignored) += "defaultTab"
    }
    if (request.orderedSelection) {
      if (isStandard && request.allowsMultipleSelection && nativeUiSupported()) {
        applied += "orderedSelection"
      } else {
        ignored += "orderedSelection"
      }
    }

    return mapOf(
      "source" to backend.source,
      "action" to backend.action,
      "vendorAdapterId" to backend.vendorAdapterId,
      "selectionLimit" to selectionLimit,
      "requestedMaxSelection" to request.requestedMaxSelection,
      "effectiveMaxSelection" to request.effectiveMaxSelection,
      "orderedSelectionGuaranteed" to orderedSelectionGuaranteed,
      "appliedUiOptions" to applied,
      "ignoredUiOptions" to ignored,
    )
  }

  private fun isFrameworkPickerAvailable(): Boolean {
    // Non-context variant checks API >= 33 or the R SDK extension only (the
    // platform picker); the context variant would also count OEM fallback apps.
    @Suppress("DEPRECATION")
    return ActivityResultContracts.PickVisualMedia.isPhotoPickerAvailable()
  }

  private fun nativeUiSupported(): Boolean {
    // accentColor / defaultTab / orderedSelection are honored by platform
    // pickers targeting API 35 or R extension 12 (AndroidX 1.10.0 contract).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) return true
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      return SdkExtensions.getExtensionVersion(Build.VERSION_CODES.R) >= 12
    }
    return false
  }

  // ---------------------------------------------------------------------
  // Cache materialization (all-or-nothing)
  // ---------------------------------------------------------------------

  private fun materializeAll(uris: List<Uri>, requestMediaType: String, backend: PickerBackend): List<Map<String, Any?>> {
    val createdDirectories = mutableListOf<File>()
    try {
      return uris.map { materialize(it, requestMediaType, backend, createdDirectories) }
    } catch (error: Throwable) {
      // All-or-nothing: never report success with missing items behind it.
      createdDirectories.distinct().forEach { directory ->
        runCatching { directory.deleteRecursively() }
      }
      throw error
    }
  }

  private fun materialize(
    sourceUri: Uri,
    requestMediaType: String,
    backend: PickerBackend,
    createdDirectories: MutableList<File>,
  ): Map<String, Any?> {
    val resolver = context.contentResolver
    val mimeType = resolver.getType(sourceUri) ?: "application/octet-stream"
    validateMediaType(mimeType, requestMediaType)

    val sourceName = queryDisplayName(resolver, sourceUri) ?: defaultFileName(mimeType)
    val safeName = sanitizeFileName(sourceName)
    val destinationDirectory = File(pickerCacheDirectory, UUID.randomUUID().toString()).apply { mkdirs() }
    createdDirectories.add(destinationDirectory)
    val destination = File(destinationDirectory, safeName)

    val input = try {
      resolver.openInputStream(sourceUri)
    } catch (error: Exception) {
      throw PickerException(
        "PICKER_READ_FAILED",
        "Unable to read the selected media from $sourceUri",
        error,
      )
    } ?: throw PickerException(
      "PICKER_READ_FAILED",
      "The selected media provider returned no content for $sourceUri",
    )
    try {
      FileOutputStream(destination).use { output -> input.copyTo(output) }
    } catch (error: Exception) {
      throw PickerException(
        "PICKER_CACHE_FAILED",
        "Unable to copy the selected media into the picker cache",
        error,
      )
    } finally {
      runCatching { input.close() }
    }

    val dimensions = readDimensions(resolver, sourceUri, mimeType)
    val durationMs = readDuration(resolver, sourceUri, mimeType)
    val capturedAt = readCapturedAt(resolver, sourceUri)
    val mediaType = if (mimeType.startsWith("video/")) "video" else "photo"
    val fileUri = Uri.fromFile(destination).toString()

    return mapOf(
      "id" to sha256(sourceUri.toString()),
      "uri" to fileUri,
      "localUri" to fileUri,
      "originalUri" to sourceUri.toString(),
      "filename" to safeName,
      "fileName" to safeName,
      "mimeType" to mimeType,
      "mediaType" to mediaType,
      "fileSize" to destination.length(),
      "width" to dimensions.first,
      "height" to dimensions.second,
      "duration" to (durationMs?.toDouble()?.div(1000.0)),
      "durationMs" to durationMs,
      "metadata" to capturedAt?.let { mapOf("capturedAt" to it) },
      "source" to backend.source,
      "action" to backend.action,
    )
  }

  private fun validateMediaType(mimeType: String, requestMediaType: String) {
    val isImage = mimeType.startsWith("image/")
    val isVideo = mimeType.startsWith("video/")
    val acceptable = when (requestMediaType) {
      "photo" -> isImage
      "video" -> isVideo
      else -> isImage || isVideo
    }
    if (!acceptable) {
      throw PickerException(
        "PICKER_UNSUPPORTED_MEDIA",
        "The picker returned \"$mimeType\" which does not match the requested media type \"$requestMediaType\"",
      )
    }
  }

  private fun readCapturedAt(resolver: ContentResolver, uri: Uri): String? {
    return try {
      resolver.query(
        uri,
        // MediaStore uses the legacy `datetaken` column name. Some picker
        // providers do not expose it; the query is intentionally best-effort
        // and the server can still enrich image EXIF metadata after upload.
        arrayOf("datetaken", "date_modified"),
        null,
        null,
        null,
      )?.use { cursor ->
        if (!cursor.moveToFirst()) return@use null
        val dateTakenIndex = cursor.getColumnIndex("datetaken")
        val dateModifiedIndex = cursor.getColumnIndex("date_modified")
        val dateTaken = if (dateTakenIndex >= 0 && !cursor.isNull(dateTakenIndex)) cursor.getLong(dateTakenIndex) else 0L
        val dateModifiedSeconds = if (dateModifiedIndex >= 0 && !cursor.isNull(dateModifiedIndex)) cursor.getLong(dateModifiedIndex) else 0L
        val timestampMs = when {
          dateTaken > 0L -> dateTaken
          dateModifiedSeconds > 0L -> dateModifiedSeconds * 1000L
          else -> 0L
        }
        if (timestampMs > 0L) formatRFC3339(timestampMs) else null
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun formatRFC3339(timestampMs: Long): String {
    return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(timestampMs))
  }

  private fun queryDisplayName(resolver: ContentResolver, uri: Uri): String? {
    return resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) cursor.getString(0) else null
    }
  }

  private fun readDimensions(resolver: ContentResolver, uri: Uri, mimeType: String): Pair<Int, Int> {
    if (mimeType.startsWith("image/")) {
      return resolver.openFileDescriptor(uri, "r")?.use { descriptor ->
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFileDescriptor(descriptor.fileDescriptor, null, options)
        Pair(options.outWidth.coerceAtLeast(0), options.outHeight.coerceAtLeast(0))
      } ?: Pair(0, 0)
    }
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(context, uri)
      Pair(
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 0,
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 0,
      )
    } catch (_: Exception) {
      Pair(0, 0)
    } finally {
      retriever.release()
    }
  }

  private fun readDuration(resolver: ContentResolver, uri: Uri, mimeType: String): Long? {
    if (!mimeType.startsWith("video/")) return null
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(context, uri)
      retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
    } catch (_: Exception) {
      null
    } finally {
      retriever.release()
    }
  }

  private fun sanitizeFileName(name: String): String {
    val cleaned = name.replace(Regex("[^A-Za-z0-9._-]"), "_").trim('_')
    return if (cleaned.isBlank()) "media-${UUID.randomUUID()}" else cleaned.take(180)
  }

  private fun defaultFileName(mimeType: String): String {
    val extension = mimeType.substringAfter('/', "bin").lowercase(Locale.ROOT)
    return "media-${UUID.randomUUID()}.$extension"
  }

  private fun sha256(value: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
    return digest.joinToString("") { byte -> "%02x".format(byte) }
  }

  private fun String.toFileOrNull(): File? {
    return if (startsWith("file://")) runCatching { File(Uri.parse(this).path ?: return null) }.getOrNull() else null
  }
}
