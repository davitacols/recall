const { spawnSync } = require("child_process");
const path = require("path");

const reactScriptsPath = path.resolve(__dirname, "../node_modules/react-scripts/bin/react-scripts.js");
const env = {
  ...process.env,
  GENERATE_SOURCEMAP: process.env.GENERATE_SOURCEMAP || "false",
};

const result = spawnSync(process.execPath, [reactScriptsPath, "build"], {
  cwd: path.resolve(__dirname, ".."),
  env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
}

if (result.status === 0 && process.env.SKIP_SEO_SNAPSHOTS !== "1") {
  // Prerender static SEO HTML for the public routes (body + per-route meta).
  // Non-fatal: a snapshot failure must never break a successful production build,
  // since the SPA shell still works on its own.
  const snapshot = spawnSync(process.execPath, [path.resolve(__dirname, "generate-seo-snapshots.js")], {
    cwd: path.resolve(__dirname, ".."),
    env,
    stdio: "inherit",
  });
  if (snapshot.status !== 0) {
    console.warn("[build] SEO snapshot generation skipped or failed; deploying the SPA shell as-is.");
  }
}

process.exit(result.status ?? 1);
