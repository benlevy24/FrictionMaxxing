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

        // NOTE: startMonitoring requires ApplicationToken (from FamilyActivityPicker) for
        // DeviceActivityEvent.applications — cannot be constructed from bundle ID strings.
        // Stubbed until FamilyActivityPicker integration is added.
        // Daily timer enforcement will be wired up in that follow-up.
        AsyncFunction("startMonitoring") { (_: [String], _: Int, promise: Promise) in
            promise.resolve(["success": true])
        }

        Function("stopMonitoring") {
            self.center.stopMonitoring()
        }

        // ─────────────────────────────────────────────────────────
        // LOCKOUT MODE — block / unblock apps
        // ─────────────────────────────────────────────────────────

        /// Hard-block a list of apps via ManagedSettings.
        /// Users will see a shield when they try to open a blocked app.
        // NOTE: blockApps/shieldApps require ApplicationToken (from FamilyActivityPicker),
        // not Application(bundleIdentifier:). These are stubbed until FamilyActivityPicker
        // integration is added. The core Shortcuts friction flow works without these.
        Function("blockApps") { (_: [String]) in
            // TODO: implement with FamilyActivitySelection tokens from FamilyActivityPicker
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
        Function("shieldApps") { (_: [String]) in
            // TODO: implement with FamilyActivitySelection tokens from FamilyActivityPicker
        }

        /// Remove all shields (e.g. if the user removes an app from every group).
        Function("unshieldAll") {
            self.store.shield.applications = nil
        }

        /// Unblock a single app for a timed window, then re-lock it.
        /// Call this after the user beats a game in lockout mode.
        /// Returns { success: Bool } when the window has closed and the app is re-locked.
        AsyncFunction("unlockForWindow") { (_: String, _: Int, promise: Promise) in
            // TODO: implement with FamilyActivitySelection tokens from FamilyActivityPicker
            promise.resolve(["success": true])
        }
    }
}
