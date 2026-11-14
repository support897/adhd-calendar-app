import Foundation
import FirebaseFirestore

/// SHARED GOALS — the proven web shape carried native
/// (pace-b39 sharing.js, build 39, rules v2.6 of record).
/// A shared goal lives OUTSIDE the private state: one goal
/// doc at sharedGoals/{id} plus one doc per step at
/// sharedGoals/{id}/steps/{sid}. The goal doc id is a long
/// random string — it is the share link's secret. The rules
/// are the wall: every step doc fences its own write, and
/// the status triple (status/doneBy/doneAt) moves only for
/// the step's stored assignee. This layer mirrors the web
/// transport exactly: whole-doc writes diffed from a fresh
/// read, steps born open, a born-done step ticked right
/// after its birth by its assignee through the same fence.
struct SharedStep: Identifiable {
    var sid: String
    var title: String
    var date: String
    var time: String?
    var durationMin: Double = 20
    var minVersion: String?
    var assignee: String?
    var status: String = "todo"
    var doneBy: String?
    var doneAt: Double?
    var createdBy: String?
    var id: String { sid }
}

struct SharedGoal: Identifiable {
    var id: String
    var title: String = ""
    var ownerUid: String = ""
    var ownerName: String = ""
    var members: [String: (name: String, focus: String)] = [:]
    var stepCount: Int = 0
    var closed: Bool = false
    var splitMode: String = "strengths"
    var end: String?
    var steps: [SharedStep] = []
    var stepsLoaded: Bool = false
}

enum SharedGoals {
    private static var db: Firestore { Firestore.firestore() }
    static let linkBase = "https://adhd-calendar-app-beta.vercel.app/?join="

    static func shareLink(_ id: String) -> String { linkBase + id }

    /// The id alphabet of record (no look-alike characters).
    static func newId() -> String {
        let alphabet = Array("abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        return String((0..<22).map { _ in alphabet[Int.random(in: 0..<alphabet.count)] })
    }

    static func idFromLink(_ text: String) -> String? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if let range = trimmed.range(of: "?join=") {
            let tail = trimmed[range.upperBound...].prefix(while: { $0.isLetter || $0.isNumber })
            return tail.isEmpty ? nil : String(tail)
        }
        return trimmed.count >= 10 && trimmed.allSatisfy({ $0.isLetter || $0.isNumber }) ? trimmed : nil
    }

    // MARK: Create (sharing.js create of record)

    static func create(uid: String, ownerName: String, title: String, end: String?,
                       steps: [SharedStep]) async -> String? {
        let id = newId()
        var body: [String: Any] = [
            "ownerUid": uid,
            "ownerName": ownerName,
            "title": title,
            "members": [uid: ["name": ownerName, "focus": ""]],
            "createdAt": Int(Date().timeIntervalSince1970 * 1000),
            "updatedAt": Int(Date().timeIntervalSince1970 * 1000),
            "closed": false,
            "splitMode": "strengths",
            "stepCount": steps.count,
        ]
        if let end { body["end"] = end }
        do {
            try await db.collection("sharedGoals").document(id).setData(body)
            for step in steps {
                var born = stepBody(step, callerUid: uid)
                let wantDone = step.status == "done"
                born["status"] = "todo"
                born["doneBy"] = NSNull()
                born["doneAt"] = NSNull()
                try await db.collection("sharedGoals").document(id)
                    .collection("steps").document(step.sid).setData(born)
                if wantDone {
                    var done = stepBody(step, callerUid: uid)
                    done["doneAt"] = Int(Date().timeIntervalSince1970 * 1000)
                    try await db.collection("sharedGoals").document(id)
                        .collection("steps").document(step.sid).setData(done)
                }
            }
            return id
        } catch {
            print("Shared goal create ended: \(error.localizedDescription)")
            return nil
        }
    }

    private static func stepBody(_ s: SharedStep, callerUid: String) -> [String: Any] {
        var body: [String: Any] = [
            "title": s.title,
            "date": s.date,
            "durationMin": s.durationMin,
            "status": s.status == "done" ? "done" : "todo",
            "createdBy": s.createdBy ?? callerUid,
        ]
        body["time"] = s.time ?? NSNull()
        body["minVersion"] = s.minVersion ?? NSNull()
        body["assignee"] = s.assignee ?? NSNull()
        body["doneBy"] = s.doneBy ?? NSNull()
        body["doneAt"] = s.doneAt ?? NSNull()
        return body
    }

    // MARK: Read (sharing.js get of record)

    static func get(id: String, uid: String) async -> SharedGoal? {
        do {
            let snap = try await db.collection("sharedGoals").document(id).getDocument()
            guard let data = snap.data() else { return nil }
            var goal = SharedGoal(id: id)
            goal.title = (data["title"] as? String) ?? ""
            goal.ownerUid = (data["ownerUid"] as? String) ?? ""
            goal.ownerName = (data["ownerName"] as? String) ?? ""
            goal.closed = (data["closed"] as? Bool) ?? false
            goal.splitMode = (data["splitMode"] as? String) ?? "strengths"
            goal.end = data["end"] as? String
            goal.stepCount = (data["stepCount"] as? NSNumber)?.intValue ?? 0
            if let rawMembers = data["members"] as? [String: Any] {
                for (memberUid, raw) in rawMembers {
                    let entry = raw as? [String: Any]
                    goal.members[memberUid] = (name: (entry?["name"] as? String) ?? "",
                                               focus: (entry?["focus"] as? String) ?? "")
                }
            }
            guard goal.members[uid] != nil else {
                goal.stepsLoaded = false
                return goal   // a non-member reads the goal doc alone
            }
            let stepsSnap = try await db.collection("sharedGoals").document(id)
                .collection("steps").getDocuments()
            goal.steps = stepsSnap.documents.map { doc in
                let d = doc.data()
                var step = SharedStep(sid: doc.documentID,
                                      title: (d["title"] as? String) ?? "",
                                      date: (d["date"] as? String) ?? "")
                step.time = d["time"] as? String
                step.durationMin = (d["durationMin"] as? NSNumber)?.doubleValue ?? 20
                step.minVersion = d["minVersion"] as? String
                step.assignee = d["assignee"] as? String
                step.status = (d["status"] as? String) ?? "todo"
                step.doneBy = d["doneBy"] as? String
                step.doneAt = (d["doneAt"] as? NSNumber)?.doubleValue
                step.createdBy = d["createdBy"] as? String
                return step
            }.sorted { a, b in a.date != b.date ? a.date < b.date : a.sid < b.sid }
            goal.stepCount = goal.steps.count
            goal.stepsLoaded = true
            return goal
        } catch {
            print("Shared goal read ended: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: Join / tick / claim (the fences, mirrored)

    /// Join adds the caller and only the caller (one-diff on
    /// the members map, written as the whole doc, as act does).
    static func join(id: String, uid: String, name: String) async -> SharedGoal? {
        guard let goal = await get(id: id, uid: uid) else { return nil }
        if goal.closed { return nil }
        if goal.members[uid] != nil { return goal }
        var members = goal.members
        members[uid] = (name: String(name.prefix(100)), focus: "")
        do {
            var body: [String: Any] = [
                "ownerUid": goal.ownerUid, "ownerName": goal.ownerName,
                "title": goal.title, "closed": goal.closed,
                "splitMode": goal.splitMode, "stepCount": goal.stepCount,
                "members": members.mapValues { ["name": $0.name, "focus": $0.focus] },
                "updatedAt": Int(Date().timeIntervalSince1970 * 1000),
            ]
            if let end = goal.end { body["end"] = end }
            try await db.collection("sharedGoals").document(id).setData(body)
            return await get(id: id, uid: uid)
        } catch {
            print("Shared goal join ended: \(error.localizedDescription)")
            return nil
        }
    }

    /// A tick moves only for the step's stored assignee —
    /// checked here in the open; the rules fence it for real.
    static func tick(id: String, step: SharedStep, done: Bool, uid: String) async -> Bool {
        guard step.assignee == uid else { return false }
        var moved = step
        moved.status = done ? "done" : "todo"
        moved.doneBy = done ? uid : nil
        moved.doneAt = done ? Date().timeIntervalSince1970 * 1000 : nil
        do {
            try await db.collection("sharedGoals").document(id)
                .collection("steps").document(step.sid)
                .setData(stepBody(moved, callerUid: uid))
            return true
        } catch {
            print("Shared step tick ended: \(error.localizedDescription)")
            return false
        }
    }

    static func setAssignee(id: String, step: SharedStep, assignee: String?) async -> Bool {
        var moved = step
        moved.assignee = assignee
        do {
            try await db.collection("sharedGoals").document(id)
                .collection("steps").document(step.sid)
                .setData(stepBody(moved, callerUid: step.createdBy ?? ""))
            return true
        } catch {
            print("Shared step assign ended: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: The divide (sharing-ui.js divideSteps of record)
    //
    // Open steps only; done steps never move. "strengths": a
    // step goes to the person whose focus words match its
    // title best; no match (or "even"): the step goes to
    // whoever has the fewest minutes so far — always fair.

    private static let stopWords: Set<String> = ["the", "and", "for", "your", "you", "one", "this", "that", "with", "from", "into", "step", "steps", "all", "get", "put", "out", "per", "day"]

    static func tokens(_ text: String) -> [String] {
        text.lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { $0.count >= 3 && !stopWords.contains($0) }
    }

    static func divide(steps: [SharedStep], members: [(uid: String, focus: String)],
                       mode: String) -> [String: String?] {
        var mins: [String: Double] = [:]
        for m in members { mins[m.uid] = 0 }
        for s in steps where s.status == "done" {
            if let a = s.assignee, mins[a] != nil { mins[a]! += s.durationMin }
        }
        func fewest() -> String? {
            members.min { (mins[$0.uid] ?? 0) < (mins[$1.uid] ?? 0) }?.uid
        }
        var out: [String: String?] = [:]
        let open = steps.filter { $0.status != "done" }.sorted { $0.date < $1.date }
        for step in open {
            var pick: String? = nil
            if mode == "strengths" {
                let titleTokens = tokens(step.title)
                var bestScore = 0
                for m in members {
                    let score = tokens(m.focus).filter { titleTokens.contains($0) }.count
                    if score > bestScore || (score == bestScore && score > 0 && pick != nil
                                             && (mins[m.uid] ?? 0) < (mins[pick!] ?? 0)) {
                        bestScore = score
                        pick = m.uid
                    }
                }
                if bestScore == 0 { pick = nil }
            }
            if pick == nil { pick = fewest() }
            out[step.sid] = pick
            if let assigned = pick { mins[assigned, default: 0] += step.durationMin }
        }
        return out
    }
}
