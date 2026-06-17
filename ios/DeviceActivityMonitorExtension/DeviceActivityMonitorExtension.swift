// DeviceActivityMonitorExtension.swift
// This is a SEPARATE Xcode target (not part of the main app).
// In Xcode: File > New > Target > DeviceActivity Monitor Extension
// Bundle ID: com.frictionmaxxing.app.DeviceActivityMonitorExtension
//
// This extension runs in a background process. It fires when:
//   1. A gated app hits the daily usage threshold (enforces daily timer)
//   2. The monitoring interval starts/ends (midnight reset)
//
// It cannot import React Native or Expo — it communicates with the main
// app only via App Group shared storage (AppGroupStorage.swift).
// Copy AppGroupStorage.swift into this extension's target membership too.

import DeviceActivity
import ManagedSettings
import Foundation

class DeviceActivityMonitorExtension: DeviceActivityMonitor {

    private let store = ManagedSettingsStore()

    // ─────────────────────────────────────────────────────────────
    // Daily usage threshold reached for a specific app
    // ─────────────────────────────────────────────────────────────
    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        guard activity == DeviceActivityName("frictionmaxxing_daily") else { return }
        guard AppGroupStorage.dailyTimerEnabled else { return }

        // Look up the bundle ID from the mapping written by FrictionMaxxingModule
        let mapping = AppGroupStorage.eventToBundleId
        guard let bundleId = mapping[event.rawValue] else { return }
        guard AppGroupStorage.gatedApps.contains(bundleId) else { return }

        // Lock the app via ManagedSettings
        if let app = Application(bundleIdentifier: bundleId) {
            var blocked = store.application.blockedApplications ?? []
            blocked.insert(app)
            store.application.blockedApplications = blocked
        }

        // Post a local notification so the user knows why the app is blocked
        scheduleNotification(for: bundleId)
    }

    // ─────────────────────────────────────────────────────────────
    // Daily interval ended (11:59 PM → midnight): reset all locks
    // ─────────────────────────────────────────────────────────────
    override func intervalDidEnd(for activity: DeviceActivityName) {
        guard activity == DeviceActivityName("frictionmaxxing_daily") else { return }
        // Unblock everything — monitoring resets fresh for the next day
        store.application.blockedApplications = nil
    }

    override func intervalDidStart(for activity: DeviceActivityName) {
        // New day started — apps are unlocked, monitoring begins fresh
    }

    // ─────────────────────────────────────────────────────────────
    // Local notification helper
    // ─────────────────────────────────────────────────────────────
    private func scheduleNotification(for bundleId: String) {
        // Strip bundle ID to a readable label (best-effort)
        let label = bundleId.components(separatedBy: ".").last?.capitalized ?? bundleId

        let content = UNMutableNotificationContent()
        content.title = "Daily limit reached"
        content.body = "\(label) is locked for the day. Open FrictionMaxxing to adjust."
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "dailyLimit_\(bundleId)",
            content: content,
            trigger: nil  // deliver immediately
        )
        UNUserNotificationCenter.current().add(request)
    }
}

// Need this import for UNUserNotificationCenter in an extension
import UserNotifications
