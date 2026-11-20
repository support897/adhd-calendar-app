import SwiftUI

/// GOALS — her shape of record (photo + words, 13–14 Nov):
/// clean, organised, cute, one goal one colour. A card
/// wears its colour as a small soft dot and a thin edge,
/// never loud. A card shows only three things: where you
/// are, the next small step in one short line, and a soft
/// progress bar in its colour — never the whole mountain,
/// never a percent. Goals with a step today stand on top;
/// finished goals slide to a done shelf at the bottom, in
/// their colours. A tap opens the goal's steps.
/// Text budget: 8 app words (Goals · Add · Join · Done).
struct GoalsView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    @State private var showAdd = false
    @State private var showJoin = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let state = session.state {
                        if !state.goals.isEmpty {
                            let pcts = state.goals.map { GoalStats.percent($0, state: state) }
                            let avg = pcts.isEmpty ? 0 : pcts.reduce(0, +) / pcts.count
                            HeroCard {
                                HStack(spacing: 16) {
                                    WhiteRing(progress: Double(avg) / 100.0)
                                    VStack(alignment: .leading, spacing: 5) {
                                        Text("\(avg)%")
                                            .font(.paceHeading(30)).fontWeight(.semibold)
                                            .foregroundStyle(PaceColor.white)
                                        Text("\(state.goals.count) goals")
                                            .font(.paceBody(14)).fontWeight(.semibold)
                                            .foregroundStyle(PaceColor.white)
                                    }
                                    Spacer(minLength: 0)
                                    Image("SkipPoint").resizable().scaledToFit().frame(width: 62, height: 62)
                                }
                            }
                            .accessibilityIdentifier("goals.hero")
                        }
                        if let shared = sharedGoals(state) {
                            ForEach(shared) { goal in
                                goalCard(goal, state: state)
                            }
                        }
                        let done = doneGoals(state)
                        if !done.isEmpty {
                            Text("Done")
                                .font(.paceBody(13))
                                .fontWeight(.bold)
                                .foregroundStyle(theme.accentOnBackground)
                                .textCase(.uppercase)
                                .padding(.top, 10)
                            ForEach(done) { goal in
                                goalCard(goal, state: state)
                            }
                        }
                        if state.goals.isEmpty {
                            Text("Nothing here yet")
                                .font(.paceBody(16))
                                .foregroundStyle(theme.secondaryOnBackground)
                                .padding(.top, 8)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 24)
            }
            .background(ThemedBackground())
            .navigationTitle("Goals")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 14) {
                        Button("Join") { showJoin = true }
                            .accessibilityIdentifier("goals.join")
                        Button {
                            showAdd = true
                        } label: {
                            Label("Add", systemImage: "plus")
                        }
                        .accessibilityIdentifier("goals.add")
                    }
                    // The toolbar words sit on the system glass
                    // capsule (FAULT 4: the tint on grey measured
                    // 2.32) — they take the glass ink of the
                    // pinned scheme instead of the tint.
                    .foregroundStyle(theme.inkOnGlass)
                }
            }
            .sheet(isPresented: $showAdd) { AddGoalView() }
            .sheet(isPresented: $showJoin) { JoinGoalView() }
            .accessibilityIdentifier("goals.list")
        }
    }

    // MARK: Ordering of record

    private func sharedGoals(_ state: PaceState) -> [PaceGoal]? {
        let today = PaceState.todayString
        let active = state.goals.filter {
            !GoalPlanner.progress(goal: $0, tasks: state.tasks, today: today).complete
        }
        guard !active.isEmpty else { return nil }
        return active.sorted { a, b in
            let aToday = GoalPlanner.progress(goal: a, tasks: state.tasks, today: today).next?.date == today
            let bToday = GoalPlanner.progress(goal: b, tasks: state.tasks, today: today).next?.date == today
            if aToday != bToday { return aToday }
            return a.title < b.title
        }
    }

    private func doneGoals(_ state: PaceState) -> [PaceGoal] {
        let today = PaceState.todayString
        return state.goals.filter {
            GoalPlanner.progress(goal: $0, tasks: state.tasks, today: today).complete
        }
    }

    // MARK: The card

    private func goalCard(_ goal: PaceGoal, state: PaceState) -> some View {
        let today = PaceState.todayString
        let progress = GoalPlanner.progress(goal: goal, tasks: state.tasks, today: today)
        let colour = Self.colour(for: goal)
        return NavigationLink {
            GoalDetailView(goal: goal)
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Image(systemName: (goal.icon?.isEmpty == false ? goal.icon! : Self.symbol(for: goal.category)))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(PaceColor.white)
                        .frame(width: 38, height: 38)
                        .background(LinearGradient(colors: [colour, colour.opacity(0.7)],
                                                   startPoint: .topLeading, endPoint: .bottomTrailing))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    Text(goal.shortName)
                        .font(.paceBody(17))
                        .fontWeight(.semibold)
                        .foregroundStyle(theme.inkOnCard)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 0)
                    CountPill(text: "\(progress.done)/\(progress.total)")
                }
                if progress.complete {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(colour)
                        Text("All done")
                            .font(.paceBody(15))
                            .foregroundStyle(theme.secondaryOnCard)
                    }
                } else if let next = progress.next {
                    Text(next.title)
                        .font(.paceBody(15))
                        .foregroundStyle(theme.secondaryOnCard)
                        .lineLimit(1)
                }
                // Her word (16 Nov, steer 4): every card
                // shows its percentage done — one small
                // number WITH the soft bar (the bar stays).
                // Steps done of total, from the plan data
                // the card already holds. This supersedes
                // the 13 Nov no-percent shape line.
                HStack(spacing: 8) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(colour.opacity(0.18))
                            Capsule().fill(colour)
                                .frame(width: progress.total > 0
                                       ? geo.size.width * CGFloat(progress.done) / CGFloat(progress.total) : 0)
                        }
                    }
                    .frame(height: 9)
                    Text("\(progress.total > 0 ? Int((100.0 * Double(progress.done) / Double(progress.total)).rounded()) : 0)%")
                        .font(.paceBody(12))
                        .fontWeight(.semibold)
                        .foregroundStyle(theme.secondaryOnCard)
                        .accessibilityIdentifier("goals.percent.\(goal.id)")
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(colour, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("goals.entry.\(goal.id)")
        .contextMenu {
            Button { session.archiveGoal(goal.id) } label: { Label("Archive goal", systemImage: "archivebox") }
            Button(role: .destructive) { session.deleteGoal(goal.id) } label: { Label("Delete goal", systemImage: "trash") }
        }
    }

    /// One goal, one colour: the category colour of record
    /// when the goal carries one; otherwise a calm colour
    /// picked steadily from the goal's own id.
    static func colour(for goal: PaceGoal) -> Color {
        if let category = goal.category,
           let hex = categoryColours[category],
           let value = UInt32(hex.dropFirst(), radix: 16) {
            return Color(hex: value)
        }
        let palette: [UInt32] = [0x5B6BD5, 0x4858C4, 0x8E7CC3, 0x35704E, 0x6B5BB0, 0x3F536E, 0x7A8699, 0x21392E]
        let hash = abs(goal.id.hashValue)
        return Color(hex: palette[hash % palette.count])
    }

    static var categoryColours: [String: String] {
        var d: [String: String] = ["other": "#7A8699"]
        for k in CategoryStore.all { d[k.id] = k.colour }
        return d
    }

    /// A designed icon per card (SF Symbols; never emoji).
    static func symbol(for category: String?) -> String {
        if let k = CategoryStore.custom.first(where: { $0.id == category }) { return k.symbol }
        switch category {
        case "school": return "book.fill"
        case "work": return "briefcase.fill"
        case "health": return "heart.fill"
        case "money": return "banknote.fill"
        case "home": return "house.fill"
        case "personal": return "leaf.fill"
        default: return "target"
        }
    }
}
