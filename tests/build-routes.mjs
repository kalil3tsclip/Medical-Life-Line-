// Bundles the real API route handlers with test stubs for the hosting-specific imports.
// Usage: node tests/build-routes.mjs <outdir>
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || path.join(root, "tests/.build");
await build({
  entryPoints: { quotes: "app/api/quotes/route.ts", admin: "app/api/admin/route.ts", webhook: "app/api/square-webhook/route.ts", availability: "app/api/availability/route.ts" },
  absWorkingDir: root, bundle: true, format: "esm", platform: "node", outdir: out, logLevel: "warning",
  tsconfig: path.join(root, "tsconfig.json"),
  plugins: [{ name: "stubs", setup(b) {
    b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: path.join(root, "tests/stubs/cloudflare-workers.mjs") }));
    b.onResolve({ filter: /^@\/app\/chatgpt-auth$/ }, () => ({ path: path.join(root, "tests/stubs/chatgpt-auth.mjs") }));
  } }],
});
console.log("built", out);
