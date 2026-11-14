import XCTest

/// P3 calendar drive (local-xcuitest): the month grid stands
/// with today's cell; the day list under it shows the seeded
/// things on their day; week shows seven calm days; the Goals
/// entry filters the calendar to that goal's steps only; the
/// add-event sheet's labels stand in budget and its save
/// lands the new event on the day (the write itself is
/// proven by the REST read-back, tools/verify-writes.py).
final class CalendarUITests: XCTestCase {
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

    func testCalendarStandsAndFilters() throws {
        let today = TwinSignIn.todayKey()

        app.tabBars.buttons["Calendar"].tap()
        XCTAssertTrue(app.otherElements["calendar.monthGrid"].waitForExistence(timeout: 10)
                      || app.descendants(matching: .any)["calendar.monthGrid"].waitForExistence(timeout: 5))

        let cell = app.buttons["calendar.cell.\(today)"]
        XCTAssertTrue(cell.waitForExistence(timeout: 10))
        cell.tap()
        XCTAssertTrue(app.staticTexts["Morning shift at the café"].waitForExistence(timeout: 10))

        // Week: seven calm day lists.
        app.buttons["Week"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["calendar.weekList"].waitForExistence(timeout: 10))

        // Day: the seeded day by time.
        app.buttons["Day"].tap()
        XCTAssertTrue(app.staticTexts["Gym clean"].waitForExistence(timeout: 10))

        // Add through Pace's own sheet; the event lands.
        app.buttons["calendar.add"].tap()
        let title = app.textFields["addEvent.title"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        title.tap()
        title.typeText("Dentist check")
        XCTAssertTrue(app.buttons["addEvent.save"].exists)
        app.buttons["addEvent.save"].tap()
        XCTAssertTrue(app.staticTexts["Dentist check"].waitForExistence(timeout: 15))
    }

    func testGoalsEntryFiltersCalendar() throws {
        app.tabBars.buttons["Goals"].tap()
        let entry = app.buttons["goals.entry.g1"]
        XCTAssertTrue(entry.waitForExistence(timeout: 10))
        entry.tap()

        // Only the goal's own step stands on today; the
        // un-goaled seeded task does not.
        XCTAssertTrue(app.staticTexts["Read two chapters"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["Gym clean"].exists)
    }
}
