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
    @State private var focusTask: PaceInstance? = nil

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
                Text("Agenda").tag(Mode.list)
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

            if mode != .year && mode != .list {
                weekStrip
                    .padding(.horizontal, 20).padding(.top, 10)
                upNextCard
                    .padding(.horizontal, 20).padding(.top, 8)
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
        .fullScreenCover(item: $focusTask) { inst in
            FocusTimerView(title: inst.displayTitle, minutes: Int(max(inst.displayDurationMin, 5)))
        }
        }
    }

    // MARK: Week strip, feeling, up next (the old calendar look, in colour)

    private var weekStrip: some View {
        let monday = HabitsView.addDays(selectedKey, -((GoalPlanner.weekdayOf(selectedKey) + 6) % 7))
        return HStack(spacing: 6) {
            ForEach(0..<7, id: \.self) { i in
                let key = HabitsView.addDays(monday, i)
                let n = instances(on: key).count
                let sel = key == selectedKey
                Button { selectedKey = key } label: {
                    VStack(spacing: 4) {
                        Text(PaceState.date(fromKey: key).map { $0.formatted(.dateTime.weekday(.narrow)) } ?? "")
                            .font(.paceBody(12)).fontWeight(.semibold)
                            .foregroundStyle(sel ? PaceColor.white : PaceColor.softInk)
                        Text(dayNumber(key))
                            .font(.paceHeading(18)).fontWeight(.bold)
                            .foregroundStyle(sel ? PaceColor.white : PaceColor.pine)
                        Circle().fill(n == 0 ? Color.clear : (sel ? PaceColor.white : PaceColor.stillWater))
                            .frame(width: 6, height: 6)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 8)
                    .background(sel ? AnyShapeStyle(LinearGradient.paceHero) : AnyShapeStyle(PaceColor.white))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(key == PaceState.todayString && !sel ? PaceColor.stillWater : Color.clear, lineWidth: 2))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("calendar.strip.\(key)")
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("calendar.weekstrip")
    }

    private var feelingRow: some View {
        let order = ["low", "steady", "full"]
        let icons = ["cloud.fill", "sun.haze.fill", "sun.max.fill"]
        return HStack(spacing: 8) {
            ForEach(Array(order.enumerated()), id: \.offset) { i, key in
                let chosen = session.state?.feelings[selectedKey] == key
                Button { session.saveFeeling(dayKey: selectedKey, key: key) } label: {
                    HStack(spacing: 6) {
                        Image(systemName: icons[i]).font(.system(size: 14))
                        Text(session.state?.feelingNames[key] ?? ["Bad", "Ok", "Great"][i])
                            .font(.paceBody(14)).fontWeight(.semibold)
                    }
                    .foregroundStyle(chosen ? PaceColor.white : PaceColor.pine)
                    .frame(maxWidth: .infinity).frame(minHeight: 40)
                    .background(chosen ? PaceColor.stillWater : PaceColor.white)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(PaceColor.waterMid, lineWidth: chosen ? 0 : 1))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("calendar.feel.\(key)")
            }
        }
    }

    @ViewBuilder private var upNextCard: some View {
        if let next = instances(on: selectedKey).first(where: { $0.status != "done" }) {
            HStack(spacing: 12) {
                Image(systemName: "arrow.forward.circle.fill").font(.system(size: 26))
                    .foregroundStyle(PaceColor.stillWater)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Up next").font(.paceBody(12)).fontWeight(.bold).textCase(.uppercase)
                        .foregroundStyle(PaceColor.waterDeep)
                    Text(next.displayTitle).font(.paceBody(16)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.pine).lineLimit(1)
                        .accessibilityIdentifier("calendar.upnext.title")
                }
                Spacer(minLength: 0)
                Button { focusTask = next } label: {
                    Text("Start").font(.paceBody(15)).fontWeight(.bold).foregroundStyle(PaceColor.white)
                        .padding(.horizontal, 20).frame(minHeight: 40)
                        .background(LinearGradient.paceHero).clipShape(Capsule())
                }
                .buttonStyle(.plain).accessibilityIdentifier("calendar.upnext.start")
            }
            .padding(12).background(PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
            .accessibilityIdentifier("calendar.upnext")
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
        .dropDestination(for: String.self) { ids, _ in
            ids.forEach { session.moveTask($0, to: key) }
            return !ids.isEmpty
        }
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
                .padding(.vertical, 4)
                .dropDestination(for: String.self) { ids, _ in
                    ids.forEach { session.moveTask($0, to: key) }
                    return !ids.isEmpty
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
        VStack(alignment: .leading, spacing: 12) {
            Text(monthTitle(selectedKey))
                .font(.paceHeading(30))
                .fontWeight(.bold)
                .foregroundStyle(theme.inkOnBackground)
                .accessibilityIdentifier("calendar.monthTitle")

            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    ForEach(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], id: \.self) { d in
                        Text(d).font(.system(size: 10, weight: .bold)).foregroundStyle(PaceColor.softInk)
                            .frame(maxWidth: .infinity).frame(height: 24)
                            .overlay(Rectangle().stroke(PaceColor.waterMid.opacity(0.7), lineWidth: 0.5))
                    }
                }
                .background(PaceColor.white)
                let cells = monthCells
                let rows = stride(from: 0, to: cells.count, by: 7).map { Array(cells[$0..<min($0 + 7, cells.count)]) }
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                        HStack(spacing: 0) {
                            ForEach(Array(row.enumerated()), id: \.offset) { _, key in
                                monthCell(key)
                            }
                        }
                    }
                }
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("calendar.monthGrid")
            }
            .clipShape(RoundedRectangle(cornerRadius: 6))

            dayList(selectedKey)
        }
    }

    @ViewBuilder private func monthCell(_ key: String?) -> some View {
        if let key {
            let list = instances(on: key)
            let isToday = key == PaceState.todayString
            let isSel = key == selectedKey
            Button { selectedKey = key } label: {
                VStack(spacing: 4) {
                    Text(dayNumber(key))
                        .font(.paceBody(14)).fontWeight(isToday ? .bold : .regular)
                        .foregroundStyle(isToday ? PaceColor.white : PaceColor.pine)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(isToday ? PaceColor.pine : Color.clear))
                    HStack(spacing: 2) {
                        ForEach(Array(list.prefix(3).enumerated()), id: \.offset) { _, inst in
                            Circle().fill(dotColor(inst)).frame(width: 5, height: 5)
                        }
                    }
                    .frame(height: 6)
                }
                .frame(maxWidth: .infinity).frame(height: 54)
                .background(isSel ? PaceColor.waterLight.opacity(0.55) : PaceColor.white)
                .overlay(Rectangle().stroke(PaceColor.waterMid.opacity(0.7), lineWidth: 0.5))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("calendar.cell.\(key)")
            .dropDestination(for: String.self) { ids, _ in
                ids.forEach { session.moveTask($0, to: key) }
                return !ids.isEmpty
            }
        } else {
            Rectangle().fill(PaceColor.waterLight.opacity(0.3)).frame(maxWidth: .infinity).frame(height: 54)
                .overlay(Rectangle().stroke(PaceColor.waterMid.opacity(0.7), lineWidth: 0.5))
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
