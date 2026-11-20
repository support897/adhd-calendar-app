import SwiftUI
import UIKit
import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import GoogleSignIn
import UserNotifications

/// Account deletion (App Review 5.1.1(v)) and the legal links.
/// Order: sign in again, erase her data, revoke Apple, delete the sign-in, clear this phone.
enum PaceLinks {
    static let privacy = URL(string: "https://joinaikindness.com/pace/privacy.html")!
    static let support = URL(string: "https://joinaikindness.com/pace/support.html")!
    static let terms = URL(string: "https://joinaikindness.com/terms.html")!
}

@MainActor
final class AccountDeleter: ObservableObject {
    @Published var busy = false
    @Published var error: String?
    private let apple = AppleSignInHelper()

    var usesPassword: Bool {
        Auth.auth().currentUser?.providerData.contains { $0.providerID == "password" } ?? false
    }
    private var usesApple: Bool {
        Auth.auth().currentUser?.providerData.contains { $0.providerID == "apple.com" } ?? false
    }
    private var usesGoogle: Bool {
        Auth.auth().currentUser?.providerData.contains { $0.providerID == "google.com" } ?? false
    }

    func delete(password: String) async -> Bool {
        guard let user = Auth.auth().currentUser else { return false }
        busy = true; error = nil
        defer { busy = false }
        do {
            var appleCode: String?
            if usesPassword, let email = user.email {
                try await user.reauthenticate(with: EmailAuthProvider.credential(withEmail: email, password: password))
            } else if usesApple {
                let (idToken, nonce) = try await apple.signIn()
                try await user.reauthenticate(with: OAuthProvider.credential(providerID: .apple, idToken: idToken, rawNonce: nonce))
                appleCode = apple.lastAuthCode
            } else if usesGoogle {
                guard let clientID = FirebaseApp.app()?.options.clientID,
                      let presenter = Self.top() else { throw NSError(domain: "Pace", code: 1) }
                GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
                let r = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
                try await user.reauthenticate(with: GoogleAuthProvider.credential(
                    withIDToken: r.user.idToken?.tokenString ?? "",
                    accessToken: r.user.accessToken.tokenString))
            }
            let uid = user.uid
            let db = Firestore.firestore()
            let batch = db.batch()
            batch.deleteDocument(db.collection("users").document(uid).collection("data").document("state"))
            batch.deleteDocument(db.collection("users").document(uid))
            batch.deleteDocument(db.collection("aggSignups").document(uid))
            batch.deleteDocument(db.collection("aggImports").document(uid))
            try await batch.commit()
            if let code = appleCode { try? await Auth.auth().revokeToken(withAuthorizationCode: code) }
            try await user.delete()
            Self.wipeThisPhone()
            GIDSignIn.sharedInstance.signOut()
            return true
        } catch {
            self.error = "Could not delete. Check your password or try again."
            return false
        }
    }

    /// Clears everything Pace keeps on this phone.
    static func wipeThisPhone() {
        let d = UserDefaults.standard
        for k in d.dictionaryRepresentation().keys where k.hasPrefix("pace.") { d.removeObject(forKey: k) }
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    private static func top() -> UIViewController? {
        let w = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }.first { $0.isKeyWindow }
        var vc = w?.rootViewController
        while let p = vc?.presentedViewController { vc = p }
        return vc
    }
}

struct DeleteAccountSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var theme: ThemeStore
    @StateObject private var deleter = AccountDeleter()
    @State private var password = ""

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Delete my account")
                    .font(.paceHeading(24)).fontWeight(.semibold)
                    .foregroundStyle(theme.inkOnBackground)
                Text("This erases your tasks, goals, habits and settings from our servers and removes your sign-in. It cannot be undone.")
                    .font(.paceBody(16)).foregroundStyle(theme.inkOnBackground)
                if deleter.usesPassword {
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .padding(12).background(PaceColor.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .accessibilityIdentifier("delete.password")
                } else {
                    Text("You will confirm with your sign-in first.")
                        .font(.paceBody(14)).foregroundStyle(theme.inkOnBackground.opacity(0.8))
                }
                if let e = deleter.error {
                    Text(e).font(.paceBody(14)).foregroundStyle(.red)
                        .accessibilityIdentifier("delete.error")
                }
                Button {
                    Task { if await deleter.delete(password: password) { dismiss() } }
                } label: {
                    Text(deleter.busy ? "Deleting" : "Delete forever")
                        .font(.paceBody(17)).fontWeight(.bold)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(Color.red).foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(deleter.busy || (deleter.usesPassword && password.isEmpty))
                .accessibilityIdentifier("delete.confirm")
                Button("Keep my account") { dismiss() }
                    .font(.paceBody(16)).frame(maxWidth: .infinity, minHeight: 44)
                    .accessibilityIdentifier("delete.cancel")
                Spacer()
            }
            .padding(22)
            .background(ThemedBackground())
        }
        .accessibilityIdentifier("delete.sheet")
    }
}

/// The Settings rows: Privacy, Support, Delete.
struct AccountLegalSection: View {
    @EnvironmentObject private var theme: ThemeStore
    @State private var showDelete = false
    @State private var safari: URL?

    var body: some View {
        Section {
            Button("Privacy policy") { safari = PaceLinks.privacy }
                .font(.paceBody(16)).foregroundStyle(theme.accentOnSystemSurface)
                .accessibilityIdentifier("settings.privacy")
            Button("Help and support") { safari = PaceLinks.support }
                .font(.paceBody(16)).foregroundStyle(theme.accentOnSystemSurface)
                .accessibilityIdentifier("settings.support")
            Button("Delete my account", role: .destructive) { showDelete = true }
                .font(.paceBody(16))
                .accessibilityIdentifier("settings.deleteAccount")
        }
        .sheet(isPresented: $showDelete) { DeleteAccountSheet() }
        .sheet(item: $safari) { SafariView(url: $0).ignoresSafeArea() }
    }
}
