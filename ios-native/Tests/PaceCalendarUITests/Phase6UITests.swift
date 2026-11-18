import XCTest

/// Phase 6: the tour can be replayed from Settings, steps through, and skips.
final class Phase6UITests: XCTestCase {
    func testTourReplaysAndSkips() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
        TwinSignIn.signIn(app)
        app.buttons["tab.more"].tap()
        let row = app.descendants(matching: .any)["more.settings"]
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        row.tap()
        let replay = app.descendants(matching: .any)["settings.tour"]
        for _ in 0..<6 where !replay.exists || !replay.isHittable { app.swipeUp() }
        XCTAssertTrue(replay.waitForExistence(timeout: 10), "replay row missing")
        replay.tap()
        XCTAssertTrue(app.descendants(matching: .any)["tour.screen"].waitForExistence(timeout: 10), "tour never opened")
        app.buttons["tour.next"].tap()
        XCTAssertTrue(app.buttons["tour.skip"].waitForExistence(timeout: 5))
        app.buttons["tour.skip"].tap()
        XCTAssertFalse(app.descendants(matching: .any)["tour.screen"].waitForExistence(timeout: 3), "skip did not close the tour")
    }
}
