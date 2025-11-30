import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN === "*" ? "*" : [CLIENT_ORIGIN],
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: CLIENT_ORIGIN === "*" ? "*" : CLIENT_ORIGIN }));
app.use(express.json());

const sessions = new Map();

const defaultSnippets = {
  javascript: `// JavaScript starter
function greet(name) {
  return "Hello, " + name;
}

console.log(greet("Candidate"));
`,
  python: `# Python starter
def greet(name):
    return f"Hello, {name}"

print(greet("Candidate"))
`,
  java: `// Java starter (syntax only)
public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello, Candidate");
    }
}
`
};

function createSession(language = "javascript") {
  const sessionId = nanoid(8);
  const session = {
    id: sessionId,
    language,
    code: defaultSnippets[language] || "",
    users: new Map()
  };
  sessions.set(sessionId, session);
  return session;
}

function sanitizeUsers(usersMap) {
  return Array.from(usersMap.values()).map((user) => ({
    name: user.name,
    id: user.id
  }));
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/sessions", (req, res) => {
  const { language } = req.body || {};
  const session = createSession(language || "javascript");
  res.status(201).json({
    sessionId: session.id,
    language: session.language,
    code: session.code
  });
});

app.get("/api/sessions/:id", (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({
    sessionId: session.id,
    language: session.language,
    code: session.code,
    users: sanitizeUsers(session.users)
  });
});

io.on("connection", (socket) => {
  socket.on("join-session", (payload) => {
    const { sessionId, userName } = payload || {};
    if (!sessionId || !userName) {
      socket.emit("session-error", "Session ID and user name are required");
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit("session-error", "Session not found");
      return;
    }

    socket.join(sessionId);
    session.users.set(socket.id, { id: socket.id, name: userName });

    socket.emit("session-joined", {
      sessionId,
      language: session.language,
      code: session.code,
      users: sanitizeUsers(session.users)
    });

    socket.to(sessionId).emit("user-joined", {
      id: socket.id,
      name: userName
    });

    io.to(sessionId).emit("participants", sanitizeUsers(session.users));
  });

  socket.on("code-change", (data) => {
    const { sessionId, code } = data || {};
    if (!sessionId || typeof code !== "string") {
      return;
    }
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit("session-error", "Session not found");
      return;
    }
    session.code = code;
    socket.to(sessionId).emit("code-update", code);
  });

  socket.on("language-change", (data) => {
    const { sessionId, language } = data || {};
    if (!sessionId || !language) return;
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit("session-error", "Session not found");
      return;
    }
    session.language = language;
    if (!session.code || session.code.trim() === "") {
      session.code = defaultSnippets[language] || "";
    }
    io.to(sessionId).emit("language-update", {
      language: session.language,
      code: session.code
    });
  });

  socket.on("disconnect", () => {
    for (const [sessionId, session] of sessions.entries()) {
      if (session.users.has(socket.id)) {
        session.users.delete(socket.id);
        socket.to(sessionId).emit("user-left", socket.id);
        io.to(sessionId).emit("participants", sanitizeUsers(session.users));
        if (session.users.size === 0) {
          sessions.delete(sessionId);
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
