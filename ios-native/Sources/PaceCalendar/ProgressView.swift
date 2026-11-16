import SwiftUI

/// PROGRESS — one ring, one line (Phase 1 shape). The ring
/// is today's dayScore of record: progress scored against
/// the ADAPTED plan, never the full list (logic.js dayScore).
/// No percent number stands on it — the ring is the picture;
/// the line counts her done things in plain words. The week
/// behind today stands as seven quiet dots, filled on days
/// she finished something.
/// Text budget: 6 app words (Progress · done · today).
struct ProgressView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 26) {
                if let state = session.state {
                    let today = PaceState.todayString
                    let adapted = DayAdapter.adaptDay(on: today, state: state)
                    let score = DayAdapter.dayScore(adapted)

                    HStack(spacing: 22) {
                        ZStack {
                            Circle()
                                .stroke(PaceColor.lineMist, lineWidth: 10)
                            Circle()
                                .trim(from: 0, to: max(score, 0.001))
                                .stroke(PaceColor.stillWater,
                                        style: StrokeStyle(lineWidth: 10, lineCap: .round))
                                .rotationEffect(.degrees(-90))
                            Image("Mark")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 34, height: 34)
                                .opacity(0.9)
                        }
                        .frame(width: 104, height: 104)
                        .accessibilityIdentifier("progress.ring")

                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(adapted.done.count) done today")
                                .font(.paceHeading(21))
                                .fontWeight(.semibold)
                                .foregroundStyle(theme.inkOnCard)
                                .accessibilityIdentifier("progress.line")
                            HStack(spacing: 6) {
                                ForEach(weekDots(state), id: \.key) { dot in
                                    if dot.done {
                                        Circle()
                                            .fill(PaceColor.apricotDeep)
                                            .frame(width: 10, height: 10)
                                    } else {
                                        Circle()
                                            .stroke(PaceColor.waterMid, lineWidth: 1.5)
                                            .frame(width: 10, height: 10)
                                    }
                                }
                            }
                        }
                    }
                    .padding(18)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(PaceColor.white)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(PaceColor.waterMid, lineWidth: 1))
                } else {
                    Text("Nothing here yet")
                        .font(.paceBody(16))
                        .foregroundStyle(theme.secondaryOnBackground)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.top, 24)
        }
        .background(ThemedBackground())
        .navigationTitle("Progress")
        .accessibilityIdentifier("progress.screen")
    }

    /// Seven days ending today: a dot is filled when anything
    /// stands done that day (a done task, a doneDates day, or
    /// a ticked habit).
    private func weekDots(_ state: PaceState) -> [(key: String, done: Bool)] {
        (0..<7).reversed().map { back in
            let key = HabitsView.addDays(PaceState.todayString, -back)
            let taskDone = state.tasks.contains {
                ($0.status == "done" && ($0.doneOn == key || $0.date == key)) || $0.doneDates.contains(key)
            }
            let habitDone = state.habits.contains { $0.days[key] == true }
            return (key, taskDone || habitDone)
        }
    }
}
