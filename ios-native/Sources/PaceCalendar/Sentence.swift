import SwiftUI
import PhotosUI

// MARK: - Add a task, the way it was: one sentence, Pace reads it

/// OLD STYLE (handout): one sentence box, a live "Pace read it"
/// preview, and "Or fill in the details" for people who want
/// every field. Colour, icon and a nudge are one optional row.
struct TaskSentenceView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var extras: ExtrasStore
    @EnvironmentObject private var theme: ThemeStore
    @Environment(\.dismiss) private var dismiss
    @StateObject private var voice = VoiceBox()

    var startDay: String = PaceState.todayString

    @State private var text = ""
    @State private var showDetails = false
    @State private var showLook = false
    @State private var title = ""
    @State private var date = Date()
    @State private var hasTime = false
    @State private var time = Date()
    @State private var minutes = 25
    @State private var smallest = ""
    @State private var biggest = ""
    @State private var cantMove = false
    @State private var remind = 0
    @State private var catPick: String? = nil
    @FocusState private var fieldFocus: Bool
    @State private var colorHex = "#5B6BD5"
    @State private var icon = ""
    @State private var photo: PhotosPickerItem? = nil

    private var parsed: QuickParse.Parsed? { QuickParse.parse(text, baseKey: startDay) }
    private var detailTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canAdd: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !detailTitle.isEmpty
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 12) {
                    Text("Say it in one go.")
                        .font(.paceHeading(22)).fontWeight(.semibold)
                        .foregroundStyle(theme.inkOnBackground)
                        .accessibilityIdentifier("wizard.prompt")
                }
                sentenceBox
                voiceRow
                readCard
                kindRow
                detailsCard
                lookRow
                Button(action: save) {
                    Text("Add task")
                        .font(.paceBody(17)).fontWeight(.semibold).foregroundStyle(PaceColor.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 15)
                        .background(canAdd ? AnyShapeStyle(LinearGradient.paceHero) : AnyShapeStyle(PaceColor.waterMid))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain).disabled(!canAdd)
                .accessibilityIdentifier("task.add")
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.immediately)
        .background(ThemedBackground())
        .navigationTitle("New task")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }.accessibilityIdentifier("task.cancel")
            }
        }
        .onAppear {
            date = PaceState.date(fromKey: startDay) ?? Date()
            time = Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: date) ?? date
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

    private var sentenceBox: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("Ring the plumber tomorrow at 9am for 30 minutes", text: $text, axis: .vertical)
                .environment(\.colorScheme, .light)
                .font(.paceBody(18)).foregroundStyle(PaceColor.pine)
                .lineLimit(2...5)
                .focused($fieldFocus)
                .padding(14).background(PaceColor.white)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
                .contentShape(Rectangle()).onTapGesture { fieldFocus = true }
                .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { fieldFocus = true } }
                .accessibilityIdentifier("wizard.text")
            Text("Day, time and length are read from your words.")
                .font(.paceBody(13)).foregroundStyle(theme.secondaryOnBackground)
        }
    }

    private var voiceRow: some View {
        HStack(spacing: 12) {
            roundButton(voice.listening ? "mic.fill" : "mic", id: "wizard.mic", label: "Speak") {
                voice.toggle { heard in text = heard }
            }
            PhotosPicker(selection: $photo, matching: .images) {
                Image(systemName: "photo").font(.system(size: 20))
                    .foregroundStyle(PaceColor.waterDeep).frame(width: 52, height: 52)
                    .background(PaceColor.white).clipShape(Circle())
                    .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
            }
            .accessibilityLabel("Read a photo of notes").accessibilityIdentifier("wizard.photo")
            Spacer(minLength: 0)
        }
    }

    private func roundButton(_ symbol: String, id: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 20))
                .foregroundStyle(PaceColor.waterDeep).frame(width: 52, height: 52)
                .background(PaceColor.white).clipShape(Circle())
                .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
        }
        .buttonStyle(.plain).accessibilityLabel(label).accessibilityIdentifier(id)
    }

    @ViewBuilder private var readCard: some View {
        if let p = parsed {
            PaceCard {
                VStack(alignment: .leading, spacing: 10) {
                    Label("Pace read it like this", systemImage: "sparkles")
                        .font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase)
                        .foregroundStyle(PaceColor.waterDeep)
                    HStack(spacing: 12) {
                        Image(systemName: icon.isEmpty ? (IconBank.best(for: p.title) ?? "checkmark.circle") : icon)
                            .font(.system(size: 22)).foregroundStyle(PaceColor.white)
                            .frame(width: 46, height: 46).background(WizardLook.color(colorHex))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        Text(p.title).font(.paceHeading(19)).fontWeight(.semibold)
                            .foregroundStyle(PaceColor.pine)
                    }
                    HStack(spacing: 8) {
                        CountPill(text: p.date)
                        if let t = p.time { CountPill(text: t) }
                        CountPill(text: "\(p.durationMin) min")
                        if p.essential { CountPill(text: "Can't move") }
                    }
                }
            }
            .transition(.opacity.combined(with: .scale(scale: 0.97)))
            .accessibilityIdentifier("wizard.read")
        }
    }

    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeOut(duration: 0.2)) { showDetails.toggle() }
            } label: {
                HStack {
                    Image(systemName: "slider.horizontal.3").foregroundStyle(PaceColor.waterDeep)
                    Text("Or fill in the details").font(.paceBody(16)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.pine)
                    Spacer()
                    Image(systemName: showDetails ? "chevron.up" : "chevron.down").foregroundStyle(PaceColor.waterMid)
                }
                .padding(14).frame(minHeight: 48)
            }
            .buttonStyle(.plain).accessibilityIdentifier("task.details")
            if showDetails {
                VStack(alignment: .leading, spacing: 12) {
                    field("Title", $title, id: "addEvent.title")
                    DatePicker("Day", selection: $date, displayedComponents: .date)
                        .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                        .accessibilityIdentifier("addEvent.day")
                    Toggle("Time", isOn: $hasTime).font(.paceBody(16)).tint(PaceColor.stillWater)
                        .foregroundStyle(PaceColor.pine).accessibilityIdentifier("addEvent.hasTime")
                    if hasTime {
                        DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
                            .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                            .accessibilityIdentifier("addEvent.time")
                    }
                    Stepper("Minutes: \(minutes)", value: $minutes, in: 5...480, step: 5)
                        .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                        .accessibilityIdentifier("addEvent.length")
                    field("Smallest version (optional)", $smallest, id: "addEvent.smallest")
                    field("Biggest version (optional)", $biggest, id: "addEvent.biggest")
                    Toggle("Must not slip", isOn: $cantMove).font(.paceBody(16)).tint(PaceColor.stillWater)
                        .foregroundStyle(PaceColor.pine).accessibilityIdentifier("addEvent.cantMove")
                }
                .padding(.horizontal, 14).padding(.bottom, 14)
            }
        }
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
    }

    private func field(_ ph: String, _ b: Binding<String>, id: String) -> some View {
        TextField(ph, text: b)
            .environment(\.colorScheme, .light)
            .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
            .padding(12).background(PaceColor.porcelain)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .accessibilityIdentifier(id)
    }

    private var lookRow: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                withAnimation(.easeOut(duration: 0.2)) { showLook.toggle() }
            } label: {
                HStack {
                    Image(systemName: "paintpalette.fill").foregroundStyle(PaceColor.waterDeep)
                    Text("Colour, icon and a nudge (optional)").font(.paceBody(16)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.pine)
                    Spacer()
                    Image(systemName: showLook ? "chevron.up" : "chevron.down").foregroundStyle(PaceColor.waterMid)
                }
                .padding(14).frame(minHeight: 48)
            }
            .buttonStyle(.plain).accessibilityIdentifier("task.look")
            if showLook {
                VStack(alignment: .leading, spacing: 14) {
                    LookPicker(colorHex: $colorHex, icon: $icon, hint: detailTitle.isEmpty ? text : detailTitle)
                    Text("Nudge").font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase)
                        .foregroundStyle(PaceColor.waterDeep)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], alignment: .leading, spacing: 8) {
                        WizardChip(label: "At the time", on: remind == 0) { remind = 0 }
                        WizardChip(label: "10 min before", on: remind == 10) { remind = 10 }
                        WizardChip(label: "1 hour before", on: remind == 60) { remind = 60 }
                    }
                    Text("Pace always nudges you when a task starts.").font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                }
                .padding(.horizontal, 14).padding(.bottom, 14)
            }
        }
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
    }

    private let kinds: [(String, String, String)] = [("health", "Health", "heart.fill"), ("work", "Work", "briefcase.fill"),
        ("school", "School", "book.fill"), ("money", "Money", "banknote.fill"), ("home", "Home", "house.fill"), ("personal", "Personal", "person.fill")]

    private var kindRow: some View {
        KindPicker(title: "What kind of thing is it?", selection: $catPick, idPrefix: "task")
    }

    private func save() {
        var finalTitle = detailTitle
        var day = PaceState.dayKey(for: date)
        var timeString: String? = nil
        var dur = minutes
        var category = "other"
        var essential = cantMove
        var color = colorHex
        if !detailTitle.isEmpty {
            if hasTime {
                let c = Calendar.current.dateComponents([.hour, .minute], from: time)
                timeString = String(format: "%02d:%02d", c.hour ?? 9, c.minute ?? 0)
            }
        } else if let p = parsed {
            finalTitle = p.title; day = p.date; timeString = p.time; dur = p.durationMin
            category = p.category; essential = essential || p.essential
            if colorHex == "#5B6BD5" { color = p.color }
        } else {
            finalTitle = text.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let c = catPick {
            category = c
            if color == "#5B6BD5", let h = GoalsView.categoryColours[c] { color = h }
        }
        guard !finalTitle.isEmpty else { return }
        var task = PaceTaskFactory.make(title: finalTitle, date: day, time: timeString,
                                        durationMin: RealTime.padded(dur),
                                        category: category, color: color, source: "sentence")
        task["icon"] = icon.isEmpty ? (IconBank.best(for: finalTitle) ?? "") : icon
        task["essential"] = essential
        task["originalText"] = text
        let s = smallest.trimmingCharacters(in: .whitespacesAndNewlines)
        let b = biggest.trimmingCharacters(in: .whitespacesAndNewlines)
        if !s.isEmpty { task["minVersion"] = s }
        if !b.isEmpty { task["fullVersion"] = b }
        if remind >= 0, timeString != nil { task["remind"] = [Double(remind)] }
        session.addTask(task)
        extras.celebrate()
        PlusClose.fire()
        dismiss()
    }
}

// MARK: - Add a goal, the same way: one sentence, steps appear

struct GoalSentenceView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var extras: ExtrasStore
    @EnvironmentObject private var theme: ThemeStore
    @Environment(\.dismiss) private var dismiss
    @StateObject private var voice = VoiceBox()

    @State private var title = ""
    @State private var showDetails = false
    @State private var why = ""
    @State private var weeks = 8
    @State private var pace = "daily"
    @State private var mins = 20
    @State private var category = "personal"
    @State private var catTouched = false
    @FocusState private var fieldFocus: Bool
    @State private var goalIcon = ""
    @State private var showIcons = false

    private let kinds: [(String, String, String)] = [("health", "Health", "heart.fill"), ("work", "Work", "briefcase.fill"),
        ("school", "School", "book.fill"), ("money", "Money", "banknote.fill"), ("home", "Home", "house.fill"), ("personal", "Personal", "person.fill")]
    private let cats: [(String, String)] = [("personal", "Personal"), ("school", "School"), ("work", "Work"),
                                            ("health", "Health"), ("money", "Money"), ("home", "Home"), ("other", "Other")]

    private var clean: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var endKey: String { HabitsView.addDays(PaceState.todayString, weeks * 7) }
    private var autoCategory: String {
        let id = QuickParse.categoryFor(clean).id
        return cats.contains { $0.0 == id } && id != "other" ? id : "personal"
    }
    private var cat: String { catTouched ? category : autoCategory }
    private var plan: [GoalPlanner.Step] {
        guard !clean.isEmpty else { return [] }
        return GoalPlanner.buildPlan(title: clean, category: cat, start: PaceState.todayString,
                                     end: endKey, pace: pace, mins: mins)
    }
    private var tint: Color { WizardLook.color(GoalsView.categoryColours[cat] ?? "#5B6BD5") }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 12) {
                    Text("What do you want to reach?")
                        .font(.paceHeading(22)).fontWeight(.semibold)
                        .foregroundStyle(theme.inkOnBackground)
                        .accessibilityIdentifier("wizard.prompt")
                }
                TextField("Run a 5k by March", text: $title, axis: .vertical)
                    .environment(\.colorScheme, .light)
                    .font(.paceBody(18)).foregroundStyle(PaceColor.pine).lineLimit(2...4)
                    .focused($fieldFocus)
                    .padding(14).background(PaceColor.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
                    .contentShape(Rectangle()).onTapGesture { fieldFocus = true }
                    .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { fieldFocus = true } }
                    .accessibilityIdentifier("wizard.goalTitle")
                HStack(spacing: 12) {
                    Button { voice.toggle { heard in title = heard } } label: {
                        Image(systemName: voice.listening ? "mic.fill" : "mic").font(.system(size: 20))
                            .foregroundStyle(PaceColor.waterDeep).frame(width: 52, height: 52)
                            .background(PaceColor.white).clipShape(Circle())
                            .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
                    }
                    .buttonStyle(.plain).accessibilityLabel("Speak").accessibilityIdentifier("goal.mic")
                    Spacer(minLength: 0)
                }
                if !clean.isEmpty { previewCard }
                goalKindRow
                goalIconRow
                detailsCard
                Button(action: save) {
                    Text("Make my plan")
                        .font(.paceBody(17)).fontWeight(.semibold).foregroundStyle(PaceColor.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 15)
                        .background(!clean.isEmpty ? AnyShapeStyle(LinearGradient.paceHero) : AnyShapeStyle(PaceColor.waterMid))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain).disabled(clean.isEmpty)
                .accessibilityIdentifier("goal.make")
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.immediately)
        .background(ThemedBackground())
        .navigationTitle("New goal")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }.accessibilityIdentifier("goal.cancel")
            }
        }
        .animation(.easeOut(duration: 0.25), value: clean.isEmpty)
    }

    private var autoIcon: String { IconBank.best(for: clean) ?? GoalsView.symbol(for: cat) }
    private var shownIcon: String { goalIcon.isEmpty ? autoIcon : goalIcon }

    private var goalIconRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button { withAnimation { showIcons.toggle() } } label: {
                HStack(spacing: 10) {
                    Image(systemName: shownIcon).font(.system(size: 18)).foregroundStyle(PaceColor.white)
                        .frame(width: 38, height: 38).background(tint)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    Text(showIcons ? "Hide icons" : "Pace picked this icon. Change it").font(.paceBody(14)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.stillWater)
                    Spacer()
                }
            }
            .buttonStyle(.plain).accessibilityIdentifier("goal.iconToggle")
            if showIcons {
                IconGrid(icon: $goalIcon, colorHex: GoalsView.categoryColours[cat] ?? "#5B6BD5", suggestions: IconBank.suggest(for: clean))
            }
        }
    }

    private var goalKindRow: some View {
        KindPicker(title: "What kind of goal is it?",
                   selection: Binding(get: { cat }, set: { category = $0 ?? "other"; catTouched = true }),
                   idPrefix: "goal")
    }

    private var previewCard: some View {
        let steps = plan
        return PaceCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 14) {
                    ZStack {
                        Circle().stroke(tint.opacity(0.18), lineWidth: 8)
                        Circle().trim(from: 0, to: steps.isEmpty ? 0.02 : min(1, 0.12 + Double(steps.count) / 60))
                            .stroke(tint, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Image(systemName: shownIcon).font(.system(size: 20)).foregroundStyle(tint)
                    }
                    .frame(width: 60, height: 60)
                    .animation(.easeOut(duration: 0.4), value: steps.count)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(clean).font(.paceHeading(18)).fontWeight(.semibold).foregroundStyle(PaceColor.pine)
                            .lineLimit(2)
                        Text("\(steps.count) small steps, about \(mins) min each")
                            .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                            .accessibilityIdentifier("wizard.goalReview")
                    }
                }
                ForEach(Array(steps.prefix(3).enumerated()), id: \.offset) { i, s in
                    HStack(spacing: 10) {
                        Text("\(i + 1)").font(.paceBody(13)).fontWeight(.bold).foregroundStyle(PaceColor.white)
                            .frame(width: 24, height: 24).background(tint).clipShape(Circle())
                        Text(s.title).font(.paceBody(14)).foregroundStyle(PaceColor.pine).lineLimit(2)
                        Spacer(minLength: 0)
                    }
                    .padding(10).background(tint.opacity(0.10))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                HStack(spacing: 8) {
                    Image("SkipCelebrate").resizable().scaledToFit().frame(width: 34, height: 34)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    Text(steps.isEmpty ? "Keep typing." : "Small enough to start today.")
                        .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                }
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: steps.count)
        .accessibilityIdentifier("goal.preview")
    }

    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeOut(duration: 0.2)) { showDetails.toggle() }
            } label: {
                HStack {
                    Image(systemName: "slider.horizontal.3").foregroundStyle(PaceColor.waterDeep)
                    Text("Or fill in the details").font(.paceBody(16)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.pine)
                    Spacer()
                    Image(systemName: showDetails ? "chevron.up" : "chevron.down").foregroundStyle(PaceColor.waterMid)
                }
                .padding(14).frame(minHeight: 48)
            }
            .buttonStyle(.plain).accessibilityIdentifier("goal.details")
            if showDetails {
                VStack(alignment: .leading, spacing: 12) {
                    TextField("Optional: your why", text: $why, axis: .vertical)
                        .environment(\.colorScheme, .light)
                        .font(.paceBody(16)).foregroundStyle(PaceColor.pine).lineLimit(1...3)
                        .padding(12).background(PaceColor.porcelain)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .accessibilityIdentifier("wizard.why")
                    chipTitle("By when")
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], alignment: .leading, spacing: 8) {
                        ForEach([(2, "2 weeks"), (4, "1 month"), (8, "2 months"), (13, "3 months"), (26, "6 months")], id: \.0) { w, l in
                            WizardChip(label: l, on: weeks == w) { weeks = w }
                        }
                    }
                    chipTitle("How often")
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], alignment: .leading, spacing: 8) {
                        WizardChip(label: "Every day", on: pace == "daily") { pace = "daily" }
                        WizardChip(label: "Weekdays", on: pace == "weekdays") { pace = "weekdays" }
                        WizardChip(label: "Mon Wed Fri", on: pace == "three") { pace = "three" }
                    }
                    chipTitle("Minutes a day")
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 8)], alignment: .leading, spacing: 8) {
                        ForEach([10, 15, 20, 25, 30, 45], id: \.self) { m in
                            WizardChip(label: "\(m) min", on: mins == m) { mins = m }
                        }
                    }
                }
                .padding(.horizontal, 14).padding(.bottom, 14)
            }
        }
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
    }

    private func chipTitle(_ s: String) -> some View {
        Text(s).font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase).foregroundStyle(PaceColor.waterDeep)
    }

    private func save() {
        guard !clean.isEmpty else { return }
        session.addGoal(title: clean, end: endKey, pace: pace, mins: mins, category: cat, icon: shownIcon)
        extras.celebrate()
        PlusClose.fire()
        dismiss()
    }
}
