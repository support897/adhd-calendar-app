import Foundation

/// THE PACE WAY — the dividing maths, ported from the
/// shipped goals.js of record (buildPlanCore + planDays +
/// analyzeWork/buildCountSteps + analyzeList +
/// parseMilestones/TEMPLATES + replan). A goal's own words
/// are cut into ONE small step per plan day: weekly chunks,
/// 15–25 minutes each by default, the last tenth of the days
/// kept as buffer so a slip never means failure, every 7th
/// step a short review, and missed days slide on their own
/// (replan). Steps are tasks in her state, tied by goalId.
///
/// NAMED SCOPE: the build-34 revenue/funnel planner
/// (analyzeRevenue) is not ported in this round — a revenue
/// goal falls to the money-count path below. Named here and
/// in the build note, never silent.
enum GoalPlanner {

    struct Step {
        var date: String
        var title: String
        var durationMin: Int
        var minVersion: String?
        var chunkFrom: Int?
        var chunkTo: Int?
        var weekStart: String
    }

    // MARK: Day helpers (local keys, as everywhere in Pace)

    static func addDays(_ key: String, _ n: Int) -> String {
        HabitsView.addDays(key, n)
    }

    static func diffDays(_ a: String, _ b: String) -> Int {
        guard let da = PaceState.date(fromKey: a), let db = PaceState.date(fromKey: b) else { return 0 }
        return Int((db.timeIntervalSince(da) / 86400).rounded())
    }

    static func weekdayOf(_ key: String) -> Int {
        guard let d = PaceState.date(fromKey: key) else { return 0 }
        return Calendar.current.component(.weekday, from: d) - 1   // 0 = Sunday
    }

    static func mondayOf(_ key: String) -> String {
        let wd = weekdayOf(key)
        return addDays(key, -((wd + 6) % 7))
    }

    /// planDays of record: pace "daily" | "weekdays" | "three"
    /// (Mon/Wed/Fri), capped at 400 days.
    static func planDays(start: String, end: String, pace: String) -> [String] {
        let span = diffDays(start, end)
        guard span >= 0 else { return [] }
        var out: [String] = []
        for i in 0...min(span, 400) {
            let key = addDays(start, i)
            let wd = weekdayOf(key)
            if pace == "weekdays" && (wd == 0 || wd == 6) { continue }
            if pace == "three" && wd != 1 && wd != 3 && wd != 5 { continue }
            out.append(key)
        }
        return out
    }

    // MARK: Templates of record (goals.js TEMPLATES + ROTATE)

    static let templates: [String: [String]] = [
        "school": ["Get clear on what is due and when", "Gather your notes, readings and materials", "Learn the first part", "Learn the middle part", "Learn the last part", "Practise and test yourself", "Review the hard parts", "Final check and hand in"],
        "work": ["Write down what done looks like", "Gather what you need", "Do the first part", "Do the middle part", "Do the last part", "Check it and fix gaps", "Finish and share"],
        "health": ["Decide what done looks like and why it matters", "Set up what you need", "Start small: the first routine", "Build up gently", "Keep going: the middle stretch", "Check how it is going and adjust", "Reach it and look back"],
        "money": ["Write down the exact number and date", "Gather your numbers", "Make the first move", "Keep going: the middle stretch", "Check the numbers and adjust", "Finish the last part", "Look back and celebrate"],
        "home": ["Walk round and list what needs doing", "Gather what you need", "Do the first area", "Do the next area", "Do the last area", "Final tidy and check"],
        "personal": ["Decide what done looks like", "Set up what you need", "Do the first part", "Keep going: the middle part", "Check how it is going and adjust", "Finish the last part", "Look back and celebrate"],
        "other": ["Decide what done looks like", "Set up what you need", "Do the first part", "Keep going: the middle part", "Check how it is going and adjust", "Finish the last part", "Look back and celebrate"],
    ]

    static let rotateByCat: [String: [String]] = [
        "school": ["Learn one small chunk: ", "Write 5 key points: ", "Say it back without notes: ", "Try 5 practice questions: ", "Fix the shaky bits: ", "Do one more small piece: "],
        "work": ["Do the next small piece of: ", "Move one step on: ", "Do 20 focused minutes on: ", "Clear the next blocker on: ", "Polish one part of: ", "Do one more small piece of: "],
        "health": ["Do a gentle session of: ", "Keep going with: ", "A short, easy round of: ", "One more small step on: ", "Check in kindly with: ", "Keep it kind: "],
        "money": ["Check the numbers on: ", "Make one small move on: ", "Move a little closer on: ", "Write down progress on: ", "Do the next small step on: ", "Review and adjust: "],
        "home": ["Do the next corner of: ", "Tidy one more bit of: ", "Keep going on: ", "Sort one small part of: ", "One more small piece of: ", "Finish the next bit of: "],
    ]
    static let rotateDefault = ["Do the next small piece of: ", "Keep going with: ", "One small step on: ", "Move one bit further on: ", "Do a little more of: ", "Come back to: "]

    static func parseMilestones(text: String, category: String) -> [String] {
        var lines = text.components(separatedBy: .newlines).map { line -> String in
            var l = line
            if let range = l.range(of: #"^\s*(?:[-*•]|\d{1,2}[.)]|week\s*\d+\s*[:\-]?)\s*"#,
                                   options: [.regularExpression, .caseInsensitive]) {
                l = String(l[range.upperBound...])
            }
            return l.trimmingCharacters(in: .whitespaces)
        }.filter { $0.count >= 3 }
        lines = lines.map { l in
            guard l.count > 90 else { return l }
            var cut = String(l.prefix(87))
            if let lastSpace = cut.lastIndex(of: " ") { cut = String(cut[..<lastSpace]) }
            return cut + "…"
        }
        if lines.count >= 3 { return Array(lines.prefix(16)) }
        return templates[category] ?? templates["other"]!
    }

    // MARK: The analyzer (goals.js analyzeWork / analyzeList)

    private static let unitTable: [(pattern: String, unit: String, per: Double, verb: String)] = [
        ("chapters?", "chapter", 25, "Read"), ("pages?", "page", 2, "Read"),
        ("lessons?", "lesson", 20, "Learn"), ("modules?", "module", 30, "Work through"),
        ("units?", "unit", 20, "Work through"), ("topics?", "topic", 15, "Cover"),
        ("lectures?", "lecture", 30, "Watch"), ("videos?", "video", 15, "Watch"),
        ("words?", "word", 0.12, "Write"), ("questions?", "question", 3, "Answer"),
        ("problems?", "problem", 4, "Solve"), ("exercises?", "exercise", 3, "Do"),
        ("flashcards?", "flashcard", 0.8, "Learn"), ("cards?", "card", 0.8, "Learn"),
        ("essays?", "essay", 60, "Write"), ("reports?", "report", 45, "Write"),
        ("emails?", "email", 4, "Write"), ("invoices?", "invoice", 6, "Send"),
        ("calls?", "call", 10, "Make"), ("applications?", "application", 20, "Send"),
        ("rooms?", "room", 20, "Tidy"), ("boxes?", "box", 5, "Pack"),
        ("bags?", "bag", 5, "Pack"), ("items?", "item", 5, "Sort"),
        ("songs?", "song", 10, "Practise"), ("verses?", "verse", 3, "Learn"),
        ("recipes?", "recipe", 25, "Cook"), ("plants?", "plant", 5, "Plant"),
        ("laps?", "lap", 2, "Swim"), ("km|kilometres?|kilometers?", "km", 8, "Cover"),
        ("miles?", "mile", 12, "Cover"),
    ]

    private static let leadVerbs = ["read", "write", "learn", "study", "do", "clean", "tidy", "sort", "save", "run", "walk", "practise", "practice", "make", "build", "finish", "complete", "watch", "answer", "solve", "pack", "cook", "plant", "send", "cover", "review", "prepare"]

    static func leadVerb(_ text: String) -> String? {
        let lower = text.lowercased()
        return leadVerbs.first { lower.contains($0) }.map { $0.prefix(1).uppercased() + $0.dropFirst() }
    }

    enum Work {
        case money(total: Int)
        case count(total: Int, unit: String, per: Double, verb: String)
    }

    static func analyzeWork(_ text: String) -> Work? {
        if let m = firstMatch(#"\$\s?(\d[\d,]*)"#, in: text) ?? firstMatch(#"(\d[\d,]*)\s*dollars"#, in: text, caseInsensitive: true),
           let dollars = Int(m.replacingOccurrences(of: ",", with: "")), dollars >= 10 {
            return .money(total: dollars)
        }
        for row in unitTable {
            if let m = firstMatch("(\\d[\\d,]*)[\\s-]*(?:" + row.pattern + ")\\b", in: text, caseInsensitive: true),
               let total = Int(m.replacingOccurrences(of: ",", with: "")), total >= 2, total <= 100000 {
                return .count(total: total, unit: row.unit, per: row.per,
                              verb: leadVerb(text) ?? row.verb)
            }
        }
        return nil
    }

    static func analyzeList(_ title: String) -> [String]? {
        let s = title.trimmingCharacters(in: .whitespaces)
        guard s.range(of: ",|\\band\\b", options: [.regularExpression, .caseInsensitive]) != nil else { return nil }
        var body = s
        if let range = body.range(of: #"^(please\s+)?(read|write|learn|study|do|clean|tidy|sort|save|make|build|finish|complete|prepare|organise|organize)\s+"#,
                                  options: [.regularExpression, .caseInsensitive]) {
            body = String(body[range.upperBound...])
        }
        let parts = body.components(separatedBy: ",")
            .flatMap { $0.components(separatedBy: " and ") }
            .map { $0.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "^the ", with: "", options: [.regularExpression, .caseInsensitive]) }
            .filter { $0.count >= 3 && $0.count <= 40 }
        guard parts.count >= 2, parts.count <= 8 else { return nil }
        return parts.map { $0.prefix(1).uppercased() + $0.dropFirst() }
    }

    private static func firstMatch(_ pattern: String, in text: String, caseInsensitive: Bool = false) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern,
                                                   options: caseInsensitive ? .caseInsensitive : []),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              match.numberOfRanges > 1,
              let range = Range(match.range(at: 1), in: text) else { return nil }
        return String(text[range])
    }

    // MARK: buildPlan (goals.js buildPlanCore + buildCountSteps)

    static func buildPlan(title: String, category: String = "other",
                          start: String, end: String, pace: String = "daily",
                          mins: Int = 20) -> [Step] {
        let days = planDays(start: start, end: end, pace: pace)
        guard !days.isEmpty else { return [] }
        let buffer = days.count >= 10 ? days.count / 10 : 0
        let work = Array(days.dropLast(buffer))

        if let found = analyzeWork(title) {
            return buildCountSteps(title: title, work: found, workDays: work, mins: mins)
        }

        // buildPlanCore of record: a list in the title wins;
        // otherwise the calm category template stands (the
        // web core reads milestones only from its options,
        // which the native add-goal does not gather).
        let milestones = analyzeList(title) ?? parseMilestones(text: "", category: category)
        guard !milestones.isEmpty else { return [] }

        let clampedMins = max(5, min(90, mins))
        let perM = max(1, work.count / milestones.count)
        var plan: [(m: Int, idx: Int, total: Int)] = []
        var counts: [Int: Int] = [:]
        for i in 0..<work.count {
            let m = min(milestones.count - 1, i / perM)
            counts[m, default: 0] += 1
            plan.append((m, 0, 0))
        }
        var seen: [Int: Int] = [:]
        for i in plan.indices {
            seen[plan[i].m, default: 0] += 1
            plan[i].idx = seen[plan[i].m]!
            plan[i].total = counts[plan[i].m]!
        }
        let rotate = rotateByCat[category] ?? rotateDefault
        return work.enumerated().map { i, day in
            let p = plan[i]
            let m = milestones[p.m]
            let last = i == work.count - 1
            let review = !last && (i + 1) % 7 == 0
            let text: String
            if last { text = "Finish: " + title + " (final look, then celebrate)" }
            else if review { text = "Review: look at how far you have come on " + title }
            else if p.total == 1 { text = m }
            else if p.idx == 1 { text = "Start: " + m }
            else if p.idx == p.total { text = "Finish this part: " + m }
            else { text = rotate[(p.idx - 2) % rotate.count] + m }
            return Step(date: day,
                        title: text.count > 120 ? String(text.prefix(117)) + "…" : text,
                        durationMin: clampedMins,
                        minVersion: "Just 5 minutes: open it and do the first small bit of this.",
                        chunkFrom: nil, chunkTo: nil,
                        weekStart: mondayOf(day))
        }
    }

    static func buildCountSteps(title: String, work: Work, workDays: [String], mins: Int) -> [Step] {
        let target = max(10, min(45, mins))
        var steps: [Step] = []
        switch work {
        case .money(let total):
            let perDay = max(5, Int((Double(total) / Double(max(1, workDays.count))).rounded()))
            var done = 0
            for day in workDays {
                if done >= total { break }
                let n = min(perDay, total - done)
                done += n
                steps.append(Step(date: day,
                                  title: "Put $\(n) aside ($\(done) of $\(total))",
                                  durationMin: target,
                                  minVersion: "Just 5 minutes: open it and do the first small bit of this.",
                                  chunkFrom: done - n + 1, chunkTo: done,
                                  weekStart: mondayOf(day)))
            }
        case .count(let total, let unit, let per, let verb):
            let byTime = max(1, Int((Double(target) / per).rounded()))
            let needed = Int(ceil(Double(total) / Double(max(1, workDays.count))))
            let perDay = max(needed, byTime)
            var done = 0
            for day in workDays {
                if done >= total { break }
                let n = min(perDay, total - done)
                let from = done + 1
                done += n
                let text: String
                if unit == "word" { text = "\(verb) \(n) words" }
                else if n == 1 { text = "\(verb) \(unit) \(from)" }
                else { text = "\(verb) \(unit)s \(from)–\(done)" }
                steps.append(Step(date: day, title: text,
                                  durationMin: max(10, min(60, Int((Double(n) * per).rounded()))),
                                  minVersion: "Just 5 minutes: open it and do the first small bit of this.",
                                  chunkFrom: from, chunkTo: done,
                                  weekStart: mondayOf(day)))
            }
        }
        if !steps.isEmpty {
            let lastIdx = steps.count - 1
            for i in steps.indices where i != lastIdx && (i + 1) % 7 == 0 {
                steps[i].title = "Review: look at how far you have come on " + title
            }
            steps[lastIdx].title = "Finish: " + title + " (final look, then celebrate)"
        }
        return steps
    }

    // MARK: Free-space placement + the slide (replan of record)

    /// Place each step at the first free slot of its day,
    /// scanning 09:00–19:00 in half hours against the tasks
    /// already standing there (the shipped plan's WHEN shape,
    /// without asking her anything).
    static func freeTime(on day: String, durationMin: Int, state: PaceState) -> String? {
        let busy = DayAdapter.instances(on: day, state: state).compactMap { inst -> (Int, Int)? in
            guard let time = inst.task.time else { return nil }
            let parts = time.split(separator: ":").compactMap { Int($0) }
            guard parts.count == 2 else { return nil }
            let start = parts[0] * 60 + parts[1]
            return (start, start + Int(inst.task.durationMin))
        }.sorted { $0.0 < $1.0 }
        var candidate = 9 * 60
        while candidate + durationMin <= 19 * 60 {
            let clash = busy.first { candidate < $0.1 && candidate + durationMin > $0.0 }
            if clash == nil {
                return String(format: "%02d:%02d", candidate / 60, candidate % 60)
            }
            candidate += 30
        }
        return nil
    }

    /// replan of record: every unfinished step of the goal
    /// slides onto the remaining plan days, in order. Returns
    /// the task dictionaries to write (id + new date pairs).
    static func replan(goal: PaceGoal, tasks: [PaceTask], today: String) -> [(id: String, date: String)] {
        let open = tasks.filter { $0.goalId == goal.id && $0.status != "done" }
            .sorted { $0.date < $1.date }
        guard !open.isEmpty else { return [] }
        let start = max(today, goal.start ?? today)
        var days = planDays(start: start, end: goal.end ?? start, pace: goal.pace ?? "daily")
        if days.isEmpty { days = [today] }
        var moves: [(String, String)] = []
        for (i, task) in open.enumerated() {
            let target = i < days.count ? days[i] : addDays(days[days.count - 1], i - days.count + 1)
            if task.date != target { moves.append((task.id, target)) }
        }
        return moves
    }

    /// goalProgress of record, minus the percent (her ruling:
    /// progress is a picture/bar, never a percent number).
    static func progress(goal: PaceGoal, tasks: [PaceTask], today: String)
        -> (total: Int, done: Int, next: PaceTask?, complete: Bool) {
        let mine = tasks.filter { $0.goalId == goal.id }
        let done = mine.filter { $0.status == "done" }
        let next = mine.filter { $0.status != "done" && $0.date >= today }
            .sorted { $0.date < $1.date }.first
        return (mine.count, done.count, next, !mine.isEmpty && done.count == mine.count)
    }
}
