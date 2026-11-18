import SwiftUI
import UIKit

/// THE KIT (design round "build 56, improved"): the shared
/// pictures every screen borrows — gradient hero card, ring,
/// week bars, dots, confetti. Purple-led: Still Water is the
/// colour of progress; Pine is ink; apricot is not used here.

enum RewardLevel: String, CaseIterable, Identifiable {
    case calm, balanced, rush
    var id: String { rawValue }
    var title: String {
        switch self {
        case .calm: return "Calm"
        case .balanced: return "Balanced"
        case .rush: return "Rush"
        }
    }
    var line: String {
        switch self {
        case .calm: return "Soft ring. A quiet line from Skip."
        case .balanced: return "Skip cheers. Light confetti."
        case .rush: return "Big confetti. Strong buzz."
        }
    }
}

struct DumpItem: Identifiable, Codable, Equatable {
    var id = UUID().uuidString
    var text: String
}

/// Local-only extras (UserDefaults): reward level, brain-dump
/// inbox, the last Sunday reset. They never touch her state
/// document, so nothing she already has can be dropped.
@MainActor
final class ExtrasStore: ObservableObject {
    @Published var reward: RewardLevel {
        didSet { UserDefaults.standard.set(reward.rawValue, forKey: "pace.reward") }
    }
    @Published var dumps: [DumpItem] {
        didSet {
            if let data = try? JSONEncoder().encode(dumps) {
                UserDefaults.standard.set(data, forKey: "pace.dumps")
            }
        }
    }
    @Published var celebrating: String? = nil

    init() {
        reward = RewardLevel(rawValue: UserDefaults.standard.string(forKey: "pace.reward") ?? "") ?? .balanced
        if let data = UserDefaults.standard.data(forKey: "pace.dumps"),
           let items = try? JSONDecoder().decode([DumpItem].self, from: data) {
            dumps = items
        } else {
            dumps = []
        }
    }

    func addDump(_ text: String) {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return }
        dumps.insert(DumpItem(text: t), at: 0)
    }

    func removeDump(_ id: String) {
        dumps.removeAll { $0.id == id }
    }

    private static let lines = [
        "You started. That is the hard part.",
        "One done. Nice and steady.",
        "Look at you go.",
        "That counts. Really.",
        "Small step, real step."
    ]

    func celebrate() {
        let line = Self.lines.randomElement() ?? "Done."
        switch reward {
        case .calm:
            UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        case .balanced:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case .rush:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        celebrating = line
        let level = reward
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: level == .calm ? 1_600_000_000 : 2_300_000_000)
            self.celebrating = nil
        }
    }
}

// MARK: pictures

extension LinearGradient {
    static var paceHero: LinearGradient {
        LinearGradient(colors: [Color(hex: 0x4858C4), PaceColor.stillWater, Color(hex: 0x7F8DE4)],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

struct RingMeter: View {
    var progress: Double
    var size: CGFloat = 58
    var line: CGFloat = 7
    var fill: Color = PaceColor.stillWater
    var track: Color = PaceColor.lineMist

    var body: some View {
        ZStack {
            Circle().stroke(track, lineWidth: line)
            Circle()
                .trim(from: 0, to: max(min(progress, 1), 0.001))
                .stroke(fill, style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

/// Seven bars, one per day, today last. Rest days stand low,
/// never red, never a gap that shames.
struct WeekBars: View {
    let values: [Double]      // 0...1, seven items
    let labels: [String]
    var height: CGFloat = 70

    var body: some View {
        HStack(alignment: .bottom, spacing: 9) {
            ForEach(values.indices, id: \.self) { i in
                VStack(spacing: 5) {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(i == values.count - 1 ? PaceColor.stillWater : PaceColor.waterLight)
                        .frame(height: max(8, CGFloat(values[i]) * height))
                    Text(labels[i])
                        .font(.paceBody(11))
                        .foregroundStyle(PaceColor.softInk)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .frame(height: height + 20, alignment: .bottom)
    }
}

struct ConfettiBurst: View {
    let count: Int
    @State private var go = false
    private let palette: [Color] = [PaceColor.stillWater, PaceColor.waterLight, Color(hex: 0x4858C4),
                                    PaceColor.pine, Color(hex: 0x7F8DE4)]

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(0..<count, id: \.self) { i in
                    let angle = Double(i) / Double(count) * 2 * .pi
                    let dist = 70 + CGFloat((i * 37) % 90)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(palette[i % palette.count])
                        .frame(width: 8, height: 12)
                        .rotationEffect(.degrees(Double(i * 47)))
                        .offset(x: go ? CGFloat(cos(angle)) * dist : 0,
                                y: go ? CGFloat(sin(angle)) * dist - 20 : 0)
                        .opacity(go ? 0 : 1)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .allowsHitTesting(false)
        .onAppear { withAnimation(.easeOut(duration: 1.4)) { go = true } }
    }
}

/// The moment of done: Skip celebrates, a fresh line, confetti
/// by her reward level. Calm shows no confetti.
struct CelebrationView: View {
    @EnvironmentObject private var extras: ExtrasStore
    let line: String

    var body: some View {
        VStack {
            Spacer()
            ZStack {
                if extras.reward != .calm {
                    ConfettiBurst(count: extras.reward == .rush ? 36 : 18)
                        .frame(height: 220)
                }
                HStack(spacing: 12) {
                    Image("SkipCelebrate")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 58, height: 58)
                        .accessibilityHidden(true)
                    Text(line)
                        .font(.paceBody(16))
                        .fontWeight(.semibold)
                        .foregroundStyle(PaceColor.pine)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(14)
                .background(PaceColor.white)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(PaceColor.waterMid, lineWidth: 1))
                .shadow(color: PaceColor.stillWater.opacity(0.25), radius: 14, y: 6)
                .padding(.horizontal, 24)
            }
            .padding(.bottom, 90)
        }
        .transition(.opacity.combined(with: .move(edge: .bottom)))
        .allowsHitTesting(false)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("celebrate.banner")
    }
}

/// One white paper card with the standing purple hairline.
struct PaceCard<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        content()
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(PaceColor.waterMid, lineWidth: 1))
    }
}
