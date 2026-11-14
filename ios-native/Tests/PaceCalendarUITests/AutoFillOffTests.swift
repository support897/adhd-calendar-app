import XCTest

/// ONE-OFF simulator preparation — the SIM AUTOFILL LAW:
/// on a fresh simulator of this runtime, AutoFill Passwords
/// and Passkeys must be OFF before the first drive, or typing
/// into a SecureField dies after the first keystroke.
/// Run once per fresh sim, before any door drive.
/// The switch only flips on a coordinate tap at dx 0.9 —
/// a plain element tap does not flip it (law of record).
final class AutoFillOffTests: XCTestCase {

    func testTurnOffAutoFillPasswords() throws {
        let prefs = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        prefs.launch()

        let general = prefs.staticTexts["General"]
        XCTAssertTrue(general.waitForExistence(timeout: 20), "Settings root never showed General")
        general.tap()

        let autoFill = prefs.staticTexts["AutoFill & Passwords"]
        var tries = 0
        while !autoFill.exists && tries < 10 {
            prefs.swipeUp()
            tries += 1
        }
        XCTAssertTrue(autoFill.waitForExistence(timeout: 10), "AutoFill & Passwords row not found")
        autoFill.tap()

        let toggle = prefs.switches["AutoFill Passwords and Passkeys"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 10), "AutoFill switch not found")
        if (toggle.value as? String) == "1" {
            toggle.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        }
        XCTAssertEqual(toggle.value as? String, "0", "AutoFill is still on")
    }
}
