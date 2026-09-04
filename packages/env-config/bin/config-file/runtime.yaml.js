import { readFileSync } from "fs";
import { join, basename } from "path";
import { cwd } from "process";
import yaml from "yaml";
function exists() {
  return true;
}
function read() {
  const fileContent = readFileSync(
    join(import.meta.dirname, "../../runtime.yaml"),
    "utf-8",
  );
  const config = yaml.parse(fileContent);
  return {
    globals: config.globals ?? {},
    apps: config.apps[basename(cwd())] ?? {},
  };
}
export const runtimeConfig = {
  exists,
  read,
};
