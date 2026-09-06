import { readFileSync, writeFileSync } from "node:fs";
import YAML from "yaml";
import {
  asRecord,
  asVariables,
  asNullableVariables,
  type Variables,
} from "./parse.js";

export type GlobalRuntimeEnvs = {
  local: Record<string, string | null>;
  staging: Variables;
  release: Variables;
};

// Main Logic

/**
 * app-configが所有する共有設定ドキュメント。初回参照時に読み込み、インスタンス内に保持する。
 * 取得値は独立したスナップショット。外部の更新を読む場合は新しいインスタンスを作る。
 * 編集はメモリ上で行い、保存メソッドを呼ぶまでファイルには反映しない。
 */
export class GlobalRuntimeEnvsYaml {
  private readonly file = new URL(
    "../../globalRuntimeEnvs.yaml",
    import.meta.url,
  );
  private content?: ReturnType<typeof YAML.parseDocument>;

  private get document(): ReturnType<typeof YAML.parseDocument> {
    return (this.content ??= YAML.parseDocument(
      readFileSync(this.file, "utf8"),
    ));
  }

  get local(): GlobalRuntimeEnvs["local"] {
    return asGlobalRuntimeEnvs(this.document.toJS() ?? {}).local;
  }

  variablesFor(profile: "staging" | "release"): Variables {
    return asGlobalRuntimeEnvs(this.document.toJS() ?? {})[profile];
  }

  removeNull(): void {
    for (const [key, value] of Object.entries(this.local)) {
      if (value === null) this.document.deleteIn(["local", key]);
    }
  }

  save(): void {
    writeFileSync(this.file, this.document.toString(), "utf8");
  }
}

function asGlobalRuntimeEnvs(value: unknown): GlobalRuntimeEnvs {
  const raw = asRecord(value, "globalRuntimeEnvs");
  return {
    // localのnullは削除指示なので、文字列化せず同期処理へ渡す。
    local: asNullableVariables(raw.local, "local"),
    staging: asVariables(raw.staging, "staging"),
    release: asVariables(raw.release, "release"),
  };
}

export const testExports = {
  asGlobalRuntimeEnvs,
};
