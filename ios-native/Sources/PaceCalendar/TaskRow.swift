import SwiftUI

/// One calm task line, shared by Today and the calendar:
/// a soft colour edge in the task's own colour, the time
/// when it has one, the title her words gave it, and the
/// length when it helps. Done reads done — a small tick and
/// a quieter title, never a shout.
struct TaskRow: View {
    @EnvironmentObject private var theme: ThemeStore
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var extras: ExtrasStore
    @State private var confirmDelete = false
    @State private var showMove = false
    @State private var moveDate = Date()
    /// A clear circle on every task. Off only where a parent draws its own.
    var showCircle: Bool = true
    let instance: PaceInstance
    var showDay: Bool = false
    /// When set, the row opens with its tick — a task ticks
    /// in place (P4 write kind 3; a goal step ticks the same
    /// way at P5). Nil keeps the calm read-only line.
    var onToggle: (() -> Void)? = nil
    /// When set, a small play button opens the focus room for it.
    var onStart: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 12) {
            if showCircle || onToggle != nil {
                Button(action: {
                    if let onToggle { onToggle(); return }
                    let nowDone = instance.status != "done"
                    session.setTaskDone(taskId: instance.task.id, dayKey: instance.dayKey, done: nowDone)
                    if nowDone { extras.celebrate() }
                }) {
                    Image(systemName: instance.status == "done" ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 21))
                        .foregroundStyle(instance.status == "done" ? theme.accentOnBackground : theme.iconOnBackground)
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
                    .foregroundStyle(theme.accentOnBackground)
                    .frame(width: 52, alignment: .leading)
            }

            if let name = instance.task.icon, !name.isEmpty {
                Image(systemName: name)
                    .font(.system(size: 15))
                    .foregroundStyle(edgeColor)
                    .accessibilityHidden(true)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(instance.displayTitle)
                    .accessibilityIdentifier(instance.displayTitle)
                    .font(.paceBody(16))
                    .foregroundStyle(instance.status == "done" ? theme.secondaryOnBackground : theme.inkOnBackground)
                    .strikethrough(instance.status == "done")
                if instance.displayDurationMin >= 1 && instance.task.time != nil {
                    Text("\(Int(instance.displayDurationMin)) min")
                        .font(.paceBody(13))
                        .foregroundStyle(theme.secondaryOnBackground)
                }
            }

            Spacer(minLength: 0)

            if let onStart, instance.status != "done" {
                Button(action: onStart) {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 26))
                        .foregroundStyle(PaceColor.stillWater)
                }
                .buttonStyle(.plain)
                .frame(minWidth: 44, minHeight: 44)
                .accessibilityLabel("Start")
                .accessibilityIdentifier("task.start.\(instance.task.id)")
            }

            Menu {
                Button { showMove = true } label: {
                    Label("Move to another day", systemImage: "calendar.badge.clock")
                }
                Button { session.drop([instance.task.id], onTodos: true) } label: {
                    Label("Make it a to-do", systemImage: "checklist")
                }
                Button { session.archiveTask(instance.task.id) } label: {
                    Label("Archive", systemImage: "archivebox")
                }
                Button(role: .destructive) { confirmDelete = true } label: {
                    Label("Delete", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 15))
                    .foregroundStyle(theme.iconOnBackground)
                    .frame(width: 34, height: 44)
            }
            .accessibilityLabel("More")
            .accessibilityIdentifier("task.menu.\(instance.task.id)")

            if instance.task.essential {
                Image(systemName: "lock.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.iconOnBackground)
                    .accessibilityHidden(true)
            }

            if instance.status == "done" {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(theme.accentOnBackground)
                    .font(.system(size: 18))
            }
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("task.\(instance.task.id)")
        .contentShape(Rectangle())
        .draggable(instance.task.id)
        .sheet(isPresented: $showMove) {
            VStack(spacing: 12) {
                Text("Move to").font(.paceHeading(20)).padding(.top, 20)
                DatePicker("Day", selection: $moveDate, displayedComponents: .date)
                    .datePickerStyle(.graphical).padding(.horizontal, 16)
                    .accessibilityIdentifier("task.moveDate")
                Button("Move") {
                    session.moveTask(instance.task.id, to: PaceState.dayKey(for: moveDate)); showMove = false
                }
                .font(.paceBody(17)).fontWeight(.bold).foregroundStyle(PaceColor.white)
                .frame(maxWidth: .infinity).frame(height: 50)
                .background(PaceColor.stillWater).clipShape(Capsule()).padding(.horizontal, 20)
                .accessibilityIdentifier("task.moveGo")
                Spacer()
            }
            .presentationDetents([.large])
        }
        .confirmationDialog("Delete this task?", isPresented: $confirmDelete) {
            Button("Delete", role: .destructive) { session.deleteTask(instance.task.id) }
        }
    }

    private var edgeColor: Color {
        guard let hex = instance.task.color, hex.hasPrefix("#"), hex.count == 7,
              let value = UInt32(hex.dropFirst(), radix: 16) else {
            return PaceColor.waterMid
        }
        return Color(hex: value)
    }
}
