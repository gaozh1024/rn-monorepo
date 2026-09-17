package com.gaozh1024.photopicker

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.MediaStore

/** Whether a vendor gallery mode has been verified on real devices. */
internal enum class VendorModeState { SUPPORTED, UNSUPPORTED, UNKNOWN }

/**
 * One capability cell of a vendor gallery, keyed by (mediaType, selection
 * mode). Cells are independent: a photo-single result must never promote
 * photo-multiple, and video conclusions are never derived from photo evidence.
 *
 * @param verifiedMaxSelection the highest selection count verified to be
 *   accepted natively for this mode; null means unknown, which forces
 *   post-validation instead of pretending a native limit exists.
 */
internal data class VendorModeCapability(
  val mediaType: String,
  val multiple: Boolean,
  val state: VendorModeState,
  val verifiedMaxSelection: Int?,
) {
  /** "native" only when a concrete limit is verified; otherwise post-validation. */
  val selectionLimit: String
    get() = if (verifiedMaxSelection != null) "native" else "post-validation"
}

/**
 * A vendor gallery adapter. Adapters are registered ONLY after the described
 * behavior has been verified on a real device with a recorded evidence entry;
 * routing capability alone never upgrades a capability to `supported`.
 *
 * Matching order per request: media type -> single/multiple mode -> quantity
 * constraint -> receiving package and device condition. Only SUPPORTED modes
 * become formal candidates; UNKNOWN/UNSUPPORTED modes are skipped so the
 * request falls through to the next backend instead of being silently
 * downgraded (e.g. video-multiple never reuses photo evidence).
 *
 * See docs/photo-picker-split-framework-plan.md §3 for the mode matrix and
 * docs/photo-picker-upgrade-design.md §8.3 for the evidence record format.
 */
internal data class VendorGalleryAdapter(
  val id: String,
  val action: String,
  /** Device condition the adapter matches on (package-level, never Activity class names). */
  val matches: (Context, String, Boolean) -> Boolean,
  val modes: List<VendorModeCapability>,
) {
  /**
   * Exact mode match; returns null when the requested (mediaType, mode) is not
   * verified on this adapter, regardless of what other modes support.
   */
  fun verifiedCapability(mediaType: String, multiple: Boolean): VendorModeCapability? {
    return modes.firstOrNull {
      it.mediaType == mediaType && it.multiple == multiple && it.state == VendorModeState.SUPPORTED
    }
  }
}

internal object VendorGalleryAdapters {
  private val HUAWEI_GALLERY = VendorGalleryAdapter(
    id = "huawei-gallery",
    action = Intent.ACTION_PICK,
    matches = ::huaweiGalleryResolvable,
    modes = listOf(
      VendorModeCapability("photo", multiple = false, VendorModeState.SUPPORTED, verifiedMaxSelection = 1),
      VendorModeCapability("photo", multiple = true, VendorModeState.SUPPORTED, verifiedMaxSelection = null),
      VendorModeCapability("video", multiple = false, VendorModeState.SUPPORTED, verifiedMaxSelection = null),
      VendorModeCapability("video", multiple = true, VendorModeState.SUPPORTED, verifiedMaxSelection = null),
    ),
  )

  private val ALL = listOf(HUAWEI_GALLERY)

  /**
   * Returns the verified capability for this exact request, or null when no
   * adapter matches the device OR the requested mode is not verified. Callers
   * must fall through to the next backend candidate; they must not silently
   * convert a multiple request into a single one or swap the media type.
   */
  fun resolveVerified(
    context: Context,
    mediaType: String,
    multiple: Boolean,
  ): Pair<VendorGalleryAdapter, VendorModeCapability>? {
    return ALL.firstNotNullOfOrNull { adapter ->
      adapter.verifiedCapability(mediaType, multiple)?.takeIf {
        adapter.matches(context, mediaType, multiple)
      }?.let { adapter to it }
    }
  }

  /**
   * Canonical vendor pick intent. ACTION_PICK + EXTRA_ALLOW_MULTIPLE is NOT a
   * cross-vendor contract; the multiple flag is only ever sent once a mode is
   * verified and actually requested as multiple.
   */
  fun createHuaweiPickIntent(mediaType: String, allowsMultiple: Boolean): Intent {
    require(mediaType == "photo" || mediaType == "video")
    val collection = if (mediaType == "video") {
      MediaStore.Video.Media.EXTERNAL_CONTENT_URI
    } else {
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI
    }
    val mimeType = if (mediaType == "video") "video/*" else "image/*"
    return Intent(Intent.ACTION_PICK).apply {
      setDataAndType(collection, mimeType)
      setPackage("com.huawei.photos")
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowsMultiple)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
  }

  private fun huaweiGalleryResolvable(context: Context, mediaType: String, multiple: Boolean): Boolean {
    val resolved = runCatching {
      context.packageManager.resolveActivity(
        createHuaweiPickIntent(mediaType, multiple),
        PackageManager.MATCH_DEFAULT_ONLY,
      )
    }.getOrNull()
    // Package-level matching only; the resolved Activity class name is treated as
    // diagnostics, never as a stable vendor API.
    val activity = resolved?.activityInfo ?: return false
    return activity.packageName == "com.huawei.photos" && activity.enabled && activity.exported &&
      activity.applicationInfo.enabled
  }
}
