import XCTest

/// P5 drives (local-xcuitest): the Pace Way cuts a new goal
/// into steps (the count path: "Read 12 chapters" becomes
/// twelve small steps), a step ticks in place, the goal
/// shares by link, and the divide assigns the open steps.
/// Write kinds 8–10 proven by tools/verify-writes-p5.py;
/// the shared goal itself is read back over REST there too.
final class P5UITests: XCTestCase {
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

    func testGoalPlanShareDivide() throws {
        app.tabBars.buttons["Goals"].tap()
        app.buttons["goals.add"].tap()

        let title = app.textFields["goalNew.title"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        title.tap()
        title.typeText("Read 12 chapters")
        app.buttons["goalNew.save"].tap()

        // The card stands, short name only, one colour.
        XCTAssertTrue(app.staticTexts["Read 12 chapters"].waitForExistence(timeout: 15))

        // Open the new goal's detail: its steps stand, cut
        // from its own words, one per plan day.
        let newCard = app.buttons.matching(
            NSPredicate(format: "label CONTAINS 'Read 12 chapters'")).firstMatch
        XCTAssertTrue(newCard.waitForExistence(timeout: 10))
        newCard.tap()

        XCTAssertTrue(app.descendants(matching: .any)["goal.detail"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Read chapter 1"].waitForExistence(timeout: 10))

        // Tick the first step in place.
        let firstTick = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH 'goal.tick.'")).element(boundBy: 0)
        XCTAssertTrue(firstTick.waitForExistence(timeout: 10))
        firstTick.tap()

        // Share it: the link stands.
        app.buttons["goal.share"].tap()
        let create = app.buttons["share.create"]
        XCTAssertTrue(create.waitForExistence(timeout: 10))
        create.tap()
        let link = app.staticTexts["share.link"]
        XCTAssertTrue(link.waitForExistence(timeout: 20))
        XCTAssertTrue(link.label.contains("join="), "share link should carry the join id, got: \(link.label)")

        // The divide assigns the open steps (one member: all
        // open steps come to me).
        app.buttons["share.divide"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["share.steps"].waitForExistence(timeout: 15))
    }
}
