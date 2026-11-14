import SwiftUI

/// NEW GOAL — her words, an end day, a pace. The Pace Way
/// does the rest: the planner cuts the goal's own words
/// into small steps, one per plan day, each placed in free
/// calendar space. Text budget: 8 app words (Title · Ends ·
/// Pace · Length · Save · Cancel, pace choices are hers to
/// pick, not prose).
struct AddGoalView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.dismiss) private var dismiss

    @State private var title: String = ""
    @State private var end: Date = Calendar.current.date(byAdding: .day, value: 56, to: Date()) ?? Date()
    @State private var pace: String = "daily"
    @State private var mins: Int = 20

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $title)
                    .font(.paceBody(17))
                    .accessibilityIdentifier("goalNew.title")

                DatePicker("Ends", selection: $end, displayedComponents: .date)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("goalNew.end")

                Picker("Pace", selection: $pace) {
                    Text("Daily").tag("daily")
                    Text("Weekdays").tag("weekdays")
                    Text("Mon Wed Fri").tag("three")
                }
                .font(.paceBody(16))
                .accessibilityIdentifier("goalNew.pace")

                Stepper("Length: \(mins) min", value: $mins, in: 15...25, step: 5)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("goalNew.length")
            }
            .scrollContentBackground(.hidden)
            .background(ThemedBackground())
            .navigationTitle("New goal")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !trimmed.isEmpty else { return }
                        session.addGoal(title: trimmed,
                                        end: PaceState.dayKey(for: end),
                                        pace: pace, mins: mins)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                    .accessibilityIdentifier("goalNew.save")
                }
            }
        }
    }
}
