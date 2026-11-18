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
        box.typeText("Water the garden")
        for _ in 0..<5 {
            let next = app.buttons["wizard.next"]
            XCTAssertTrue(next.waitForExistence(timeout: 5))
            next.tap()
        }
        XCTAssertTrue(any("wizard.review").waitForExistence(timeout: 10), "review missing")
        app.buttons["wizard.next"].tap()
        XCTAssertTrue(app.staticTexts["Water the garden"].waitForExistence(timeout: 15), "wizard task never landed")
    }

    func testGoalWizardStands() throws {
        app.buttons["tab.add"].tap()
        app.buttons["plus.goal"].tap()
        let t = any("wizard.goalTitle")
        XCTAssertTrue(t.waitForExistence(timeout: 10))
        t.tap()
        t.typeText("Read twelve books")
        for _ in 0..<5 { app.buttons["wizard.next"].tap() }
        XCTAssertTrue(any("wizard.goalReview").waitForExistence(timeout: 10), "goal review missing")
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
