import Foundation
import WatchConnectivity

/// Phone side of the Watch: sends today's snapshot, and ticks
/// the next task when the watch taps Done.
final class WatchLink: NSObject, WCSessionDelegate {
    static let shared = WatchLink()
    var onDone: ((String) -> Void)?

    func start() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func push(state: PaceState) {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated,
              WCSession.default.isPaired, WCSession.default.isWatchAppInstalled else { return }
        let today = PaceState.todayString
        let day = DayAdapter.adaptDay(on: today, state: state)
        let next = day.visible.first
        let ctx: [String: Any] = [
            "title": next?.displayTitle ?? "Nothing left. Rest well.",
            "done": day.done.count,
            "progress": DayAdapter.dayScore(day),
            "taskId": next?.task.id ?? "",
        ]
        try? WCSession.default.updateApplicationContext(ctx)
    }

    func session(_ s: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}
    func sessionDidBecomeInactive(_ s: WCSession) {}
    func sessionDidDeactivate(_ s: WCSession) { s.activate() }
    func session(_ s: WCSession, didReceiveMessage message: [String: Any]) {
        if let id = message["done"] as? String, !id.isEmpty {
            DispatchQueue.main.async { self.onDone?(id) }
        }
    }
}
