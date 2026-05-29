import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(artifactDir, "dist/server-bundle");

// Only clean the server bundle — dist/public and dist/server are produced by
// the preceding vite builds and must be preserved.
rmSync(outDir, { recursive: true, force: true });

await esbuild({
  entryPoints: [path.resolve(artifactDir, "server/index.ts")],
  platform: "node",
  target: "node24",
  bundle: true,
  format: "esm",
  outdir: outDir,
  outExtension: { ".js": ".mjs" },
  sourcemap: "linked",
  logLevel: "info",
  external: ["*.node"],
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      "import { fileURLToPath as __fileURLToPath } from 'node:url';",
      "import { dirname as __dirname_fn } from 'node:path';",
      "globalThis.require = __createRequire(import.meta.url);",
      "globalThis.__filename = __fileURLToPath(import.meta.url);",
      "globalThis.__dirname = __dirname_fn(globalThis.__filename);",
    ].join("\n"),
  },
});

console.log("[blog-build] server bundle written to dist/server-bundle/index.mjs");
