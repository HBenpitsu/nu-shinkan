import { execFileSync } from "node:child_process";
import { packages } from "../../scripts/turbo-parse.mjs";
import { checkHead, commit } from "../../scripts/git.mjs";
import { planOutput } from "../../scripts/output.mjs";
import { createPlan } from "../../../scripts/deploy/targets.ts";
const head = checkHead();
const all = packages(
  JSON.parse(
    execFileSync("pnpm", ["exec", "turbo", "ls", "--output=json"], {
      encoding: "utf8",
    }),
  ),
);
const picks = JSON.parse(process.env.PICKS);
const changes = all.filter((p) => picks.includes(p.package));
const starts = packages(
  JSON.parse(
    execFileSync(
      "pnpm",
      [
        "exec",
        "turbo",
        "ls",
        "--output=json",
        ...picks.map((p) => `--filter=...${p}`),
      ],
      { encoding: "utf8" },
    ),
  ),
);
const plan = createPlan(all, changes, starts, true);
const { readFileSync } = await import("node:fs");
if (
  !plan.targets.some(
    (p) =>
      typeof JSON.parse(readFileSync(`${p.path}/package.json`, "utf8")).scripts
        ?.deploy === "string",
  )
)
  throw Error("No deployable targets for /preview");
planOutput(plan);
