import SwiftUI

/// SHARE A GOAL — the proven web shape (build 39): share by
/// link, strengths auto-assign (the divide), join by link,
/// ticks sync. Steps live as documents; a step's status
/// moves only by its stored assignee — the tick below is
/// offered only on my own steps, and the rules fence it for
/// real. Text budget: 10 app words per screen.
struct ShareGoalView: View {
    @EnvironmentObject private var session: SessionStore
    let goal: PaceGoal
    let steps: [PaceTask]
    @State private var shared: SharedGoal?
    @State private var working = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let shared {
                        Text(SharedGoals.shareLink(shared.id))
                            .font(.paceBody(14))
                            .foregroundStyle(PaceColor.stillWater)
                            .textSelection(.enabled)
                            .accessibilityIdentifier("share.link")

                        membersList(shared)

                        Button("Share out the steps") {
                            divide(shared)
                        }
                        .font(.paceBody(16))
                        .fontWeight(.semibold)
                        .foregroundStyle(PaceColor.stillWater)
                        .frame(minHeight: 44)
                        .accessibilityIdentifier("share.divide")

                        stepsList(shared)
                    } else {
                        Text(goal.shortName)
                            .font(.paceHeading(20))
                            .fontWeight(.semibold)
                            .foregroundStyle(PaceColor.pine)
                        Button {
                            create()
                        } label: {
                            Label("Share", systemImage: "link")
                                .font(.paceBody(16))
                                .fontWeight(.semibold)
                        }
                        .frame(minHeight: 44)
                        .disabled(working)
                        .accessibilityIdentifier("share.create")
                    }
                    if working { ProgressView().tint(PaceColor.stillWater) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(22)
            }
            .background(ThemedBackground())
            .navigationTitle("Share")
            .task { await load() }
        }
    }

    private func membersList(_ shared: SharedGoal) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(shared.members.keys.sorted()), id: \.self) { uid in
                HStack(spacing: 8) {
                    Circle().fill(PaceColor.apricot).frame(width: 8, height: 8)
                    Text(shared.members[uid]?.name ?? "")
                        .font(.paceBody(15))
                        .foregroundStyle(PaceColor.pine)
                    if !(shared.members[uid]?.focus.isEmpty ?? true) {
                        Text(shared.members[uid]?.focus ?? "")
                            .font(.paceBody(13))
                            .foregroundStyle(PaceColor.pine.opacity(0.55))
                    }
                }
            }
        }
        .accessibilityIdentifier("share.members")
    }

    private func stepsList(_ shared: SharedGoal) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(shared.steps) { step in
                HStack(spacing: 10) {
                    if step.assignee == session.userID {
                        Button {
                            tick(shared, step)
                        } label: {
                            Image(systemName: step.status == "done" ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 22))
                                .foregroundStyle(step.status == "done" ? PaceColor.stillWater : PaceColor.waterLight)
                        }
                        .buttonStyle(.plain)
                        .frame(minHeight: 44)
                        .accessibilityIdentifier("share.tick.\(step.sid)")
                    } else {
                        Image(systemName: step.status == "done" ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 22))
                            .foregroundStyle(PaceColor.waterLight.opacity(0.6))
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.title)
                            .font(.paceBody(15))
                            .foregroundStyle(PaceColor.pine.opacity(step.status == "done" ? 0.45 : 1))
                            .strikethrough(step.status == "done")
                        Text(assigneeLine(shared, step))
                            .font(.paceBody(13))
                            .foregroundStyle(PaceColor.pine.opacity(0.55))
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .accessibilityIdentifier("share.steps")
    }

    private func assigneeLine(_ shared: SharedGoal, _ step: SharedStep) -> String {
        if step.status == "done", let by = step.doneBy {
            return shared.members[by]?.name ?? ""
        }
        if let assignee = step.assignee {
            return shared.members[assignee]?.name ?? ""
        }
        return step.date
    }

    // MARK: Actions

    private func load() async {
        guard let sharedId = goal.sharedGoalId, let uid = session.userID else { return }
        shared = await SharedGoals.get(id: sharedId, uid: uid)
    }

    private func create() {
        guard let uid = session.userID else { return }
        working = true
        let name = session.state?.profileName ?? session.askedName ?? ""
        let sharedSteps = steps.map { task in
            SharedStep(sid: task.id, title: task.title, date: task.date,
                       time: task.time, durationMin: task.durationMin,
                       minVersion: task.minVersion,
                       assignee: task.status == "done" ? uid : nil,
                       status: task.status, doneBy: task.status == "done" ? uid : nil,
                       doneAt: nil, createdBy: uid)
        }
        Task {
            if let id = await SharedGoals.create(uid: uid, ownerName: name,
                                                 title: goal.title, category: goal.category,
                                                 end: goal.end, steps: sharedSteps) {
                if let fresh = await StateStore.setGoalSharedId(uid: uid, goalId: goal.id, sharedId: id) {
                    session.applyFreshState(fresh)
                }
                shared = await SharedGoals.get(id: id, uid: uid)
            }
            working = false
        }
    }

    private func divide(_ sharedGoal: SharedGoal) {
        guard let uid = session.userID else { return }
        working = true
        let members = sharedGoal.members.map { (uid: $0.key, focus: $0.value.focus) }
        let plan = SharedGoals.divide(steps: sharedGoal.steps, members: members,
                                      mode: sharedGoal.splitMode)
        Task {
            for step in sharedGoal.steps where step.status != "done" {
                if let pick = plan[step.sid], pick != step.assignee {
                    _ = await SharedGoals.setAssignee(id: sharedGoal.id, step: step, assignee: pick)
                }
            }
            shared = await SharedGoals.get(id: sharedGoal.id, uid: uid)
            working = false
        }
    }

    private func tick(_ sharedGoal: SharedGoal, _ step: SharedStep) {
        guard let uid = session.userID else { return }
        working = true
        Task {
            _ = await SharedGoals.tick(id: sharedGoal.id, step: step,
                                       done: step.status != "done", uid: uid)
            shared = await SharedGoals.get(id: sharedGoal.id, uid: uid)
            working = false
        }
    }
}

/// JOIN — paste a share link, become a member (the caller
/// and only the caller is added, as the web join does),
/// then the goal's steps stand here.
struct JoinGoalView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.dismiss) private var dismiss
    @State private var link: String = ""
    @State private var joined: SharedGoal?
    @State private var working = false
    @State private var notFound = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Paste the link", text: $link)
                        .font(.paceBody(16))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(PaceColor.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(PaceColor.waterLight.opacity(0.6), lineWidth: 1))
                        .accessibilityIdentifier("join.field")

                    Button("Join") {
                        join()
                    }
                    .font(.paceBody(16))
                    .fontWeight(.semibold)
                    .foregroundStyle(PaceColor.stillWater)
                    .frame(minHeight: 44)
                    .disabled(working || link.isEmpty)
                    .accessibilityIdentifier("join.submit")

                    if notFound {
                        Text("That goal could not be found.")
                            .font(.paceBody(15))
                            .foregroundStyle(PaceColor.pine.opacity(0.7))
                    }
                    if working { ProgressView().tint(PaceColor.stillWater) }

                    if let joined {
                        Text(joined.title)
                            .font(.paceHeading(19))
                            .fontWeight(.semibold)
                            .foregroundStyle(PaceColor.pine)
                            .accessibilityIdentifier("join.title")
                        ForEach(joined.steps) { step in
                            HStack(spacing: 10) {
                                Image(systemName: step.status == "done" ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(step.status == "done" ? PaceColor.stillWater : PaceColor.waterLight)
                                Text(step.title)
                                    .font(.paceBody(15))
                                    .foregroundStyle(PaceColor.pine)
                                Spacer(minLength: 0)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(22)
            }
            .background(ThemedBackground())
            .navigationTitle("Join")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func join() {
        guard let uid = session.userID,
              let id = SharedGoals.idFromLink(link) else { return }
        working = true
        notFound = false
        let name = session.state?.profileName ?? session.askedName ?? ""
        Task {
            let result = await SharedGoals.join(id: id, uid: uid, name: name)
            joined = result
            notFound = result == nil
            working = false
        }
    }
}
