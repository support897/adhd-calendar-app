import SwiftUI

/// SETTINGS — every setting lives here (her settings law:
/// never in a Me/Profile place; there is no Me screen in
/// Pace). Her name, the morning check-in time, the theme,
/// the notification switches, and her account. Every change
/// writes through the one settings door (write kind 11).
/// Text budget: 15 app words — labels only, values are data.
struct SettingsView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    @State private var nameDraft: String = ""

    var body: some View {
        Form {
            Section {
                TextField("Name", text: $nameDraft)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("settings.name")
                Button("Save") {
                    session.setProfileName(nameDraft)
                }
                .font(.paceBody(16))
                .fontWeight(.semibold)
                .foregroundStyle(PaceColor.stillWater)
                .accessibilityIdentifier("settings.saveName")
            }

            Section {
                Picker("Theme", selection: themeBinding) {
                    Text("White").tag("white")
                    Text("Dark").tag("dark")
                    Text("Beige").tag("beige")
                    Text("Brand").tag("brand")
                }
                .font(.paceBody(16))
                .accessibilityIdentifier("settings.theme")
            }

            Section {
                DatePicker("Check-in", selection: checkinBinding,
                           displayedComponents: .hourAndMinute)
                    .font(.paceBody(16))
                    .accessibilityIdentifier("settings.checkinTime")
            }

            Section {
                Toggle("Check-in", isOn: notifBinding("checkin", fallback: true))
                    .font(.paceBody(16))
                    .accessibilityIdentifier("settings.notifCheckin")
                Toggle("Tasks", isOn: notifBinding("start", fallback: true))
                    .font(.paceBody(16))
                    .accessibilityIdentifier("settings.notifStart")
                Toggle("Digests", isOn: notifBinding("digest", fallback: false))
                    .font(.paceBody(16))
                    .accessibilityIdentifier("settings.notifDigest")
                Toggle("Day done", isOn: notifBinding("done", fallback: false))
                    .font(.paceBody(16))
                    .accessibilityIdentifier("settings.notifDone")
            }

            Section {
                Button("Sign out") {
                    session.signOut()
                }
                .font(.paceBody(16))
                .foregroundStyle(PaceColor.stillWater)
                .accessibilityIdentifier("settings.signOut")
            }
        }
        .scrollContentBackground(.hidden)
        .background(ThemedBackground())
        .navigationTitle("Settings")
        .accessibilityIdentifier("settings.screen")
        .onAppear {
            nameDraft = session.state?.profileName ?? ""
        }
        .task(id: session.stateLoaded) {
            // Notifications wake with her state; permission
            // is asked once, here in Settings where the
            // switches live, and on Today's first land.
            guard session.stateLoaded, let state = session.state else { return }
            _ = await NotificationScheduler.requestPermission()
            await NotificationScheduler.reschedule(state: state)
        }
    }

    private var themeBinding: Binding<String> {
        Binding(
            get: { session.state?.theme ?? theme.key },
            set: { newKey in
                theme.apply(newKey)
                session.setTheme(newKey)
            }
        )
    }

    private var checkinBinding: Binding<Date> {
        Binding(
            get: {
                let parts = (session.state?.checkinTime ?? "08:00").split(separator: ":").compactMap { Int($0) }
                var comps = Calendar.current.dateComponents([.year, .month, .day], from: Date())
                comps.hour = parts.first ?? 8
                comps.minute = parts.count > 1 ? parts[1] : 0
                return Calendar.current.date(from: comps) ?? Date()
            },
            set: { date in
                let c = Calendar.current.dateComponents([.hour, .minute], from: date)
                session.setCheckinTime(String(format: "%02d:%02d", c.hour ?? 8, c.minute ?? 0))
            }
        )
    }

    private func notifBinding(_ field: String, fallback: Bool) -> Binding<Bool> {
        Binding(
            get: {
                guard let state = session.state else { return fallback }
                switch field {
                case "checkin": return state.settings.notifCheckin
                case "start": return state.settings.notifStart
                case "digest": return state.settings.notifDigest
                case "done": return state.settings.notifDone
                default: return fallback
                }
            },
            set: { session.setNotif(field, $0) }
        )
    }
}
