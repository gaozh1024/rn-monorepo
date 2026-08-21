package com.gaozh1024.photopicker

import android.content.ContentResolver
import android.content.Context
import android.database.Cursor
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.OpenableColumns
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.Locale
import java.util.UUID

class PhotoPickerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val pickerCacheDirectory: File
    get() = File(appContext.cacheDirectory, "photo-picker")

  private lateinit var pickerLauncher: AppContextActivityResultLauncher<PhotoPickerContractOptions, PhotoPickerContractResult>

  override fun definition() = ModuleDefinition {
    Name("PhotoPickerModule")

    RegisterActivityContracts {
      pickerLauncher = registerForActivityResult(PhotoPickerContract(this@PhotoPickerModule))
    }

    AsyncFunction("pickMedia") Coroutine { options: Map<String, Any?>? ->
      val normalized = normalizeOptions(options)
      val result = pickerLauncher.launch(normalized)
      when (result) {
        PhotoPickerContractResult.Cancelled -> mapOf(
          "cancelled" to true,
          "assets" to emptyList<Map<String, Any?>>(),
        )
        is PhotoPickerContractResult.Success -> mapOf(
          "cancelled" to false,
          "assets" to result.uris.map { materialize(it) },
        )
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

  private fun normalizeOptions(options: Map<String, Any?>?): PhotoPickerContractOptions {
    val mediaType = (options?.get("mediaType") as? String).let {
      if (it == "photo" || it == "video") it else "all"
    }
    val requestedMax = (options?.get("maxSelection") as? Number)?.toInt() ?: 1
    val allowsMultiple = (options?.get("allowsMultipleSelection") as? Boolean) ?: (requestedMax > 1)
    val maxSelection = if (allowsMultiple) requestedMax.coerceIn(2, 100) else 1
    return PhotoPickerContractOptions(mediaType, maxSelection, allowsMultiple)
  }

  private fun materialize(sourceUri: Uri): Map<String, Any?> {
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
      "source" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) "android-photo-picker" else "android-open-document",
    )
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
