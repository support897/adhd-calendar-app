import XCTest

/// Phase 8: the review fixes and the new doors. Delete account sheet,
/// privacy row, bug and feedback icons, the kindness rainbow.
final class Phase8UITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        TwinSignIn.signIn(app)
        _ = app.staticTexts["proof.greeting"].waitForExistence(timeout: 20)
        let sb = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for _ in 0..<3 {
            var hit = false
            for label in ["Not Now", "Allow Full Access", "Allow While Using App", "Allow", "OK"] {
                let b = sb.alerts.buttons[label]
                if b.exists { b.tap(); hit = true; Thread.sleep(forTimeInterval: 0.8) }
            }
            if !hit { break }
        }
    }

    private func dismissAlerts() {
        let sb = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for _ in 0..<3 {
            var hit = false
            for label in ["Not Now", "Allow Full Access", "Allow While Using App", "Allow", "OK"] {
                let b = sb.alerts.buttons[label]
                if b.exists { b.tap(); hit = true; Thread.sleep(forTimeInterval: 0.8) }
            }
            if !hit { break }
        }
    }

    /// Taps, and taps again if a system alert swallowed the first tap.
    private func tapUntil(_ el: XCUIElement, appears target: XCUIElement) {
        for _ in 0..<4 {
            dismissAlerts()
            if el.exists { el.tap() }
            if target.waitForExistence(timeout: 4) { return }
        }
    }

    private func any(_ id: String) -> XCUIElement { app.descendants(matching: .any)[id] }
    private func shot(_ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a)
    }

    func testDeleteAccountSheetAndPrivacyRow() throws {
        tapUntil(app.buttons["tab.more"], appears: app.buttons["more.settings"])
        tapUntil(app.buttons["more.settings"], appears: any("settings.deleteAccount"))
        dismissAlerts()
        let del = any("settings.deleteAccount")
        for _ in 0..<12 where !del.exists || !del.isHittable { app.swipeUp() }
        XCTAssertTrue(any("settings.privacy").exists, "privacy row missing")
        XCTAssertTrue(del.waitForExistence(timeout: 5))
        tapUntil(del, appears: any("delete.title"))
        XCTAssertTrue(any("delete.title").waitForExistence(timeout: 8), "delete sheet did not open")
        XCTAssertTrue(any("delete.confirm").exists)
        shot("80-delete-sheet")
        any("delete.cancel").tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 8), "cancel must keep the account and return")
    }

    func testBugAndFeedbackIcons() throws {
        tapUntil(app.buttons["tab.more"], appears: app.buttons["more.kindness"])
        for _ in 0..<10 where !any("more.bug").exists { app.swipeUp() }
        XCTAssertTrue(any("more.bug").waitForExistence(timeout: 10), "bug row missing")
        tapUntil(any("more.bug"), appears: any("bug.text"))
        XCTAssertTrue(any("bug.text").waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["bug.send"].isEnabled, "empty report must not send")
        shot("81-bug")
        app.navigationBars.buttons.firstMatch.tap()
        for _ in 0..<10 where !any("more.feedback").exists { app.swipeUp() }
        any("more.feedback").tap()
        XCTAssertTrue(any("feedback.text").waitForExistence(timeout: 8))
        XCTAssertTrue(any("feedback.anonymous").exists, "anonymous choice missing")
        shot("82-feedback")
    }

    func testKindnessRainbow() throws {
        tapUntil(app.buttons["tab.more"], appears: app.buttons["more.kindness"])
        tapUntil(app.buttons["more.kindness"], appears: any("kindness.screen"))
        XCTAssertTrue(any("kindness.screen").waitForExistence(timeout: 8))
        XCTAssertTrue(any("kindness.rainbow").exists)
        Thread.sleep(forTimeInterval: 3)
        shot("83-kindness")
        tapUntil(any("kindness.rainbow"), appears: any("kindness.wall"))
        XCTAssertTrue(any("kindness.wall").waitForExistence(timeout: 8), "wall did not open")
        shot("84-wall")
        app.buttons["Done"].tap()
        for _ in 0..<6 where !any("kindness.disclosure").exists { app.swipeUp() }
        XCTAssertTrue(any("kindness.join").exists, "free join button missing")
        XCTAssertTrue(any("kindness.disclosure").exists, "gift disclosure missing")
        shot("85-kindness-join")
    }
}
