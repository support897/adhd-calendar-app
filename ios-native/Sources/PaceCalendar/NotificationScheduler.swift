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

        if notif.notifStart {
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
                    let fire = start.addingTimeInterval(-Double(notif.notifSetup) * 60)
                    guard fire > Date() else { continue }
                    let content = UNMutableNotificationContent()
                    content.title = inst.task.title
                    content.body = "In \(notif.notifSetup) minutes"
                    content.sound = .default
                    let comps = Calendar.current.dateComponents(
                        [.year, .month, .day, .hour, .minute], from: fire)
                    let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                    requests.append(UNNotificationRequest(
                        identifier: "pace.task.\(inst.task.id).\(day)",
                        content: content, trigger: trigger))
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
