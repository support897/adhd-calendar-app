import SwiftUI
import EventKit

// MARK: - Archive, delete and move: the writes

struct ArchivedItem: Identifiable {
    let id: String
    let title: String
    let sub: String
}

extension StateStore {
    static func archiveTask(uid: String, id: String, on: Bool) async -> PaceState? {
        await mutate(uid: uid) { root in
            guard var tasks = root["tasks"] as? [[String: Any]] else { return }
            for i in tasks.indices where (tasks[i]["id"] as? String) == id { tasks[i]["archived"] = on }
            root["tasks"] = tasks
        }
    }

    static func deleteTask(uid: String, id: String) async -> PaceState? {
        await mutate(uid: uid) { root in
            guard var tasks = root["tasks"] as? [[String: Any]] else { return }
            tasks.removeAll { ($0["id"] as? String) == id }
            root["tasks"] = tasks
        }
    }

    /// Archiving a goal rests its steps too; restoring wakes them.
    static func archiveGoal(uid: String, id: String, on: Bool) async -> PaceState? {
        await mutate(uid: uid) { root in
            if var goals = root["goals"] as? [[String: Any]] {
                for i in goals.indices where (goals[i]["id"] as? String) == id { goals[i]["archived"] = on }
                root["goals"] = goals
            }
            if var tasks = root["tasks"] as? [[String: Any]] {
                for i in tasks.indices where (tasks[i]["goalId"] as? String) == id { tasks[i]["archived"] = on }
                root["tasks"] = tasks
            }
        }
    }

    static func deleteGoal(uid: String, id: String) async -> PaceState? {
        await mutate(uid: uid) { root in
            if var goals = root["goals"] as? [[String: Any]] {
                goals.removeAll { ($0["id"] as? String) == id }
                root["goals"] = goals
            }
            if var tasks = root["tasks"] as? [[String: Any]] {
                tasks.removeAll { ($0["goalId"] as? String) == id }
                root["tasks"] = tasks
            }
        }
    }

    /// Drag and drop: a one-off task moves to another day. Repeating
    /// tasks keep their rhythm and stay where they are.
    static func moveTask(uid: String, id: String, date: String) async -> PaceState? {
        await mutate(uid: uid) { root in
            guard var tasks = root["tasks"] as? [[String: Any]] else { return }
            for i in tasks.indices where (tasks[i]["id"] as? String) == id && (tasks[i]["repeat"] as? String) == nil {
                tasks[i]["date"] = date
            }
            root["tasks"] = tasks
        }
    }
}

// MARK: - The Archive screen

struct ArchiveView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    @State private var deleting: ArchivedItem? = nil
    @State private var deletingGoal = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 12) {
                    Image("SkipRest").resizable().scaledToFit().frame(width: 64, height: 64)
                    Text("Resting here, safe. Bring anything back.")
                        .font(.paceBody(16)).foregroundStyle(theme.inkOnBackground)
                }
                let goals = session.state?.archivedGoals ?? []
                let tasks = session.state?.archivedTasks ?? []
                if goals.isEmpty && tasks.isEmpty {
                    Text("Nothing archived yet.")
                        .font(.paceBody(15)).foregroundStyle(theme.secondaryOnBackground)
                        .accessibilityIdentifier("archive.empty")
                }
                if !goals.isEmpty { header("Goals") }
                ForEach(goals) { g in row(g, isGoal: true) }
                if !tasks.isEmpty { header("Tasks") }
                ForEach(tasks) { t in row(t, isGoal: false) }
            }
            .padding(20)
        }
        .background(ThemedBackground())
        .navigationTitle("Archive")
        .accessibilityIdentifier("archive.screen")
        .confirmationDialog("Delete for good?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } })) {
            Button("Delete", role: .destructive) {
                if let d = deleting {
                    if deletingGoal { session.deleteGoal(d.id) } else { session.deleteTask(d.id) }
                }
                deleting = nil
            }
        }
    }

    private func header(_ t: String) -> some View {
        Text(t).font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase)
            .foregroundStyle(PaceColor.waterDeep)
    }

    private func row(_ item: ArchivedItem, isGoal: Bool) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title).font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                if !item.sub.isEmpty {
                    Text(item.sub).font(.paceBody(12)).foregroundStyle(PaceColor.softInk)
                }
            }
            Spacer(minLength: 0)
            Button("Restore") {
                if isGoal { session.archiveGoal(item.id, on: false) } else { session.archiveTask(item.id, on: false) }
            }
            .font(.paceBody(14)).fontWeight(.semibold).foregroundStyle(PaceColor.waterDeep)
            .frame(minHeight: 44)
            .accessibilityIdentifier("archive.restore.\(item.id)")
            Button {
                deletingGoal = isGoal; deleting = item
            } label: {
                Image(systemName: "trash").foregroundStyle(PaceColor.softInk).frame(width: 40, height: 44)
            }
            .accessibilityLabel("Delete")
            .accessibilityIdentifier("archive.delete.\(item.id)")
        }
        .padding(14).background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
    }
}

struct ArchiveRow: View {
    var body: some View {
        Section {
            NavigationLink("Archive") { ArchiveView() }
                .font(.paceBody(16))
                .accessibilityIdentifier("settings.archive")
        }
    }
}

// MARK: - Offered at first open: bring your calendar in, about 60 seconds

struct CalendarOfferView: View {
    @EnvironmentObject private var session: SessionStore
    @ObservedObject private var hub = CalendarHub.shared
    var onClose: () -> Void
    @State private var bounce = false

    private var todayCount: Int { hub.events(on: Date()).count }

    var body: some View {
        VStack(spacing: 16) {
            Spacer(minLength: 0)
            Image(hub.authorized ? "SkipCelebrate" : "SkipFront").resizable().scaledToFit()
                .frame(width: 150, height: 150)
                .offset(y: bounce ? -6 : 6)
                .animation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: bounce)
                .accessibilityHidden(true)
            Text(hub.authorized ? "Your calendars are in" : "Bring your calendar in")
                .font(.paceHeading(26)).fontWeight(.semibold).foregroundStyle(PaceColor.pine)
                .multilineTextAlignment(.center)
                .accessibilityIdentifier("offer.title")
            Text(hub.authorized
                 ? "\(hub.calendars.count) calendars found. \(todayCount) events today. Untick any you do not want."
                 : "About 60 seconds. iCloud, Google, Outlook and Exchange, all in one place. I read them and never change them.")
                .font(.paceBody(16)).foregroundStyle(PaceColor.softInk)
                .multilineTextAlignment(.center)

            if hub.authorized {
                ScrollView {
                    VStack(spacing: 6) {
                        ForEach(hub.calendars) { c in
                            HStack(spacing: 10) {
                                Circle().fill(c.color).frame(width: 12, height: 12)
                                VStack(alignment: .leading, spacing: 0) {
                                    Text(c.title).font(.paceBody(15)).foregroundStyle(PaceColor.pine)
                                    Text(c.source).font(.paceBody(12)).foregroundStyle(PaceColor.softInk)
                                }
                                Spacer(minLength: 0)
                                Toggle("", isOn: Binding(get: { hub.isOn(c.id) }, set: { hub.set(c.id, on: $0) }))
                                    .labelsHidden().tint(PaceColor.stillWater)
                            }
                            .padding(.horizontal, 12).frame(minHeight: 48)
                            .background(PaceColor.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                    }
                }
                .frame(maxHeight: 220)
            }
            Spacer(minLength: 0)
            Button {
                if hub.authorized { onClose() } else {
                    Task {
                        await hub.requestAccess()
                        if let t = session.state?.tasks { await EventKitBridge.shared.sync(tasks: t) }
                    }
                }
            } label: {
                Text(hub.authorized ? "Done" : "Allow calendars")
                    .font(.paceBody(17)).fontWeight(.semibold).foregroundStyle(PaceColor.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 15)
                    .background(LinearGradient.paceHero)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .accessibilityIdentifier("offer.primary")
            if !hub.authorized {
                Button("Not now") { onClose() }
                    .font(.paceBody(16)).fontWeight(.semibold).foregroundStyle(PaceColor.waterDeep)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("offer.skip")
            }
        }
        .padding(24)
        .background(ThemedBackground())
        .onAppear { bounce = true }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("offer.screen")
    }
}
