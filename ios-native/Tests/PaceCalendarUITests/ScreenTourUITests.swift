import XCTest

/// Customer walk-through: signs in as the twin tester and snaps every
/// main screen (top + scrolled) so the phone look can be reviewed on
/// any simulator size. Look checks only; driving is by element reads.
final class ScreenTourUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        TwinSignIn.signIn(app)
    }

    private func dismissAlerts() {
        let sb = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for _ in 0..<4 {
            var hit = false
            for label in ["Not Now", "Allow Full Access", "Allow While Using App", "Allow", "OK"] {
                let b = sb.alerts.buttons[label]
                if b.exists { b.tap(); hit = true; Thread.sleep(forTimeInterval: 0.8) }
            }
            if !hit { break }
        }
    }

    private func snap(_ name: String) {
        dismissAlerts()
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }

    private func snapScrolled(_ name: String) {
        snap(name + "-a")
        for i in 1...3 {
            app.swipeUp()
            snap(name + "-" + String(UnicodeScalar(97 + i)!))
        }
        for _ in 0..<4 { app.swipeDown() }
    }

    func testTour() throws {
        XCTAssertTrue(app.staticTexts["proof.greeting"].waitForExistence(timeout: 20))
        Thread.sleep(forTimeInterval: 3); dismissAlerts()
        snapScrolled("01-today")
        for (id, name) in [("goals", "02-goals"), ("calendar", "03-calendar"), ("habits", "04-habits"), ("talk", "05-talk"), ("more", "06-more")] {
            app.buttons["tab." + id].tap()
            Thread.sleep(forTimeInterval: 1.5)
            snapScrolled(name)
        }
        // Calendar modes
        app.buttons["tab.calendar"].tap()
        let mode = app.descendants(matching: .any)["calendar.mode"]
        if mode.waitForExistence(timeout: 5) {
            for label in ["Week", "Month", "Year", "Agenda"] {
                if mode.buttons[label].exists { mode.buttons[label].tap(); Thread.sleep(forTimeInterval: 1); snap("03-calendar-" + label) }
            }
        }
        // Plus chooser
        app.buttons["tab.add"].tap()
        Thread.sleep(forTimeInterval: 1.5)
        snap("07-plus-chooser")
        for id in ["task", "goal", "habit", "todo", "form"] {
            app.buttons["tab.add"].tap(); Thread.sleep(forTimeInterval: 1)
            let tile = app.buttons["plus." + id]
            if tile.exists { tile.tap(); Thread.sleep(forTimeInterval: 1.5); snap("08-wizard-" + id)
                if app.navigationBars.buttons.element(boundBy: 0).exists { app.navigationBars.buttons.element(boundBy: 0).tap() }; app.swipeDown() }
        }
        // More -> every row
        app.buttons["tab.more"].tap()
        Thread.sleep(forTimeInterval: 1)
        for id in ["todos", "habits", "progress", "settings", "tools"] {
            let row = app.buttons["more." + id]
            if !row.exists { app.swipeUp() }
            if row.exists && row.isHittable {
                row.tap(); Thread.sleep(forTimeInterval: 1.5)
                snapScrolled("09-more-" + id)
                if app.navigationBars.buttons.element(boundBy: 0).exists { app.navigationBars.buttons.element(boundBy: 0).tap() }
                Thread.sleep(forTimeInterval: 1)
            }
        }
    }

    func testHabitWizardLook() throws {
        XCTAssertTrue(app.staticTexts["proof.greeting"].waitForExistence(timeout: 20))
        Thread.sleep(forTimeInterval: 2); dismissAlerts()
        app.buttons["tab.habits"].tap()
        let add = app.buttons["habits.add"]
        XCTAssertTrue(add.waitForExistence(timeout: 10))
        add.tap()
        let f = app.textFields["wizard.habitName"]
        XCTAssertTrue(f.waitForExistence(timeout: 10))
        f.tap(); f.typeText("Drink water")
        Thread.sleep(forTimeInterval: 1); snap("20-habit-name")
        func next() { let n = app.buttons["wizard.next"]; if n.isHittable { n.tap() } else { app.swipeUp(); n.tap() }; Thread.sleep(forTimeInterval: 1.2) }
        next(); snap("21-habit-often")
        let many = app.buttons["Many times a day"]
        XCTAssertTrue(many.waitForExistence(timeout: 5)); many.tap()
        Thread.sleep(forTimeInterval: 1); snap("22-habit-perday")
        next(); snap("23-habit-when")
        next(); snap("24-habit-look")
        app.swipeUp(); snap("25-habit-look-b")
        app.swipeUp(); snap("26-habit-look-c")
        let n = app.buttons["wizard.next"]
        for _ in 0..<4 where !n.isHittable { app.swipeDown() }
        next(); snap("27-habit-ready")
        next()
        XCTAssertTrue(app.staticTexts["Drink water"].waitForExistence(timeout: 15))
        snap("28-habit-list")
        let newKind = app.buttons["task.kind.new"]
        _ = newKind
    }
}
