import SwiftUI
import PhotosUI
import Vision

// MARK: - Streaks (kind, but real: it matters to lose one)

/// A streak counts days she showed up. One missed day in any
/// seven is forgiven (a rest day), so one slip never wipes
/// the number, and the streak still feels worth protecting.
enum Streak {
    struct Info {
        var current: Int
        var best: Int
        var atRisk: Bool
        var restUsed: Bool
    }

    private static func run(days: [String: Bool], from start: String) -> (count: Int, rest: Bool) {
        var cursor = start
        var count = 0
        var lastRest: Int? = nil
        var restUsed = false
        for i in 0..<800 {
            if days[cursor] == true {
                count += 1
            } else {
                let before = HabitsView.addDays(cursor, -1)
                let free = lastRest == nil || (i - (lastRest ?? 0)) >= 7
                if free && days[before] == true {
                    lastRest = i
                    restUsed = true
                } else {
                    break
                }
            }
            cursor = HabitsView.addDays(cursor, -1)
        }
        return (count, restUsed)
    }

    static func info(days: [String: Bool], today: String) -> Info {
        let start = days[today] == true ? today : HabitsView.addDays(today, -1)
        let now = run(days: days, from: start)
        var best = now.count
        for back in 0..<400 {
            let key = HabitsView.addDays(today, -back)
            if days[key] == true { best = max(best, run(days: days, from: key).count) }
        }
        return Info(current: now.count, best: best,
                    atRisk: days[today] != true && now.count > 0, restUsed: now.rest)
    }

    static let milestones: Set<Int> = [3, 7, 14, 21, 30, 60, 100, 200, 365]
}

struct StreakHero: View {
    let habits: [PaceHabit]
    let today: String

    private var top: (habit: PaceHabit, info: Streak.Info)? {
        habits.map { ($0, Streak.info(days: $0.days, today: today)) }
            .max { $0.1.current < $1.1.current }
    }

    var body: some View {
        if let top {
            HeroCard {
                HStack(spacing: 14) {
                    ZStack {
                        Circle().fill(PaceColor.white.opacity(0.22)).frame(width: 64, height: 64)
                        VStack(spacing: 0) {
                            Image(systemName: "flame.fill")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(PaceColor.white)
                            Text("\(top.info.current)")
                                .font(.paceHeading(24)).fontWeight(.bold)
                                .foregroundStyle(PaceColor.white)
                        }
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text(top.info.current == 0 ? "Start a streak today" : "\(top.info.current)-day streak")
                            .font(.paceHeading(22)).fontWeight(.semibold)
                            .foregroundStyle(PaceColor.white)
                        Text(line(top))
                            .font(.paceBody(13)).foregroundStyle(PaceColor.white)
                    }
                    Spacer(minLength: 0)
                    Image(top.info.atRisk ? "SkipPoint" : "SkipFront")
                        .resizable().scaledToFit().frame(width: 58, height: 58)
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("habits.streak")
        }
    }

    private func line(_ t: (habit: PaceHabit, info: Streak.Info)) -> String {
        if t.info.atRisk {
            return "Tick \(t.habit.name) today to keep it. Best: \(t.info.best)."
        }
        if t.info.current == 0 { return "One tick today begins it." }
        return "Best: \(t.info.best). One rest day a week is forgiven."
    }
}

// MARK: - Notes: photo and messy-note reading, on device

enum NoteScanner {
    static func read(_ image: UIImage) async -> String {
        guard let cg = image.cgImage else { return "" }
        return await Task.detached(priority: .userInitiated) { () -> String in
            let req = VNRecognizeTextRequest()
            req.recognitionLevel = .accurate
            req.usesLanguageCorrection = true
            let handler = VNImageRequestHandler(cgImage: cg)
            try? handler.perform([req])
            let lines = (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }
            return lines.joined(separator: "\n")
        }.value
    }
}

/// Messy notes in, one thing per line out: bullets, numbers,
/// dashes and stray marks are stripped; empty bits dropped.
enum MessyNotes {
    static func clean(_ raw: String) -> String {
        var out: [String] = []
        for line in raw.components(separatedBy: .newlines) {
            var s = line.trimmingCharacters(in: .whitespaces)
            while let f = s.first, "-•*·–—>[]☐□".contains(f) || f == " " { s.removeFirst() }
            if let r = s.range(of: #"^\d{1,2}[\.\)]\s+"#, options: .regularExpression) { s.removeSubrange(r) }
            s = s.trimmingCharacters(in: .whitespaces)
            if s.count >= 3 { out.append(s) }
        }
        return out.joined(separator: "\n")
    }
}

struct CameraPicker: UIViewControllerRepresentable {
    var onImage: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let p = UIImagePickerController()
        p.sourceType = .camera
        p.delegate = context.coordinator
        return p
    }
    func updateUIViewController(_ vc: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> Coord { Coord(self) }
    final class Coord: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ p: CameraPicker) { parent = p }
        func imagePickerController(_ picker: UIImagePickerController,
                                   didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let img = info[.originalImage] as? UIImage { parent.onImage(img) }
            parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}

// MARK: - Step by step wizard pieces

struct WizardChip: View {
    let label: String
    let on: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.paceBody(15)).fontWeight(.semibold)
                .foregroundStyle(on ? PaceColor.white : PaceColor.pine)
                .padding(.horizontal, 16).padding(.vertical, 11)
                .frame(minHeight: 44)
                .background(on ? PaceColor.stillWater : PaceColor.white)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(PaceColor.waterMid, lineWidth: on ? 0 : 1))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

struct WizardDots: View {
    let step: Int
    let total: Int
    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<total, id: \.self) { i in
                Capsule()
                    .fill(i <= step ? PaceColor.stillWater : PaceColor.waterLight.opacity(0.5))
                    .frame(width: i == step ? 26 : 10, height: 8)
            }
        }
        .accessibilityHidden(true)
    }
}

struct WizardShell<Content: View>: View {
    let step: Int
    let total: Int
    let prompt: String
    let nextTitle: String
    var canNext: Bool = true
    let back: () -> Void
    let next: () -> Void
    @ViewBuilder var content: () -> Content

    @EnvironmentObject private var theme: ThemeStore

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            WizardDots(step: step, total: total)
            HStack(spacing: 12) {
                Image("SkipPoint").resizable().scaledToFit().frame(width: 62, height: 62)
                Text(prompt)
                    .font(.paceHeading(22)).fontWeight(.semibold)
                    .foregroundStyle(theme.inkOnBackground)
                    .accessibilityIdentifier("wizard.prompt")
            }
            ScrollView {
                VStack(alignment: .leading, spacing: 16) { content() }
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            HStack(spacing: 12) {
                if step > 0 {
                    Button("Back", action: back)
                        .font(.paceBody(16)).fontWeight(.semibold)
                        .foregroundStyle(theme.accentOnBackground)
                        .frame(minHeight: 48).padding(.horizontal, 10)
                        .accessibilityIdentifier("wizard.back")
                }
                Button(action: next) {
                    Text(nextTitle)
                        .font(.paceBody(17)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 15)
                        .background(canNext ? AnyShapeStyle(LinearGradient.paceHero) : AnyShapeStyle(PaceColor.waterMid))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(!canNext)
                .accessibilityIdentifier("wizard.next")
            }
        }
        .padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 10)
        .background(ThemedBackground())
    }
}

enum WizardLook {
    static let colours = ["#5B6BD5", "#4858C4", "#8E7CC3", "#6B5BB0", "#35704E", "#2F8F83", "#3F536E", "#21392E", "#7A8699", "#D9534F", "#E07A5F", "#F2A541", "#E9C46A", "#8AB17D", "#2A9D8F", "#4CC9F0", "#4361EE", "#B5179E", "#F28DB2", "#8D6E63"]
    static var icons: [String] { IconBank.all }
    static func color(_ hex: String) -> Color {
        if hex.hasPrefix("#"), hex.count == 7, let v = UInt32(hex.dropFirst(), radix: 16) { return Color(hex: v) }
        return PaceColor.stillWater
    }
}

struct LookPicker: View {
    @Binding var colorHex: String
    @Binding var icon: String
    var hint: String = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Colour").font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase)
                .foregroundStyle(PaceColor.waterDeep)
            ColourRow(colorHex: $colorHex)
            Text("Icon: tap one, tap again to remove").font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase)
                .foregroundStyle(PaceColor.waterDeep)
            IconGrid(icon: $icon, colorHex: colorHex, suggestions: IconBank.suggest(for: hint))
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("wizard.look")
    }
}

// MARK: - Add a task, one small step at a time

struct TaskWizard: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var extras: ExtrasStore
    @Environment(\.dismiss) private var dismiss
    @StateObject private var voice = VoiceBox()

    @State private var step = 0
    @State private var text = ""
    @State private var title = ""
    @State private var category = "other"
    @State private var dayChoice = 0
    @State private var pickedDate = Date()
    @State private var timeChoice = 0
    @State private var pickedTime = Date()
    @State private var minutes = 25
    @State private var cantMove = false
    @State private var remind = -1
    @State private var colorHex = "#5B6BD5"
    @State private var icon = ""
    @State private var photo: PhotosPickerItem? = nil
    @State private var showCamera = false

    private let total = 6

    private var dayKey: String {
        switch dayChoice {
        case 0: return PaceState.todayString
        case 1: return HabitsView.addDays(PaceState.todayString, 1)
        default: return PaceState.dayKey(for: pickedDate)
        }
    }
    private var timeString: String? {
        switch timeChoice {
        case 1: return "09:00"
        case 2: return "14:00"
        case 3: return "18:00"
        case 4:
            let c = Calendar.current.dateComponents([.hour, .minute], from: pickedTime)
            return String(format: "%02d:%02d", c.hour ?? 9, c.minute ?? 0)
        default: return nil
        }
    }
    private var prompts: [String] {
        ["What is it? Say it plainly.", "When?", "How long?", "Want a nudge?", "Pick a look.", "Ready?"]
    }

    var body: some View {
        WizardShell(step: step, total: total, prompt: prompts[step],
                    nextTitle: step == total - 1 ? "Add it" : "Next",
                    canNext: step != 0 || !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                    back: { withAnimation { step -= 1 } },
                    next: advance) {
            switch step {
            case 0: sayIt
            case 1: whenStep
            case 2: lengthStep
            case 3: remindStep
            case 4: LookPicker(colorHex: $colorHex, icon: $icon)
            default: review
            }
        }
        .navigationTitle("New task")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showCamera) {
            CameraPicker { img in
                Task { text += (text.isEmpty ? "" : "\n") + MessyNotes.clean(await NoteScanner.read(img)) }
            }
        }
        .onChange(of: photo) { _, item in
            guard let item else { return }
            Task {
                if let d = try? await item.loadTransferable(type: Data.self), let img = UIImage(data: d) {
                    let read = MessyNotes.clean(await NoteScanner.read(img))
                    text += (text.isEmpty ? "" : "\n") + read
                }
                photo = nil
            }
        }
    }

    private var sayIt: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Say it plainly", text: $text, axis: .vertical)
                .font(.paceBody(18)).foregroundStyle(PaceColor.pine)
                .lineLimit(2...5)
                .padding(14).background(PaceColor.white)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
                .accessibilityIdentifier("wizard.text")
            Text("Like: call the dentist tomorrow at 3pm for 20 minutes")
                .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
            HStack(spacing: 12) {
                Button { voice.toggle { heard in text = heard } } label: {
                    Image(systemName: voice.listening ? "mic.fill" : "mic").font(.system(size: 20))
                        .foregroundStyle(PaceColor.waterDeep).frame(width: 52, height: 52)
                        .background(PaceColor.white).clipShape(Circle())
                        .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
                }
                .buttonStyle(.plain).accessibilityLabel("Speak").accessibilityIdentifier("wizard.mic")
                PhotosPicker(selection: $photo, matching: .images) {
                    Image(systemName: "photo").font(.system(size: 20))
                        .foregroundStyle(PaceColor.waterDeep).frame(width: 52, height: 52)
                        .background(PaceColor.white).clipShape(Circle())
                        .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
                }
                .accessibilityLabel("Read a photo of notes").accessibilityIdentifier("wizard.photo")
                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    Button { showCamera = true } label: {
                        Image(systemName: "camera").font(.system(size: 20))
                            .foregroundStyle(PaceColor.waterDeep).frame(width: 52, height: 52)
                            .background(PaceColor.white).clipShape(Circle())
                            .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
                    }
                    .buttonStyle(.plain).accessibilityLabel("Scan notes")
                }
                Spacer(minLength: 0)
            }
            if let p = QuickParse.parse(text, baseKey: PaceState.todayString) {
                HStack(spacing: 8) {
                    CountPill(text: p.date)
                    if let t = p.time { CountPill(text: t) }
                    CountPill(text: "\(p.durationMin) min")
                }
                .accessibilityIdentifier("wizard.read")
            }
        }
    }

    private var whenStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Day").font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase).foregroundStyle(PaceColor.waterDeep)
            HStack(spacing: 8) {
                WizardChip(label: "Today", on: dayChoice == 0) { dayChoice = 0 }
                WizardChip(label: "Tomorrow", on: dayChoice == 1) { dayChoice = 1 }
                WizardChip(label: "Pick a day", on: dayChoice == 2) { dayChoice = 2 }
            }
            if dayChoice == 2 {
                DatePicker("Day", selection: $pickedDate, displayedComponents: .date)
                    .datePickerStyle(.graphical).tint(PaceColor.stillWater)
            }
            Text("Time").font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase).foregroundStyle(PaceColor.waterDeep)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], alignment: .leading, spacing: 8) {
                WizardChip(label: "No time", on: timeChoice == 0) { timeChoice = 0 }
                WizardChip(label: "Morning", on: timeChoice == 1) { timeChoice = 1 }
                WizardChip(label: "Afternoon", on: timeChoice == 2) { timeChoice = 2 }
                WizardChip(label: "Evening", on: timeChoice == 3) { timeChoice = 3 }
                WizardChip(label: "Pick a time", on: timeChoice == 4) { timeChoice = 4 }
            }
            if timeChoice == 4 {
                DatePicker("Time", selection: $pickedTime, displayedComponents: .hourAndMinute)
                    .datePickerStyle(.wheel).labelsHidden()
            }
        }
    }

    private var lengthStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 8)], alignment: .leading, spacing: 8) {
                ForEach([5, 15, 25, 45, 60, 90], id: \.self) { m in
                    WizardChip(label: "\(m) min", on: minutes == m) { minutes = m }
                }
            }
            Toggle("Can't move", isOn: $cantMove)
                .font(.paceBody(16)).tint(PaceColor.stillWater)
                .padding(14).background(PaceColor.white)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            Text(cantMove ? "Pace keeps it exactly where it is on every day." : "Pace may shrink or move it on a hard day.")
                .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
        }
    }

    private var remindStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], alignment: .leading, spacing: 8) {
                WizardChip(label: "No nudge", on: remind == -1) { remind = -1 }
                WizardChip(label: "At the time", on: remind == 0) { remind = 0 }
                WizardChip(label: "10 min before", on: remind == 10) { remind = 10 }
                WizardChip(label: "30 min before", on: remind == 30) { remind = 30 }
                WizardChip(label: "1 hour before", on: remind == 60) { remind = 60 }
            }
            if timeString == nil && remind >= 0 {
                Text("A nudge needs a time. Go Back and pick one.")
                    .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
            }
        }
    }

    private var review: some View {
        PaceCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    Image(systemName: icon.isEmpty ? "circle.dashed" : icon).font(.system(size: 22)).foregroundStyle(PaceColor.white)
                        .frame(width: 46, height: 46).background(WizardLook.color(colorHex))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    Text(finalTitle).font(.paceHeading(19)).fontWeight(.semibold).foregroundStyle(PaceColor.pine)
                }
                HStack(spacing: 8) {
                    CountPill(text: dayKey)
                    if let t = timeString { CountPill(text: t) }
                    CountPill(text: "\(minutes) min")
                    if cantMove { CountPill(text: "Can't move") }
                }
                if remind >= 0, timeString != nil {
                    Text(remind == 0 ? "Nudge at the time" : "Nudge \(remind) min before")
                        .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                }
            }
        }
        .accessibilityIdentifier("wizard.review")
    }

    private var finalTitle: String {
        QuickParse.parse(text, baseKey: PaceState.todayString)?.title
            ?? text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func advance() {
        if step == 0 {
            if let p = QuickParse.parse(text, baseKey: PaceState.todayString) {
                category = p.category
                colorHex = p.color
                cantMove = p.essential
                minutes = p.durationMin
                if p.date == PaceState.todayString { dayChoice = 0 }
                else if p.date == HabitsView.addDays(PaceState.todayString, 1) { dayChoice = 1 }
                else if let d = PaceState.date(fromKey: p.date) { pickedDate = d; dayChoice = 2 }
                if let t = p.time {
                    let parts = t.split(separator: ":").compactMap { Int($0) }
                    if parts.count == 2,
                       let d = Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: Date()) {
                        pickedTime = d; timeChoice = 4
                    }
                }
            }
            withAnimation { step = 1 }
        } else if step < total - 1 {
            withAnimation { step += 1 }
        } else {
            save()
        }
    }

    private func save() {
        var task = PaceTaskFactory.make(title: finalTitle, date: dayKey, time: timeString,
                                        durationMin: RealTime.padded(minutes),
                                        category: category, color: colorHex, source: "wizard")
        task["icon"] = icon
        task["essential"] = cantMove
        task["originalText"] = text
        if remind >= 0, timeString != nil { task["remind"] = [Double(remind)] }
        session.addTask(task)
        extras.celebrate()
        PlusClose.fire()
        dismiss()
    }
}

// MARK: - Add a goal, one small step at a time

struct GoalWizard: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var extras: ExtrasStore
    @Environment(\.dismiss) private var dismiss
    @StateObject private var voice = VoiceBox()

    @State private var step = 0
    @State private var title = ""
    @State private var why = ""
    @State private var weeks = 8
    @State private var pace = "daily"
    @State private var mins = 20
    @State private var category = "personal"

    private let total = 6
    private let cats: [(String, String)] = [("personal", "Personal"), ("school", "School"), ("work", "Work"),
                                            ("health", "Health"), ("money", "Money"), ("home", "Home"), ("other", "Other")]

    private var endKey: String { HabitsView.addDays(PaceState.todayString, weeks * 7) }
    private var prompts: [String] {
        ["What do you want to reach?", "Why does it matter?", "By when?", "How often?", "What kind of goal?", "Ready?"]
    }
    private var stepCount: Int {
        GoalPlanner.buildPlan(title: title, category: category, start: PaceState.todayString,
                              end: endKey, pace: pace, mins: mins).count
    }

    var body: some View {
        WizardShell(step: step, total: total, prompt: prompts[step],
                    nextTitle: step == total - 1 ? "Make my plan" : "Next",
                    canNext: step != 0 || !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                    back: { withAnimation { step -= 1 } },
                    next: advance) {
            switch step {
            case 0:
                TextField("Say it plainly", text: $title, axis: .vertical)
                    .font(.paceBody(18)).foregroundStyle(PaceColor.pine).lineLimit(2...4)
                    .padding(14).background(PaceColor.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
                    .accessibilityIdentifier("wizard.goalTitle")
                Button { voice.toggle { heard in title = heard } } label: {
                    Image(systemName: voice.listening ? "mic.fill" : "mic").font(.system(size: 20))
                        .foregroundStyle(PaceColor.waterDeep).frame(width: 52, height: 52)
                        .background(PaceColor.white).clipShape(Circle())
                        .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
                }
                .buttonStyle(.plain).accessibilityLabel("Speak")
            case 1:
                TextField("Optional: your why", text: $why, axis: .vertical)
                    .font(.paceBody(17)).foregroundStyle(PaceColor.pine).lineLimit(2...4)
                    .padding(14).background(PaceColor.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
                    .accessibilityIdentifier("wizard.why")
                Text("Pace shows it to you on hard days.").font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
            case 2:
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], alignment: .leading, spacing: 8) {
                    ForEach([(2, "2 weeks"), (4, "1 month"), (8, "2 months"), (13, "3 months"), (26, "6 months")], id: \.0) { w, l in
                        WizardChip(label: l, on: weeks == w) { weeks = w }
                    }
                }
            case 3:
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], alignment: .leading, spacing: 8) {
                    WizardChip(label: "Every day", on: pace == "daily") { pace = "daily" }
                    WizardChip(label: "Weekdays", on: pace == "weekdays") { pace = "weekdays" }
                    WizardChip(label: "Mon Wed Fri", on: pace == "three") { pace = "three" }
                }
                Text("Minutes a day").font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase)
                    .foregroundStyle(PaceColor.waterDeep)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 8)], alignment: .leading, spacing: 8) {
                    ForEach([10, 15, 20, 25, 30, 45], id: \.self) { m in
                        WizardChip(label: "\(m) min", on: mins == m) { mins = m }
                    }
                }
            case 4:
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], alignment: .leading, spacing: 8) {
                    ForEach(cats, id: \.0) { id, label in
                        WizardChip(label: label, on: category == id) { category = id }
                    }
                }
            default:
                PaceCard {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 12) {
                            Image(systemName: GoalsView.symbol(for: category)).font(.system(size: 22))
                                .foregroundStyle(PaceColor.white).frame(width: 46, height: 46)
                                .background(WizardLook.color(GoalsView.categoryColours[category] ?? "#5B6BD5"))
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            Text(title).font(.paceHeading(19)).fontWeight(.semibold).foregroundStyle(PaceColor.pine)
                        }
                        Text("Pace will cut it into \(stepCount) small steps.")
                            .font(.paceBody(15)).foregroundStyle(PaceColor.pine)
                        Text("About \(mins) minutes, \(pace == "daily" ? "every day" : pace == "weekdays" ? "on weekdays" : "Mon Wed Fri"), done in \(weeks) weeks.")
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    }
                }
                .accessibilityIdentifier("wizard.goalReview")
            }
        }
        .navigationTitle("New goal")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func advance() {
        if step == 0 { category = QuickParse.categoryFor(title).id == "other" ? category : mapCat(QuickParse.categoryFor(title).id) }
        if step < total - 1 {
            withAnimation { step += 1 }
        } else {
            let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
            session.addGoal(title: t, end: endKey, pace: pace, mins: mins, category: category)
            extras.celebrate()
            PlusClose.fire()
            dismiss()
        }
    }

    private func mapCat(_ id: String) -> String {
        cats.contains { $0.0 == id } ? id : category
    }
}

// MARK: - The plus: choose what to add, then go step by step

struct PlusChooser: View {
    @EnvironmentObject private var theme: ThemeStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 12) {
                        Image("SkipFront").resizable().scaledToFit().frame(width: 64, height: 64)
                        Text("What would you like to add?")
                            .font(.paceHeading(22)).fontWeight(.semibold)
                            .foregroundStyle(theme.inkOnBackground)
                    }
                    tile("checkmark.circle.fill", "A task", "Say it in one sentence", "plus.task") { TaskSentenceView() }
                    tile("target", "A goal", "Pace cuts it into small steps", "plus.goal") { GoalSentenceView() }
                    tile("leaf.fill", "A habit", "Something you do again and again", "plus.habit") { HabitWizard() }
                    tile("mic.fill", "Talk to Skip", "Say it, type it, or read notes", "plus.talk") { TalkView() }
                    tile("checklist", "A to-do", "Just one line", "plus.todo") { QuickTodoView() }
                    tile("list.bullet.rectangle", "Quick form", "Everything on one page", "plus.form") {
                        AddEventView(dayKey: PaceState.todayString)
                    }
                }
                .padding(20)
            }
            .accessibilityIdentifier("plus.chooser")
            .onReceive(NotificationCenter.default.publisher(for: PlusClose.name)) { _ in dismiss() }
            .background(ThemedBackground())
            .navigationTitle("Add")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() }.accessibilityIdentifier("plus.close") }
            }
        }
    }

    private func tile<D: View>(_ icon: String, _ title: String, _ sub: String, _ id: String,
                               @ViewBuilder dest: @escaping () -> D) -> some View {
        NavigationLink { dest() } label: {
            HStack(spacing: 14) {
                Image(systemName: icon.isEmpty ? "circle.dashed" : icon).font(.system(size: 22)).foregroundStyle(PaceColor.white)
                    .frame(width: 50, height: 50).background(LinearGradient.paceHero)
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.paceHeading(18)).fontWeight(.semibold).foregroundStyle(PaceColor.pine)
                    Text(sub).font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").foregroundStyle(PaceColor.waterMid)
            }
            .padding(14).background(PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(id)
    }
}

/// A habit in two small steps: its name, then its rule.
struct HabitWizard: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var extras: ExtrasStore
    @Environment(\.dismiss) private var dismiss
    @State private var step = 0
    @FocusState private var fieldFocus: Bool
    @State private var name = ""
    @State private var icon = ""
    @State private var colorHex = "#5B6BD5"
    @State private var cat: String? = nil
    @State private var freq = "daily"
    @State private var wdays: Set<Int> = [2, 3, 4, 5, 6]
    @State private var perDay = 2
    @State private var remind = true
    @State private var times: [Date] = [HabitWizard.at(9, 0)]

    static func at(_ h: Int, _ m: Int) -> Date {
        Calendar.current.date(bySettingHour: h, minute: m, second: 0, of: Date()) ?? Date()
    }
    private var cleanName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var shownIcon: String { icon.isEmpty ? (IconBank.best(for: cleanName) ?? "star.fill") : icon }
    private var timeCount: Int { freq == "perday" ? perDay : 1 }
    private var prompts = ["What will you do?", "How often?", "When should Pace remind you?", "Make it yours.", "Ready?"]
    private var shownTimes: [Date] {
        (0..<timeCount).map { i in i < times.count ? times[i] : HabitWizard.at(min(9 + i * 4, 21), 0) }
    }

    var body: some View {
        WizardShell(step: step, total: 5,
                    prompt: prompts[step],
                    nextTitle: step == 4 ? "Start the streak" : "Next",
                    canNext: step != 0 || !cleanName.isEmpty,
                    back: { step -= 1 },
                    next: {
                        if step < 4 { withAnimation { step += 1 } } else { save() }
                    }) {
            switch step {
            case 0:
                VStack(alignment: .leading, spacing: 12) {
                    TextField("Like: drink water", text: $name)
                        .font(.paceBody(18)).foregroundStyle(PaceColor.pine)
                        .focused($fieldFocus)
                        .padding(14).background(PaceColor.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
                        .contentShape(Rectangle()).onTapGesture { fieldFocus = true }
                        .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { fieldFocus = true } }
                        .accessibilityIdentifier("wizard.habitName")
                    HStack(spacing: 10) {
                        Image(systemName: shownIcon).font(.system(size: 20)).foregroundStyle(PaceColor.white)
                            .frame(width: 42, height: 42).background(WizardLook.color(colorHex))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        Text("Pace picks an icon from your words. You can change it.")
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    }
                }
            case 1:
                VStack(alignment: .leading, spacing: 14) {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 8)], alignment: .leading, spacing: 8) {
                        WizardChip(label: "Every day", on: freq == "daily") { freq = "daily" }
                        WizardChip(label: "Certain days", on: freq == "pick") { freq = "pick" }
                        WizardChip(label: "Many times a day", on: freq == "perday") { freq = "perday" }
                        WizardChip(label: "Once a week", on: freq == "weekly") { freq = "weekly" }
                    }
                    .accessibilityIdentifier("habit.freq")
                    if freq == "pick" || freq == "weekly" {
                        Text(freq == "pick" ? "Which days?" : "Which day?").font(.paceBody(13)).fontWeight(.bold)
                            .textCase(.uppercase).foregroundStyle(PaceColor.waterDeep)
                        HStack(spacing: 6) {
                            ForEach(Array(["S", "M", "T", "W", "T", "F", "S"].enumerated()), id: \.offset) { i, l in
                                let d = i + 1
                                let on = wdays.contains(d)
                                Button {
                                    if freq == "weekly" { wdays = [d] }
                                    else if on { if wdays.count > 1 { wdays.remove(d) } } else { wdays.insert(d) }
                                } label: {
                                    Text(l).font(.paceBody(15)).fontWeight(.bold)
                                        .foregroundStyle(on ? PaceColor.white : PaceColor.stillWater)
                                        .frame(maxWidth: .infinity).frame(height: 44)
                                        .background(on ? PaceColor.stillWater : PaceColor.white)
                                        .clipShape(Circle())
                                        .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: on ? 0 : 1))
                                }
                                .buttonStyle(.plain).accessibilityIdentifier("habit.day.\(d)")
                            }
                        }
                    }
                    if freq == "perday" {
                        Stepper("\(perDay) times a day", value: $perDay, in: 2...8)
                            .font(.paceBody(17)).foregroundStyle(PaceColor.pine)
                            .padding(12).background(PaceColor.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .accessibilityIdentifier("habit.perDay")
                    }
                }
            case 2:
                VStack(alignment: .leading, spacing: 12) {
                    Toggle("Remind me", isOn: $remind).font(.paceBody(17)).foregroundStyle(PaceColor.pine)
                        .tint(PaceColor.stillWater)
                        .padding(12).background(PaceColor.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .accessibilityIdentifier("habit.remind")
                    if remind {
                        ForEach(0..<timeCount, id: \.self) { i in
                            DatePicker(timeCount > 1 ? "Time \(i + 1)" : "Time",
                                       selection: Binding(get: { shownTimes[i] },
                                                          set: { v in
                                                              var t = shownTimes; t[i] = v; times = t }),
                                       displayedComponents: .hourAndMinute)
                                .font(.paceBody(17)).foregroundStyle(PaceColor.pine)
                                .padding(12).background(PaceColor.white)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .accessibilityIdentifier("habit.time.\(i)")
                        }
                    }
                }
            case 3:
                VStack(alignment: .leading, spacing: 16) {
                    KindPicker(title: "Which category?", selection: Binding(get: { cat }, set: { v in
                        cat = v
                        if colorHex == "#5B6BD5", let v, let k = CategoryStore.find(v) { colorHex = k.colour }
                    }), idPrefix: "habit")
                    LookPicker(colorHex: $colorHex, icon: $icon, hint: cleanName)
                }
            default:
                PaceCard {
                    HStack(spacing: 12) {
                        Image(systemName: shownIcon).font(.system(size: 22)).foregroundStyle(PaceColor.white)
                            .frame(width: 46, height: 46).background(WizardLook.color(colorHex))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(cleanName).font(.paceHeading(19)).fontWeight(.semibold).foregroundStyle(PaceColor.pine)
                            Text(summary).font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                        }
                    }
                }
            }
        }
        .navigationTitle("New habit")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var summary: String {
        var h = PaceHabit(id: "", name: "", freq: freq, wdays: Array(wdays), perDay: perDay)
        h.times = []
        var s = h.freqLabel
        if remind { s += ", at " + shownTimes.map(Self.hhmm).joined(separator: ", ") }
        return s
    }
    static func hhmm(_ d: Date) -> String {
        let c = Calendar.current.dateComponents([.hour, .minute], from: d)
        return String(format: "%02d:%02d", c.hour ?? 9, c.minute ?? 0)
    }

    private func save() {
        var extra: [String: Any] = ["icon": shownIcon, "color": colorHex, "freq": freq,
                                    "perDay": freq == "perday" ? perDay : 1,
                                    "remind": remind, "times": shownTimes.map(Self.hhmm)]
        if freq == "pick" || freq == "weekly" { extra["wdays"] = wdays.sorted() }
        if let cat { extra["cat"] = cat }
        session.addHabit(name: cleanName, extra: extra)
        extras.celebrate()
        PlusClose.fire()
        dismiss()
    }
}


/// A wizard that finishes closes the whole plus sheet, not just its own page.
enum PlusClose {
    static let name = Notification.Name("pace.plus.close")
    static func fire() { NotificationCenter.default.post(name: name, object: nil) }
}
