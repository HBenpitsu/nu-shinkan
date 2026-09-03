import { rootDir } from "../materialize/paths.js";
import type { SyncChange, SyncMode } from "./types.js";

export function printReport(mode: SyncMode, changes: SyncChange[]): void {
  if (changes.length === 0) {
    console.log("No local sync changes.");
    return;
  }

  console.log(
    mode === "check"
      ? "Local sync dry-run changes:"
      : "Applied local sync changes:",
  );
  for (const change of changes) {
    const relative = change.filePath.replace(`${rootDir}/`, "");
    const keys = change.keys.join(", ");
    console.log(`- ${relative}: ${keys}`);
  }
}
