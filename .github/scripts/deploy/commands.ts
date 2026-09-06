import { execFileSync } from "node:child_process";

/** GitHubとリポジトリ処理の境界はCLIのJSON入出力に限定する。 */
export function executeDeployCommand<T = unknown>(
  command: string,
  input: unknown,
): T {
  return JSON.parse(
    execFileSync("pnpm", ["exec", "tsx", "scripts/deploy/cli.ts", command], {
      input: JSON.stringify(input),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
}
