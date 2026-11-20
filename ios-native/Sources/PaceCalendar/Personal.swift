import SwiftUI

/// Many icons, grouped, plus a word reader that suggests a few.
enum IconBank {
    static let groups: [(String, [String])] = [
        ("Health", ["heart.fill", "figure.walk", "figure.run", "figure.yoga", "dumbbell.fill", "pills.fill", "cross.case.fill", "drop.fill", "bed.double.fill", "lungs.fill", "brain.head.profile", "stethoscope", "figure.mind.and.body", "bandage.fill", "toothbrush.fill", "scalemass.fill"]),
        ("Food", ["fork.knife", "cup.and.saucer.fill", "carrot.fill", "takeoutbag.and.cup.and.straw.fill", "wineglass.fill", "birthday.cake.fill", "cart.fill", "leaf.fill", "mug.fill", "frying.pan.fill"]),
        ("Work", ["briefcase.fill", "laptopcomputer", "envelope.fill", "phone.fill", "calendar", "doc.text.fill", "chart.bar.fill", "person.2.fill", "building.2.fill", "printer.fill", "folder.fill", "paperplane.fill", "video.fill", "headphones"]),
        ("School", ["book.fill", "graduationcap.fill", "pencil", "backpack.fill", "character.book.closed.fill", "function", "globe.europe.africa.fill", "flask.fill", "ruler.fill", "text.book.closed.fill"]),
        ("Money", ["banknote.fill", "creditcard.fill", "dollarsign.circle.fill", "chart.line.uptrend.xyaxis", "bag.fill", "gift.fill", "tag.fill", "receipt.fill", "building.columns.fill", "cart.badge.plus"]),
        ("Home", ["house.fill", "washer.fill", "trash.fill", "lightbulb.fill", "wrench.and.screwdriver.fill", "sofa.fill", "bed.double.fill", "key.fill", "shower.fill", "spigot.fill", "basket.fill", "hammer.fill"]),
        ("Fun", ["music.note", "gamecontroller.fill", "camera.fill", "paintbrush.fill", "film.fill", "guitars.fill", "theatermasks.fill", "party.popper.fill", "balloon.fill", "puzzlepiece.fill", "sparkles", "tv.fill"]),
        ("Out", ["car.fill", "bicycle", "airplane", "tram.fill", "tent.fill", "mappin.and.ellipse", "sun.max.fill", "moon.fill", "cloud.rain.fill", "snowflake", "flame.fill", "mountain.2.fill", "beach.umbrella.fill", "bus.fill"]),
        ("Care", ["pawprint.fill", "figure.and.child.holdinghands", "hands.sparkles.fill", "heart.circle.fill", "star.fill", "bell.fill", "bolt.fill", "flag.fill", "target", "trophy.fill", "crown.fill", "hand.thumbsup.fill", "person.fill", "face.smiling.fill"]),
    ]
    static var all: [String] {
        var seen = Set<String>(); var out: [String] = []
        for g in groups { for i in g.1 where !seen.contains(i) { seen.insert(i); out.append(i) } }
        return out
    }
    static let words: [(String, [String])] = [
        ("drop.fill", ["water", "drink", "hydrate"]), ("pills.fill", ["pill", "vitamin", "medic", "tablet"]),
        ("figure.walk", ["walk", "steps", "stroll"]), ("figure.run", ["run", "jog"]), ("figure.yoga", ["yoga", "stretch", "meditat"]),
        ("dumbbell.fill", ["gym", "lift", "workout", "exercise", "train"]), ("bed.double.fill", ["sleep", "bed", "nap"]),
        ("book.fill", ["read", "book", "study", "homework", "essay", "exam"]), ("graduationcap.fill", ["class", "school", "uni", "lecture"]),
        ("fork.knife", ["eat", "lunch", "dinner", "breakfast", "meal", "cook"]), ("cart.fill", ["buy", "shop", "milk", "grocer", "store"]),
        ("cup.and.saucer.fill", ["coffee", "tea"]), ("phone.fill", ["call", "phone", "ring"]), ("envelope.fill", ["email", "mail", "reply", "post", "parcel"]),
        ("briefcase.fill", ["work", "meeting", "boss", "client", "office"]), ("laptopcomputer", ["code", "computer", "laptop", "report"]),
        ("banknote.fill", ["pay", "bill", "rent", "money", "bank", "tax", "budget", "save"]), ("house.fill", ["clean", "home", "tidy", "house", "vacuum"]),
        ("washer.fill", ["laundry", "wash", "clothes"]), ("trash.fill", ["bin", "trash", "rubbish"]), ("pawprint.fill", ["dog", "cat", "pet", "vet"]),
        ("car.fill", ["car", "drive", "fuel", "petrol"]), ("bicycle", ["bike", "cycle", "ride"]), ("airplane", ["flight", "fly", "trip", "travel", "airport"]),
        ("music.note", ["music", "piano", "guitar", "sing", "practice"]), ("paintbrush.fill", ["paint", "draw", "art"]), ("camera.fill", ["photo", "camera"]),
        ("gift.fill", ["gift", "birthday", "present"]), ("stethoscope", ["doctor", "dentist", "appointment", "check-up", "checkup"]),
        ("toothbrush.fill", ["teeth", "brush", "floss"]), ("leaf.fill", ["plant", "garden", "water the"]), ("heart.fill", ["love", "date", "partner", "care"]),
        ("person.2.fill", ["friend", "family", "visit", "catch up"]), ("sun.max.fill", ["morning", "sun"]), ("moon.fill", ["night", "evening"]),
        ("scalemass.fill", ["weigh", "weight"]), ("target", ["goal", "aim"]), ("pencil", ["write", "journal", "note"]),
    ]
    /// Up to 6 icons that fit the words, best first.
    static func suggest(for text: String) -> [String] {
        let t = text.lowercased()
        guard !t.isEmpty else { return [] }
        var out: [String] = []
        for (icon, keys) in words where keys.contains(where: { t.contains($0) }) { out.append(icon) }
        return Array(out.prefix(6))
    }
    static func best(for text: String) -> String? { suggest(for: text).first }
}

struct PaceKind: Identifiable, Equatable {
    let id: String
    let label: String
    let symbol: String
    let colour: String
}

/// Built-in kinds plus the ones people make. Kept on the phone.
enum CategoryStore {
    static let builtIn: [PaceKind] = [
        PaceKind(id: "health", label: "Health", symbol: "heart.fill", colour: "#35704E"),
        PaceKind(id: "work", label: "Work", symbol: "briefcase.fill", colour: "#3F536E"),
        PaceKind(id: "school", label: "School", symbol: "book.fill", colour: "#5B6BD5"),
        PaceKind(id: "money", label: "Money", symbol: "banknote.fill", colour: "#6B5BB0"),
        PaceKind(id: "home", label: "Home", symbol: "house.fill", colour: "#2F8F83"),
        PaceKind(id: "personal", label: "Personal", symbol: "person.fill", colour: "#8E7CC3"),
    ]
    private static let key = "pace.customKinds"
    static var custom: [PaceKind] {
        guard let arr = UserDefaults.standard.array(forKey: key) as? [[String]] else { return [] }
        return arr.compactMap { $0.count == 4 ? PaceKind(id: $0[0], label: $0[1], symbol: $0[2], colour: $0[3]) : nil }
    }
    static var all: [PaceKind] { builtIn + custom }
    static func find(_ id: String?) -> PaceKind? { all.first { $0.id == id } }
    @discardableResult
    static func add(label: String, symbol: String, colour: String) -> PaceKind {
        let clean = label.trimmingCharacters(in: .whitespacesAndNewlines)
        let id = "c-" + clean.lowercased().filter { $0.isLetter || $0.isNumber }
        let kind = PaceKind(id: id, label: clean, symbol: symbol, colour: colour)
        var arr = (UserDefaults.standard.array(forKey: key) as? [[String]]) ?? []
        arr.removeAll { $0.first == id }
        arr.append([id, clean, symbol, colour])
        UserDefaults.standard.set(arr, forKey: key)
        return kind
    }
}

/// Chips for the kinds, plus a "New" chip to make your own.
struct KindPicker: View {
    let title: String
    @Binding var selection: String?
    let idPrefix: String
    @EnvironmentObject private var theme: ThemeStore
    @State private var kinds = CategoryStore.all
    @State private var making = false
    @State private var newName = ""
    @State private var newColour = "#5B6BD5"
    @State private var newIcon = "star.fill"

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.paceBody(13)).fontWeight(.bold).textCase(.uppercase)
                .foregroundStyle(theme.secondaryOnBackground)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], alignment: .leading, spacing: 8) {
                ForEach(kinds) { k in
                    let on = selection == k.id
                    let tint = WizardLook.color(k.colour)
                    Button { selection = on ? nil : k.id } label: {
                        Label(k.label, systemImage: k.symbol).font(.paceBody(14)).fontWeight(.semibold)
                            .lineLimit(1).minimumScaleFactor(0.8)
                            .foregroundStyle(on ? PaceColor.white : tint)
                            .frame(maxWidth: .infinity).frame(minHeight: 40)
                            .background(on ? tint : PaceColor.white)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(tint, lineWidth: on ? 0 : 1.5))
                    }
                    .buttonStyle(.plain).accessibilityIdentifier("\(idPrefix).kind.\(k.id)")
                }
                Button { withAnimation { making.toggle() } } label: {
                    Label("New", systemImage: making ? "xmark" : "plus").font(.paceBody(14)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.stillWater)
                        .frame(maxWidth: .infinity).frame(minHeight: 40)
                        .background(PaceColor.white).clipShape(Capsule())
                        .overlay(Capsule().strokeBorder(PaceColor.stillWater, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
                }
                .buttonStyle(.plain).accessibilityIdentifier("\(idPrefix).kind.new")
            }
            if making { maker }
        }
    }

    private var maker: some View {
        VStack(alignment: .leading, spacing: 10) {
            TextField("Name your kind", text: $newName)
                .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                .padding(12).background(PaceColor.white)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(PaceColor.waterMid, lineWidth: 1))
                .accessibilityIdentifier("\(idPrefix).kind.newName")
            ColourRow(colorHex: $newColour)
            IconGrid(icon: Binding(get: { newIcon }, set: { newIcon = $0.isEmpty ? "star.fill" : $0 }), colorHex: newColour, suggestions: IconBank.suggest(for: newName))
            Button {
                guard !newName.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                let k = CategoryStore.add(label: newName, symbol: newIcon, colour: newColour)
                kinds = CategoryStore.all
                selection = k.id
                newName = ""; making = false
            } label: {
                Text("Save kind").font(.paceBody(15)).fontWeight(.bold).foregroundStyle(PaceColor.white)
                    .frame(maxWidth: .infinity).frame(minHeight: 44)
                    .background(PaceColor.stillWater).clipShape(Capsule())
            }
            .buttonStyle(.plain).accessibilityIdentifier("\(idPrefix).kind.save")
        }
        .padding(12).background(PaceColor.white.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct ColourRow: View {
    @Binding var colorHex: String
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 40), spacing: 8)], spacing: 8) {
            ForEach(WizardLook.colours, id: \.self) { hex in
                Button { colorHex = hex } label: {
                    Circle().fill(WizardLook.color(hex)).frame(width: 34, height: 34)
                        .overlay(Circle().stroke(PaceColor.pine, lineWidth: colorHex == hex ? 3 : 0).padding(-3))
                }
                .buttonStyle(.plain).frame(minWidth: 40, minHeight: 40)
                .accessibilityLabel("Colour")
                .accessibilityAddTraits(colorHex == hex ? .isSelected : [])
            }
        }
    }
}

/// Suggested icons first, then every icon by group.
struct IconGrid: View {
    @Binding var icon: String
    let colorHex: String
    var suggestions: [String] = []
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !suggestions.isEmpty {
                Text("Pace picked these").font(.paceBody(12)).fontWeight(.bold).textCase(.uppercase)
                    .foregroundStyle(PaceColor.waterDeep)
                row(suggestions)
            }
            ForEach(IconBank.groups, id: \.0) { g in
                Text(g.0).font(.paceBody(12)).fontWeight(.bold).textCase(.uppercase).foregroundStyle(PaceColor.waterDeep)
                row(g.1)
            }
        }
        .accessibilityElement(children: .contain)
    }
    private func row(_ names: [String]) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 46), spacing: 8)], spacing: 8) {
            ForEach(names, id: \.self) { n in
                Button { icon = (icon == n) ? "" : n } label: {
                    Image(systemName: n).font(.system(size: 19))
                        .foregroundStyle(icon == n ? PaceColor.white : WizardLook.color(colorHex))
                        .frame(width: 44, height: 44)
                        .background(icon == n ? WizardLook.color(colorHex) : PaceColor.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(PaceColor.waterMid, lineWidth: icon == n ? 0 : 1))
                }
                .buttonStyle(.plain).frame(minHeight: 46)
                .accessibilityLabel("Icon \(n)")
                .accessibilityAddTraits(icon == n ? .isSelected : [])
            }
        }
    }
}
