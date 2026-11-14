import SwiftUI

/// Brand of record (HER-RULINGS): Porcelain Mist · Still Water ·
/// Water Light · Soft Apricot · Pine Shade.
/// Fonts: Bricolage Grotesque (headings) + Manrope (body).
enum PaceColor {
    static let porcelain = Color(hex: 0xF3F5FA)
    static let stillWater = Color(hex: 0x5B6BD5)
    static let waterLight = Color(hex: 0xAEB8EC)
    static let apricot = Color(hex: 0xF0A868)
    static let pine = Color(hex: 0x21392E)
    static let white = Color.white
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

extension Font {
    static func paceHeading(_ size: CGFloat) -> Font {
        .custom("Bricolage Grotesque", size: size)
    }
    static func paceBody(_ size: CGFloat) -> Font {
        .custom("Manrope", size: size)
    }
}

/// THE THEMES (HELD-FIXES theme law): light · dark · beige ·
/// brand, WHITE the default. Her pick lives in her state
/// (settings.appearance.theme) — the state document is the
/// restore source, so the pick survives a fresh install the
/// moment she signs in; a UserDefaults mirror paints the
/// first frame before sign-in. The world changes around
/// calm white paper cards; titles that sit on the world
/// take the world's ink.
@MainActor
final class ThemeStore: ObservableObject {
    @Published private(set) var key: String

    init() {
        key = UserDefaults.standard.string(forKey: "pace.theme") ?? "white"
    }

    func apply(_ newKey: String) {
        key = newKey
        UserDefaults.standard.set(newKey, forKey: "pace.theme")
    }

    var background: Color {
        switch key {
        case "dark": return Color(hex: 0x14181F)
        case "beige": return Color(hex: 0xF3EAD8)
        case "brand": return PaceColor.stillWater
        default: return PaceColor.porcelain
        }
    }

    /// Ink for words that sit directly on the background.
    var inkOnBackground: Color {
        switch key {
        case "dark", "brand": return PaceColor.porcelain
        default: return PaceColor.pine
        }
    }

    var accent: Color {
        key == "brand" ? PaceColor.apricot : PaceColor.stillWater
    }
}

/// The screen background, in the world's colour.
struct ThemedBackground: View {
    @EnvironmentObject private var theme: ThemeStore

    var body: some View {
        theme.background.ignoresSafeArea()
    }
}

/// One calm pill used by every door action.
struct PacePill: View {
    let title: String
    var prominent: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.paceBody(17))
                .fontWeight(.semibold)
                .foregroundStyle(prominent ? PaceColor.white : PaceColor.pine)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(prominent ? PaceColor.pine : PaceColor.white)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(PaceColor.waterLight.opacity(prominent ? 0 : 0.7), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}
