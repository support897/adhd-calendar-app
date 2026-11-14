import Foundation

/// Tolerant Swift model of her Pace state, decoded from the
/// `stateJson` string inside users/{uid}/data/state.
/// The shape of record was read from the shipped web code
/// (pace-b39 app.js load() normalisation): every field is
/// optional-tolerant exactly as load() is — a wrong shape
/// repairs to a default, it never bricks the screen.
/// Unknown keys are ignored on read; writes go through the
/// raw-dictionary door in StateStore, so nothing the model
/// does not know is ever dropped from her document.
/// NOTE: settings.appearance.photo is deliberately never read
/// here — it can be a multi-MB data URI and no screen needs it.

struct PaceTask: Identifiable {
    let id: String
    let title: String
    let date: String          // "YYYY-MM-DD" — the base date
    let time: String?         // "HH:mm"
    let durationMin: Double
    var status: String        // "todo" / "done" / ...
    let category: String?
    let goalId: String?
    var allDay: Bool = false
    var steps: [String] = []
    var skipDates: [String] = []
    var doneDates: [String] = []
    var remind: [Double]?     // minutes before, or nil
    var repeatRule: String?   // "every day" / "every week" / "days:1,3" / ...
    var icon: String?
    var color: String?
    var essential: Bool = false
    var priority: Double = 0
    var minVersion: String?
    var fullVersion: String?
    var habitId: String?
    var doneOn: String?
    /// Weekly-chunk marker carried by goal steps (Phase 1 shape).
    var weekStart: String?
}

struct PaceGoal: Identifiable {
    let id: String
    let title: String         // her full goal sentence, of record
    var start: String?
    var end: String?
    var pace: String?         // "daily" / "weekdays" / "three"
    var category: String?     // GOAL_CATEGORIES id, when stored
    var sharedGoalId: String? // set when this goal is shared (P5)

    /// Display-only short name for cards (named derivation):
    /// the title's first five words — whole title when five or
    /// fewer. The stored title is never changed.
    var shortName: String {
        let words = title.split(separator: " ")
        guard words.count > 5 else { return title }
        return words.prefix(5).joined(separator: " ")
    }
}

struct PaceHabit: Identifiable {
    let id: String
    let name: String
    var icon: String = "star"
    var days: [String: Bool] = [:]   // day key -> ticked
    var plan: String = ""
    var tiny: String = ""
}

struct PaceTodo: Identifiable {
    let id: String
    var text: String
    var done: Bool = false
    var calTaskId: String?
}

/// The settings block of record (pace-b39 defaultSettings):
/// every field optional-tolerant, exactly as load() reads it.
struct PaceSettings {
    var checkinTime: String = "08:00"
    var wakeTime: String = "07:00"
    var windTime: String = "22:00"
    var notifCheckin: Bool = true
    var notifStart: Bool = true      // task notifications, ON by default (her 14 Nov ruling)
    var notifSetup: Int = 5          // minutes before a task
    var notifDigest: Bool = false
    var notifDigestTimes: [String] = ["12:30", "16:30"]
    var notifDone: Bool = false
    var notifDoneTime: String = "20:00"
}

struct PaceState {
    var profileName: String?
    var settings: PaceSettings = PaceSettings()
    var tasks: [PaceTask] = []
    var goals: [PaceGoal] = []
    var habits: [PaceHabit] = []
    var todos: [PaceTodo] = []
    var feelings: [String: String] = [:]   // day key -> low/steady/full
    /// Her manual order for one day: date -> task ids.
    var dayOrder: [String: [String]] = [:]
    /// Her own words for the three feelings (settings.names).
    var feelingNames: [String: String] = ["low": "Bad", "steady": "Ok", "full": "Great"]
    var checkinTime: String = "08:00"
    /// Appearance theme key (settings.appearance.theme).
    var theme: String = "white"
    var welcomed: Bool = false

    /// Tasks standing on the given local day, in her order
    /// (dayOrder first, then by time), not done. Kept from P2 —
    /// the base-date read the proof screen used. The calendar
    /// reads instances through DayAdapter (repeats expanded).
    func tasks(on day: String) -> [PaceTask] {
        let todays = tasks.filter { $0.date == day && $0.status != "done" }
        let order = dayOrder[day] ?? []
        return todays.sorted { a, b in
            let ia = order.firstIndex(of: a.id) ?? Int.max
            let ib = order.firstIndex(of: b.id) ?? Int.max
            if ia != ib { return ia < ib }
            return (a.time ?? "99:99") < (b.time ?? "99:99")
        }
    }

    static var todayString: String { dayKey(for: Date()) }

    /// Day keys come from LOCAL date parts, never from a UTC
    /// conversion (the shipped app's L.todayKey rule).
    static func dayKey(for date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func date(fromKey key: String, calendar: Calendar = .current) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    // MARK: - Tolerant parse

    static func parse(stateJson: String) -> PaceState? {
        guard let data = stateJson.data(using: .utf8),
              let root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            return nil
        }
        return parse(root: root)
    }

    static func parse(root: [String: Any]) -> PaceState {
        var state = PaceState()

        if let settings = root["settings"] as? [String: Any] {
            if let name = settings["profileName"] as? String, !name.isEmpty {
                state.profileName = name
            }
            if let names = settings["names"] as? [String: Any] {
                for key in ["low", "steady", "full"] {
                    if let word = names[key] as? String, !word.isEmpty {
                        state.feelingNames[key] = word
                    }
                }
            }
            if let checkin = settings["checkinTime"] as? String, !checkin.isEmpty {
                state.checkinTime = checkin
            }
            if let appearance = settings["appearance"] as? [String: Any],
               let theme = appearance["theme"] as? String, !theme.isEmpty {
                state.theme = theme
            }
            var parsed = PaceSettings()
            if let wake = settings["wakeTime"] as? String { parsed.wakeTime = wake }
            if let wind = settings["windTime"] as? String { parsed.windTime = wind }
            if let notif = settings["notif"] as? [String: Any] {
                if let v = notif["checkin"] as? Bool { parsed.notifCheckin = v }
                if let v = notif["start"] as? Bool { parsed.notifStart = v }
                if let v = (notif["setup"] as? NSNumber)?.intValue { parsed.notifSetup = v }
                if let v = notif["digest"] as? Bool { parsed.notifDigest = v }
                if let v = (notif["digestTimes"] as? [Any])?.compactMap({ $0 as? String }), !v.isEmpty {
                    parsed.notifDigestTimes = v
                }
                if let v = notif["done"] as? Bool { parsed.notifDone = v }
                if let v = notif["doneTime"] as? String { parsed.notifDoneTime = v }
            }
            state.settings = parsed
        }

        if let rawTasks = root["tasks"] as? [[String: Any]] {
            state.tasks = rawTasks.compactMap { t in
                guard let id = t["id"] as? String,
                      let title = t["title"] as? String,
                      let date = t["date"] as? String else { return nil }
                var chunkWeek: String? = nil
                if let chunk = t["chunk"] as? [String: Any] {
                    chunkWeek = chunk["weekStart"] as? String
                }
                return PaceTask(
                    id: id,
                    title: title,
                    date: date,
                    time: t["time"] as? String,
                    durationMin: (t["durationMin"] as? NSNumber)?.doubleValue ?? 25,
                    status: (t["status"] as? String) ?? "todo",
                    category: t["category"] as? String,
                    goalId: t["goalId"] as? String,
                    allDay: (t["allDay"] as? Bool) ?? false,
                    steps: (t["steps"] as? [Any])?.compactMap { $0 as? String } ?? [],
                    skipDates: (t["skipDates"] as? [Any])?.compactMap { $0 as? String } ?? [],
                    doneDates: (t["doneDates"] as? [Any])?.compactMap { $0 as? String } ?? [],
                    remind: (t["remind"] as? [Any])?.compactMap { ($0 as? NSNumber)?.doubleValue },
                    repeatRule: t["repeat"] as? String,
                    icon: t["icon"] as? String,
                    color: t["color"] as? String,
                    essential: (t["essential"] as? Bool) ?? false,
                    priority: (t["priority"] as? NSNumber)?.doubleValue ?? 0,
                    minVersion: (t["minVersion"] as? String).flatMap { $0.isEmpty ? nil : $0 },
                    fullVersion: (t["fullVersion"] as? String).flatMap { $0.isEmpty ? nil : $0 },
                    habitId: t["habitId"] as? String,
                    doneOn: t["doneOn"] as? String,
                    weekStart: (t["weekStart"] as? String) ?? chunkWeek
                )
            }
        }

        if let rawGoals = root["goals"] as? [[String: Any]] {
            state.goals = rawGoals.compactMap { g in
                guard let id = g["id"] as? String,
                      let title = g["title"] as? String else { return nil }
                return PaceGoal(id: id, title: title,
                                start: g["start"] as? String,
                                end: g["end"] as? String,
                                pace: g["pace"] as? String,
                                category: g["category"] as? String,
                                sharedGoalId: g["sharedGoalId"] as? String)
            }
        }

        if let rawHabits = root["habits"] as? [[String: Any]] {
            state.habits = rawHabits.compactMap { h in
                guard let id = h["id"] as? String,
                      let name = h["name"] as? String else { return nil }
                var days: [String: Bool] = [:]
                if let rawDays = h["days"] as? [String: Any] {
                    for (k, v) in rawDays { days[k] = (v as? Bool) ?? ((v as? NSNumber)?.boolValue ?? false) }
                }
                return PaceHabit(id: id, name: name,
                                 icon: (h["icon"] as? String) ?? "star",
                                 days: days,
                                 plan: (h["plan"] as? String) ?? "",
                                 tiny: (h["tiny"] as? String) ?? "")
            }
        }

        if let rawTodos = root["todos"] as? [Any] {
            state.todos = rawTodos.compactMap { item in
                // load() repairs a bare string entry into an item.
                if let text = item as? String, !text.isEmpty {
                    return PaceTodo(id: UUID().uuidString.lowercased(), text: text)
                }
                guard let t = item as? [String: Any],
                      let text = t["text"] as? String else { return nil }
                return PaceTodo(id: (t["id"] as? String) ?? UUID().uuidString.lowercased(),
                                text: text,
                                done: (t["done"] as? Bool) ?? false,
                                calTaskId: t["calTaskId"] as? String)
            }
        }

        if let rawFeelings = root["feelings"] as? [String: Any] {
            for (k, v) in rawFeelings {
                if let key = v as? String { state.feelings[k] = key }
            }
        }

        if let rawOrder = root["dayOrder"] as? [String: Any] {
            for (day, ids) in rawOrder {
                if let list = ids as? [String] {
                    state.dayOrder[day] = list
                }
            }
        }

        state.welcomed = (root["welcomed"] as? Bool) ?? false
        return state
    }
}
