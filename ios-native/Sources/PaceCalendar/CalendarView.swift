import SwiftUI

/// THE CALENDAR — a full, real, working calendar (her ruling
/// of record: it STAYS, it is the point of Pace), calm in how
/// it shows: day · week · month of one quiet calendar. Month
/// is a tidy grid with dots and first titles; week is seven
/// calm day lists; day is a list by time. A goal filter rides
/// it (from the Goals entry): only that goal's steps stand.
/// Text budget: 10 app words (Day · Week · Month · Today ·
/// Add · Clear) — titles and dates are her data.
struct CalendarView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    var goalFilter: String? = nil
    var goalName: String? = nil

    @State private var mode: Mode = .month
    @State private var selectedKey: String = PaceState.todayString
    @State private var showAdd = false
    @State private var filterCleared = false

    enum Mode: String, CaseIterable { case day, week, month, year, list }

    private var activeFilter: String? { filterCleared ? nil : goalFilter }

    private func instances(on key: String) -> [PaceInstance] {
        guard let state = session.state else { return [] }
        var list = DayAdapter.instances(on: key, state: state)
        if let filter = activeFilter {
            list = list.filter { $0.task.goalId == filter }
        }
        return DayAdapter.sortForDayOrder(DayAdapter.sortDay(list), dayKey: key, state: state)
    }

    var body: some View {
        // Own stack, like Today and Goals: the toolbar
        // (Today · Add) needs one to stand in.
        NavigationStack {
        VStack(spacing: 0) {
            Picker("View", selection: $mode) {
                Text("Day").tag(Mode.day)
                Text("Week").tag(Mode.week)
                Text("Month").tag(Mode.month)
                Text("Year").tag(Mode.year)
                Text("List").tag(Mode.list)
            }
            .pickerStyle(.segmented)
            .tint(PaceColor.stillWater)
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .accessibilityIdentifier("calendar.mode")

            if let name = goalName, activeFilter != nil {
                HStack(spacing: 10) {
                    Circle().fill(PaceColor.apricotDeep).frame(width: 9, height: 9)
                    Text(name)
                        .font(.paceBody(15))
                        .fontWeight(.semibold)
                        .foregroundStyle(theme.inkOnBackground)
                    Spacer()
                    Button("Clear") { filterCleared = true }
                        .font(.paceBody(14))
                        .fontWeight(.semibold)
                        .foregroundStyle(theme.accentOnBackground)
                        .accessibilityIdentifier("calendar.clearFilter")
                }
                .padding(.horizontal, 24)
                .padding(.top, 10)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    switch mode {
                    case .day: dayList(selectedKey)
                    case .week: weekList
                    case .month: monthGrid
                    case .year: YearView()
                    case .list: todoList
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
            }
        }
        .background(ThemedBackground())
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 14) {
                    Button("Today") {
                        selectedKey = PaceState.todayString
                    }
                    .accessibilityIdentifier("calendar.today")
                    Button {
                        showAdd = true
                    } label: {
                        Label("Add", systemImage: "plus")
                    }
                    .accessibilityIdentifier("calendar.add")
                }
            }
        }
        .sheet(isPresented: $showAdd) {
            AddEventView(dayKey: selectedKey)
        }
        }
    }

    // MARK: Day

    /// The to-do way to look: Now, Later today, Soon. The same
    /// items as the calendar, as a plain list.
    private var todoList: some View {
        let today = PaceState.todayString
        let todays = instances(on: today).filter { $0.status != "done" }
        let now = Array(todays.prefix(1))
        let later = Array(todays.dropFirst())
        let soon: [(String, [PaceInstance])] = (1...7).compactMap { i in
            let key = HabitsView.addDays(today, i)
            let l = instances(on: key).filter { $0.status != "done" }
            return l.isEmpty ? nil : (key, l)
        }
        return VStack(alignment: .leading, spacing: 16) {
            todoGroup("Now", now, today)
            todoGroup("Later today", later, today)
            ForEach(soon, id: \.0) { key, l in
                todoGroup(PaceState.date(fromKey: key).map { $0.formatted(.dateTime.weekday(.wide).day()) } ?? key, l, key)
            }
            if now.isEmpty && later.isEmpty && soon.isEmpty {
                Image("SkipRest").resizable().scaledToFit().frame(width: 96, height: 96)
                Text("Nothing here yet")
                    .font(.paceBody(16)).foregroundStyle(theme.secondaryOnBackground)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("calendar.todoList")
    }

    @ViewBuilder
    private func todoGroup(_ title: String, _ list: [PaceInstance], _ key: String) -> some View {
        if !list.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.paceBody(13)).fontWeight(.bold)
                    .textCase(.uppercase)
                    .foregroundStyle(theme.accentOnBackground)
                ForEach(list) { inst in
                    TaskRow(instance: inst) {
                        session.setTaskDone(taskId: inst.task.id, dayKey: key, done: true)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func dayList(_ key: String) -> some View {
        let list = instances(on: key)
        VStack(alignment: .leading, spacing: 8) {
            HeroCard {
                HStack(spacing: 14) {
                    WhiteRing(progress: list.isEmpty ? 0 : Double(list.filter { $0.status == "done" }.count) / Double(list.count), size: 54)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(dayTitle(key))
                            .font(.paceHeading(19)).fontWeight(.semibold)
                            .foregroundStyle(PaceColor.white)
                            .accessibilityIdentifier("calendar.dayTitle")
                        Text("\(list.count) on the day")
                            .font(.paceBody(13)).foregroundStyle(PaceColor.white)
                    }
                    Spacer(minLength: 0)
                }
            }
            if list.isEmpty {
                Text("Nothing here yet")
                    .font(.paceBody(16))
                    .foregroundStyle(theme.secondaryOnBackground)
                    .padding(.vertical, 6)
            } else {
                ForEach(list) { inst in
                    TaskRow(instance: inst) {
                        session.setTaskDone(taskId: inst.task.id, dayKey: key,
                                            done: inst.status != "done")
                    }
                }
            }
        }
        .accessibilityIdentifier("calendar.dayList")
    }

    // MARK: Week

    private var weekList: some View {
        VStack(alignment: .leading, spacing: 20) {
            PaceCard {
                let counts = weekKeys.map { Double(instances(on: $0).count) }
                let top = max(counts.max() ?? 1, 1)
                WeekBars(values: counts.map { $0 / top }, labels: ["M", "T", "W", "T", "F", "S", "S"])
            }
            .accessibilityIdentifier("calendar.weekChart")
            ForEach(weekKeys, id: \.self) { key in
                let list = instances(on: key)
                VStack(alignment: .leading, spacing: 4) {
                    Button {
                        selectedKey = key
                        mode = .day
                    } label: {
                        Text(dayTitle(key))
                            .font(.paceBody(15))
                            .fontWeight(.bold)
                            .foregroundStyle(key == PaceState.todayString ? theme.accentOnBackground : theme.inkOnBackground)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("calendar.weekDay.\(key)")
                    ForEach(list.prefix(4)) { inst in TaskRow(instance: inst) }
                    if list.count > 4 {
                        Text("+\(list.count - 4)")
                            .font(.paceBody(13))
                            .foregroundStyle(theme.secondaryOnBackground)
                    }
                }
            }
        }
        .accessibilityIdentifier("calendar.weekList")
    }

    private var weekKeys: [String] {
        guard let selected = PaceState.date(fromKey: selectedKey) else { return [selectedKey] }
        let cal = Calendar.current
        let weekday = cal.component(.weekday, from: selected)   // 1 = Sunday
        let mondayOffset = -( (weekday + 5) % 7 )
        guard let monday = cal.date(byAdding: .day, value: mondayOffset, to: selected) else { return [selectedKey] }
        return (0..<7).compactMap { offset in
            cal.date(byAdding: .day, value: offset, to: monday).map { PaceState.dayKey(for: $0) }
        }
    }

    // MARK: Month

    private var monthGrid: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(monthTitle(selectedKey))
                .font(.paceHeading(20))
                .fontWeight(.semibold)
                .foregroundStyle(theme.inkOnBackground)

            let cells = monthCells
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 4) {
                ForEach(Array(cells.enumerated()), id: \.offset) { _, key in
                    if let key {
                        let list = instances(on: key)
                        Button {
                            selectedKey = key
                        } label: {
                            VStack(spacing: 3) {
                                Text(dayNumber(key))
                                    .font(.paceBody(15))
                                    .fontWeight(key == PaceState.todayString ? .bold : .regular)
                                    .foregroundStyle(key == selectedKey ? PaceColor.white : theme.inkOnCard)
                                HStack(spacing: 2) {
                                    ForEach(Array(list.prefix(3).enumerated()), id: \.offset) { _, inst in
                                        Circle()
                                            .fill(dotColor(inst))
                                            .frame(width: 5, height: 5)
                                    }
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 7)
                            .background(key == selectedKey ? PaceColor.stillWater : heat(list.count))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("calendar.cell.\(key)")
                    } else {
                        Color.clear.frame(height: 44)
                    }
                }
            }
            .accessibilityIdentifier("calendar.monthGrid")

            dayList(selectedKey)
        }
    }

    /// Month heat: a busier day is a deeper wash of Water Light.
    private func heat(_ n: Int) -> Color {
        switch n {
        case 0: return PaceColor.white
        case 1: return PaceColor.waterLight.opacity(0.25)
        case 2: return PaceColor.waterLight.opacity(0.45)
        default: return PaceColor.waterLight.opacity(0.7)
        }
    }

    /// The month's cells, Monday-first, blanks as nil.
    private var monthCells: [String?] {
        guard let anchor = PaceState.date(fromKey: selectedKey) else { return [] }
        let cal = Calendar.current
        var comps = cal.dateComponents([.year, .month], from: anchor)
        comps.day = 1
        guard let first = cal.date(from: comps),
              let dayCount = cal.range(of: .day, in: .month, for: first)?.count else { return [] }
        let firstWeekday = cal.component(.weekday, from: first)   // 1 = Sunday
        let blanks = (firstWeekday + 5) % 7
        var cells: [String?] = Array(repeating: nil, count: blanks)
        for day in 1...dayCount {
            comps.day = day
            if let date = cal.date(from: comps) {
                cells.append(PaceState.dayKey(for: date))
            }
        }
        while cells.count % 7 != 0 { cells.append(nil) }
        return cells
    }

    // MARK: Words from data (dates are data, not app words)

    private func dayTitle(_ key: String) -> String {
        guard let date = PaceState.date(fromKey: key) else { return key }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_AU")
        f.dateFormat = "EEEE d MMM"
        return f.string(from: date)
    }

    private func monthTitle(_ key: String) -> String {
        guard let date = PaceState.date(fromKey: key) else { return key }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_AU")
        f.dateFormat = "MMMM yyyy"
        return f.string(from: date)
    }

    private func dayNumber(_ key: String) -> String {
        String(key.suffix(2).drop(while: { $0 == "0" }).isEmpty ? "0" : String(key.suffix(2).drop(while: { $0 == "0" })))
    }

    private func dotColor(_ inst: PaceInstance) -> Color {
        guard let hex = inst.task.color, hex.hasPrefix("#"), hex.count == 7,
              let value = UInt32(hex.dropFirst(), radix: 16) else { return PaceColor.waterMid }
        return Color(hex: value)
    }
}
