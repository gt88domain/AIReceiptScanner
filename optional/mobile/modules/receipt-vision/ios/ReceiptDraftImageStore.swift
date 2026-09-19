import Foundation
import UIKit

enum ReceiptDraftImageStore {
  static func persist(uri: String) throws -> [String: Any] {
    let sourceURL = fileURL(from: uri)
    let data = try Data(contentsOf: sourceURL)

    guard let image = UIImage(data: data) else {
      throw ReceiptDraftImageStoreError.invalidImage
    }

    let directory = try draftDirectory()
    let destination = directory
      .appendingPathComponent("draft-\(UUID().uuidString)")
      .appendingPathExtension("jpg")

    guard let jpeg = image.jpegData(compressionQuality: 0.92) else {
      throw ReceiptDraftImageStoreError.imageEncodingFailed
    }

    try jpeg.write(to: destination, options: [.atomic, .completeFileProtection])

    return [
      "uri": destination.absoluteString,
      "width": Int(image.size.width * image.scale),
      "height": Int(image.size.height * image.scale),
    ]
  }

  static func delete(uri: String) throws {
    let url = fileURL(from: uri)
    let directory = try draftDirectory().standardizedFileURL
    let file = url.standardizedFileURL

    guard file.path.hasPrefix(directory.path + "/") else {
      return
    }

    if FileManager.default.fileExists(atPath: file.path) {
      try FileManager.default.removeItem(at: file)
    }
  }

  private static func draftDirectory() throws -> URL {
    let base = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let directory = base.appendingPathComponent("receipt-drafts", isDirectory: true)
    try FileManager.default.createDirectory(
      at: directory,
      withIntermediateDirectories: true
    )

    var protectedDirectory = directory
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    try protectedDirectory.setResourceValues(resourceValues)

    return protectedDirectory
  }

  private static func fileURL(from uri: String) -> URL {
    if let url = URL(string: uri), url.isFileURL {
      return url
    }
    return URL(fileURLWithPath: uri)
  }
}

enum ReceiptDraftImageStoreError: Error {
  case invalidImage
  case imageEncodingFailed
}
