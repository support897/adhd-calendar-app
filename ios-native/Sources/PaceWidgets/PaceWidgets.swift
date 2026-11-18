import WidgetKit
import SwiftUI

private let water = Color(red: 0x5B / 255, green: 0x6B / 255, blue: 0xD5 / 255)
private let waterDeep = Color(red: 0x48 / 255, green: 0x58 / 255, blue: 0xC4 / 255)
private let waterLight = Color(red: 0xAE / 255, green: 0xB8 / 255, blue: 0xEC / 255)
private let pine = Color(red: 0x21 / 255, green: 0x39 / 255, blue: 0x2E / 255)

struct PaceEntry: TimelineEntry {
    let date: Date
    let snap: WidgetSnapshot
}

struct PaceProvider: TimelineProvider {
    func placeholder(in context: Context) -> PaceEntry { PaceEntry(date: Date(), snap: .empty) }
    func getSnapshot(in context: Context, completion: @escaping (PaceEntry) -> Void) {
        completion(PaceEntry(date: Date(), snap: WidgetSnapshot.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<PaceEntry>) -> Void) {
        let entry = PaceEntry(date: Date(), snap: WidgetSnapshot.load())
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900))))
    }
}

struct Ring: View {
    var progress: Double
    var line: CGFloat = 7
    var fill: Color = water
    var track: Color = waterLight.opacity(0.4)
    var body: some View {
        ZStack {
            Circle().stroke(track, lineWidth: line)
            Circle().trim(from: 0, to: max(min(progress, 1), 0.001))
                .stroke(fill, style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

struct SmallView: View {
    let snap: WidgetSnapshot
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("NEXT").font(.system(size: 10, weight: .bold)).foregroundStyle(.white)
            Text(snap.nextTitle).font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                .lineLimit(2)
            Spacer(minLength: 0)
            HStack {
                Ring(progress: snap.progress, line: 6, fill: .white, track: .white.opacity(0.3))
                    .frame(width: 38, height: 38)
                Text("\(snap.done) done").font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(2)
    }
}

struct MediumView: View {
    let snap: WidgetSnapshot
    var body: some View {
        HStack(spacing: 14) {
            SmallView(snap: snap)
            HStack(alignment: .bottom, spacing: 5) {
                ForEach(snap.week.indices, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(i == snap.week.count - 1 ? Color.white : Color.white.opacity(0.45))
                        .frame(height: max(6, CGFloat(snap.week[i]) * 70))
                }
            }
            .frame(width: 110, height: 80, alignment: .bottom)
        }
    }
}

struct PaceWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: PaceEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                Ring(progress: entry.snap.progress, line: 5, fill: .primary, track: .secondary.opacity(0.35))
                Text("\(entry.snap.done)").font(.system(size: 16, weight: .bold))
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Ring(progress: entry.snap.progress, line: 4, fill: .primary, track: .secondary.opacity(0.35))
                    .frame(width: 34, height: 34)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Next").font(.system(size: 10, weight: .bold))
                    Text(entry.snap.nextTitle).font(.system(size: 13, weight: .semibold)).lineLimit(2)
                }
            }
        case .systemMedium:
            MediumView(snap: entry.snap)
        default:
            SmallView(snap: entry.snap)
        }
    }
}

struct PaceWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PaceWidget", provider: PaceProvider()) { entry in
            PaceWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [waterDeep, water], startPoint: .topLeading, endPoint: .bottomTrailing)
                }
        }
        .configurationDisplayName("Pace")
        .description("Your next step and today's ring.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}

@main
struct PaceWidgetBundle: WidgetBundle {
    var body: some Widget { PaceWidget() }
}
