import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
const file = ".artifacts/deploy/result.json",
  env = process.env;
mkdirSync(".artifacts/deploy", { recursive: true });
const report = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : {
      repository: env.GITHUB_REPOSITORY,
      runId: env.GITHUB_RUN_ID,
      pr: Number(env.PR_NUMBER ?? -1),
      head: env.HEAD_SHA,
      base: env.BASE_SHA,
      channel: env.DEPLOY_CHANNEL,
      changes: [],
      targets: [],
      results: [],
    };
if (env.DEPLOY_CHANNEL) {
  report.channel = env.DEPLOY_CHANNEL;
  report.head = env.HEAD_SHA ?? report.head;
  report.base = env.BASE_SHA ?? report.base;
}
if (process.argv[2]) report.phase = process.argv[2];
if (env.ACTION_STATUS === "failure" && !report.error)
  report.error = `${report.phase} failed; see Actions logs`;
writeFileSync(file, JSON.stringify(report, null, 2));
