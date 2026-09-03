import { relative, sep } from "node:path";
import { rootDir } from "./paths.js";
import type { CliOptions, DeployEnv } from "./types.js";

function isDeployEnv(value: string): value is DeployEnv {
  return value === "release" || value === "staging" || value === "preview";
}

function inferAppNameFromPath(dirPath: string | undefined): string | undefined {
  if (!dirPath) {
    return undefined;
  }

  const rel = relative(rootDir, dirPath);
  if (!rel || rel.startsWith("..") || rel.startsWith(`..${sep}`)) {
    return undefined;
  }

  const parts = rel.split(sep);
  if (parts.length < 2 || parts[0] !== "apps") {
    return undefined;
  }

  return parts[1];
}

export function parseArgs(argv: string[]): CliOptions {
  const opts: Partial<CliOptions> = {};

  const deployEnvFromEnv = process.env.DEPLOY_ENV?.trim();
  if (deployEnvFromEnv) {
    if (!isDeployEnv(deployEnvFromEnv)) {
      throw new Error("DEPLOY_ENV must be one of: release, staging, preview");
    }
    opts.env = deployEnvFromEnv;
  }

  const inferredApp =
    inferAppNameFromPath(process.env.INIT_CWD) ??
    inferAppNameFromPath(process.cwd());
  if (inferredApp) {
    opts.apps = new Set([inferredApp]);
  }

  const prNumberFromEnv = process.env.PR_NUMBER?.trim();
  if (prNumberFromEnv) {
    opts.prNumber = prNumberFromEnv;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--env") {
      const value = argv[i + 1];
      if (!value || !isDeployEnv(value)) {
        throw new Error("--env must be one of: release, staging, preview");
      }
      opts.env = value;
      i += 1;
      continue;
    }

    if (token === "--app") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--app requires a value");
      }
      opts.apps ??= new Set<string>();
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => opts.apps?.add(item));
      i += 1;
      continue;
    }

    if (token === "--pr-number") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--pr-number requires a value");
      }
      opts.prNumber = value;
      i += 1;
    }
  }

  if (!opts.env) {
    throw new Error("Missing deploy env. Pass --env or set DEPLOY_ENV");
  }

  return opts as CliOptions;
}
