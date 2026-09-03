import { spawnSync } from "node:child_process";
import type { Interface } from "node:readline";

export type ScaffoldArgs = Record<string, string>;

export function normalizeAppName(value: string): string {
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

export function parseScaffoldArgs(
  args: string[],
  usage: string,
): ScaffoldArgs {
  const result: ScaffoldArgs = {};

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

    if (!result.appName) {
      result.appName = arg;
      continue;
    }

    throw new Error(`不明な引数 "${arg}" Usage: ${usage}`);
  }

  return result;
}

export function askQuestion(
  rl: Interface,
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

export async function maybeInstallDependencies(
  targetDir: string,
  args: ScaffoldArgs,
  rl: Interface,
): Promise<void> {
  const installChoice =
    args.install === "false" || args.install === "no"
      ? "n"
      : args.install === "true" || args.install === "yes"
        ? "y"
        : (await askQuestion(rl, "依存関係をインストールしますか？", "y")).toLowerCase();

  if (installChoice === "y" || installChoice === "yes") {
    const installResult = spawnSync("pnpm", ["install"], {
      cwd: targetDir,
      stdio: "inherit",
      shell: false,
    });

    if (installResult.status !== 0) {
      throw new Error(`pnpm install に失敗しました (exit=${installResult.status})`);
    }
  }
}