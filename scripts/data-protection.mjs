import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const SECRET =
  /-----BEGIN (?:RSA |OPENSSH |EC |PRIVATE )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|sk_live_[0-9A-Za-z]{8,}|ghp_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|AIza[0-9A-Za-z\-_]{30,}/;

const SKIP_DIR = new Set(["node_modules", "dist", ".output", ".vercel", ".wrangler", ".git"]);

const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".jsonc", ".toml"]);

export function findSecrets(text) {
  const match = text.match(SECRET);
  return match ? [match[0].slice(0, 32)] : [];
}

export async function scanTree(root) {
  const hits = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIR.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      const dot = entry.name.lastIndexOf(".");
      const ext = dot >= 0 ? entry.name.slice(dot) : "";
      if (!SCAN_EXT.has(ext)) continue;
      if (entry.name.includes(".test.")) continue;
      const secrets = findSecrets(await readFile(path, "utf8"));
      for (const secret of secrets) hits.push(`${relative(root, path)}: ${secret}`);
    }
  }
  await walk(root);
  return hits;
}

export function assertHouseholdStaysLocal(source) {
  const problems = [];
  if (!source.includes('name: "family-hub-v1"')) {
    problems.push("household store is not persisted under family-hub-v1");
  }
  if (/\bfetch\s*\(/.test(source) || /navigator\.sendBeacon/.test(source)) {
    problems.push("household store must not send data off the device");
  }
  return problems;
}

async function main() {
  const root = new URL("..", import.meta.url).pathname;
  const secrets = await scanTree(join(root, "src"));
  secrets.push(...(await scanTree(join(root, "scripts"))));
  secrets.push(...(await scanTree(join(root, "server"))));
  const store = await readFile(join(root, "src/lib/hub-store.ts"), "utf8");
  const problems = [...secrets, ...assertHouseholdStaysLocal(store)];
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("data protection: no secrets, household data stays on device");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
