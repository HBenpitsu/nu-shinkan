import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { rootDir } from "./paths.js";
import {
  formatDotenv,
  parseDotenv,
  shouldProcess,
  stripJsonComments,
} from "./utils.js";
import { resolveRuntimeVariables } from "./overrides.js";
import type { CliOptions, ConfigFile, DeployEnv } from "./types.js";

export function materializeApps(
  config: ConfigFile,
  options: CliOptions,
): string[] {
  const generated: string[] = [];

  for (const [appName, appStages] of Object.entries(config.apps)) {
    if (!shouldProcess(appName, options.apps)) {
      continue;
    }

    const appDir = resolve(rootDir, "apps", appName);
    const runtimeVars = resolveRuntimeVariables(
      config.globals,
      appStages,
      options.env,
    );

    const envPath = resolve(appDir, ".env.development");
    if (existsSync(envPath)) {
      const base = parseDotenv(readFileSync(envPath, "utf8"));
      const prefixedRuntimeVars = addVITEPrefix(runtimeVars);

      for (const [key, value] of Object.entries(prefixedRuntimeVars)) {
        base.set(key, value);
      }

      const generatedDir = resolve(appDir, ".generated");
      mkdirSync(generatedDir, { recursive: true });
      const outPath = resolve(generatedDir, `.env.${options.env}`);
      writeFileSync(outPath, formatDotenv(base), "utf8");
      generated.push(outPath);
    }

    const wranglerPath = resolve(appDir, "wrangler.jsonc");
    if (existsSync(wranglerPath)) {
      const base = JSON.parse(
        stripJsonComments(readFileSync(wranglerPath, "utf8")),
      ) as Record<string, unknown>;
      if (typeof base.main === "string" && base.main.length > 0) {
        const selectedEnv = getSelectedWranglerEnv(base.env, options.env);
        const selectedEnvVars = getSelectedWranglerVars(selectedEnv);
        const mergedVars = {
          ...((base.vars as Record<string, string> | undefined) ?? {}),
          ...selectedEnvVars,
          ...runtimeVars,
        };

        const defaultName =
          options.env === "preview" && options.prNumber
            ? `${String(base.name)}-preview-pr-${options.prNumber}`
            : `${String(base.name)}-${options.env}`;

        const output: Record<string, unknown> = {
          ...base,
          ...selectedEnv,
          name: defaultName,
          main: normalizeMainPathForGenerated(base.main),
          vars: mergedVars,
        };

        delete output.env;

        const generatedDir = resolve(appDir, ".generated");
        mkdirSync(generatedDir, { recursive: true });
        const outPath = resolve(generatedDir, `wrangler.${options.env}.jsonc`);
        writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
        generated.push(outPath);
      }
    }
  }

  return generated;
}

function addVITEPrefix(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key.startsWith("VITE_") ? key : `VITE_${key}`,
      value,
    ]),
  );
}

function getSelectedWranglerEnv(
  env: unknown,
  stage: DeployEnv,
): Record<string, unknown> {
  if (!isRecord(env)) {
    return {};
  }

  const selected = env[stage];
  return isRecord(selected) ? selected : {};
}

function getSelectedWranglerVars(
  selectedEnv: Record<string, unknown>,
): Record<string, string> {
  const vars = selectedEnv.vars;
  return isRecord(vars) ? (vars as Record<string, string>) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMainPathForGenerated(main: unknown): unknown {
  if (typeof main !== "string") {
    return main;
  }

  if (main.startsWith("./")) {
    return `.${main}`.replace(/^\.\//, "../");
  }

  if (main.startsWith("../") || main.startsWith("/")) {
    return main;
  }

  return `../${main}`;
}
