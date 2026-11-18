import SwiftUI

/// ADD EVENT — Pace's own sheet (named in the EventKit skill
/// pick: NOT EKEventEditViewController). Calm and short:
/// a title, a day, a time if it has one, a length, Save.
/// The save appends one task in the shipped shape through
/// the ruled write door, then the Apple Calendar mirror
/// re-syncs. Text budget: 10 app words (Title · Day · Time ·
/// Length · Save · Cancel = 6).
struct AddEventView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.dismiss) private var dismiss

    let dayKey: String

    @State private var title: String = ""
    @State private var date: Date
    @State private var hasTime: Bool = false
    @State private var time: Date
    @State private var durationMin: Int = 25
    @State private var cantMove: Bool = false
    @State private var smallest: String = ""
    @State private var biggest: String = ""
    @State private var kind: String = "task"

    init(dayKey: String) {
        self.dayKey = dayKey
        let day = PaceState.date(fromKey: dayKey) ?? Date()
        _date = State(initialValue: day)
        var comps = Calendar.current.dateComponents([.year, .month, .day], from: day)
        comps.hour = 9
        comps.minute = 0
        _time = State(initialValue: Calendar.current.date(from: comps) ?? day)
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Kind", selection: $kind) {
                    Text("Task").tag("task")
                    Text("Habit").tag("habit")
                    Text("Goal").tag("goal")
                    Text("Event").tag("event")
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("addEvent.kind")

                NavigationLink("Talk to Skip instead") { TalkView() }
                    .font(.paceBody(15))
                    .accessibilityIdentifier("addEvent.talk")

                TextField("Title", text: $title)
                    .font(.paceBody(17))
                    .accessibilityIdentifier("addEvent.title")

                DatePicker("Day", selection: $date, displayedComponents: .date)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("addEvent.day")

                Toggle("Time", isOn: $hasTime)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("addEvent.hasTime")

                if hasTime {
                    DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
                        .font(.paceBody(16))
                        .accessibilityIdentifier("addEvent.time")
                }

                Stepper("Length: \(durationMin) min", value: $durationMin, in: 5...480, step: 5)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("addEvent.length")

                Toggle("Can't move", isOn: $cantMove)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("addEvent.cantMove")

                TextField("Smallest version (optional)", text: $smallest)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("addEvent.smallest")

                TextField("Biggest version (optional)", text: $biggest)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("addEvent.biggest")
            }
            .scrollContentBackground(.hidden)
            .background(ThemedBackground())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                        .accessibilityIdentifier("addEvent.save")
                }
            }
        }
    }

    private func save() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if kind == "habit" {
            session.addHabit(name: trimmed)
            dismiss()
            return
        }
        if kind == "goal" {
            let end = Calendar.current.date(byAdding: .day, value: 56, to: date) ?? date
            session.addGoal(title: trimmed, end: PaceState.dayKey(for: end), pace: "daily", mins: 20)
            dismiss()
            return
        }
        var timeString: String? = nil
        if hasTime {
            let c = Calendar.current.dateComponents([.hour, .minute], from: time)
            timeString = String(format: "%02d:%02d", c.hour ?? 9, c.minute ?? 0)
        }
        var task = PaceTaskFactory.make(
            title: trimmed,
            date: PaceState.dayKey(for: date),
            time: timeString,
            durationMin: RealTime.padded(durationMin)
        )
        if cantMove { task["essential"] = true }
        let small = smallest.trimmingCharacters(in: .whitespacesAndNewlines)
        if !small.isEmpty { task["minVersion"] = small }
        let big = biggest.trimmingCharacters(in: .whitespacesAndNewlines)
        if !big.isEmpty { task["fullVersion"] = big }
        session.addTask(task)
        dismiss()
    }
}
