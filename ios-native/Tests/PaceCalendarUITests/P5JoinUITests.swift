import XCTest

/// P5 join drive: the SECOND team account joins the shared
/// goal the first account made. The goal's id is found over
/// Firestore REST from inside the test: the deployed rules
/// deny LISTING sharedGoals to everyone (the link is the
/// secret; a goal doc is readable by id only), so the id is
/// read from the OWNER's own state doc, where the app
/// itself records it after sharing. Then the app's own Join
/// door does the join, and the steps stand in the app. Run
/// AFTER P5UITests in the same drive; seeded by
/// tools/seed-team2.py.
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
            app.buttons["tab.more"].tap()
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
        // The saved name lands with the state load, a beat
        // after the greeting itself stands — poll the label
        // for it instead of reading it once, instantly.
        let nameDeadline = Date().addingTimeInterval(20)
        while !greeting.label.contains("Second") && Date() < nameDeadline {
            Thread.sleep(forTimeInterval: 0.5)
        }
        XCTAssertTrue(greeting.label.contains("Second"),
                      "second tester's greeting should use their saved name, got: \(greeting.label)")

        // Find the shared goal over REST and join by its link
        // through the app's own Join door.
        let goalId = try XCTUnwrap(Self.findSharedGoalId(),
                                   "no shared goal titled 'Read 12 chapters' found over REST")
        app.buttons["tab.goals"].tap()
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

    /// REST: sign in as the FIRST tester (the owner), read
    /// their own state doc, return the sharedGoalId the app
    /// recorded on the goal titled "Read 12 chapters". The
    /// twin key and project stand in the app target's twin
    /// branch of record; the values are read from the same
    /// public web config the seed scripts use.
    private static func findSharedGoalId() -> String? {
        let sema = DispatchSemaphore(value: 0)
        var found: String?
        Task {
            defer { sema.signal() }
            let key = TwinRest.apiKey
            guard let account = await TwinRest.signIn(email: TeamAccount.email,
                                                      password: TeamAccount.password,
                                                      key: key) else { return }
            found = await TwinRest.ownerSharedGoalId(token: account.token,
                                                     uid: account.uid,
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

    static func signIn(email: String, password: String, key: String) async -> (token: String, uid: String)? {
        var req = URLRequest(url: URL(string: "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=\(key)")!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: [
            "email": email, "password": password, "returnSecureToken": true,
        ])
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = json["idToken"] as? String,
              let uid = json["localId"] as? String else { return nil }
        return (token, uid)
    }

    /// The owner's own state doc (an owner reads their own
    /// doc under the rules): find the goal by title and
    /// return the sharedGoalId the app recorded on it when
    /// the share was created.
    static func ownerSharedGoalId(token: String, uid: String, title: String) async -> String? {
        var req = URLRequest(url: URL(string: "https://firestore.googleapis.com/v1/projects/pace-test-c00fa/databases/(default)/documents/users/\(uid)/data/state")!)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let fields = json["fields"] as? [String: Any],
              let stateJson = (fields["stateJson"] as? [String: Any])?["stringValue"] as? String,
              let stateData = stateJson.data(using: .utf8),
              let state = try? JSONSerialization.jsonObject(with: stateData) as? [String: Any],
              let goals = state["goals"] as? [[String: Any]] else { return nil }
        for goal in goals where (goal["title"] as? String) == title {
            return goal["sharedGoalId"] as? String
        }
        return nil
    }
}
