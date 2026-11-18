import SwiftUI

/// Phase A kit: the gradient hero card and the soft stat pill
/// the mockups use on Calendar, Goals and Habits.
struct HeroCard<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        content()
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(LinearGradient.paceHero)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: PaceColor.stillWater.opacity(0.28), radius: 12, y: 7)
    }
}

struct CountPill: View {
    let text: String
    var onDark: Bool = false
    var body: some View {
        Text(text)
            .font(.paceBody(12)).fontWeight(.bold)
            .foregroundStyle(onDark ? PaceColor.waterDeep : PaceColor.waterDeep)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(onDark ? PaceColor.white : PaceColor.waterLight.opacity(0.35))
            .clipShape(Capsule())
    }
}

/// A white ring for use on the gradient hero.
struct WhiteRing: View {
    var progress: Double
    var size: CGFloat = 64
    var body: some View {
        RingMeter(progress: progress, size: size, line: 8,
                  fill: PaceColor.white, track: PaceColor.white.opacity(0.3))
    }
}

enum GoalStats {
    static func percent(_ goal: PaceGoal, state: PaceState) -> Int {
        let p = GoalPlanner.progress(goal: goal, tasks: state.tasks, today: PaceState.todayString)
        return p.total > 0 ? Int((100.0 * Double(p.done) / Double(p.total)).rounded()) : 0
    }
}

/// The halfway reward on a goal: Skip celebrates once the
/// plan passes 50 percent (calm: a card, never a popup).
struct HalfwayBadge: View {
    let percent: Int
    var body: some View {
        if percent >= 50 {
            PaceCard {
                HStack(spacing: 12) {
                    Image("SkipCelebrate").resizable().scaledToFit().frame(width: 56, height: 56)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(percent >= 100 ? "All done" : "Halfway there")
                            .font(.paceHeading(18)).fontWeight(.semibold)
                            .foregroundStyle(PaceColor.pine)
                        Text("Every step counts.")
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    }
                }
            }
            .accessibilityIdentifier("goal.halfway")
        }
    }
}
