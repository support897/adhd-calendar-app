import SwiftUI
import FirebaseAuth
import UIKit

/// One small client for the website backend (Supabase edge functions):
/// bug and feedback reports (we email the sender and the owner) and the kindness wall.
enum Backend {
    static let base = "https://fipingffwixtwrlcgffi.supabase.co/functions/v1"
    static let key = "sb_publishable_VT3CZgUUnHePy-ms2-K9KQ_gUsdVm92"

    static func request(_ path: String, body: [String: Any]? = nil) async throws -> [String: Any] {
        var req = URLRequest(url: URL(string: base + "/" + path)!)
        req.timeoutInterval = 20
        req.setValue(key, forHTTPHeaderField: "apikey")
        req.setValue("Bearer " + key, forHTTPHeaderField: "Authorization")
        if let body {
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }

    /// Sends a report. Returns true only when the server confirms it saved it.
    static func sendReport(kind: String, message: String, anonymous: Bool, rating: Int?) async -> Bool {
        let user = Auth.auth().currentUser
        let info = Bundle.main.infoDictionary
        var body: [String: Any] = [
            "kind": kind,
            "app": "Pace",
            "message": String(message.prefix(4000)),
            "anonymous": anonymous,
            "app_version": (info?["CFBundleShortVersionString"] as? String) ?? "",
            "build": (info?["CFBundleVersion"] as? String) ?? "",
            "os": UIDevice.current.systemVersion,
            "device": UIDevice.current.model,
            "locale": Locale.current.identifier,
        ]
        if !anonymous {
            body["email"] = user?.email ?? ""
            body["uid"] = user?.uid ?? ""
            body["name"] = user?.displayName ?? ""
        }
        if let rating { body["rating"] = rating }
        do {
            let r = try await request("app-report", body: body)
            return (r["saved"] as? Bool) == true
        } catch { return false }
    }
}

private struct ReportForm: View {
    let kind: String            // "bug" or "feedback"
    let title: String
    let lead: String
    let prompt: String
    let allowAnonymous: Bool
    @EnvironmentObject private var theme: ThemeStore
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var anonymous = false
    @State private var rating = 0
    @State private var sending = false
    @State private var sent = false
    @State private var failed = false
    @FocusState private var focused: Bool

    private var email: String { Auth.auth().currentUser?.email ?? "" }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if sent {
                    VStack(spacing: 14) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 54)).foregroundStyle(PaceColor.stillWater)
                        Text("Got it. Thank you.")
                            .font(.paceHeading(24)).fontWeight(.semibold)
                            .foregroundStyle(theme.inkOnBackground)
                        Text(anonymous
                             ? "We read every message and use it to improve Pace."
                             : "We emailed you a receipt. We will reply within 24 hours.")
                            .font(.paceBody(16)).multilineTextAlignment(.center)
                            .foregroundStyle(theme.inkOnBackground)
                        Button("Done") { dismiss() }
                            .font(.paceBody(17)).fontWeight(.bold)
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(PaceColor.stillWater).foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .accessibilityIdentifier("\(kind).done")
                    }
                    .frame(maxWidth: .infinity).padding(.top, 30)
                } else {
                    Text(lead).font(.paceBody(16)).foregroundStyle(theme.inkOnBackground)
                    if kind == "feedback" {
                        HStack(spacing: 8) {
                            ForEach(1...5, id: \.self) { i in
                                Button { rating = (rating == i) ? 0 : i } label: {
                                    Image(systemName: i <= rating ? "heart.fill" : "heart")
                                        .font(.system(size: 28))
                                        .foregroundStyle(PaceColor.stillWater)
                                        .frame(minWidth: 44, minHeight: 44)
                                }
                                .accessibilityLabel("\(i) of 5")
                                .accessibilityIdentifier("feedback.rate.\(i)")
                            }
                        }
                    }
                    TextEditor(text: $text)
                        .focused($focused)
                        .font(.paceBody(16))
                        .frame(minHeight: 150)
                        .padding(8).scrollContentBackground(.hidden)
                        .background(PaceColor.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(alignment: .topLeading) {
                            if text.isEmpty {
                                Text(prompt).font(.paceBody(16)).foregroundStyle(.gray)
                                    .padding(.horizontal, 14).padding(.vertical, 16).allowsHitTesting(false)
                            }
                        }
                        .accessibilityIdentifier("\(kind).text")
                    if allowAnonymous {
                        Toggle("Send without my name or email", isOn: $anonymous)
                            .font(.paceBody(16)).tint(PaceColor.stillWater)
                            .accessibilityIdentifier("\(kind).anonymous")
                    }
                    Text(anonymous || email.isEmpty
                         ? "Nothing about you is sent. We cannot reply."
                         : "Sent with your account email: \(email)")
                        .font(.paceBody(13)).foregroundStyle(theme.inkOnBackground.opacity(0.8))
                    if failed {
                        Text("Could not send. Check your internet and tap Send again. Your words are kept.")
                            .font(.paceBody(14)).foregroundStyle(.red)
                            .accessibilityIdentifier("\(kind).error")
                    }
                    Button {
                        focused = false; sending = true; failed = false
                        Task {
                            let ok = await Backend.sendReport(kind: kind, message: text, anonymous: anonymous || email.isEmpty && allowAnonymous, rating: rating == 0 ? nil : rating)
                            sending = false
                            if ok { sent = true } else { failed = true }
                        }
                    } label: {
                        Text(sending ? "Sending" : "Send")
                            .font(.paceBody(17)).fontWeight(.bold)
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(PaceColor.stillWater).foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(sending || text.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
                    .accessibilityIdentifier("\(kind).send")
                }
            }
            .padding(22)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(ThemedBackground())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct BugReportView: View {
    var body: some View {
        ReportForm(kind: "bug", title: "Report a bug",
                   lead: "Something broken? Tell us in one line. We reply within 24 hours.",
                   prompt: "What went wrong?", allowAnonymous: false)
    }
}

struct FeedbackView: View {
    var body: some View {
        ReportForm(kind: "feedback", title: "Send feedback",
                   lead: "Your ideas shape Pace. Tell us what you love and what to change. We reply within 24 hours.",
                   prompt: "What would make Pace better for you?", allowAnonymous: true)
    }
}

/// The two icons, one tap each.
struct ReportIcons: View {
    var body: some View {
        HStack(spacing: 4) {
            NavigationLink { BugReportView() } label: {
                Image(systemName: "ladybug.fill").frame(minWidth: 44, minHeight: 44)
            }
            .accessibilityLabel("Report a bug")
            .accessibilityIdentifier("icon.bug")
            NavigationLink { FeedbackView() } label: {
                Image(systemName: "bubble.left.and.text.bubble.right.fill").frame(minWidth: 44, minHeight: 44)
            }
            .accessibilityLabel("Send feedback")
            .accessibilityIdentifier("icon.feedback")
        }
        .foregroundStyle(PaceColor.stillWater)
    }
}
