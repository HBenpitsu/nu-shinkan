import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { parseContext } from "@repo/app-config/context";
import { plan, type Request } from "./plan.js";
import { runDeploy, runTask } from "./run.js";
import { cleanup } from "./cleanup.js";
import { currentPR, operation, prNumber } from "./request.js";
import { notify } from "./notify.js";
import type { Report } from "./results.js";
const env = process.env;
const file = ".artifacts/deploy/result.json";
mkdirSync(".artifacts/deploy", { recursive: true });
const report: Report = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : {
      repository: env.GITHUB_REPOSITORY ?? "",
      runId: env.GITHUB_RUN_ID ?? "",
      pr: Number(env.PR_NUMBER ?? -1),
      head: env.HEAD_SHA ?? "",
      base: env.BASE_SHA,
      channel: env.DEPLOY_CHANNEL ?? "preview",
      phase: "input",
      changes: [],
      targets: [],
      results: [],
    };
const save = () => writeFileSync(file, JSON.stringify(report, null, 2));
const output = (key: string, value: unknown) => {
  if (env.GITHUB_OUTPUT)
    appendFileSync(env.GITHUB_OUTPUT, `${key}=${JSON.stringify(value)}\n`);
};
async function remove() {
  report.phase = "cleanup";
  save();
  report.cleanup = await cleanup(prNumber(report.pr));
  if (
    (report.cleanup as { status: string }[]).some((r) => r.status === "failure")
  )
    throw new Error("Some preview Workers could not be deleted");
}
try {
  switch (process.argv[2]) {
    case "plan": {
      report.phase = "plan";
      save();
      const source = env.SELECTION_SOURCE;
      if (!["diff", "full", "manual-pick"].includes(source ?? ""))
        throw new Error("Invalid selection source");
      parseContext({ ...env, TARGETS: "[]" });
      const actual = execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();
      if (actual !== report.head)
        throw new Error(`Checkout SHA mismatch: ${actual} != ${report.head}`);
      const result = plan({
        channel: report.channel,
        source,
        head: report.head,
        base: report.base,
        picks: JSON.parse(env.PICKS ?? "[]"),
      } as Request);
      Object.assign(report, result);
      output("changes", result.changes);
      output("targets", result.targets);
      console.log(
        JSON.stringify({ head: report.head, base: report.base, ...result }),
      );
      break;
    }
    case "prepare":
      report.phase = "test";
      save();
      runTask("test", report.changes, ["--", "--run"]);
      report.phase = "build";
      save();
      parseContext(env);
      env.WORKER_NAMES = execFileSync(
        "pnpm",
        ["exec", "tsx", "scripts/deploy-context/build.ts"],
        {
          input: JSON.stringify(report.targets),
          encoding: "utf8",
          stdio: ["pipe", "pipe", "inherit"],
        },
      ).trim();
      runTask("build", report.targets);
      break;
    case "deploy": {
      if (
        report.channel === "preview" &&
        (await currentPR(report.pr)) === "closed"
      ) {
        await remove();
        break;
      }
      report.phase = "deploy";
      save();
      const result = runDeploy(
        report.targets,
        env.SELECTION_SOURCE === "manual-pick",
      );
      report.results = result.results;
      if (result.failed) throw new Error("One or more deployments failed");
      report.phase = "complete";
      break;
    }
    case "cleanup": {
      const action = operation(
        env.REQUEST_KIND === "delete" ? "delete" : "close",
        await currentPR(report.pr),
      );
      if (action === "cleanup") await remove();
      else report.phase = "skipped";
      break;
    }
    case "notify":
      if (env.JOB_STATUS === "failure" && !report.error) {
        report.error = "Workflow step failed; see Actions logs";
        report.phase = env.FAILED_PHASE ?? report.phase;
      }
      try {
        await notify(report);
      } catch (error) {
        report.notificationError = String(error);
        throw error;
      }
      break;
    default:
      throw new Error("Unknown deploy command");
  }
} catch (error) {
  if (process.argv[2] !== "notify") report.error = String(error);
  console.error(error);
  process.exitCode = 1;
} finally {
  save();
}
