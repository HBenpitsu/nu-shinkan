/**
 * リポジトリ内のplaywright testのレポートを収集し，e2e-reportsディレクトリに保存する
 */

// e2e-reportsディレクトリを作成する
import { existsSync, mkdirSync, cpSync, globSync, readFileSync } from "fs";
import { join, basename } from "path";
import { env } from "process";
import yaml from "yaml";

const collectDir = "e2e-reports";

function main() {
  if (!existsSync(collectDir)) {
    mkdirSync(collectDir);
  }
  const packages = getPackages(readFileSync("pnpm-workspace.yaml", "utf8"));
  collectReports(packages, (src, dist) => {
    cpSync(src, dist, { recursive: true });
  });
}

if (env.VITEST !== "true") {
  main();
}

// pnpm-workspace.yamlのpackagesフィールドを参照して，パッケージの一覧を取得する
export function getPackages(src: string): string[] {
  const pnpmWorkspace = yaml.parse(src) as {
    packages: string[] | string | object;
  };
  if (
    typeof pnpmWorkspace.packages === "object" &&
    !Array.isArray(pnpmWorkspace.packages)
  ) {
    return [];
  }
  if (typeof pnpmWorkspace.packages === "string") {
    return [pnpmWorkspace.packages];
  }
  return pnpmWorkspace.packages;
}

// パッケージごとにplaywright-reportディレクトリの存在を確認し，存在すればe2e-reportsディレクトリにコピーする
export function collectReports(
  packages: string[],
  callback: (src: string, dist: string) => void,
) {
  for (const pkg of packages) {
    for (const pkgPath of globSync(join(process.cwd(), pkg))) {
      const pkgName = basename(pkgPath);
      const srcDir = join(pkgPath, "playwright-report");
      if (existsSync(srcDir)) {
        const distPath = join(collectDir, pkgName);
        callback(srcDir, distPath);
      }
    }
  }
}
