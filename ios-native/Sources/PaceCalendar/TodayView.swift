import SwiftUI

/// TODAY — the first screen of the home order (Phase 1):
/// a greeting by her own saved name, the morning check-in
/// while today has no answer, then the day the answer makes
/// (DayAdapter: Bad parks most of it, gently; Great adds
/// tomorrow's first thing as a stretch). Under it, her goals
/// by short name. The calendar stands behind, on its own tab.
///
/// The greeting keeps the P2 anchor identifier proof.greeting:
/// the team-leg carry test of record asserts the greeting by
/// that name — the identifier is the contract, the screen is
/// new (ProofView retired at P3, per the commission).
///
/// Text budget: 6 app words of chrome (Hi · Add · parked ·
/// Goals · the tab's Today) — every task title is her data.
struct TodayView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var showAdd = false
    @State private var showCheckInAgain = false

    private var todayKey: String { PaceState.todayString }

    private var adapted: AdaptedDay? {
        session.state.map { DayAdapter.adaptDay(on: todayKey, state: $0) }
    }

    private var needsCheckIn: Bool {
        guard let state = session.state else { return false }
        return state.feelings[todayKey] == nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text(session.greetingName.map { "Hi, \($0)" } ?? "Hi")
                        .font(.paceHeading(30))
                        .fontWeight(.semibold)
                        .foregroundStyle(PaceColor.pine)
                        .accessibilityIdentifier("proof.greeting")

                    if !session.stateLoaded {
                        ProgressView().tint(PaceColor.stillWater)
                    } else if let state = session.state, let day = adapted {
                        if needsCheckIn {
                            CheckInView(dayKey: todayKey)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(day.visible) { inst in
                                TaskRow(instance: inst) {
                                    session.setTaskDone(taskId: inst.task.id, dayKey: todayKey, done: true)
                                }
                            }
                            ForEach(day.done) { inst in
                                TaskRow(instance: inst) {
                                    session.setTaskDone(taskId: inst.task.id, dayKey: todayKey, done: false)
                                }
                            }
                            if let stretch = day.stretch {
                                TaskRow(instance: stretch)
                                    .opacity(0.75)
                            }
                            if day.visible.isEmpty && day.done.isEmpty {
                                Text("Nothing here yet")
                                    .font(.paceBody(16))
                                    .foregroundStyle(PaceColor.pine.opacity(0.6))
                                    .padding(.vertical, 6)
                            }
                            if !day.parked.isEmpty {
                                Text("\(day.parked.count) parked")
                                    .font(.paceBody(13))
                                    .foregroundStyle(PaceColor.pine.opacity(0.55))
                                    .padding(.top, 4)
                                    .accessibilityIdentifier("today.parked")
                            }
                        }

                        if !needsCheckIn {
                            Button("How do you feel?") { showCheckInAgain = true }
                                .font(.paceBody(14))
                                .fontWeight(.semibold)
                                .foregroundStyle(PaceColor.stillWater)
                                .frame(minHeight: 44)
                                .accessibilityIdentifier("today.recheck")
                        }

                        if !state.goals.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Goals")
                                    .font(.paceBody(13))
                                    .fontWeight(.bold)
                                    .foregroundStyle(PaceColor.stillWater)
                                    .textCase(.uppercase)
                                ForEach(state.goals.prefix(4)) { goal in
                                    HStack(spacing: 10) {
                                        Circle()
                                            .fill(PaceColor.apricot)
                                            .frame(width: 9, height: 9)
                                        Text(goal.shortName)
                                            .font(.paceBody(16))
                                            .foregroundStyle(PaceColor.pine)
                                    }
                                }
                            }
                        }
                    } else {
                        Text("Nothing here yet")
                            .font(.paceBody(16))
                            .foregroundStyle(PaceColor.pine.opacity(0.6))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 28)
                .padding(.top, 30)
                .padding(.bottom, 24)
            }
            .background(ThemedBackground())
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAdd = true
                    } label: {
                        Label("Add", systemImage: "plus")
                    }
                    .accessibilityIdentifier("today.add")
                }
            }
            .sheet(isPresented: $showAdd) {
                AddEventView(dayKey: todayKey)
            }
            .sheet(isPresented: $showCheckInAgain) {
                VStack {
                    CheckInView(dayKey: todayKey) { showCheckInAgain = false }
                    Spacer()
                }
                .padding(20)
                .background(ThemedBackground())
            }
            .task(id: session.stateLoaded) {
                // The Apple Calendar mirror wakes with her state:
                // ask once, then keep the mirror standing.
                guard session.stateLoaded, let state = session.state else { return }
                if await EventKitBridge.shared.requestAccess() {
                    await EventKitBridge.shared.sync(tasks: state.tasks)
                }
            }
        }
    }
}
