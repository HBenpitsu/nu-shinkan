import { appendFileSync } from "node:fs";
import { github, prNumber } from "../../scripts/github.mjs";
const clean = (value) =>
  String(value ?? "")
    .replace(/[|<>`\r\n]/g, " ")
    .slice(0, 1000);
const results = JSON.parse(process.env.RESULTS || "[]");
const steps = JSON.parse(process.env.STEPS || "{}");
const failed = Object.entries(steps)
  .filter(([, step]) => step.outcome === "failure")
  .map(([name]) => name);
const url = `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const body = [
  `Deploy ${clean(process.env.DEPLOY_CHANNEL)} · ${clean(process.env.JOB_STATUS)}`,
  `SHA: ${clean(process.env.HEAD_SHA)}`,
  failed.length ? `Failed steps: ${failed.map(clean).join(", ")}` : "",
  "",
  "| Package | Result | Worker | URL | Error |",
  "| --- | --- | --- | --- | --- |",
  ...results.map(
    (r) =>
      `| ${clean(r.package)} | ${clean(r.status)} | ${clean(r.worker)} | ${clean(r.url)} | ${clean(r.error)} |`,
  ),
  "",
  `[Actions run](${url})`,
].join("\n");
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, body + "\n");
if (process.env.PR_NUMBER && process.env.PR_NUMBER !== "-1") {
  try {
    await github(`issues/${prNumber(process.env.PR_NUMBER)}/comments`, "POST", {
      body: body.slice(0, 60000),
    });
  } catch (error) {
    console.error("PR notification failed:", error);
  }
}
