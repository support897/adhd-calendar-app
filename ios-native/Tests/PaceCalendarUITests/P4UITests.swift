import XCTest

/// P4 drives (local-xcuitest): to do add + tick, habit tick,
/// progress ring, and a task ticked in place on Today. Every
/// write is proven by the REST read-back after the run
/// (tools/verify-writes-p4.py) — this drive is the in-app
/// half of the twin proofs for write kinds 3–7.
final class P4UITests: XCTestCase {
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

    func testTodosHabitsProgressAndTaskTick() throws {
        // A task ticked in place on Today (kind 3).
        let gymTick = app.buttons["task.tick.t2"]
        XCTAssertTrue(gymTick.waitForExistence(timeout: 15))
        gymTick.tap()
        // The tick lands and the row settles done; give the
        // write a breath, then move on (the REST read-back is
        // the proof, not this screen).
        XCTAssertTrue(app.buttons["task.tick.t2"].waitForExistence(timeout: 10))

        // To do: add one fast, tick the seeded one (kinds 4+5).
        app.tabBars.buttons["More"].tap()
        app.buttons["more.todos"].tap()
        let field = app.textFields["todos.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.tap()
        field.typeText("Water the plants")
        app.buttons["todos.add"].tap()
        XCTAssertTrue(app.staticTexts["Water the plants"].waitForExistence(timeout: 15))

        let milkTick = app.buttons["todos.tick.td1"]
        XCTAssertTrue(milkTick.waitForExistence(timeout: 10))
        milkTick.tap()

        // Habits: tick the seeded Stretch (kind 6).
        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.buttons["more.habits"].tap()
        let stretchTick = app.buttons["habits.tick.h1"]
        XCTAssertTrue(stretchTick.waitForExistence(timeout: 10))
        stretchTick.tap()

        // Progress: the ring and the line stand.
        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.buttons["more.progress"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["progress.ring"].waitForExistence(timeout: 10))
        let line = app.staticTexts["progress.line"]
        XCTAssertTrue(line.waitForExistence(timeout: 5))
        XCTAssertTrue(line.label.contains("done today"), "progress line should count done things, got: \(line.label)")
    }
}
