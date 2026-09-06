import { readFileSync } from "node:fs";
import { parseCommand } from "./parse.mjs";
import { github, prNumber } from "../../scripts/github.mjs";
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const picks = parseCommand(event.comment.body);
if (event.issue.pull_request && picks !== undefined) {
  const pr = prNumber(event.issue.number);
  try {
    const permission = await github(
      `collaborators/${encodeURIComponent(event.comment.user.login)}/permission`,
    );
    if (!["admin", "maintain", "write"].includes(permission.permission))
      throw Error("Preview requires repository write permission");
    if (!picks.length) throw Error("Usage: /preview <package-name> ...");
    const pull = await github(`pulls/${pr}`);
    if (
      pull.base.ref !== "main" ||
      pull.head.repo?.full_name !== process.env.GITHUB_REPOSITORY
    )
      throw Error("Preview requires a same-repository PR targeting main");
    await github("actions/workflows/on-pr.yml/dispatches", "POST", {
      ref: process.env.DEFAULT_BRANCH,
      inputs: {
        pr_number: String(pr),
        head_sha: pull.head.sha,
        base_sha: pull.base.sha,
        picks: JSON.stringify(picks),
      },
    });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
    try {
      await github(`issues/${pr}/comments`, "POST", {
        body: `Preview request failed: ${error.message}`,
      });
    } catch (notificationError) {
      console.error(notificationError);
    }
  }
}
