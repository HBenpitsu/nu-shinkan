import type { SyncMode, SyncOptions } from "./types.js";

export function parseSyncArgs(argv: string[]): SyncOptions {
  const opts: Partial<SyncOptions> = {};
  let mode: SyncMode = "check";

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--check") {
      mode = selectMode(mode, "check");
      continue;
    }

    if (token === "--apply") {
      mode = selectMode(mode, "apply");
      continue;
    }

    if (token === "--app") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--app requires a value");
      }
      opts.apps ??= new Set<string>();
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => opts.apps?.add(item));
      i += 1;
      continue;
    }
  }

  opts.mode = mode;
  return opts as SyncOptions;
}

function selectMode(current: SyncMode, next: SyncMode): SyncMode {
  if (current !== next && current !== "check") {
    throw new Error("Use either --check or --apply");
  }
  return next;
}
