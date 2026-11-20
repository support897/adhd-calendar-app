import Foundation
import UserNotifications

/// ON-DEVICE LOCAL NOTIFICATIONS (skill pick of record for
/// P7: local-ios-push-notifications; her 14 Nov ruling:
/// task notifications ON by default at the right time, no
/// reminder setup needed; reminders stay optional on top).
/// Everything is scheduled on the device from her own state:
///   · the morning check-in, at her check-in time, daily —
///     only while that day has no answer yet is beyond a
///     local notification's sight, so it stands daily and
///     the tap lands on the question;
///   · a nudge before each timed task, settings.notif.setup
///     minutes ahead (default 5), for today and tomorrow;
///   · the midday digests and the day-done line, only when
///     she turns them on (they ship off).
/// NAMED: the closed-app PUSH server is PARKED by her word
/// (P7b) — there is no remote push in this app, no APNs
/// registration, by design. Local only.
enum NotificationScheduler {

    static func requestPermission() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            print("Notification permission ended: \(error.localizedDescription)")
            return false
        }
    }

    /// Rebuild the pending set from her state. Called when
    /// her state lands and after writes; identifiers are
    /// stable, so a rebuild replaces rather than stacks.
    static func reschedule(state: PaceState) async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized
                || settings.authorizationStatus == .provisional else { return }

        let mine = (await center.pendingNotificationRequests())
            .map { $0.identifier }
        center.removePendingNotificationRequests(withIdentifiers: mine)

        let notif = state.settings
        var requests: [UNNotificationRequest] = []

        // Pause all (Settings): nothing is scheduled until the
        // chosen time passes. Calm: a pause is a rest, not a loss.
        let pauseUntil = UserDefaults.standard.double(forKey: "pace.pauseUntil")
        if pauseUntil > Date().timeIntervalSince1970 { return }
        let lead = (UserDefaults.standard.object(forKey: "pace.lead") as? Int) ?? notif.notifSetup

        if notif.notifCheckin {
            let content = UNMutableNotificationContent()
            content.title = "How are you feeling today?"
            content.body = "One tap sets the shape of your day."
            content.sound = .default
            var when = DateComponents()
            let parts = notif.checkinTime.split(separator: ":").compactMap { Int($0) }
            when.hour = parts.first ?? 8
            when.minute = parts.count > 1 ? parts[1] : 0
            let trigger = UNCalendarNotificationTrigger(dateMatching: when, repeats: true)
            requests.append(UNNotificationRequest(identifier: "pace.checkin",
                                                  content: content, trigger: trigger))
        }

        // Always: a note at the start of every timed task.
        do {
            let today = PaceState.todayString
            let tomorrow = GoalPlanner.addDays(today, 1)
            for day in [today, tomorrow] {
                for inst in DayAdapter.instances(on: day, state: state) where inst.status != "done" {
                    guard let time = inst.task.time,
                          let dayDate = PaceState.date(fromKey: day) else { continue }
                    let timeParts = time.split(separator: ":").compactMap { Int($0) }
                    guard timeParts.count == 2,
                          let start = Calendar.current.date(bySettingHour: timeParts[0],
                                                            minute: timeParts[1],
                                                            second: 0, of: dayDate) else { continue }
                    for l in (lead > 0 ? [lead, 0] : [0]) {
                        let fire = start.addingTimeInterval(-Double(l) * 60)
                        guard fire > Date() else { continue }
                        let content = UNMutableNotificationContent()
                        content.title = inst.task.title
                        content.body = l == 0 ? "Time to start" : "In \(l) minutes"
                        content.sound = .default
                        let comps = Calendar.current.dateComponents(
                            [.year, .month, .day, .hour, .minute], from: fire)
                        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                        requests.append(UNNotificationRequest(
                            identifier: "pace.task.\(inst.task.id).\(day).\(l)",
                            content: content, trigger: trigger))
                    }
                }
            }
        }

        // Protect-the-streak nudge: one calm note at 8pm for a
        // habit with a streak of three or more not yet ticked.
        do {
            let today = PaceState.todayString
            var at = Calendar.current.dateComponents([.year, .month, .day], from: Date())
            at.hour = 20; at.minute = 0
            if let fire = Calendar.current.date(from: at), fire > Date() {
                for h in state.habits where h.days[today] != true {
                    let s = Streak.info(days: h.days, today: today)
                    guard s.current >= 3 else { continue }
                    let content = UNMutableNotificationContent()
                    content.title = "Keep your \(s.current)-day streak"
                    content.body = "One tick on \(h.name) does it."
                    content.sound = .default
                    let trig = UNCalendarNotificationTrigger(dateMatching: at, repeats: false)
                    requests.append(UNNotificationRequest(identifier: "pace.streak.\(h.id)",
                                                          content: content, trigger: trig))
                }
            }
        }

        // Habit reminders: at the time(s) she chose, repeating.
        for h in state.habits where h.remind && !h.times.isEmpty {
            for (i, t) in h.times.enumerated() {
                let p = t.split(separator: ":").compactMap { Int($0) }
                guard p.count == 2 else { continue }
                var days: [Int?] = [nil]
                if h.freq == "pick", !h.wdays.isEmpty, h.wdays.count < 7 { days = h.wdays.map { Optional($0) } }
                if h.freq == "weekly" { days = [h.wdays.first ?? Calendar.current.component(.weekday, from: Date())] }
                for d in days {
                    var dc = DateComponents(); dc.hour = p[0]; dc.minute = p[1]
                    if let d { dc.weekday = d }
                    let content = UNMutableNotificationContent()
                    content.title = h.name
                    content.body = h.perDay > 1 && h.freq == "perday" ? "Time for \(h.name) (\(i + 1) of \(h.times.count))." : "Time for \(h.name)."
                    content.sound = .default
                    let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: true)
                    requests.append(UNNotificationRequest(identifier: "pace.habit.\(h.id).\(i).\(d ?? 0)",
                                                          content: content, trigger: trig))
                }
            }
        }

        // Leave-by alerts (improved round): for tasks marked
        // Can't move, warn at start minus travel minus buffer.
        let ud = UserDefaults.standard
        if ud.object(forKey: "pace.leaveby.on") == nil || ud.bool(forKey: "pace.leaveby.on") {
            let travel = ud.object(forKey: "pace.leaveby.travel") as? Int ?? 15
            let buffer = ud.object(forKey: "pace.leaveby.buffer") as? Int ?? 5
            let today = PaceState.todayString
            for day in [today, GoalPlanner.addDays(today, 1)] {
                for inst in DayAdapter.instances(on: day, state: state)
                where inst.status != "done" && inst.task.essential {
                    guard let time = inst.task.time,
                          let dayDate = PaceState.date(fromKey: day) else { continue }
                    let tp = time.split(separator: ":").compactMap { Int($0) }
                    guard tp.count == 2,
                          let start = Calendar.current.date(bySettingHour: tp[0], minute: tp[1],
                                                            second: 0, of: dayDate) else { continue }
                    let fire = start.addingTimeInterval(-Double(travel + buffer) * 60)
                    guard fire > Date() else { continue }
                    let content = UNMutableNotificationContent()
                    content.title = "Leave by \(String(format: "%02d:%02d", Calendar.current.component(.hour, from: start.addingTimeInterval(-Double(travel) * 60)), Calendar.current.component(.minute, from: start.addingTimeInterval(-Double(travel) * 60))))"
                    content.body = inst.task.title
                    content.sound = .default
                    let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fire)
                    requests.append(UNNotificationRequest(
                        identifier: "pace.leaveby.\(inst.task.id).\(day)",
                        content: content,
                        trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))
                }
            }
        }

        if notif.notifDigest {
            for (i, time) in notif.notifDigestTimes.enumerated() {
                let content = UNMutableNotificationContent()
                content.title = "Your day, so far"
                content.body = "A calm look at what is left."
                content.sound = .default
                var when = DateComponents()
                let parts = time.split(separator: ":").compactMap { Int($0) }
                when.hour = parts.first ?? 12
                when.minute = parts.count > 1 ? parts[1] : 30
                let trigger = UNCalendarNotificationTrigger(dateMatching: when, repeats: true)
                requests.append(UNNotificationRequest(identifier: "pace.digest.\(i)",
                                                      content: content, trigger: trigger))
            }
        }

        if notif.notifDone {
            let content = UNMutableNotificationContent()
            content.title = "Today, done"
            content.body = "The rest is parked for tomorrow."
            content.sound = .default
            var when = DateComponents()
            let parts = notif.notifDoneTime.split(separator: ":").compactMap { Int($0) }
            when.hour = parts.first ?? 20
            when.minute = parts.count > 1 ? parts[1] : 0
            let trigger = UNCalendarNotificationTrigger(dateMatching: when, repeats: true)
            requests.append(UNNotificationRequest(identifier: "pace.done",
                                                  content: content, trigger: trigger))
        }

        for request in requests {
            do {
                try await center.add(request)
            } catch {
                print("Notification schedule ended: \(error.localizedDescription)")
            }
        }
    }
}
