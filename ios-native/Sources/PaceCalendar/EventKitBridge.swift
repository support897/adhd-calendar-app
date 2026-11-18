import Foundation
import EventKit

/// The Apple Calendar mirror (skill pick of record for P3:
/// local-ios-eventkit). Pace's own state stays the store of
/// record; this bridge mirrors her tasks into a "Pace"
/// calendar in Apple Calendar so her day also stands where
/// iOS shows calendars. One shared EKEventStore instance;
/// iOS 17 full-access request; changes observed and re-read.
///
/// Mapping of record: task -> EKEvent with start = the task's
/// local date + time, end = start + durationMin; the repeat
/// string maps to an EKRecurrenceRule; the remind array maps
/// to EKAlarm relative offsets (minutes before -> negative
/// seconds). The mapping is explicit about the timezone:
/// events are built from local date components in the
/// device's current timezone, never from UTC strings.
final class EventKitBridge {
    static let shared = EventKitBridge()

    private let store = EKEventStore()
    private let calendarTitle = "Pace"
    private let mapKey = "pace.eventkit.map.v1"
    private var observer: NSObjectProtocol?

    private init() {
        observer = NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged, object: store, queue: nil) { _ in
            // The store changed under us (an edit in Calendar,
            // another app). Pace state is the record; the next
            // sync re-mirrors from it. Nothing is read back
            // into her state from EventKit — named, one-way.
            print("EventKit store changed; Pace mirror re-syncs from state on next pass.")
        }
    }

    deinit {
        if let observer { NotificationCenter.default.removeObserver(observer) }
    }

    func requestAccess() async -> Bool {
        do {
            return try await store.requestFullAccessToEvents()
        } catch {
            print("EventKit access ended: \(error.localizedDescription)")
            return false
        }
    }

    private func paceCalendar() -> EKCalendar? {
        let target = UserDefaults.standard.string(forKey: "pace.cal.target") ?? ""
        if let existing = store.calendars(for: .event).first(where: { $0.title == calendarTitle }) {
            if target.isEmpty || existing.source.title == target { return existing }
            // She moved Pace to another account: remove the old one, re-mirror there.
            try? store.removeCalendar(existing, commit: true)
            UserDefaults.standard.removeObject(forKey: mapKey)
        }
        let chosen = target.isEmpty ? nil : store.sources.first(where: {
            $0.title == target && $0.calendars(for: .event).contains { $0.allowsContentModifications } })
        guard let source = chosen ?? store.defaultCalendarForNewEvents?.source ?? store.sources.first else {
            return nil
        }
        let calendar = EKCalendar(for: .event, eventStore: store)
        calendar.title = calendarTitle
        calendar.source = source
        calendar.cgColor = CGColor(red: 0.357, green: 0.42, blue: 0.835, alpha: 1) // Still Water
        do {
            try store.saveCalendar(calendar, commit: true)
            return calendar
        } catch {
            print("EventKit calendar save ended: \(error.localizedDescription)")
            return nil
        }
    }

    private func recurrenceRule(for task: PaceTask) -> EKRecurrenceRule? {
        guard let rule = task.repeatRule,
              let base = PaceState.date(fromKey: task.date) else { return nil }
        let weekday = Calendar.current.component(.weekday, from: base)   // 1 = Sunday
        let ekWeekday = EKWeekday(rawValue: weekday) ?? .sunday
        func weekly(_ interval: Int = 1) -> EKRecurrenceRule {
            EKRecurrenceRule(recurrenceWith: .weekly, interval: interval,
                             daysOfTheWeek: [EKRecurrenceDayOfWeek(ekWeekday)],
                             daysOfTheMonth: nil, monthsOfTheYear: nil,
                             weeksOfTheYear: nil, daysOfTheYear: nil,
                             setPositions: nil, end: nil)
        }
        switch rule {
        case "every day":
            return EKRecurrenceRule(recurrenceWith: .daily, interval: 1, end: nil)
        case "every weekday":
            return EKRecurrenceRule(recurrenceWith: .weekly, interval: 1,
                                    daysOfTheWeek: [.monday, .tuesday, .wednesday, .thursday, .friday]
                                        .map { EKRecurrenceDayOfWeek($0) },
                                    daysOfTheMonth: nil, monthsOfTheYear: nil,
                                    weeksOfTheYear: nil, daysOfTheYear: nil,
                                    setPositions: nil, end: nil)
        case "every weekend":
            return EKRecurrenceRule(recurrenceWith: .weekly, interval: 1,
                                    daysOfTheWeek: [EKRecurrenceDayOfWeek(.saturday), EKRecurrenceDayOfWeek(.sunday)],
                                    daysOfTheMonth: nil, monthsOfTheYear: nil,
                                    weeksOfTheYear: nil, daysOfTheYear: nil,
                                    setPositions: nil, end: nil)
        case "every week": return weekly()
        case "every 2 weeks": return weekly(2)
        case "every month":
            return EKRecurrenceRule(recurrenceWith: .monthly, interval: 1, end: nil)
        case "every year":
            return EKRecurrenceRule(recurrenceWith: .yearly, interval: 1, end: nil)
        default:
            if rule.hasPrefix("days:") {
                let days = rule.dropFirst(5).split(separator: ",").compactMap { Int($0) }
                let mapped = days.compactMap { EKWeekday(rawValue: $0 + 1) }.map { EKRecurrenceDayOfWeek($0) }
                if !mapped.isEmpty {
                    return EKRecurrenceRule(recurrenceWith: .weekly, interval: 1,
                                            daysOfTheWeek: mapped,
                                            daysOfTheMonth: nil, monthsOfTheYear: nil,
                                            weeksOfTheYear: nil, daysOfTheYear: nil,
                                            setPositions: nil, end: nil)
                }
            }
            if rule.hasPrefix("every ") {
                let names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
                let name = String(rule.dropFirst(6))
                if let idx = names.firstIndex(of: name), let day = EKWeekday(rawValue: idx + 1) {
                    return EKRecurrenceRule(recurrenceWith: .weekly, interval: 1,
                                            daysOfTheWeek: [EKRecurrenceDayOfWeek(day)],
                                            daysOfTheMonth: nil, monthsOfTheYear: nil,
                                            weeksOfTheYear: nil, daysOfTheYear: nil,
                                            setPositions: nil, end: nil)
                }
            }
            return nil
        }
    }

    /// Mirror the given tasks. Batched: one commit at the end.
    /// Done tasks are removed from the mirror; skipped dates
    /// are not expressible per-occurrence here and stay a
    /// Pace-side display rule (named limit of the mirror).
    func sync(tasks: [PaceTask]) async {
        guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else { return }
        guard let calendar = paceCalendar() else { return }
        var map = (UserDefaults.standard.dictionary(forKey: mapKey) as? [String: String]) ?? [:]
        let liveIds = Set(tasks.filter { $0.status != "done" }.map { $0.id })

        // Remove events whose task is gone or done.
        for (taskId, eventId) in map where !liveIds.contains(taskId) {
            if let event = store.event(withIdentifier: eventId) {
                try? store.remove(event, span: .futureEvents, commit: false)
            }
            map.removeValue(forKey: taskId)
        }

        for task in tasks where task.status != "done" {
            guard let start = Self.startDate(for: task) else { continue }
            let end = start.addingTimeInterval(max(task.durationMin, 5) * 60)
            let event: EKEvent
            if let eventId = map[task.id], let existing = store.event(withIdentifier: eventId) {
                event = existing
            } else {
                event = EKEvent(eventStore: store)
                event.calendar = calendar
            }
            event.title = task.title
            event.startDate = start
            event.endDate = end
            event.isAllDay = task.allDay || task.time == nil
            event.timeZone = TimeZone.current
            event.recurrenceRules = recurrenceRule(for: task).map { [$0] }
            event.alarms = (task.remind ?? []).map { EKAlarm(relativeOffset: -$0 * 60) }
            do {
                try store.save(event, span: .futureEvents, commit: false)
                if let savedId = event.eventIdentifier { map[task.id] = savedId }
            } catch {
                print("EventKit save ended for \(task.id): \(error.localizedDescription)")
            }
        }

        do {
            try store.commit()
            UserDefaults.standard.set(map, forKey: mapKey)
        } catch {
            print("EventKit commit ended: \(error.localizedDescription)")
        }
    }

    static func startDate(for task: PaceTask) -> Date? {
        guard let day = PaceState.date(fromKey: task.date) else { return nil }
        guard let time = task.time else { return day }
        let parts = time.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2 else { return day }
        return Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: day)
    }
}
