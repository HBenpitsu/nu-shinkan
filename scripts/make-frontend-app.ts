#!/usr/bin/env node

import { spawnSync } from "node:child_process";
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

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appsDir = resolve(rootDir, "apps");
const templateDir = resolve(rootDir, "templates/frontend-template");

function normalizeAppName(value: string): string {
  const normalized = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error("アプリ名が空です");
  }

  return normalized;
}

function parseArgs(): Record<string, string> {
  const result: Record<string, string> = {};
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === undefined) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      result.help = "1";
      continue;
    }

    if (arg.startsWith("--")) {
      const [key = "", rawValue] = arg.split("=", 2);

      if (!key) {
        continue;
      }

      const nextValue = rawValue ?? args[index + 1];

      if (nextValue && !nextValue.startsWith("--")) {
        result[key.slice(2)] = nextValue;
        index += 1;
      } else {
        result[key.slice(2)] = rawValue ?? "";
      }
      continue;
    }

    if (!result.name) {
      result.name = arg;
    }
  }

  return result;
}

function askQuestion(
  rl: ReturnType<typeof createInterface>,
  message: string,
  defaultValue = "",
): Promise<string> {
  return new Promise((resolve) => {
    const prompt = defaultValue
      ? `${message} [${defaultValue}]: `
      : `${message}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function updatePackageJson(
  targetDir: string,
  appName: string,
  extraDeps: string[],
): void {
  const packageJsonPath = join(targetDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  packageJson.name = appName;
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
  const updated = configText.replace(
    /"name"\s*:\s*"[^"]*"/,
    `"name": "${appName}"`,
  );

  if (updated === configText) {
    throw new Error("wrangler.jsonc に name フィールドが見つかりません");
  }

  writeFileSync(configPath, updated);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    console.log(
      "Usage: tsx ./scripts/make-frontend-app.ts [--name <app-name>] [--deps backend-a,backend-b] [--no-install]",
    );
    return;
  }

  if (!existsSync(templateDir)) {
    throw new Error(`テンプレートが見つかりません: ${templateDir}`);
  }

  mkdirSync(appsDir, { recursive: true });

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const requestedName =
      args.name ??
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

    updatePackageJson(targetDir, appName, deps);
    updateWranglerConfig(targetDir, appName);

    const installChoice =
      args.install === "false" || args.install === "no"
        ? "n"
        : args.install === "true" || args.install === "yes"
          ? "y"
          : (
              await askQuestion(rl, "依存関係をインストールしますか？", "y")
            ).toLowerCase();

    if (installChoice === "y" || installChoice === "yes") {
      const installResult = spawnSync("pnpm", ["install"], {
        cwd: targetDir,
        stdio: "inherit",
        shell: false,
      });

      if (installResult.status !== 0) {
        throw new Error(
          `pnpm install に失敗しました (exit=${installResult.status})`,
        );
      }
    }

    console.log(`\n✅ frontend app created: apps/${appName}`);
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ ${message}`);
  process.exit(1);
});
