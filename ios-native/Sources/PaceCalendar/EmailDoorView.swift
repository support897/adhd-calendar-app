import SwiftUI

/// THE EMAIL PAGE — its own page, by the door law.
/// Email + the user's own chosen password; sign in and create
/// account live here. Sign-up asks "Your name" (per-user name
/// law). Budget: 8 words — Email · Password · Your name ·
/// Sign in · Create account, in their labels only.
/// A failure stays quiet on the page (no red error line);
/// a success walks straight inside.
struct EmailDoorView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var creating = false

    var body: some View {
        VStack(spacing: 16) {
            Spacer().frame(height: 24)

            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .accessibilityIdentifier("email.emailField")
                .paceField()

            SecureField("Password", text: $password)
                .textContentType(creating ? .newPassword : .password)
                .accessibilityIdentifier("email.passwordField")
                .paceField()

            if creating {
                TextField("Your name", text: $name)
                    .textContentType(.name)
                    .accessibilityIdentifier("email.nameField")
                    .paceField()
            }

            PacePill(title: creating ? "Create account" : "Sign in", prominent: true) {
                if creating {
                    session.createAccount(email: email, password: password, name: name)
                } else {
                    session.signInWithEmail(email: email, password: password)
                }
            }
            .accessibilityIdentifier("email.submit")
            .padding(.top, 4)

            Button(creating ? "Sign in" : "Create account") {
                creating.toggle()
            }
            .font(.paceBody(15))
            .fontWeight(.semibold)
            .foregroundStyle(theme.accentOnBackground)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
            .accessibilityIdentifier("email.switchMode")

            Spacer()
        }
        .padding(.horizontal, 28)
        .background(ThemedBackground())
        .navigationBarTitleDisplayMode(.inline)
    }
}

private extension View {
    func paceField() -> some View {
        self
            .font(.paceBody(17))
            .foregroundStyle(PaceColor.pine)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(PaceColor.waterMid, lineWidth: 1)
            )
    }
}
