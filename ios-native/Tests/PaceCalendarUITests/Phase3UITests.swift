import XCTest

/// Phase 3 legs: the three rings with the energy wave, the add
/// sheet's kinds and Talk to Skip, the Biggest-version field, and
/// Skip's growth card on More. Element reads only.
final class Phase3UITests: XCTestCase {
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

    func testTripleRingsStand() throws {
        app.buttons["tab.today"].tap()
        if !any("today.rings").waitForExistence(timeout: 15) { app.swipeUp() }
        XCTAssertTrue(any("today.rings").waitForExistence(timeout: 10), "three rings never stood")
    }

    func testAddSheetKindsTalkAndBiggest() throws {
        app.buttons["today.add"].tap()
        XCTAssertTrue(any("addEvent.kind").waitForExistence(timeout: 10), "kind picker missing")
        XCTAssertTrue(any("addEvent.talk").exists, "Talk to Skip link missing")
        let big = app.textFields["addEvent.biggest"]
        if !big.waitForExistence(timeout: 3) { app.swipeUp() }
        XCTAssertTrue(big.waitForExistence(timeout: 5), "Biggest version field missing")
    }

    func testMoreShowsSkipGrowth() throws {
        app.buttons["tab.more"].tap()
        let card = any("more.skipGrowth")
        if !card.waitForExistence(timeout: 5) { app.swipeUp() }
        XCTAssertTrue(card.waitForExistence(timeout: 10), "Skip growth card missing")
    }

    func testCalendarListViewStands() throws {
        app.buttons["tab.calendar"].tap()
        let list = app.buttons["List"]
        XCTAssertTrue(list.waitForExistence(timeout: 10), "List segment missing")
        list.tap()
        XCTAssertTrue(any("calendar.todoList").waitForExistence(timeout: 10), "to-do list view never stood")
    }

    func testSettingsHasNudgeAndPause() throws {
        app.buttons["tab.more"].tap()
        let row = app.buttons["more.settings"]
        if !row.waitForExistence(timeout: 5) { app.swipeUp() }
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        row.tap()
        let lead = any("settings.lead")
        if !lead.waitForExistence(timeout: 5) { app.swipeUp() }
        XCTAssertTrue(lead.waitForExistence(timeout: 10), "nudge row missing")
        XCTAssertTrue(any("settings.pause").exists || { app.swipeUp(); return any("settings.pause").exists }(), "pause row missing")
    }
}
