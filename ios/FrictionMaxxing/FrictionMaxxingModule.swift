// FrictionMaxxingModule.swift
// Expo native module — the bridge between React Native JS and Swift.
// This file lives in the main app target (FrictionMaxxing).
// Expo's autolinking picks it up automatically via use_expo_modules! in the Podfile.
//
// JS usage:
//   import FrictionMaxxingNative from '../native/FrictionMaxxingNative';
//   await FrictionMaxxingNative.requestAuthorization();

import ExpoModulesCore
import FamilyControls
import DeviceActivity
import ManagedSettings

public class FrictionMaxxingModule: Module {

    private let store = ManagedSettingsStore()
    private let center = DeviceActivityCenter()

    public func definition() -> ModuleDefinition {

        Name("FrictionMaxxing")

        // ─────────────────────────────────────────────────────────
        // AUTHORIZATION
        // ─────────────────────────────────────────────────────────

        /// Show the system FamilyControls permission prompt (individual mode — self-restriction).
        /// Returns { granted: Bool, error?: String }
        AsyncFunction("requestAuthorization") { (promise: Promise) in
            Task {
                do {
                    try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                    AppGroupStorage.authorizationGranted = true
                    promise.resolve(["granted": true])
                } catch {
                    promise.resolve(["granted": false, "error": error.localizedDescription])
                }
            }
        }

        /// Returns "approved" | "denied" | "notDetermined"
        Function("getAuthorizationStatus") { () -> String in
            switch AuthorizationCenter.shared.authorizationStatus {
            case .approved:       return "approved"
            case .denied:         return "denied"
            case .notDetermined:  return "notDetermined"
            @unknown default:     return "unknown"
            }
        }

        // ─────────────────────────────────────────────────────────
        // SETTINGS SYNC
        // Push the relevant JS settings into App Group storage so
        // the DeviceActivity extension can read them.
        // Call this whenever the user changes settings.
        // ─────────────────────────────────────────────────────────

        /// settings: {
        ///   gatedApps?: string[]          bundle IDs
        ///   lockoutMode?: boolean
        ///   lockoutWindowMinutes?: number
        ///   dailyTimerEnabled?: boolean
        ///   dailyTimerMinutes?: number
        ///   difficulty?: 'easy'|'medium'|'hard'
        /// }
        Function("syncSettings") { (settings: [String: Any]) in
            if let gatedApps = settings["gatedApps"] as? [String] {
                AppGroupStorage.gatedApps = gatedApps
            }
            if let lockoutMode = settings["lockoutMode"] as? Bool {
                AppGroupStorage.lockoutMode = lockoutMode
            }
            if let lockoutWindowMinutes = settings["lockoutWindowMinutes"] as? Int {
                AppGroupStorage.lockoutWindowMinutes = lockoutWindowMinutes
            }
            if let dailyTimerEnabled = settings["dailyTimerEnabled"] as? Bool {
                AppGroupStorage.dailyTimerEnabled = dailyTimerEnabled
            }
            if let dailyTimerMinutes = settings["dailyTimerMinutes"] as? Int {
                AppGroupStorage.dailyTimerMinutes = dailyTimerMinutes
            }
            if let difficulty = settings["difficulty"] as? String {
                AppGroupStorage.difficulty = difficulty
            }
        }

        // ─────────────────────────────────────────────────────────
        // MONITORING (daily timer enforcement)
        // Starts a DeviceActivity schedule that fires
        // eventDidReachThreshold in the extension when a gated app
        // has been used for dailyMinutes today.
        // ─────────────────────────────────────────────────────────

        /// apps: string[]  — bundle IDs to monitor
        /// dailyMinutes: number — per-app daily cap before the extension fires
        /// Returns { success: Bool, error?: String }
        AsyncFunction("startMonitoring") { (apps: [String], dailyMinutes: Int, promise: Promise) in
            guard !apps.isEmpty, dailyMinutes > 0 else {
                promise.resolve(["success": false, "error": "Empty app list or invalid duration"])
                return
            }

            // Daily window: midnight → 11:59 PM, repeating
            let schedule = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: 0, minute: 0),
                intervalEnd:   DateComponents(hour: 23, minute: 59),
                repeats: true
            )

            var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
            var mapping: [String: String] = [:]  // eventName → bundleId

            for bundleId in apps {
                guard let app = Application(bundleIdentifier: bundleId) else { continue }

                // Build a stable event name (index-based to avoid bundle ID encoding issues)
                let safeName = "dailyLimit_\(apps.firstIndex(of: bundleId) ?? 0)"
                let eventName = DeviceActivityEvent.Name(safeName)

                events[eventName] = DeviceActivityEvent(
                    applications: [app],
                    threshold: DateComponents(minute: dailyMinutes)
                )
                mapping[safeName] = bundleId
            }

            guard !events.isEmpty else {
                promise.resolve(["success": false, "error": "No valid apps — check bundle IDs"])
                return
            }

            // Persist the mapping so the extension can look up bundle IDs by event name
            AppGroupStorage.eventToBundleId = mapping

            do {
                // Stop any existing monitoring session before starting a new one
                self.center.stopMonitoring([DeviceActivityName("frictionmaxxing_daily")])
                try self.center.startMonitoring(
                    DeviceActivityName("frictionmaxxing_daily"),
                    during: schedule,
                    events: events
                )
                promise.resolve(["success": true])
            } catch {
                promise.resolve(["success": false, "error": error.localizedDescription])
            }
        }

        /// Stop all DeviceActivity monitoring.
        Function("stopMonitoring") {
            self.center.stopMonitoring()
        }

        // ─────────────────────────────────────────────────────────
        // LOCKOUT MODE — block / unblock apps
        // ─────────────────────────────────────────────────────────

        /// Hard-block a list of apps via ManagedSettings.
        /// Users will see a shield when they try to open a blocked app.
        Function("blockApps") { (bundleIds: [String]) in
            let apps = Set(bundleIds.compactMap { Application(bundleIdentifier: $0) })
            guard !apps.isEmpty else { return }
            self.store.application.blockedApplications = apps
        }

        /// Remove all blocks (call after the unlock window expires).
        Function("unblockAll") {
            self.store.application.blockedApplications = nil
        }

        // ─────────────────────────────────────────────────────────
        // FRICTION GROUP SHIELDS
        // Gray out apps on the home screen (same appearance as iOS
        // "time limit reached") without hard-blocking them.
        // Tapping a shielded app fires ShieldActionExtension → deep link → GameScreen.
        // ─────────────────────────────────────────────────────────

        /// Apply the iOS "time limit" gray appearance to a list of apps.
        /// These apps remain openable — tapping them fires the ShieldAction.
        Function("shieldApps") { (bundleIds: [String]) in
            let apps = Set(bundleIds.compactMap { Application(bundleIdentifier: $0) })
            guard !apps.isEmpty else { return }
            self.store.shield.applications = apps
        }

        /// Remove all shields (e.g. if the user removes an app from every group).
        Function("unshieldAll") {
            self.store.shield.applications = nil
        }

        /// Unblock a single app for a timed window, then re-lock it.
        /// Call this after the user beats a game in lockout mode.
        /// Returns { success: Bool } when the window has closed and the app is re-locked.
        AsyncFunction("unlockForWindow") { (bundleId: String, minutes: Int, promise: Promise) in
            guard let app = Application(bundleIdentifier: bundleId) else {
                promise.resolve(["success": false, "error": "Invalid bundle ID"])
                return
            }

            // Remove this app from the blocked set
            var blocked = self.store.application.blockedApplications ?? []
            blocked.remove(app)
            self.store.application.blockedApplications = blocked.isEmpty ? nil : blocked

            // Re-lock after the window
            Task {
                let nanoseconds = UInt64(max(1, minutes)) * 60 * 1_000_000_000
                try? await Task.sleep(nanoseconds: nanoseconds)

                var relock = self.store.application.blockedApplications ?? []
                relock.insert(app)
                self.store.application.blockedApplications = relock

                promise.resolve(["success": true])
            }
        }
    }
}
