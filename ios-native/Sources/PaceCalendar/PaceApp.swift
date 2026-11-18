import SwiftUI
import FirebaseCore
import GoogleSignIn

@main
struct PaceApp: App {
    @UIApplicationDelegateAdaptor(PaceAppDelegate.self) private var delegate
    @StateObject private var session = SessionStore()
    @StateObject private var theme = ThemeStore()
    @StateObject private var extras = ExtrasStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .environmentObject(theme)
                .environmentObject(extras)
                .onChange(of: session.state?.theme) { _, newKey in
                    // Her saved pick paints the world the moment
                    // her state lands (theme law: the pick
                    // survives, the state doc is its home).
                    if let newKey { theme.apply(newKey) }
                }
        }
    }
}

final class PaceAppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        FirebaseBootstrap.configureIfNeeded()
        return true
    }

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }
}

enum FirebaseBootstrap {
    private static var configured = false

    static func configureIfNeeded() {
        guard !configured else { return }
        configured = true
        if ProcessInfo.processInfo.arguments.contains("-PaceTwinConfig") {
            // DERIVED CONFIG — NAMED: these options are built in code
            // from the TEST TWIN's WEB config of record, which stands
            // on disk at pace-b39/tests/accounts-live-check.mjs
            // (apiKey + appId 1:993767785197:web:... in that file).
            // The twin pace-test-c00fa has NO GoogleService-Info.plist
            // of record anywhere — no iOS app is registered in it.
            // This derived config is used ONLY under -PaceTwinConfig
            // (team-leg test drives). The shipped configuration is
            // the production GoogleService-Info.plist of record.
            // The twin carries no iOS OAuth client (its web config
            // of record has googleClientId: null), so Google
            // sign-in is not available in twin builds — Auth email
            // door + Firestore reads only.
            // FORMAT ADAPTATION — NAMED (17:05 root-cause fix):
            // Firebase raises 'com.firebase.core' ("invalid
            // GOOGLE_APP_ID") when the id carries the :web:
            // platform segment, so the twin launch crashed in
            // configure before the door could render (crash of
            // record: PaceCalendar-2026-11-14-165811.ips). The
            // id below is the twin's web app id OF RECORD with
            // ONLY the platform segment adapted to :ios: — no
            // iOS app is registered in the twin, and this string
            // does not claim one is. It exists so the SDK will
            // configure against the twin at all; the carry the
            // team leg proves (Auth sign-in + Firestore read)
            // is real or it fails in the open. Twin builds only.
            let options = FirebaseOptions(googleAppID: "1:993767785197:ios:ecc7b4b9390db5967742e4",
                                          gcmSenderID: "993767785197")
            options.apiKey = "AIzaSyDtzBATSYj-pbQiBipcj4rZ6G6lx66TRhg"
            options.projectID = "pace-test-c00fa"
            FirebaseApp.configure(options: options)
        } else {
            FirebaseApp.configure()
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore

    var body: some View {
        Group {
            if session.userID != nil {
                HomeView()
            } else {
                DoorView()
            }
        }
        .background(ThemedBackground())
        // THE CONTRAST PIN: the system chrome (navigation
        // titles, list/form surfaces, the tab bar, pickers,
        // sheets) follows the app's chosen theme world, never
        // the phone's appearance. Without this pin her phone
        // rendered dark chrome over the light world — white
        // titles on white, a near-black More card (build 55).
        .preferredColorScheme(theme.scheme)
    }
}
