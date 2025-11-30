import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const serverUrl = process.env.VITE_SERVER_URL || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: serverUrl,
        changeOrigin: true
      },
      "/socket.io": {
        target: serverUrl,
        changeOrigin: true,
        ws: true
      }
    }
  }
});
