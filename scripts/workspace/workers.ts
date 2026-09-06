import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, type ParseError } from "jsonc-parser";
import { listWorkspacePackages, findWorkspaceRoot } from "./workspace.js";

// Main Logic

export function collectWorkerNames(
  targets: unknown,
  root = findWorkspaceRoot(),
): Record<string, string> {
  const packages = listWorkspacePackages(root);
  if (!Array.isArray(targets)) throw new Error("Expected target array");
  const workers: Record<string, string> = Object.create(null);
  // 入力の名前とパスをworkspace一覧に照合してから設定を読む。
  // 対象外Workerの情報は不要なので収集しない。
  for (const target of targets) {
    const pkg = packages.find(
      (p) => p.package === target?.package && p.path === target?.path,
    );
    if (!pkg) throw new Error(`Invalid target: ${JSON.stringify(target)}`);
    const file = resolve(root, pkg.path, "wrangler.jsonc");
    // 共有ライブラリなど、Workerではない対象も許容する。
    if (!existsSync(file)) continue;
    const errors: ParseError[] = [];
    const config = parse(readFileSync(file, "utf8"), errors);
    if (errors.length || typeof config?.name !== "string" || !config.name)
      throw new Error(`Invalid Worker config: ${pkg.package}`);
    workers[pkg.package] = config.name;
  }
  return workers;
}
