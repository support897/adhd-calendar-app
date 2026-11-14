import SwiftUI

/// THE DOOR — new shape of record (Phase 1 screen list):
/// app name · Google · Apple · one small "Email instead".
/// Nothing else on the screen. Budget: 5 words, as the spec
/// itself enumerates them: "Pace Calendar", Google, Apple,
/// "Email instead". No emojis. The mark of record stands
/// above the name (variant D, the same art as the app icon).
struct DoorView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Spacer()

                Image("Mark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 84, height: 84)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .accessibilityHidden(true)

                Text("Pace Calendar")
                    .font(.paceHeading(32))
                    .fontWeight(.semibold)
                    .foregroundStyle(PaceColor.pine)
                    .padding(.bottom, 26)

                PacePill(title: "Google") {
                    session.signInWithGoogle()
                }
                .accessibilityIdentifier("door.google")

                PacePill(title: "Apple") {
                    session.signInWithApple()
                }
                .accessibilityIdentifier("door.apple")

                NavigationLink {
                    EmailDoorView()
                } label: {
                    Text("Email instead")
                        .font(.paceBody(15))
                        .fontWeight(.semibold)
                        .foregroundStyle(PaceColor.stillWater)
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityIdentifier("door.emailInstead")

                Spacer()
            }
            .padding(.horizontal, 28)
            .background(ThemedBackground())
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}
