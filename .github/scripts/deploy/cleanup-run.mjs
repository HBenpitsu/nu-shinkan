import { readFileSync, writeFileSync } from "node:fs";
import { cleanup } from "./cleanup.ts";
import { currentPR, operation } from "./request.ts";
const file = ".artifacts/deploy/result.json";
const report = JSON.parse(readFileSync(file, "utf8"));
try {
  const selected = operation(
    process.env.REQUEST_KIND ?? "deploy",
    await currentPR(report.pr),
  );
  report.phase = selected === "skip" ? "skipped" : "cleanup";
  if (selected === "cleanup") {
    report.cleanup = await cleanup(report.pr);
    if (report.cleanup.some((r) => r.status === "failure"))
      throw Error("Some preview Workers could not be deleted");
  }
} catch (error) {
  report.error = String(error);
  console.error(error);
  process.exitCode = 1;
}
writeFileSync(file, JSON.stringify(report, null, 2));
