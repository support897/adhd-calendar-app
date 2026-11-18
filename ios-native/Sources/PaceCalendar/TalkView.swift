import SwiftUI
import Speech
import AVFoundation
import PhotosUI

/// TALK TO IT — one box, one send (Phase 1 shape). She says
/// or types what's on; the shipped parser (QuickParse, the
/// logic.js maths carried native) reads the day, the time,
/// the length and the repeats out of her own words, ON
/// DEVICE, and the event lands through the ruled add door.
/// Dictation is Apple's Speech framework with on-device
/// recognition required wherever the device supports it.
///
/// NAMED PLAINLY (her ruling): the AI brain key is PARKED.
/// Nothing here calls a cloud AI, and nothing pretends to —
/// the words are read by the parser of record, on device.
/// Text budget: 5 app words (Talk · Say it plainly · Add).
struct TalkView: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var theme: ThemeStore
    @EnvironmentObject private var extras: ExtrasStore
    @StateObject private var voice = VoiceBox()
    @State private var text: String = ""
    @State private var landed: Int = 0
    @State private var photo: PhotosPickerItem? = nil
    @State private var showCamera = false
    @State private var reading = false
    @State private var excluded: Set<Int> = []

    private var items: [QuickParse.Parsed] {
        QuickParse.parseMany(MessyNotes.clean(text), baseKey: PaceState.todayString)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                Image("SkipPoint").resizable().scaledToFit().frame(width: 64, height: 64)
                Text("Tell me what is on. I will place it.")
                    .font(.paceBody(15))
                    .foregroundStyle(theme.inkOnBackground)
                    .accessibilityIdentifier("talk.skipLine")
            }
            ZStack(alignment: .topLeading) {
                TextEditor(text: $text)
                    .font(.paceBody(17))
                    .foregroundStyle(PaceColor.pine)
                    .padding(10)
                    .frame(minHeight: 110)
                    .scrollContentBackground(.hidden)
                    .accessibilityIdentifier("talk.box")
                if text.isEmpty {
                    Text("Say it plainly")
                        .font(.paceBody(17))
                        .foregroundStyle(PaceColor.softInk)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 16)
                }
            }
            .background(PaceColor.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(PaceColor.waterMid, lineWidth: 1))

            if let first = QuickParse.parseMany(text, baseKey: PaceState.todayString).first {
                PaceCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pace read")
                            .font(.paceBody(13)).fontWeight(.bold)
                            .foregroundStyle(PaceColor.waterDeep).textCase(.uppercase)
                        HStack(spacing: 8) {
                            CountPill(text: first.date)
                            if let t = first.time { CountPill(text: t) }
                            CountPill(text: "\(Int(first.durationMin)) min")
                        }
                    }
                }
                .accessibilityIdentifier("talk.read")
            }

            if items.count > 1 {
                PaceCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pace found \(items.count - excluded.filter { $0 < items.count }.count) things")
                            .font(.paceBody(13)).fontWeight(.bold)
                            .foregroundStyle(PaceColor.waterDeep).textCase(.uppercase)
                        ForEach(Array(items.enumerated()), id: \.offset) { i, it in
                            HStack(spacing: 8) {
                                Button {
                                    if excluded.contains(i) { excluded.remove(i) } else { excluded.insert(i) }
                                } label: {
                                    Image(systemName: excluded.contains(i) ? "circle" : "checkmark.circle.fill")
                                        .font(.system(size: 20))
                                        .foregroundStyle(excluded.contains(i) ? PaceColor.waterMid : PaceColor.stillWater)
                                }
                                .buttonStyle(.plain).frame(minWidth: 44, minHeight: 44)
                                .accessibilityLabel("Include")
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(it.title).font(.paceBody(15)).foregroundStyle(PaceColor.pine)
                                    Text([it.date, it.time ?? "", "\(it.durationMin) min"].filter { !$0.isEmpty }.joined(separator: "  "))
                                        .font(.paceBody(12)).foregroundStyle(PaceColor.softInk)
                                }
                                Spacer(minLength: 0)
                            }
                        }
                    }
                }
                .accessibilityIdentifier("talk.found")
            }

            HStack(spacing: 12) {
                Button {
                    voice.toggle { heard in
                        text = heard
                    }
                } label: {
                    Image(systemName: voice.listening ? "mic.fill" : "mic")
                        .font(.system(size: 20))
                        .foregroundStyle(voice.listening ? PaceColor.stillWater : theme.accentOnCard)
                        .frame(width: 48, height: 48)
                        .background(PaceColor.white)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("talk.mic")

                PhotosPicker(selection: $photo, matching: .images) {
                    Image(systemName: reading ? "hourglass" : "photo")
                        .font(.system(size: 20))
                        .foregroundStyle(theme.accentOnCard)
                        .frame(width: 48, height: 48)
                        .background(PaceColor.white)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
                }
                .accessibilityLabel("Read a photo of notes")
                .accessibilityIdentifier("talk.photo")

                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    Button { showCamera = true } label: {
                        Image(systemName: "camera")
                            .font(.system(size: 20))
                            .foregroundStyle(theme.accentOnCard)
                            .frame(width: 48, height: 48)
                            .background(PaceColor.white)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(PaceColor.waterMid, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Scan notes")
                    .accessibilityIdentifier("talk.camera")
                }

                Spacer()

                Button("Add") {
                    send()
                }
                .font(.paceBody(17))
                .fontWeight(.semibold)
                .foregroundStyle(PaceColor.white)
                .padding(.horizontal, 26)
                .padding(.vertical, 13)
                .background(PaceColor.pine)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .accessibilityIdentifier("talk.send")
            }

            if landed > 0 {
                Text("Added")
                    .font(.paceBody(14))
                    .foregroundStyle(theme.accentOnBackground)
                    .accessibilityIdentifier("talk.added")
            }

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
        .background(ThemedBackground())
        .navigationTitle("Talk")
        .sheet(isPresented: $showCamera) {
            CameraPicker { img in
                Task { await absorb(img) }
            }
        }
        .onChange(of: photo) { _, item in
            guard let item else { return }
            Task {
                if let d = try? await item.loadTransferable(type: Data.self), let img = UIImage(data: d) {
                    await absorb(img)
                }
                photo = nil
            }
        }
    }

    @MainActor
    private func absorb(_ img: UIImage) async {
        reading = true
        let read = MessyNotes.clean(await NoteScanner.read(img))
        text += (text.isEmpty || read.isEmpty ? "" : "\n") + read
        reading = false
    }

    private func send() {
        let all = items
        let chosen = all.enumerated().filter { !excluded.contains($0.offset) }.map { $0.element }
        guard !chosen.isEmpty else { return }
        for item in chosen {
            var dict = PaceTaskFactory.make(title: item.title, date: item.date,
                                            time: item.time, durationMin: item.durationMin,
                                            repeatRule: item.repeatRule,
                                            category: item.category, color: item.color,
                                            source: "capture")
            dict["priority"] = item.priority
            dict["essential"] = item.essential
            dict["originalText"] = text
            session.addTask(dict)
        }
        text = ""
        excluded = []
        landed += chosen.count
        extras.celebrate()
    }
}

/// Live dictation, shaped by the speech skill of record:
/// both authorizations first, on-device recognition
/// required where supported, partial results REPLACE the
/// text (never append), one stop path owns all cleanup, and
/// sessions stay short (the framework's one-minute shape).
@MainActor
final class VoiceBox: ObservableObject {
    @Published private(set) var listening = false

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en_AU"))
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var onText: ((String) -> Void)?

    func toggle(onText: @escaping (String) -> Void) {
        if listening {
            stop()
            return
        }
        self.onText = onText
        Task {
            guard await Self.requestPermissions() else { return }
            start()
        }
    }

    private static func requestPermissions() async -> Bool {
        let speech = await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { cont.resume(returning: $0) }
        }
        guard speech == .authorized else { return false }
        return await AVAudioApplication.requestRecordPermission()
    }

    private func start() {
        guard let recognizer, recognizer.isAvailable else { return }
        stop()

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("Voice session ended: \(error.localizedDescription)")
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.addsPunctuation = true
        if recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }
        self.request = request

        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor in
                guard let self else { return }
                if let result {
                    self.onText?(result.bestTranscription.formattedString)
                    if result.isFinal { self.stop() }
                }
                if error != nil { self.stop() }
            }
        }

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        engine.prepare()
        do {
            try engine.start()
            listening = true
        } catch {
            print("Voice engine ended: \(error.localizedDescription)")
            stop()
        }
    }

    /// The one cleanup owner: engine stop, tap removal,
    /// endAudio, task cancel — every exit path lands here.
    private func stop() {
        if engine.isRunning {
            engine.stop()
            engine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        request = nil
        task?.cancel()
        task = nil
        listening = false
    }
}
