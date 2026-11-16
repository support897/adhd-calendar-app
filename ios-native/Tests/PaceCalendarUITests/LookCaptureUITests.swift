import XCTest

/// LOOK CAPTURES — finished-state pictures for the contrast
/// round (and, appended below as the run goes, the motivation
/// round). This test DRIVES by element reads only; the
/// screenshots are look checks on the finished state, never
/// a driving method (the standing no-screenshots-for-driving
/// law). Captures land as attachments in the result bundle.
///
/// The phone condition is hers from the build-55 pictures:
/// the SIM stands in DARK appearance while the app stands on
/// its default WHITE theme — the exact mismatch that made
/// her titles white-on-white and the More card near-black.
/// After the contrast pin, the app's chrome must hold its
/// own light world under that dark phone.
final class LookCaptureUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
    }

    private func snap(_ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }

    func testCaptureContrastScreens() throws {
        XCUIDevice.shared.appearance = .dark
        defer { XCUIDevice.shared.appearance = .light }
        app.launch()
        TwinSignIn.signIn(app)

        // Today — white theme, dark phone.
        XCTAssertTrue(app.staticTexts["proof.greeting"].waitForExistence(timeout: 15))
        snap("contrast-01-today-white-theme-dark-phone")

        // Goals.
        app.buttons["tab.goals"].tap()
        XCTAssertTrue(app.navigationBars["Goals"].waitForExistence(timeout: 10))
        snap("contrast-02-goals-white-theme-dark-phone")

        // Calendar.
        app.buttons["tab.calendar"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["calendar.mode"].waitForExistence(timeout: 10))
        snap("contrast-03-calendar-white-theme-dark-phone")

        // More — the black-card fault's own screen.
        app.buttons["tab.more"].tap()
        XCTAssertTrue(app.navigationBars["More"].waitForExistence(timeout: 10))
        snap("contrast-04-more-white-theme-dark-phone")

        // Round 2: the new Habits tab on its own screen
        // (the six-item bar stands in every capture above;
        // this one proves the new item lands somewhere real).
        app.buttons["tab.habits"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["habits.list"].waitForExistence(timeout: 10))
        snap("motivation-02-habits-tab")
        app.buttons["tab.more"].tap()
        XCTAssertTrue(app.navigationBars["More"].waitForExistence(timeout: 10))

        // Dark theme: one screen (Today) with the world dark.
        app.buttons["more.settings"].tap()
        XCTAssertTrue(app.textFields["settings.name"].waitForExistence(timeout: 10))
        let theme = app.segmentedControls["settings.theme"]
        if theme.waitForExistence(timeout: 5) {
            theme.buttons["Dark"].tap()
        } else {
            let picker = app.buttons["settings.theme"]
            XCTAssertTrue(picker.waitForExistence(timeout: 5))
            picker.tap()
            app.buttons["Dark"].tap()
        }
        app.buttons["tab.today"].tap()
        XCTAssertTrue(app.staticTexts["proof.greeting"].waitForExistence(timeout: 10))
        snap("contrast-05-today-dark-theme")

        // Restore the white theme for whatever runs next.
        // The More stack keeps its place across tab switches,
        // so it may still stand on Settings from the visit
        // above — go straight to the name field if it does.
        if !app.textFields["settings.name"].waitForExistence(timeout: 3) {
            app.buttons["tab.more"].tap()
            app.buttons["more.settings"].tap()
        }
        XCTAssertTrue(app.textFields["settings.name"].waitForExistence(timeout: 10))
        let themeBack = app.segmentedControls["settings.theme"]
        if themeBack.waitForExistence(timeout: 5) {
            themeBack.buttons["White"].tap()
        } else {
            let picker = app.buttons["settings.theme"]
            XCTAssertTrue(picker.waitForExistence(timeout: 5))
            picker.tap()
            app.buttons["White"].tap()
        }
        XCUIDevice.shared.appearance = .light
    }
}
