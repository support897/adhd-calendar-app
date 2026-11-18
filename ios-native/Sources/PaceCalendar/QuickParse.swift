import Foundation

/// The quick-words parser, ported from the shipped logic.js
/// parseItem of record. Voice or typed words in; one task
/// out — date, time, length, repeat and category read from
/// the words themselves, ON DEVICE. There is no cloud brain
/// behind this (the AI brain key is parked by her word);
/// this parser is the shipped app's own maths, carried
/// native, and it never pretends to be more.
enum QuickParse {

    struct Parsed {
        var title: String
        var date: String
        var time: String?
        var durationMin: Int
        var repeatRule: String?
        var category: String
        var color: String
        var essential: Bool
        var priority: Int
    }

    private static let weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    private static let months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

    static let categories: [(id: String, words: [String], color: String)] = [
        ("money", ["pay", "bill", "invoice", "bank", "tax", "rent", "budget", "quote", "price", "refund", "insurance", "savings", "loan", "salary", "mortgage", "super"], "#6B5BB0"),
        ("pets", ["dog", "cat ", "cats", "pet ", "pets", "puppy", "kitten", "litter", "groomer", "walk the dog", "feed the"], "#3F536E"),
        ("health", ["doctor", "dentist", "medicine", "tablet", "pills", "gym", "walk", "run", "yoga", "therapist", "therapy", "physio", "vet", "appointment", "checkup", "check-up", "exercise", "swim", "stretch", "scan"], "#35704E"),
        ("family", ["family", "kids", "kid ", "son ", "daughter", "mum", "mom", "dad", "grandma", "grandpa", "nan ", "baby", "parent", "sister", "brother", "school run", "bedtime story"], "#7F8DE4"),
        ("school", ["study", "exam", "homework", "assignment", "lecture", "essay", "revise", "revision", "uni ", "semester", "tutorial", "quiz", "course", "thesis", "school", "class "], "#2F80ED"),
        ("work", ["work", "meeting", "email", "report", "client", "boss", "presentation", "spreadsheet", "call the office", "deadline", "project", "interview", "shift"], "#5B6BD5"),
        ("home", ["clean", "tidy", "wash", "laundry", "kitchen", "bedroom", "bins", "garden", "cook", "dishes", "vacuum", "mop", "repair", "fix the"], "#35704E"),
        ("travel", ["flight", "hotel", "passport", "pack ", "packing", "trip", "holiday", "visa", "train", "airport", "booking"], "#00A3C4"),
        ("people", ["call", "visit", "birthday", "friend", "pick up", "pickup", "message", "text", "party", "dinner with", "coffee with", "catch up"], "#4858C4"),
        ("errands", ["shop", "groceries", "buy", "post office", "pharmacy", "petrol", "fuel", "drop off", "collect", "return the"], "#20A39E"),
        ("creative", ["paint", "draw", "guitar", "piano", "practise", "practice", "craft", "photo", "design", "sketch", "journal", "compose"], "#8E7CC3"),
        ("rest", ["rest", "nap", "read", "bath", "breathe", "meditate", "break", "sit outside", "relax"], "#8E7CC3"),
    ]

    static func categoryFor(_ title: String) -> (id: String, color: String) {
        let t = title.lowercased()
        for cat in categories {
            if cat.words.contains(where: { t.contains($0) }) { return (cat.id, cat.color) }
        }
        return ("other", "#5B6BD5")
    }

    static func estimateDuration(_ title: String) -> Int {
        let t = title.lowercased()
        if matches("\\b(email|message|text|reply|call|phone)\\b", t) { return 10 }
        if matches("\\b(clean|tidy|organise|organize|declutter|laundry|garden)\\b", t) { return 30 }
        if matches("\\b(shop|groceries|appointment|doctor|dentist|meeting)\\b", t) { return 45 }
        if matches("\\b(write|report|plan|study|pack|prep)\\b", t) { return 45 }
        return 25
    }

    private static func matches(_ pattern: String, _ text: String) -> Bool {
        text.range(of: pattern, options: .regularExpression) != nil
    }

    private static func replace(_ pattern: String, in s: inout String, with replacement: String = " ") {
        s = s.replacingOccurrences(of: pattern, with: replacement, options: [.regularExpression, .caseInsensitive])
    }

    private static func firstGroup(_ pattern: String, in s: String) -> [String]? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let m = regex.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
        return (0..<m.numberOfRanges).map { i in
            guard let r = Range(m.range(at: i), in: s) else { return "" }
            return String(s[r])
        }
    }

    static func nextWeekday(baseKey: String, weekday: Int, strictlyAfter: Bool) -> String {
        let baseWd = GoalPlanner.weekdayOf(baseKey)
        var diff = (weekday - baseWd + 7) % 7
        if diff == 0 && strictlyAfter { diff = 7 }
        return GoalPlanner.addDays(baseKey, diff)
    }

    static func parse(_ raw: String, baseKey: String) -> Parsed? {
        var s = " " + raw.trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.joined(separator: " ") + " "
        guard s.trimmingCharacters(in: .whitespaces).count >= 1 else { return nil }

        var priority = 0
        if let bang = firstGroup("(!+)\\s*$", in: s) {
            priority = min(3, bang[1].count)
            replace("!+\\s*$", in: &s)
        }
        replace("^\\s*(task|todo|reminder)\\s*[:\\-]\\s*", in: &s)
        replace("\\b(remind me to|i need to|need to|remember to)\\b", in: &s)

        var repeatRule: String? = nil
        if let rm = firstGroup("\\bevery (day|weekday|week|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|evening|night)\\b", in: s) {
            let rw = rm[1].lowercased()
            repeatRule = (rw == "morning" || rw == "evening" || rw == "night") ? "every day" : "every " + rw
            s = s.replacingOccurrences(of: rm[0], with: " ")
        } else if matches("\\bdaily\\b", s) {
            repeatRule = "every day"; replace("\\bdaily\\b", in: &s)
        } else if matches("\\bweekly\\b", s) {
            repeatRule = "every week"; replace("\\bweekly\\b", in: &s)
        }

        var date = baseKey
        if matches("\\bday after tomorrow\\b", s) {
            date = GoalPlanner.addDays(baseKey, 2); replace("\\bday after tomorrow\\b", in: &s)
        } else if matches("\\btomorrow\\b", s) {
            date = GoalPlanner.addDays(baseKey, 1); replace("\\btomorrow\\b", in: &s)
        } else if matches("\\btonight\\b", s) {
            replace("\\btonight\\b", in: &s, with: " at 7pm ")
        } else if matches("\\btoday\\b", s) {
            replace("\\btoday\\b", in: &s)
        } else if let dm = firstGroup("\\bin (\\d+) days?\\b", in: s) {
            date = GoalPlanner.addDays(baseKey, Int(dm[1]) ?? 0)
            s = s.replacingOccurrences(of: dm[0], with: " ")
        } else if let dm = firstGroup("\\b(?:on\\s+)?next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b", in: s),
                  let wd = weekdays.firstIndex(of: dm[1].lowercased()) {
            date = nextWeekday(baseKey: baseKey, weekday: wd, strictlyAfter: true)
            if GoalPlanner.diffDays(baseKey, date) < 7 { date = GoalPlanner.addDays(date, 7) }
            s = s.replacingOccurrences(of: dm[0], with: " ")
        } else if let dm = firstGroup("\\b(?:on\\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\\b", in: s) {
            let word = dm[1].lowercased()
            let full = weekdays.first { $0.hasPrefix(String(word.prefix(3))) } ?? word
            if let wd = weekdays.firstIndex(of: full) {
                date = nextWeekday(baseKey: baseKey, weekday: wd, strictlyAfter: false)
            }
            s = s.replacingOccurrences(of: dm[0], with: " ")
        } else if let dm = firstGroup("\\b(\\d{4})-(\\d{2})-(\\d{2})\\b", in: s) {
            date = "\(dm[1])-\(dm[2])-\(dm[3])"
            s = s.replacingOccurrences(of: dm[0], with: " ")
        }

        var time: String? = nil
        if let tm = firstGroup("\\bat (\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?\\b", in: s)
            ?? firstGroup("\\b(\\d{1,2})(?::(\\d{2}))\\s*(am|pm)\\b", in: s)
            ?? firstGroup("\\b(\\d{1,2})(am|pm)\\b", in: s)
            ?? firstGroup("\\b([01]?\\d|2[0-3]):([0-5]\\d)\\b", in: s) {
            var h = Int(tm[1]) ?? 0
            let mi = Int(tm[2]) ?? 0
            let ap = tm.count > 3 ? tm[3].lowercased() : ""
            if ap == "pm" && h < 12 { h += 12 }
            if ap == "am" && h == 12 { h = 0 }
            time = (h <= 23 && mi <= 59) ? String(format: "%02d:%02d", h, mi) : nil
            s = s.replacingOccurrences(of: tm[0], with: " ")
        } else if matches("\\bnoon\\b", s) {
            time = "12:00"; replace("\\b(?:at\\s+)?noon\\b", in: &s)
        } else if matches("\\bin the morning\\b", s) {
            time = "09:00"; replace("\\bin the morning\\b", in: &s)
        } else if matches("\\bin the afternoon\\b", s) {
            time = "14:00"; replace("\\bin the afternoon\\b", in: &s)
        } else if matches("\\bin the evening\\b", s) {
            time = "19:00"; replace("\\bin the evening\\b", in: &s)
        }

        var durationMin: Int? = nil
        if let um = firstGroup("\\bfor (\\d+(?:\\.\\d+)?)\\s*(hours?|hrs?|minutes?|mins?)\\b", in: s) {
            let value = Double(um[1]) ?? 0
            durationMin = um[2].lowercased().hasPrefix("h") ? Int((value * 60).rounded()) : Int(value.rounded())
            s = s.replacingOccurrences(of: um[0], with: " ")
        }

        var title = s.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.joined(separator: " ")
        title = title.trimmingCharacters(in: CharacterSet(charactersIn: " ,.-"))
        guard title.range(of: "[a-z0-9]", options: [.regularExpression, .caseInsensitive]) != nil else { return nil }
        title = title.prefix(1).uppercased() + title.dropFirst()
        let cat = categoryFor(title)
        let essential = priority >= 3 || matches("\\b(must|deadline|due|appointment|pick up|pickup|flight|doctor|dentist)\\b", title)
        return Parsed(title: title, date: date, time: time,
                      durationMin: durationMin ?? estimateDuration(title),
                      repeatRule: repeatRule, category: cat.id, color: cat.color,
                      essential: essential, priority: priority)
    }

    /// parseDump of record, lightly: lines, "and then" and
    /// semicolons split a brain-dump into separate items.
    static func parseMany(_ text: String, baseKey: String) -> [Parsed] {
        var chunks: [String] = []
        for line in text.components(separatedBy: .newlines) {
            for part in line.components(separatedBy: " and then ") {
                for piece in part.components(separatedBy: ";") where !piece.trimmingCharacters(in: .whitespaces).isEmpty {
                    chunks.append(piece)
                }
            }
        }
        return chunks.compactMap { parse($0, baseKey: baseKey) }
    }
}
