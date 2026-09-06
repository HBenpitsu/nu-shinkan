import { github, prNumber } from "./request.ts";
import type { Report } from "./results.js";
const clean = (value: unknown) =>
  String(value ?? "")
    .replace(/[|<>`\r\n]/g, " ")
    .slice(0, 1500);
export function formatReport(report: Report): string {
  return [
    "<!-- preview-deploy -->",
    `Preview PR #${report.pr} · SHA \`${clean(report.head)}\``,
    `Phase: ${clean(report.phase)}`,
    report.error ? `Error: ${clean(report.error)}` : "",
    "",
    "| Package | Result | Worker | URL | Error |",
    "| --- | --- | --- | --- | --- |",
    ...report.results.map(
      (r) =>
        `| ${clean(r.package)} | ${r.status} | ${clean(r.worker)} | ${clean(r.url)} | ${clean(r.error)} |`,
    ),
    report.cleanup ? `\nCleanup: ${clean(JSON.stringify(report.cleanup))}` : "",
    `\n[Actions run](https://github.com/${report.repository}/actions/runs/${report.runId})`,
  ]
    .join("\n")
    .slice(0, 60000);
}
export async function notify(report: Report): Promise<void> {
  prNumber(report.pr);
  await github(`issues/${report.pr}/comments`, "POST", {
    body: formatReport(report),
  });
}
