import { execFileSync } from "node:child_process";
import { packages } from "../../scripts/turbo-parse.mjs";
export function validatePicks(picks, workspace) {
  if (
    !Array.isArray(picks) ||
    !picks.length ||
    picks.some((p) => typeof p !== "string")
  )
    throw Error("Usage: /preview <package-name> ...");
  const valid = [
    ...new Set(
      picks.filter((name) => workspace.some((p) => p.package === name)),
    ),
  ];
  const unknown = picks.filter((name) => !valid.includes(name));
  if (unknown.length)
    throw Error(
      `Unknown: ${unknown.join(", ")}\nUsage: /preview <package-name> ...${valid.length ? `\nTry: /preview ${valid.join(" ")}` : ""}`,
    );
  return valid;
}
if (process.argv[1]?.endsWith("/check.mjs")) {
  const workspace = packages(
    JSON.parse(
      execFileSync("pnpm", ["exec", "turbo", "ls", "--output=json"], {
        encoding: "utf8",
      }),
    ),
  );
  validatePicks(JSON.parse(process.env.PICKS || "[]"), workspace);
}
