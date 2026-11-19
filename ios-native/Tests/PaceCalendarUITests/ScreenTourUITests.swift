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
        for id in ["todos", "habits", "progress", "settings", "tools", "kindness"] {
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
}
