#!/usr/bin/env node

/**
 * frontend テンプレートを apps 配下へ展開するスクリプトです。
 * 既存アプリのポート使用状況を見て、未使用ポートを自動で割り当てます。
 *
 * 想定実行場所: リポジトリルート
 * 使い方:
 *   - pnpm make:frontend
 *   - pnpm make:frontend my-frontend
 *   - pnpm make:frontend my-frontend --deps backend-a,backend-b
 *   - pnpm make:frontend --no-install
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { collectUsedPorts, findAvailablePort } from "./port-utils.js";
import {
  askQuestion,
  maybeInstallDependencies,
  normalizeAppName,
  parseScaffoldArgs,
} from "./scaffold-shared.js";

const rootDir = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const appsDir = resolve(rootDir, "apps");
const templateDir = resolve(rootDir, "templates/frontend-template");

function updatePackageJson(
  targetDir: string,
  appName: string,
  extraDeps: string[],
  port: number,
): void {
  const packageJsonPath = join(targetDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  packageJson.name = appName;
  packageJson.scripts ??= {};

  const currentDevScript = packageJson.scripts.dev;

  if (typeof currentDevScript !== "string") {
    throw new Error("package.json に dev script が見つかりません");
  }

  let didReplaceDevPort = false;
  const updatedDevScript = currentDevScript.replace(
    /--port(?:=|\s+)\d{2,5}/,
    (match) => {
      didReplaceDevPort = true;
      return match.includes("=") ? `--port=${port}` : `--port ${port}`;
    },
  );

  if (!didReplaceDevPort) {
    throw new Error("package.json の dev script に --port 指定が見つかりません");
  }

  packageJson.scripts.dev = updatedDevScript;
  packageJson.devDependencies ??= {};

  for (const dependency of extraDeps) {
    const trimmed = dependency.trim();
    if (!trimmed) {
      continue;
    }
    packageJson.devDependencies[trimmed] = "workspace:*";
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function updateWranglerConfig(targetDir: string, appName: string): void {
  const configPath = join(targetDir, "wrangler.jsonc");
  const configText = readFileSync(configPath, "utf8");
  let didReplaceName = false;
  const updated = configText.replace(
    /"name"\s*:\s*"[^"]*"/,
    () => {
      didReplaceName = true;
      return `"name": "${appName}"`;
    },
  );

  if (!didReplaceName) {
    throw new Error("wrangler.jsonc に name フィールドが見つかりません");
  }

  writeFileSync(configPath, updated);
}

async function main(): Promise<void> {
  const usage = "pnpm make:frontend [app-name] [--deps backend-a,backend-b] [--no-install]";
  const args = parseScaffoldArgs(process.argv.slice(2), usage);

  if (args.help) {
    console.log(
      "Usage: tsx ./scripts/make-frontend-app.ts [app-name] [--deps backend-a,backend-b] [--no-install]",
    );
    return;
  }

  if (!existsSync(templateDir)) {
    throw new Error(`テンプレートが見つかりません: ${templateDir}`);
  }

  mkdirSync(appsDir, { recursive: true });
  const usedPorts = collectUsedPorts(appsDir);
  const port = findAvailablePort(usedPorts, 5173);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const requestedName =
      args.appName ??
      (await askQuestion(
        rl,
        "新しい frontend アプリ名を入力してください",
        "my-frontend",
      ));
    const appName = normalizeAppName(requestedName);
    const targetDir = resolve(appsDir, appName);

    if (existsSync(targetDir)) {
      throw new Error(`apps/${appName} は既に存在します`);
    }

    cpSync(templateDir, targetDir, { recursive: true, force: false });

    const depInput =
      args.deps ??
      (await askQuestion(
        rl,
        "利用する backend をカンマ区切りで入力してください（後で記入する場合は，そのままエンターを入力してください）",
        "",
      ));
    const deps = depInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    updatePackageJson(targetDir, appName, deps, port);
    updateWranglerConfig(targetDir, appName);

    await maybeInstallDependencies(targetDir, args, rl);

    console.log(`\n✅ frontend app created: apps/${appName} (port: ${port})`);
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ ${message}`);
  process.exit(1);
});
