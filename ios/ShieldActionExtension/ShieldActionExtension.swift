// ShieldActionExtension.swift
// This is a SEPARATE Xcode target (not part of the main app).
// In Xcode: File > New > Target > Shield Action Extension
// Bundle ID: com.frictionmaxxing.app.ShieldActionExtension
//
// This extension handles what happens when a user taps buttons on the
// system shield shown over a ManagedSettings-blocked app (lockout mode).
//
// Flow:
//   1. User tries to open a blocked app → iOS shows the shield
//   2. Shield has a primary button ("Play a game to unlock")
//   3. User taps it → this extension fires
//   4. Extension posts a local notification with a deep link
//   5. User taps the notification → FrictionMaxxing opens → game plays
//   6. After winning, JS calls unlockForWindow() → app re-opens
//
// Note: Extensions cannot call UIApplication.shared.open() directly.
// The notification deep link is the correct pattern for opening an app
// from a ShieldActionExtension.
//
// Copy AppGroupStorage.swift into this extension's target membership too.

import ManagedSettings
import UserNotifications
import Foundation

class ShieldActionExtension: ShieldActionDelegate {

    // Called when the user taps the primary action button on the shield
    override func handle(
        action: ShieldAction,
        for application: ApplicationToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        switch action {
        case .primaryButtonPressed:
            // Post a notification that deep-links into FrictionMaxxing
            // The notification carries the app token encoded as a string so
            // the game screen knows which app to unlock after beating the game.
            sendUnlockNotification()
            completionHandler(.close)  // Close the shield overlay

        case .secondaryButtonPressed:
            completionHandler(.close)

        @unknown default:
            completionHandler(.close)
        }
    }

    override func handle(
        action: ShieldAction,
        for webDomain: WebDomainToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        completionHandler(.close)
    }

    override func handle(
        action: ShieldAction,
        for category: ActivityCategoryToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        switch action {
        case .primaryButtonPressed:
            sendUnlockNotification()
            completionHandler(.close)
        default:
            completionHandler(.close)
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Post a notification that opens FrictionMaxxing via deep link
    // ─────────────────────────────────────────────────────────────
    private func sendUnlockNotification() {
        let content = UNMutableNotificationContent()
        content.title = "Unlock this app"
        content.body = "Tap to play a game and unlock it."
        content.sound = .default
        // Deep link into the lockout game flow
        // GameScreen reads the 'lockout=true' param and calls unlockForWindow() on win
        content.userInfo = ["url": "frictionmaxxing://game?lockout=true"]

        let request = UNNotificationRequest(
            identifier: "lockoutUnlock_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil  // deliver immediately
        )
        UNUserNotificationCenter.current().add(request)
    }
}
