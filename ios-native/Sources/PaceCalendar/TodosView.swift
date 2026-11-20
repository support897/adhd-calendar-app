import SwiftUI
import PhotosUI

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
    @EnvironmentObject private var theme: ThemeStore
    @State private var draft: String = ""
    @FocusState private var fieldFocus: Bool
    @StateObject private var voice = VoiceBox()
    @State private var photo: PhotosPickerItem? = nil

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                TextField("Write it, fast", text: $draft)
                    .environment(\.colorScheme, .light)
                    .font(.paceBody(16))
                    .foregroundStyle(PaceColor.pine)
                    .focused($fieldFocus)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(PaceColor.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(PaceColor.waterMid, lineWidth: 1))
                    .contentShape(Rectangle()).onTapGesture { fieldFocus = true }
                    .accessibilityIdentifier("todos.field")
                Button("Add") {
                    let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !text.isEmpty else { return }
                    draft = ""
                    session.addTodo(text: text)
                }
                .font(.paceBody(16))
                .fontWeight(.semibold)
                .foregroundStyle(theme.accentOnBackground)
                .frame(minHeight: 44)
                .accessibilityIdentifier("todos.add")
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            HStack(spacing: 12) {
                Button { voice.toggle { heard in draft = heard } } label: {
                    Label("Speak", systemImage: voice.listening ? "mic.fill" : "mic")
                        .font(.paceBody(15)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.waterDeep)
                        .padding(.horizontal, 16).frame(minHeight: 44)
                        .background(PaceColor.white).clipShape(Capsule())
                        .overlay(Capsule().stroke(PaceColor.waterMid, lineWidth: 1))
                }
                .buttonStyle(.plain).accessibilityIdentifier("todos.mic")
                PhotosPicker(selection: $photo, matching: .images) {
                    Label("Photo", systemImage: "photo")
                        .font(.paceBody(15)).fontWeight(.semibold)
                        .foregroundStyle(PaceColor.waterDeep)
                        .padding(.horizontal, 16).frame(minHeight: 44)
                        .background(PaceColor.white).clipShape(Capsule())
                        .overlay(Capsule().stroke(PaceColor.waterMid, lineWidth: 1))
                }
                .accessibilityIdentifier("todos.photo")
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 20).padding(.top, 10)
            .onChange(of: photo) { _, item in
                guard let item else { return }
                Task {
                    if let d = try? await item.loadTransferable(type: Data.self), let img = UIImage(data: d) {
                        let read = MessyNotes.clean(await NoteScanner.read(img))
                        draft += (draft.isEmpty ? "" : " ") + read
                    }
                    photo = nil
                }
            }

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
                                        .foregroundStyle(todo.done ? theme.accentOnBackground : theme.iconOnBackground)
                                }
                                .buttonStyle(.plain)
                                .frame(minHeight: 44)
                                .accessibilityIdentifier("todos.tick.\(todo.id)")
                                Text(todo.text)
                                    .font(.paceBody(16))
                                    .foregroundStyle(todo.done ? theme.secondaryOnBackground : theme.inkOnBackground)
                                    .strikethrough(todo.done)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, 6)
                            .contentShape(Rectangle())
                            .draggable("todo:" + todo.id)
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
        .dropDestination(for: String.self) { ids, _ in
            session.drop(ids, onTodos: true); return !ids.isEmpty
        }
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
