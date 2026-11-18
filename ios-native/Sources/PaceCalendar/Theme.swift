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
    /// The guide's own deeper water (--water-deep in
    /// SPEC-VISUAL): the accent step that passes as TEXT on
    /// the light surfaces (5.5+ : 1 where Still Water is 4.27).
    static let waterDeep = Color(hex: 0x4858C4)
    /// The guide's own soft ink (--soft in SPEC-VISUAL): the
    /// secondary-ink role, a solid colour where faded Pine
    /// (0.4–0.6 opacity) measured 2.2–3.6 : 1 and failed.
    static let softInk = Color(hex: 0x5C6B62)
    /// Water Light deepened with its hue held (computed in
    /// tools/contrast_audit.py): the muted-icon and control-
    /// boundary role on light surfaces — 4.05 on white,
    /// 3.71 on Porcelain, 3.39 on Beige (Water Light itself
    /// measured 1.6–1.9 and failed every boundary it drew).
    static let waterMid = Color(hex: 0x6477DB)
    /// Apricot deepened with its hue held (same script): the
    /// apricot role wherever apricot carries meaning on a
    /// light surface (state dots, card borders, goal colour)
    /// — 3.78 on white (Apricot itself measured 2.00).
    static let apricotDeep = Color(hex: 0x4858C4) // purple-led round: the old apricot role now carries Water Deep (5.5:1 on white)
    /// Secondary ink for the dark world (on #14181F: 9.89).
    static let mistSoft = Color(hex: 0xB9C4BB)
    /// The guide's line colour (--line in SPEC-VISUAL):
    /// decoration only — hairlines and the progress ring's
    /// track, where the ring's FILL carries the meaning.
    static let lineMist = Color(hex: 0xDFE4F2)
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
    /// White on the brand world is deliberate: it is the only
    /// ink that reaches 4.5:1 on Still Water — Porcelain
    /// measures 4.27 there and fails as text. Every view takes
    /// its on-background words from these role tokens; before
    /// the contrast round this token existed and NO view used
    /// it, while the views hardcoded Pine — invisible on the
    /// dark and brand worlds (measured in CONTRAST-RESEARCH).
    var inkOnBackground: Color {
        switch key {
        case "dark": return PaceColor.porcelain
        case "brand": return PaceColor.white
        default: return PaceColor.pine
        }
    }

    /// Secondary words on the background: the guide's soft
    /// ink on the light worlds (5.16 white · 4.71 beige), a
    /// mist step on the dark one (9.89), white on brand.
    var secondaryOnBackground: Color {
        switch key {
        case "dark": return PaceColor.mistSoft
        case "brand": return PaceColor.white
        default: return PaceColor.softInk
        }
    }

    /// The accent as TEXT on the background (links, small
    /// action words): the deep step on the light worlds, the
    /// light step on the dark one, white on brand.
    var accentOnBackground: Color {
        switch key {
        case "dark": return PaceColor.waterLight
        case "brand": return PaceColor.white
        default: return PaceColor.waterDeep
        }
    }

    /// Meaningful icons that sit on the background (open tick
    /// circles, status icons): the mid step on the light
    /// worlds, Water Light on dark, white on brand.
    var iconOnBackground: Color {
        switch key {
        case "dark": return PaceColor.waterLight
        case "brand": return PaceColor.white
        default: return PaceColor.waterMid
        }
    }

    // Cards are white paper in every theme (the standing
    // design above), so the on-card roles are constants —
    // on white: ink Pine 12.43 · secondary Soft 5.62 ·
    // accent Water Deep 6.05 · muted icon and boundary
    // waterMid 4.05 (tools/contrast_audit.py).
    var inkOnCard: Color { PaceColor.pine }
    var secondaryOnCard: Color { PaceColor.softInk }
    var accentOnCard: Color { PaceColor.waterDeep }
    var iconOnCard: Color { PaceColor.waterMid }

    /// Accent text whose surface is the SYSTEM's own (Form
    /// rows): the form card is white in the light worlds and
    /// #1C1C1E in the dark one — Water Deep 6.05 on white,
    /// Water Light 8.80 on the dark card.
    var accentOnSystemSurface: Color {
        key == "dark" ? PaceColor.waterLight : PaceColor.waterDeep
    }

    /// Toolbar words (the Goals Join / Add pair) sit on the
    /// system glass capsule, which follows the pinned scheme:
    /// a light glass in the light worlds (Pine ink), a dark
    /// glass in the dark one (Porcelain ink). The rendered
    /// pairings are pixel-measured in the look proof.
    var inkOnGlass: Color {
        key == "dark" ? PaceColor.porcelain : PaceColor.pine
    }

    /// The colour scheme the system chrome (navigation titles,
    /// list and form surfaces, the tab bar, pickers, sheets)
    /// must follow: the app's chosen world, never the phone's.
    /// This one pin is the cure for her build-55 pictures —
    /// dark system chrome over the light Porcelain world made
    /// titles white-on-white and the More card near-black.
    var scheme: ColorScheme {
        key == "dark" ? .dark : .light
    }

    var accent: Color {
        key == "brand" ? PaceColor.white : PaceColor.stillWater
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
                        .stroke(PaceColor.waterMid.opacity(prominent ? 0 : 1), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}
