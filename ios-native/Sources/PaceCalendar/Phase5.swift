import SwiftUI
import EventKit
import UserNotifications
import UIKit

// MARK: - One hub for every calendar on the phone

struct HubCal: Identifiable {
    let id: String
    let title: String
    let source: String
    let color: Color
}

/// Reads every calendar the iPhone knows (iCloud, Google, Outlook,
/// Exchange, Yahoo, subscribed). Refreshes the moment the phone's
/// calendar store changes, and every 30 seconds while open.
@MainActor
final class CalendarHub: ObservableObject {
    static let shared = CalendarHub()

    @Published var tick = 0
    @Published var calendars: [HubCal] = []
    @Published var sources: [String] = []
    @Published var authorized = false
    @Published var lastRefresh: Date? = nil

    private let store = EKEventStore()
    private let offKey = "pace.cal.off"
    private var timer: Timer?
    private var observer: NSObjectProtocol?

    private init() {
        authorized = EKEventStore.authorizationStatus(for: .event) == .fullAccess
        loadCalendars()
        observer = NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged, object: store, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.refresh() }
        }
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.refresh() }
        }
    }

    func requestAccess() async {
        if EKEventStore.authorizationStatus(for: .event) != .fullAccess {
            _ = try? await store.requestFullAccessToEvents()
        }
        refresh()
    }

    func refresh() {
        authorized = EKEventStore.authorizationStatus(for: .event) == .fullAccess
        loadCalendars()
        lastRefresh = Date()
        tick += 1
    }

    private func loadCalendars() {
        guard authorized else { calendars = []; sources = []; return }
        let cals = store.calendars(for: .event).filter { $0.title != "Pace" }
        calendars = cals.map {
            HubCal(id: $0.calendarIdentifier, title: $0.title, source: $0.source.title,
                   color: Color(cgColor: $0.cgColor))
        }
        let writable = store.sources.filter { s in
            s.calendars(for: .event).contains { $0.allowsContentModifications }
        }
        sources = Array(Set(writable.map { $0.title })).sorted()
    }

    func isOn(_ id: String) -> Bool {
        !(UserDefaults.standard.stringArray(forKey: offKey) ?? []).contains(id)
    }

    func set(_ id: String, on: Bool) {
        var off = Set(UserDefaults.standard.stringArray(forKey: offKey) ?? [])
        if on { off.remove(id) } else { off.insert(id) }
        UserDefaults.standard.set(Array(off), forKey: offKey)
        tick += 1
    }

    /// Timed events of one day from every enabled calendar except Pace's own.
    func events(on day: Date) -> [AppleFixedEvent] {
        guard authorized else { return [] }
        let off = Set(UserDefaults.standard.stringArray(forKey: offKey) ?? [])
        let cal = Calendar.current
        let start = cal.startOfDay(for: day)
        guard let end = cal.date(byAdding: .day, value: 1, to: start) else { return [] }
        let cals = store.calendars(for: .event)
            .filter { $0.title != "Pace" && !off.contains($0.calendarIdentifier) }
        guard !cals.isEmpty else { return [] }
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: cals)
        return store.events(matching: predicate)
            .filter { !$0.isAllDay }
            .sorted { $0.startDate < $1.startDate }
            .map {
                AppleFixedEvent(id: ($0.eventIdentifier ?? UUID().uuidString) + "\($0.startDate.timeIntervalSince1970)",
                                title: $0.title ?? "Event", start: $0.startDate, end: $0.endDate)
            }
    }
}

// MARK: - The Calendars screen

struct CalendarsView: View {
    @EnvironmentObject private var session: SessionStore
    @AppStorage("pace.import.on") private var importOn = true
    @AppStorage("pace.cal.target") private var target = ""
    @ObservedObject private var hub = CalendarHub.shared
    @ObservedObject private var google = GoogleCal.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                PaceCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle("Show my phone calendars", isOn: $importOn)
                            .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                            .tint(PaceColor.stillWater)
                            .accessibilityIdentifier("calendars.apple")
                        Text("Every calendar on this iPhone shows on Today as fixed: iCloud, Google, Outlook, Exchange, Yahoo. Pace never changes them.")
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                        if !hub.authorized {
                            Button("Allow calendar access") { Task { await hub.requestAccess() } }
                                .font(.paceBody(15)).fontWeight(.semibold)
                                .foregroundStyle(PaceColor.waterDeep).frame(minHeight: 44)
                                .accessibilityIdentifier("calendars.allow")
                            Button("Open iPhone settings") {
                                if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                            }
                            .font(.paceBody(14)).foregroundStyle(PaceColor.waterDeep).frame(minHeight: 44)
                        }
                    }
                }

                if hub.authorized {
                    PaceCard {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Calendars on this phone")
                                .font(.paceBody(13)).fontWeight(.bold)
                                .foregroundStyle(PaceColor.waterDeep).textCase(.uppercase)
                            ForEach(hub.calendars) { c in
                                HStack(spacing: 10) {
                                    Circle().fill(c.color).frame(width: 12, height: 12)
                                    VStack(alignment: .leading, spacing: 0) {
                                        Text(c.title).font(.paceBody(15)).foregroundStyle(PaceColor.pine)
                                        Text(c.source).font(.paceBody(12)).foregroundStyle(PaceColor.softInk)
                                    }
                                    Spacer(minLength: 0)
                                    Toggle("", isOn: Binding(get: { hub.isOn(c.id) },
                                                             set: { hub.set(c.id, on: $0) }))
                                        .labelsHidden().tint(PaceColor.stillWater)
                                        .accessibilityIdentifier("calendars.cal.\(c.id)")
                                }
                                .frame(minHeight: 44)
                            }
                            if hub.calendars.isEmpty {
                                Text("No calendars yet. Add an account in iPhone Settings, Calendar, Accounts.")
                                    .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                            }
                        }
                    }

                    PaceCard {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Put my Pace tasks in").font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                                Spacer(minLength: 0)
                                Picker("", selection: $target) {
                                    Text("Automatic").tag("")
                                    ForEach(hub.sources, id: \.self) { Text($0).tag($0) }
                                }
                                .pickerStyle(.menu).tint(PaceColor.waterDeep)
                                .accessibilityIdentifier("calendars.target")
                            }
                            Text("Pace writes your tasks to a calendar named Pace inside that account, so every app that shows the account gets them, usually within a minute.")
                                .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                        }
                    }
                    .onChange(of: target) { _, _ in resync() }

                    PaceCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Sync now").font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                                Text(hub.lastRefresh.map { "Updated \(Self.clock($0))" } ?? "Updates every 30 seconds")
                                    .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                                    .accessibilityIdentifier("calendars.updated")
                            }
                            Spacer(minLength: 0)
                            Button("Sync") { resync() }
                                .font(.paceBody(15)).fontWeight(.semibold)
                                .foregroundStyle(PaceColor.waterDeep).frame(minHeight: 44)
                                .accessibilityIdentifier("calendars.sync")
                        }
                    }
                }

                PaceCard {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Google Calendar").font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                            Spacer()
                            if google.connected {
                                Button("Disconnect") { google.disconnect() }
                                    .font(.paceBody(14)).foregroundStyle(PaceColor.waterDeep)
                                    .frame(minHeight: 44).accessibilityIdentifier("calendars.google.off")
                            } else {
                                Button("Connect") { Task { await google.connect() } }
                                    .font(.paceBody(14)).fontWeight(.semibold)
                                    .foregroundStyle(PaceColor.waterDeep)
                                    .frame(minHeight: 44).accessibilityIdentifier("calendars.google.on")
                            }
                        }
                        Text(google.connected ? "Read only. Events show on Today as fixed." : (google.note.isEmpty ? "Or add your Google account in iPhone Settings and it syncs both ways." : google.note))
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    }
                }

                PaceCard {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Outlook and others").font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                        Text("Add the account in iPhone Settings, Calendar, Accounts. Pace reads it with the rest and shows it above.")
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    }
                }
            }
            .padding(24)
        }
        .background(ThemedBackground())
        .navigationTitle("Calendars")
        .task { await hub.requestAccess() }
    }

    private func resync() {
        hub.refresh()
        if let tasks = session.state?.tasks {
            Task { await EventKitBridge.shared.sync(tasks: tasks) }
        }
    }

    private static func clock(_ d: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "HH:mm:ss"; return f.string(from: d)
    }
}

// MARK: - A to-do on top of Today

struct QuickTodoBar: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    @State private var text = ""

    private var open: [PaceTodo] {
        Array((session.state?.todos ?? []).filter { !$0.done }.prefix(3))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "plus.circle.fill").font(.system(size: 22)).foregroundStyle(PaceColor.stillWater)
                    .accessibilityHidden(true)
                TextField("Add a to-do", text: $text)
                    .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                    .submitLabel(.done)
                    .onSubmit(add)
                    .accessibilityIdentifier("today.quicktodo")
                if !text.trimmingCharacters(in: .whitespaces).isEmpty {
                    Button("Add", action: add)
                        .font(.paceBody(15)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.waterDeep)
                        .accessibilityIdentifier("today.quicktodo.add")
                }
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
            .background(PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))

            ForEach(open) { t in
                HStack(spacing: 10) {
                    Button {
                        session.setTodoDone(todoId: t.id, done: true)
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    } label: {
                        Image(systemName: "circle").font(.system(size: 20)).foregroundStyle(theme.iconOnBackground)
                    }
                    .buttonStyle(.plain).frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Done")
                    .accessibilityIdentifier("today.todo.tick.\(t.id)")
                    Text(t.text).font(.paceBody(15)).foregroundStyle(theme.inkOnBackground)
                    Spacer(minLength: 0)
                }
            }
        }
    }

    private func add() {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return }
        session.addTodo(text: t)
        text = ""
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}

// MARK: - Notifications that show, and a way to check them

final class PaceNotifyDelegate: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PaceNotifyDelegate()

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }
}

struct NotificationCheckCard: View {
    @State private var status = "Checking"
    @State private var sent = false

    var body: some View {
        Section {
            HStack {
                Text("Notifications").font(.paceBody(16))
                Spacer()
                Text(status).font(.paceBody(14)).foregroundStyle(.secondary)
                    .accessibilityIdentifier("settings.notifStatus")
            }
            Button("Send a test in 5 seconds") { Task { await test() } }
                .font(.paceBody(16)).fontWeight(.semibold)
                .accessibilityIdentifier("settings.notifTest")
            if sent {
                Text("Sent. Lock the phone or leave the app to see it.")
                    .font(.paceBody(13))
            }
            Button("Open iPhone settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            }
            .font(.paceBody(14))
        }
        .task { await load() }
    }

    private func load() async {
        let s = await UNUserNotificationCenter.current().notificationSettings()
        switch s.authorizationStatus {
        case .authorized, .provisional, .ephemeral: status = "On"
        case .denied: status = "Off in iPhone settings"
        default: status = "Not asked yet"
        }
    }

    private func test() async {
        if await UNUserNotificationCenter.current().notificationSettings().authorizationStatus == .notDetermined {
            _ = await NotificationScheduler.requestPermission()
        }
        await load()
        let c = UNMutableNotificationContent()
        c.title = "Pace is ready"
        c.body = "Your nudges will look like this."
        c.sound = .default
        let req = UNNotificationRequest(identifier: "pace.test", content: c,
                                        trigger: UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false))
        try? await UNUserNotificationCenter.current().add(req)
        sent = true
    }
}

/// A to-do added in one line, from the plus.
struct QuickTodoView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                Image("SkipPoint").resizable().scaledToFit().frame(width: 62, height: 62)
                Text("What is the to-do?").font(.paceHeading(22)).fontWeight(.semibold)
                    .foregroundStyle(PaceColor.pine)
            }
            TextField("Say it plainly", text: $text)
                .font(.paceBody(18)).foregroundStyle(PaceColor.pine)
                .padding(14).background(PaceColor.white)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
                .accessibilityIdentifier("quicktodo.text")
            Button {
                let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !t.isEmpty else { return }
                session.addTodo(text: t)
                dismiss()
            } label: {
                Text("Add it").font(.paceBody(17)).fontWeight(.semibold)
                    .foregroundStyle(PaceColor.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 15)
                    .background(LinearGradient.paceHero)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain).accessibilityIdentifier("quicktodo.add")
            Spacer()
        }
        .padding(20)
        .background(ThemedBackground())
        .navigationTitle("To-do")
        .navigationBarTitleDisplayMode(.inline)
    }
}
