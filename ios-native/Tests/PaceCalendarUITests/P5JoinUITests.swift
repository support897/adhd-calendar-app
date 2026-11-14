import XCTest

/// P5 join drive: the SECOND team account joins the shared
/// goal the first account made. The goal's id is found over
/// Firestore REST from inside the test (the goal doc is
/// readable by any signed-in user — the link is the secret;
/// its steps stay members-only until the join lands). Then
/// the app's own Join door does the join, and the steps
/// stand in the app. Run AFTER P5UITests in the same drive;
/// seeded by tools/seed-team2.py.
final class P5JoinUITests: XCTestCase {
    private var app: XCUIApplication!

    private static let team2Email = "pace-p5-team2@example.com"

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    func testJoinSharedGoal() throws {
        // Sign out whoever is in, then in as the second tester.
        if app.staticTexts["proof.greeting"].waitForExistence(timeout: 8) {
            app.tabBars.buttons["More"].tap()
            let signOut = app.buttons["more.signOut"]
            XCTAssertTrue(signOut.waitForExistence(timeout: 10))
            signOut.tap()
        }
        XCTAssertTrue(app.buttons["door.emailInstead"].waitForExistence(timeout: 15))
        app.buttons["door.emailInstead"].tap()
        let email = app.textFields["email.emailField"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap()
        email.typeText(Self.team2Email)
        let password = app.secureTextFields["email.passwordField"]
        password.tap()
        password.typeText(TeamAccount.password)
        app.buttons["email.submit"].tap()
        let greeting = app.staticTexts["proof.greeting"]
        XCTAssertTrue(greeting.waitForExistence(timeout: 30))
        XCTAssertTrue(greeting.label.contains("Second"),
                      "second tester's greeting should use their saved name, got: \(greeting.label)")

        // Find the shared goal over REST and join by its link
        // through the app's own Join door.
        let goalId = try XCTUnwrap(Self.findSharedGoalId(),
                                   "no shared goal titled 'Read 12 chapters' found over REST")
        app.tabBars.buttons["Goals"].tap()
        app.buttons["goals.join"].tap()
        let field = app.textFields["join.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.tap()
        field.typeText("https://adhd-calendar-app-beta.vercel.app/?join=\(goalId)")
        app.buttons["join.submit"].tap()

        let joinedTitle = app.staticTexts["join.title"]
        XCTAssertTrue(joinedTitle.waitForExistence(timeout: 20))
        XCTAssertTrue(joinedTitle.label.contains("Read 12 chapters"))
        // The steps stand for the new member (ticks sync in).
        XCTAssertTrue(app.staticTexts["Read chapter 2"].waitForExistence(timeout: 10)
                      || app.staticTexts["Finish: Read 12 chapters (final look, then celebrate)"].exists)
    }

    /// REST: sign in as team2, list sharedGoals, return the
    /// id of the one titled "Read 12 chapters". The twin key
    /// and project stand in the app target's twin branch of
    /// record; the values are read from the same public web
    /// config the seed scripts use.
    private static func findSharedGoalId() -> String? {
        let sema = DispatchSemaphore(value: 0)
        var found: String?
        Task {
            defer { sema.signal() }
            let key = TwinRest.apiKey
            guard let token = await TwinRest.signIn(email: team2Email,
                                                    password: TeamAccount.password,
                                                    key: key) else { return }
            found = await TwinRest.findSharedGoalId(token: token, key: key,
                                                    title: "Read 12 chapters")
        }
        sema.wait()
        return found
    }
}

enum TwinRest {
    static var apiKey: String {
        // The twin's WEB apiKey of record stands in
        // PaceApp.swift's twin branch (a public web config
        // key, shipped in clients by design). This literal is
        // a PLACEHOLDER: the drive script swaps it for the
        // real key, read out of PaceApp.swift on the Mac,
        // before the test build (drive-p3-mac.sh, P5 stage).
        "AIzaSyDummyKeyReplacedAtDriveTime000000"
    }

    static func signIn(email: String, password: String, key: String) async -> String? {
        var req = URLRequest(url: URL(string: "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=\(key)")!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: [
            "email": email, "password": password, "returnSecureToken": true,
        ])
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json["idToken"] as? String
    }

    static func findSharedGoalId(token: String, key: String, title: String) async -> String? {
        var req = URLRequest(url: URL(string: "https://firestore.googleapis.com/v1/projects/pace-test-c00fa/databases/(default)/documents/sharedGoals")!)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let docs = json["documents"] as? [[String: Any]] else { return nil }
        for doc in docs {
            let fields = doc["fields"] as? [String: Any]
            let docTitle = (fields?["title"] as? [String: Any])?["stringValue"] as? String
            if docTitle == title, let name = doc["name"] as? String {
                return name.components(separatedBy: "/").last
            }
        }
        return nil
    }
}
