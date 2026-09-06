import { isAbsolute, join } from "node:path";
import {
  wranglerJsonc,
  type WranglerConfig,
} from "../config-file/wrangler.jsonc.js";
import { workerName, type Context } from "./context.js";
import { previewVariables, type Settings } from "./settings.js";
export function materializeWrangler(
  original: WranglerConfig,
  settings: Settings,
  context: Context,
): WranglerConfig {
  const { env, ...base } = original;
  const profile = context.channel === "release" ? "release" : "staging";
  const selected = env?.[profile] ?? {};
  const config = {
    ...base,
    ...selected,
    name: workerName(original.name, context),
    vars: previewVariables(
      { ...base.vars, ...selected.vars, ...settings.overrides },
      settings,
      context,
    ),
  } as WranglerConfig;
  config.services = (config.services ?? []).map((binding) => {
    const pkg = settings.deployment.connections.bindings[binding.binding];
    const preview =
      context.channel === "preview" &&
      context.targets.some((t) => t.package === pkg);
    const bare = preview ? settings.workers.get(pkg!) : binding.service;
    if (!bare) throw new Error(`No Worker for binding: ${pkg}`);
    return {
      ...binding,
      service: workerName(
        bare,
        preview ? context : { ...context, channel: profile },
      ),
    };
  });
  for (const binding of Object.keys(settings.deployment.connections.bindings)) {
    if (!config.services.some((s) => s.binding === binding))
      throw new Error(`Missing native binding: ${binding}`);
  }
  if (context.channel === "preview") {
    delete config.routes;
    delete config.route;
    config.workers_dev = true;
  }
  const rebase = (value: string) =>
    isAbsolute(value) ? value : join("..", value);
  for (const key of ["main", "$schema", "base_dir", "tsconfig"])
    if (typeof config[key] === "string") config[key] = rebase(config[key]);
  if (
    config.assets &&
    typeof config.assets === "object" &&
    "directory" in config.assets &&
    typeof config.assets.directory === "string"
  )
    config.assets = {
      ...config.assets,
      directory: rebase(config.assets.directory),
    };
  return config;
}
export function generateWranglerJsonc(
  settings: Settings,
  context: Context,
): void {
  if (wranglerJsonc.exists())
    wranglerJsonc.generate(
      materializeWrangler(wranglerJsonc.read(), settings, context),
    );
}
