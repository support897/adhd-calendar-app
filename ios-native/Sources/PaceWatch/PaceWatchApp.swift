import SwiftUI
import WatchConnectivity

/// The Pace Watch face: today's ring, the next step, one tap
/// to say it is done. The phone is the brain; the watch shows
/// its latest snapshot and sends the tap back.
final class WatchModel: NSObject, ObservableObject, WCSessionDelegate {
    @Published var title = "Open Pace"
    @Published var done = 0
    @Published var progress = 0.0
    @Published var taskId: String? = nil

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    nonisolated func apply(_ ctx: [String: Any]) {
        DispatchQueue.main.async {
            self.title = ctx["title"] as? String ?? self.title
            self.done = ctx["done"] as? Int ?? self.done
            self.progress = ctx["progress"] as? Double ?? self.progress
            self.taskId = ctx["taskId"] as? String
        }
    }

    func markDone() {
        guard let id = taskId, WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["done": id], replyHandler: nil, errorHandler: nil)
    }

    nonisolated func session(_ s: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        apply(s.receivedApplicationContext)
    }
    nonisolated func session(_ s: WCSession, didReceiveApplicationContext ctx: [String: Any]) { apply(ctx) }
}

@main
struct PaceWatchApp: App {
    @StateObject private var model = WatchModel()
    var body: some Scene {
        WindowGroup {
            let water = Color(red: 0x5B / 255, green: 0x6B / 255, blue: 0xD5 / 255)
            VStack(spacing: 6) {
                ZStack {
                    Circle().stroke(water.opacity(0.3), lineWidth: 8)
                    Circle().trim(from: 0, to: max(model.progress, 0.001))
                        .stroke(water, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text("\(model.done)").font(.system(size: 22, weight: .bold))
                }
                .frame(width: 70, height: 70)
                Text(model.title).font(.system(size: 14, weight: .semibold))
                    .multilineTextAlignment(.center).lineLimit(2)
                Button("Done") { model.markDone() }
                    .tint(water)
                    .disabled(model.taskId == nil)
            }
        }
    }
}
