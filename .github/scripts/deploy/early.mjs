// Runs with Node's standard library before dependency installation.
import {
  appendFileSync,
  globSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  parseCommand,
  prNumber,
  github,
  currentPR,
  operation,
} from "./request.ts";
const env = process.env;
const output = (name, value) =>
  appendFileSync(
    env.GITHUB_OUTPUT,
    `${name}=${typeof value === "string" ? value : JSON.stringify(value)}\n`,
  );
const report = {
  repository: env.GITHUB_REPOSITORY,
  runId: env.GITHUB_RUN_ID,
  pr: Number(env.PR_NUMBER),
  head: env.HEAD_SHA ?? "",
  channel: "preview",
  phase: "input",
  changes: [],
  targets: [],
  results: [],
};
function save() {
  mkdirSync(".artifacts/deploy", { recursive: true });
  writeFileSync(
    ".artifacts/deploy/result.json",
    JSON.stringify(report, null, 2),
  );
}
try {
  if (env.EARLY_MODE === "comment") {
    const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
    const picks = parseCommand(event.comment.body);
    if (!event.issue.pull_request || picks === undefined) process.exit(0);
    report.pr = prNumber(event.issue.number);
    const permission = await github(
      `collaborators/${encodeURIComponent(event.comment.user.login)}/permission`,
    );
    if (!["admin", "maintain", "write"].includes(permission.permission))
      throw new Error("Preview requires repository write permission");
    const pr = await github(`pulls/${report.pr}`);
    report.head = pr.head.sha;
    if (
      pr.base.ref !== "main" ||
      pr.head.repo?.full_name !== env.GITHUB_REPOSITORY
    )
      throw new Error("Preview requires a same-repository PR targeting main");
    if (!picks.length) throw new Error("Usage: /preview <package-name> ...");
    await github("actions/workflows/on-pr.yml/dispatches", "POST", {
      ref: env.DEFAULT_BRANCH,
      inputs: {
        pr_number: String(report.pr),
        head_sha: pr.head.sha,
        base_sha: pr.base.sha,
        picks: JSON.stringify(picks),
      },
    });
  } else {
    report.pr = prNumber(env.PR_NUMBER);
    const state = await currentPR(report.pr);
    const selected = operation(env.REQUEST_KIND ?? "deploy", state);
    output("operation", selected);
    if (selected === "skip") report.phase = "skipped";
    if (selected === "deploy" && env.SELECTION_SOURCE === "manual-pick") {
      const picks = JSON.parse(env.PICKS ?? "[]");
      if (
        !Array.isArray(picks) ||
        !picks.length ||
        picks.some((p) => typeof p !== "string")
      )
        throw new Error("Usage: /preview <package-name> ...");
      // Read only the workspace package list; no full install or Turbo cache is needed.
      const yaml = readFileSync("pnpm-workspace.yaml", "utf8");
      const section = yaml.match(/^packages:\s*\n((?:[ \t]+.*\n)*)/m)?.[1];
      if (!section)
        throw new Error("Cannot read workspace packages for early validation");
      const patterns = section
        .split("\n")
        .filter((l) => l.trim())
        .map((line) => {
          const match = line.match(/^\s+-\s+["']?([^"'\s]+)["']?\s*$/);
          if (!match) throw new Error("Unsupported workspace package pattern");
          return match[1];
        });
      const files = globSync(
        patterns
          .filter((p) => !p.startsWith("!"))
          .map((p) => `${p}/package.json`),
        {
          exclude: patterns
            .filter((p) => p.startsWith("!"))
            .map((p) => `${p.slice(1)}/package.json`),
        },
      );
      const names = files.map(
        (file) => JSON.parse(readFileSync(file, "utf8")).name,
      );
      const valid = [...new Set(picks.filter((p) => names.includes(p)))];
      const missing = picks.filter((p) => !names.includes(p));
      if (missing.length)
        throw new Error(
          `Unknown packages: ${missing.join(", ")}\nUsage: /preview <package-name> ...${valid.length ? `\nTry: /preview ${valid.join(" ")}` : ""}`,
        );
    }
    save();
  }
} catch (error) {
  report.error = String(error);
  save();
  console.error(error);
  try {
    await github(`issues/${prNumber(report.pr)}/comments`, "POST", {
      body: `Preview input failed at SHA ${report.head}\n\n${report.error}`,
    });
  } catch (notificationError) {
    report.notificationError = String(notificationError);
    save();
    console.error(notificationError);
  }
  process.exitCode = 1;
}
