/**
 * env:syncのエントリポイント
 * runtime.yamlに設定したローカル環境変数を各パッケージに同期する．
 */

import { runtimeConfig, RuntimeVariables } from "./config-file/runtime.yaml.js";
import { dotenv } from "./config-file/dotenv.js";
import { wranglerJsonc } from "./config-file/wrangler.jsonc.js";
import { isRecord, RecordEntry } from "./shared-helper.js";

/**
 * CLI Arguments
 */
const argv = process.argv.map((arg) => arg.toLowerCase());
const dryRun = ["--check", "--dry-run", "--dry", "--simulate"]
  .map((arg) => argv.includes(arg))
  .some(Boolean);
const silent = ["--silent", "--quiet"]
  .map((arg) => argv.includes(arg))
  .some(Boolean);

/**
 * Main logic
 **/
function main() {
  if (!runtimeConfig.exists()) return;
  const runtimeConfigData = runtimeConfig.read();

  const msg = [
    ...patchDotenv(runtimeConfigData),
    ...patchWranglerJsonc(runtimeConfigData),
  ];

  if (!silent) console.log(JSON.stringify(msg, null, 2));
}

function patchDotenv(overrides: RuntimeVariables): object[] {
  let msg: object[] = [];
  if (!dotenv.exists()) return msg;

  const overrideData = dotenv.prefix({
    ...overrides.globals.local,
    ...overrides.apps.local,
  });

  if (!silent) {
    const originalData = dotenv.read();
    const { overridenKeys, newKeys } = differentKeys(
      originalData,
      overrideData,
    );
    msg = [{ task: "env vars update", overridenKeys, newKeys }];
  }

  if (dryRun) return msg;
  dotenv.modify(overrideData);
  return msg;
}

function patchWranglerJsonc(overrides: RuntimeVariables): object[] {
  let msg: object[] = [];
  if (!wranglerJsonc.exists()) return msg;

  const overrideData = {
    ...overrides.globals.local,
    ...overrides.apps.local,
  };

  if (!silent) {
    const originalData = wranglerJsonc.read().vars;
    if (!isRecord(originalData)) {
      throw new Error(
        "Expected originalData to be an object, but got a non-object value.",
      );
    }
    const { overridenKeys, newKeys } = differentKeys(
      originalData,
      overrideData,
    );
    msg = [{ task: "wrangler vars update", overridenKeys, newKeys }];
  }

  if (dryRun) return msg;
  wranglerJsonc.modify({ vars: overrideData });
  return msg;
}

/**
 * Helpers
 **/
function differentKeys(
  originalData: Record<string, RecordEntry>,
  overrideData: Record<string, RecordEntry>,
) {
  const overridenKeys = Object.entries(originalData)
    .filter(
      ([key, value]) =>
        Object.keys(overrideData).includes(key) && value !== overrideData[key],
    )
    .map(([key, _]) => key);
  const newKeys = Object.keys(overrideData).filter(
    (key) => !Object.keys(originalData).includes(key),
  );
  return { overridenKeys, newKeys };
}

/**
 * Entry point
 **/
try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
