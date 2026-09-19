import ExpoModulesCore
import VisionKit

public class ReceiptVisionModule: Module {
  private var scannerDelegate: ReceiptDocumentScannerDelegate?

  public func definition() -> ModuleDefinition {
    Name("ReceiptVision")

    Function("isDocumentScannerSupported") {
      VNDocumentCameraViewController.isSupported
    }

    AsyncFunction("scanDocument") { (promise: Promise) in
      guard VNDocumentCameraViewController.isSupported else {
        promise.reject(
          "ERR_RECEIPT_SCANNER_UNAVAILABLE",
          "The document scanner is unavailable on this device."
        )
        return
      }

      guard let viewController = self.appContext?.utilities?.currentViewController() else {
        promise.reject(
          "ERR_RECEIPT_SCANNER_PRESENTATION",
          "Unable to find a view controller for the document scanner."
        )
        return
      }

      let scanner = VNDocumentCameraViewController()
      let delegate = ReceiptDocumentScannerDelegate(
        promise: promise,
        onComplete: { [weak self] in
          self?.scannerDelegate = nil
        }
      )

      self.scannerDelegate = delegate
      scanner.delegate = delegate
      viewController.present(scanner, animated: true)
    }.runOnQueue(.main)

    AsyncFunction("recognizeReceipt") { (uri: String, promise: Promise) in
      do {
        let result = try ReceiptTextRecognizer.recognize(uri: uri)
        promise.resolve(result)
      } catch {
        promise.reject(
          "ERR_RECEIPT_OCR",
          "Apple Vision could not recognize this receipt image."
        )
      }
    }
  }
}
