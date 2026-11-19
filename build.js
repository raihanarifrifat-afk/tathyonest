// TathyoNest React 2.0 build entry.
// Cloudflare Pages installs package.json dependencies before running this script.
import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  console.error("Could not start the Vite build:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
