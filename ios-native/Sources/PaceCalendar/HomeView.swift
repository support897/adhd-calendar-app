import SwiftUI

/// HOME — the landing shell in her home order (Phase 1):
/// (1) Today, (2) Goals, (3) the calendar calm behind them,
/// then More, the quiet hub the later steps fill (to do,
/// habits, progress, talk, settings, Plus, kindness).
/// ProofView is retired here by name, per the P3 commission —
/// its greeting anchor lives on in TodayView.
struct HomeView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.max") }
                .accessibilityIdentifier("tab.today")

            GoalsView()
                .tabItem { Label("Goals", systemImage: "target") }
                .accessibilityIdentifier("tab.goals")

            CalendarView()
                .tabItem { Label("Calendar", systemImage: "calendar") }
                .accessibilityIdentifier("tab.calendar")

            MoreView()
                .tabItem { Label("More", systemImage: "ellipsis") }
                .accessibilityIdentifier("tab.more")
        }
        .tint(PaceColor.stillWater)
    }
}

/// MORE — the quiet hub and the menu. FIRST at the very
/// top, above everything else, stands her door by name:
/// "Join the AI kindness revolution" (her words, 14 Nov).
/// Then talk, to do, habits, progress, Plus, settings.
struct MoreView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        NavigationStack {
            List {
                NavigationLink {
                    KindnessView()
                } label: {
                    Label("Join the AI kindness revolution", systemImage: "heart")
                        .font(.paceBody(16))
                        .fontWeight(.semibold)
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.kindness")

                NavigationLink {
                    TalkView()
                } label: {
                    Label("Talk", systemImage: "mic")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.talk")

                NavigationLink {
                    TodosView()
                } label: {
                    Label("To do", systemImage: "checklist")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.todos")

                NavigationLink {
                    HabitsView()
                } label: {
                    Label("Habits", systemImage: "leaf")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.habits")

                NavigationLink {
                    ProgressView()
                } label: {
                    Label("Progress", systemImage: "chart.circle")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.progress")

                NavigationLink {
                    PlusView()
                } label: {
                    Label("Plus", systemImage: "sparkles")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.plus")

                NavigationLink {
                    SettingsView()
                } label: {
                    Label("Settings", systemImage: "gearshape")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.settings")

                Button("Sign out") {
                    session.signOut()
                }
                .font(.paceBody(16))
                .foregroundStyle(PaceColor.stillWater)
                .accessibilityIdentifier("more.signOut")
            }
            .scrollContentBackground(.hidden)
            .background(ThemedBackground())
            .navigationTitle("More")
            .accessibilityIdentifier("more.list")
        }
    }
}
