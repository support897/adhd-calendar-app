import XCTest

/// LEGS FOR THE IMPROVED ROUND: hero and focus timer, the
/// moment of done, reward level, brain dump, Year view, real
/// time, calendars, leave-by, Sunday reset, habit rules, and
/// the Can't-move field on the add sheet. Element reads only.
final class ImprovedUITests: XCTestCase {
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

    private func openMore(_ id: String) {
        app.buttons["tab.more"].tap()
        let row = app.buttons[id]
        XCTAssertTrue(row.waitForExistence(timeout: 10), "\(id) missing from More")
        row.tap()
    }

    func testHeroStartsFocusAndDoneCelebrates() throws {
        app.buttons["tab.today"].tap()
        XCTAssertTrue(any("today.hero").waitForExistence(timeout: 15), "hero card never stood")
        app.buttons["today.start"].tap()
        XCTAssertTrue(any("focus.screen").waitForExistence(timeout: 10), "focus timer never opened")
        XCTAssertTrue(any("focus.time").exists)
        app.buttons["focus.pause"].tap()
        app.buttons["focus.done"].tap()
        XCTAssertTrue(any("celebrate.banner").waitForExistence(timeout: 6), "no celebration after Done")
    }

    func testTickCelebrates() throws {
        app.buttons["tab.today"].tap()
        let tick = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'task.tick.'")).firstMatch
        XCTAssertTrue(tick.waitForExistence(timeout: 15))
        tick.tap()
        XCTAssertTrue(any("celebrate.banner").waitForExistence(timeout: 6), "no celebration after a tick")
    }

    func testRewardLevelPicks() throws {
        openMore("more.reward")
        XCTAssertTrue(app.buttons["reward.rush"].waitForExistence(timeout: 10))
        app.buttons["reward.rush"].tap()
        app.buttons["reward.calm"].tap()
        XCTAssertTrue(app.buttons["reward.balanced"].exists)
    }

    func testBrainDumpAddsAndParks() throws {
        openMore("more.dump")
        let field = app.textFields["dump.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.tap()
        field.typeText("Buy stamps")
        app.buttons["dump.add"].tap()
        XCTAssertTrue(app.staticTexts["Buy stamps"].waitForExistence(timeout: 5))
        app.buttons["Park"].firstMatch.tap()
        XCTAssertFalse(app.staticTexts["Buy stamps"].waitForExistence(timeout: 2))
    }

    func testYearViewStands() throws {
        app.buttons["tab.calendar"].tap()
        let mode = app.segmentedControls["calendar.mode"]
        XCTAssertTrue(mode.waitForExistence(timeout: 10))
        mode.buttons["Year"].tap()
        XCTAssertTrue(any("year.grid").waitForExistence(timeout: 10), "Year view never stood")
        XCTAssertTrue(any("year.title").exists)
    }

    func testRealTimeCalendarsLeaveBySunday() throws {
        openMore("more.realtime")
        XCTAssertTrue(any("realtime.ratio").waitForExistence(timeout: 10))
        XCTAssertTrue(any("realtime.buffer").exists)
        app.navigationBars.buttons.firstMatch.tap()
        app.buttons["more.calendars"].tap()
        XCTAssertTrue(any("calendars.apple").waitForExistence(timeout: 10))
        app.navigationBars.buttons.firstMatch.tap()
        app.buttons["more.leaveby"].tap()
        XCTAssertTrue(any("leaveby.on").waitForExistence(timeout: 10))
        app.navigationBars.buttons.firstMatch.tap()
        app.buttons["more.reset"].tap()
        XCTAssertTrue(any("reset.screen").waitForExistence(timeout: 10), "Sunday reset never stood")
    }

    func testHabitRuleMenuStands() throws {
        app.buttons["tab.habits"].tap()
        let rule = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'habits.rule.'")).firstMatch
        XCTAssertTrue(rule.waitForExistence(timeout: 15), "no habit rule menu")
        rule.tap()
        let weekly = app.buttons["3 times a week"]
        XCTAssertTrue(weekly.waitForExistence(timeout: 5))
        weekly.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'of 3 this week'")).firstMatch
            .waitForExistence(timeout: 5), "weekly rule progress never showed")
    }

    func testCantMoveTaskSaves() throws {
        app.buttons["today.add"].tap()
        let title = app.textFields["addEvent.title"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        title.tap()
        title.typeText("Dentist visit")
        let toggle = app.switches["addEvent.cantMove"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5))
        toggle.tap()
        app.buttons["addEvent.save"].tap()
        XCTAssertTrue(app.staticTexts["Dentist visit"].waitForExistence(timeout: 15))
    }
}
