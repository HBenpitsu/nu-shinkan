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
let changes, starts;
const base = commit(process.env.BASE_SHA);

changes = packages(
  JSON.parse(
    execFileSync(
      "pnpm",
      ["exec", "turbo", "ls", "--output=json", `--filter=[${base}...${head}]`],
      { encoding: "utf8" },
    ),
  ),
);
starts = packages(
  JSON.parse(
    execFileSync(
      "pnpm",
      [
        "exec",
        "turbo",
        "ls",
        "--output=json",
        `--filter=...[${base}...${head}]`,
      ],
      { encoding: "utf8" },
    ),
  ),
);
planOutput(createPlan(all, changes, starts, true));
