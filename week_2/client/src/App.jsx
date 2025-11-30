import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import CodeEditor from "./components/CodeEditor";
import { loadPyodide } from "./utils/pyodide";

const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const languages = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java (syntax only)" }
];

function App() {
  const urlSession = useMemo(() => {
    const search = new URL(window.location.href).searchParams;
    return search.get("session") || "";
  }, []);
  const [sessionId, setSessionId] = useState(urlSession);
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// Start coding together...");
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const socketRef = useRef(null);
  const pyodideRef = useRef(null);

  useEffect(
    () => () => {
      socketRef.current?.disconnect();
    },
    []
  );

  useEffect(() => {
    const stored = localStorage.getItem("collab-user");
    if (stored) {
      setUserName(stored);
    } else {
      const id = crypto.randomUUID ? crypto.randomUUID().slice(0, 5) : Math.random().toString(36).slice(2, 7);
      const generated = `Guest-${id}`;
      setUserName(generated);
      localStorage.setItem("collab-user", generated);
    }
  }, []);

  useEffect(() => {
    if (urlSession && userName) {
      joinSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  const connectToSession = (id) => {
    if (!id) return;
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setStatus("Connecting to session...");
    setError("");
    const socket = io(serverUrl, {
      transports: ["websocket"],
      withCredentials: false
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-session", { sessionId: id, userName });
    });

    socket.on("session-joined", (payload) => {
      setLanguage(payload.language);
      setCode(payload.code);
      setParticipants(payload.users || []);
      setStatus(`Connected to ${payload.sessionId}`);
    });

    socket.on("code-update", (incoming) => {
      setCode(incoming);
    });

    socket.on("language-update", ({ language: lang, code: serverCode }) => {
      setLanguage(lang);
      setCode(serverCode);
    });

    socket.on("participants", (users) => {
      setParticipants(users || []);
    });

    socket.on("session-error", (message) => {
      setError(message);
      setStatus("Error");
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
    });
  };

  const createSession = async () => {
    setIsCreating(true);
    setError("");
    try {
      const response = await fetch(`${serverUrl}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language })
      });
      if (!response.ok) {
        throw new Error("Failed to create session");
      }
      const data = await response.json();
      setSessionId(data.sessionId);
      setLanguage(data.language);
      setCode(data.code);
      const url = new URL(window.location.href);
      url.searchParams.set("session", data.sessionId);
      window.history.replaceState({}, "", url.toString());
      setStatus("Session created");
      connectToSession(data.sessionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const joinSession = async () => {
    if (!sessionId) {
      setError("Enter a session ID first");
      return;
    }
    setIsJoining(true);
    setError("");
    try {
      const response = await fetch(`${serverUrl}/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error("Session not found");
      }
      const data = await response.json();
      setLanguage(data.language);
      setCode(data.code);
      const url = new URL(window.location.href);
      url.searchParams.set("session", sessionId);
      window.history.replaceState({}, "", url.toString());
      connectToSession(sessionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const broadcastCode = (value) => {
    setCode(value);
    if (socketRef.current && sessionId) {
      socketRef.current.emit("code-change", { sessionId, code: value });
    }
  };

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    if (socketRef.current && sessionId) {
      socketRef.current.emit("language-change", { sessionId, language: nextLanguage });
    }
  };

  const copyLink = async () => {
    if (!sessionId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("session", sessionId);
    await navigator.clipboard.writeText(url.toString());
    setStatus("Share link copied!");
  };

  const runJavaScript = async (codeToRun) => {
    return new Promise((resolve) => {
      const workerCode = `
        self.onmessage = (event) => {
          const source = event.data;
          const messages = [];
          const sandboxConsole = { log: (...args) => messages.push(args.join(" ")) };
          try {
            const fn = new Function("console", source);
            const result = fn(sandboxConsole);
            if (result !== undefined) messages.push(String(result));
            self.postMessage({ ok: true, output: messages.join("\\n") || "No output" });
          } catch (err) {
            self.postMessage({ ok: false, output: err.toString() });
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = (event) => {
        resolve(event.data);
        worker.terminate();
      };
      worker.postMessage(codeToRun);
    });
  };

  const ensurePyodide = async () => {
    if (pyodideRef.current) return pyodideRef.current;
    setStatus("Loading Pyodide runtime...");
    const pyodide = await loadPyodide();
    pyodideRef.current = pyodide;
    setStatus("Pyodide ready");
    return pyodide;
  };

  const runPython = async (codeToRun) => {
    const pyodide = await ensurePyodide();
    const escaped = codeToRun.replace(/\\/g, "\\\\").replace(/"""/g, '\\"""');
    const wrapped = `
import sys, io, contextlib
_stdout, _stderr = io.StringIO(), io.StringIO()
with contextlib.redirect_stdout(_stdout):
    with contextlib.redirect_stderr(_stderr):
        exec("""${escaped}""", {})
(_stdout.getvalue(), _stderr.getvalue())
`;
    try {
      const [out, err] = await pyodide.runPythonAsync(wrapped);
      if (err) {
        return { ok: false, output: err };
      }
      return { ok: true, output: out || "No output" };
    } catch (err) {
      return { ok: false, output: err.toString() };
    }
  };

  const executeCode = async () => {
    setIsRunning(true);
    setOutput("");
    setError("");
    try {
      if (language === "javascript") {
        const result = await runJavaScript(code);
        setOutput(result.output);
        if (!result.ok) setError(result.output);
      } else if (language === "python") {
        const result = await runPython(code);
        setOutput(result.output);
        if (!result.ok) setError(result.output);
      } else {
        setOutput("Java execution is disabled. Switch to JS or Python to run code.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Realtime Coding Interview</p>
          <h1>Collaborate, interview, and evaluate in the same room.</h1>
          <p className="lede">
            Create a shareable room, watch code update live, switch languages, and execute JavaScript or Python safely in
            the browser.
          </p>
        </div>
        <div className="badge">{status}</div>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Session Controls</h2>
            <span className="pill">You: {userName || "loading..."}</span>
          </div>

          <div className="field">
            <label>Session ID</label>
            <div className="row">
              <input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="abc123"
                className="input"
              />
              <button className="button ghost" onClick={createSession} disabled={isCreating}>
                {isCreating ? "Creating..." : "New"}
              </button>
              <button className="button" onClick={joinSession} disabled={isJoining}>
                {isJoining ? "Joining..." : "Join"}
              </button>
            </div>
            <p className="hint">Create a room or paste an invite code to join. Share link copies automatically.</p>
          </div>

          <div className="field">
            <label>Language</label>
            <div className="row">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  className={`chip ${language === lang.id ? "active" : ""}`}
                  onClick={() => handleLanguageChange(lang.id)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Participants</label>
            <div className="avatars">
              {participants.length === 0 && <span className="muted">No one here yet.</span>}
              {participants.map((user) => (
                <span key={user.id} className="avatar">
                  {user.name}
                </span>
              ))}
            </div>
          </div>

          <div className="field actions">
            <button className="button primary" onClick={executeCode} disabled={!sessionId || isRunning}>
              {isRunning ? "Running..." : "Run Code"}
            </button>
            <button className="button ghost" onClick={copyLink} disabled={!sessionId}>
              Copy share link
            </button>
          </div>

          {(error || output) && (
            <div className="output">
              {error && <p className="error">{error}</p>}
              {output && <pre>{output}</pre>}
            </div>
          )}
        </section>

        <section className="panel editor-panel">
          <div className="panel-header">
            <h2>Shared Editor</h2>
            <span className="pill">{language}</span>
          </div>
          <CodeEditor value={code} language={language} onChange={broadcastCode} />
        </section>
      </main>
    </div>
  );
}

export default App;
