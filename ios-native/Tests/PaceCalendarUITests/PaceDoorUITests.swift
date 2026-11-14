import XCTest

/// Door drives for Pace native P2 (local-xcuitest shape:
/// waitForExistence, never sleep; accessibility identifiers
/// over coordinates; fresh state per test).
/// Twin team account: a TEST account on the TEST project
/// pace-test-c00fa only, created by tools/seed-team-leg.py —
/// the same standing as the web battery's twin accounts.
enum TeamAccount {
    static let email = "pace-p2-team@example.com"
    static let password = "Pace-Team-2026!"
    static let seededTaskTitle = "Morning shift at the café"
}

final class PaceDoorUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    /// The door is exactly: name · Google · Apple · Email
    /// instead. Nothing else. (Door law, new shape.)
    func testDoorShape() throws {
        app.launch()
        XCTAssertTrue(app.staticTexts["Pace Calendar"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["door.google"].exists)
        XCTAssertTrue(app.buttons["door.apple"].exists)
        XCTAssertTrue(app.buttons["door.emailInstead"].exists)
        XCTAssertFalse(app.textFields["email.emailField"].exists)
    }

    /// Email lives on its own page; sliding back returns to
    /// the previous page (swipe law).
    func testEmailPageOpensAndSwipesBack() throws {
        app.launch()
        XCTAssertTrue(app.buttons["door.emailInstead"].waitForExistence(timeout: 20))
        app.buttons["door.emailInstead"].tap()
        XCTAssertTrue(app.textFields["email.emailField"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.secureTextFields["email.passwordField"].exists)
        app.swipeRight()
        XCTAssertTrue(app.buttons["door.google"].waitForExistence(timeout: 10))
    }

    /// Google first: the tap opens the Google sign-in session;
    /// a cancel returns to the calm door with no error line.
    /// (Completion against production is HER leg — not driven
    /// here; on the twin there is no Google client, named in
    /// the build note.)
    func testGoogleSheetOpensAndCancels() throws {
        app.launch()
        XCTAssertTrue(app.buttons["door.google"].waitForExistence(timeout: 20))
        app.buttons["door.google"].tap()

        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let cancelInApp = app.buttons["Cancel"]
        let cancelInSpringboard = springboard.buttons["Cancel"]
        let deadline = Date().addingTimeInterval(25)
        var tapped = false
        while Date() < deadline && !tapped {
            if cancelInApp.exists { cancelInApp.tap(); tapped = true }
            else if cancelInSpringboard.exists { cancelInSpringboard.tap(); tapped = true }
            else { Thread.sleep(forTimeInterval: 0.5) }
        }
        XCTAssertTrue(tapped, "Google sign-in session never offered a Cancel")
        XCTAssertTrue(app.buttons["door.google"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.staticTexts["Pace Calendar"].exists)
    }

    /// TEAM LEG (carry proof): the twin-config build signs in
    /// through the app's own email door with the team test
    /// account and shows the seeded same-shape state — greeting
    /// by the seeded saved name, seeded things standing there.
    /// Seeded beforehand by tools/seed-team-leg.py.
    func testTeamLegEmailDoorTwin() throws {
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        // Normaliser: a session from an earlier run can
        // outlive the install on this runtime and open the
        // app already inside (QA's sim B run 2: the app
        // opened on the home, the door never stood). If the
        // home already stands, sign out through More first,
        // so the door flow below starts from the door.
        let standingGreeting = app.staticTexts["proof.greeting"]
        if standingGreeting.waitForExistence(timeout: 8) {
            app.tabBars.buttons["More"].tap()
            let signOut = app.buttons["more.signOut"]
            XCTAssertTrue(signOut.waitForExistence(timeout: 10))
            signOut.tap()
        }
        XCTAssertTrue(app.buttons["door.emailInstead"].waitForExistence(timeout: 20))
        app.buttons["door.emailInstead"].tap()

        let email = app.textFields["email.emailField"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap()
        email.typeText(TeamAccount.email)

        let password = app.secureTextFields["email.passwordField"]
        password.tap()
        password.typeText(TeamAccount.password)

        app.buttons["email.submit"].tap()

        let greeting = app.staticTexts["proof.greeting"]
        // The greeting stands a beat before the saved name
        // lands with the async state load — and the load
        // itself can land past a flat wait (QA's run 1: the
        // failure snapshot showed the app inside with the
        // name standing, a beat after the flat 30 s
        // existence wait expired). Poll for the greeting
        // WITH its name, up to 60 s — the FIX C poll shape,
        // widened to the existence wait itself.
        let greetDeadline = Date().addingTimeInterval(60)
        while !(greeting.exists && greeting.label.contains("Team")) && Date() < greetDeadline {
            Thread.sleep(forTimeInterval: 0.5)
        }
        XCTAssertTrue(greeting.exists,
                      "greeting never stood after the twin sign-in")
        XCTAssertTrue(greeting.label.contains("Team"),
                      "greeting should use the seeded saved name, got: \(greeting.label)")
        // The seeded task stands in the Today list. Its row
        // carries the auto short-version suffix by design
        // (DayAdapter.autoVersion: "title (short version)"),
        // so the bare title never stands as an exact label —
        // match the row whose label BEGINS WITH the title.
        let seededRow = app.staticTexts.matching(
            NSPredicate(format: "label BEGINSWITH %@", TeamAccount.seededTaskTitle)).firstMatch
        XCTAssertTrue(seededRow.waitForExistence(timeout: 10),
                      "seeded task never stood in the Today list")

        // Finished-state look check of the proof screen
        // (the one picture P2 keeps, as evidence — never a
        // driving method).
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "team-leg-proof-screen"
        shot.lifetime = .keepAlways
        add(shot)
    }
}
