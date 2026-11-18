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
    @EnvironmentObject private var extras: ExtrasStore
    @State private var focusTask: PaceInstance? = nil
    @AppStorage("pace.import.on") private var importOn = false
    @State private var imported: [AppleFixedEvent] = []
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
                    HStack(alignment: .center) {
                        Text(session.greetingName.map { "Hi, \($0)" } ?? "Hi")
                            .font(.paceHeading(30))
                            .fontWeight(.semibold)
                            .foregroundStyle(theme.inkOnBackground)
                            .accessibilityIdentifier("proof.greeting")
                        Spacer(minLength: 0)
                        Image("SkipFront")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 64, height: 64)
                            .accessibilityHidden(true)
                    }

                    if !session.stateLoaded {
                        ProgressView().tint(theme.accentOnBackground)
                    } else if let state = session.state, let day = adapted {
                        if needsCheckIn {
                            CheckInView(dayKey: todayKey)
                        }

                        heroBlock(day: day)

                        progressBlock(state: state, day: day)

                        TripleRingsCard(state: state, day: day)

                        if Calendar.current.component(.hour, from: Date()) >= 19 {
                            PaceCard {
                                HStack(spacing: 12) {
                                    Image("SkipRest").resizable().scaledToFit().frame(width: 58, height: 58)
                                    VStack(alignment: .leading, spacing: 6) {
                                        EveningMosaic(done: day.done.count, parked: day.parked.count)
                                        Text("Day closed: \(day.done.count) done")
                                            .font(.paceHeading(18)).fontWeight(.semibold)
                                            .foregroundStyle(PaceColor.pine)
                                        NavigationLink("Your week") { SundayResetView() }
                                            .font(.paceBody(14)).fontWeight(.semibold)
                                            .foregroundStyle(PaceColor.waterDeep)
                                    }
                                }
                            }
                            .accessibilityIdentifier("today.evening")
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(day.visible) { inst in
                                TaskRow(instance: inst) {
                                    session.setTaskDone(taskId: inst.task.id, dayKey: todayKey, done: true)
                                    extras.celebrate()
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
                                Image("SkipRest").resizable().scaledToFit()
                                    .frame(width: 96, height: 96)
                                    .accessibilityHidden(true)
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

                        if !imported.isEmpty {
                            PaceCard {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Fixed")
                                        .font(.paceBody(13)).fontWeight(.bold)
                                        .foregroundStyle(PaceColor.waterDeep)
                                        .textCase(.uppercase)
                                    ForEach(imported) { e in
                                        HStack {
                                            Text(Self.hhmm(e.start))
                                                .font(.paceBody(14)).fontWeight(.semibold)
                                                .foregroundStyle(PaceColor.waterDeep)
                                            Text(e.title)
                                                .font(.paceBody(15)).foregroundStyle(PaceColor.pine)
                                            Spacer(minLength: 0)
                                            Image(systemName: "pin.fill")
                                                .font(.system(size: 11)).foregroundStyle(PaceColor.waterMid)
                                        }
                                    }
                                }
                            }
                            .accessibilityIdentifier("today.fixed")
                        }

                        PaceCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("This week")
                                    .font(.paceBody(13)).fontWeight(.bold)
                                    .foregroundStyle(PaceColor.waterDeep)
                                    .textCase(.uppercase)
                                let week = WeekData.days(state)
                                WeekBars(values: week.map { $0.score }, labels: week.map { $0.label })
                            }
                        }
                        .accessibilityIdentifier("today.week")

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
            .task(id: "\(session.state?.tasks.count ?? 0)-\(session.state?.tasks.filter { $0.status == "done" }.count ?? 0)-\(session.state?.feelings.count ?? 0)-\(session.state?.habits.count ?? 0)") {
                if let s = session.state { WidgetBridge.publish(state: s) }
            }
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
            .fullScreenCover(item: $focusTask) { inst in
                FocusTimerView(title: inst.displayTitle,
                               minutes: Int(max(inst.displayDurationMin, 5)))
            }
            .sheet(isPresented: $showCheckInAgain) {
                VStack {
                    CheckInView(dayKey: todayKey) { showCheckInAgain = false }
                    Spacer()
                }
                .padding(20)
                .background(ThemedBackground())
            }
            .task(id: "\(importOn)\(GoogleCal.shared.connected)") {
                var all: [AppleFixedEvent] = importOn ? EventKitBridge.shared.importedEvents(on: Date()) : []
                all += await GoogleCal.shared.events(on: Date())
                imported = all.sorted { $0.start < $1.start }
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

    /// THE HERO (improved round): the one next step on a purple
    /// gradient card, with the time left today as a bar and a
    /// Start button that opens the focus timer.
    @ViewBuilder
    private func heroBlock(day: AdaptedDay) -> some View {
        if let next = day.visible.first {
            let left = Self.minutesLeftToday()
            VStack(alignment: .leading, spacing: 12) {
                Text("Next")
                    .font(.paceBody(13)).fontWeight(.bold)
                    .foregroundStyle(PaceColor.white)
                    .textCase(.uppercase)
                Text(next.displayTitle)
                    .font(.paceHeading(24)).fontWeight(.semibold)
                    .foregroundStyle(PaceColor.white)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 10) {
                    Button { focusTask = next } label: {
                        Text("Start")
                            .font(.paceBody(16)).fontWeight(.bold)
                            .foregroundStyle(PaceColor.waterDeep)
                            .padding(.horizontal, 26)
                            .frame(minHeight: 44)
                            .background(PaceColor.white)
                            .clipShape(Capsule())
                    }
                    .accessibilityIdentifier("today.start")
                    if next.displayDurationMin >= 1 {
                        Text("\(Int(next.displayDurationMin)) min")
                            .font(.paceBody(14)).fontWeight(.semibold)
                            .foregroundStyle(PaceColor.white)
                    }
                }
                VStack(alignment: .leading, spacing: 5) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(PaceColor.white.opacity(0.3))
                            Capsule().fill(PaceColor.white)
                                .frame(width: geo.size.width * CGFloat(left) / (16 * 60))
                        }
                    }
                    .frame(height: 8)
                    Text("\(left / 60) h \(left % 60) m left today")
                        .font(.paceBody(13))
                        .foregroundStyle(PaceColor.white)
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(LinearGradient.paceHero)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: PaceColor.stillWater.opacity(0.3), radius: 14, y: 8)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("today.hero")
        }
    }

    /// Minutes between now and 22:00 (clamped at zero), the day
    /// drawn as a bar so time is a picture, not a number.
    static func hhmm(_ d: Date) -> String {
        let c = Calendar.current.dateComponents([.hour, .minute], from: d)
        return String(format: "%02d:%02d", c.hour ?? 0, c.minute ?? 0)
    }

    static func minutesLeftToday() -> Int {
        let cal = Calendar.current
        let now = Date()
        guard let end = cal.date(bySettingHour: 22, minute: 0, second: 0, of: now) else { return 0 }
        return max(0, Int(end.timeIntervalSince(now) / 60))
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
