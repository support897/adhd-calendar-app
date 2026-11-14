import SwiftUI

/// TO DO — the quick list (Phase 1 shape): write one fast at
/// the top, tick it when it is done. The todos array of
/// record: {id, text, done, calTaskId}. A linked to-do
/// (calTaskId set) is its calendar task wearing a list face;
/// ticking here ticks the day's instance too, through the
/// task door — the shipped app's one-truth rule.
/// Text budget: 6 app words (To do · Add · Nothing here yet
/// never stands beside the list itself).
struct TodosView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var draft: String = ""

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                TextField("Write one fast", text: $draft)
                    .font(.paceBody(16))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(PaceColor.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(PaceColor.waterLight.opacity(0.6), lineWidth: 1))
                    .accessibilityIdentifier("todos.field")
                Button("Add") {
                    let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !text.isEmpty else { return }
                    draft = ""
                    session.addTodo(text: text)
                }
                .font(.paceBody(16))
                .fontWeight(.semibold)
                .foregroundStyle(PaceColor.stillWater)
                .frame(minHeight: 44)
                .accessibilityIdentifier("todos.add")
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            ScrollView {
                VStack(alignment: .leading, spacing: 6) {
                    if let state = session.state {
                        ForEach(state.todos) { todo in
                            HStack(spacing: 12) {
                                Button {
                                    toggle(todo)
                                } label: {
                                    Image(systemName: todo.done ? "checkmark.circle.fill" : "circle")
                                        .font(.system(size: 22))
                                        .foregroundStyle(todo.done ? PaceColor.stillWater : PaceColor.waterLight)
                                }
                                .buttonStyle(.plain)
                                .frame(minHeight: 44)
                                .accessibilityIdentifier("todos.tick.\(todo.id)")
                                Text(todo.text)
                                    .font(.paceBody(16))
                                    .foregroundStyle(PaceColor.pine.opacity(todo.done ? 0.45 : 1))
                                    .strikethrough(todo.done)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, 6)
                            .accessibilityElement(children: .contain)
                            .accessibilityIdentifier("todos.row.\(todo.id)")
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
            }
        }
        .background(ThemedBackground())
        .navigationTitle("To do")
    }

    private func toggle(_ todo: PaceTodo) {
        let done = !todo.done
        session.setTodoDone(todoId: todo.id, done: done)
        if let taskId = todo.calTaskId {
            session.setTaskDone(taskId: taskId, dayKey: PaceState.todayString, done: done)
        }
    }
}
