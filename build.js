// TathyoNest React 2.0 build entry.
// Cloudflare Pages can keep using "node build.js" as its build command.
const { spawnSync } = require("node:child_process");

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vite", "build"],
  { stdio: "inherit", shell: process.platform === "win32" }
);

if (result.error) {
  console.error("TathyoNest build could not start:", result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
