import SwiftUI

/// ONE GOAL — its steps, grouped by their weekly chunks
/// (the weekStart the planner stamps), each step tickable
/// in place. The smallest version of a step stands under it
/// in quiet words, ready for a Bad day. From here the goal
/// opens on the calendar, filtered to its steps, and it can
/// be shared: the proven shared-goals shape (a link, steps
/// as documents, the divide by strengths).
struct GoalDetailView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    @Environment(\.dismiss) private var dismissGoal
    @State private var confirmDeleteGoal = false
    let goal: PaceGoal
    @State private var showShare = false

    private var steps: [PaceTask] {
        (session.state?.tasks ?? [])
            .filter { $0.goalId == goal.id }
            .sorted { $0.date < $1.date }
    }

    private struct WeekGroup: Identifiable {
        var start: String
        var steps: [PaceTask]
        var id: String { start }
    }

    private var weeks: [WeekGroup] {
        var order: [String] = []
        var byWeek: [String: [PaceTask]] = [:]
        for step in steps {
            let week = step.weekStart ?? GoalPlanner.mondayOf(step.date)
            if byWeek[week] == nil { order.append(week) }
            byWeek[week, default: []].append(step)
        }
        return order.map { WeekGroup(start: $0, steps: byWeek[$0] ?? []) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 10) {
                    Image(systemName: GoalsView.symbol(for: goal.category))
                        .font(.system(size: 18))
                        .foregroundStyle(GoalsView.colour(for: goal))
                    Text(goal.title)
                        .font(.paceHeading(21))
                        .fontWeight(.semibold)
                        .foregroundStyle(theme.inkOnBackground)
                }
                .accessibilityIdentifier("goal.title")

                if let state = session.state {
                    let pct = GoalStats.percent(goal, state: state)
                    HeroCard {
                        HStack(spacing: 16) {
                            WhiteRing(progress: Double(pct) / 100.0, size: 72)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(pct)%")
                                    .font(.paceHeading(32)).fontWeight(.semibold)
                                    .foregroundStyle(PaceColor.white)
                                    .accessibilityIdentifier("goal.percent")
                                Text("\(steps.filter { $0.status == "done" }.count) of \(steps.count) steps")
                                    .font(.paceBody(14)).fontWeight(.semibold)
                                    .foregroundStyle(PaceColor.white)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                    HalfwayBadge(percent: pct)
                }

                if steps.isEmpty {
                    Text("Nothing here yet")
                        .font(.paceBody(16))
                        .foregroundStyle(theme.secondaryOnBackground)
                }

                ForEach(weeks) { week in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(weekTitle(week.start))
                            .font(.paceBody(13))
                            .fontWeight(.bold)
                            .foregroundStyle(theme.accentOnBackground)
                            .textCase(.uppercase)
                        ForEach(week.steps) { step in
                            stepRow(step)
                        }
                    }
                }

                HStack(spacing: 12) {
                    NavigationLink {
                        CalendarView(goalFilter: goal.id, goalName: goal.shortName)
                    } label: {
                        Label("Calendar", systemImage: "calendar")
                            .font(.paceBody(15))
                            .fontWeight(.semibold)
                            .foregroundStyle(theme.accentOnBackground)
                            .frame(minHeight: 44)
                    }
                    .accessibilityIdentifier("goal.openCalendar")

                    Button {
                        showShare = true
                    } label: {
                        Label("Share", systemImage: "link")
                            .font(.paceBody(15))
                            .fontWeight(.semibold)
                            .foregroundStyle(theme.accentOnBackground)
                            .frame(minHeight: 44)
                    }
                    .accessibilityIdentifier("goal.share")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 22)
            .padding(.top, 20)
            .padding(.bottom, 24)
        }
        .background(ThemedBackground())
        .sheet(isPresented: $showShare) {
            ShareGoalView(goal: goal, steps: steps)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { session.archiveGoal(goal.id); dismissGoal() } label: {
                        Label("Archive goal", systemImage: "archivebox")
                    }
                    Button(role: .destructive) { confirmDeleteGoal = true } label: {
                        Label("Delete goal", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .accessibilityIdentifier("goal.menu")
            }
        }
        .confirmationDialog("Delete this goal and its steps?", isPresented: $confirmDeleteGoal) {
            Button("Delete", role: .destructive) { session.deleteGoal(goal.id); dismissGoal() }
        }
        .accessibilityIdentifier("goal.detail")
    }

    private func stepRow(_ step: PaceTask) -> some View {
        let instance = DayAdapter.instance(of: step, dayKey: step.date)
        return HStack(alignment: .top, spacing: 10) {
            Button {
                session.setTaskDone(taskId: step.id, dayKey: step.date,
                                    done: step.status != "done")
            } label: {
                Image(systemName: step.status == "done" ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(step.status == "done" ? theme.accentOnBackground : theme.iconOnBackground)
            }
            .buttonStyle(.plain)
            .frame(minHeight: 44)
            .accessibilityIdentifier("goal.tick.\(step.id)")

            VStack(alignment: .leading, spacing: 3) {
                TaskRow(showCircle: false, instance: instance)
                if let minVersion = step.minVersion {
                    Text(minVersion)
                        .font(.paceBody(13))
                        .foregroundStyle(theme.secondaryOnBackground)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private func weekTitle(_ key: String) -> String {
        guard let date = PaceState.date(fromKey: key) else { return key }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_AU")
        f.dateFormat = "'Week of' d MMM"
        return f.string(from: date)
    }
}
