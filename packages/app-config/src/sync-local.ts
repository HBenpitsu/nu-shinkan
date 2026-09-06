import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyEdits, modify } from "jsonc-parser";

export function syncPackageLocal(
  directory: string,
  local: Record<string, string | null>,
  dryRun = false,
): void {
  const envFile = join(directory, ".env.development");
  if (existsSync(envFile)) {
    let lines = readFileSync(envFile, "utf8").split("\n");
    for (const [key, value] of Object.entries(local)) {
      const name = key.startsWith("VITE_") ? key : `VITE_${key}`;
      lines = lines.filter((line) => line.split("=")[0]?.trim() !== name);
      if (value !== null) lines.push(`${name}=${JSON.stringify(value)}`);
    }
    if (!dryRun) writeFileSync(envFile, lines.join("\n"));
  }
  const wrangler = join(directory, "wrangler.jsonc");
  if (existsSync(wrangler)) {
    let content = readFileSync(wrangler, "utf8");
    for (const [key, value] of Object.entries(local))
      content = applyEdits(
        content,
        modify(content, ["vars", key], value === null ? undefined : value, {
          formattingOptions: { insertSpaces: true, tabSize: 2 },
        }),
      );
    if (!dryRun) writeFileSync(wrangler, content);
  }
}
