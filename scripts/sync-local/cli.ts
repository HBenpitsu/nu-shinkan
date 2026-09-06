import { parseArgs } from "node:util";
import { syncLocal } from "./sync.js";
try {
  const { values } = parseArgs({
    options: {
      root: { type: "string" },
      "dry-run": { type: "boolean" },
      check: { type: "boolean" },
    },
  });
  syncLocal(values.root, values["dry-run"] || values.check);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
