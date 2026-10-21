import Foundation

enum AppConfiguration {
    static var appGroupId: String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String,
              !value.isEmpty, !value.contains("$(") else {
            preconditionFailure("Set APP_GROUP_IDENTIFIER in AppBranding.xcconfig")
        }
        return value
    }

    static var offlineOnly: Bool {
        Bundle.main.object(forInfoDictionaryKey: "ForkOfflineOnly") as? Bool ?? true
    }
}
