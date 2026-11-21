import XCTest

/// App Store screenshots: one clean frame per main screen, on the 6.9 inch simulator.
final class Phase9ShotsUITests: XCTestCase {
    func testStoreShots() throws {
        continueAfterFailure = true
        let app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        TwinSignIn.signIn(app)
        XCTAssertTrue(app.staticTexts["proof.greeting"].waitForExistence(timeout: 25))
        Thread.sleep(forTimeInterval: 3)
        func dismiss() {
            let sb = XCUIApplication(bundleIdentifier: "com.apple.springboard")
            for _ in 0..<3 {
                var hit = false
                for l in ["Not Now", "Allow Full Access", "Allow While Using App", "Allow", "OK"] {
                    let b = sb.alerts.buttons[l]; if b.exists { b.tap(); hit = true; Thread.sleep(forTimeInterval: 0.8) }
                }
                if !hit { break }
            }
        }
        func snap(_ n: String) {
            dismiss()
            let a = XCTAttachment(screenshot: app.screenshot()); a.name = n; a.lifetime = .keepAlways; add(a)
        }
        dismiss()
        snap("91-today")
        for (id, n) in [("goals", "92-goals"), ("calendar", "93-calendar"), ("habits", "94-habits")] {
            app.buttons["tab." + id].tap(); Thread.sleep(forTimeInterval: 2); snap(n)
        }
        app.buttons["tab.add"].tap()
        if app.buttons["plus.task"].waitForExistence(timeout: 8) {
            app.buttons["plus.task"].tap()
            let box = app.descendants(matching: .any)["wizard.text"]
            if box.waitForExistence(timeout: 8) {
                box.tap(); Thread.sleep(forTimeInterval: 1)
                box.typeText("Ring the plumber tomorrow at 9am for 30 minutes")
                _ = app.descendants(matching: .any)["wizard.read"].waitForExistence(timeout: 8)
                Thread.sleep(forTimeInterval: 1); snap("95-add-task")
            }
        }
        app.terminate(); app.launch()
        _ = app.staticTexts["proof.greeting"].waitForExistence(timeout: 25)
        app.buttons["tab.more"].tap(); Thread.sleep(forTimeInterval: 1.5); snap("96-more")
    }
}
