import CoreLocation
import Foundation

private let kGeolocationPermissionDenied = 1
private let kGeolocationPositionUnavailable = 2
private let kPreciseLocationOff = 4

@objc public class LiftosaurLocationImpl: NSObject {
  @objc public static let shared = LiftosaurLocationImpl()

  private var manager: CLLocationManager?
  private lazy var delegateProxy = LocationDelegateProxy(owner: self)
  private var locationEmitter: ((NSDictionary) -> Void)?
  private var errorEmitter: ((NSDictionary) -> Void)?
  private var permissionWaiters: [(String) -> Void] = []
  private var isUpdating = false

  @objc(setLocationEmitter:errorEmitter:)
  public func setEmitters(
    location: @escaping (NSDictionary) -> Void,
    error: @escaping (NSDictionary) -> Void
  ) {
    DispatchQueue.main.async {
      self.locationEmitter = location
      self.errorEmitter = error
      self.stopUpdatesFromPreviousRuntime()
    }
  }

  private func stopUpdatesFromPreviousRuntime() {
    isUpdating = false
    manager?.stopUpdatingLocation()
    manager?.allowsBackgroundLocationUpdates = false
  }

  @objc public func requestPermission(completion: @escaping (String) -> Void) {
    DispatchQueue.main.async {
      let manager = self.locationManager()
      if manager.authorizationStatus == .notDetermined {
        self.permissionWaiters.append(completion)
        manager.requestWhenInUseAuthorization()
      } else {
        completion(Self.permission(manager))
      }
    }
  }

  @objc public func startUpdates() {
    DispatchQueue.main.async {
      let manager = self.locationManager()
      self.isUpdating = true
      // "Allow Once" resets to notDetermined once the app stops using location, so a Resume asks again.
      if manager.authorizationStatus == .notDetermined {
        manager.requestWhenInUseAuthorization()
      }
      manager.allowsBackgroundLocationUpdates = true
      manager.startUpdatingLocation()
    }
  }

  @objc public func stopUpdates() {
    DispatchQueue.main.async {
      self.isUpdating = false
      guard let manager = self.manager else { return }
      manager.stopUpdatingLocation()
      manager.allowsBackgroundLocationUpdates = false
    }
  }

  // CLLocationManager delivers delegate calls on the thread that created it, so it is created on main only.
  private func locationManager() -> CLLocationManager {
    if let manager = manager {
      return manager
    }
    let created = CLLocationManager()
    created.delegate = delegateProxy
    created.activityType = .fitness
    created.desiredAccuracy = kCLLocationAccuracyBest
    created.distanceFilter = kCLDistanceFilterNone
    // The default true stops updates when the runner stands still, and iOS does not restart them in the background.
    created.pausesLocationUpdatesAutomatically = false
    created.showsBackgroundLocationIndicator = true
    manager = created
    return created
  }

  private static func permission(_ manager: CLLocationManager) -> String {
    switch manager.authorizationStatus {
    case .authorizedWhenInUse, .authorizedAlways:
      return manager.accuracyAuthorization == .fullAccuracy ? "granted" : "approximate"
    default:
      return "denied"
    }
  }

  fileprivate func authorizationChanged(_ manager: CLLocationManager) {
    let status = manager.authorizationStatus
    if status == .notDetermined {
      return
    }
    let waiters = permissionWaiters
    permissionWaiters.removeAll()
    let permission = Self.permission(manager)
    for waiter in waiters {
      waiter(permission)
    }
    if isUpdating && permission == "denied" {
      errorEmitter?(["code": kGeolocationPermissionDenied])
    } else if isUpdating && permission == "approximate" {
      errorEmitter?(["code": kPreciseLocationOff])
    }
  }

  fileprivate func received(_ locations: [CLLocation]) {
    guard isUpdating, let emit = locationEmitter else { return }
    for location in locations where location.horizontalAccuracy >= 0 {
      var point: [String: Any] = [
        "t": location.timestamp.timeIntervalSince1970 * 1000,
        "lat": location.coordinate.latitude,
        "lon": location.coordinate.longitude,
        "acc": location.horizontalAccuracy,
      ]
      if location.verticalAccuracy >= 0 {
        point["alt"] = location.altitude
      }
      emit(point as NSDictionary)
    }
  }

  fileprivate func failed(_ error: Error) {
    guard isUpdating else { return }
    let code = (error as? CLError)?.code == .denied ? kGeolocationPermissionDenied : kGeolocationPositionUnavailable
    errorEmitter?(["code": code])
  }
}

// A public @objc class conforming to CLLocationManagerDelegate puts that protocol in Liftosaur-Swift.h,
// and the .mm files that import the header do not import CoreLocation.
private final class LocationDelegateProxy: NSObject, CLLocationManagerDelegate {
  private weak var owner: LiftosaurLocationImpl?

  init(owner: LiftosaurLocationImpl) {
    self.owner = owner
    super.init()
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    owner?.authorizationChanged(manager)
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    owner?.received(locations)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    owner?.failed(error)
  }
}
