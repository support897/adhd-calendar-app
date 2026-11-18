import SwiftUI

/// Three rings: day, habits, goals. None starts at empty
/// (endowed progress): a quiet floor of 6 percent shows.
struct TripleRingsCard: View {
    let state: PaceState
    let day: AdaptedDay

    private var dayValue: Double { DayAdapter.dayScore(day) }
    private var habitValue: Double {
        guard !state.habits.isEmpty else { return 0 }
        let today = PaceState.todayString
        let n = state.habits.filter { $0.days[today] == true }.count
        return Double(n) / Double(state.habits.count)
    }
    private var goalValue: Double {
        guard !state.goals.isEmpty else { return 0 }
        let sum = state.goals.map { Double(GoalStats.percent($0, state: state)) }.reduce(0, +)
        return sum / Double(state.goals.count) / 100.0
    }
    private func floorValue(_ v: Double) -> Double { max(v, 0.06) }

    var body: some View {
        PaceCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 18) {
                    ring("Day", dayValue, PaceColor.stillWater)
                    ring("Habits", habitValue, PaceColor.waterMid)
                    ring("Goals", goalValue, PaceColor.pine)
                    Spacer(minLength: 0)
                }
                EnergyWave()
                    .frame(height: 46)
                Text("Your energy usually rises mid-morning.")
                    .font(.paceBody(12)).foregroundStyle(PaceColor.softInk)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("today.rings")
    }

    private func ring(_ label: String, _ v: Double, _ color: Color) -> some View {
        VStack(spacing: 5) {
            ZStack {
                Circle().stroke(PaceColor.lineMist, lineWidth: 7)
                Circle().trim(from: 0, to: floorValue(v))
                    .stroke(color, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int((v * 100).rounded()))")
                    .font(.paceBody(13)).fontWeight(.bold).foregroundStyle(PaceColor.pine)
            }
            .frame(width: 54, height: 54)
            Text(label).font(.paceBody(11)).foregroundStyle(PaceColor.softInk)
        }
    }
}

/// A soft energy wave across the day with a marker for now.
/// A picture, not a promise: it is the common rise-and-dip
/// shape, drawn quietly so the day has a shape.
struct EnergyWave: View {
    private var nowFraction: Double {
        let c = Calendar.current
        let h = Double(c.component(.hour, from: Date())) + Double(c.component(.minute, from: Date())) / 60
        return min(max((h - 6) / 16, 0), 1)
    }
    private func y(_ t: Double, _ h: CGFloat) -> CGFloat {
        let v = 0.55 + 0.30 * sin((t - 0.12) * .pi * 2.1) - 0.08 * t
        return h * (1 - CGFloat(min(max(v, 0.05), 0.95)))
    }
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .topLeading) {
                Path { p in
                    p.move(to: CGPoint(x: 0, y: y(0, g.size.height)))
                    for i in 1...60 {
                        let t = Double(i) / 60
                        p.addLine(to: CGPoint(x: g.size.width * t, y: y(t, g.size.height)))
                    }
                }
                .stroke(PaceColor.waterLight, style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
                Circle().fill(PaceColor.stillWater)
                    .frame(width: 12, height: 12)
                    .position(x: g.size.width * nowFraction, y: y(nowFraction, g.size.height))
            }
        }
        .accessibilityHidden(true)
    }
}

/// The day closed as a picture: one block per thing done,
/// softer blocks for the parked. Never a count of misses.
struct EveningMosaic: View {
    let done: Int
    let parked: Int
    private let palette: [Color] = [PaceColor.stillWater, PaceColor.waterMid, PaceColor.waterLight, PaceColor.waterDeep, PaceColor.pine]
    var body: some View {
        let cols = [GridItem(.adaptive(minimum: 22), spacing: 5)]
        LazyVGrid(columns: cols, alignment: .leading, spacing: 5) {
            ForEach(0..<max(done, 1), id: \.self) { i in
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(done == 0 ? PaceColor.lineMist : palette[i % palette.count])
                    .frame(height: 22)
            }
            ForEach(0..<min(parked, 12), id: \.self) { _ in
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .stroke(PaceColor.waterLight, lineWidth: 1.5)
                    .frame(height: 22)
            }
        }
        .accessibilityHidden(true)
    }
}

/// Skip grows with the days she shows up (More hub card).
struct SkipGrowthCard: View {
    let state: PaceState
    private var days: Int {
        let keys = Set(state.tasks.compactMap { $0.doneOn }).union(state.habits.flatMap { h in h.days.filter { $0.value }.map { $0.key } })
        return keys.count
    }
    private var stage: String {
        switch days {
        case 0..<3: return "Skip is just starting out"
        case 3..<10: return "Skip is finding his feet"
        case 10..<30: return "Skip is settling in"
        default: return "Skip is at home with you"
        }
    }
    var body: some View {
        HStack(spacing: 14) {
            Image("SkipFront").resizable().scaledToFit()
                .frame(width: CGFloat(52 + min(days, 30)), height: CGFloat(52 + min(days, 30)))
            VStack(alignment: .leading, spacing: 3) {
                Text(stage).font(.paceHeading(17)).fontWeight(.semibold).foregroundStyle(PaceColor.pine)
                Text("\(days) days you showed up.").font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("more.skipGrowth")
    }
}
