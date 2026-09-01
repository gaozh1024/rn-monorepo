package com.gaozh1024.photopicker

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import java.io.Serializable

internal data class PickerBackend(
  val source: String,
  val action: String,
) : Serializable

internal data class PhotoPickerContractOptions(
  val mediaType: String,
  val maxSelection: Int,
  val allowsMultipleSelection: Boolean,
  val backend: PickerBackend,
) : Serializable

internal sealed class PhotoPickerContractResult {
  data class Success(val uris: List<Uri>, val backend: PickerBackend) : PhotoPickerContractResult()
  data class Cancelled(val backend: PickerBackend) : PhotoPickerContractResult()
}

internal class PhotoPickerContract : AppContextActivityResultContract<PhotoPickerContractOptions, PhotoPickerContractResult> {
  override fun createIntent(context: Context, input: PhotoPickerContractOptions): Intent {
    val intent = Intent(input.backend.action)

    val mediaType = when (input.mediaType) {
      "photo" -> "image/*"
      "video" -> "video/*"
      else -> "*/*"
    }
    intent.type = mediaType
    if (input.mediaType == "all") {
      intent.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
    }
    if (input.backend.source == "android-open-document") {
      intent.addCategory(Intent.CATEGORY_OPENABLE)
    }
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)

    if (input.allowsMultipleSelection && input.maxSelection > 1) {
      intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
      if (input.backend.source == "android-photo-picker") {
        intent.putExtra(
          MediaStore.EXTRA_PICK_IMAGES_MAX,
          input.maxSelection,
        )
      }
    }
    return intent
  }

  override fun parseResult(
    input: PhotoPickerContractOptions,
    resultCode: Int,
    intent: Intent?,
  ): PhotoPickerContractResult {
    if (resultCode != Activity.RESULT_OK || intent == null) {
      return PhotoPickerContractResult.Cancelled(input.backend)
    }

    val uris = buildList {
      intent.data?.let(::add)
      intent.clipData?.let { clipData ->
        for (index in 0 until clipData.itemCount) {
          add(clipData.getItemAt(index).uri)
        }
      }
    }.distinct().take(input.maxSelection)

    return if (uris.isEmpty()) {
      PhotoPickerContractResult.Cancelled(input.backend)
    } else {
      PhotoPickerContractResult.Success(uris, input.backend)
    }
  }
}
