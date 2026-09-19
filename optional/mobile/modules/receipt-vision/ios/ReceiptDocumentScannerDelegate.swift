import ExpoModulesCore
import UIKit
import VisionKit

final class ReceiptDocumentScannerDelegate: NSObject, VNDocumentCameraViewControllerDelegate {
  private let promise: Promise
  private let onComplete: () -> Void

  init(promise: Promise, onComplete: @escaping () -> Void) {
    self.promise = promise
    self.onComplete = onComplete
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    controller.dismiss(animated: true)
    promise.legacyRejecter(
      "ERR_RECEIPT_SCAN_CANCELLED",
      "Receipt scanning was cancelled.",
      nil
    )
    onComplete()
  }

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFailWithError error: Error
  ) {
    controller.dismiss(animated: true)
    promise.legacyRejecter(
      "ERR_RECEIPT_SCAN_FAILED",
      "The document scanner failed.",
      error
    )
    onComplete()
  }

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFinishWith scan: VNDocumentCameraScan
  ) {
    guard scan.pageCount == 1 else {
      controller.dismiss(animated: true)
      promise.legacyRejecter(
        "ERR_RECEIPT_MULTI_PAGE_UNSUPPORTED",
        "Scan one receipt page at a time in this MVP.",
        nil
      )
      onComplete()
      return
    }

    do {
      let image = scan.imageOfPage(at: 0)
      let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent("receipt-vision", isDirectory: true)
      try FileManager.default.createDirectory(
        at: directory,
        withIntermediateDirectories: true
      )

      let fileURL = directory
        .appendingPathComponent("capture-\(UUID().uuidString)")
        .appendingPathExtension("jpg")

      guard let data = image.jpegData(compressionQuality: 0.92) else {
        throw ReceiptVisionNativeError.imageEncodingFailed
      }

      try data.write(to: fileURL, options: .atomic)

      let width = Int(image.size.width * image.scale)
      let height = Int(image.size.height * image.scale)

      controller.dismiss(animated: true)
      promise.resolve([
        "uri": fileURL.absoluteString,
        "width": width,
        "height": height,
      ])
      onComplete()
    } catch {
      controller.dismiss(animated: true)
      promise.legacyRejecter(
        "ERR_RECEIPT_SCAN_WRITE",
        "The scanned receipt could not be saved temporarily.",
        error
      )
      onComplete()
    }
  }
}

enum ReceiptVisionNativeError: Error {
  case imageEncodingFailed
}
