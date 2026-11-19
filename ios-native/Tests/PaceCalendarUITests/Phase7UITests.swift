import XCTest

/// Phase 7: a clear circle and a menu on every task, archive, no Plus row.
final class Phase7UITests: XCTestCase {
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

    private func reveal(_ el: XCUIElement) {
        for _ in 0..<8 {
            if el.exists && el.isHittable { return }
            let list = app.collectionViews.firstMatch
            (list.exists ? list : app).swipeUp()
        }
    }

    func testEveryTaskHasCircleAndMenu() throws {
        app.buttons["tab.today"].tap()
        let tick = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'task.tick.'")).firstMatch
        for _ in 0..<8 where !tick.exists { app.swipeUp() }
        XCTAssertTrue(tick.waitForExistence(timeout: 10), "no circle on a task")
        let menu = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'task.menu.'")).firstMatch
        XCTAssertTrue(menu.waitForExistence(timeout: 10), "no menu on a task")
        menu.tap()
        XCTAssertTrue(app.buttons["Archive"].waitForExistence(timeout: 5), "archive option missing")
        XCTAssertTrue(app.buttons["Delete"].exists, "delete option missing")
    }

    func testArchiveScreenStands() throws {
        app.buttons["tab.more"].tap()
        let settings = any("more.settings")
        reveal(settings)
        XCTAssertTrue(settings.waitForExistence(timeout: 10))
        settings.tap()
        let row = any("settings.archive")
        reveal(row)
        XCTAssertTrue(row.waitForExistence(timeout: 10), "archive row missing")
        row.tap()
        XCTAssertTrue(any("archive.screen").waitForExistence(timeout: 10), "archive screen missing")
    }

    func testNoPlusPayRow() throws {
        app.buttons["tab.more"].tap()
        XCTAssertTrue(any("more.settings").waitForExistence(timeout: 10))
        XCTAssertFalse(any("more.plus").exists, "the pay screen row must be gone")
    }
}
