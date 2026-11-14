import Foundation
import FirebaseAuth
import FirebaseCore
import GoogleSignIn
import UIKit

/// Sign-in session + the read of her state that follows it.
/// Every door failure — cancel included — returns quietly:
/// no error line ever stands on a door (door law).
@MainActor
final class SessionStore: ObservableObject {
    @Published private(set) var userID: String?
    @Published private(set) var state: PaceState?
    @Published private(set) var stateLoaded = false
    /// Name asked at email sign-up this session. The SAVED
    /// profileName in her state always wins for greetings
    /// (per-user name law); this only fills a first-run gap.
    @Published var askedName: String?

    private var listener: AuthStateDidChangeListenerHandle?
    private let appleHelper = AppleSignInHelper()

    init() {
        FirebaseBootstrap.configureIfNeeded()
        listener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                guard let self else { return }
                self.userID = user?.uid
                if let uid = user?.uid {
                    self.stateLoaded = false
                    self.state = await StateStore.loadState(uid: uid)
                    self.stateLoaded = true
                    self.slideMissedDaysIfNeeded()
                } else {
                    self.state = nil
                    self.stateLoaded = false
                }
            }
        }
    }

    /// Stand the screens on a state a write just re-read
    /// (used by flows that write through StateStore directly).
    func applyFreshState(_ fresh: PaceState) {
        state = fresh
    }

    /// First word of her saved name — the greeting shape of
    /// record (web app.js: greetings use profileName's first word).
    var greetingName: String? {
        if let saved = state?.profileName, !saved.isEmpty {
            return saved.split(separator: " ").first.map(String.init)
        }
        if let asked = askedName, !asked.isEmpty {
            return asked.split(separator: " ").first.map(String.init)
        }
        return nil
    }

    // MARK: Google — checked first, used first (her Google-first law)

    func signInWithGoogle() {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            // Twin builds carry no Google client of their own
            // (named in FirebaseBootstrap): the door stays calm.
            print("Google sign-in unavailable in this build (no client ID).")
            return
        }
        guard let presenter = Self.topViewController() else { return }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        Task {
            do {
                let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
                let idToken = result.user.idToken?.tokenString ?? ""
                let credential = GoogleAuthProvider.credential(
                    withIDToken: idToken,
                    accessToken: result.user.accessToken.tokenString)
                try await Auth.auth().signIn(with: credential)
            } catch {
                print("Google sign-in ended: \(error.localizedDescription)")
            }
        }
    }

    // MARK: Apple

    func signInWithApple() {
        Task {
            do {
                let (idToken, rawNonce) = try await appleHelper.signIn()
                // The nonce handed to Firebase is the RAW nonce,
                // verbatim — only its hash went on the request
                // (the nonce rule of record).
                let credential = OAuthProvider.credential(providerID: .apple,
                                                          idToken: idToken,
                                                          rawNonce: rawNonce)
                try await Auth.auth().signIn(with: credential)
            } catch {
                print("Apple sign-in ended: \(error.localizedDescription)")
            }
        }
    }

    // MARK: Email door

    func signInWithEmail(email: String, password: String) {
        Task {
            do {
                try await Auth.auth().signIn(withEmail: email, password: password)
            } catch {
                print("Email sign-in ended: \(error.localizedDescription)")
            }
        }
    }

    func createAccount(email: String, password: String, name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            do {
                try await Auth.auth().createUser(withEmail: email, password: password)
                if !trimmed.isEmpty { askedName = trimmed }
            } catch {
                print("Create account ended: \(error.localizedDescription)")
            }
        }
    }

    func signOut() {
        try? Auth.auth().signOut()
        GIDSignIn.sharedInstance.signOut()
    }

    // MARK: - Writes (the ruled door — StateStore.mutate)
    //
    // The signed-in user writes their OWN state document, in
    // the shipped whole-document shape, and the screens then
    // stand on the re-read state. Each kind is twin-proven
    // before reliance (the ruling at the head of the P3
    // commission); the proofs stand in the build note.

    /// The morning answer. Optimistic first — her tap shapes
    /// her day at once — then the server truth replaces it.
    func saveFeeling(dayKey: String, key: String) {
        guard let uid = userID else { return }
        state?.feelings[dayKey] = key
        Task {
            if let fresh = await StateStore.saveFeeling(uid: uid, dayKey: dayKey, key: key) {
                self.state = fresh
            }
        }
    }

    /// A new event on her calendar. On success the Apple
    /// Calendar mirror re-syncs from the fresh state.
    func addTask(_ task: [String: Any]) {
        guard let uid = userID else { return }
        Task {
            if let fresh = await StateStore.addTask(uid: uid, task: task) {
                self.state = fresh
                await EventKitBridge.shared.sync(tasks: fresh.tasks)
            }
        }
    }

    // MARK: - P4 write kinds (twin-proven before reliance)

    func setTaskDone(taskId: String, dayKey: String, done: Bool) {
        guard let uid = userID else { return }
        Task {
            if let fresh = await StateStore.setTaskDone(uid: uid, taskId: taskId, dayKey: dayKey, done: done) {
                self.state = fresh
                await EventKitBridge.shared.sync(tasks: fresh.tasks)
            }
        }
    }

    func setTodoDone(todoId: String, done: Bool) {
        guard let uid = userID else { return }
        Task {
            if let fresh = await StateStore.setTodoDone(uid: uid, todoId: todoId, done: done) {
                self.state = fresh
            }
        }
    }

    func addTodo(text: String) {
        guard let uid = userID else { return }
        Task {
            if let fresh = await StateStore.addTodo(uid: uid, text: text) {
                self.state = fresh
            }
        }
    }

    func setHabitDay(habitId: String, dayKey: String, on: Bool) {
        guard let uid = userID else { return }
        Task {
            if let fresh = await StateStore.setHabitDay(uid: uid, habitId: habitId, dayKey: dayKey, on: on) {
                self.state = fresh
            }
        }
    }

    func addHabit(name: String) {
        guard let uid = userID else { return }
        Task {
            if let fresh = await StateStore.addHabit(uid: uid, name: name) {
                self.state = fresh
            }
        }
    }

    // MARK: - P5: goals, the Pace Way, and sharing

    /// A new goal: the planner cuts its own words into steps,
    /// each placed in free calendar space, and the goal +
    /// steps land in one ruled write.
    func addGoal(title: String, end: String, pace: String, mins: Int, category: String = "other") {
        guard let uid = userID, let state else { return }
        let today = PaceState.todayString
        let plan = GoalPlanner.buildPlan(title: title, category: category,
                                         start: today, end: end, pace: pace, mins: mins)
        let goalId = UUID().uuidString.lowercased()
        var workingState = state
        var stepDicts: [[String: Any]] = []
        for step in plan {
            let time = GoalPlanner.freeTime(on: step.date, durationMin: step.durationMin, state: workingState)
            var dict = PaceTaskFactory.make(title: step.title, date: step.date, time: time,
                                            durationMin: step.durationMin, goalId: goalId,
                                            category: category, source: "goal")
            dict["minVersion"] = step.minVersion ?? ""
            dict["weekStart"] = step.weekStart
            if let from = step.chunkFrom, let to = step.chunkTo {
                dict["chunk"] = ["from": from, "to": to, "weekStart": step.weekStart]
            }
            stepDicts.append(dict)
            // The next step sees this one standing, so two
            // steps never land on the same free slot.
            workingState.tasks.append(PaceTask(
                id: (dict["id"] as? String) ?? "", title: step.title, date: step.date,
                time: time, durationMin: Double(step.durationMin), status: "todo",
                category: category, goalId: goalId))
        }
        let goalDict: [String: Any] = ["id": goalId, "title": title,
                                       "start": today, "end": end,
                                       "pace": pace, "category": category]
        Task {
            if let fresh = await StateStore.addGoalWithPlan(uid: uid, goal: goalDict, steps: stepDicts) {
                self.state = fresh
                await EventKitBridge.shared.sync(tasks: fresh.tasks)
            }
        }
    }

    // MARK: - P6/P7: the settings door (one write kind)

    func updateSettings(_ change: @escaping (inout [String: Any]) -> Void) {
        guard let uid = userID else { return }
        Task {
            if let fresh = await StateStore.updateSettings(uid: uid, change) {
                self.state = fresh
            }
        }
    }

    func setProfileName(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        updateSettings { settings in settings["profileName"] = trimmed }
    }

    func setCheckinTime(_ time: String) {
        updateSettings { settings in settings["checkinTime"] = time }
    }

    func setTheme(_ key: String) {
        updateSettings { settings in
            var appearance = settings["appearance"] as? [String: Any] ?? [:]
            appearance["theme"] = key
            appearance["bgChoice"] = "theme"
            settings["appearance"] = appearance
        }
    }

    func setNotif(_ field: String, _ on: Bool) {
        updateSettings { settings in
            var notif = settings["notif"] as? [String: Any] ?? [:]
            notif[field] = on
            if field == "start" || field == "checkin" || field == "digest" || field == "done" {
                notif["perm"] = "granted"
            }
            settings["notif"] = notif
        }
    }

    func setNotifSetup(_ minutes: Int) {
        updateSettings { settings in
            var notif = settings["notif"] as? [String: Any] ?? [:]
            notif["setup"] = minutes
            settings["notif"] = notif
        }
    }

    /// Missed days slide on their own: on load, a goal with
    /// at least one overdue open step replans its whole open
    /// run onto the remaining plan days (replan of record).
    /// A goal with nothing overdue is never touched.
    func slideMissedDaysIfNeeded() {
        guard let uid = userID, let state else { return }
        let today = PaceState.todayString
        var allMoves: [(id: String, date: String)] = []
        for goal in state.goals {
            let hasOverdue = state.tasks.contains {
                $0.goalId == goal.id && $0.status != "done" && $0.date < today
            }
            if hasOverdue {
                allMoves += GoalPlanner.replan(goal: goal, tasks: state.tasks, today: today)
            }
        }
        guard !allMoves.isEmpty else { return }
        Task {
            if let fresh = await StateStore.applyReplan(uid: uid, moves: allMoves) {
                self.state = fresh
            }
        }
    }

    private static func topViewController() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.flatMap { $0.windows }.first { $0.isKeyWindow }
        var vc = window?.rootViewController
        while let presented = vc?.presentedViewController { vc = presented }
        return vc
    }
}
