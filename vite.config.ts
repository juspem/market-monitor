import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/cboe": {
        target: "https://cdn.cboe.com",
        changeOrigin: true,
        headers: { "User-Agent": "market-monitor/0.1.0", Accept: "text/csv" },
        configure: (proxy) => {
          proxy.on("proxyReq", (request) => {
            for (const header of ["cookie", "authorization", "origin", "referer"]) {
              request.removeHeader(header);
            }
          });
        },
        rewrite: (path) => path.replace(/^\/api\/cboe/, "/api/global/us_indices"),
      },
      "/api/fred": {
        target: "https://fred.stlouisfed.org",
        changeOrigin: true,
        headers: { "User-Agent": "market-monitor/0.1.0", Accept: "text/csv" },
        configure: (proxy) => {
          proxy.on("proxyReq", (request) => {
            for (const header of ["cookie", "authorization", "origin", "referer"]) {
              request.removeHeader(header);
            }
          });
        },
        rewrite: (path) => path.replace(/^\/api\/fred/, ""),
      },
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        // Yahoo can return 429 immediately for missing or rejected client headers.
        // Identify the server consistently instead of forwarding the browser's UA.
        headers: {
          "User-Agent": "market-monitor/0.1.0",
          Accept: "application/json",
        },
        configure: (proxy) => {
          proxy.on("proxyReq", (request) => {
            for (const header of ["cookie", "authorization", "origin", "referer"]) {
              request.removeHeader(header);
            }
          });
        },
        rewrite: (path) => path.replace(/^\/api\/yahoo\/chart/, "/v8/finance/chart"),
      },
    },
  },
});
