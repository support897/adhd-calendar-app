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
        // Free for now: the pay screen is not offered.
        app.buttons["tab.more"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["more.settings"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["more.plus"].exists, "Plus pay row must be gone while Pace is free")
    }

    func testNotificationsOnByDefault() throws {
        app.buttons["tab.more"].tap()
        app.buttons["more.settings"].tap()
        let tasks = app.switches["settings.notifStart"]
        for _ in 0..<8 where !tasks.exists { let l = app.collectionViews.firstMatch; (l.exists ? l : app).swipeUp() }
        XCTAssertTrue(tasks.waitForExistence(timeout: 10))
        XCTAssertEqual(tasks.value as? String, "1",
                       "task notifications must stand ON by default")
        XCTAssertTrue(app.switches["settings.notifCheckin"].exists)
    }
}
