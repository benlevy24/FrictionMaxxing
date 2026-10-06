import AppIntents
import UIKit

// Registers "Activate FrictionMaxxing (when app opens)" as a searchable
// action in iOS Shortcuts. Replaces the URL + Open URLs workaround.
//
// Shortcuts setup (replaces old steps 5-6):
//   1. New automation → Automation → App → pick target app → Is Opened
//   2. Automation ON, Notify OFF → Done
//   3. New Blank Automation → Add Action → search "FrictionMaxxing"
//   4. Select "Activate FrictionMaxxing (when app opens)"
//   5. Tap the "App Name" field → type the app name (e.g. Instagram)
//   6. Done — no URL copy-paste needed.

@available(iOS 16.0, *)
struct ActivateFrictionMaxxing: AppIntent {
    static var title: LocalizedStringResource = "Activate FrictionMaxxing (when app opens)"
    static var description = IntentDescription(
        "Show a friction game when an app is opened. Add this to a Shortcuts automation with the App trigger.",
        categoryName: "FrictionMaxxing"
    )

    // Don't auto-foreground the app — we open it ourselves via the deep link.
    static var openAppWhenRun = false

    @Parameter(
        title: "App Name",
        description: "The name of the app being intercepted (e.g. Instagram, TikTok). Must match the name you used in FrictionMaxxing → Friction Apps."
    )
    var appName: String

    func perform() async throws -> some IntentResult {
        let label = appName.trimmingCharacters(in: .whitespaces)
        // Derive a stable ID the same way the JS layer does.
        let id = label.lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .joined()

        var components = URLComponents()
        components.scheme = "frictionmaxxing"
        components.host = "game"
        components.queryItems = [
            URLQueryItem(name: "appId",  value: id.isEmpty ? "unknown" : id),
            URLQueryItem(name: "label",  value: label),
        ]

        if let url = components.url {
            await MainActor.run {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
        return .result()
    }
}
