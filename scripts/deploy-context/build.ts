import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { collectWorkerNames } from "./workers.js";
try {
  const { values } = parseArgs({ options: { root: { type: "string" } } });
  console.log(
    JSON.stringify(
      collectWorkerNames(JSON.parse(readFileSync(0, "utf8")), values.root),
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
