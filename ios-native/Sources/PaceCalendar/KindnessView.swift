import SwiftUI
import UIKit
import SafariServices

/// JOIN THE AI KINDNESS REVOLUTION. The rainbow fills with people, never money.
/// Giving happens on the AI Kindness website in Safari (Apple Pay, Google Pay, PayPal,
/// card). The app never takes a payment. The wall and the count come from the website.
struct KindPerson: Identifiable, Equatable {
    let id: String
    let name: String
    let message: String
    let anonymous: Bool
    var shown: String { anonymous || name.isEmpty ? "Kind human" : name }
}

@MainActor
final class KindWall: ObservableObject {
    @Published var total: Int = 0
    @Published var people: [KindPerson] = []
    @Published var loaded = false
    /// One ring holds this many people. A full ring glows once, then a new ring begins.
    static let ring = 25_000

    func refresh() async {
        guard let r = try? await Backend.request("kind-wall") else { return }
        total = (r["total"] as? Int) ?? (r["total"] as? Double).map(Int.init) ?? total
        let raw = (r["people"] as? [[String: Any]]) ?? []
        people = raw.enumerated().map { i, d in
            KindPerson(id: (d["id"] as? String) ?? "\(i)",
                       name: (d["name"] as? String) ?? "",
                       message: (d["message"] as? String) ?? "",
                       anonymous: (d["anonymous"] as? Bool) ?? false)
        }
        loaded = true
    }
}

private let rainbowColors: [Color] = [
    Color(hex: 0xFF6B6B), Color(hex: 0xFF9F43), Color(hex: 0xFFD93D),
    Color(hex: 0x6BCB77), Color(hex: 0x4D96FF), Color(hex: 0xA66CFF)
]

private func arcPoint(_ t: Double, radius: CGFloat, in size: CGSize) -> CGPoint {
    let a = Double.pi * t
    return CGPoint(x: size.width / 2 - radius * CGFloat(cos(a)), y: size.height - radius * CGFloat(sin(a)))
}

private struct ArcShape: Shape {
    let radius: CGFloat
    func path(in rect: CGRect) -> Path {
        var p = Path()
        for i in 0...80 {
            let pt = arcPoint(Double(i) / 80, radius: radius, in: rect.size)
            i == 0 ? p.move(to: pt) : p.addLine(to: pt)
        }
        return p
    }
}

/// The rainbow: six bands fill up to the ring's progress; each person is a bead on the bands.
struct RainbowView: View {
    let total: Int
    let people: [KindPerson]
    let replay: Int
    @State private var fill: CGFloat = 0
    @State private var glow = false

    private var progress: CGFloat {
        let ring = CGFloat(KindWall.ring)
        guard total > 0 else { return 0.02 }
        let r = CGFloat(total % KindWall.ring)
        return max(0.03, (r == 0 ? ring : r) / ring)
    }

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            let outer = size.width / 2 - 14
            ZStack {
                ForEach(0..<6, id: \.self) { i in
                    let radius = outer - CGFloat(i) * 17
                    ArcShape(radius: radius)
                        .stroke(rainbowColors[i].opacity(0.16), style: StrokeStyle(lineWidth: 14, lineCap: .round))
                    ArcShape(radius: radius)
                        .trim(from: 0, to: fill)
                        .stroke(LinearGradient(colors: [rainbowColors[i], rainbowColors[i].opacity(0.78)],
                                               startPoint: .leading, endPoint: .trailing),
                                style: StrokeStyle(lineWidth: 14, lineCap: .round))
                        .shadow(color: rainbowColors[i].opacity(glow ? 0.7 : 0.25), radius: glow ? 10 : 3)
                }
                ForEach(Array(people.prefix(90).enumerated()), id: \.element.id) { n, person in
                    let band = n % 6
                    let slot = n / 6
                    let t = (Double(slot) * 0.067 + 0.04 + Double(band) * 0.011).truncatingRemainder(dividingBy: 0.94) + 0.03
                    let pt = arcPoint(t, radius: outer - CGFloat(band) * 17, in: size)
                    if CGFloat(t) <= fill {
                        ZStack {
                            Circle().fill(.white).frame(width: 13, height: 13)
                                .shadow(color: .black.opacity(0.18), radius: 1.5)
                            if person.anonymous || person.name.isEmpty {
                                Image(systemName: "heart.fill").font(.system(size: 7)).foregroundStyle(Color(hex: 0xFF6BAE))
                            } else {
                                Text(String(person.name.prefix(1)).uppercased())
                                    .font(.system(size: 8, weight: .bold)).foregroundStyle(rainbowColors[band])
                            }
                        }
                        .position(pt)
                        .transition(.scale)
                    }
                }
                VStack(spacing: 0) {
                    Spacer()
                    Text(total > 0 ? total.formatted() : "Be first")
                        .font(.paceHeading(total > 0 ? 34 : 26)).fontWeight(.heavy)
                        .foregroundStyle(PaceColor.pine)
                        .contentTransition(.numericText())
                    Text(total > 0 ? "have joined AI Kindness" : "on the rainbow")
                        .font(.paceBody(13)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.softInk)
                }
                .frame(width: size.width * 0.5, height: size.height)
            }
        }
        .aspectRatio(1.75, contentMode: .fit)
        .onAppear { play() }
        .onChange(of: replay) { _, _ in play() }
        .onChange(of: total) { _, _ in play() }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Kindness rainbow. \(total) people have joined. Double tap to see their names.")
    }

    private func play() {
        fill = 0; glow = false
        withAnimation(.easeOut(duration: 1.6)) { fill = progress }
        withAnimation(.easeInOut(duration: 1.0).delay(1.2).repeatCount(3, autoreverses: true)) { glow = true }
    }
}

private struct HeartBurst: View {
    @State private var go = false
    var body: some View {
        ZStack {
            ForEach(0..<14, id: \.self) { i in
                Image(systemName: "heart.fill")
                    .foregroundStyle(rainbowColors[i % 6])
                    .font(.system(size: CGFloat(14 + (i % 4) * 4)))
                    .offset(x: go ? CGFloat(cos(Double(i) * 0.9) * 150) : 0,
                            y: go ? CGFloat(sin(Double(i) * 0.9) * 120 - 60) : 0)
                    .opacity(go ? 0 : 1)
                    .scaleEffect(go ? 1.4 : 0.3)
            }
        }
        .onAppear { withAnimation(.easeOut(duration: 1.8)) { go = true } }
        .allowsHitTesting(false)
    }
}

struct KindWallSheet: View {
    @ObservedObject var wall: KindWall
    @Environment(\.dismiss) private var dismiss
    @State private var reporting: KindPerson?
    @State private var hiddenIDs: Set<String> = []
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("\(wall.total.formatted()) kind people. Tap the flag to report a name.")
                        .font(.paceBody(15)).foregroundStyle(PaceColor.softInk)
                }
                if wall.people.isEmpty {
                    Text(wall.loaded ? "Be the first name on the rainbow." : "Loading the wall")
                        .font(.paceBody(16))
                }
                ForEach(wall.people.filter { !hiddenIDs.contains($0.id) }) { p in
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "heart.fill").foregroundStyle(Color(hex: 0xFF6BAE)).padding(.top, 3)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(p.shown).font(.paceBody(16)).fontWeight(.semibold)
                            if !p.message.isEmpty {
                                Text(p.message).font(.paceBody(14)).foregroundStyle(PaceColor.softInk)
                            }
                        }
                        Spacer(minLength: 0)
                        if !p.anonymous {
                            Button { reporting = p } label: {
                                Image(systemName: "flag").font(.system(size: 15)).foregroundStyle(PaceColor.softInk)
                                    .frame(width: 44, height: 44)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Report this name")
                            .accessibilityIdentifier("wall.report.\(p.id)")
                        }
                    }
                }
            }
            .confirmationDialog("Report this name?", isPresented: Binding(get: { reporting != nil }, set: { if !$0 { reporting = nil } }), titleVisibility: .visible) {
                Button("Report and hide it", role: .destructive) {
                    if let p = reporting {
                        hiddenIDs.insert(p.id)
                        Task { _ = try? await Backend.request("kind-report", body: ["id": p.id]) }
                    }
                    reporting = nil
                }
                Button("Cancel", role: .cancel) { reporting = nil }
            } message: { Text("We hide it right away and a person checks it. Thank you for keeping the wall kind.") }
            .navigationTitle("The kind wall")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .accessibilityIdentifier("kindness.wall")
    }
}

struct KindnessView: View {
    @EnvironmentObject private var theme: ThemeStore
    @StateObject private var wall = KindWall()
    @State private var amount: Int? = 5
    @State private var ownAmount = ""
    @State private var showName = true
    @State private var name = ""
    @State private var message = ""
    @State private var safariURL: URL?
    @State private var showWall = false
    @State private var replay = 0
    @State private var burst = 0
    @State private var thanks: String?
    @State private var before = 0
    @State private var joining = false

    static let givingBase = "https://joinaikindness.com/give/"
    private let amounts = [3, 5, 10, 20]

    private var chosen: Int? {
        if let n = Int(ownAmount), n > 0 { return n }
        return amount
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                VStack(spacing: 6) {
                    HStack(spacing: 8) {
                        Image("Mark").resizable().scaledToFit().frame(width: 34, height: 34).accessibilityHidden(true)
                        Text("Pace  +  AI Kindness")
                            .font(.paceBody(14)).fontWeight(.bold).foregroundStyle(PaceColor.waterDeep)
                    }
                    Text("Join the AI Kindness Revolution")
                        .font(.paceHeading(26)).fontWeight(.heavy).multilineTextAlignment(.center)
                        .foregroundStyle(theme.inkOnBackground)
                    Text("AI should not replace us. AI is a tool. People stay the heart of everything.")
                        .font(.paceBody(15)).multilineTextAlignment(.center)
                        .foregroundStyle(theme.inkOnBackground.opacity(0.85))
                }
                .padding(.top, 8)

                ZStack {
                    RainbowView(total: wall.total, people: wall.people, replay: replay)
                        .onTapGesture { showWall = true }
                        .accessibilityAddTraits(.isButton)
                        .accessibilityIdentifier("kindness.rainbow")
                    if burst > 0 { HeartBurst().id(burst) }
                }
                .padding(.horizontal, 6)
                Text("Tap the rainbow to see every name")
                    .font(.paceBody(13)).foregroundStyle(theme.inkOnBackground.opacity(0.75))
                Text("This rainbow fills with people, never with money.")
                    .font(.paceBody(13)).fontWeight(.semibold).foregroundStyle(PaceColor.waterDeep)

                if let thanks {
                    Text(thanks)
                        .font(.paceBody(16)).fontWeight(.bold).multilineTextAlignment(.center)
                        .padding(14).frame(maxWidth: .infinity)
                        .background(Color(hex: 0xFFF3D6)).clipShape(RoundedRectangle(cornerRadius: 14))
                        .foregroundStyle(PaceColor.pine)
                        .accessibilityIdentifier("kindness.thanks")
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Join the rainbow, free")
                        .font(.paceHeading(19)).fontWeight(.bold).foregroundStyle(PaceColor.pine)
                    Text("Everyone gets the same size spot. No payment needed, ever.")
                        .font(.paceBody(13)).foregroundStyle(PaceColor.softInk)
                    Picker("", selection: $showName) {
                        Text("Show my name").tag(true)
                        Text("Anonymous heart").tag(false)
                    }
                    .pickerStyle(.segmented)
                    .accessibilityIdentifier("kindness.nameMode")
                    if showName {
                        TextField("Your first name (optional)", text: $name)
                            .font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                            .textContentType(.givenName)
                            .padding(12).background(Color.white).clipShape(RoundedRectangle(cornerRadius: 12))
                            .accessibilityIdentifier("kindness.name")
                        TextField("A kind message (optional)", text: $message, axis: .vertical)
                            .lineLimit(2...4).font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                            .padding(12).background(Color.white).clipShape(RoundedRectangle(cornerRadius: 12))
                            .accessibilityIdentifier("kindness.message")
                    }
                    Button { Task { await join() } } label: {
                        Text(joining ? "Joining" : "Join the rainbow")
                            .font(.paceBody(18)).fontWeight(.heavy)
                            .frame(maxWidth: .infinity, minHeight: 54)
                            .background(LinearGradient(colors: [Color(hex: 0xFF6B6B), Color(hex: 0xFFB347), Color(hex: 0x5B6BD5)],
                                                       startPoint: .leading, endPoint: .trailing))
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .disabled(joining)
                    .accessibilityIdentifier("kindness.join")
                    Text("Names are public and checked. Anyone can report a name from the wall and we hide it right away. Please use a first name or nickname only.")
                        .font(.paceBody(12)).foregroundStyle(PaceColor.softInk)
                }
                .padding(16).background(Color.white.opacity(0.92))
                .clipShape(RoundedRectangle(cornerRadius: 20))

                VStack(alignment: .leading, spacing: 12) {
                    Text("Want to give a gift too? Totally optional")
                        .font(.paceHeading(17)).fontWeight(.bold).foregroundStyle(PaceColor.pine)
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 4), spacing: 10) {
                        ForEach(amounts, id: \.self) { a in
                            Button { amount = a; ownAmount = "" } label: {
                                Text("$\(a)").font(.paceHeading(18)).fontWeight(.bold)
                                    .frame(maxWidth: .infinity, minHeight: 48)
                                    .background(chosen == a ? PaceColor.stillWater : Color.white)
                                    .foregroundStyle(chosen == a ? Color.white : PaceColor.pine)
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(PaceColor.stillWater, lineWidth: 1.5))
                            }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("kindness.amount.\(a)")
                        }
                    }
                    TextField("Or your own amount", text: $ownAmount)
                        .keyboardType(.numberPad).font(.paceBody(16)).foregroundStyle(PaceColor.pine)
                        .padding(12).background(Color.white).clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(PaceColor.waterMid, lineWidth: 1))
                        .accessibilityIdentifier("kindness.ownField")
                    Button { give() } label: {
                        Text(chosen.map { "Give $\($0) on our website" } ?? "Choose an amount")
                            .font(.paceBody(17)).fontWeight(.bold)
                            .frame(maxWidth: .infinity, minHeight: 50)
                            .background(Color.white)
                            .foregroundStyle(PaceColor.waterDeep)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(PaceColor.stillWater, lineWidth: 1.5))
                    }
                    .disabled(chosen == nil)
                    .accessibilityIdentifier("kindness.give")
                    Text("Opens joinaikindness.com in Safari. Pay there with Apple Pay, Google Pay, PayPal or card. Pace never takes a payment and never needs one. A gift does not unlock anything in Pace and does not change your spot on the rainbow. AI Kindness is not a registered charity, so gifts are not tax deductible. Gifts go to Apex Website Solutions, the maker of Pace, and help keep these free tools free. Amounts are in AUD.")
                        .font(.paceBody(12)).foregroundStyle(PaceColor.softInk)
                        .accessibilityIdentifier("kindness.disclosure")
                }
                .padding(16).background(Color.white.opacity(0.92))
                .clipShape(RoundedRectangle(cornerRadius: 20))

                VStack(alignment: .leading, spacing: 10) {
                    Text("What we believe").font(.paceHeading(19)).fontWeight(.bold).foregroundStyle(PaceColor.pine)
                    ForEach(["People first. Technology with care.",
                             "Automation that frees people, never erases them.",
                             "Free tools, given freely, kept free by kind humans.",
                             "Same size spot on the rainbow for everyone."], id: \.self) { line in
                        Label(line, systemImage: "heart.fill").font(.paceBody(14))
                            .foregroundStyle(PaceColor.pine).labelStyle(KindLabel())
                    }
                    Button("Visit joinaikindness.com") { safariURL = URL(string: "https://joinaikindness.com") }
                        .font(.paceBody(15)).fontWeight(.bold).foregroundStyle(PaceColor.waterDeep)
                        .frame(minHeight: 44)
                        .accessibilityIdentifier("kindness.site")
                }
                .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white.opacity(0.92)).clipShape(RoundedRectangle(cornerRadius: 20))
            }
            .padding(.horizontal, 18).padding(.bottom, 30)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(ThemedBackground())
        .navigationTitle("AI Kindness")
        .navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("kindness.screen")
        .task { await wall.refresh(); before = wall.total }
        .sheet(item: $safariURL, onDismiss: { Task { await afterGiving() } }) { url in
            SafariView(url: url).ignoresSafeArea()
        }
        .sheet(isPresented: $showWall) { KindWallSheet(wall: wall) }
    }

    private func give() {
        guard let a = chosen else { return }
        before = wall.total
        var c = URLComponents(string: Self.givingBase)!
        var q = [URLQueryItem(name: "amount", value: String(a)),
                 URLQueryItem(name: "name", value: showName ? "rainbow" : "heart"),
                 URLQueryItem(name: "from", value: "pace")]
        if showName {
            let n = name.trimmingCharacters(in: .whitespacesAndNewlines)
            let m = message.trimmingCharacters(in: .whitespacesAndNewlines)
            if !n.isEmpty { q.append(URLQueryItem(name: "display", value: String(n.prefix(40)))) }
            if !m.isEmpty { q.append(URLQueryItem(name: "msg", value: String(m.prefix(140)))) }
        }
        c.queryItems = q
        safariURL = c.url
    }

    private func join() async {
        joining = true; defer { joining = false }
        let key = "pace.install.id"
        let install = UserDefaults.standard.string(forKey: key) ?? {
            let v = UUID().uuidString; UserDefaults.standard.set(v, forKey: key); return v }()
        let n = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let m = message.trimmingCharacters(in: .whitespacesAndNewlines)
        let body: [String: Any] = ["install": install, "anonymous": !showName || n.isEmpty,
                                   "name": String(n.prefix(40)), "message": String(m.prefix(140))]
        before = wall.total
        guard let r = try? await Backend.request("kind-join", body: body), (r["ok"] as? Bool) == true else {
            thanks = "Could not reach the rainbow. Please try again in a moment."; return
        }
        await wall.refresh()
        if (r["already"] as? Bool) == true {
            thanks = "You are already on the rainbow. Thank you."
        } else {
            thanks = (showName && !n.isEmpty) ? "Welcome, \(n). You are on the rainbow." : "Welcome. Your heart is on the rainbow."
            replay += 1; burst += 1
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        before = wall.total
    }

    /// Back from Safari: re-read the wall. Only a real rise in the count plays the celebration.
    private func afterGiving() async {
        await wall.refresh()
        if wall.total > before {
            let n = name.trimmingCharacters(in: .whitespacesAndNewlines)
            thanks = (showName && !n.isEmpty) ? "Thank you, \(n). You are on the rainbow." : "Thank you. Your heart is on the rainbow."
            replay += 1; burst += 1
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        before = wall.total
    }
}

private struct KindLabel: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(alignment: .top, spacing: 8) {
            configuration.icon.font(.system(size: 11)).foregroundStyle(Color(hex: 0xFF6BAE)).padding(.top, 4)
            configuration.title
        }
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}

struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}
