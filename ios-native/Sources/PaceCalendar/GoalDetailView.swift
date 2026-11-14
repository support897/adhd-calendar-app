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
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("goal.title")

                if steps.isEmpty {
                    Text("Nothing here yet")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine.opacity(0.6))
                }

                ForEach(weeks) { week in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(weekTitle(week.start))
                            .font(.paceBody(13))
                            .fontWeight(.bold)
                            .foregroundStyle(PaceColor.stillWater)
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
                            .foregroundStyle(PaceColor.stillWater)
                            .frame(minHeight: 44)
                    }
                    .accessibilityIdentifier("goal.openCalendar")

                    Button {
                        showShare = true
                    } label: {
                        Label("Share", systemImage: "link")
                            .font(.paceBody(15))
                            .fontWeight(.semibold)
                            .foregroundStyle(PaceColor.stillWater)
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
                    .foregroundStyle(step.status == "done" ? PaceColor.stillWater : PaceColor.waterLight)
            }
            .buttonStyle(.plain)
            .frame(minHeight: 44)
            .accessibilityIdentifier("goal.tick.\(step.id)")

            VStack(alignment: .leading, spacing: 3) {
                TaskRow(instance: instance)
                if let minVersion = step.minVersion {
                    Text(minVersion)
                        .font(.paceBody(13))
                        .foregroundStyle(PaceColor.pine.opacity(0.55))
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
