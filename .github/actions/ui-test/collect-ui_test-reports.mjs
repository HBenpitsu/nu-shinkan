/**
 * リポジトリ内のplaywright testのレポートを収集し，ui_test-reportsディレクトリに保存する
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync } from "node:fs";
import { join, basename } from "node:path";
import { env } from "node:process";

const collectDir = "ui_test-reports";

function main() {
  // ui_test-reportsディレクトリを作成する
  if (!existsSync(collectDir)) {
    mkdirSync(collectDir);
  }
  const listing = execFileSync(
    "pnpm",
    ["exec", "turbo", "ls", "--output=json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  const packages = getPackages(listing);
  collectReports(packages, (src, dist) => {
    cpSync(src, dist, { recursive: true });
  });
}

// ENTRY: テスト環境でなければmainを実行する
if (env.VITEST !== "true") {
  main();
}

// Turboが列挙した全workspaceパッケージのパスを取得する
/** @param {string} src */
export function getPackages(src) {
  const { packages } = JSON.parse(src);
  return packages.items.map((pkg) => pkg.path);
}

// パッケージごとにplaywright-reportディレクトリの存在を確認し，存在すればui_test-reportsディレクトリにコピーする
/**
 * @param {string[]} packages
 * @param {(src: string, dist: string) => void} callback
 */
export function collectReports(packages, callback) {
  for (const pkgPath of packages) {
    const srcDir = join(process.cwd(), pkgPath, "playwright-report");
    if (existsSync(srcDir)) {
      const distPath = join(collectDir, basename(pkgPath));
      callback(srcDir, distPath);
    }
  }
}
