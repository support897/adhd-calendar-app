import XCTest

/// Shared twin sign-in for the P3 drives: the team test
/// account on the TEST project pace-test-c00fa only, through
/// the app's own email door — the same standing as
/// PaceDoorUITests' team leg. Seeded beforehand, the same
/// day, by tools/seed-team-leg.py. If a previous test in the
/// same run already signed in AS THE TEAM TESTER, the
/// greeting is simply there. A greeting alone is not proof
/// of the account: sessions outlive uninstalls on this
/// runtime, so a leftover session (the second tester's,
/// above all) would silently re-account a whole drive. The
/// standing greeting's name is checked; a different name
/// signs out and falls through to the door.
enum TwinSignIn {
    static func signIn(_ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) {
        let greeting = app.staticTexts["proof.greeting"]
        if greeting.waitForExistence(timeout: 8) {
            let nameDeadline = Date().addingTimeInterval(10)
            while !greeting.label.contains("Team") && Date() < nameDeadline {
                Thread.sleep(forTimeInterval: 0.5)
            }
            if greeting.label.contains("Team") {
                return
            }
            app.tabBars.buttons["More"].tap()
            let signOut = app.buttons["more.signOut"]
            XCTAssertTrue(signOut.waitForExistence(timeout: 10), file: file, line: line)
            signOut.tap()
        }
        let door = app.buttons["door.emailInstead"]
        XCTAssertTrue(door.waitForExistence(timeout: 20), file: file, line: line)
        door.tap()

        let email = app.textFields["email.emailField"]
        XCTAssertTrue(email.waitForExistence(timeout: 10), file: file, line: line)
        email.tap()
        email.typeText(TeamAccount.email)

        let password = app.secureTextFields["email.passwordField"]
        password.tap()
        password.typeText(TeamAccount.password)

        app.buttons["email.submit"].tap()
        XCTAssertTrue(app.staticTexts["proof.greeting"].waitForExistence(timeout: 30),
                      "twin sign-in never reached the home", file: file, line: line)
    }

    static func todayKey() -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }
}
