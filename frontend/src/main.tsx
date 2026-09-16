import { FormEvent, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type Page = "record" | "live" | "phrases" | "translate" | "library";
type Result = {
  source_text: string;
  source_language: "Thai" | "English";
  target_language: "Thai" | "English";
  romanization: string;
  translation: string;
  notes: string[];
};
type Recording = {
  file_id: string;
  filename: string;
  mime_type: string;
  created_time: string;
  web_view_link: string;
};
type LiveSegment = {
  timestamp: number;
  source_text: string;
  translation: string;
  romanization: string;
};
type Phrase = { text: string; count: number };

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "phraseroots.accessToken";

function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function Icon({
  name,
}: {
  name:
     | "mic"
     | "arrow"
     | "library"
     | "sparkle"
     | "download"
     | "upload"
     | "logout"
     | "swap"
     | "play"
     | "view"
     | "conversation"
     | "phrases";
}) {
  const paths = {
    mic: (
      <>
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    library: (
      <>
        <path d="M4 5a3 3 0 0 1 3-3h12v17H7a3 3 0 0 0-3 3V5Z" />
        <path d="M4 22a3 3 0 0 1 3-3h13M8 6h7" />
      </>
    ),
    sparkle: (
      <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Zm7 14 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m0 0 5 5m-5-5L7 8M4 14v6h16v-6" />
      </>
    ),
    logout: <path d="M10 5H5v14h5m4-10 4 3-4 3m-7-3h11" />,
    swap: (
      <>
        <path d="M7 7h10l-3-3m3 3-3 3M17 17H7l3 3m-3-3 3-3" />
      </>
    ),
    play: <path d="m9 5 10 7-10 7V5Z" />,
    view: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    conversation: (
      <>
        <path d="M4 5h16v11H8l-4 3V5Z" />
        <path d="M8 10h8M8 13h5" />
      </>
    ),
    phrases: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function App() {
  const [page, setPage] = useState<Page>("record");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );
  const showError = (message: string) => setError(message);
  if (!authenticated)
    return (
      <>
        <Login onSuccess={() => setAuthenticated(true)} onError={showError} />
        <Toast message={error} onDismiss={() => setError("")} />
      </>
    );
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthenticated(false);
  };
  return (
    <main>
      <aside>
        <button className="brand" onClick={() => setPage("record")} title="Go to recording">
          <span>PR</span>
          <b>PhraseRoots</b>
        </button>
        <nav>
          <button
            className={page === "record" ? "active" : ""}
            onClick={() => setPage("record")}
            title="Record a conversation"
          >
            <Icon name="mic" />
            Record
          </button>
          <button
            className={page === "live" ? "active" : ""}
            onClick={() => setPage("live")}
            title="Translate a conversation as it happens"
          >
            <Icon name="conversation" />
            Live
          </button>
          <button
            className={page === "translate" ? "active" : ""}
            onClick={() => setPage("translate")}
            title="Translate text or audio"
          >
            <Icon name="sparkle" />
            Translate
          </button>
          <button
            className={page === "phrases" ? "active" : ""}
            onClick={() => setPage("phrases")}
            title="View repeated conversation phrases"
          >
            <Icon name="phrases" />
            Phrases
          </button>
          <button
            className={page === "library" ? "active" : ""}
            onClick={() => setPage("library")}
            title="View recording library"
          >
            <Icon name="library" />
            Library
          </button>
        </nav>
        <div className="aside-bottom">
          <div className="profile">
            <strong>CS</strong>
            <span>
              <b>Clint</b>
              <small>Personal workspace</small>
            </span>
            <button className="logout" onClick={logout} aria-label="Log out" title="Log out">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">YOUR LANGUAGE DESK</p>
            <h1>
              {page === "record"
                ? "Capture a conversation"
                : page === "live"
                  ? "Live conversation"
                  : page === "phrases"
                    ? "Conversation phrases"
                : page === "translate"
                  ? "Translate with context"
                  : "Recording library"}
            </h1>
          </div>
          <span className="status-dot" title="PhraseRoots is ready to use">Online</span>
        </header>
        <div className={`top-loader${loading ? " active" : ""}`} aria-hidden="true">
          <span />
        </div>
        {page === "record" ? (
          <Recorder
            onOpenLibrary={() => setPage("library")}
            onError={showError}
            onLoadingChange={setLoading}
          />
        ) : page === "live" ? (
          <LiveConversation
            onError={showError}
            onLoadingChange={setLoading}
            onPhrases={(nextPhrases) => {
              setPhrases(nextPhrases);
            }}
          />
        ) : page === "phrases" ? (
          <PhraseViewer phrases={phrases} onError={showError} onLoadingChange={setLoading} />
        ) : page === "translate" ? (
          <Translator onError={showError} onLoadingChange={setLoading} />
        ) : (
          <Library onError={showError} onLoadingChange={setLoading} />
        )}
      </section>
      <Toast message={error} onDismiss={() => setError("")} />
    </main>
  );
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const [displayedMessage, setDisplayedMessage] = useState(message);
  const [visible, setVisible] = useState(Boolean(message));
  useEffect(() => {
    if (!message) return;
    setDisplayedMessage(message);
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  if (!displayedMessage) return null;
  return (
    <div
      className={`toast${visible ? " visible" : ""}`}
      role="alert"
      onTransitionEnd={(event) => {
        if (event.propertyName === "opacity" && !visible) {
          setDisplayedMessage("");
          onDismiss();
        }
      }}
    >
      <span>{displayedMessage}</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss error" title="Dismiss error">
        Close
      </button>
    </div>
  );
}

function Login({ onSuccess, onError }: { onSuccess: () => void; onError: (message: string) => void }) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [working, setWorking] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to sign in");
      localStorage.setItem(TOKEN_KEY, data.access_token);
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setWorking(false);
    }
  };
  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="login-mark">PR</span>
        <p className="eyebrow">PHRASEROOTS</p>
        <h1>Your language desk</h1>
        <p>Sign in to access your private workspace.</p>
        <label>
          Username
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button disabled={working} title="Sign in to PhraseRoots">
          {working ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function Recorder({ onOpenLibrary, onError, onLoadingChange }: { onOpenLibrary: () => void; onError: (message: string) => void; onLoadingChange: (loading: boolean) => void }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0),
    [audio, setAudio] = useState<Blob | null>(null),
    [saving, setSaving] = useState("Save in my Google Drive"),
    [recordingName, setRecordingName] = useState(""),
    [uploading, setUploading] = useState(false),
    [savedLink, setSavedLink] = useState("");
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);
  const toggle = async () => {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        setAudio(new Blob(chunks, { type: r.mimeType }));
        setSavedLink("");
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.current = r;
      setSeconds(0);
      r.start();
      setRecording(true);
    } catch {
      onError("Microphone access is needed to record.");
    }
  };
  const filename = () => {
    const fallback = `Recording ${new Date().toLocaleString().replaceAll("/", "-").replaceAll(":", "-")}`;
    const name = recordingName.trim() || fallback;
    return name.toLowerCase().endsWith(".webm") ? name : `${name}.webm`;
  };
  const download = () => {
    if (!audio) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(audio);
    link.download = filename();
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const saveToDrive = async () => {
    if (!audio) return;
    setUploading(true);
    onLoadingChange(true);
    try {
      const form = new FormData();
      form.append(
        "audio",
        new File([audio], filename(), { type: audio.type || "audio/webm" }),
      );
      const response = await apiFetch('/recordings', {
        method: "POST",
        body: form,
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).detail || "Could not save recording",
        );
      const data = await response.json();
      setSavedLink(data.web_view_link);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not save recording");
    } finally {
      setUploading(false);
      onLoadingChange(false);
    }
  };
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="record-layout">
      <section className="record-card">
        <div className="record-top">
          <span className={recording ? "live" : ""}>
            {recording
              ? "RECORDING"
              : audio
                ? "READY TO SAVE"
                : "NEW RECORDING"}
          </span>
          <span>{time}</span>
        </div>
        <div className="wave">
          {Array.from({ length: 35 }, (_, i) => (
            <i key={i} style={{ height: `${16 + ((i * 31) % 65)}%` }} />
          ))}
        </div>
        <button
          className={"record-button " + (recording ? "stop" : "")}
          onClick={toggle}
          title={recording ? "Stop recording" : "Start recording"}
        >
          <Icon name="mic" />
          <span>
            {recording
              ? "Stop recording"
              : audio
                ? "Record again"
                : "Start recording"}
          </span>
        </button>
        <p className="hint">
          {recording
            ? "Listening securely from this device"
            : "Tap to capture a Thai or English conversation"}
        </p>
      </section>
      <section className="save-card">
        <p className="eyebrow">AFTER RECORDING</p>
        <h2>Where should this live?</h2>
        <label className="recording-name">
          Recording name
          <input
            value={recordingName}
            onChange={(event) => setRecordingName(event.target.value)}
            placeholder="Defaults to the current date and time"
            disabled={!audio || uploading}
          />
        </label>
        <div className="save-options">
          {["Save in my Google Drive", "Download to this device"].map(
            (option) => (
              <button
                key={option}
                onClick={() => setSaving(option)}
                className={saving === option ? "selected" : ""}
                title={`Choose ${option}`}
              >
                <span className="radio" />
                <b>{option}</b>
                <small>
                  {option === "Save in my Google Drive"
                    ? "Your private PhraseRoots folder"
                    : "Private, offline copy"}
                </small>
              </button>
            ),
          )}
        </div>
        <button
          className="save-action"
          disabled={!audio || uploading}
          onClick={
            saving === "Download to this device" ? download : saveToDrive
          }
          title={saving === "Download to this device" ? "Download recording" : "Save recording to Google Drive"}
        >
          <Icon
            name={saving === "Download to this device" ? "download" : "upload"}
          />
          {uploading
            ? "Saving to Google Drive..."
            : saving === "Download to this device"
              ? "Save recording"
              : "Save to Google Drive"}
        </button>
        {savedLink && (
          <button className="library-button" onClick={onOpenLibrary} title="Open recording library">
            <Icon name="library" />
            View recordings in Library
          </button>
        )}
      </section>
    </div>
  );
}

function LiveConversation({ onError, onLoadingChange, onPhrases }: { onError: (message: string) => void; onLoadingChange: (loading: boolean) => void; onPhrases: (phrases: Phrase[]) => void }) {
  const socket = useRef<WebSocket | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const archiveRecorder = useRef<MediaRecorder | null>(null);
  const archiveChunks = useRef<BlobPart[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const active = useRef(false);
  const ending = useRef(false);
  const segmentsRef = useRef<LiveSegment[]>([]);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [segments, setSegments] = useState<LiveSegment[]>([]);
  const [pending, setPending] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [archiveAudio, setArchiveAudio] = useState<Blob | null>(null);
  const [recordingName, setRecordingName] = useState("");
  const [saving, setSaving] = useState(false);
  // A 12-second chunk keeps live translation responsive without exhausting a
  // low per-minute translation quota during a longer conversation.
  const chunkDuration = 12_000;

  useEffect(() => {
    if (!running || paused) return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1_000);
    return () => window.clearInterval(interval);
  }, [paused, running]);

  const analyze = async () => {
    const transcript = segmentsRef.current.map((segment) => segment.source_text).join(" ").trim();
    if (!transcript) {
      onError("No transcribed conversation is available for phrase analysis.");
      return;
    }
    onLoadingChange(true);
    try {
      const response = await apiFetch("/phrases/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!response.ok) throw new Error((await response.json()).detail || "Could not analyze phrases");
      onPhrases((await response.json()).phrases);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not analyze phrases");
    } finally {
      onLoadingChange(false);
    }
  };
  const startChunk = () => {
    if (!stream.current || !active.current) return;
    const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? { mimeType: "audio/webm;codecs=opus" } : undefined;
    const mediaRecorder = new MediaRecorder(stream.current, options);
    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const audio = new Blob(chunks, { type: mediaRecorder.mimeType });
      if (audio.size && socket.current?.readyState === WebSocket.OPEN) {
        setPending((value) => value + 1);
        socket.current.send(JSON.stringify({ type: "chunk", timestamp: Date.now(), format: mediaRecorder.mimeType.includes("mp4") ? "m4a" : "webm" }));
        socket.current.send(audio);
      }
      if (active.current) startChunk();
      else if (ending.current && socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: "finish" }));
    };
    recorder.current = mediaRecorder;
    mediaRecorder.start();
    timer.current = window.setTimeout(() => mediaRecorder.stop(), chunkDuration);
  };
  const start = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const websocketUrl = `${API_URL.replace(/^http/, "ws")}/live-conversation?token=${encodeURIComponent(localStorage.getItem(TOKEN_KEY) || "")}`;
      const liveSocket = new WebSocket(websocketUrl);
      liveSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "segment") {
          const next = [...segmentsRef.current, message as LiveSegment];
          segmentsRef.current = next;
          setSegments(next);
          setPending((value) => Math.max(0, value - 1));
        }
        if (message.type === "error") {
          setPending((value) => Math.max(0, value - 1));
          onError(message.message);
        }
        if (message.type === "finished") {
          liveSocket.close();
          analyze();
          setFinished(true);
        }
      };
      liveSocket.onerror = () => onError("Live connection was interrupted.");
      liveSocket.onopen = () => {
        stream.current = mediaStream;
        socket.current = liveSocket;
        archiveChunks.current = [];
        const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? { mimeType: "audio/webm;codecs=opus" } : undefined;
        const fullRecording = new MediaRecorder(mediaStream, options);
        fullRecording.ondataavailable = (event) => {
          if (event.data.size) archiveChunks.current.push(event.data);
        };
        fullRecording.onstop = () => setArchiveAudio(new Blob(archiveChunks.current, { type: fullRecording.mimeType }));
        archiveRecorder.current = fullRecording;
        fullRecording.start();
        active.current = true;
        ending.current = false;
        segmentsRef.current = [];
        setSegments([]);
        setPending(0);
        setSeconds(0);
        setFinished(false);
        setArchiveAudio(null);
        setPaused(false);
        setRunning(true);
        startChunk();
      };
    } catch {
      onError("Microphone access is needed for live translation.");
    }
  };
  const pause = () => {
    active.current = false;
    setPaused(true);
    if (timer.current) window.clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    if (archiveRecorder.current?.state === "recording") archiveRecorder.current.pause();
  };
  const resume = () => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      onError("The live connection is no longer available. Start a new conversation.");
      return;
    }
    if (archiveRecorder.current?.state === "paused") archiveRecorder.current.resume();
    active.current = true;
    setPaused(false);
    startChunk();
  };
  const stop = () => {
    active.current = false;
    ending.current = true;
    setRunning(false);
    setPaused(false);
    if (timer.current) window.clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    else socket.current?.send(JSON.stringify({ type: "finish" }));
    if (archiveRecorder.current?.state === "recording" || archiveRecorder.current?.state === "paused") archiveRecorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
  };
  const saveRecording = async () => {
    if (!archiveAudio) return;
    setSaving(true);
    onLoadingChange(true);
    try {
      const name = recordingName.trim() || `Live conversation ${new Date().toLocaleString().replaceAll("/", "-").replaceAll(":", "-")}`;
      const form = new FormData();
      const extension = archiveAudio.type.includes("mp4") ? "m4a" : "webm";
      form.append("audio", new File([archiveAudio], `${name}.${extension}`, { type: archiveAudio.type }));
      const response = await apiFetch("/recordings", { method: "POST", body: form });
      if (!response.ok) throw new Error((await response.json()).detail || "Could not save recording");
      setArchiveAudio(null);
      setFinished(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not save recording");
    } finally {
      setSaving(false);
      onLoadingChange(false);
    }
  };
  useEffect(() => () => {
    active.current = false;
    ending.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    recorder.current?.stop();
    archiveRecorder.current?.stop();
    socket.current?.close();
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const status = running
    ? paused
      ? "Paused - microphone is off"
      : pending
        ? `Listening - ${pending} section${pending === 1 ? "" : "s"} translating`
        : "Listening for speech"
    : finished
      ? "Conversation complete"
      : "Ready to start";
  return (
    <section className="live-layout">
      <div className="live-controls">
        <div>
          <p className="eyebrow">{running ? paused ? "LISTENING PAUSED" : "LISTENING AND TRANSLATING" : "READY FOR A LIVE CONVERSATION"}</p>
          <h2>{running ? paused ? "Microphone capture is paused. Resume when you are ready." : "Translation appears after each spoken section." : "Speak naturally. Short pauses create each translation."}</h2>
          <div className="live-status" aria-live="polite"><span className={running && !paused ? "active" : ""} /><b>{status}</b><time>{time}</time></div>
        </div>
        <div className="live-actions">
          {running && <button className="pause-live" onClick={paused ? resume : pause}>{paused ? "Resume listening" : "Pause listening"}</button>}
          <button className={`live-button${running ? " stop" : ""}`} onClick={running ? stop : start}>
            <Icon name="mic" /> {running ? "End conversation" : "Start live translation"}
          </button>
        </div>
      </div>
      <div className={`live-activity${running && !paused ? " listening" : ""}`} aria-hidden="true">
        {Array.from({ length: 25 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 45}ms` }} />)}
      </div>
      <div className="live-stream" aria-live="polite">
        {!segments.length && <p className="live-empty">{running ? "Listening for the first phrase..." : "Your translated conversation will appear here."}</p>}
        {segments.map((segment, index) => (
          <article key={`${segment.timestamp}-${index}`}>
            <time>{new Date(segment.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            <p className="live-thai">{segment.source_text}</p>
            <p className="live-romanization">{segment.romanization}</p>
            <p className="live-translation">{segment.translation}</p>
          </article>
        ))}
        {pending > 0 && <p className="live-pending">Translating {pending} spoken section{pending === 1 ? "" : "s"}...</p>}
      </div>
      {finished && archiveAudio && (
        <div className="live-save-prompt">
          <div><p className="eyebrow">LIVE TRANSCRIPTION COMPLETE</p><h2>Save this audio recording?</h2><p>Your transcript and phrase analysis are ready. Save the original audio to access it in the Library.</p></div>
          <label>Recording name<input value={recordingName} onChange={(event) => setRecordingName(event.target.value)} placeholder="Live conversation" /></label>
          <div><button className="discard-recording" onClick={() => { setArchiveAudio(null); setFinished(false); }}>Discard audio</button><button className="save-live-recording" disabled={saving} onClick={saveRecording}>{saving ? "Saving..." : "Save to recordings"}</button></div>
        </div>
      )}
    </section>
  );
}

function PhraseViewer({ phrases, onError, onLoadingChange }: { phrases: Phrase[]; onError: (message: string) => void; onLoadingChange: (loading: boolean) => void }) {
  const [selected, setSelected] = useState<Phrase | null>(null);
  const [meaning, setMeaning] = useState<Result | null>(null);
  const explain = async (phrase: Phrase) => {
    setSelected(phrase);
    setMeaning(null);
    onLoadingChange(true);
    try {
      const response = await apiFetch("/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: phrase.text, source_language: "Thai", target_language: "English" }),
      });
      if (!response.ok) throw new Error((await response.json()).detail || "Could not explain phrase");
      setMeaning(await response.json());
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not explain phrase");
    } finally {
      onLoadingChange(false);
    }
  };
  if (!phrases.length) return <p className="library-state">Finish a live conversation with repeated words or phrases to view them here.</p>;
  return (
    <section className="phrase-layout">
      <div className="phrase-list">
        <p className="eyebrow">REPEATED IN THIS CONVERSATION</p>
        {phrases.map((phrase) => (
          <button key={phrase.text} className={selected?.text === phrase.text ? "selected" : ""} onClick={() => explain(phrase)}>
            <b>{phrase.text}</b><span>{phrase.count} times</span>
          </button>
        ))}
      </div>
      <article className="phrase-detail">
        {selected ? <><p className="eyebrow">PHRASE EXPLANATION</p><h2>{selected.text}</h2>{meaning ? <><p className="phrase-meaning">{meaning.translation}</p><p className="live-romanization">{meaning.romanization}</p>{meaning.notes.map((note) => <p className="phrase-note" key={note}>{note}</p>)}</> : <p>Selecting phrase explanation...</p>}</> : <p>Select a repeated word or phrase to translate and explain it.</p>}
      </article>
    </section>
  );
}

function Library({ onError, onLoadingChange }: { onError: (message: string) => void; onLoadingChange: (loading: boolean) => void }) {
  const [recordings, setRecordings] = useState<Recording[]>([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    onLoadingChange(true);
    apiFetch('/recordings')
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            (await response.json()).detail || "Could not load recordings",
          );
        return response.json();
      })
      .then((data) => setRecordings(data.recordings))
      .catch((e) => onError(e instanceof Error ? e.message : "Could not load recordings"))
      .finally(() => {
        setLoading(false);
        onLoadingChange(false);
      });
  }, []);
  if (loading) return <p className="library-state">Loading recordings...</p>;
  if (!recordings.length)
    return (
      <p className="library-state">No recordings in this Drive folder yet.</p>
    );
  return (
    <section className="library-list">
      {recordings.map((recording) => (
        <article key={recording.file_id}>
          <div>
            <b>{recording.filename}</b>
            <small>{new Date(recording.created_time).toLocaleString()}</small>
          </div>
          <a
            className="view-recording"
            href={recording.web_view_link}
            target="_blank"
            rel="noreferrer"
            aria-label={`View ${recording.filename} in Google Drive`}
            title="View in Google Drive"
          >
            <Icon name="view" />
          </a>
        </article>
      ))}
    </section>
  );
}

function Translator({ onError, onLoadingChange }: { onError: (message: string) => void; onLoadingChange: (loading: boolean) => void }) {
  const [mode, setMode] = useState<"text" | "audio">("audio"),
    [source, setSource] = useState("Thai"),
    [target, setTarget] = useState("English"),
    [text, setText] = useState(""),
    [audio, setAudio] = useState<File | null>(null),
    [recordings, setRecordings] = useState<Recording[]>([]),
    [selectedRecording, setSelectedRecording] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [working, setWorking] = useState(false),
    [speaking, setSpeaking] = useState<"thai" | "english" | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const defaultThai = "อย่ามายุ่งกับฉัน ฉันเกลียดงานของฉัน";
  const defaultRomanization = "Yaa maa yung gap chan. Chan gliat ngan khong chan.";
  const defaultEnglish = "Leave me alone. I hate my work.";
  const thaiText = result
    ? result.source_language === "Thai"
      ? result.source_text
      : result.translation
    : defaultThai;
  const englishText = result
    ? result.source_language === "English"
      ? result.source_text
      : result.translation
    : defaultEnglish;
  useEffect(() => {
    onLoadingChange(true);
    apiFetch('/recordings')
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            (await response.json()).detail || "Could not load recordings",
          );
        return response.json();
      })
      .then((data) => setRecordings(data.recordings))
      .catch((e) => onError(e instanceof Error ? e.message : "Could not load recordings"))
      .finally(() => onLoadingChange(false));
  }, []);
  const swap = () => {
    setSource(target);
    setTarget(source);
  };
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  const listen = (
    content: string,
    language: "th-TH" | "en-US",
    target: "thai" | "english",
  ) => {
    if (!("speechSynthesis" in window)) {
      onError("Voice playback is not supported by this browser");
      return;
    }
    if (speaking === target) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setSpeaking(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = language;
    utterance.onend = utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setSpeaking(null);
      }
    };
    utteranceRef.current = utterance;
    setSpeaking(target);
    window.speechSynthesis.speak(utterance);
  };
  const downloadTranslation = () => {
    const romanization = result?.romanization || defaultRomanization;
    const notes = result?.notes || [
      "อย่ามายุ่งกับฉัน means “leave me alone”",
      "ฉันเกลียดงานของฉัน means “I hate my work”",
    ];
    const file = new Blob(
      [[
        "PhraseRoots Translation",
        "",
        "THAI",
        thaiText,
        "",
        "PRONUNCIATION",
        romanization,
        "",
        "ENGLISH",
        englishText,
        "",
        "CONTEXT & PHRASES",
        ...notes.map((note) => `- ${note}`),
        "",
      ].join("\n")],
      { type: "text/plain;charset=utf-8" },
    );
    const link = document.createElement("a");
    const url = URL.createObjectURL(file);
    link.href = url;
    link.download = `phraseroots-translation-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const translate = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setResult(null);
    setWorking(true);
    onLoadingChange(true);
    try {
      const response = await apiFetch('/translate', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source_language: source,
          target_language: target,
        }),
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).detail || "Translation service unavailable",
        );
      setResult(await response.json());
    } catch (e) {
      onError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setWorking(false);
      onLoadingChange(false);
    }
  };
  const openAudio = () => {
    setMode("audio");
    if (!recordings.length) {
      onLoadingChange(true);
      apiFetch('/recordings')
        .then(async (response) => {
          if (!response.ok)
            throw new Error(
              (await response.json()).detail || "Could not load recordings",
            );
          return response.json();
        })
        .then((data) => setRecordings(data.recordings))
        .catch((e) => onError(e instanceof Error ? e.message : "Could not load recordings"))
        .finally(() => onLoadingChange(false));
    }
  };
  const translateAudio = async (event: FormEvent) => {
    event.preventDefault();
    if (!audio && !selectedRecording) return;
    setResult(null);
    setWorking(true);
    onLoadingChange(true);
    try {
      const response = audio
        ? await apiFetch('/translate/audio', {
            method: "POST",
            body: (() => {
              const form = new FormData();
              form.append("audio", audio);
              return form;
            })(),
          })
        : await apiFetch('/translate/audio/drive', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_id: selectedRecording }),
          });
      if (!response.ok)
        throw new Error(
          (await response.json()).detail || "Audio translation unavailable",
        );
      setResult(await response.json());
    } catch (e) {
      onError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setWorking(false);
      onLoadingChange(false);
    }
  };
  return (
    <div className="translate-layout">
      <form onSubmit={mode === "text" ? translate : translateAudio}>
        <div className="translate-tabs">
          <button
            type="button"
            className={mode === "audio" ? "selected" : ""}
            onClick={openAudio}
            title="Translate an audio file or recording"
          >
            Audio
          </button>
          <button
            type="button"
            className={mode === "text" ? "selected" : ""}
            onClick={() => setMode("text")}
            title="Translate typed or pasted text"
          >
            Text
          </button>
        </div>
        {mode === "text" ? (
          <>
            <div className="language-row">
              <label>
                FROM
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option>Thai</option>
                  <option>English</option>
                </select>
              </label>
              <button type="button" className="swap" onClick={swap} title="Swap languages">
                <Icon name="swap" />
              </button>
              <label>
                TO
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option>English</option>
                  <option>Thai</option>
                </select>
              </label>
            </div>
            <div className="text-box">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type text to translate..."
              />
              <span>{text.length} / 12,000</span>
            </div>
          </>
        ) : (
          <div className="audio-picker">
            <label className="audio-upload">
              <span>Upload audio from this device</span>
              <span className="audio-upload-button">
                <Icon name="upload" />
                Choose audio file
              </span>
              <input
                className="audio-file-input"
                type="file"
                accept="audio/m4a,audio/mpeg,audio/wav,audio/webm,.m4a,.mp3,.wav,.webm"
                onChange={(e) => {
                  setAudio(e.target.files?.[0] || null);
                  setSelectedRecording("");
                }}
              />
              <small>{audio?.name || "M4A, MP3, WAV, or WebM"}</small>
            </label>
            <p>or choose a recording from your Library</p>
            <select
              value={selectedRecording}
              onChange={(e) => {
                setSelectedRecording(e.target.value);
                setAudio(null);
              }}
            >
              <option value="">Select a Drive recording</option>
              {recordings.map((recording) => (
                <option key={recording.file_id} value={recording.file_id}>
                  {recording.filename}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          className="translate-button"
          disabled={
            working || (mode === "audio" && !audio && !selectedRecording)
          }
          title={mode === "audio" ? "Translate selected audio" : "Translate conversation"}
        >
          {working ? (
            "Translating..."
          ) : (
            <>
              <Icon name="sparkle" />
              Translate {mode === "audio" ? "audio" : "conversation"}
            </>
          )}
        </button>
      </form>
      <section className="result-section">
        <div className="result-title">
          <div>
            <p className="eyebrow">TRANSLATION NOTES</p>
            <h2>Side-by-side meaning</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={downloadTranslation}
            title="Download translation"
          >
            <Icon name="download" />
          </button>
        </div>
        <div className="translation-grid">
          <article className="thai">
            <span>THAI</span>
            <p>
              {thaiText}
            </p>
            <p className="romanization">
              {result?.romanization || defaultRomanization}
            </p>
            <button
              className={speaking === "thai" ? "listening" : ""}
              onClick={() =>
                listen(
                  thaiText,
                  "th-TH",
                  "thai",
                )
              }
              aria-pressed={speaking === "thai"}
              title={speaking === "thai" ? "Stop Thai playback" : "Listen to Thai text"}
            >
              <Icon name="play" /> {speaking === "thai" ? "Stop" : "Listen"}
            </button>
          </article>
          <article className="english">
            <span>ENGLISH</span>
            <p>
              {englishText}
            </p>
            <button
              className={speaking === "english" ? "listening" : ""}
              onClick={() =>
                listen(
                  englishText,
                  "en-US",
                  "english",
                )
              }
              aria-pressed={speaking === "english"}
              title={speaking === "english" ? "Stop English playback" : "Listen to English text"}
            >
              <Icon name="play" /> {speaking === "english" ? "Stop" : "Listen"}
            </button>
          </article>
        </div>
        <div className="notes">
          <b>Context & phrases</b>
          {working ? (
            <p>Preparing context notes...</p>
          ) : result?.notes.length ? (
            result.notes.map((note) => <p key={note}>{note}</p>)
          ) : result ? (
            <p>No additional context notes for this translation.</p>
          ) : (
            <p>Translate a phrase to see its context and useful expressions.</p>
          )}
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
