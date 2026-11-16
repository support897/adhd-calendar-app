import XCTest

/// P7 drives (local-xcuitest): the Plus screen stands with
/// its three plans and prices of record, and the Settings
/// notification switches stand with task notifications ON
/// by default (her 14 Nov ruling). Whether the store
/// offering answers in the sandbox is named by whichever
/// state stands (Choose buttons or the honest not-available
/// line) — both are passes; a missing plan is not.
final class P7UITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        TwinSignIn.signIn(app)
    }

    override func tearDownWithError() throws {
        app = nil
    }

    func testPlusScreenStands() throws {
        app.buttons["tab.more"].tap()
        app.buttons["more.plus"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["plus.screen"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["A$4.99"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["A$39.99"].exists)
        XCTAssertTrue(app.staticTexts["A$99.99"].exists)
        XCTAssertTrue(app.staticTexts["First month free"].exists)
        XCTAssertTrue(app.buttons["plus.restore"].exists)
        let chooseStands = app.buttons["plus.choose.pace_plus_monthly"].exists
        let honestLine = app.staticTexts["plus.unavailable"].exists
        XCTAssertTrue(chooseStands || honestLine,
                      "Plus must either offer the purchase or say so plainly")
    }

    func testNotificationsOnByDefault() throws {
        app.buttons["tab.more"].tap()
        app.buttons["more.settings"].tap()
        let tasks = app.switches["settings.notifStart"]
        XCTAssertTrue(tasks.waitForExistence(timeout: 10))
        XCTAssertEqual(tasks.value as? String, "1",
                       "task notifications must stand ON by default")
        XCTAssertTrue(app.switches["settings.notifCheckin"].exists)
    }
}
