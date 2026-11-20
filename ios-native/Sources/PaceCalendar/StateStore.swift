import Foundation
import FirebaseFirestore

/// The one door to her state document, users/{uid}/data/state.
///
/// READ (from P2): loadState parses the stateJson string.
///
/// WRITE (from P3, under the WRITE RULING of record in the P3
/// commission): one shape only — read the document fresh,
/// parse stateJson into a raw dictionary, apply the change,
/// set the state's own updatedAt to now (epoch milliseconds,
/// a NUMBER, exactly as the shipped web app's save() does),
/// then write the WHOLE document back as exactly two fields:
/// { stateJson: <string>, updatedAt: <ISO string> } — the
/// shipped web app's syncNow() shape, byte-shape identical.
/// No partial-field writes, no new fields, no second document;
/// the account spine users/{uid} is never touched here.
/// The raw-dictionary round trip means keys this app does not
/// model (her photo, imports, anything) survive every write.
///
/// Every NEW KIND of write is proven on the test twin
/// pace-test-c00fa first (in-app drive + REST read-back)
/// before the path is relied on — the ruling stands at the
/// head of P3-COMMISSION.md.
enum StateStore {

    static func loadState(uid: String) async -> PaceState? {
        let ref = Firestore.firestore()
            .collection("users").document(uid)
            .collection("data").document("state")
        do {
            let snap = try await ref.getDocument()
            guard let fields = snap.data(),
                  let stateJson = fields["stateJson"] as? String else {
                return nil
            }
            return PaceState.parse(stateJson: stateJson)
        } catch {
            print("PaceState load failed: \(error.localizedDescription)")
            return nil
        }
    }

    /// The ruled write. Returns the freshly re-read state on
    /// success so the caller's screens stand on server truth.
    static func mutate(uid: String, _ change: (inout [String: Any]) -> Void) async -> PaceState? {
        let ref = Firestore.firestore()
            .collection("users").document(uid)
            .collection("data").document("state")
        do {
            let snap = try await ref.getDocument()
            guard let fields = snap.data(),
                  let stateJson = fields["stateJson"] as? String,
                  let data = stateJson.data(using: .utf8),
                  var root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
                print("PaceState write refused: no readable state document.")
                return nil
            }
            change(&root)
            let now = Date()
            root["updatedAt"] = Int(now.timeIntervalSince1970 * 1000)
            let outData = try JSONSerialization.data(withJSONObject: root, options: [])
            guard let outJson = String(data: outData, encoding: .utf8) else { return nil }
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            try await ref.setData(["stateJson": outJson,
                                   "updatedAt": iso.string(from: now)])
            return PaceState.parse(root: root)
        } catch {
            print("PaceState write failed: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - Write kinds (each twin-proven before reliance)

    /// P3 kind 1: the morning answer — feelings[dayKey] = key.
    static func saveFeeling(uid: String, dayKey: String, key: String) async -> PaceState? {
        await mutate(uid: uid) { root in
            var feelings = root["feelings"] as? [String: Any] ?? [:]
            feelings[dayKey] = key
            root["feelings"] = feelings
        }
    }

    /// P3 kind 2: a new task appended to tasks, in the shipped
    /// task shape (the caller builds the full dictionary).
    static func addTask(uid: String, task: [String: Any]) async -> PaceState? {
        await mutate(uid: uid) { root in
            var tasks = root["tasks"] as? [[String: Any]] ?? []
            tasks.append(task)
            root["tasks"] = tasks
        }
    }

    /// P4 kind 3: a task ticked in place. A repeating task
    /// ticks the DAY (doneDates gains/loses the day key, the
    /// shipped app.js shape); a plain task flips its status
    /// and stamps doneOn, exactly as the web save does.
    static func setTaskDone(uid: String, taskId: String, dayKey: String, done: Bool) async -> PaceState? {
        await mutate(uid: uid) { root in
            guard var tasks = root["tasks"] as? [[String: Any]],
                  let idx = tasks.firstIndex(where: { ($0["id"] as? String) == taskId }) else { return }
            var task = tasks[idx]
            if (task["repeat"] as? String) != nil {
                var doneDates = (task["doneDates"] as? [Any])?.compactMap { $0 as? String } ?? []
                if done { if !doneDates.contains(dayKey) { doneDates.append(dayKey) } }
                else { doneDates.removeAll { $0 == dayKey } }
                task["doneDates"] = doneDates
            } else {
                task["status"] = done ? "done" : "todo"
                task["doneOn"] = done ? dayKey : NSNull()
            }
            tasks[idx] = task
            root["tasks"] = tasks
        }
    }

    /// P4 kind 4: a to-do's done flag (the todos array of
    /// record: {id, text, done, calTaskId}).
    static func setTodoDone(uid: String, todoId: String, done: Bool) async -> PaceState? {
        await mutate(uid: uid) { root in
            guard var todos = root["todos"] as? [[String: Any]],
                  let idx = todos.firstIndex(where: { ($0["id"] as? String) == todoId }) else { return }
            todos[idx]["done"] = done
            root["todos"] = todos
        }
    }

    /// P4 kind 5: a new to-do, unshifted to the top exactly
    /// as the shipped app does (state.todos.unshift).
    static func addTodo(uid: String, text: String) async -> PaceState? {
        await mutate(uid: uid) { root in
            var todos = root["todos"] as? [[String: Any]] ?? []
            todos.insert(["id": UUID().uuidString.lowercased(),
                          "text": text, "done": false,
                          "calTaskId": NSNull()], at: 0)
            root["todos"] = todos
        }
    }

    /// P4 kind 6: a habit's day tick — habits[i].days[dayKey].
    static func setHabitDay(uid: String, habitId: String, dayKey: String, on: Bool) async -> PaceState? {
        await mutate(uid: uid) { root in
            guard var habits = root["habits"] as? [[String: Any]],
                  let idx = habits.firstIndex(where: { ($0["id"] as? String) == habitId }) else { return }
            var days = habits[idx]["days"] as? [String: Any] ?? [:]
            if on { days[dayKey] = true } else { days.removeValue(forKey: dayKey) }
            habits[idx]["days"] = days
            root["habits"] = habits
        }
    }

    /// P4 kind 7: a new habit in the shipped shape
    /// {id, name, icon, days, plan, tiny}.
    static func addHabit(uid: String, name: String, extra: [String: Any] = [:]) async -> PaceState? {
        await mutate(uid: uid) { root in
            var habits = root["habits"] as? [[String: Any]] ?? []
            var h: [String: Any] = ["id": UUID().uuidString.lowercased(),
                           "name": name, "icon": "star",
                           "days": [String: Any](), "plan": "", "tiny": ""]
            for (k, v) in extra { h[k] = v }
            habits.append(h)
            root["habits"] = habits
        }
    }

    /// P5 kind 8: a new goal WITH its divided plan — the goal
    /// dictionary and every step task land in ONE whole-state
    /// write (goals gains the goal; tasks gains the steps,
    /// each tied by goalId, in the shipped task shape).
    static func addGoalWithPlan(uid: String, goal: [String: Any], steps: [[String: Any]]) async -> PaceState? {
        await mutate(uid: uid) { root in
            var goals = root["goals"] as? [[String: Any]] ?? []
            goals.append(goal)
            root["goals"] = goals
            var tasks = root["tasks"] as? [[String: Any]] ?? []
            tasks.append(contentsOf: steps)
            root["tasks"] = tasks
        }
    }

    /// P5 kind 9: the slide — missed days move on their own
    /// (replan of record): the listed tasks take new dates,
    /// nothing else moves.
    static func applyReplan(uid: String, moves: [(id: String, date: String)]) async -> PaceState? {
        await mutate(uid: uid) { root in
            guard var tasks = root["tasks"] as? [[String: Any]] else { return }
            let byId = Dictionary(uniqueKeysWithValues: moves.map { ($0.id, $0.date) })
            for idx in tasks.indices {
                if let id = tasks[idx]["id"] as? String, let newDate = byId[id] {
                    tasks[idx]["date"] = newDate
                }
            }
            root["tasks"] = tasks
        }
    }

    /// P5 kind 10: link a local goal to its shared goal
    /// (goals[i].sharedGoalId) — the join point the web
    /// carries, so her calendar and the shared goal agree.
    static func setGoalSharedId(uid: String, goalId: String, sharedId: String) async -> PaceState? {
        await mutate(uid: uid) { root in
            guard var goals = root["goals"] as? [[String: Any]],
                  let idx = goals.firstIndex(where: { ($0["id"] as? String) == goalId }) else { return }
            goals[idx]["sharedGoalId"] = sharedId
            root["goals"] = goals
        }
    }

    /// P6 kind 11 — THE SETTINGS DOOR: one write kind for
    /// every settings change (her name, the check-in time,
    /// the theme pick, the notification switches). The
    /// transform edits the settings dictionary in place;
    /// nothing outside settings moves, and settings keys
    /// this app does not model (her photo above all) ride
    /// through untouched in the raw round trip.
    static func updateSettings(uid: String, _ change: (inout [String: Any]) -> Void) async -> PaceState? {
        await mutate(uid: uid) { root in
            var settings = root["settings"] as? [String: Any] ?? [:]
            change(&settings)
            root["settings"] = settings
        }
    }
}

/// Builds one task dictionary in the shipped web shape
/// (pace-b39 app.js add-task of record: id, title, date, time,
/// durationMin, priority, repeat, category, color, essential,
/// status, steps, minVersion, fullVersion, source,
/// originalText, skipDates, doneDates — nulls carried, never
/// omitted, exactly as the seed and the web app write them).
enum PaceTaskFactory {
    static func make(title: String, date: String, time: String?,
                     durationMin: Int, repeatRule: String? = nil,
                     goalId: String? = nil, category: String = "other",
                     color: String = "#5B6BD5", source: String = "manual") -> [String: Any] {
        var task: [String: Any] = [
            "id": UUID().uuidString.lowercased(),
            "title": title,
            "date": date,
            "durationMin": durationMin,
            "priority": 0,
            "category": category,
            "color": color,
            "essential": false,
            "status": "todo",
            "steps": [String](),
            "minVersion": "",
            "fullVersion": "",
            "source": source,
            "originalText": "",
            "skipDates": [String](),
            "doneDates": [String](),
        ]
        task["time"] = time ?? NSNull()
        task["repeat"] = repeatRule ?? NSNull()
        task["remind"] = NSNull()
        task["icon"] = ""
        if let goalId { task["goalId"] = goalId }
        return task
    }
}
