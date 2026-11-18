import SwiftUI
import UserNotifications

// MARK: - The welcome tour: Skip walks her through every menu

struct TourStep {
    let tab: String?          // which tab to light up in the mock bar
    let plus: Bool
    let art: String           // Skip pose
    let title: String
    let line: String
    let icon: String          // big picture on the card
    let action: String?       // setup button label
}

struct TourView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    var onFinish: () -> Void

    @State private var step = 0
    @State private var bounce = false
    @State private var name = ""
    @State private var done: Set<Int> = []

    private let steps: [TourStep] = [
        TourStep(tab: nil, plus: false, art: "SkipFront", title: "Hi, I am Skip",
                 line: "A one minute tour, then your day is ready. Tap Next, or skip me any time.", icon: "hand.wave.fill", action: nil),
        TourStep(tab: nil, plus: false, art: "SkipPoint", title: "What should I call you?",
                 line: "Just a first name.", icon: "person.fill", action: "name"),
        TourStep(tab: "today", plus: false, art: "SkipPoint", title: "Today",
                 line: "Your day in one calm place. One next step, big, with a Start button and a timer room.", icon: "sun.max.fill", action: nil),
        TourStep(tab: "goals", plus: false, art: "SkipPoint", title: "Goals",
                 line: "Say a big goal. I cut it into small steps you can finish.", icon: "target", action: nil),
        TourStep(tab: "calendar", plus: false, art: "SkipPoint", title: "Calendar",
                 line: "Day, week, month, year or a simple list. Your other calendars show here too.", icon: "calendar", action: nil),
        TourStep(tab: "habits", plus: false, art: "SkipCelebrate", title: "Habits and streaks",
                 line: "Do it again and again. Keep the flame alive. Rest days are forgiven.", icon: "flame.fill", action: nil),
        TourStep(tab: "talk", plus: false, art: "SkipPoint", title: "Talk to me",
                 line: "Say it, type it, or snap a photo of messy notes. I turn it into tasks.", icon: "mic.fill", action: nil),
        TourStep(tab: nil, plus: true, art: "SkipPoint", title: "The big plus",
                 line: "Add a task, goal, habit or to-do. One small step at a time.", icon: "plus", action: nil),
        TourStep(tab: "more", plus: false, art: "SkipPoint", title: "More",
                 line: "Settings, progress, rewards, kindness and your calendars live here.", icon: "ellipsis.circle.fill", action: nil),
        TourStep(tab: "calendar", plus: false, art: "SkipFront", title: "Bring your calendars in",
                 line: "iCloud, Google, Outlook, Exchange. I read them all and never change them.", icon: "calendar.badge.plus", action: "Connect my calendars"),
        TourStep(tab: nil, plus: false, art: "SkipFront", title: "Gentle nudges",
                 line: "A little buzz before each task, at the right time.", icon: "bell.badge.fill", action: "Turn on nudges"),
        TourStep(tab: "today", plus: false, art: "SkipRest", title: "Every morning, one tap",
                 line: "Tell me if it is a Great, Ok or Bad day. I shrink or grow your list to fit.", icon: "face.smiling", action: nil),
        TourStep(tab: nil, plus: false, art: "SkipCelebrate", title: "You are all set",
                 line: "Your first win is waiting on Today.", icon: "party.popper.fill", action: nil)
    ]

    private var s: TourStep { steps[step] }
    private var last: Bool { step == steps.count - 1 }

    var body: some View {
        ZStack {
            ThemedBackground()
            VStack(spacing: 16) {
                topBar
                Spacer(minLength: 0)
                Image(s.art).resizable().scaledToFit()
                    .frame(width: 170, height: 170)
                    .offset(y: bounce ? -8 : 6)
                    .animation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: bounce)
                    .accessibilityHidden(true)
                card
                Spacer(minLength: 0)
                miniBar
                buttons
            }
            .padding(.horizontal, 22).padding(.bottom, 14)
        }
        .onAppear { bounce = true; name = session.state?.profileName ?? "" }
        .accessibilityIdentifier("tour.screen")
    }

    private var topBar: some View {
        HStack {
            HStack(spacing: 6) {
                ForEach(0..<steps.count, id: \.self) { i in
                    Capsule().fill(i <= step ? PaceColor.stillWater : PaceColor.waterLight.opacity(0.5))
                        .frame(width: i == step ? 22 : 8, height: 8)
                }
            }
            .animation(.spring(), value: step)
            Spacer()
            if !last {
                Button { onFinish() } label: {
                    HStack(spacing: 6) {
                        Image("SkipFront").resizable().scaledToFit().frame(width: 26, height: 26)
                        Text("Skip").font(.paceBody(15)).fontWeight(.semibold)
                    }
                    .padding(.horizontal, 12).frame(minHeight: 44)
                    .background(PaceColor.white)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(PaceColor.waterMid, lineWidth: 1))
                    .foregroundStyle(PaceColor.waterDeep)
                }
                .accessibilityIdentifier("tour.skip")
            }
        }
        .padding(.top, 8)
    }

    private var card: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle().fill(LinearGradient.paceHero).frame(width: 64, height: 64)
                Image(systemName: s.icon).font(.system(size: 28)).foregroundStyle(PaceColor.white)
            }
            Text(s.title).font(.paceHeading(26)).fontWeight(.semibold)
                .foregroundStyle(PaceColor.pine).multilineTextAlignment(.center)
                .accessibilityIdentifier("tour.title")
            Text(s.line).font(.paceBody(16)).foregroundStyle(PaceColor.softInk)
                .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            if s.action == "name" {
                TextField("Your name", text: $name)
                    .font(.paceBody(18)).foregroundStyle(PaceColor.pine).multilineTextAlignment(.center)
                    .padding(12).background(PaceColor.porcelain)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .accessibilityIdentifier("tour.name")
            } else if let a = s.action {
                Button { Task { await act() } } label: {
                    Text(done.contains(step) ? "Done" : a).font(.paceBody(16)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.white)
                        .padding(.horizontal, 22).padding(.vertical, 12)
                        .background(done.contains(step) ? AnyShapeStyle(PaceColor.waterMid) : AnyShapeStyle(LinearGradient.paceHero))
                        .clipShape(Capsule())
                }
                .accessibilityIdentifier("tour.action")
            }
        }
        .padding(20).frame(maxWidth: .infinity)
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).stroke(PaceColor.waterLight, lineWidth: 1))
        .id(step)
        .transition(.opacity)
    }

    /// A tiny copy of the bottom bar with the menu being explained lit up.
    private var miniBar: some View {
        let items: [(String, String, String)] = [
            ("today", "sun.max.fill", "Today"), ("goals", "target", "Goals"),
            ("calendar", "calendar", "Calendar"), ("habits", "flame.fill", "Habits"),
            ("talk", "bubble.left.fill", "Talk"), ("more", "ellipsis.circle.fill", "More")]
        return VStack(spacing: 6) {
            if s.plus {
                Image(systemName: "plus.circle.fill").font(.system(size: 44)).foregroundStyle(PaceColor.stillWater)
                    .scaleEffect(bounce ? 1.12 : 0.96)
                    .animation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true), value: bounce)
            }
            HStack {
                ForEach(items, id: \.0) { it in
                    let on = s.tab == it.0
                    VStack(spacing: 2) {
                        Image(systemName: it.1).font(.system(size: on ? 22 : 18))
                        Text(it.2).font(.paceBody(10))
                    }
                    .foregroundStyle(on ? PaceColor.white : PaceColor.softInk)
                    .frame(maxWidth: .infinity).padding(.vertical, 6)
                    .background(on ? PaceColor.stillWater : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .scaleEffect(on ? 1.08 : 1)
                }
            }
            .padding(6).background(PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(PaceColor.waterLight, lineWidth: 1))
            .animation(.spring(), value: step)
        }
        .accessibilityHidden(true)
    }

    private var buttons: some View {
        HStack(spacing: 12) {
            if step > 0 {
                Button("Back") { withAnimation { step -= 1 } }
                    .font(.paceBody(16)).fontWeight(.semibold)
                    .foregroundStyle(PaceColor.waterDeep).frame(minHeight: 48).padding(.horizontal, 10)
                    .accessibilityIdentifier("tour.back")
            }
            Button {
                if s.action == "name" {
                    let n = name.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !n.isEmpty { session.setProfileName(n) }
                }
                if last { onFinish() } else { withAnimation { step += 1 } }
            } label: {
                Text(last ? "Start" : (step == 0 ? "Show me" : "Next"))
                    .font(.paceBody(17)).fontWeight(.semibold).foregroundStyle(PaceColor.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 15)
                    .background(LinearGradient.paceHero)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .accessibilityIdentifier("tour.next")
        }
    }

    private func act() async {
        if s.title.hasPrefix("Bring") {
            await CalendarHub.shared.requestAccess()
            if let t = session.state?.tasks { await EventKitBridge.shared.sync(tasks: t) }
        } else {
            _ = await NotificationScheduler.requestPermission()
            if let st = session.state { await NotificationScheduler.reschedule(state: st) }
        }
        done.insert(step)
    }
}

/// Settings row to see the tour again.
struct TourReplayRow: View {
    @AppStorage("pace.tour.replay") private var replay = 0
    var body: some View {
        Section {
            Button("Show the tour again") { replay += 1 }
                .font(.paceBody(16))
                .accessibilityIdentifier("settings.tour")
        }
    }
}
