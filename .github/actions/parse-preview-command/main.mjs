import { readFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parsePreviewCommand, checkExistence } from "./input.mjs";

function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const packages = parsePreviewCommand(event.comment?.body);
  const listing = JSON.parse(
    execFileSync("pnpm", ["exec", "turbo", "ls", "--output=json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }),
  );
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `picked=${JSON.stringify(checkExistence(packages, listing))}\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
