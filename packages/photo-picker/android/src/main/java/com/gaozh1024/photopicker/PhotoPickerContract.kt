package com.gaozh1024.photopicker

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import java.io.Serializable

/**
 * Describes the backend that handles a picker request.
 *
 * [source] values mirror the JS `PickerSource` union:
 * - `android-photo-picker`: platform `MediaStore.ACTION_PICK_IMAGES`.
 * - `android-system-fallback`: a system app handling AndroidX
 *   `ACTION_SYSTEM_FALLBACK_PICK_IMAGES`.
 * - `android-vendor-gallery`: a vendor gallery adapter (currently Huawei only).
 * - `android-open-document`: the document picker fallback.
 */
internal data class PickerBackend(
  val source: String,
  val action: String,
  val vendorAdapterId: String? = null,
) : Serializable

/**
 * Per-request options handed to the activity-result contract.
 *
 * [maxSelection] is the effective limit (already clamped against system and
 * vendor limits by the module); the contract never truncates results itself.
 */
internal data class PhotoPickerContractOptions(
  val mediaType: String,
  val maxSelection: Int,
  val allowsMultipleSelection: Boolean,
  val backend: PickerBackend,
  val accentColor: Long? = null,
  val defaultTab: String? = null,
  val orderedSelection: Boolean = false,
) : Serializable

internal sealed class PhotoPickerContractResult {
  data class Success(val uris: List<Uri>, val backend: PickerBackend) : PhotoPickerContractResult()

  data class Cancelled(val backend: PickerBackend) : PhotoPickerContractResult()

  /** RESULT_OK arrived but carried no usable content: a provider anomaly, not a cancel. */
  data class Empty(val backend: PickerBackend) : PhotoPickerContractResult()
}

/**
 * Builds one Intent per backend instead of sharing a generic MIME assembly.
 *
 * - Standard chain: delegates Intent construction to the AndroidX
 *   `PickVisualMedia` / `PickMultipleVisualMedia` contracts (1.10.0+), which own
 *   the platform picker / system fallback / OPEN_DOCUMENT selection rules.
 * - Vendor gallery: ACTION_PICK against the verified MediaStore collection.
 * - Document: ACTION_OPEN_DOCUMENT with explicit MIME filtering.
 *
 * The AndroidX path classifies the final backend by inspecting the action of the
 * Intent that actually got created, so `source` never claims `android-photo-picker`
 * when the request silently degraded to the document picker.
 */
internal class PhotoPickerContract : AppContextActivityResultContract<PhotoPickerContractOptions, PhotoPickerContractResult> {
  // The module guarantees a single in-flight picker request, so keeping the
  // backend classified during createIntent for parseResult is safe.
  private var classifiedBackend: PickerBackend? = null

  override fun createIntent(context: Context, input: PhotoPickerContractOptions): Intent {
    val intent = when (input.backend.source) {
      BACKEND_VENDOR_GALLERY -> createVendorGalleryIntent(input)
      BACKEND_OPEN_DOCUMENT -> createOpenDocumentIntent(input)
      else -> createStandardIntent(context, input)
    }
    classifiedBackend = when (input.backend.source) {
      BACKEND_STANDARD -> classifyStandardIntent(input, intent)
      else -> input.backend
    }
    return intent
  }

  override fun parseResult(
    input: PhotoPickerContractOptions,
    resultCode: Int,
    intent: Intent?,
  ): PhotoPickerContractResult {
    val backend = classifiedBackend ?: input.backend
    classifiedBackend = null

    if (resultCode != Activity.RESULT_OK || intent == null) {
      return PhotoPickerContractResult.Cancelled(backend)
    }

    // ClipData first to preserve the provider's selection order, then the single
    // item `data` URI when it was not already reported through ClipData.
    val uris = buildList {
      intent.clipData?.let { clipData ->
        for (index in 0 until clipData.itemCount) {
          clipData.getItemAt(index).uri?.let(::add)
        }
      }
      intent.data?.let { data ->
        if (none { it == data }) add(data)
      }
    }.filterNotNull().distinct()

    return if (uris.isEmpty()) {
      PhotoPickerContractResult.Empty(backend)
    } else {
      PhotoPickerContractResult.Success(uris, backend)
    }
  }

  private fun createStandardIntent(context: Context, input: PhotoPickerContractOptions): Intent {
    val mediaType = when (input.mediaType) {
      "photo" -> ActivityResultContracts.PickVisualMedia.ImageOnly
      "video" -> ActivityResultContracts.PickVisualMedia.VideoOnly
      else -> ActivityResultContracts.PickVisualMedia.ImageAndVideo
    }
    val builder = PickVisualMediaRequest.Builder().setMediaType(mediaType)
    input.defaultTab?.let { tab ->
      builder.setDefaultTab(
        if (tab == "albums") {
          ActivityResultContracts.PickVisualMedia.DefaultTab.AlbumsTab
        } else {
          ActivityResultContracts.PickVisualMedia.DefaultTab.PhotosTab
        }
      )
    }
    input.accentColor?.let(builder::setAccentColor)

    val multiple = input.allowsMultipleSelection && input.maxSelection > 1
    return if (multiple) {
      // PickMultipleVisualMedia requires 2 <= maxItems <= getPickImagesMaxLimit()
      // on the system picker path; the module already clamped this value.
      val limit = input.maxSelection.coerceIn(2, systemPickImagesMaxLimit())
      builder.setMaxItems(limit)
      ActivityResultContracts.PickMultipleVisualMedia(limit).createIntent(context, builder.build())
    } else {
      ActivityResultContracts.PickVisualMedia().createIntent(context, builder.build())
    }
  }

  private fun createVendorGalleryIntent(input: PhotoPickerContractOptions): Intent {
    require(input.backend.vendorAdapterId == "huawei-gallery")
    return VendorGalleryAdapters.createHuaweiPickIntent(
      input.mediaType,
      input.allowsMultipleSelection && input.maxSelection > 1,
    )
  }

  private fun createOpenDocumentIntent(input: PhotoPickerContractOptions): Intent {
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT)
    // Only the document backend uses the generic-file MIME assembly; the system
    // photo picker keeps the ImageAndVideo semantics from the AndroidX contract.
    when (input.mediaType) {
      "photo" -> intent.type = "image/*"
      "video" -> intent.type = "video/*"
      else -> {
        intent.type = "*/*"
        intent.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
      }
    }
    intent.addCategory(Intent.CATEGORY_OPENABLE)
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    if (input.allowsMultipleSelection && input.maxSelection > 1) {
      intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
    }
    return intent
  }

  private fun classifyStandardIntent(input: PhotoPickerContractOptions, intent: Intent): PickerBackend {
    val source = when (intent.action) {
      MediaStore.ACTION_PICK_IMAGES -> BACKEND_STANDARD
      Intent.ACTION_OPEN_DOCUMENT -> BACKEND_OPEN_DOCUMENT
      ActivityResultContracts.PickVisualMedia.ACTION_SYSTEM_FALLBACK_PICK_IMAGES -> BACKEND_SYSTEM_FALLBACK
      else -> input.backend.source
    }
    return PickerBackend(source, intent.action ?: input.backend.action, input.backend.vendorAdapterId)
  }

  companion object {
    const val BACKEND_STANDARD = "android-photo-picker"
    const val BACKEND_SYSTEM_FALLBACK = "android-system-fallback"
    const val BACKEND_VENDOR_GALLERY = "android-vendor-gallery"
    const val BACKEND_OPEN_DOCUMENT = "android-open-document"

    fun systemPickImagesMaxLimit(): Int =
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        MediaStore.getPickImagesMaxLimit()
      } else {
        Int.MAX_VALUE
      }
  }
}
