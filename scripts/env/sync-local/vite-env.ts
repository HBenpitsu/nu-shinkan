import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { rootDir } from "../materialize/paths.js";
import { formatDotenv, parseDotenv } from "../materialize/utils.js";
import { addVITEPrefix } from "./prefix.js";
import type { SyncChange, SyncMode } from "./types.js";

export function syncViteLocalEnv(
  appName: string,
  localVars: Record<string, string>,
  mode: SyncMode,
): SyncChange | undefined {
  const envPath = resolve(rootDir, "apps", appName, ".env.development");
  if (!existsSync(envPath)) {
    return undefined;
  }

  const current = parseDotenv(readFileSync(envPath, "utf8"));
  const touched: string[] = [];
  const prefixedLocalVars = addVITEPrefix(localVars);

  for (const [key, value] of Object.entries(prefixedLocalVars)) {
    const prev = current.get(key);
    if (prev !== value) {
      current.set(key, value);
      touched.push(key);
    }
  }

  // Keep existing non-VITE keys in .env.development as intentional local build-time settings.

  if (touched.length === 0) {
    return undefined;
  }

  if (mode === "apply") {
    writeFileSync(envPath, formatDotenv(current), "utf8");
  }

  return { filePath: envPath, keys: touched };
}
