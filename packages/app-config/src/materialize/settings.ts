import {
  readDeployment,
  type Deployment,
  type Variables,
} from "../config-file/deployment.yaml.js";
import { readGlobalRuntimeEnvs } from "../config-file/globalRuntimeEnvs.yaml.js";
import { workerName, type Context } from "./context.js";
export type Settings = {
  deployment: Deployment;
  overrides: Variables;
  workers: Map<string, string>;
};
export function readSettings(context: Context): Settings {
  const deployment = readDeployment(process.cwd());
  const profile = context.channel === "release" ? "release" : "staging";
  const raw: unknown = JSON.parse(process.env.WORKER_NAMES ?? "{}");
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    Object.values(raw).some((name) => typeof name !== "string" || !name)
  )
    throw new Error(
      "Invalid WORKER_NAMES; expected package-to-Worker-name JSON object",
    );
  const workers = new Map(Object.entries(raw) as [string, string][]);
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
