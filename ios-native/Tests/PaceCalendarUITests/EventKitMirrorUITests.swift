import XCTest

/// EVENTKIT MIRROR DRIVE (return item 6) — the Apple Calendar
/// mirror, driven with the permission ALLOWED for the first
/// time. In every prior drive the sim's Calendar TCC prompt
/// was denied by the runner's handler, so the mirror has
/// never been proven; these two legs prove it from the data
/// side (the sim's Calendar.sqlitedb is read on the Mac after
/// each leg — the proof lives there, not in speculative
/// in-app asserts).
///
/// The bridge, of record (EventKitBridge.swift + TodayView):
/// when her state loads, TodayView's .task asks once via
/// requestFullAccessToEvents(); if granted it syncs — a
/// calendar titled "Pace", every not-done dated task mirrored
/// (start = local date + time, end = start + duration).
/// sync() guards .fullAccess and writes nothing otherwise.
///
/// Leg 1 (negative control): sign in, let the prompt stand
/// UNANSWERED, stand a while, end. Leg 2 (the allow): sign
/// in, wait for the prompt in SpringBoard, tap Allow Full
/// Access, then stand on Today while the mirror writes.
final class EventKitMirrorUITests: XCTestCase {
    private var app: XCUIApplication!
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-PaceTwinConfig"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    /// Negative control: the prompt stands, nobody answers it,
    /// and access is never granted — the mirror must write
    /// nothing (the sqlitedb read after this leg is the proof).
    func testMirrorNegativeControlPromptLeftStanding() throws {
        TwinSignIn.signIn(app)
        let alert = springboard.alerts.firstMatch
        let stood = alert.waitForExistence(timeout: 60)
        print("EKMIRROR NEG: calendar prompt stood = \(stood)")
        if stood {
            let labels = alert.buttons.allElementsBoundByIndex.map { $0.label }
            print("EKMIRROR NEG: alert buttons = \(labels)")
        }
        // Stand with the prompt unanswered; the suspended ask
        // never returns, sync never runs.
        Thread.sleep(forTimeInterval: 15)
        print("EKMIRROR NEG: prompt left unanswered by design; ending")
    }

    /// The allow: tap Allow Full Access on the system prompt,
    /// then stand on Today ~20 s while the mirror writes.
    func testMirrorAllowWritesPaceCalendar() throws {
        TwinSignIn.signIn(app)
        let alert = springboard.alerts.firstMatch
        let stood = alert.waitForExistence(timeout: 60)
        print("EKMIRROR ALLOW: calendar prompt stood = \(stood)")
        XCTAssertTrue(stood, "the Calendar prompt never stood — nothing to allow")
        let labels = alert.buttons.allElementsBoundByIndex.map { $0.label }
        print("EKMIRROR ALLOW: alert buttons = \(labels)")
        let allow = alert.buttons
            .matching(NSPredicate(format: "label CONTAINS %@", "Full Access"))
            .firstMatch
        XCTAssertTrue(allow.exists,
                      "no Allow Full Access button on the prompt; buttons: \(labels)")
        allow.tap()
        print("EKMIRROR ALLOW: tapped the Full Access allow button")
        // The suspended request returns granted; TodayView's
        // .task then runs the mirror from the loaded state.
        Thread.sleep(forTimeInterval: 20)
        print("EKMIRROR ALLOW: stood 20 s on Today after the allow")
    }
}
