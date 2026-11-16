import XCTest

/// ROUND 2 LEGS (her motivation order, 16 Nov): the new
/// bottom-bar items land on their own screens, and the
/// Home progress block stands. Driven by element reads,
/// like every leg in this suite.
final class Round2UITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        TwinSignIn.signIn(app)
    }

    func testHabitsTabLandsOnHabits() throws {
        app.buttons["tab.habits"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["habits.list"]
            .waitForExistence(timeout: 10), "Habits tab never landed on Habits")
    }

    func testTalkTabLandsOnTalk() throws {
        app.buttons["tab.talk"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["talk.box"]
            .waitForExistence(timeout: 10), "Talk tab never landed on Talk")
    }

    func testHomeProgressBlockStands() throws {
        app.buttons["tab.today"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["today.progress"]
            .waitForExistence(timeout: 10), "the Home progress block never stood")
        XCTAssertTrue(app.staticTexts["today.progressLine"]
            .waitForExistence(timeout: 10),
                      "the progress block's done line never stood")
    }
}
