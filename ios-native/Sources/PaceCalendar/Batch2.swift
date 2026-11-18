import SwiftUI
import EventKit

// MARK: habit rules (daily / weekly N / monthly N) and strength

/// Habit rules live on this device (UserDefaults) so her
/// state document is never touched. "daily" is the default.
enum HabitRule {
    static func get(_ id: String) -> (kind: String, count: Int) {
        let raw = UserDefaults.standard.string(forKey: "pace.habitRule.\(id)") ?? "daily:1"
        let parts = raw.split(separator: ":")
        let kind = parts.first.map(String.init) ?? "daily"
        let count = parts.count > 1 ? (Int(parts[1]) ?? 1) : 1
        return (kind, max(count, 1))
    }

    static func set(_ id: String, kind: String, count: Int) {
        UserDefaults.standard.set("\(kind):\(count)", forKey: "pace.habitRule.\(id)")
    }

    /// Progress against the rule: ticks done in the window and the goal.
    static func progress(id: String, days: [String: Bool], today: String) -> (done: Int, goal: Int, window: String) {
        let rule = get(id)
        switch rule.kind {
        case "weekly":
            var n = 0
            for back in 0..<7 where days[HabitsView.addDays(today, -back)] == true { n += 1 }
            return (n, rule.count, "this week")
        case "monthly":
            let prefix = String(today.prefix(7))
            let n = days.filter { $0.value && $0.key.hasPrefix(prefix) }.count
            return (n, rule.count, "this month")
        default:
            return (days[today] == true ? 1 : 0, 1, "today")
        }
    }

    /// Habit strength 0...1: recent days weigh more, one miss
    /// never zeroes it (Loop-style score, not a streak).
    static func strength(days: [String: Bool], today: String) -> Double {
        var num = 0.0
        var den = 0.0
        for back in 0..<45 {
            let w = pow(0.93, Double(back))
            den += w
            if days[HabitsView.addDays(today, -back)] == true { num += w }
        }
        return den > 0 ? num / den : 0
    }
}

struct HabitRuleMenu: View {
    let habit: PaceHabit
    let today: String
    @State private var tick = 0
    private var habitId: String { habit.id }

    var body: some View {
        let rule = HabitRule.get(habitId)
        let prog = HabitRule.progress(id: habitId, days: habit.days, today: today)
        HStack(spacing: 8) {
        Menu {
            Button("Every day") { HabitRule.set(habitId, kind: "daily", count: 1); tick += 1 }
            ForEach([2, 3, 4, 5], id: \.self) { n in
                Button("\(n) times a week") { HabitRule.set(habitId, kind: "weekly", count: n); tick += 1 }
            }
            ForEach([4, 8, 12], id: \.self) { n in
                Button("\(n) times a month") { HabitRule.set(habitId, kind: "monthly", count: n); tick += 1 }
            }
        } label: {
            Text(label(rule))
                .font(.paceBody(12)).fontWeight(.semibold)
                .foregroundStyle(PaceColor.waterDeep)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(PaceColor.waterLight.opacity(0.35))
                .clipShape(Capsule())
        }
        .accessibilityIdentifier("habits.rule.\(habitId)")
        Text("\(prog.done) of \(prog.goal) \(prog.window)")
            .font(.paceBody(12))
            .foregroundStyle(PaceColor.softInk)
            .accessibilityIdentifier("habits.progress.\(habitId)")
        }
        .id(tick)
    }

    private func label(_ r: (kind: String, count: Int)) -> String {
        switch r.kind {
        case "weekly": return "\(r.count) a week"
        case "monthly": return "\(r.count) a month"
        default: return "Every day"
        }
    }
}

// MARK: real time (what things really take)

struct RealTimeEntry: Codable, Identifiable {
    var id = UUID().uuidString
    var title: String
    var planned: Double
    var real: Double
}

enum RealTime {
    static func all() -> [RealTimeEntry] {
        guard let data = UserDefaults.standard.data(forKey: "pace.realTime"),
              let items = try? JSONDecoder().decode([RealTimeEntry].self, from: data) else { return [] }
        return items
    }

    static func record(title: String, planned: Double, real: Double) {
        guard real >= 1, planned >= 1 else { return }
        var items = all()
        items.insert(RealTimeEntry(title: title, planned: planned, real: real), at: 0)
        if items.count > 60 { items = Array(items.prefix(60)) }
        if let data = try? JSONEncoder().encode(items) {
            UserDefaults.standard.set(data, forKey: "pace.realTime")
        }
    }

    /// Typical real/planned ratio (median), 1.0 until there is data.
    static func ratio() -> Double {
        let r = all().map { $0.real / $0.planned }.sorted()
        guard !r.isEmpty else { return 1.0 }
        return r[r.count / 2]
    }

    /// Length shown for a new task when buffer is on.
    static func padded(_ minutes: Int) -> Int {
        guard UserDefaults.standard.bool(forKey: "pace.buffer.on") else { return minutes }
        let padded = Double(minutes) * max(1.0, min(ratio(), 2.0))
        return Int((padded / 5.0).rounded(.up)) * 5
    }
}

struct LearnedTimeView: View {
    @EnvironmentObject private var theme: ThemeStore
    @AppStorage("pace.buffer.on") private var bufferOn = false

    var body: some View {
        let items = RealTime.all()
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 12) {
                    Image("SkipPoint").resizable().scaledToFit().frame(width: 64, height: 64)
                    Text("You are not slow. Plans are just tight. I will add room.")
                        .font(.paceBody(15)).foregroundStyle(theme.inkOnBackground)
                }
                PaceCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Your real time")
                            .font(.paceHeading(20)).fontWeight(.semibold)
                            .foregroundStyle(PaceColor.pine)
                        if items.isEmpty {
                            Text("Finish a task with the focus timer and I will learn.")
                                .font(.paceBody(14)).foregroundStyle(PaceColor.softInk)
                        }
                        ForEach(items.prefix(6)) { e in
                            VStack(alignment: .leading, spacing: 5) {
                                HStack {
                                    Text(e.title).font(.paceBody(14)).foregroundStyle(PaceColor.pine)
                                    Spacer()
                                    Text("\(Int(e.planned)) planned, \(Int(e.real)) real")
                                        .font(.paceBody(12)).foregroundStyle(PaceColor.softInk)
                                }
                                GeometryReader { geo in
                                    let top = max(e.planned, e.real)
                                    ZStack(alignment: .leading) {
                                        Capsule().fill(PaceColor.waterLight)
                                            .frame(width: geo.size.width * CGFloat(e.planned / top))
                                        Capsule().fill(PaceColor.stillWater)
                                            .frame(width: geo.size.width * CGFloat(e.real / top))
                                            .opacity(0.9)
                                    }
                                }
                                .frame(height: 9)
                            }
                        }
                        Text(String(format: "Typical: %.1fx the plan", RealTime.ratio()))
                            .font(.paceBody(13)).fontWeight(.semibold)
                            .foregroundStyle(PaceColor.waterDeep)
                            .accessibilityIdentifier("realtime.ratio")
                    }
                }
                PaceCard {
                    Toggle("Add buffer for me", isOn: $bufferOn)
                        .font(.paceBody(16))
                        .tint(PaceColor.stillWater)
                        .foregroundStyle(PaceColor.pine)
                        .accessibilityIdentifier("realtime.buffer")
                }
            }
            .padding(24)
        }
        .background(ThemedBackground())
        .navigationTitle("Real time")
    }
}

// MARK: year

struct YearView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore

    private let cols = Array(repeating: GridItem(.flexible(), spacing: 3), count: 7)

    var body: some View {
        let year = Calendar.current.component(.year, from: Date())
        VStack(alignment: .leading, spacing: 16) {
            Text(String(year))
                .font(.paceHeading(26)).fontWeight(.semibold)
                .foregroundStyle(theme.inkOnBackground)
                .accessibilityIdentifier("year.title")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: 16) {
                ForEach(1...12, id: \.self) { m in
                    monthCell(year: year, month: m)
                }
            }
            HStack(spacing: 6) {
                Text("less").font(.paceBody(11)).foregroundStyle(theme.secondaryOnBackground)
                ForEach(0..<4, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 2).fill(shade(i)).frame(width: 12, height: 12)
                }
                Text("more").font(.paceBody(11)).foregroundStyle(theme.secondaryOnBackground)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("year.grid")
    }

    private func shade(_ level: Int) -> Color {
        switch level {
        case 0: return PaceColor.lineMist
        case 1: return PaceColor.waterLight
        case 2: return PaceColor.waterMid
        default: return PaceColor.stillWater
        }
    }

    private func monthCell(year: Int, month: Int) -> some View {
        let cal = Calendar.current
        let first = cal.date(from: DateComponents(year: year, month: month, day: 1)) ?? Date()
        let count = cal.range(of: .day, in: .month, for: first)?.count ?? 30
        let lead = (cal.component(.weekday, from: first) + 5) % 7
        let name = DateFormatter().shortMonthSymbols[month - 1]
        return VStack(alignment: .leading, spacing: 4) {
            Text(name).font(.paceBody(12)).fontWeight(.bold).foregroundStyle(PaceColor.waterDeep)
            LazyVGrid(columns: cols, spacing: 3) {
                ForEach(0..<lead, id: \.self) { _ in Color.clear.frame(height: 8) }
                ForEach(1...count, id: \.self) { d in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(shade(level(year: year, month: month, day: d)))
                        .frame(height: 8)
                }
            }
        }
        .padding(8)
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
    }

    private func level(year: Int, month: Int, day: Int) -> Int {
        guard let state = session.state else { return 0 }
        let key = String(format: "%04d-%02d-%02d", year, month, day)
        let n = DayAdapter.instances(on: key, state: state).count
        return n == 0 ? 0 : (n == 1 ? 1 : (n <= 3 ? 2 : 3))
    }
}

// MARK: calendars (Apple two-way) and leave-by settings

struct LegacyCalendarsView: View {
    @EnvironmentObject private var theme: ThemeStore
    @AppStorage("pace.import.on") private var importOn = false
    @ObservedObject private var google = GoogleCal.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                PaceCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle("Apple Calendar: two-way", isOn: $importOn)
                            .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                            .tint(PaceColor.stillWater)
                            .accessibilityIdentifier("calendars.apple")
                        Text("Pace writes your tasks to its own calendar. With this on, events from your other Apple calendars show on Today as fixed, and Pace never changes them.")
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    }
                }
                PaceCard {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Google Calendar").font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                            Spacer()
                            if google.connected {
                                Button("Disconnect") { google.disconnect() }
                                    .font(.paceBody(14)).foregroundStyle(PaceColor.waterDeep)
                                    .frame(minHeight: 44)
                                    .accessibilityIdentifier("calendars.google.off")
                            } else {
                                Button("Connect") { Task { await google.connect() } }
                                    .font(.paceBody(14)).fontWeight(.semibold)
                                    .foregroundStyle(PaceColor.waterDeep)
                                    .frame(minHeight: 44)
                                    .accessibilityIdentifier("calendars.google.on")
                            }
                        }
                        Text(google.connected ? "Read only. Events show on Today as fixed." : (google.note.isEmpty ? "Read only. Pace never changes your Google calendar." : google.note))
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    }
                }
                PaceCard {
                    HStack {
                        Text("Outlook").font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                        Spacer()
                        Text("Needs a Microsoft app registration").font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    }
                }
            }
            .padding(24)
        }
        .background(ThemedBackground())
        .navigationTitle("Calendars")
    }
}

struct LeaveBySettingsView: View {
    @AppStorage("pace.leaveby.on") private var on = true
    @AppStorage("pace.leaveby.travel") private var travel = 15
    @AppStorage("pace.leaveby.buffer") private var buffer = 5

    var body: some View {
        Form {
            Toggle("Leave-by alerts", isOn: $on)
                .accessibilityIdentifier("leaveby.on")
            Stepper("Travel: \(travel) min", value: $travel, in: 0...120, step: 5)
                .accessibilityIdentifier("leaveby.travel")
            Stepper("Buffer: \(buffer) min", value: $buffer, in: 0...30, step: 5)
                .accessibilityIdentifier("leaveby.buffer")
            Text("For tasks you marked Can't move, Pace warns you when it is time to leave.")
                .font(.paceBody(13))
        }
        .scrollContentBackground(.hidden)
        .background(ThemedBackground())
        .navigationTitle("Leave by")
    }
}

/// Fixed events from her other Apple calendars (read only).
struct AppleFixedEvent: Identifiable {
    let id: String
    let title: String
    let start: Date
    let end: Date
}

extension EventKitBridge {
    /// Events of one day from calendars other than Pace's own.
    func importedEvents(on day: Date) -> [AppleFixedEvent] {
        guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else { return [] }
        let store = EKEventStore()
        let cal = Calendar.current
        let start = cal.startOfDay(for: day)
        guard let end = cal.date(byAdding: .day, value: 1, to: start) else { return [] }
        let others = store.calendars(for: .event).filter { $0.title != "Pace" }
        guard !others.isEmpty else { return [] }
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: others)
        return store.events(matching: predicate).filter { !$0.isAllDay }.map {
            AppleFixedEvent(id: $0.eventIdentifier ?? UUID().uuidString,
                            title: $0.title ?? "Event", start: $0.startDate, end: $0.endDate)
        }
    }
}
