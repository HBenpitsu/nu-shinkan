import { runtimeConfig } from "./config-file/runtime.yaml.js";
import { dotenv } from "./config-file/dotenv.js";
import { wranglerJsonc } from "./config-file/wrangler.jsonc.js";
const argv = process.argv.map((arg) => arg.toLowerCase());
const dryRun = ["--check", "--dry-run", "--dry", "--simulate"]
  .map((arg) => argv.includes(arg))
  .some(Boolean);
const silent = ["--silent", "--quiet"]
  .map((arg) => argv.includes(arg))
  .some(Boolean);
function main() {
  if (!runtimeConfig.exists()) return;
  const runtimeConfigData = runtimeConfig.read();
  const msg = [
    ...patchDotenv(runtimeConfigData),
    ...patchWranglerJsonc(runtimeConfigData),
  ];
  if (!silent) console.log(JSON.stringify(msg, null, 2));
}
function patchDotenv(overrides) {
  let msg = [];
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
function patchWranglerJsonc(overrides) {
  let msg = [];
  if (!wranglerJsonc.exists()) return msg;
  const overrideData = {
    ...overrides.globals.local,
    ...overrides.apps.local,
  };
  if (!silent) {
    const originalData = wranglerJsonc.read().vars;
    if (typeof originalData === "string")
      throw new Error(
        "Expected originalData to be an object, but got a string.",
      );
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
function differentKeys(originalData, overrideData) {
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
try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
