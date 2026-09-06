import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "jsonc-parser";
import {
  readDeployment,
  type Deployment,
  type Variables,
} from "../config-file/deployment.yaml.js";
import { readGlobalRuntimeEnvs } from "../config-file/globalRuntimeEnvs.yaml.js";
import { workspacePackages, workspaceRoot } from "../workspace.js";
import { workerName, type Context } from "./context.js";
export type Settings = {
  deployment: Deployment;
  overrides: Variables;
  workers: Map<string, string>;
};
export function readSettings(context: Context): Settings {
  const deployment = readDeployment(process.cwd());
  const profile = context.channel === "release" ? "release" : "staging";
  const root = workspaceRoot();
  const workers = new Map<string, string>();
  const packages = workspacePackages(root);
  for (const target of context.targets) {
    if (
      !packages.some(
        (p) => p.package === target.package && p.path === target.path,
      )
    )
      throw new Error(`Invalid target: ${target.package}`);
  }
  for (const pkg of packages) {
    const file = join(root, pkg.path, "wrangler.jsonc");
    if (existsSync(file)) {
      const config = parse(readFileSync(file, "utf8"));
      if (typeof config.name !== "string" || !config.name)
        throw new Error(`Missing Worker name: ${pkg.package}`);
      workers.set(pkg.package, config.name);
    }
  }
  return {
    deployment,
    overrides: {
      ...readGlobalRuntimeEnvs()[profile],
      ...deployment.envs[profile],
    },
    workers,
  };
}
export function previewVariables(
  values: Variables,
  settings: Settings,
  context: Context,
): Variables {
  const result = { ...values };
  if (context.channel !== "preview") return result;
  for (const [key, pkg] of Object.entries(
    settings.deployment.connections.urls,
  )) {
    if (!context.targets.some((t) => t.package === pkg)) continue;
    const name = settings.workers.get(pkg);
    if (!name) throw new Error(`No Worker for URL connection: ${pkg}`);
    if (!values[key]) throw new Error(`Missing base URL: ${key}`);
    const url = new URL(values[key]);
    url.protocol = "https:";
    url.hostname = `${workerName(name, context)}.nushinkan2.workers.dev`;
    url.port = "";
    result[key] = url.toString();
  }
  return result;
}
