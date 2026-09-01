package com.gaozh1024.photopicker

import android.content.ActivityNotFoundException
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.OpenableColumns
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
        val backend = resolveBackend()
        val normalized = normalizeOptions(options, backend)
        validateSelectionLimit(normalized, backend)
        val input = normalized.copy(backend = backend)
        val result = try {
          pickerLauncher.launch(input)
        } catch (error: ActivityNotFoundException) {
          throw PickerException(
            "PICKER_LAUNCH_FAILED",
            "Unable to launch the resolved media picker (${backend.action})",
            error,
          )
        } catch (error: SecurityException) {
          throw PickerException(
            "PICKER_LAUNCH_FAILED",
            "The resolved media picker rejected the launch (${backend.action})",
            error,
          )
        } catch (error: IllegalArgumentException) {
          throw PickerException(
            "PICKER_LAUNCH_FAILED",
            "The resolved media picker received invalid launch arguments (${backend.action})",
            error,
          )
        }
        when (result) {
          is PhotoPickerContractResult.Cancelled -> mapOf(
            "cancelled" to true,
            "assets" to emptyList<Map<String, Any?>>(),
            "source" to result.backend.source,
            "action" to result.backend.action,
          )
          is PhotoPickerContractResult.Success -> mapOf(
            "cancelled" to false,
            "assets" to result.uris.map { materialize(it, result.backend) },
            "source" to result.backend.source,
            "action" to result.backend.action,
          )
        }
      } finally {
        pickerInFlight.set(false)
      }
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

  private fun normalizeOptions(options: Map<String, Any?>?, backend: PickerBackend): PhotoPickerContractOptions {
    val mediaType = (options?.get("mediaType") as? String).let {
      if (it == "photo" || it == "video") it else "all"
    }
    val requestedMax = (options?.get("maxSelection") as? Number)?.toInt() ?: 1
    val allowsMultiple = (options?.get("allowsMultipleSelection") as? Boolean) ?: (requestedMax > 1)
    val maxSelection = if (allowsMultiple) requestedMax.coerceAtLeast(1) else 1
    return PhotoPickerContractOptions(mediaType, maxSelection, allowsMultiple, backend)
  }

  private fun resolveBackend(): PickerBackend {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val photoPickerIntent = Intent(MediaStore.ACTION_PICK_IMAGES)
      if (photoPickerIntent.resolveActivity(context.packageManager) != null) {
        return PickerBackend("android-photo-picker", MediaStore.ACTION_PICK_IMAGES)
      }
    }
    return PickerBackend("android-open-document", Intent.ACTION_OPEN_DOCUMENT)
  }

  private fun validateSelectionLimit(options: PhotoPickerContractOptions, backend: PickerBackend) {
    if (!options.allowsMultiple || options.maxSelection <= 1 || backend.source != "android-photo-picker") return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return

    val systemLimit = MediaStore.getPickImagesMaxLimit()
    if (options.maxSelection > systemLimit) {
      throw PickerException(
        "PICKER_SELECTION_LIMIT_UNSUPPORTED",
        "Requested ${options.maxSelection} media items, but this Photo Picker supports at most $systemLimit",
      )
    }
  }

  private fun materialize(sourceUri: Uri, backend: PickerBackend): Map<String, Any?> {
    val resolver = context.contentResolver
    val mimeType = resolver.getType(sourceUri) ?: "application/octet-stream"
    val sourceName = queryDisplayName(resolver, sourceUri) ?: defaultFileName(mimeType)
    val safeName = sanitizeFileName(sourceName)
    val destinationDirectory = File(pickerCacheDirectory, UUID.randomUUID().toString()).apply { mkdirs() }
    val destination = File(destinationDirectory, safeName)

    resolver.openInputStream(sourceUri).use { input ->
      requireNotNull(input) { "Unable to read selected media URI" }
      FileOutputStream(destination).use { output -> input.copyTo(output) }
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
