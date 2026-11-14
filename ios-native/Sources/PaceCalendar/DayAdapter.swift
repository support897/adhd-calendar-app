import Foundation

/// The day maths, ported line-for-line in behaviour from the
/// shipped web code of record (pace-b39 logic.js sortDay /
/// adaptDay / autoVersion / dayScore and app.js repeatMatches /
/// instanceOf / tasksOn / sortForDayOrder). Pure logic: state
/// in, the day as it should be SHOWN out. Nothing is deleted
/// by an adaptation — parked tasks rest out of sight, exactly
/// as the shipped app holds them.

struct PaceInstance: Identifiable {
    var task: PaceTask
    var dayKey: String
    var displayTitle: String
    var displayDurationMin: Double
    var shrunk: Bool = false
    var status: String { task.status }
    var id: String { task.id + "@" + dayKey }
}

struct AdaptedDay {
    var visible: [PaceInstance] = []
    var parked: [PaceInstance] = []
    var done: [PaceInstance] = []
    var stretch: PaceInstance? = nil   // tomorrow's first, on a full day
}

enum DayAdapter {

    // MARK: Recurrence (app.js repeatMatches of record)

    static func repeatMatches(_ task: PaceTask, dayKey: String, calendar: Calendar = .current) -> Bool {
        guard let rule = task.repeatRule else { return dayKey == task.date }
        if dayKey < task.date { return false }
        guard let day = PaceState.date(fromKey: dayKey, calendar: calendar),
              let base = PaceState.date(fromKey: task.date, calendar: calendar) else { return false }
        let wd = calendar.component(.weekday, from: day) - 1   // 0 = Sunday, as JS getDay()
        let baseWd = calendar.component(.weekday, from: base) - 1
        switch rule {
        case "every day": return true
        case "every weekday": return wd >= 1 && wd <= 5
        case "every weekend": return wd == 0 || wd == 6
        case "every week": return wd == baseWd
        case "every 2 weeks":
            let days = Int(day.timeIntervalSince(base) / 86400)
            return wd == baseWd && days % 14 == 0
        case "every month":
            let last = calendar.range(of: .day, in: .month, for: day)?.count ?? 30
            return calendar.component(.day, from: day) == min(calendar.component(.day, from: base), last)
        case "every year":
            let baseMonth = calendar.component(.month, from: base)
            guard calendar.component(.month, from: day) == baseMonth else { return false }
            var comps = DateComponents(year: calendar.component(.year, from: day), month: baseMonth)
            comps.day = 1
            let first = calendar.date(from: comps) ?? day
            let last = calendar.range(of: .day, in: .month, for: first)?.count ?? 30
            return calendar.component(.day, from: day) == min(calendar.component(.day, from: base), last)
        default:
            if rule.hasPrefix("days:") {
                let days = rule.dropFirst(5).split(separator: ",").compactMap { Int($0) }
                return days.contains(wd)
            }
            let names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
            return rule == "every " + names[wd]
        }
    }

    static func instance(of task: PaceTask, dayKey: String) -> PaceInstance {
        var copy = task
        if task.repeatRule != nil && task.doneDates.contains(dayKey) {
            copy.status = "done"
        }
        // The instance stands on its own day; the base task
        // keeps its base date in the document, untouched.
        return PaceInstance(task: copy, dayKey: dayKey,
                            displayTitle: task.title,
                            displayDurationMin: task.durationMin)
    }

    /// tasksOn of record: skipDates honoured, repeats expanded.
    static func instances(on dayKey: String, state: PaceState) -> [PaceInstance] {
        state.tasks.compactMap { task in
            if task.skipDates.contains(dayKey) { return nil }
            guard repeatMatches(task, dayKey: dayKey) else { return nil }
            return instance(of: task, dayKey: dayKey)
        }
    }

    static func instances(from startKey: String, through endKey: String, state: PaceState) -> [PaceInstance] {
        var out: [PaceInstance] = []
        var key = startKey
        while key <= endKey {
            out += instances(on: key, state: state)
            guard let d = PaceState.date(fromKey: key),
                  let next = Calendar.current.date(byAdding: .day, value: 1, to: d) else { break }
            key = PaceState.dayKey(for: next)
        }
        return out
    }

    // MARK: Sorting (logic.js sortDay + app.js sortForDayOrder)

    static func sortDay(_ items: [PaceInstance]) -> [PaceInstance] {
        items.sorted { a, b in
            let at = a.task.time, bt = b.task.time
            if let at, let bt {
                if at != bt { return at < bt }
                return a.task.priority > b.task.priority
            }
            if at != nil { return true }
            if bt != nil { return false }
            if a.task.priority != b.task.priority { return a.task.priority > b.task.priority }
            return a.task.durationMin < b.task.durationMin
        }
    }

    static func sortForDayOrder(_ items: [PaceInstance], dayKey: String, state: PaceState) -> [PaceInstance] {
        let saved = state.dayOrder[dayKey] ?? []
        guard !saved.isEmpty else { return items }
        return items.sorted { a, b in
            let ia = saved.firstIndex(of: a.task.id) ?? Int.max
            let ib = saved.firstIndex(of: b.task.id) ?? Int.max
            if ia != ib { return ia < ib }
            return false
        }
    }

    // MARK: autoVersion (logic.js of record, build 37)

    private static let autoVerbs: [(pattern: String, low: String, steady: String, lowCap: Double)] = [
        ("write|draft|compose|essay|article|report|blog|post|thesis|proposal", "3 lines only", "half of it", 10),
        ("read|study|revise|review|learn|course|chapter", "1 page only", "10 minutes", 10),
        ("clean|tidy|laundry|dishes|vacuum|declutter|organise|organize|sort|pack", "5 min tidy", "one area", 5),
        ("email|emails|reply|respond|message|inbox|text", "one quick reply", "top 3 only", 5),
        ("call|phone|ring", "short call or text", "keep it brief", 5),
        ("gym|workout|exercise|run|jog|walk|yoga|train|training|swim|stretch", "5 min easy move", "short session", 10),
        ("cook|meal|dinner|lunch|breakfast|prep", "something simple", "quick version", 15),
        ("pay|bill|bills|invoice|tax|taxes|budget|admin|paperwork|form", "first line only", "the main part", 10),
        ("plan|planning|schedule|roadmap|outline|brainstorm", "list 3 things", "first part only", 10),
    ]

    static func autoVersion(_ task: PaceTask, level: String) -> (title: String, durationMin: Double, kind: String)? {
        let dur = task.durationMin
        let title = task.title
        let row = autoVerbs.first { title.range(of: "\\b(" + $0.pattern + ")\\b",
                                                options: [.regularExpression, .caseInsensitive]) != nil }
        if level == "low" {
            if dur <= 10 { return nil }
            let cap = row?.lowCap ?? 5
            return (title + " (" + (row?.low ?? "5 minutes only") + ")", min(dur, cap), "light")
        }
        if level == "steady" {
            if dur < 30 { return nil }
            let halved = (dur / 2 / 5).rounded() * 5
            return (title + " (" + (row?.steady ?? "short version") + ")", halved, "medium")
        }
        return nil
    }

    // MARK: adaptDay (logic.js of record)

    static func adaptDay(on dayKey: String, state: PaceState) -> AdaptedDay {
        let level = state.feelings[dayKey] ?? "steady"
        let all = instances(on: dayKey, state: state)
        let sorted = sortDay(all.filter { $0.status != "done" })
        var result = AdaptedDay()
        result.done = all.filter { $0.status == "done" }

        var visible: [PaceInstance] = []
        var parked: [PaceInstance] = []
        if level == "low" {
            // Ruled shape (Pace Boss desk ruling, 2026-11-15;
            // the commission's words govern): essentials stand
            // in day order; taught stand after them in day
            // order, shown shrunk — the bare minimum never
            // parks, no cap on minimums; from the rest, in day
            // order, add only while the visible day is under
            // three; everything else parks in day order,
            // counted on the parked line, never dropped.
            let essential = sorted.filter { $0.task.essential }
            let taught = sorted.filter { !$0.task.essential && $0.task.minVersion != nil }
            let rest = sorted.filter { !$0.task.essential && $0.task.minVersion == nil }
            visible = essential + taught
            for item in rest {
                if visible.count >= 3 { break }
                visible.append(item)
            }
            let visibleIds = Set(visible.map { $0.task.id })
            parked = sorted.filter { !visibleIds.contains($0.task.id) }
        } else if level == "full" {
            visible = sorted
            if let tomorrow = Calendar.current.date(byAdding: .day, value: 1,
                                                    to: PaceState.date(fromKey: dayKey) ?? Date()) {
                let tomorrowKey = PaceState.dayKey(for: tomorrow)
                let candidates = sortDay(instances(on: tomorrowKey, state: state)
                    .filter { $0.status != "done" && !$0.task.essential })
                result.stretch = candidates.first
            }
        } else {
            visible = Array(sorted.prefix(6))
            parked = Array(sorted.dropFirst(6))
        }

        result.visible = visible.map { inst in
            var copy = inst
            copy.displayTitle = inst.task.title
            copy.shrunk = false
            if level == "low", let minVersion = inst.task.minVersion {
                copy.displayTitle = minVersion.hasPrefix("Just 5 minutes")
                    ? "Just 5 minutes: " + inst.task.title : minVersion
                copy.shrunk = true
            }
            if !copy.shrunk && inst.task.minVersion == nil && (level == "low" || level == "steady") {
                if let av = autoVersion(inst.task, level: level) {
                    copy.displayTitle = av.title
                    copy.displayDurationMin = av.durationMin
                    copy.shrunk = av.kind == "light"
                }
            }
            if level == "full", let fullVersion = inst.task.fullVersion {
                copy.displayTitle = fullVersion
            }
            return copy
        }
        result.parked = sortForDayOrder(parked, dayKey: dayKey, state: state)
        result.visible = sortForDayOrder(result.visible, dayKey: dayKey, state: state)
        return result
    }

    /// dayScore of record: progress is scored against the
    /// ADAPTED plan, never the full list. Returns 0...1.
    static func dayScore(_ adapted: AdaptedDay) -> Double {
        let total = adapted.visible.count + adapted.done.count
        guard total > 0 else { return 0 }
        return Double(adapted.done.count) / Double(total)
    }
}
