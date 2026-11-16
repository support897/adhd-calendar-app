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
/// Round 2 adds ONE borrowed line: the progress block's
/// "N done today", the Progress screen's own words for the
/// same number, named in BUILD-NOTE-MOTIVATION.
struct TodayView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
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
                        .foregroundStyle(theme.inkOnBackground)
                        .accessibilityIdentifier("proof.greeting")

                    if !session.stateLoaded {
                        ProgressView().tint(theme.accentOnBackground)
                    } else if let state = session.state, let day = adapted {
                        if needsCheckIn {
                            CheckInView(dayKey: todayKey)
                        }

                        progressBlock(state: state, day: day)

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
                                // No whole-row fade: at 0.75 the
                                // row's own words fell under the
                                // 4.5 floor (contrast round).
                                TaskRow(instance: stretch)
                            }
                            if day.visible.isEmpty && day.done.isEmpty {
                                Text("Nothing here yet")
                                    .font(.paceBody(16))
                                    .foregroundStyle(theme.secondaryOnBackground)
                                    .padding(.vertical, 6)
                            }
                            if !day.parked.isEmpty {
                                Text("\(day.parked.count) parked")
                                    .font(.paceBody(13))
                                    .foregroundStyle(theme.secondaryOnBackground)
                                    .padding(.top, 4)
                                    .accessibilityIdentifier("today.parked")
                            }
                        }

                        if !needsCheckIn {
                            Button("How do you feel?") { showCheckInAgain = true }
                                .font(.paceBody(14))
                                .fontWeight(.semibold)
                                .foregroundStyle(theme.accentOnBackground)
                                .frame(minHeight: 44)
                                .accessibilityIdentifier("today.recheck")
                        }

                        if !state.goals.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Goals")
                                    .font(.paceBody(13))
                                    .fontWeight(.bold)
                                    .foregroundStyle(theme.accentOnBackground)
                                    .textCase(.uppercase)
                                ForEach(state.goals.prefix(4)) { goal in
                                    HStack(spacing: 10) {
                                        Circle()
                                            .fill(GoalsView.colour(for: goal))
                                            .frame(width: 9, height: 9)
                                        Text(goal.shortName)
                                            .font(.paceBody(16))
                                            .foregroundStyle(theme.inkOnBackground)
                                    }
                                }
                            }
                        }
                    } else {
                        Text("Nothing here yet")
                            .font(.paceBody(16))
                            .foregroundStyle(theme.secondaryOnBackground)
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

    /// THE PROGRESS BLOCK (round 2, her motivation order):
    /// one calm card under the greeting — today's progress
    /// as a picture, not a dashboard (her clean steer). The
    /// ring is the Progress screen's own dayScore of the
    /// ADAPTED day — the same engine, reused, never a second
    /// one — so a Bad day can still fill its smaller ring.
    /// The line is the Progress screen's own words. The dots
    /// are today's habits. Skip stands with it: the mascot
    /// of record at the day's key moment. Done counts only,
    /// never a "left" count (RSD care — ADHD-MOTIVATION-
    /// RESEARCH lines 2, 3, 4). Goal steps done today ride
    /// inside the ring's score and stand ticked in the day
    /// list right below it.
    private func progressBlock(state: PaceState, day: AdaptedDay) -> some View {
        let score = DayAdapter.dayScore(day)
        return HStack(spacing: 16) {
            ZStack {
                Circle()
                    .stroke(PaceColor.lineMist, lineWidth: 7)
                Circle()
                    .trim(from: 0, to: max(score, 0.001))
                    .stroke(PaceColor.stillWater,
                            style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .frame(width: 58, height: 58)

            VStack(alignment: .leading, spacing: 7) {
                Text("\(day.done.count) done today")
                    .font(.paceHeading(19))
                    .fontWeight(.semibold)
                    .foregroundStyle(theme.inkOnCard)
                    .accessibilityIdentifier("today.progressLine")
                if !state.habits.isEmpty {
                    HStack(spacing: 5) {
                        ForEach(state.habits.prefix(8)) { habit in
                            if habit.days[todayKey] == true {
                                Circle()
                                    .fill(PaceColor.apricotDeep)
                                    .frame(width: 9, height: 9)
                            } else {
                                Circle()
                                    .stroke(PaceColor.waterMid, lineWidth: 1.5)
                                    .frame(width: 9, height: 9)
                            }
                        }
                    }
                    .accessibilityIdentifier("today.habitDots")
                }
            }

            Spacer(minLength: 0)

            Image("Mark")
                .resizable()
                .scaledToFit()
                .frame(width: 44, height: 44)
                .accessibilityHidden(true)
        }
        .padding(16)
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(PaceColor.waterMid, lineWidth: 1)
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("today.progress")
    }
}
