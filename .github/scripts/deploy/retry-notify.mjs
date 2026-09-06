import { readFileSync } from "node:fs";
import { github, prNumber } from "./request.ts";
const env = process.env;
const report = JSON.parse(
  readFileSync(".artifacts/deploy/result.json", "utf8"),
);
if (
  report.repository !== env.GITHUB_REPOSITORY ||
  report.runId !== env.ORIGINAL_RUN_ID ||
  report.pr !== prNumber(env.PR_NUMBER)
)
  throw Error("Artifact does not match requested run and PR");
const run = await github(`actions/runs/${env.ORIGINAL_RUN_ID}`);
const pr = await github(`pulls/${report.pr}`);
if (
  run.event === "pull_request" &&
  !run.pull_requests.some((p) => p.number === report.pr)
)
  throw Error("Run is not associated with the requested PR");
if (!pr.number || pr.number !== report.pr) throw Error("Invalid PR");
await import("./notify-run.mjs");
