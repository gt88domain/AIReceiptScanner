import Foundation
import ImageIO
import UIKit
import Vision

enum ReceiptTextRecognizer {
  static func recognize(uri: String) throws -> [String: Any] {
    let start = CFAbsoluteTimeGetCurrent()
    let url = fileURL(from: uri)
    let data = try Data(contentsOf: url)

    guard let image = UIImage(data: data), let cgImage = image.cgImage else {
      throw ReceiptTextRecognizerError.invalidImage
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.automaticallyDetectsLanguage = true

    let handler = VNImageRequestHandler(
      cgImage: cgImage,
      orientation: image.imageOrientation.cgImagePropertyOrientation,
      options: [:]
    )
    try handler.perform([request])

    let observations = request.results ?? []
    let lines: [[String: Any]] = observations.compactMap { observation in
      guard let candidate = observation.topCandidates(1).first else {
        return nil
      }

      let box = observation.boundingBox
      return [
        "text": candidate.string,
        "confidence": Double(candidate.confidence),
        "bounds": [
          "x": Double(box.minX),
          "y": Double(1 - box.maxY),
          "width": Double(box.width),
          "height": Double(box.height),
        ],
      ]
    }

    let fullText = lines
      .compactMap { $0["text"] as? String }
      .joined(separator: "\n")
    let durationMs = Int((CFAbsoluteTimeGetCurrent() - start) * 1000)

    return [
      "engine": "apple-vision",
      "engineVersion": "VNRecognizeTextRequest-revision-\(request.revision)",
      "osVersion": UIDevice.current.systemVersion,
      "durationMs": durationMs,
      "width": cgImage.width,
      "height": cgImage.height,
      "lines": lines,
      "fullText": fullText,
    ]
  }

  private static func fileURL(from uri: String) -> URL {
    if let url = URL(string: uri), url.isFileURL {
      return url
    }
    return URL(fileURLWithPath: uri)
  }
}

enum ReceiptTextRecognizerError: Error {
  case invalidImage
}

private extension UIImage.Orientation {
  var cgImagePropertyOrientation: CGImagePropertyOrientation {
    switch self {
    case .up:
      return .up
    case .down:
      return .down
    case .left:
      return .left
    case .right:
      return .right
    case .upMirrored:
      return .upMirrored
    case .downMirrored:
      return .downMirrored
    case .leftMirrored:
      return .leftMirrored
    case .rightMirrored:
      return .rightMirrored
    @unknown default:
      return .up
    }
  }
}
