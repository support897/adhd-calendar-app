import SwiftUI

/// HABITS — the small daily things (Phase 1 shape): each
/// habit wears its designed icon (the HABIT_ICONS keys of
/// record, drawn as SF Symbols — designed icons, never
/// emoji), today's tick is one tap, and the last seven days
/// stand as quiet dots with the streak counted the shipped
/// way (logic.js streakInfo: back from today, or from
/// yesterday while today is still open).
/// The tick writes habits[i].days[today] through the ruled
/// door. Text budget: 6 app words (Habits · Add).
struct HabitsView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    @EnvironmentObject private var extras: ExtrasStore
    @State private var draft: String = ""
    @State private var showAdd = false
    @State private var showWizard = false

    private var todayKey: String { PaceState.todayString }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let state = session.state {
                    if !state.habits.isEmpty {
                        let doneToday = state.habits.filter { $0.days[todayKey] == true }.count
                        HeroCard {
                            HStack(spacing: 16) {
                                WhiteRing(progress: Double(doneToday) / Double(max(state.habits.count, 1)))
                                VStack(alignment: .leading, spacing: 5) {
                                    Text("\(doneToday) of \(state.habits.count) today")
                                        .font(.paceHeading(24)).fontWeight(.semibold)
                                        .foregroundStyle(PaceColor.white)
                                    Text("Showing up counts")
                                        .font(.paceBody(14))
                                        .foregroundStyle(PaceColor.white)
                                }
                                Spacer(minLength: 0)
                                Image("SkipFront").resizable().scaledToFit().frame(width: 62, height: 62)
                            }
                        }
                        .accessibilityIdentifier("habits.hero")
                        StreakHero(habits: state.habits, today: todayKey)
                        PaceCard {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("This week")
                                    .font(.paceBody(13)).fontWeight(.bold)
                                    .foregroundStyle(PaceColor.waterDeep).textCase(.uppercase)
                                let vals: [Double] = (0..<7).map { i in
                                    let key = HabitsView.addDays(todayKey, i - 6)
                                    return Double(state.habits.filter { $0.days[key] == true }.count) / Double(max(state.habits.count, 1))
                                }
                                let letters: [String] = (0..<7).map { i in
                                    let key = HabitsView.addDays(todayKey, i - 6)
                                    let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "EEEEE"
                                    return PaceState.date(fromKey: key).map { f.string(from: $0) } ?? ""
                                }
                                WeekBars(values: vals, labels: letters)
                            }
                        }
                    }
                    if state.habits.isEmpty {
                        Text("Nothing here yet")
                            .font(.paceBody(16))
                            .foregroundStyle(theme.secondaryOnBackground)
                            .padding(.vertical, 8)
                    }
                    ForEach(state.habits) { habit in
                        habitCard(habit)
                    }
                }

                if showAdd {
                    HStack(spacing: 10) {
                        TextField("Name", text: $draft)
                            .font(.paceBody(16))
                            .foregroundStyle(PaceColor.pine)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(PaceColor.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(PaceColor.waterMid, lineWidth: 1))
                            .accessibilityIdentifier("habits.nameField")
                        Button("Add") {
                            let name = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !name.isEmpty else { return }
                            draft = ""
                            showAdd = false
                            session.addHabit(name: name)
                        }
                        .font(.paceBody(16))
                        .fontWeight(.semibold)
                        .foregroundStyle(theme.accentOnBackground)
                        .frame(minHeight: 44)
                        .accessibilityIdentifier("habits.addSave")
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 24)
        }
        .background(ThemedBackground())
        .navigationTitle("Habits")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showWizard = true
                } label: {
                    Label("Add", systemImage: "plus")
                }
                .accessibilityIdentifier("habits.add")
            }
        }
        .sheet(isPresented: $showWizard) {
            NavigationStack { HabitWizard() }
        }
        .accessibilityIdentifier("habits.list")
    }

    private func habitCard(_ habit: PaceHabit) -> some View {
        let ticked = habit.days[todayKey] == true
        let streak = Self.streakInfo(days: habit.days, today: todayKey)
        return HStack(spacing: 14) {
            Image(systemName: Self.symbol(for: habit.icon))
                .font(.system(size: 19))
                .foregroundStyle(theme.accentOnCard)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 4) {
                Text(habit.name)
                    .font(.paceBody(16))
                    .fontWeight(.semibold)
                    .foregroundStyle(theme.inkOnCard)
                HStack(spacing: 5) {
                    ForEach(Array(streak.last7.enumerated()), id: \.offset) { _, day in
                        // State by shape, not by a fade: a
                        // filled deep-apricot dot for done, a
                        // waterMid ring for not yet (the old
                        // Water Light@0.45 measured 1.32).
                        if day.done {
                            Circle()
                                .fill(PaceColor.apricotDeep)
                                .frame(width: 8, height: 8)
                        } else {
                            Circle()
                                .stroke(PaceColor.waterMid, lineWidth: 1.5)
                                .frame(width: 8, height: 8)
                        }
                    }
                    if streak.current > 0 {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 11)).foregroundStyle(PaceColor.stillWater)
                            .padding(.leading, 4).accessibilityHidden(true)
                        Text("\(streak.current) in a row")
                            .font(.paceBody(13))
                            .foregroundStyle(theme.secondaryOnCard)
                            .padding(.leading, 4)
                    }
                }
                HStack(spacing: 8) {
                    HabitRuleMenu(habit: habit, today: todayKey)
                    Spacer(minLength: 0)
                    RingMeter(progress: HabitRule.strength(days: habit.days, today: todayKey),
                              size: 26, line: 4)
                        .accessibilityLabel("Habit strength")
                }
                if !habit.tiny.isEmpty {
                    Text(habit.tiny)
                        .font(.paceBody(13))
                        .foregroundStyle(theme.secondaryOnCard)
                }
            }

            Spacer(minLength: 0)

            Button {
                session.setHabitDay(habitId: habit.id, dayKey: todayKey, on: !ticked)
                if !ticked {
                    var d = habit.days
                    d[todayKey] = true
                    let n = Streak.info(days: d, today: todayKey).current
                    if Streak.milestones.contains(n) { extras.celebrate() }
                }
            } label: {
                Image(systemName: ticked ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 26))
                    .foregroundStyle(ticked ? theme.accentOnCard : theme.iconOnCard)
            }
            .buttonStyle(.plain)
            .frame(minHeight: 44)
            .accessibilityIdentifier("habits.tick.\(habit.id)")
        }
        .padding(16)
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
            .stroke(PaceColor.waterMid, lineWidth: 1))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("habits.row.\(habit.id)")
    }

    /// HABIT_ICONS of record -> designed SF Symbols.
    static func symbol(for key: String) -> String {
        switch key {
        case "drop": return "drop.fill"
        case "sun": return "sun.max.fill"
        case "moon": return "moon.fill"
        case "heart": return "heart.fill"
        case "book": return "book.fill"
        case "coffee": return "cup.and.saucer.fill"
        case "music": return "music.note"
        case "zap": return "bolt.fill"
        case "smile": return "face.smiling"
        case "wind": return "wind"
        case "activity": return "waveform.path.ecg"
        default: return "star.fill"
        }
    }

    /// streakInfo of record (logic.js): the current streak
    /// counts back from today, or from yesterday if today is
    /// not ticked yet; last7 is oldest first.
    static func streakInfo(days: [String: Bool], today: String) -> (current: Int, last7: [(key: String, done: Bool)]) {
        var last7: [(String, Bool)] = []
        for back in stride(from: 6, through: 0, by: -1) {
            let key = addDays(today, -back)
            last7.append((key, days[key] == true))
        }
        var current = 0
        var cursor = days[today] == true ? today : addDays(today, -1)
        while days[cursor] == true {
            current += 1
            cursor = addDays(cursor, -1)
        }
        return (current, last7)
    }

    static func addDays(_ key: String, _ n: Int) -> String {
        guard let date = PaceState.date(fromKey: key),
              let shifted = Calendar.current.date(byAdding: .day, value: n, to: date) else { return key }
        return PaceState.dayKey(for: shifted)
    }
}
