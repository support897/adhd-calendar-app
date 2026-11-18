import Foundation

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

    static let groupID = "group.shop.ilseplacencia.pace"
    static let key = "pace.widget.snapshot"

    static var empty: WidgetSnapshot {
        WidgetSnapshot(nextTitle: "Open Pace", nextTime: nil, done: 0, total: 0,
                       progress: 0, week: [0, 0, 0, 0, 0, 0, 0], updated: Date())
    }

    static func load() -> WidgetSnapshot {
        guard let d = UserDefaults(suiteName: groupID)?.data(forKey: key),
              let s = try? JSONDecoder().decode(WidgetSnapshot.self, from: d) else { return .empty }
        return s
    }

    func save() {
        if let d = try? JSONEncoder().encode(self) {
            UserDefaults(suiteName: Self.groupID)?.set(d, forKey: Self.key)
        }
    }
}
