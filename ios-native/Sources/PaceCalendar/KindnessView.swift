import SwiftUI
import SafariServices

/// JOIN THE AI KINDNESS REVOLUTION — the menu's FIRST door
/// (her words, 14 Nov 15:14 + 15:19), in Pace's own skin.
/// The shared donations shape of her apps: calm amount
/// cards and a choose-your-own amount; the giving itself
/// is collected in Safari, never a payment inside the app.
/// The amounts ride to the giving page as its `amount`
/// word, the same shape the sister apps use.
struct KindnessView: View {
    @EnvironmentObject private var theme: ThemeStore
    @State private var ownAmount: String = ""
    @State private var safariURL: URL?

    /// The brand site of record (her ruling: the rebranded
    /// site is her brand website — brand + rainbow + the
    /// kindness wall). Whether its giving page stands live
    /// could not be verified from this desk on 14 Nov (the
    /// fetch route failed); the button still opens the site
    /// in Safari, and the desk's gate round re-checks it.
    static let givingBase = "https://joinaikindness.com"

    private let amounts = [5, 10, 20, 50]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Image("Mark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 52, height: 52)
                    .accessibilityHidden(true)

                Text("Small kindness, shared wide.")
                    .font(.paceHeading(22))
                    .fontWeight(.semibold)
                    .foregroundStyle(theme.inkOnBackground)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(amounts, id: \.self) { amount in
                        Button {
                            give(amount: amount)
                        } label: {
                            Text("$\(amount)")
                                .font(.paceHeading(20))
                                .fontWeight(.semibold)
                                .foregroundStyle(theme.inkOnCard)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 18)
                                .background(PaceColor.white)
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(PaceColor.apricotDeep, lineWidth: 1.5))
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("kindness.amount.\(amount)")
                    }
                }

                HStack(spacing: 10) {
                    TextField("Your own amount", text: $ownAmount)
                        .keyboardType(.numberPad)
                        .font(.paceBody(16))
                        .foregroundStyle(PaceColor.pine)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(PaceColor.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(PaceColor.waterMid, lineWidth: 1))
                        .accessibilityIdentifier("kindness.ownField")
                    Button("Give") {
                        if let amount = Int(ownAmount), amount > 0 {
                            give(amount: amount)
                        }
                    }
                    .font(.paceBody(16))
                    .fontWeight(.semibold)
                    .foregroundStyle(PaceColor.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(PaceColor.pine)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .accessibilityIdentifier("kindness.give")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 22)
            .padding(.top, 22)
        }
        .background(ThemedBackground())
        .navigationTitle("Join the AI kindness revolution")
        .accessibilityIdentifier("kindness.screen")
        .sheet(item: $safariURL) { url in
            SafariView(url: url)
                .ignoresSafeArea()
        }
    }

    private func give(amount: Int) {
        safariURL = URL(string: Self.givingBase + "/?amount=\(amount)")
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
