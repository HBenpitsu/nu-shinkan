import { existsSync, readFileSync } from "node:fs";
import { writeOutputs } from "./shared.js";

export function extractPreviewUrls(logPath: string): string {
  if (!existsSync(logPath)) {
    return "";
  }

  const text = readFileSync(logPath, "utf8");
  const urls = new Set<string>();
  const matches = text.match(/https:\/\/[^ )]+/g) ?? [];

  for (const raw of matches) {
    const url = raw.replace(/[",]$/, "");
    if (/workers\.dev|pages\.dev/.test(url)) {
      urls.add(url);
    }
  }

  return [...urls].sort().join(",");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const logPath = process.argv[2] ?? process.env.DEPLOY_LOG_PATH;
  if (!logPath) {
    throw new Error("Missing deploy log path");
  }

  writeOutputs({ preview_urls_csv: extractPreviewUrls(logPath) });
}
