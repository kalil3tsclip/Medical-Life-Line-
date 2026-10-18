import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

// Cloudflare deploys read these at build time (Workers Builds → Settings → Build variables):
//   D1_DATABASE_ID  the ID of the "medical-life-line" D1 database
//   WORKER_NAME     optional, defaults to "medical-life-line"
// The "medical-life-line" D1 database on the owner's Cloudflare account (an ID, not a secret).
const MEDICAL_LIFE_LINE_DATABASE_ID = "a8c16ee3-e9f7-4995-860b-53b40d18da1e";
// Local development keeps using a throwaway local database; Cloudflare builds use the real one.
const databaseId = process.env.D1_DATABASE_ID || (process.env.WORKERS_CI || process.env.CI ? MEDICAL_LIFE_LINE_DATABASE_ID : SITE_CREATOR_PLACEHOLDER_DATABASE_ID);

const localBindingConfig = {
  name: process.env.WORKER_NAME || "medical-life-line",
  main: "vinext/server/fetch-handler",
  // Keep variables set in the Cloudflare dashboard (Square, Google, etc.) across deploys.
  keep_vars: true,
  // Owner sign-in through Cloudflare Access. These identify the owner's Access application; they are not secrets.
  vars: {
    ACCESS_TEAM_DOMAIN: "weathered-thunder-1e1b.cloudflareaccess.com",
    ACCESS_AUD: "6a199f9110d1d2910974ba7b9f8b75e71f5e6431b1acc1292c3c8c227c4aa83e",
    OWNER_EMAILS: "vgcaldwell89@gmail.com",
    SITE_URL: "https://medilifelinetrans.com",
  },
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "medical-life-line",
          database_id: databaseId,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      ...(managedLinux ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] } : {}),
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
    },
    plugins: [
      vinext(),
      sites({ mockAuth: !managedLinux }),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
