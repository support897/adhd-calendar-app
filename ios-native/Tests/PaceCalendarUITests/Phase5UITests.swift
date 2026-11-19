import XCTest

/// Phase 5: a to-do on top of Today, the calendar hub, the notification check.
final class Phase5UITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        TwinSignIn.signIn(app)
    }

    private func any(_ id: String) -> XCUIElement {
        app.descendants(matching: .any)[id]
    }

    func testQuickTodoOnTop() throws {
        let box = any("today.quicktodo")
        XCTAssertTrue(box.waitForExistence(timeout: 15), "quick to-do missing")
        box.tap()
        box.typeText("Buy stamps\n")
        XCTAssertTrue(app.staticTexts["Buy stamps"].waitForExistence(timeout: 15), "to-do never showed on top")
    }

    func testCalendarHubAndNotificationCheck() throws {
        app.buttons["tab.more"].tap()
        let tools = app.buttons["more.tools"]
        if !tools.waitForExistence(timeout: 5) { app.swipeUp() }
        XCTAssertTrue(tools.waitForExistence(timeout: 10), "Tools missing from More")
        tools.tap()
        let cal = app.buttons["more.calendars"]
        XCTAssertTrue(cal.waitForExistence(timeout: 10), "calendars row missing")
        cal.tap()
        XCTAssertTrue(any("calendars.apple").waitForExistence(timeout: 10), "calendar hub missing")
        XCTAssertTrue(any("calendars.sync").exists || any("calendars.allow").exists, "hub has no sync or allow button")
    }
}
