import Foundation
import MapKit
import UIKit

private let kMinimumSpanM = 200.0
private let kImageScale: CGFloat = 3

@objc public class LiftosaurMapSnapshotImpl: NSObject {
  @objc public static let shared = LiftosaurMapSnapshotImpl()

  private var running: Set<MKMapSnapshotter> = []

  @objc(renderWithLats:lons:width:height:padding:completion:)
  public func render(
    lats: [NSNumber],
    lons: [NSNumber],
    width: Double,
    height: Double,
    padding: Double,
    completion: @escaping (NSDictionary?, String?) -> Void
  ) {
    DispatchQueue.main.async {
      let coordinates = zip(lats, lons).map {
        CLLocationCoordinate2D(latitude: $0.doubleValue, longitude: $1.doubleValue)
      }
      guard !coordinates.isEmpty, width > padding * 2, height > padding * 2 else {
        completion(nil, "Nothing to draw")
        return
      }
      let options = MKMapSnapshotter.Options()
      options.mapRect = Self.fittedRect(coordinates, width: width, height: height, padding: padding)
      options.size = CGSize(width: width, height: height)
      options.scale = kImageScale
      options.mapType = .mutedStandard
      options.pointOfInterestFilter = .excludingAll
      options.showsBuildings = false
      options.traitCollection = UITraitCollection(userInterfaceStyle: .dark)
      let snapshotter = MKMapSnapshotter(options: options)
      self.running.insert(snapshotter)
      snapshotter.start { snapshot, error in
        self.running.remove(snapshotter)
        guard let snapshot = snapshot, let data = snapshot.image.jpegData(compressionQuality: 0.85) else {
          completion(nil, error?.localizedDescription ?? "No map image")
          return
        }
        let url = FileManager.default.temporaryDirectory
          .appendingPathComponent("run-map-\(UUID().uuidString).jpg")
        do {
          try data.write(to: url)
        } catch {
          completion(nil, error.localizedDescription)
          return
        }
        let points = coordinates.map { snapshot.point(for: $0) }
        completion(
          [
            "uri": url.absoluteString,
            "xs": points.map { Double($0.x) },
            "ys": points.map { Double($0.y) },
          ],
          nil
        )
      }
    }
  }

  // The rect has the image's aspect ratio, so MapKit draws exactly this area and the route fits inside the padding.
  private static func fittedRect(
    _ coordinates: [CLLocationCoordinate2D],
    width: Double,
    height: Double,
    padding: Double
  ) -> MKMapRect {
    let points = coordinates.map(MKMapPoint.init)
    let minX = points.map(\.x).min()!
    let maxX = points.map(\.x).max()!
    let minY = points.map(\.y).min()!
    let maxY = points.map(\.y).max()!
    let minimumSpan = MKMapPointsPerMeterAtLatitude(coordinates[0].latitude) * kMinimumSpanM
    let spanX = max(maxX - minX, minimumSpan)
    let spanY = max(maxY - minY, minimumSpan)
    let unitsPerPoint = max(spanX / (width - padding * 2), spanY / (height - padding * 2))
    let rectWidth = width * unitsPerPoint
    let rectHeight = height * unitsPerPoint
    return MKMapRect(
      x: (minX + maxX) / 2 - rectWidth / 2,
      y: (minY + maxY) / 2 - rectHeight / 2,
      width: rectWidth,
      height: rectHeight
    )
  }
}
