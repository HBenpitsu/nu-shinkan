import { splitCsv, writeOutputs } from "./shared.js";

export function buildCommentBody(): string {
  const marker = "<!-- preview-deploy-report -->";
  const deployOutcome = process.env.DEPLOY_OUTCOME ?? "failure";
  const deploySkipped = (process.env.DEPLOY_SKIPPED ?? "false") === "true";
  const changedApps = splitCsv(process.env.CHANGED_APPS_CSV);
  const previewUrls = splitCsv(process.env.PREVIEW_URLS_CSV);
  const errorSummary = (process.env.ERROR_SUMMARY ?? "").trim();

  const runUrl = process.env.RUN_URL ?? "";
  const shortSha = (process.env.COMMIT_SHA ?? "").slice(0, 7);
  const deployFailed = !deploySkipped && deployOutcome !== "success";

  const bodyLines = [marker, "## Preview Deploy"];

  if (deploySkipped) {
    bodyLines.push("- Status: skipped (no changed apps in this PR)");
  } else if (deployFailed) {
    bodyLines.push("- Status: failed");
    if (shortSha) {
      bodyLines.push(`- Commit: ${shortSha}`);
    }
    if (runUrl) {
      bodyLines.push(`- Workflow: ${runUrl}`);
    }
    if (changedApps.length > 0) {
      bodyLines.push(`- Changed apps: ${changedApps.join(", ")}`);
    }
    bodyLines.push("");
    bodyLines.push("### Error Summary");
    bodyLines.push("```text");
    bodyLines.push(
      errorSummary || "Preview deploy failed. Check workflow logs for details.",
    );
    bodyLines.push("```");
  } else {
    bodyLines.push("- Status: success");
    if (shortSha) {
      bodyLines.push(`- Commit: ${shortSha}`);
    }
    if (runUrl) {
      bodyLines.push(`- Workflow: ${runUrl}`);
    }
    if (changedApps.length > 0) {
      bodyLines.push(`- Changed apps: ${changedApps.join(", ")}`);
    }
    bodyLines.push("");
    bodyLines.push("### Preview URLs");
    if (previewUrls.length === 0) {
      bodyLines.push(
        "- URL was not detected from deploy logs. Check workflow logs.",
      );
    } else {
      for (const url of previewUrls) {
        bodyLines.push(`- ${url}`);
      }
    }
  }

  return `${bodyLines.join("\n")}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeOutputs({ comment_body: buildCommentBody() });
}
