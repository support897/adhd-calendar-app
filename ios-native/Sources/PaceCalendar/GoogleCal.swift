import SwiftUI
import UIKit
import GoogleSignIn
import FirebaseCore

/// Google Calendar, read only: events from her primary Google
/// calendar show on Today as fixed. Pace never writes to it.
/// Uses the Google sign-in already in the app, asking once for
/// the calendar.readonly scope.
@MainActor
final class GoogleCal: ObservableObject {
    static let shared = GoogleCal()
    static let scope = "https://www.googleapis.com/auth/calendar.readonly"
    @Published var connected: Bool = UserDefaults.standard.bool(forKey: "pace.google.on")
    @Published var note: String = ""

    private func presenter() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        var top = scene?.windows.first(where: { $0.isKeyWindow })?.rootViewController
        while let next = top?.presentedViewController { top = next }
        return top
    }

    func connect() async {
        guard let clientID = FirebaseApp.app()?.options.clientID, let vc = presenter() else {
            note = "Google is not set up on this build."
            return
        }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        do {
            if let user = GIDSignIn.sharedInstance.currentUser {
                if !(user.grantedScopes ?? []).contains(Self.scope) {
                    _ = try await user.addScopes([Self.scope], presenting: vc)
                }
            } else {
                _ = try await GIDSignIn.sharedInstance.signIn(withPresenting: vc, hint: nil,
                                                              additionalScopes: [Self.scope])
            }
            connected = true
            note = ""
            UserDefaults.standard.set(true, forKey: "pace.google.on")
        } catch {
            note = "Google did not connect."
        }
    }

    func disconnect() {
        connected = false
        UserDefaults.standard.set(false, forKey: "pace.google.on")
    }

    /// Timed events of one day from the primary calendar.
    func events(on day: Date) async -> [AppleFixedEvent] {
        guard connected, let user = GIDSignIn.sharedInstance.currentUser else { return [] }
        do {
            try await user.refreshTokensIfNeeded()
        } catch { return [] }
        let token = user.accessToken.tokenString
        let cal = Calendar.current
        let start = cal.startOfDay(for: day)
        guard let end = cal.date(byAdding: .day, value: 1, to: start) else { return [] }
        let iso = ISO8601DateFormatter()
        var comps = URLComponents(string: "https://www.googleapis.com/calendar/v3/calendars/primary/events")!
        comps.queryItems = [
            URLQueryItem(name: "timeMin", value: iso.string(from: start)),
            URLQueryItem(name: "timeMax", value: iso.string(from: end)),
            URLQueryItem(name: "singleEvents", value: "true"),
            URLQueryItem(name: "orderBy", value: "startTime"),
        ]
        var req = URLRequest(url: comps.url!)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = root["items"] as? [[String: Any]] else { return [] }
        var out: [AppleFixedEvent] = []
        for item in items {
            guard let s = (item["start"] as? [String: Any])?["dateTime"] as? String,
                  let e = (item["end"] as? [String: Any])?["dateTime"] as? String,
                  let sd = iso.date(from: s), let ed = iso.date(from: e) else { continue }
            out.append(AppleFixedEvent(id: (item["id"] as? String) ?? UUID().uuidString,
                                       title: (item["summary"] as? String) ?? "Event",
                                       start: sd, end: ed))
        }
        return out
    }
}
