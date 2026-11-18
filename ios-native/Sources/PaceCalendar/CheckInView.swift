import SwiftUI

/// The morning check-in (Phase 1 shape of record): one calm
/// question — "How do you feel?" — and her three feeling
/// words in her order, Bad · Ok · Great (the words are hers,
/// read from settings.names; the keys are low/steady/full).
/// Big, calm choices. The answer writes feelings[today]
/// through the ruled write door and today reshapes at once.
/// Text budget: 7 app words — the question is 4.
struct CheckInView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    let dayKey: String
    var onAnswered: (() -> Void)? = nil

    private let order = ["low", "steady", "full"]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Skip stands at the check-in (round 2): the
            // mascot of record at the day's emotional moment
            // — a character who cheers you on, per the
            // motivation research (Finch's shape).
            HStack(spacing: 12) {
                Image("SkipFront")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 54, height: 54)
                    .accessibilityHidden(true)
                Text("How do you feel?")
                    .font(.paceHeading(22))
                    .fontWeight(.semibold)
                    .foregroundStyle(theme.inkOnCard)
                    .accessibilityIdentifier("checkin.question")
            }

            HStack(spacing: 10) {
                ForEach(order, id: \.self) { key in
                    Button {
                        session.saveFeeling(dayKey: dayKey, key: key)
                        onAnswered?()
                    } label: {
                        Text(session.state?.feelingNames[key] ?? fallbackName(key))
                            .font(.paceBody(17))
                            .fontWeight(.semibold)
                            .foregroundStyle(isChosen(key) ? PaceColor.white : PaceColor.pine)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(isChosen(key) ? PaceColor.stillWater : PaceColor.white)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(PaceColor.waterMid.opacity(isChosen(key) ? 0 : 1), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("checkin." + key)
                }
            }
        }
        .padding(18)
        .background(PaceColor.white)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(PaceColor.waterMid, lineWidth: 1)
        )
    }

    private func isChosen(_ key: String) -> Bool {
        session.state?.feelings[dayKey] == key
    }

    private func fallbackName(_ key: String) -> String {
        switch key {
        case "low": return "Bad"
        case "full": return "Great"
        default: return "Ok"
        }
    }
}
