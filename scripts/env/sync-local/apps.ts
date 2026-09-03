import { readConfig, resolveLocalVariables } from "../materialize/overrides.js";
import { shouldProcess } from "../materialize/utils.js";
import { syncViteLocalEnv } from "./vite-env.js";
import { syncWranglerLocalVars } from "./wrangler-vars.js";
import type { SyncChange, SyncOptions } from "./types.js";

export function syncLocalApps(options: SyncOptions): SyncChange[] {
  const config = readConfig();
  const changes: SyncChange[] = [];

  for (const [appName, appStages] of Object.entries(config.apps)) {
    if (!shouldProcess(appName, options.apps)) {
      continue;
    }

    const localVars = resolveLocalVariables(config.globals, appStages);
    const localKeys = Object.keys(localVars);
    if (localKeys.length === 0) {
      continue;
    }

    const viteChange = syncViteLocalEnv(appName, localVars, options.mode);
    if (viteChange) {
      changes.push(viteChange);
    }

    const wranglerChange = syncWranglerLocalVars(
      appName,
      localVars,
      options.mode,
    );
    if (wranglerChange) {
      changes.push(wranglerChange);
    }
  }

  return changes;
}
