// TathyoNest React 2.0 build entry.
// Works with the current Cloudflare Pages "node build.js" build command.
const { spawnSync } = require("node:child_process");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) {
    console.error("Could not start " + command + ":", result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Install from package.json even if the Pages project has no separate install command.
run("npm", ["install", "--no-audit", "--no-fund"]);
run("npm", ["run", "build"]);
