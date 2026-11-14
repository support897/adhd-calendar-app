import XCTest

/// P6 drives (local-xcuitest): talk to it (words in, the
/// event lands — parsed on device by the shipped parser),
/// the menu with the kindness door FIRST, and the settings
/// door (name + theme write through kind 11, proven by
/// tools/verify-writes-p6.py). Runs last among the write
/// drives: it renames the team tester and flips the theme,
/// and the drive re-seeds before the final full-suite run.
final class P6UITests: XCTestCase {
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

    func testMenuKindnessFirst() throws {
        app.tabBars.buttons["More"].tap()
        let kindness = app.buttons["more.kindness"]
        let talk = app.buttons["more.talk"]
        XCTAssertTrue(kindness.waitForExistence(timeout: 10))
        XCTAssertTrue(talk.exists)
        XCTAssertTrue(kindness.frame.minY < talk.frame.minY,
                      "the kindness door must stand FIRST in the menu")
        XCTAssertTrue(kindness.label.contains("Join the AI kindness revolution"))

        kindness.tap()
        XCTAssertTrue(app.descendants(matching: .any)["kindness.screen"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["kindness.amount.10"].exists)
        app.buttons["kindness.amount.10"].tap()
        // Giving is collected in Safari — the sheet presents.
        let done = app.buttons["Done"]
        XCTAssertTrue(done.waitForExistence(timeout: 15))
        done.tap()
    }

    func testTalkParsesOnDevice() throws {
        app.tabBars.buttons["More"].tap()
        app.buttons["more.talk"].tap()
        let box = app.textViews["talk.box"]
        XCTAssertTrue(box.waitForExistence(timeout: 10))
        box.tap()
        box.typeText("Call mum tomorrow at 3pm for 20 minutes")
        app.buttons["talk.send"].tap()
        XCTAssertTrue(app.staticTexts["talk.added"].waitForExistence(timeout: 15))
    }

    func testSettingsDoor() throws {
        app.tabBars.buttons["More"].tap()
        app.buttons["more.settings"].tap()
        let name = app.textFields["settings.name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10))
        name.tap()
        name.doubleTap()
        name.typeText("Team Renamed")
        // Replace-all: select the whole field first if the
        // double tap did not.
        if (name.value as? String)?.contains("Team Tester") == true {
            name.press(forDuration: 1.0)
            let selectAll = app.menuItems["Select All"]
            if selectAll.waitForExistence(timeout: 3) { selectAll.tap() }
            name.typeText("Team Renamed")
        }
        app.buttons["settings.saveName"].tap()

        let theme = app.segmentedControls["settings.theme"]
        if theme.waitForExistence(timeout: 5) {
            theme.buttons["Dark"].tap()
        } else {
            // Picker styles vary; the theme write is proven by
            // REST in verify-writes-p6 either way when driven.
            let picker = app.buttons["settings.theme"]
            XCTAssertTrue(picker.waitForExistence(timeout: 5))
            picker.tap()
            app.buttons["Dark"].tap()
        }
    }
}
