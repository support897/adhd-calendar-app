import SwiftUI

/// BRAIN DUMP: say or type anything, no day, no time. It waits.
/// Nothing here is overdue. Each item can go to Today as a task.
struct BrainDumpView: View {
    @EnvironmentObject private var theme: ThemeStore
    @EnvironmentObject private var extras: ExtrasStore
    @EnvironmentObject private var session: SessionStore
    @State private var text = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PaceCard {
                    HStack(spacing: 10) {
                        TextField("Anything on your mind", text: $text)
                            .font(.paceBody(16))
                            .foregroundStyle(PaceColor.pine)
                            .submitLabel(.done)
                            .onSubmit(save)
                            .accessibilityIdentifier("dump.field")
                        Button(action: save) {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(PaceColor.white)
                                .frame(width: 40, height: 40)
                                .background(PaceColor.stillWater)
                                .clipShape(Circle())
                        }
                        .accessibilityIdentifier("dump.add")
                    }
                }
                Text("Waiting \(extras.dumps.count)")
                    .font(.paceBody(13)).fontWeight(.bold)
                    .foregroundStyle(theme.accentOnBackground)
                    .textCase(.uppercase)
                ForEach(extras.dumps) { item in
                    PaceCard {
                        HStack(spacing: 10) {
                            Text(item.text)
                                .font(.paceBody(16))
                                .foregroundStyle(PaceColor.pine)
                            Spacer(minLength: 0)
                            Button("Today") {
                                session.addTodo(text: item.text)
                                extras.removeDump(item.id)
                            }
                            .font(.paceBody(14)).fontWeight(.semibold)
                            .foregroundStyle(PaceColor.waterDeep)
                            .frame(minHeight: 44)
                            Button("Park") { extras.removeDump(item.id) }
                                .font(.paceBody(14))
                                .foregroundStyle(PaceColor.softInk)
                                .frame(minHeight: 44)
                        }
                    }
                }
                if extras.dumps.isEmpty {
                    Text("Nothing waiting")
                        .font(.paceBody(16))
                        .foregroundStyle(theme.secondaryOnBackground)
                }
            }
            .padding(24)
        }
        .background(ThemedBackground())
        .navigationTitle("Dump")
        .accessibilityIdentifier("dump.screen")
    }

    private func save() {
        extras.addDump(text)
        text = ""
    }
}

/// SUNDAY RESET: two minutes. Her week as bars, what she did,
/// then a calm line. Counts done things only, never misses.
struct SundayResetView: View {
    @EnvironmentObject private var theme: ThemeStore
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 12) {
                    Image("SkipCelebrate").resizable().scaledToFit().frame(width: 64, height: 64)
                    Text("Your week")
                        .font(.paceHeading(28)).fontWeight(.semibold)
                        .foregroundStyle(theme.inkOnBackground)
                }
                if let state = session.state {
                    let days = WeekData.days(state)
                    PaceCard {
                        WeekBars(values: days.map { $0.score }, labels: days.map { $0.label })
                            .accessibilityIdentifier("reset.bars")
                    }
                    HStack(spacing: 12) {
                        stat("\(days.reduce(0) { $0 + $1.done })", "done")
                        stat("\(state.habits.count)", "habits")
                        stat("\(days.filter { $0.done == 0 }.count)", "rest days")
                    }
                    Text("Rest days count too. See you next week.")
                        .font(.paceBody(15))
                        .foregroundStyle(theme.secondaryOnBackground)
                }
            }
            .padding(24)
        }
        .background(ThemedBackground())
        .navigationTitle("Sunday reset")
        .accessibilityIdentifier("reset.screen")
    }

    private func stat(_ n: String, _ l: String) -> some View {
        PaceCard {
            VStack(alignment: .leading, spacing: 2) {
                Text(n).font(.paceHeading(26)).fontWeight(.semibold).foregroundStyle(PaceColor.waterDeep)
                Text(l).font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
            }
        }
    }
}

struct WeekDay { let label: String; let done: Int; let score: Double }

enum WeekData {
    /// The seven days ending today, oldest first.
    static func days(_ state: PaceState) -> [WeekDay] {
        let cal = Calendar.current
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        let letters = DateFormatter()
        letters.locale = Locale(identifier: "en_US_POSIX")
        letters.dateFormat = "EEEEE"
        var out: [WeekDay] = []
        for back in stride(from: 6, through: 0, by: -1) {
            guard let date = cal.date(byAdding: .day, value: -back, to: Date()) else { continue }
            let key = fmt.string(from: date)
            let adapted = DayAdapter.adaptDay(on: key, state: state)
            out.append(WeekDay(label: letters.string(from: date),
                               done: adapted.done.count,
                               score: DayAdapter.dayScore(adapted)))
        }
        return out
    }
}

/// FOCUS TIMER: a big ring counting down one block, Skip
/// beside her, Pause and Done only.
struct FocusTimerView: View {
    @EnvironmentObject private var theme: ThemeStore
    @EnvironmentObject private var extras: ExtrasStore
    @Environment(\.dismiss) private var dismiss
    let title: String
    let minutes: Int
    @State private var remaining: Int
    @State private var running = true
    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    init(title: String, minutes: Int) {
        self.title = title
        self.minutes = max(minutes, 1)
        _remaining = State(initialValue: max(minutes, 1) * 60)
    }

    var body: some View {
        VStack(spacing: 22) {
            Text(title)
                .font(.paceHeading(22)).fontWeight(.semibold)
                .foregroundStyle(theme.inkOnBackground)
                .multilineTextAlignment(.center)
            ZStack {
                RingMeter(progress: 1 - Double(remaining) / Double(minutes * 60),
                          size: 230, line: 16)
                Text(String(format: "%d:%02d", remaining / 60, remaining % 60))
                    .font(.paceHeading(46)).fontWeight(.semibold)
                    .foregroundStyle(PaceColor.pine)
                    .monospacedDigit()
                    .accessibilityIdentifier("focus.time")
            }
            .padding(14)
            .background(PaceColor.white)
            .clipShape(Circle())
            HStack(spacing: 12) {
                Image("SkipFront").resizable().scaledToFit().frame(width: 56, height: 56)
                Text("I am right here. No rush.")
                    .font(.paceBody(15)).foregroundStyle(theme.secondaryOnBackground)
            }
            HStack(spacing: 12) {
                Button(running ? "Pause" : "Resume") { running.toggle() }
                    .buttonStyle(FocusPill(filled: false))
                    .accessibilityIdentifier("focus.pause")
                Button("Done") {
                    extras.celebrate()
                    dismiss()
                }
                .buttonStyle(FocusPill(filled: true))
                .accessibilityIdentifier("focus.done")
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ThemedBackground())
        .onReceive(tick) { _ in
            if running && remaining > 0 { remaining -= 1 }
        }
        .accessibilityIdentifier("focus.screen")
    }
}

struct FocusPill: ButtonStyle {
    let filled: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.paceBody(17)).fontWeight(.semibold)
            .foregroundStyle(filled ? PaceColor.white : PaceColor.pine)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(filled ? PaceColor.stillWater : PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(PaceColor.waterMid, lineWidth: filled ? 0 : 1))
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}

/// Reward level picker: Calm, Balanced, Rush.
struct RewardLevelView: View {
    @EnvironmentObject private var theme: ThemeStore
    @EnvironmentObject private var extras: ExtrasStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(RewardLevel.allCases) { level in
                    Button {
                        extras.reward = level
                    } label: {
                        PaceCard {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(level.title).font(.paceHeading(19)).fontWeight(.semibold)
                                        .foregroundStyle(PaceColor.pine)
                                    Text(level.line).font(.paceBody(14))
                                        .foregroundStyle(PaceColor.softInk)
                                }
                                Spacer(minLength: 0)
                                Image(systemName: extras.reward == level ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 22))
                                    .foregroundStyle(PaceColor.stillWater)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("reward.\(level.rawValue)")
                }
            }
            .padding(24)
        }
        .background(ThemedBackground())
        .navigationTitle("Reward level")
    }
}
