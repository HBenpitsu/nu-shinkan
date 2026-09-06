import { execFileSync } from "node:child_process";
import { packages } from "../../scripts/turbo-parse.mjs";
import { output } from "../../scripts/output.mjs";
import { runDeploy } from "../../../scripts/deploy/run.ts";

const targets = packages(
  JSON.parse(
    execFileSync("pnpm", ["exec", "turbo", "ls", "--output=json"], {
      encoding: "utf8",
    }),
  ),
);
const result = runDeploy(targets, false);
output("results", result.results);
if (result.failed) process.exitCode = 1;
