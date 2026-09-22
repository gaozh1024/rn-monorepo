import AVFoundation
import Darwin
import ExpoModulesCore
import ImageIO
import os.log
import Photos
import PhotosUI
import UIKit
import UniformTypeIdentifiers

private let pickerLog = OSLog(subsystem: "com.gaozh1024.photo-picker", category: "PhotoPickerModule")

/**
 * iOS backend for @gaozh1024/photo-picker built on PHPickerViewController
 * (iOS 14+, permissionless — mirrors the Android Photo Picker philosophy).
 *
 * Contract alignment with the Android implementation (`PhotoPickerModule.kt`):
 * - Module name, AsyncFunction names, option keys, result map keys, backend
 *   info shape, and PICKER_* error codes are identical across platforms.
 * - Cancellation resolves with `{cancelled: true, assets: [], ...}` instead of
 *   rejecting; PHPicker reports cancellation as an empty result list.
 * - Selection limits are enforced natively by PHPicker (`selectionLimit`), so
 *   `selectionLimit` is always reported as `native`; an over-limit return is
 *   still post-validated and rejected with PICKER_SELECTION_LIMIT_EXCEEDED.
 * - Materialization is sequential and all-or-nothing: a read/cache failure of
 *   any item rejects the whole request and the cache directories already
 *   created by the request are removed (same semantics as `materializeAll`).
 * - `nativeUi.accentColor` / `nativeUi.defaultTab` are Android concepts; when
 *   provided they are reported under `ignoredUiOptions`.
 */
public final class PhotoPickerModule: Module {
  private static let backendSource = "ios-phpicker"
  private static let backendAction = "PHPickerViewController"

  private var pickerCacheDirectory: URL {
    FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("photo-picker", isDirectory: true)
  }

  // MARK: - Module definition

  public func definition() -> ModuleDefinition {
    Name("PhotoPickerModule")

    AsyncFunction("pickMedia") { (options: [String: Any]?) async throws -> [String: Any] in
      // The busy guard spans the whole request, matching the Android module.
      guard await self.claimPickerSession() else {
        os_log(.error, log: pickerLog, "pickMedia rejected: PICKER_BUSY")
        throw pickerException("PICKER_BUSY", "A media picker request is already in progress")
      }
      do {
        let request = try PickerRequest(options: options)
        os_log(.default, log: pickerLog, "pickMedia start (mediaType=%{public}@, max=%{public}d)", request.mediaType, request.requestedMaxSelection)
        let results = try await self.presentPicker(request: request)

        if results.isEmpty {
          // PHPicker reports user cancellation as an empty selection.
          var result = Self.baseResult(request: request)
          result["cancelled"] = true
          result["assets"] = [[String: Any]]()
          await self.releasePickerSession()
          return result
        }

        // Post-validation, never silent truncation (Android parity).
        if results.count > request.effectiveMaxSelection {
          throw pickerException(
            "PICKER_SELECTION_LIMIT_EXCEEDED",
            "The picker returned \(results.count) items, exceeding the effective limit of "
              + "\(request.effectiveMaxSelection) (requested \(request.requestedMaxSelection))"
          )
        }

        let assets = try await self.materializeAll(results: results, request: request)
        var result = Self.baseResult(request: request)
        result["cancelled"] = false
        result["assets"] = assets
        await self.releasePickerSession()
        return result
      } catch {
        await self.releasePickerSession()
        throw error
      }
    }

    // Probe only: never opens UI, never reads media, never requests permissions.
    AsyncFunction("getCapabilities") { (options: [String: Any]?) async throws -> [String: Any] in
      let request = try PickerRequest(options: options)
      let candidate: [String: Any] = [
        "source": Self.backendSource,
        "mediaTypes": ["photo", "video", "all"],
        "multiple": "supported",
        // PHPicker enforces selectionLimit inside the picker UI.
        "selectionLimit": "native",
        // PHPicker has no documented system cap; null means "not known".
        "maxSelection": NSNull(),
        "orderedSelection": "supported",
        "nativeUi": ["accentColor": false, "defaultTab": false],
      ]
      return [
        "available": true,
        "candidates": [candidate],
        "requestedMaxSelection": request.requestedMaxSelection,
        "effectiveMaxSelection": request.effectiveMaxSelection,
      ]
    }

    AsyncFunction("releaseMedia") { (uris: [String]) in
      let manager = FileManager.default
      let root = self.pickerCacheDirectory.resolvingSymlinksInPath().standardizedFileURL
      for uriString in uris {
        guard let url = URL(string: uriString), url.isFileURL else { continue }
        let file = url.standardizedFileURL
        let parent = file.deletingLastPathComponent()
        guard UUID(uuidString: parent.lastPathComponent) != nil,
              parent.deletingLastPathComponent().resolvingSymlinksInPath().standardizedFileURL.path == root.path,
              let parentAttributes = try? manager.attributesOfItem(atPath: parent.path),
              parentAttributes[.type] as? FileAttributeType == .typeDirectory,
              let fileAttributes = try? manager.attributesOfItem(atPath: file.path),
              fileAttributes[.type] as? FileAttributeType == .typeRegular
        else { continue }
        do {
          try manager.removeItem(at: file)
          _ = parent.withUnsafeFileSystemRepresentation { path in
            path.map { rmdir($0) } ?? -1
          }
        } catch {
          continue
        }
      }
    }

    AsyncFunction("clearPickerCache") {
      try? FileManager.default.removeItem(at: self.pickerCacheDirectory)
    }
  }

  // MARK: - Picker session

  private var pickerInFlight = false
  private var pickerDelegate: PickerDelegateProxy?

  @MainActor
  private func claimPickerSession() -> Bool {
    if pickerInFlight { return false }
    pickerInFlight = true
    return true
  }

  @MainActor
  private func releasePickerSession() {
    pickerInFlight = false
  }

  @MainActor
  private func presentPicker(request: PickerRequest) async throws -> [PHPickerResult] {
    // Present from a dedicated window instead of the RN view controller stack.
    // On iOS 26, presenting while an RN Fabric modal / navigation transition
    // owns the presentation chain silently drops the presentation (neither the
    // completion handler nor the delegate ever fires). A private window with a
    // plain root controller is immune to whatever the app is showing.
    guard let scene = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .first(where: { $0.activationState == .foregroundActive })
      ?? UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first
    else {
      throw pickerException(
        "PICKER_LAUNCH_FAILED",
        "Unable to launch PHPickerViewController: no active window scene (ios-phpicker)"
      )
    }

    let previousKeyWindow = scene.windows.first(where: { $0.isKeyWindow })
    let window = UIWindow(windowScene: scene)
    window.windowLevel = UIWindow.Level(rawValue: UIWindow.Level.alert.rawValue + 1)
    let host = UIViewController()
    window.rootViewController = host
    window.makeKeyAndVisible()
    pickerWindow = window

    var configuration = PHPickerConfiguration(photoLibrary: PHPhotoLibrary.shared())
    switch request.mediaType {
    case "photo": configuration.filter = .images
    case "video": configuration.filter = .videos
    default: configuration.filter = .any(of: [.images, .videos])
    }
    configuration.selectionLimit = request.effectiveMaxSelection
    configuration.selection = request.orderedSelection ? .ordered : .default
    configuration.preferredAssetRepresentationMode = .current

    let picker = PHPickerViewController(configuration: configuration)
    do {
      let results: [PHPickerResult] = try await withCheckedThrowingContinuation { continuation in
        let gate = PickerResumeGate(continuation: continuation)
        let proxy = PickerDelegateProxy { results in
          gate.resume(returning: results)
          if self.pickerDelegate != nil { self.pickerDelegate = nil }
        }
        picker.delegate = proxy
        // Swipe-to-dismiss does not call picker(_:didFinishPicking:); route it
        // through the presentation controller delegate so it resolves as cancel.
        picker.presentationController?.delegate = proxy
        self.pickerDelegate = proxy

        // Give the fresh window one runloop turn to attach before presenting.
        DispatchQueue.main.async {
          os_log(.default, log: pickerLog, "present PHPicker (mediaType=%{public}@) on picker window host", request.mediaType)
          host.present(picker, animated: true) {
            // present(_:animated:completion:) does not report failures; if the
            // picker never attached to a window the delegate would never fire and
            // the module would stay busy forever, so verify the presentation here.
            if picker.presentingViewController == nil {
              os_log(.error, log: pickerLog, "PHPicker presentation completion fired but picker is not presented")
              self.pickerDelegate = nil
              gate.resume(
                throwing: pickerException(
                  "PICKER_LAUNCH_FAILED",
                  "PHPickerViewController could not be presented (ios-phpicker)"
                )
              )
            } else {
              os_log(.default, log: pickerLog, "PHPicker presented")
            }
          }
        }

        // Watchdog: if the presentation still gets dropped silently, fail
        // loudly instead of hanging the JS promise.
        for checkpoint in [1.0, 3.0] {
          DispatchQueue.main.asyncAfter(deadline: .now() + checkpoint) { [weak picker] in
            guard let picker, !gate.hasResumed else { return }
            os_log(.default, log: pickerLog, "PHPicker attach check @%{public}.0fs: window=%{public}d, presenting=%{public}d", checkpoint, picker.viewIfLoaded?.window != nil, picker.presentingViewController != nil)
          }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak picker, weak self] in
          guard let picker, !gate.hasResumed else { return }
          if picker.viewIfLoaded?.window == nil && picker.presentingViewController == nil {
            os_log(.error, log: pickerLog, "PHPicker watchdog: not attached after grace period, dismissing")
            picker.dismiss(animated: false)
            self?.pickerDelegate = nil
            gate.resume(
              throwing: pickerException(
                "PICKER_LAUNCH_FAILED",
                "PHPickerViewController presentation did not complete (ios-phpicker)"
              )
            )
          }
        }
      }
      teardownPickerWindow(window, previousKeyWindow: previousKeyWindow, animated: true)
      return results
    } catch {
      teardownPickerWindow(window, previousKeyWindow: previousKeyWindow, animated: false)
      throw error
    }
  }

  private var pickerWindow: UIWindow?

  /// Releases the picker window. On success the picker is animating its own
  /// dismissal, so the window teardown is deferred to let it finish.
  private func teardownPickerWindow(_ window: UIWindow, previousKeyWindow: UIWindow?, animated: Bool) {
    let teardown = {
      window.isHidden = true
      window.rootViewController = nil
      previousKeyWindow?.makeKey()
      if self.pickerWindow === window { self.pickerWindow = nil }
    }
    if animated {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.4, execute: teardown)
    } else {
      teardown()
    }
  }

  // MARK: - Cache materialization (all-or-nothing, sequential)

  private func materializeAll(results: [PHPickerResult], request: PickerRequest) async throws -> [[String: Any]] {
    var createdDirectories: [URL] = []
    var assets: [[String: Any]] = []
    do {
      for result in results {
        assets.append(try await materialize(result: result, request: request, createdDirectories: &createdDirectories))
      }
      return assets
    } catch {
      // All-or-nothing: never report success with missing items behind it.
      for directory in Set(createdDirectories) {
        try? FileManager.default.removeItem(at: directory)
      }
      throw error
    }
  }

  private func materialize(
    result: PHPickerResult,
    request: PickerRequest,
    createdDirectories: inout [URL]
  ) async throws -> [String: Any] {
    let provider = result.itemProvider
    let isVideo = provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier)
    let isImage = !isVideo && provider.hasItemConformingToTypeIdentifier(UTType.image.identifier)
    guard isImage || isVideo else {
      throw pickerException(
        "PICKER_UNSUPPORTED_MEDIA",
        "The picker returned an item that is neither image nor video "
          + "(requested media type \"\(request.mediaType)\")"
      )
    }
    let acceptable = request.mediaType == "all"
      || (request.mediaType == "photo" && isImage)
      || (request.mediaType == "video" && isVideo)
    guard acceptable else {
      throw pickerException(
        "PICKER_UNSUPPORTED_MEDIA",
        "The picker returned a \(isVideo ? "video" : "photo") which does not match "
          + "the requested media type \"\(request.mediaType)\""
      )
    }

    let directory = pickerCacheDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try createDirectory(directory)
    createdDirectories.append(directory)

    let typeIdentifier = preferredTypeIdentifier(provider: provider, isVideo: isVideo)
    let typeExtension = UTType(typeIdentifier)?.preferredFilenameExtension
    var mimeType = UTType(typeIdentifier)?.preferredMIMEType

    let destination: URL
    do {
      destination = try await copyFileRepresentation(
        provider: provider,
        typeIdentifier: typeIdentifier,
        directory: directory,
        suggestedName: provider.suggestedName,
        fallbackExtension: typeExtension
      )
    } catch {
      // Only a read failure may fall back to UIImage re-encoding; a cache
      // failure must surface as PICKER_CACHE_FAILED (Android parity).
      guard (error as? Exception)?.code == "PICKER_READ_FAILED", isImage else {
        throw error
      }
      // File representations are unavailable for some providers (e.g. edited
      // images); fall back to a decoded UIImage re-encoded as PNG/JPEG.
      let fallback = try await copyImageObject(provider: provider, directory: directory)
      destination = fallback.url
      mimeType = fallback.mimeType
    }

    let fileSize = fileSizeOf(destination)
    var width = 0
    var height = 0
    var durationMs: Int? = nil
    if isVideo {
      let video = await readVideoMetadata(destination)
      width = video.width
      height = video.height
      durationMs = video.durationMs
    } else {
      (width, height) = imageDimensions(destination)
    }

    let filename = destination.lastPathComponent
    let fileUri = destination.absoluteString
    let capturedAt = readCapturedAt(assetIdentifier: result.assetIdentifier)
    var metadata: [String: Any]? = nil
    if let capturedAt { metadata = ["capturedAt": capturedAt] }

    return [
      // The PHPicker local identifier is the stable id on iOS; Android uses a
      // content-URI hash, both are opaque to callers.
      "id": result.assetIdentifier ?? filename,
      "uri": fileUri,
      "localUri": fileUri,
      "filename": filename,
      "fileName": filename,
      "mimeType": mimeType ?? "application/octet-stream",
      "mediaType": isVideo ? "video" : "photo",
      "fileSize": fileSize,
      "width": width,
      "height": height,
      "duration": durationMs.map { Double($0) / 1000.0 } ?? NSNull(),
      "durationMs": durationMs ?? NSNull(),
      "metadata": metadata ?? NSNull(),
      "source": Self.backendSource,
      "action": Self.backendAction,
    ]
  }

  /// Copies the provider's file representation inside the completion handler,
  /// because the temporary file is deleted when the handler returns.
  private func copyFileRepresentation(
    provider: NSItemProvider,
    typeIdentifier: String,
    directory: URL,
    suggestedName: String?,
    fallbackExtension: String?
  ) async throws -> URL {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Error>) in
      provider.loadFileRepresentation(forTypeIdentifier: typeIdentifier) { url, error in
        guard let url else {
          continuation.resume(
            throwing: pickerException(
              "PICKER_READ_FAILED",
              "Unable to read the selected media from the item provider",
              cause: error
            )
          )
          return
        }
        let filename = Self.resolveFileName(
          suggestedName: suggestedName,
          sourceURL: url,
          fallbackExtension: fallbackExtension
        )
        let destination = directory.appendingPathComponent(filename)
        do {
          try FileManager.default.copyItem(at: url, to: destination)
          continuation.resume(returning: destination)
        } catch {
          continuation.resume(
            throwing: pickerException(
              "PICKER_CACHE_FAILED",
              "Unable to copy the selected media into the picker cache",
              cause: error
            )
          )
        }
      }
    }
  }

  private func copyImageObject(provider: NSItemProvider, directory: URL) async throws -> (url: URL, mimeType: String) {
    guard provider.canLoadObject(ofClass: UIImage.self) else {
      throw pickerException(
        "PICKER_READ_FAILED",
        "The item provider can provide neither a file nor a UIImage for the selected photo"
      )
    }
    return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<(url: URL, mimeType: String), Error>) in
      _ = provider.loadObject(ofClass: UIImage.self) { object, error in
        guard let image = object as? UIImage else {
          continuation.resume(
            throwing: pickerException(
              "PICKER_READ_FAILED",
              "Unable to decode the selected photo from the item provider",
              cause: error
            )
          )
          return
        }
        let alphaInfo = image.cgImage?.alphaInfo
        let hasAlpha =
          alphaInfo == .first || alphaInfo == .last
          || alphaInfo == .premultipliedFirst || alphaInfo == .premultipliedLast
        let data = hasAlpha ? image.pngData() : image.jpegData(compressionQuality: 0.95)
        let filename = "media-\(UUID().uuidString).\(hasAlpha ? "png" : "jpg")"
        let destination = directory.appendingPathComponent(filename)
        guard let data else {
          continuation.resume(
            throwing: pickerException("PICKER_READ_FAILED", "Unable to re-encode the selected photo")
          )
          return
        }
        do {
          try data.write(to: destination, options: .atomic)
          continuation.resume(returning: (destination, hasAlpha ? "image/png" : "image/jpeg"))
        } catch {
          continuation.resume(
            throwing: pickerException(
              "PICKER_CACHE_FAILED",
              "Unable to write the selected photo into the picker cache",
              cause: error
            )
          )
        }
      }
    }
  }

  // MARK: - Metadata helpers

  private func preferredTypeIdentifier(provider: NSItemProvider, isVideo: Bool) -> String {
    let conformingType: UTType = isVideo ? .movie : .image
    for identifier in provider.registeredTypeIdentifiers {
      if let type = UTType(identifier), type.conforms(to: conformingType) {
        return identifier
      }
    }
    return conformingType.identifier
  }

  private func imageDimensions(_ url: URL) -> (Int, Int) {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    else { return (0, 0) }
    let width = properties[kCGImagePropertyPixelWidth] as? Int ?? 0
    let height = properties[kCGImagePropertyPixelHeight] as? Int ?? 0
    let orientation = properties[kCGImagePropertyOrientation] as? Int ?? 1
    return (5...8).contains(orientation) ? (height, width) : (width, height)
  }

  private func readVideoMetadata(_ url: URL) async -> (width: Int, height: Int, durationMs: Int?) {
    let asset = AVURLAsset(url: url)
    var durationMs: Int? = nil
    if let duration = try? await asset.load(.duration) {
      let seconds = CMTimeGetSeconds(duration)
      if seconds.isFinite && seconds > 0 {
        durationMs = Int((seconds * 1000).rounded())
      }
    }
    var width = 0
    var height = 0
    if let track = (try? await asset.loadTracks(withMediaType: .video))?.first,
       let naturalSize = try? await track.load(.naturalSize),
       let transform = try? await track.load(.preferredTransform) {
      let size = naturalSize.applying(transform)
      width = Int(abs(size.width).rounded())
      height = Int(abs(size.height).rounded())
    }
    return (width, height, durationMs)
  }

  /// Best-effort capture time. PHPicker grants transient access to the picked
  /// assets, so this fetch never prompts for photo library permission; without
  /// access it simply returns nothing and the metadata is omitted.
  private func readCapturedAt(assetIdentifier: String?) -> String? {
    guard let assetIdentifier else { return nil }
    let asset = PHAsset.fetchAssets(withLocalIdentifiers: [assetIdentifier], options: nil).firstObject
    guard let date = asset?.creationDate else { return nil }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: date)
  }

  private func createDirectory(_ directory: URL) throws {
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    } catch {
      throw pickerException(
        "PICKER_CACHE_FAILED",
        "Unable to create the picker cache directory",
        cause: error
      )
    }
  }

  private func fileSizeOf(_ url: URL) -> Int64 {
    let attributes = try? FileManager.default.attributesOfItem(atPath: url.path)
    return (attributes?[.size] as? NSNumber)?.int64Value ?? 0
  }

  /// Mirrors the Android `sanitizeFileName`: keep [A-Za-z0-9._-], cap at 180
  /// chars, and fall back to a generated name when nothing usable remains.
  /// Static so @Sendable provider callbacks never capture the module instance.
  private static func resolveFileName(suggestedName: String?, sourceURL: URL, fallbackExtension: String?) -> String {
    let rawName = suggestedName ?? sourceURL.lastPathComponent
    var cleaned = rawName
      .map { char -> Character in
        char.isASCII && (char.isLetter || char.isNumber || char == "." || char == "_" || char == "-") ? char : "_"
      }
      .reduce(into: "") { $0.append($1) }
    while cleaned.hasPrefix("_") { cleaned.removeFirst() }
    while cleaned.hasSuffix("_") { cleaned.removeLast() }
    cleaned = String(cleaned.prefix(180))
    if cleaned.isEmpty {
      return "media-\(UUID().uuidString).\(fallbackExtension ?? "bin")"
    }
    if (cleaned as NSString).pathExtension.isEmpty, let fallbackExtension {
      cleaned += ".\(fallbackExtension)"
    }
    return cleaned
  }

  // MARK: - Result / capability maps

  private static func baseResult(request: PickerRequest) -> [String: Any] {
    var applied: [String] = []
    var ignored: [String] = []
    // accentColor / defaultTab are Android-only UI hints; orderedSelection is
    // applied natively for multi-select sessions (iOS 15+, always true here).
    if request.accentColorProvided { ignored.append("accentColor") }
    if request.defaultTabProvided { ignored.append("defaultTab") }
    if request.orderedSelection {
      if request.allowsMultipleSelection {
        applied.append("orderedSelection")
      } else {
        ignored.append("orderedSelection")
      }
    }

    let backend: [String: Any] = [
      "source": Self.backendSource,
      "action": Self.backendAction,
      "vendorAdapterId": NSNull(),
      "selectionLimit": "native",
      "requestedMaxSelection": request.requestedMaxSelection,
      "effectiveMaxSelection": request.effectiveMaxSelection,
      "orderedSelectionGuaranteed": request.orderedSelection && request.allowsMultipleSelection,
      "appliedUiOptions": applied,
      "ignoredUiOptions": ignored,
    ]
    return [
      "source": Self.backendSource,
      "action": Self.backendAction,
      "backend": backend,
    ]
  }
}

// MARK: - Request normalization

/// Option normalization mirroring the Android `normalizeOptions`: the JS layer
/// validates first, but native re-validates so direct native callers get the
/// same PICKER_INVALID_OPTIONS contract. `android.*` strategy options are
/// ignored on iOS (there is a single PHPicker backend).
private struct PickerRequest {
  let mediaType: String
  let requestedMaxSelection: Int
  /// Effective selection mode: a maxSelection of 1 is always single-select.
  let allowsMultipleSelection: Bool
  let orderedSelection: Bool
  let accentColorProvided: Bool
  let defaultTabProvided: Bool

  var effectiveMaxSelection: Int {
    allowsMultipleSelection ? requestedMaxSelection : 1
  }

  init(options: [String: Any]?) throws {
    let rawMediaType = options?["mediaType"] as? String
    if let rawMediaType, rawMediaType != "photo", rawMediaType != "video", rawMediaType != "all" {
      throw pickerException("PICKER_INVALID_OPTIONS", "Unsupported mediaType: \(rawMediaType)")
    }
    self.mediaType = rawMediaType ?? "all"

    if let rawMaxSelection = options?["maxSelection"] {
      let value = (rawMaxSelection as? NSNumber)?.doubleValue ?? -1
      guard let maxSelection = Int(exactly: value), maxSelection > 0 else {
        throw pickerException(
          "PICKER_INVALID_OPTIONS",
          "maxSelection must be a positive integer, received \(value)"
        )
      }
      self.requestedMaxSelection = maxSelection
    } else {
      self.requestedMaxSelection = 1
    }

    if let cacheMode = options?["cacheMode"] as? String, cacheMode != "copy" {
      throw pickerException("PICKER_INVALID_OPTIONS", "Unsupported cacheMode: \(cacheMode)")
    }

    let allowsMultipleRaw = (options?["allowsMultipleSelection"] as? Bool) ?? (requestedMaxSelection > 1)
    self.allowsMultipleSelection = allowsMultipleRaw && requestedMaxSelection > 1

    let nativeUi = options?["nativeUi"] as? [String: Any]
    if let rawDefaultTab = nativeUi?["defaultTab"] as? String,
       rawDefaultTab != "photos", rawDefaultTab != "albums" {
      throw pickerException("PICKER_INVALID_OPTIONS", "Unsupported nativeUi.defaultTab: \(rawDefaultTab)")
    }
    self.orderedSelection = (nativeUi?["orderedSelection"] as? Bool) ?? false
    self.accentColorProvided = nativeUi?["accentColor"] != nil
    self.defaultTabProvided = nativeUi?["defaultTab"] != nil
  }
}

// MARK: - PHPicker delegate bridge

/// Guards the continuation so it is resumed exactly once, no matter which of
/// the delegate callback, the presentation completion check, or the watchdog
/// fires first.
private final class PickerResumeGate {
  private let lock = NSLock()
  private var continuation: CheckedContinuation<[PHPickerResult], Error>?

  init(continuation: CheckedContinuation<[PHPickerResult], Error>) {
    self.continuation = continuation
  }

  var hasResumed: Bool {
    lock.lock()
    defer { lock.unlock() }
    return continuation == nil
  }

  func resume(returning results: [PHPickerResult]) {
    lock.lock()
    let pending = continuation
    continuation = nil
    lock.unlock()
    pending?.resume(returning: results)
  }

  func resume(throwing error: Error) {
    lock.lock()
    let pending = continuation
    continuation = nil
    lock.unlock()
    pending?.resume(throwing: error)
  }
}

/// PHPickerViewController calls picker(_:didFinishPicking:) exactly once — on
/// selection and on cancellation via the Cancel button (empty results) — after
/// which it must be dismissed. Swipe-to-dismiss bypasses that callback, so the
/// proxy also implements UIAdaptivePresentationControllerDelegate and reports
/// it as a cancellation.
private final class PickerDelegateProxy: NSObject, PHPickerViewControllerDelegate, UIAdaptivePresentationControllerDelegate {
  private let completion: ([PHPickerResult]) -> Void
  private var finished = false

  init(completion: @escaping ([PHPickerResult]) -> Void) {
    self.completion = completion
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    guard !finished else { return }
    finished = true
    os_log(.default, log: pickerLog, "PHPicker didFinishPicking: %{public}d item(s)", results.count)
    picker.dismiss(animated: true)
    completion(results)
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    guard !finished else { return }
    finished = true
    os_log(.default, log: pickerLog, "PHPicker dismissed interactively (swipe)")
    completion([])
  }
}

// MARK: - Errors

/// Errors thrown to JS carry the stable PICKER_* code on `error.code`,
/// matching the Android module's CodedException contract.
private func pickerException(_ code: String, _ message: String, cause: Error? = nil) -> Exception {
  let exception = Exception(name: code, description: message, code: code)
  exception.cause = cause
  return exception
}
