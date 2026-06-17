// AppGroupStorage.swift
// Shared data layer between the main app and all extensions (DeviceActivity, ShieldAction).
// Both the main app and extensions read/write here via the App Group container.
// App Group ID must be registered in the Apple Developer portal and added as a capability
// to EVERY target that uses this file (main app + each extension).

import Foundation

let APP_GROUP_ID = "group.com.frictionmaxxing.app"

enum AppGroupStorage {

    static var defaults: UserDefaults {
        guard let d = UserDefaults(suiteName: APP_GROUP_ID) else {
            fatalError("App Group \(APP_GROUP_ID) not configured. Add the App Groups capability in Xcode for every target.")
        }
        return d
    }

    // MARK: - Keys

    private enum Key {
        static let gatedApps              = "gatedApps"              // [String] bundle IDs
        static let eventToBundleId        = "eventToBundleId"        // [String:String] eventName → bundleId
        static let lockoutMode            = "lockoutMode"            // Bool
        static let lockoutWindowMinutes   = "lockoutWindowMinutes"   // Int
        static let dailyTimerEnabled      = "dailyTimerEnabled"      // Bool
        static let dailyTimerMinutes      = "dailyTimerMinutes"      // Int (per-app daily cap)
        static let difficulty             = "difficulty"             // String: "easy" | "medium" | "hard"
        static let authorizationGranted   = "authorizationGranted"   // Bool
    }

    // MARK: - Gated apps

    /// Bundle IDs the user has designated as gated (e.g. "com.burbn.instagram").
    static var gatedApps: [String] {
        get { defaults.stringArray(forKey: Key.gatedApps) ?? [] }
        set { defaults.set(newValue, forKey: Key.gatedApps) }
    }

    // MARK: - Event name → bundle ID mapping
    // DeviceActivity event names are strings. We store a mapping so the extension
    // can safely look up the bundle ID without doing fragile string reversal.

    static var eventToBundleId: [String: String] {
        get { defaults.dictionary(forKey: Key.eventToBundleId) as? [String: String] ?? [:] }
        set { defaults.set(newValue, forKey: Key.eventToBundleId) }
    }

    // MARK: - Lockout mode

    static var lockoutMode: Bool {
        get { defaults.bool(forKey: Key.lockoutMode) }
        set { defaults.set(newValue, forKey: Key.lockoutMode) }
    }

    /// How many minutes the app stays unlocked after the user beats a game (lockout mode).
    static var lockoutWindowMinutes: Int {
        get {
            let v = defaults.integer(forKey: Key.lockoutWindowMinutes)
            return v > 0 ? v : 1
        }
        set { defaults.set(newValue, forKey: Key.lockoutWindowMinutes) }
    }

    // MARK: - Daily timer

    static var dailyTimerEnabled: Bool {
        get { defaults.bool(forKey: Key.dailyTimerEnabled) }
        set { defaults.set(newValue, forKey: Key.dailyTimerEnabled) }
    }

    /// Minutes of daily usage allowed before DeviceActivity locks the app.
    static var dailyTimerMinutes: Int {
        get {
            let v = defaults.integer(forKey: Key.dailyTimerMinutes)
            return v > 0 ? v : 30
        }
        set { defaults.set(newValue, forKey: Key.dailyTimerMinutes) }
    }

    // MARK: - Misc

    static var difficulty: String {
        get { defaults.string(forKey: Key.difficulty) ?? "medium" }
        set { defaults.set(newValue, forKey: Key.difficulty) }
    }

    /// Set to true after FamilyControls authorization is granted.
    /// This is the flag that replaces screenTimePermissionGranted: false in JS.
    static var authorizationGranted: Bool {
        get { defaults.bool(forKey: Key.authorizationGranted) }
        set { defaults.set(newValue, forKey: Key.authorizationGranted) }
    }
}
