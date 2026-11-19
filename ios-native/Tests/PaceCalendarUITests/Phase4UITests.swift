import XCTest

/// Phase 4 legs: the plus opens a chooser, the task wizard goes
/// step by step and adds, the goal wizard stands, the streak card
/// shows on Habits, a task can start its focus room, and Talk has
/// the photo reader. Element reads and one add.
final class Phase4UITests: XCTestCase {
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

    func testPlusChooserAndTaskWizardAdds() throws {
        app.buttons["tab.add"].tap()
        XCTAssertTrue(any("plus.chooser").waitForExistence(timeout: 10), "chooser missing")
        app.buttons["plus.task"].tap()
        let box = any("wizard.text")
        XCTAssertTrue(box.waitForExistence(timeout: 10), "wizard text missing")
        box.tap()
        box.typeText("Water the garden tomorrow at 9am for 20 minutes")
        XCTAssertTrue(any("wizard.read").waitForExistence(timeout: 10), "Pace never showed what it read")
        let add = app.buttons["task.add"]
        XCTAssertTrue(add.waitForExistence(timeout: 5))
        add.tap()
        let gone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: any("plus.chooser"))
        XCTAssertEqual(XCTWaiter().wait(for: [gone], timeout: 20), .completed, "the add sheet never closed after Add it")
    }

    func testGoalWizardStands() throws {
        app.buttons["tab.add"].tap()
        app.buttons["plus.goal"].tap()
        let t = any("wizard.goalTitle")
        XCTAssertTrue(t.waitForExistence(timeout: 10))
        t.tap()
        t.typeText("Read twelve books")
        XCTAssertTrue(any("wizard.goalReview").waitForExistence(timeout: 10), "goal steps preview missing")
        XCTAssertTrue(app.buttons["goal.make"].waitForExistence(timeout: 5))
    }

    func testHabitsShowStreakCard() throws {
        app.buttons["tab.habits"].tap()
        XCTAssertTrue(any("habits.streak").waitForExistence(timeout: 15), "streak card missing")
    }

    func testTaskCanStartFocusRoom() throws {
        app.buttons["tab.today"].tap()
        let start = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'task.start.'")).firstMatch
        if !start.waitForExistence(timeout: 15) { app.swipeUp() }
        XCTAssertTrue(start.waitForExistence(timeout: 10), "no start button on a task")
        if !start.isHittable { app.swipeUp() }
        start.tap()
        XCTAssertTrue(any("focus.screen").waitForExistence(timeout: 10), "focus room never opened")
    }

    func testTalkHasPhotoReader() throws {
        app.buttons["tab.talk"].tap()
        XCTAssertTrue(any("talk.photo").waitForExistence(timeout: 10), "photo reader missing")
    }
}
