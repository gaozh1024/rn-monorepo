package com.gaozh1024.photopicker

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.providers.AppContextProvider
import java.io.Serializable

internal data class PhotoPickerContractOptions(
  val mediaType: String,
  val maxSelection: Int,
  val allowsMultipleSelection: Boolean,
) : Serializable

internal sealed class PhotoPickerContractResult {
  data class Success(val uris: List<Uri>) : PhotoPickerContractResult()
  data object Cancelled : PhotoPickerContractResult()
}

internal class PhotoPickerContract(
  private val appContextProvider: AppContextProvider,
) : AppContextActivityResultContract<PhotoPickerContractOptions, PhotoPickerContractResult> {
  override fun createIntent(context: Context, input: PhotoPickerContractOptions): Intent {
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      Intent(MediaStore.ACTION_PICK_IMAGES)
    } else {
      Intent(Intent.ACTION_OPEN_DOCUMENT)
    }

    val mediaType = when (input.mediaType) {
      "photo" -> "image/*"
      "video" -> "video/*"
      else -> "image/*"
    }
    intent.type = mediaType
    if (input.mediaType == "all") {
      intent.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
    }
    intent.addCategory(Intent.CATEGORY_OPENABLE)
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)

    if (input.allowsMultipleSelection && input.maxSelection > 1) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        intent.putExtra(
          MediaStore.EXTRA_PICK_IMAGES_MAX,
          input.maxSelection.coerceIn(2, 100),
        )
      } else {
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
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
      return PhotoPickerContractResult.Cancelled
    }

    val uris = buildList {
      intent.data?.let(::add)
      intent.clipData?.let { clipData ->
        for (index in 0 until clipData.itemCount) {
          add(clipData.getItemAt(index).uri)
        }
      }
    }.distinct().take(input.maxSelection)

    return if (uris.isEmpty()) PhotoPickerContractResult.Cancelled else PhotoPickerContractResult.Success(uris)
  }
}
