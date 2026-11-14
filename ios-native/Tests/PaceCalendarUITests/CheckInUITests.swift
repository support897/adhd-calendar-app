import XCTest

/// P3 check-in drive (local-xcuitest): the morning question
/// stands while today has no answer; her three words in her
/// order; Great shows the whole day; Bad keeps the
/// essentials and every bare minimum standing (minimums
/// shown shrunk), fills the day to three from the rest in
/// day order, and parks everything else, counted on the
/// parked line — parked, never dropped; re-answering from Today
/// restores it. The feelings write itself is proven by the
/// REST read-back after the run (tools/verify-writes.py) —
/// this drive is the in-app half of the twin proof.
final class CheckInUITests: XCTestCase {
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

    func testCheckInAdaptsTheDay() throws {
        // One more long-ish thing today, added through the
        // app's own sheet (also covers Today -> Add).
        app.buttons["today.add"].tap()
        let title = app.textFields["addEvent.title"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        title.tap()
        title.typeText("Long paperwork")
        app.buttons["addEvent.save"].tap()
        XCTAssertTrue(app.staticTexts["Long paperwork"].waitForExistence(timeout: 15))

        // The question stands, three calm choices in her order.
        XCTAssertTrue(app.staticTexts["checkin.question"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["checkin.low"].exists)
        XCTAssertTrue(app.buttons["checkin.steady"].exists)
        XCTAssertTrue(app.buttons["checkin.full"].exists)

        // Great: the full day stands — every seeded thing.
        app.buttons["checkin.full"].tap()
        XCTAssertTrue(app.staticTexts["Morning shift at the café"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Gym clean"].exists)
        XCTAssertTrue(app.staticTexts["Read two chapters"].exists)
        XCTAssertTrue(app.staticTexts["Long paperwork"].exists)
        XCTAssertFalse(app.staticTexts["checkin.question"].exists)

        // Bad, re-answered from Today: the longest thing parks.
        app.buttons["today.recheck"].tap()
        let bad = app.buttons["checkin.low"]
        XCTAssertTrue(bad.waitForExistence(timeout: 10))
        bad.tap()
        let parked = app.staticTexts["today.parked"]
        XCTAssertTrue(parked.waitForExistence(timeout: 10))
        XCTAssertTrue(parked.label.contains("1"), "expected exactly one parked thing, got: \(parked.label)")
        XCTAssertFalse(app.staticTexts["Morning shift at the café"].exists)
        // On a Bad day the row stands under its minimum
        // version ('Read two chapters (1 page only)'), so
        // this match is BEGINS WITH — the team-leg fix (c)
        // shape (FIX (d)); the meaning — the small thing
        // still stands — is unchanged.
        let readRow = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Read two chapters")).firstMatch
        XCTAssertTrue(readRow.waitForExistence(timeout: 10))

        // Great again: everything returns, and the day ends on
        // "full" — the value the REST read-back verifies.
        app.buttons["today.recheck"].tap()
        let great = app.buttons["checkin.full"]
        XCTAssertTrue(great.waitForExistence(timeout: 10))
        great.tap()
        XCTAssertTrue(app.staticTexts["Morning shift at the café"].waitForExistence(timeout: 10))
    }
}
