import { readFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function parsePreviewCommand(body) {
  if (typeof body !== "string" || !/^\/preview(?:\s|$)/.test(body))
    throw new Error("Usage: /preview <package-name> ...");
  const packages = [...new Set(body.trim().split(/\s+/).slice(1))];
  if (
    !packages.length ||
    packages.some(
      (name) => !/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/i.test(name),
    )
  )
    throw new Error(
      "Usage: /preview <exact-package-name> ... (filters are not accepted)",
    );
  return packages;
}

export function checkExistence(packages, listing) {
  const items = listing?.packages?.items;
  if (
    !Array.isArray(items) ||
    items.some((pkg) => typeof pkg?.name !== "string")
  )
    throw new Error("Invalid Turbo package listing");
  const names = new Set(items.map((pkg) => pkg.name));
  const missing = packages.filter((name) => !names.has(name));
  if (missing.length)
    throw new Error(
      `Unknown packages: ${missing.join(", ")}. Usage: /preview <package-name> ...`,
    );
  return packages;
}

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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
