import { jest } from "@jest/globals";
import request from "supertest";
import { io as Client } from "socket.io-client";
import { createServerApp, snippets } from "../app.js";

jest.setTimeout(20000);

const waitFor = (eventEmitter, event) =>
  new Promise((resolve) => {
    eventEmitter.once(event, resolve);
  });

describe("Realtime collaboration server", () => {
  let appCtx;
  let port;

  beforeAll(async () => {
    appCtx = createServerApp({ clientOrigin: "*" });
    await new Promise((resolve) => {
      appCtx.server.listen(0, () => {
        port = appCtx.server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => appCtx.io.close(() => resolve()));
    await new Promise((resolve) => appCtx.server.close(() => resolve()));
  });

  const connectClient = () =>
    new Promise((resolve, reject) => {
      const socket = Client(`http://localhost:${port}`, {
        transports: ["websocket"],
        forceNew: true
      });
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", reject);
    });

  const createSession = async () => {
    const res = await request(appCtx.app).post("/api/sessions").send({ language: "javascript" }).expect(201);
    return res.body;
  };

  test("client can connect via websocket", async () => {
    const socket = await connectClient();
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  test("session can be created via REST", async () => {
    const session = await createSession();
    expect(session.sessionId).toBeDefined();
    expect(session.code).toContain("JavaScript starter");
  });

  test("clients joining same session receive initial code and updates", async () => {
    const session = await createSession();
    const userA = await connectClient();
    const userB = await connectClient();

    const joinA = waitFor(userA, "session-joined");
    userA.emit("join-session", { sessionId: session.sessionId, userName: "UserA" });
    const payloadA = await joinA;
    expect(payloadA.code).toBe(session.code || snippets.javascript);

    const joinB = waitFor(userB, "session-joined");
    const userJoinedOnA = waitFor(userA, "user-joined");
    userB.emit("join-session", { sessionId: session.sessionId, userName: "UserB" });
    const payloadB = await joinB;
    const joinedInfo = await userJoinedOnA;

    expect(payloadB.code).toBe(session.code);
    expect(joinedInfo.name).toBe("UserB");

    const updatedCode = "// change";
    const codeUpdatePromise = waitFor(userB, "code-update");
    userA.emit("code-change", { sessionId: session.sessionId, code: updatedCode });
    const received = await codeUpdatePromise;
    expect(received).toBe(updatedCode);

    const userLeftPromise = waitFor(userA, "user-left");
    userB.disconnect();
    const leftId = await userLeftPromise;
    expect(leftId).toBe(joinedInfo.id);

    userA.disconnect();
  });
});
