import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import YAML from "yaml";

import { asRecord, asVariables, type Variables } from "./parse.js";

export type { Variables } from "./parse.js";
export type Deployment = {
  envs: { staging: Variables; release: Variables };
  connections: { bindings: Variables; urls: Variables };
  reviewEntry: boolean;
};

// Main Logic

/**
 * パッケージ内の設定ドキュメント。初回参照時に読み込み、インスタンス内に保持する。
 * 取得値は独立したスナップショット。外部の更新を読む場合は新しいインスタンスを作る。
 */
export class DeploymentYaml implements Deployment {
  private readonly file: string;
  private content?: Deployment;

  constructor(packagePath: string = cwd()) {
    this.file = resolve(packagePath, "deployment.yaml");
  }

  private get data(): Deployment {
    // 設定ファイルのない共有パッケージも、接続・環境変数なしとして扱う。
    return (this.content ??= asDeployment(
      existsSync(this.file)
        ? (YAML.parse(readFileSync(this.file, "utf8")) ?? {})
        : {},
    ));
  }

  get envs(): Deployment["envs"] {
    return structuredClone(this.data.envs);
  }

  get connections(): Deployment["connections"] {
    return structuredClone(this.data.connections);
  }

  get reviewEntry(): boolean {
    return this.data.reviewEntry;
  }
}

// Helper

function asDeployment(value: unknown, warn = console.warn): Deployment {
  const raw = asRecord(value, "deployment");
  const envs = asRecord(raw.envs, "envs");
  const connections = asRecord(raw.connections, "connections");
  if (raw.reviewEntry !== undefined && typeof raw.reviewEntry !== "boolean")
    warn("Invalid reviewEntry; using false");
  return {
    envs: {
      staging: asVariables(envs.staging, "envs.staging"),
      release: asVariables(envs.release, "envs.release"),
    },
    connections: {
      bindings: asReferences(connections.bindings, "connections.bindings"),
      urls: asReferences(connections.urls, "connections.urls"),
    },
    reviewEntry: raw.reviewEntry === true,
  };
}

function asReferences(value: unknown, label: string): Variables {
  const result = asRecord(value, label);
  for (const [key, val] of Object.entries(result)) {
    if (typeof val !== "string" || !val)
      throw new Error(`${label}.${key}: expected package name`);
  }
  return result as Variables;
}

export const testExports = {
  asDeployment,
};
