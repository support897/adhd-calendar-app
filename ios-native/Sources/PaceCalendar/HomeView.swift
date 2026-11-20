import SwiftUI

/// HOME — the landing shell in her home order: (1) Today,
/// (2) Goals, (3) the calendar calm behind them, then —
/// round 2, her order of 16 Nov — (4) Habits and (5) Talk
/// standing on the bar themselves, then (6) More, the quiet
/// hub (to do, progress, settings, Plus, kindness first).
/// ProofView is retired here by name, per the P3 commission —
/// its greeting anchor lives on in TodayView.
struct HomeView: View {
    @EnvironmentObject private var theme: ThemeStore
    @EnvironmentObject private var extras: ExtrasStore
    @EnvironmentObject private var session: SessionStore
    @State private var selection = "today"
    @State private var showQuickAdd = false
    @AppStorage("pace.tour.done") private var tourDone = false
    @State private var showTour = false
    @State private var showOffer = false
    @AppStorage("pace.cal.offered") private var calOffered = false
    @AppStorage("pace.tour.replay") private var replayCount = 0

    var body: some View {
        ZStack {
            tabLayer("today") { TodayView() }
            tabLayer("goals") { GoalsView() }
            tabLayer("calendar") { CalendarView() }
            tabLayer("habits") { NavigationStack { HabitsView() } }
            tabLayer("talk") { NavigationStack { TalkView() } }
            tabLayer("more") { MoreView() }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) { bar }
        .overlay {
            if let line = extras.celebrating {
                CelebrationView(line: line)
            }
        }
        .animation(.easeOut(duration: 0.25), value: extras.celebrating)
        .onAppear {
            WatchLink.shared.onDone = { id in
                session.setTaskDone(taskId: id, dayKey: PaceState.todayString, done: true)
            }
            WatchLink.shared.start()
        }
        .sheet(isPresented: $showQuickAdd) {
            PlusChooser()
        }
        .fullScreenCover(isPresented: $showTour) {
            TourView {
                tourDone = true
                showTour = false
                Task {
                    try? await Task.sleep(nanoseconds: 900_000_000)
                    offerCalendarIfNeeded()
                }
            }
        }
        .sheet(isPresented: $showOffer) {
            CalendarOfferView { showOffer = false }
        }
        .onChange(of: replayCount) { _, _ in showTour = true }
        .task(id: session.stateLoaded) {
            // First time in: Skip offers the tour (not in test drives).
            if session.stateLoaded, !tourDone,
               !ProcessInfo.processInfo.arguments.contains("-PaceTwinConfig") {
                showTour = true
            } else if session.stateLoaded {
                try? await Task.sleep(nanoseconds: 1_200_000_000)
                offerCalendarIfNeeded()
            }
        }
        // Toolbar words inside the tabs take the tint: the
        // accent step that measures on the pinned scheme's
        // surfaces (Water Deep in the light worlds, Water
        // Light in the dark one).
        .tint(theme.accentOnSystemSurface)
    }

    /// One tab's world, kept alive the way the system bar
    /// kept them: only the chosen one shows, touches and
    /// speaks; the rest stand silent with their state kept.
    /// An unchosen layer is .hidden() — TRULY out of the
    /// accessibility tree, as an unselected system tab was.
    /// (Opacity + accessibilityHidden leaked: the first bar
    /// drive found Today's and the Calendar's same task
    /// tick twice — "multiple matching elements" — because
    /// a faded layer still speaks to the tree.)
    /// Offered once, as soon as she opens the app: bring your calendar in.
    private func offerCalendarIfNeeded() {
        guard !calOffered, !showTour,
              !ProcessInfo.processInfo.arguments.contains("-PaceTwinConfig") else { return }
        calOffered = true
        if !CalendarHub.shared.authorized { showOffer = true }
    }

    private func tabLayer<Content: View>(_ id: String,
                                         @ViewBuilder content: () -> Content) -> some View {
        Group {
            if selection == id {
                content()
            } else {
                content()
                    .hidden()
                    .allowsHitTesting(false)
            }
        }
    }

    /// THE BAR (round 2): her six items in her order —
    /// Today · Goals · Calendar · Habits · Talk · More. The
    /// bar is hand-built because the system tab bar folds
    /// everything past five into its own overflow "More":
    /// proven on this build's first combined drive, where
    /// six items showed as four plus the system's More and
    /// MoreView never stood (the P4 leg's "more.todos"
    /// found no match). Calm, per her clean steer: an icon
    /// over a small word; the chosen item in the accent ink,
    /// the rest in the secondary ink — both roles measured
    /// at 4.5:1 or better on the world's colour in every
    /// theme (CONTRAST-RESEARCH). The identifiers are the
    /// standing tab.* contract, unchanged.
    private var bar: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(PaceColor.lineMist)
                .frame(height: 1)
            HStack(spacing: 0) {
                barItem("today", "Today", "sun.max")
                barItem("goals", "Goals", "target")
                barItem("calendar", "Calendar", "calendar")
                Button { showQuickAdd = true } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(PaceColor.white)
                        .frame(width: 54, height: 54)
                        .background(LinearGradient.paceHero)
                        .clipShape(Circle())
                        .shadow(color: PaceColor.stillWater.opacity(0.4), radius: 8, y: 4)
                        .offset(y: -12)
                }
                .frame(maxWidth: .infinity)
                .buttonStyle(.plain)
                .accessibilityLabel("Add")
                .accessibilityIdentifier("tab.add")
                barItem("habits", "Habits", "leaf")
                barItem("talk", "Talk", "mic")
                barItem("more", "More", "ellipsis")
            }
            .padding(.top, 7)
            .padding(.bottom, 2)
        }
        .background(ThemedBackground())
    }

    private func barItem(_ id: String, _ label: String, _ symbol: String) -> some View {
        Button {
            selection = id
        } label: {
            VStack(spacing: 3) {
                Image(systemName: symbol)
                    .font(.system(size: 20))
                Text(label)
                    .font(.paceBody(10))
                    .fontWeight(.semibold)
            }
            .foregroundStyle(selection == id ? theme.accentOnBackground
                                             : theme.secondaryOnBackground)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("tab.\(id)")
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
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    TalkView()
                } label: {
                    Label("Talk", systemImage: "mic")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.talk")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    TodosView()
                } label: {
                    Label("To do", systemImage: "checklist")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.todos")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    HabitsView()
                } label: {
                    Label("Habits", systemImage: "leaf")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.habits")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    ProgressView()
                } label: {
                    Label("Progress", systemImage: "chart.circle")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.progress")
                .listRowBackground(PaceColor.white)


                NavigationLink {
                    SettingsView()
                } label: {
                    Label("Settings", systemImage: "gearshape")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.settings")
                .listRowBackground(PaceColor.white)

                Button("Sign out") {
                    session.signOut()
                }
                .font(.paceBody(16))
                .foregroundStyle(PaceColor.waterDeep)
                .accessibilityIdentifier("more.signOut")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    List {
                NavigationLink {
                    BrainDumpView()
                } label: {
                    Label("Dump", systemImage: "tray")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.dump")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    SundayResetView()
                } label: {
                    Label("Sunday reset", systemImage: "arrow.triangle.2.circlepath")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.reset")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    LearnedTimeView()
                } label: {
                    Label("Real time", systemImage: "clock")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.realtime")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    CalendarsView()
                } label: {
                    Label("Calendars", systemImage: "calendar.badge.plus")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.calendars")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    LeaveBySettingsView()
                } label: {
                    Label("Leave by", systemImage: "figure.walk")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.leaveby")
                .listRowBackground(PaceColor.white)

                NavigationLink {
                    RewardLevelView()
                } label: {
                    Label("Reward level", systemImage: "sparkle")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.reward")
                .listRowBackground(PaceColor.white)

                    }
                    .scrollContentBackground(.hidden)
                    .background(ThemedBackground())
                    .navigationTitle("Tools")
                } label: {
                    Label("Tools", systemImage: "square.grid.2x2")
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                }
                .accessibilityIdentifier("more.tools")
                .listRowBackground(PaceColor.white)

                if let st = session.state {
                    SkipGrowthCard(state: st)
                        .listRowBackground(PaceColor.white)
                }
            }
            .scrollContentBackground(.hidden)
            .background(ThemedBackground())
            .navigationTitle("More")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { ReportIcons() } }
            .accessibilityIdentifier("more.list")
        }
    }
}
