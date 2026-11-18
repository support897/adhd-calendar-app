import Foundation
import WidgetKit

/// Publishes today's picture to the widgets (shared App Group).
enum WidgetBridge {
    static func publish(state: PaceState) {
        let today = PaceState.todayString
        let adapted = DayAdapter.adaptDay(on: today, state: state)
        let next = adapted.visible.first
        let snap = WidgetSnapshot(
            nextTitle: next?.displayTitle ?? "Nothing left. Rest well.",
            nextTime: next?.task.time,
            done: adapted.done.count,
            total: adapted.done.count + adapted.visible.count,
            progress: DayAdapter.dayScore(adapted),
            week: WeekData.days(state).map { $0.score },
            updated: Date())
        snap.save()
        WidgetCenter.shared.reloadAllTimelines()
        WatchLink.shared.push(state: state)
    }
}
