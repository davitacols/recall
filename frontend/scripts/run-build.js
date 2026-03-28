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

process.exit(result.status ?? 1);
