import SwiftUI
import RevenueCat

/// PACE PLUS — the paid tier of record: A$4.99 a month,
/// A$39.99 a year, A$99.99 for life; the first month is
/// free (the in-app month — the monthly product's store
/// offer). Billing runs through RevenueCat (project of
/// record deeac682; the iOS key below is RevenueCat's
/// PUBLIC SDK key — it ships in the app by design, exactly
/// as it stands in the web tree's billing-config.js).
/// Entitlement of record: "plus".
///
/// The three plans stand with their prices of record even
/// before the store answers; a purchase is offered only
/// when RevenueCat's offering actually carries the product
/// — nothing is faked. Her own standing promise (lifetime
/// comp at her first real sign-in) is a console act at the
/// desk, not an app path.
/// Text budget: 20 app words.
@MainActor
final class PlusStore: ObservableObject {
    @Published private(set) var isPlus = false
    @Published private(set) var offeringsLoaded = false
    private var offering: Offering?

    static let apiKey = "appl_ZQeXxKVfHuNVSaMGGuhKTVNKdsq"
    static let entitlement = "plus"

    static var configured = false

    static func configureIfNeeded() {
        guard !configured else { return }
        configured = true
        Purchases.configure(withAPIKey: apiKey)
    }

    func load() async {
        Self.configureIfNeeded()
        do {
            let info = try await Purchases.shared.customerInfo()
            isPlus = info.entitlements[Self.entitlement]?.isActive == true
            let offerings = try await Purchases.shared.offerings()
            offering = offerings.current
            offeringsLoaded = offering != nil
        } catch {
            print("Plus load ended: \(error.localizedDescription)")
            offeringsLoaded = false
        }
    }

    func package(for productId: String) -> Package? {
        offering?.availablePackages.first { $0.storeProduct.productIdentifier == productId }
    }

    func purchase(_ package: Package) async {
        do {
            let result = try await Purchases.shared.purchase(package: package)
            isPlus = result.customerInfo.entitlements[Self.entitlement]?.isActive == true
        } catch {
            print("Plus purchase ended: \(error.localizedDescription)")
        }
    }

    func restore() async {
        do {
            let info = try await Purchases.shared.restorePurchases()
            isPlus = info.entitlements[Self.entitlement]?.isActive == true
        } catch {
            print("Plus restore ended: \(error.localizedDescription)")
        }
    }
}

struct PlusView: View {
    @EnvironmentObject private var theme: ThemeStore
    @StateObject private var store = PlusStore()

    private let plans: [(id: String, name: String, price: String, note: String?)] = [
        ("pace_plus_monthly", "Monthly", "A$4.99", "First month free"),
        ("pace_plus_yearly", "Yearly", "A$39.99", nil),
        ("pace_lifetime", "Lifetime", "A$99.99", nil),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if store.isPlus {
                    HStack(spacing: 10) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(theme.accentOnBackground)
                            .font(.system(size: 20))
                        Text("Plus is on")
                            .font(.paceHeading(20))
                            .fontWeight(.semibold)
                            .foregroundStyle(theme.inkOnBackground)
                    }
                    .accessibilityIdentifier("plus.on")
                }

                ForEach(plans, id: \.id) { plan in
                    planCard(plan)
                }

                Button("Restore") {
                    Task { await store.restore() }
                }
                .font(.paceBody(15))
                .fontWeight(.semibold)
                .foregroundStyle(theme.accentOnBackground)
                .frame(minHeight: 44)
                .accessibilityIdentifier("plus.restore")

                if !store.offeringsLoaded && !store.isPlus {
                    Text("Not available yet")
                        .font(.paceBody(14))
                        .foregroundStyle(theme.secondaryOnBackground)
                        .accessibilityIdentifier("plus.unavailable")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 22)
            .padding(.top, 22)
        }
        .background(ThemedBackground())
        .navigationTitle("Plus")
        .accessibilityIdentifier("plus.screen")
        .task { await store.load() }
    }

    private func planCard(_ plan: (id: String, name: String, price: String, note: String?)) -> some View {
        let package = store.package(for: plan.id)
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(plan.name)
                    .font(.paceBody(17))
                    .fontWeight(.semibold)
                    .foregroundStyle(theme.inkOnCard)
                Text(plan.price)
                    .font(.paceBody(15))
                    .foregroundStyle(theme.secondaryOnCard)
                if let note = plan.note {
                    Text(note)
                        .font(.paceBody(13))
                        .fontWeight(.semibold)
                        .foregroundStyle(theme.accentOnCard)
                }
            }
            Spacer()
            if let package, !store.isPlus {
                Button("Choose") {
                    Task { await store.purchase(package) }
                }
                .font(.paceBody(15))
                .fontWeight(.semibold)
                .foregroundStyle(PaceColor.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(PaceColor.pine)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .accessibilityIdentifier("plus.choose.\(plan.id)")
            }
        }
        .padding(16)
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
            .stroke(PaceColor.waterMid, lineWidth: 1))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("plus.plan.\(plan.id)")
    }
}
