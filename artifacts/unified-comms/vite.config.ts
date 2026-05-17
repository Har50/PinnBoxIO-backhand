import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

const basePath = process.env.BASE_PATH ?? "/";

const landingPagePlugin = {
  name: "landing-page-root",
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? "/";
      const pathname = url.split("?")[0];
      if (req.method === "GET" && (pathname === "/" || pathname === basePath || pathname === basePath + "/")) {
        const landingPath = path.resolve(import.meta.dirname, "public", "landing.html");
        const html = fs.readFileSync(landingPath, "utf-8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }
      next();
    });
  },
  closeBundle() {
    const distDir = path.resolve(import.meta.dirname, "dist/public");
    const spaIndex = path.join(distDir, "index.html");
    const appHtml = path.join(distDir, "app.html");
    const landingSrc = path.resolve(import.meta.dirname, "public", "landing.html");
    if (fs.existsSync(spaIndex)) {
      fs.renameSync(spaIndex, appHtml);
    }
    fs.copyFileSync(landingSrc, spaIndex);
  },
};

export default defineConfig({
  base: basePath,
  plugins: [
    landingPagePlugin,
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
