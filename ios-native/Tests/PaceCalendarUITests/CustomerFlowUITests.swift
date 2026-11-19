import XCTest

/// A customer's walk (handout): add by sentence, details, goal,
/// habit, to-do, Talk, calendar views, background colour.
final class CustomerFlowUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        TwinSignIn.signIn(app)
    }

    private func any(_ id: String) -> XCUIElement { app.descendants(matching: .any)[id] }

    private func typeInto(_ el: XCUIElement, _ text: String) {
        for _ in 0..<3 { el.tap(); Thread.sleep(forTimeInterval: 0.8); if app.keyboards.count > 0 { break } }
        el.typeText(text)
    }

    private func shot(_ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot())
        a.name = name; a.lifetime = .keepAlways; add(a)
    }

    func testAddTaskBySentenceThenDetails() throws {
        app.buttons["tab.add"].tap()
        app.buttons["plus.task"].tap()
        let box = any("wizard.text")
        XCTAssertTrue(box.waitForExistence(timeout: 10))
        typeInto(box, "Ring the plumber tomorrow at 9am for 30 minutes")
        XCTAssertTrue(any("wizard.read").waitForExistence(timeout: 10))
        shot("10-task-sentence")
        app.swipeUp(); app.swipeUp()
        XCTAssertTrue(app.buttons["task.details"].waitForExistence(timeout: 5))
        app.buttons["task.details"].tap()
        XCTAssertTrue(any("addEvent.title").waitForExistence(timeout: 5), "details did not open")
        shot("11-task-details")
        if !app.buttons["task.add"].isHittable { app.swipeUp() }
        app.buttons["task.add"].tap()
        let gone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: any("plus.chooser"))
        XCTAssertEqual(XCTWaiter().wait(for: [gone], timeout: 20), .completed, "add sheet did not close")
    }

    func testAddGoalBySentence() throws {
        app.buttons["tab.add"].tap()
        app.buttons["plus.goal"].tap()
        let t = any("wizard.goalTitle")
        XCTAssertTrue(t.waitForExistence(timeout: 10))
        typeInto(t, "Run a 5k by March")
        XCTAssertTrue(any("goal.preview").waitForExistence(timeout: 10))
        shot("12-goal-sentence")
        app.swipeUp(); app.swipeUp()
        XCTAssertTrue(app.buttons["goal.make"].waitForExistence(timeout: 5))
        app.buttons["goal.make"].tap()
        let gone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: any("plus.chooser"))
        XCTAssertEqual(XCTWaiter().wait(for: [gone], timeout: 20), .completed, "goal sheet did not close")
    }

    func testCalendarOldLook() throws {
        app.buttons["tab.calendar"].tap()
        XCTAssertTrue(any("calendar.weekstrip").waitForExistence(timeout: 10), "week strip missing")
        shot("13-calendar-month")
        for name in ["Day", "Week", "Agenda", "Year", "Month"] {
            let b = app.buttons[name]
            XCTAssertTrue(b.waitForExistence(timeout: 5), "\(name) missing")
            b.tap()
            Thread.sleep(forTimeInterval: 0.6)
        }
        app.buttons["Day"].tap()
        shot("14-calendar-day")
    }

    func testTodoWriteFast() throws {
        app.buttons["tab.more"].tap()
        app.buttons["more.todos"].tap()
        let f = app.textFields["todos.field"]
        XCTAssertTrue(f.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["todos.mic"].exists && any("todos.photo").exists)
        typeInto(f, "Post the parcel")
        app.buttons["todos.add"].tap()
        XCTAssertTrue(app.staticTexts["Post the parcel"].waitForExistence(timeout: 15))
        shot("15-todo")
    }

    func testBackgroundColourSwatch() throws {
        app.buttons["tab.more"].tap()
        app.buttons["more.settings"].tap()
        let theme = any("settings.theme")
        XCTAssertTrue(theme.waitForExistence(timeout: 10))
        theme.tap()
        let dark = app.buttons["Dark"].exists ? app.buttons["Dark"] : app.staticTexts["Dark"]
        if dark.waitForExistence(timeout: 5) { dark.tap() }
        let sw = app.buttons["settings.bg.2"]
        if !sw.waitForExistence(timeout: 8) { app.swipeUp() }
        XCTAssertTrue(sw.waitForExistence(timeout: 8), "background swatches missing in Dark")
        sw.tap()
        shot("16-dark-green-bg")
    }
}
