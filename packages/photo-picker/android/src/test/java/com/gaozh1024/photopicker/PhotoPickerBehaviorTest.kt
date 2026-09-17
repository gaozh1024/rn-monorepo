package com.gaozh1024.photopicker

import android.app.Activity
import android.content.ActivityNotFoundException
import androidx.activity.result.contract.ActivityResultContracts
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ApplicationInfo
import android.content.pm.ResolveInfo
import android.net.Uri
import android.provider.MediaStore
import expo.modules.kotlin.exception.CodedException
import java.lang.reflect.InvocationTargetException
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [32])
class PhotoPickerBehaviorTest {
  private val context: Context get() = RuntimeEnvironment.getApplication()
  private val vendor = PickerBackend(PhotoPickerContract.BACKEND_VENDOR_GALLERY, Intent.ACTION_PICK, "huawei-gallery")
  private val document = PickerBackend(PhotoPickerContract.BACKEND_OPEN_DOCUMENT, Intent.ACTION_OPEN_DOCUMENT)

  @Test
  fun vendorIntentsArePackageScopedWithExactCollectionAndMode() {
    for (mediaType in listOf("photo", "video")) {
      for (multiple in listOf(false, true)) {
        val intents = listOf(
          VendorGalleryAdapters.createHuaweiPickIntent(mediaType, multiple),
          PhotoPickerContract().createIntent(context, options(mediaType, max = 4, multiple = multiple, backend = vendor)),
        )
        for (intent in intents) {
          assertEquals(Intent.ACTION_PICK, intent.action)
          assertEquals("com.huawei.photos", intent.`package`)
          assertNull(intent.component)
          assertEquals(if (mediaType == "photo") "image/*" else "video/*", intent.type)
          assertEquals(if (mediaType == "photo") MediaStore.Images.Media.EXTERNAL_CONTENT_URI else MediaStore.Video.Media.EXTERNAL_CONTENT_URI, intent.data)
          assertEquals(multiple, intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, !multiple))
          assertEquals(Intent.FLAG_GRANT_READ_URI_PERMISSION, intent.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION)
          assertNull(intent.getStringArrayExtra(Intent.EXTRA_MIME_TYPES))
        }
      }
    }
  }

  @Test
  fun vendorRejectsMixedMediaInsteadOfDowngradingToPhotos() {
    for (multiple in listOf(false, true)) {
      assertThrows(IllegalArgumentException::class.java) { VendorGalleryAdapters.createHuaweiPickIntent("all", multiple) }
      assertThrows(IllegalArgumentException::class.java) {
        PhotoPickerContract().createIntent(context, options("all", max = 4, multiple = multiple, backend = vendor))
      }
    }
    assertThrows(IllegalArgumentException::class.java) { VendorGalleryAdapters.createHuaweiPickIntent("audio", true) }
  }

  @Test
  fun allFourHuaweiModesResolveWithTheirOwnSelectionLimits() {
    registerGallery()
    for ((media, multiple) in galleryModes) {
      val resolved = requireNotNull(VendorGalleryAdapters.resolveVerified(context, media, multiple))
      assertEquals("huawei-gallery", resolved.first.id)
      assertEquals(Intent.ACTION_PICK, resolved.first.action)
      assertEquals(media, resolved.second.mediaType)
      assertEquals(multiple, resolved.second.multiple)
      assertEquals(VendorModeState.SUPPORTED, resolved.second.state)
      val nativeLimit = media == "photo" && !multiple
      assertEquals(if (nativeLimit) 1 else null, resolved.second.verifiedMaxSelection)
      assertEquals(if (nativeLimit) "native" else "post-validation", resolved.second.selectionLimit)
    }
    for (multiple in listOf(false, true)) {
      assertNull(VendorGalleryAdapters.resolveVerified(context, "all", multiple))
    }
  }

  @Test
  fun missingGalleryDoesNotResolve() {
    assertNoGalleryModesResolve()
  }

  @Test
  fun wrongReceivingPackageDoesNotResolve() {
    registerGallery(packageName = "com.example.gallery")
    assertNoGalleryModesResolve()
  }

  @Test
  fun disabledGalleryActivityDoesNotResolve() {
    registerGallery(enabled = false)
    assertNoGalleryModesResolve()
  }

  @Test
  fun unexportedGalleryActivityDoesNotResolve() {
    registerGallery(exported = false)
    assertNoGalleryModesResolve()
  }

  @Test
  fun disabledGalleryApplicationDoesNotResolve() {
    registerGallery(appEnabled = false)
    assertNoGalleryModesResolve()
  }

  @Test
  fun galleryActivityClassNameIsNotPartOfTheContract() {
    registerGallery(activityName = "com.huawei.photos.newversion.AnyPickerActivity")
    for ((media, multiple) in galleryModes) {
      assertNotNull(VendorGalleryAdapters.resolveVerified(context, media, multiple))
    }
  }

  @Test
  fun unknownAndUnsupportedCapabilitiesNeverBecomeVerified() {
    val adapter = VendorGalleryAdapter("test", Intent.ACTION_PICK, { _, _, _ -> true }, listOf(
      VendorModeCapability("photo", false, VendorModeState.SUPPORTED, 1),
      VendorModeCapability("photo", true, VendorModeState.UNKNOWN, null),
      VendorModeCapability("video", false, VendorModeState.UNSUPPORTED, null),
    ), { _, _, _ -> Intent(Intent.ACTION_PICK) })
    assertNotNull(adapter.verifiedCapability("photo", false))
    assertNull(adapter.verifiedCapability("photo", true))
    assertNull(adapter.verifiedCapability("video", false))
    assertNull(adapter.verifiedCapability("video", true))
    assertEquals("post-validation", adapter.modes[1].selectionLimit)
  }

  @Test
  fun registryDelegatesToSelectedAdapterAndNormalizesSingleSelection() {
    val adapter = VendorGalleryAdapter("test-gallery", Intent.ACTION_GET_CONTENT, { _, _, _ -> true }, listOf(
      VendorModeCapability("video", false, VendorModeState.SUPPORTED, 1),
      VendorModeCapability("video", true, VendorModeState.SUPPORTED, null),
    ), { media, multiple, max ->
      Intent(Intent.ACTION_GET_CONTENT).setPackage("test.gallery").apply {
        type = "$media/*"
        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
        putExtra("limit", max)
      }
    })
    val registry = VendorGalleryRegistry(listOf(adapter))
    for (max in listOf(1, 4)) {
      val backend = PickerBackend(PhotoPickerContract.BACKEND_VENDOR_GALLERY, adapter.action, adapter.id)
      val intent = PhotoPickerContract(registry).createIntent(context, options("video", max, true, backend))
      assertEquals("test.gallery", intent.`package`)
      assertEquals("video/*", intent.type)
      assertEquals(max > 1, intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, false))
      assertEquals(max, intent.getIntExtra("limit", 0))
    }
    for (id in listOf(null, "missing")) {
      assertThrows(IllegalArgumentException::class.java) { registry.createIntent(id, "video", true, 2) }
    }
    assertThrows(IllegalArgumentException::class.java) { registry.createIntent(adapter.id, "photo", false, 1) }
    assertThrows(IllegalArgumentException::class.java) { VendorGalleryRegistry(listOf(adapter, adapter)) }
  }

  @Test
  fun registryFiltersModesBeforeMatchingAndKeepsAllEligibleAdapters() {
    val unknown = VendorGalleryAdapter("unknown", Intent.ACTION_PICK, { _, _, _ ->
      throw AssertionError("Unverified modes must not be probed")
    }, listOf(VendorModeCapability("video", true, VendorModeState.UNKNOWN, null)), { _, _, _ -> Intent(Intent.ACTION_PICK) })
    val supported = unknown.copy(id = "first", modes = listOf(VendorModeCapability("video", true, VendorModeState.SUPPORTED, null)), matches = { _, media, multiple -> media == "video" && multiple })
    val unavailable = supported.copy(id = "unavailable", matches = { _, _, _ -> false })
    val second = supported.copy(id = "second")
    val registry = VendorGalleryRegistry(listOf(unknown, unavailable, supported, second))
    assertEquals(listOf("first", "second"), registry.resolveAllVerified(context, "video", true).map { it.first.id })
    assertTrue(registry.resolveAllVerified(context, "photo", true).isEmpty())
    assertThrows(IllegalArgumentException::class.java) { registry.createIntent("unknown", "video", true, 2) }
  }

  @Test
  fun normalizationSuppliesDefaults() {
    val normalized = normalize(null)
    assertEquals("all", field(normalized, "mediaType"))
    assertEquals(1, field(normalized, "requestedMaxSelection"))
    assertEquals(false, field(normalized, "allowsMultipleSelection"))
    assertEquals("auto", field(normalized, "preference"))
    assertEquals(true, field(normalized, "allowDocumentFallback"))
    assertNull(field(normalized, "accentColor"))
    assertNull(field(normalized, "defaultTab"))
    assertEquals(false, field(normalized, "orderedSelection"))
  }

  @Test
  fun normalizationOfOneSlotPreservesVerifiedSingleGalleryMode() {
    registerGallery()
    val normalized = normalize(mapOf("mediaType" to "photo", "maxSelection" to 1.0, "allowsMultipleSelection" to true))
    assertEquals(1, field(normalized, "requestedMaxSelection"))
    assertEquals(false, field(normalized, "allowsMultipleSelection"))
    assertNotNull(VendorGalleryAdapters.resolveVerified(context, field(normalized, "mediaType") as String, field(normalized, "allowsMultipleSelection") as Boolean))
  }

  @Test
  fun normalizationInfersMultipleButHonorsExplicitSingle() {
    assertEquals(true, field(normalize(mapOf("maxSelection" to 5.0)), "allowsMultipleSelection"))
    val single = normalize(mapOf("maxSelection" to 5, "allowsMultipleSelection" to false))
    assertEquals(false, field(single, "allowsMultipleSelection"))
    assertEquals(5, field(single, "requestedMaxSelection"))
  }

  @Test
  fun normalizationPreservesAndroidAndNativeUiOptions() {
    val normalized = normalize(mapOf(
      "mediaType" to "video", "cacheMode" to "copy",
      "android" to mapOf("preference" to "gallery", "allowDocumentFallback" to false),
      "nativeUi" to mapOf("accentColor" to 4278190335.0, "defaultTab" to "albums", "orderedSelection" to true),
    ))
    assertEquals("video", field(normalized, "mediaType"))
    assertEquals("gallery", field(normalized, "preference"))
    assertEquals(false, field(normalized, "allowDocumentFallback"))
    assertEquals(4278190335L, field(normalized, "accentColor"))
    assertEquals("albums", field(normalized, "defaultTab"))
    assertEquals(true, field(normalized, "orderedSelection"))
  }

  @Test
  fun normalizationRejectsInvalidOptionsWithNativeErrorCode() {
    val invalid = listOf(
      mapOf("mediaType" to "audio"), mapOf("cacheMode" to "reference"),
      mapOf("android" to mapOf("preference" to "unknown")),
      mapOf("nativeUi" to mapOf("defaultTab" to "unknown")),
    ) + listOf(0, -1, 1.5, Double.NaN, Double.POSITIVE_INFINITY).map { mapOf("maxSelection" to it) }
    for (options in invalid) {
      val error = assertThrows(CodedException::class.java) { normalize(options) }
      assertEquals("PICKER_INVALID_OPTIONS", error.code)
    }
  }

  @Test
  fun contractRequiresKnownVendorAdapter() {
    assertThrows(IllegalArgumentException::class.java) {
      PhotoPickerContract().createIntent(context, options(backend = vendor.copy(vendorAdapterId = "unknown")))
    }
  }

  @Test
  fun contractUsesEffectiveSelectionMode() {
    for (backend in listOf(vendor, document)) {
      for ((max, multiple, expected) in listOf(Triple(1, true, false), Triple(4, false, false), Triple(4, true, true))) {
        val intent = PhotoPickerContract().createIntent(context, options(max = max, multiple = multiple, backend = backend))
        assertEquals(expected, intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, false))
      }
    }
  }

  @Test
  @Config(sdk = [33])
  fun standardContractUsesSinglePickerWhenMaxIsOne() {
    val backend = PickerBackend(PhotoPickerContract.BACKEND_STANDARD, MediaStore.ACTION_PICK_IMAGES)
    for (media in listOf("photo", "video", "all")) {
      val intent = PhotoPickerContract().createIntent(context, options(media, max = 1, multiple = true, backend = backend))
      assertEquals(MediaStore.ACTION_PICK_IMAGES, intent.action)
      assertEquals(when (media) { "photo" -> "image/*"; "video" -> "video/*"; else -> null }, intent.type)
      assertFalse(intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, false))
      assertFalse(intent.hasExtra(MediaStore.EXTRA_PICK_IMAGES_MAX))
    }
  }

  @Test
  fun documentSupportsMixedMediaWithOpenableCategory() {
    val intent = PhotoPickerContract().createIntent(context, options("all"))
    assertEquals(Intent.ACTION_OPEN_DOCUMENT, intent.action)
    assertEquals("*/*", intent.type)
    assertArrayEquals(arrayOf("image/*", "video/*"), intent.getStringArrayExtra(Intent.EXTRA_MIME_TYPES))
    assertTrue(intent.hasCategory(Intent.CATEGORY_OPENABLE))
    assertNull(intent.`package`)
  }

  @Test
  fun clipDataDeduplicatesInProviderOrderThenAppendsDataWithoutTruncation() {
    val first = Uri.parse("content://media/1")
    val second = Uri.parse("content://media/2")
    val third = Uri.parse("content://media/3")
    val clip = ClipData.newRawUri("selection", second).apply {
      addItem(ClipData.Item(first))
      addItem(ClipData.Item(second))
      addItem(ClipData.Item("not a URI"))
    }
    val intent = Intent().apply { clipData = clip; data = third }
    val result = PhotoPickerContract().parseResult(options(max = 1), Activity.RESULT_OK, intent) as PhotoPickerContractResult.Success
    assertEquals(listOf(second, first, third), result.uris)
    assertEquals(document, result.backend)
    intent.data = first
    val duplicate = PhotoPickerContract().parseResult(options(), Activity.RESULT_OK, intent) as PhotoPickerContractResult.Success
    assertEquals(listOf(second, first), duplicate.uris)
  }

  @Test
  fun dataOnlyResultSucceeds() {
    val uri = Uri.parse("content://media/1")
    val result = PhotoPickerContract().parseResult(options(), Activity.RESULT_OK, Intent().setData(uri)) as PhotoPickerContractResult.Success
    assertEquals(listOf(uri), result.uris)
  }

  @Test
  fun cancellationIgnoresReturnedUrisAndKeepsBackend() {
    for (code in listOf(Activity.RESULT_CANCELED, Activity.RESULT_FIRST_USER)) {
      val result = PhotoPickerContract().parseResult(options(backend = vendor), code, Intent().setData(Uri.parse("content://media/1")))
      assertEquals(PhotoPickerContractResult.Cancelled(vendor), result)
    }
    assertEquals(PhotoPickerContractResult.Cancelled(document), PhotoPickerContract().parseResult(options(), Activity.RESULT_OK, null))
  }

  @Test
  fun emptySuccessIsNotCancellation() {
    for (intent in listOf(Intent(), Intent().apply { clipData = ClipData.newPlainText("text", "no media") })) {
      assertEquals(PhotoPickerContractResult.Empty(document), PhotoPickerContract().parseResult(options(), Activity.RESULT_OK, intent))
    }
  }

  @Test
  fun actualStandardFallbackBackendIsReportedAndClearedAfterParsing() {
    val contract = PhotoPickerContract()
    val input = options(backend = PickerBackend(PhotoPickerContract.BACKEND_STANDARD, MediaStore.ACTION_PICK_IMAGES))
    assertEquals(Intent.ACTION_OPEN_DOCUMENT, contract.createIntent(context, input).action)
    assertEquals(PhotoPickerContractResult.Cancelled(document), contract.parseResult(input, Activity.RESULT_CANCELED, null))
    assertEquals(PhotoPickerContractResult.Cancelled(vendor), contract.parseResult(options(backend = vendor), Activity.RESULT_CANCELED, null))
  }

  @Test
  fun absentStandardPickerDoesNotBecomePhotoCandidate() {
    assertNull(PhotoPickerContract.probeStandardBackend(context, "photo"))
    assertTrue(plan("system", false).isEmpty())
    assertEquals(listOf(document), plan("system", true).map { field(it, "backend") })
  }

  @Test
  @Config(sdk = [33])
  fun platformProbeClassifiesActualAction() {
    assertEquals(PickerBackend(PhotoPickerContract.BACKEND_STANDARD, MediaStore.ACTION_PICK_IMAGES), PhotoPickerContract.probeStandardBackend(context, "all"))
  }

  @Test
  fun oemProbeAndPlanReportFallbackAndPreservePreference() {
    registerSystemFallback()
    registerGallery()
    val fallback = PickerBackend(PhotoPickerContract.BACKEND_SYSTEM_FALLBACK, ActivityResultContracts.PickVisualMedia.ACTION_SYSTEM_FALLBACK_PICK_IMAGES)
    assertEquals(fallback, PhotoPickerContract.probeStandardBackend(context, "photo"))
    assertEquals(listOf(fallback, vendor, document), plan("auto", true).map { field(it, "backend") })
    assertEquals(listOf(vendor, fallback), plan("gallery", false).map { field(it, "backend") })
    assertEquals(listOf(fallback), plan("system", false).map { field(it, "backend") })
    val contract = PhotoPickerContract()
    val input = options(backend = fallback)
    assertEquals(fallback.action, contract.createIntent(context, input).action)
    assertEquals(PhotoPickerContractResult.Cancelled(fallback), contract.parseResult(input, Activity.RESULT_CANCELED, null))
  }

  @Test
  fun finalIntentRejectsUnauthorizedDocumentFallbackForEveryStandardSource() {
    for (source in listOf(PhotoPickerContract.BACKEND_STANDARD, PhotoPickerContract.BACKEND_SYSTEM_FALLBACK, PhotoPickerContract.BACKEND_OPEN_DOCUMENT)) {
      for (multiple in listOf(false, true)) {
        val contract = PhotoPickerContract()
        val input = options(max = 4, multiple = multiple, backend = PickerBackend(source, MediaStore.ACTION_PICK_IMAGES))
        assertEquals(Intent.ACTION_OPEN_DOCUMENT, contract.createIntent(context, input).action)
        assertThrows(ActivityNotFoundException::class.java) { contract.createIntent(context, input.copy(allowDocumentFallback = false)) }
        assertEquals(PhotoPickerContractResult.Cancelled(vendor), contract.parseResult(options(backend = vendor), Activity.RESULT_CANCELED, null))
      }
    }
  }

  @Test
  fun requestCarriesFallbackAuthorizationThroughToContract() {
    registerSystemFallback()
    val module = PhotoPickerModule()
    val normalized = normalize(mapOf("android" to mapOf("allowDocumentFallback" to false)))
    val candidate = plan("system", false).first()
    val request = module.javaClass.declaredMethods.first { it.name == "buildRequest" }.apply { isAccessible = true }.invoke(module, normalized, candidate)
    val input = request.javaClass.getDeclaredMethod("toContractOptions").apply { isAccessible = true }.invoke(request) as PhotoPickerContractOptions
    assertFalse(input.allowDocumentFallback)
    shadowOf(context.packageManager).setResolveInfosForIntent(Intent(ActivityResultContracts.PickVisualMedia.ACTION_SYSTEM_FALLBACK_PICK_IMAGES), emptyList())
    assertThrows(ActivityNotFoundException::class.java) { PhotoPickerContract().createIntent(context, input) }
  }

  @Test
  fun oemPickerPreservesMediaAndSelectionModes() {
    registerSystemFallback()
    for (media in listOf("photo", "video", "all")) {
      val backend = requireNotNull(PhotoPickerContract.probeStandardBackend(context, media))
      for (multiple in listOf(false, true)) {
        val intent = PhotoPickerContract().createIntent(context, options(media, 4, multiple, backend))
        assertEquals(ActivityResultContracts.PickVisualMedia.ACTION_SYSTEM_FALLBACK_PICK_IMAGES, intent.action)
        assertEquals("com.example.systempicker", intent.component?.packageName)
        assertEquals(when (media) { "photo" -> "image/*"; "video" -> "video/*"; else -> null }, intent.type)
        val maxExtra = ActivityResultContracts.PickVisualMedia.EXTRA_SYSTEM_FALLBACK_PICK_IMAGES_MAX
        assertEquals(multiple, intent.hasExtra(maxExtra))
        if (multiple) assertEquals(4, intent.getIntExtra(maxExtra, 0))
      }
    }
  }

  @Test
  @Config(sdk = [33])
  fun platformPickerTakesPriorityOverOemPicker() {
    registerSystemFallback()
    val backend = requireNotNull(PhotoPickerContract.probeStandardBackend(context, "video"))
    assertEquals(PhotoPickerContract.BACKEND_STANDARD, backend.source)
    assertEquals(MediaStore.ACTION_PICK_IMAGES, PhotoPickerContract().createIntent(context, options("video", 4, true, backend)).action)
  }

  @Test
  fun oemResultDoesNotClaimVerifiedNativeLimit() {
    registerSystemFallback()
    val module = PhotoPickerModule()
    val normalized = normalize(mapOf("mediaType" to "photo"))
    val candidate = plan("system", false).first()
    val request = module.javaClass.declaredMethods.first { it.name == "buildRequest" }.apply { isAccessible = true }.invoke(module, normalized, candidate)
    val backend = field(candidate, "backend") as PickerBackend
    val result = module.javaClass.declaredMethods.first { it.name == "backendInfoMap" }.apply { isAccessible = true }.invoke(module, request, backend) as Map<*, *>
    assertEquals("post-validation", result["selectionLimit"])
    assertEquals(false, result["orderedSelectionGuaranteed"])
  }

  @Test
  fun orderedSelectionIsForwardedToOemPicker() {
    registerSystemFallback()
    assertOrderedSelection(ActivityResultContracts.PickVisualMedia.EXTRA_SYSTEM_FALLBACK_PICK_IMAGES_IN_ORDER)
  }

  @Test
  @Config(sdk = [35])
  fun orderedSelectionIsForwardedToPlatformPicker() {
    assertOrderedSelection(MediaStore.EXTRA_PICK_IMAGES_IN_ORDER)
  }

  private fun assertOrderedSelection(extra: String) {
    val backend = requireNotNull(PhotoPickerContract.probeStandardBackend(context, "photo"))
    for (ordered in listOf(false, true)) {
      val intent = PhotoPickerContract().createIntent(context, options(max = 4, multiple = true, backend = backend).copy(orderedSelection = ordered))
      assertTrue(intent.hasExtra(extra))
      assertEquals(ordered, intent.getBooleanExtra(extra, !ordered))
    }
  }

  private fun plan(preference: String, allowDocumentFallback: Boolean): List<*> {
    val normalized = normalize(mapOf("mediaType" to "photo", "android" to mapOf("preference" to preference, "allowDocumentFallback" to allowDocumentFallback)))
    return PhotoPickerModule::class.java.declaredMethods.first { it.name == "resolvePlan" }.apply { isAccessible = true }
      .invoke(PhotoPickerModule(), normalized, context) as List<*>
  }

  private fun registerSystemFallback() {
    val info = ResolveInfo().apply {
      activityInfo = ActivityInfo().apply {
        packageName = "com.example.systempicker"
        name = "com.example.systempicker.PickerActivity"
        enabled = true
        exported = true
        applicationInfo = ApplicationInfo().apply {
          packageName = "com.example.systempicker"
          flags = ApplicationInfo.FLAG_SYSTEM
          enabled = true
        }
      }
    }
    shadowOf(context.packageManager).setResolveInfosForIntent(Intent(ActivityResultContracts.PickVisualMedia.ACTION_SYSTEM_FALLBACK_PICK_IMAGES), listOf(info))
  }

  private val galleryModes = listOf("photo" to false, "photo" to true, "video" to false, "video" to true)

  private fun assertNoGalleryModesResolve() {
    for ((media, multiple) in galleryModes) {
      assertNull("$media/$multiple", VendorGalleryAdapters.resolveVerified(context, media, multiple))
    }
  }

  private fun options(media: String = "photo", max: Int = 1, multiple: Boolean = false, backend: PickerBackend = document) =
    PhotoPickerContractOptions(media, max, multiple, backend)

  private fun registerGallery(
    packageName: String = "com.huawei.photos",
    activityName: String = "com.huawei.photos.PickerActivity",
    enabled: Boolean = true,
    exported: Boolean = true,
    appEnabled: Boolean = true,
  ) {
    val info = ResolveInfo().apply {
      activityInfo = ActivityInfo().apply {
        this.packageName = packageName
        name = activityName
        this.enabled = enabled
        this.exported = exported
        applicationInfo = ApplicationInfo().apply {
          this.packageName = packageName
          this.enabled = appEnabled
        }
      }
    }
    for (media in listOf("photo", "video")) {
      val intent = Intent(Intent.ACTION_PICK).apply {
        setPackage("com.huawei.photos")
        setDataAndType(
          if (media == "photo") MediaStore.Images.Media.EXTERNAL_CONTENT_URI else MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
          if (media == "photo") "image/*" else "video/*",
        )
      }
      shadowOf(context.packageManager).setResolveInfosForIntent(intent, listOf(info))
    }
  }

  private fun normalize(options: Map<String, Any?>?): Any {
    val method = PhotoPickerModule::class.java.getDeclaredMethod("normalizeOptions", Map::class.java).apply { isAccessible = true }
    return try {
      requireNotNull(method.invoke(PhotoPickerModule(), options))
    } catch (error: InvocationTargetException) {
      throw requireNotNull(error.cause)
    }
  }

  private fun field(value: Any?, name: String): Any? =
    requireNotNull(value).javaClass.getDeclaredField(name).apply { isAccessible = true }.get(value)
}
