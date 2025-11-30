import { createServerApp } from "./app.js";

const PORT = process.env.PORT || 4000;
const { start } = createServerApp();

start(PORT).then(() => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
