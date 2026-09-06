import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { notify } from "./notify.ts";
const env = process.env,
  file = ".artifacts/deploy/result.json";
mkdirSync(".artifacts/deploy", { recursive: true });
const report = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : {
      repository: env.GITHUB_REPOSITORY,
      runId: env.GITHUB_RUN_ID,
      pr: Number(env.PR_NUMBER),
      head: env.HEAD_SHA ?? "",
      channel: "preview",
      phase: "setup",
      changes: [],
      targets: [],
      results: [],
    };
if (env.JOB_STATUS === "failure" && !report.error)
  report.error = "Workflow step failed; see Actions logs";
try {
  await notify(report);
  delete report.notificationError;
} catch (error) {
  report.notificationError = String(error);
  console.error(error);
  process.exitCode = 1;
}
writeFileSync(file, JSON.stringify(report, null, 2));
