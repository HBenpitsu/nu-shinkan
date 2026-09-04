/**
 * stdoutはGITHUB_OUTPUTに書き込まれる．
 * このスクリプトは，stdoutへの出力によって以下の値を定める
 *
 * affected_apps, apps_affected, apps_filter_args,
 * affected_scripts, scripts_affected, scripts_filter_args,
 * all_affected, affected, affected_filter_args
 *
 * ビルド時環境変数として BASE_SHA が提供される．
 */

import { env } from "process";
import { execSync as exec } from "child_process";

function main() {
  const base = env.BASE_SHA ?? "";
  const affected = extendSchema(getAffected(base));
  process.stdout.write(`affected_apps=${affected.apps.join(" ")}\n`);
  process.stdout.write(
    `apps_affected=${affected.apps.length ? "true" : "false"}\n`,
  );
  process.stdout.write(
    `apps_filter_args=${affected.apps.map((app) => `--filter="./${app}"`).join(" ")}\n`,
  );
  process.stdout.write(`affected_scripts=${affected.scripts.join(" ")}\n`);
  process.stdout.write(
    `scripts_affected=${affected.scripts.length ? "true" : "false"}\n`,
  );
  process.stdout.write(
    `scripts_filter_args=${affected.scripts.map((script) => `--filter="./${script}"`).join(" ")}\n`,
  );
  process.stdout.write(`all_affected=${affected.whole.join(" ")}\n`);
  process.stdout.write(
    `affected=${affected.whole.length ? "true" : "false"}\n`,
  );
  process.stdout.write(
    `affected_filter_args=${affected.whole.map((item) => `--filter="./${item}"`).join(" ")}\n`,
  );
}

if (env.VITEST !== "true") {
  main();
}

type turboJson = {
  tasks: {
    directory: string;
    cache: { status: "MISS" | "HIT" };
  }[];
};

function getAffected(base: string) {
  const result: { apps: string[]; whole: string[] } = { apps: [], whole: [] };

  const appsExec = exec(
    `pnpm run deploy --filter="./apps/*" --filter=[${base}] --dry=json`,
  );
  const appsStdout = appsExec.toString();
  const appsParsed = JSON.parse(appsStdout) as turboJson;

  appsParsed.tasks.forEach((task) => {
    if (task.cache.status === "MISS") {
      result.apps.push(task.directory);
    }
  });

  const wholeExec = exec(`pnpm run dev --filter=[${base}] --dry=json`);
  const wholeStdout = wholeExec.toString();
  const wholeParsed = JSON.parse(wholeStdout) as turboJson;

  wholeParsed.tasks.forEach((task) => {
    if (task.cache.status === "MISS") {
      result.whole.push(task.directory);
    }
  });

  return result;
}

function extendSchema(src: { apps: string[]; whole: string[] }) {
  return {
    ...src,
    scripts: src.whole.filter((value) => !src.apps.includes(value)),
  };
}
