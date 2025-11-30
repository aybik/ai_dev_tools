# Real-Time Collaborative Coding Interview Platform

Realtime pair-programming interview tool with shared editing, language switching, live user presence, and safe in-browser execution for JavaScript and Python.

## Project Structure
- `server/` – Express + Socket.IO API and WebSocket hub (in-memory sessions)
- `client/` – React + Vite UI with Monaco editor, Pyodide + Web Worker execution
- `package.json` (root) – helper scripts to run both parts

## Prerequisites
- Node.js 18+ and npm

## Setup
```bash
# Install dependencies for both apps
npm run install:all --prefix week_2

# Or install separately
npm install --prefix week_2/server
npm install --prefix week_2/client
```

## Run
```bash
# Start backend (http://localhost:4000)
npm run server --prefix week_2

# Start frontend (http://localhost:5173)
npm run client --prefix week_2
```

Root `npm run dev` will run both with a simple background `&` for local development (shell-friendly).

### Environment Variables
- `PORT` (server) – default `4000`
- `CLIENT_ORIGIN` (server) – allowed CORS origin, default `*`
- `VITE_SERVER_URL` (client) – API/socket base URL, default `http://localhost:4000`

## How to Use
1. Click **New** to create a session; the URL gains `?session=ID`. Share that link.
2. In another tab/person, paste the session ID or link and click **Join**.
3. See live participants and code updates as you type.
4. Switch languages (JavaScript/Python/Java). Java is syntax-only.
5. Run code:
   - JavaScript executes inside a Web Worker sandbox.
   - Python executes via Pyodide in the browser.
6. Output and errors appear in the results panel. Disconnects remove users and auto-clean empty sessions.

## Notes
- Sessions are in-memory; restarting the server clears them.
- Execution is client-side only; server never runs user code.

## Testing
- Backend integration tests (REST + Socket.IO):
  ```bash
  npm test --prefix week_2/server
  ```
  Uses Jest with Supertest and socket.io-client to validate session creation, joining, code sync, and disconnect broadcasts.
- Frontend manual checks: follow `client/tests/manual.md`.

## Architecture Overview
- **Server (week_2/server)**: Express REST for session create/fetch, Socket.IO for join/code/language/presence events, in-memory session store, CORS configurable via `CLIENT_ORIGIN`.
- **Client (week_2/client)**: React + Vite app with Monaco editor; uses Socket.IO client for realtime sync; executes JS in a Web Worker and Python via Pyodide; Java is syntax-only. Vite proxies `/api` and `/socket.io` to the server during dev.
