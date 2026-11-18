import Foundation
import Security

/// What the app tells the widgets: one small snapshot in the
/// shared App Group. No account data, only today's picture.
struct WidgetSnapshot: Codable {
    var nextTitle: String
    var nextTime: String?
    var done: Int
    var total: Int
    var progress: Double
    var week: [Double]
    var updated: Date

    static let service = "pace.widget.snapshot"
    /// Team prefix + the app's own keychain group (already in the
    /// app's entitlements). The widget and app share it, so no
    /// App Group is needed.
    static let group = "GZ9Z6BPTFR.shop.ilseplacencia.pace"

    static var empty: WidgetSnapshot {
        WidgetSnapshot(nextTitle: "Open Pace", nextTime: nil, done: 0, total: 0,
                       progress: 0, week: [0, 0, 0, 0, 0, 0, 0], updated: Date())
    }

    private static func query(grouped: Bool) -> [String: Any] {
        var q: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                kSecAttrService as String: service,
                                kSecAttrAccount as String: "today"]
        if grouped { q[kSecAttrAccessGroup as String] = group }
        return q
    }

    static func load() -> WidgetSnapshot {
        for grouped in [true, false] {
            var q = query(grouped: grouped)
            q[kSecReturnData as String] = true
            q[kSecMatchLimit as String] = kSecMatchLimitOne
            var out: AnyObject?
            if SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess,
               let d = out as? Data, let s = try? JSONDecoder().decode(WidgetSnapshot.self, from: d) {
                return s
            }
        }
        return .empty
    }

    func save() {
        guard let d = try? JSONEncoder().encode(self) else { return }
        for grouped in [true, false] {
            let q = Self.query(grouped: grouped)
            SecItemDelete(q as CFDictionary)
            var add = q
            add[kSecValueData as String] = d
            add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
            if SecItemAdd(add as CFDictionary, nil) == errSecSuccess { return }
        }
    }
}
