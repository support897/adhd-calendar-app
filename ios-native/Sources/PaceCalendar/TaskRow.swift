import SwiftUI

/// One calm task line, shared by Today and the calendar:
/// a soft colour edge in the task's own colour, the time
/// when it has one, the title her words gave it, and the
/// length when it helps. Done reads done — a small tick and
/// a quieter title, never a shout.
struct TaskRow: View {
    let instance: PaceInstance
    var showDay: Bool = false
    /// When set, the row opens with its tick — a task ticks
    /// in place (P4 write kind 3; a goal step ticks the same
    /// way at P5). Nil keeps the calm read-only line.
    var onToggle: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 12) {
            if let onToggle {
                Button(action: onToggle) {
                    Image(systemName: instance.status == "done" ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 21))
                        .foregroundStyle(instance.status == "done" ? PaceColor.stillWater : PaceColor.waterLight)
                }
                .buttonStyle(.plain)
                .frame(minHeight: 44)
                .accessibilityIdentifier("task.tick.\(instance.task.id)")
            }

            RoundedRectangle(cornerRadius: 3, style: .continuous)
                .fill(edgeColor)
                .frame(width: 5)
                .padding(.vertical, 4)

            if let time = instance.task.time {
                Text(time)
                    .font(.paceBody(15))
                    .fontWeight(.semibold)
                    .foregroundStyle(PaceColor.stillWater)
                    .frame(width: 52, alignment: .leading)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(instance.displayTitle)
                    .font(.paceBody(16))
                    .foregroundStyle(PaceColor.pine.opacity(instance.status == "done" ? 0.45 : 1))
                    .strikethrough(instance.status == "done")
                if instance.displayDurationMin >= 1 && instance.task.time != nil {
                    Text("\(Int(instance.displayDurationMin)) min")
                        .font(.paceBody(13))
                        .foregroundStyle(PaceColor.pine.opacity(0.55))
                }
            }

            Spacer(minLength: 0)

            if instance.status == "done" {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(PaceColor.stillWater)
                    .font(.system(size: 18))
            }
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("task.\(instance.task.id)")
    }

    private var edgeColor: Color {
        guard let hex = instance.task.color, hex.hasPrefix("#"), hex.count == 7,
              let value = UInt32(hex.dropFirst(), radix: 16) else {
            return PaceColor.waterLight
        }
        return Color(hex: value)
    }
}
