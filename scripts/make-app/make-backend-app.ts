#!/usr/bin/env node

/**
 * backend テンプレートを apps 配下へ展開するスクリプトです。
 * 既存アプリのポート使用状況を見て、未使用ポートを自動で割り当てます。
 *
 * 想定実行場所: リポジトリルート
 * 使い方:
 *   - pnpm make:backend
 *   - pnpm make:backend my-backend
 *   - pnpm make:backend --no-install
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
const templateDir = resolve(rootDir, "templates/backend-template");

function updatePackageJson(
  targetDir: string,
  appName: string,
  port: number,
): void {
  const packageJsonPath = join(targetDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  packageJson.name = `@repo/${appName}`;
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
    throw new Error(
      "package.json の dev script に --port 指定が見つかりません",
    );
  }

  packageJson.scripts.dev = updatedDevScript;

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function updateWranglerConfig(
  targetDir: string,
  appName: string,
  port: number,
): void {
  const configPath = join(targetDir, "wrangler.jsonc");
  const configText = readFileSync(configPath, "utf8");
  let didReplaceName = false;
  const renamed = configText.replace(/"name"\s*:\s*"[^"]*"/, () => {
    didReplaceName = true;
    return `"name": "${appName}"`;
  });

  if (!didReplaceName) {
    throw new Error("wrangler.jsonc に name フィールドが見つかりません");
  }

  let didReplaceSelfPort = false;
  const updated = renamed.replace(/"SELF"\s*:\s*"[^"]*:\d{2,5}"/, () => {
    didReplaceSelfPort = true;
    return `"SELF": "localhost:${port}"`;
  });

  if (!didReplaceSelfPort) {
    throw new Error("wrangler.jsonc に SELF のポート設定が見つかりません");
  }

  writeFileSync(configPath, updated);
}

async function main(): Promise<void> {
  const usage = "pnpm make:backend [app-name] [--no-install]";
  const args = parseScaffoldArgs(process.argv.slice(2), usage);

  if (args.help) {
    console.log(
      "Usage: tsx ./scripts/make-backend-app.ts [app-name] [--no-install]",
    );
    return;
  }

  if (!existsSync(templateDir)) {
    throw new Error(`テンプレートが見つかりません: ${templateDir}`);
  }

  mkdirSync(appsDir, { recursive: true });
  const usedPorts = collectUsedPorts(appsDir);
  const port = findAvailablePort(usedPorts, 6173);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const requestedName =
      args.appName ??
      (await askQuestion(
        rl,
        "新しい backend アプリ名を入力してください",
        "my-backend",
      ));
    const appName = normalizeAppName(requestedName);
    const targetDir = resolve(appsDir, appName);

    if (existsSync(targetDir)) {
      throw new Error(`apps/${appName} は既に存在します`);
    }

    cpSync(templateDir, targetDir, { recursive: true, force: false });

    updatePackageJson(targetDir, appName, port);
    updateWranglerConfig(targetDir, appName, port);

    await maybeInstallDependencies(targetDir, args, rl);

    console.log(`\n✅ backend app created: apps/${appName} (port: ${port})`);
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ ${message}`);
  process.exit(1);
});
