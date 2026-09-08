import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import vercelConfig from "./vercel.json";
import { sites } from "./build/sites-vite-plugin";
import { nitro } from "nitro/vite";
import { cp, readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// Vercel needs Nitro's .output deployment bundle. Keep the existing native
// Cloudflare integration for local/Codex previews and Worker deployments.
const isVercel = process.env.VERCEL === "1" || process.env.NITRO_PRESET === "vercel";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
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
  if (isVercel) {
    return {
      plugins: [vinext(), nitro({
        vercel: { functions: { regions: vercelConfig.regions } },
        traceDeps: ["sharp*", "@img/sharp-linux-x64*", "@img/sharp-libvips-linux-x64*"],
        modules: [(nitro) => { nitro.hooks.hook("compiled", async (nitro) => {
          const routing = JSON.parse(await readFile(join(nitro.options.output.dir, "config.json"), "utf8"));
          if (!routing.routes?.some((route: { dest?: string }) => route.dest)) throw new Error("Vercel function routing was not generated");
          if (process.platform !== "linux" || process.arch !== "x64") return;
          const source = join(nitro.options.rootDir, "node_modules");
          const output = join(nitro.options.output.serverDir, "node_modules");
          const { version } = JSON.parse(await readFile(join(source, "sharp/package.json"), "utf8"));
          // nf3's multi-version layout breaks the binary's sibling libvips RPATH.
          const native = await realpath(join(output, `.nf3/@img/sharp-linux-x64@${version}`))
            .catch(() => realpath(join(output, "@img/sharp-linux-x64")));
          await cp(join(source, "@img/sharp-libvips-linux-x64"), join(native, "../sharp-libvips-linux-x64"), { recursive: true, dereference: true });
          // Test the deployed binary, not the working build-container dependency.
          execFileSync(process.execPath, ["-e", "require(process.argv[1])", join(native, "index.cjs")], { cwd: output, stdio: "inherit" });
          console.info("Verified bundled Sharp Linux runtime");
        }); }],
      })],
    };
  }

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
