# CLIエントリーポイントと内部ロジックの分離

[CLIの作成方針](../make-cli.md)に基づき、CLIの入出力と内部ロジックを別ファイルに置く作例。テスト対象は[テスト方針](../testing-policy.md)に従って判断する。

以下は、設定の更新・削除規則を例示する独立した作例であり、リポジトリ内の実装ファイルやCLI契約を示すものではない。

## 内部ロジック: `settings.ts`

入力の取得やCLI呼び出しを含めず、取得済みの値を受け取る。ここではnullによる削除と未指定値の保持を扱う。

```ts
export function applySettings(
  current: Record<string, string>,
  updates: Record<string, string | null>,
): Record<string, string> {
  const result = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
}
```

## CLI: `settings-cli.ts`

この作例では文字列オプションを取得して内部ロジックへ渡し、結果とエラーを表示する。

```ts
import { parseArgs } from "node:util";
import { applySettings } from "./settings.js";

function main() {
  const { values } = parseArgs({
    options: {
      endpoint: { type: "string" },
      "remove-legacy": { type: "boolean" },
    },
  });
  const updates: Record<string, string | null> = {};
  if (values.endpoint !== undefined) updates.ENDPOINT = values.endpoint;
  if (values["remove-legacy"]) updates.LEGACY = null;
  const result = applySettings({ LEGACY: "old" }, updates);
  console.log(JSON.stringify(result));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
```

非同期処理の場合は、同じエラー処理の範囲で `await main()` するなどして失敗を扱う。単純な入出力や転送だけのCLIは、テストのためにさらに分解しない。

## 内部ロジックのテスト: `settings.test.ts`

テストは `settings.ts` だけをimportし、独自の更新規則を検証する。CLIの引数解析・出力・終了コードは検証しない。

```ts
import { expect, test } from "vitest";
import { applySettings } from "./settings.js";

test("指定値を更新し、nullの値を削除し、未指定値と元の設定を保持する", () => {
  const current = { KEEP: "same", UPDATE: "old", REMOVE: "old" };

  expect(applySettings(current, { UPDATE: "new", REMOVE: null })).toEqual({
    KEEP: "same",
    UPDATE: "new",
  });
  expect(current).toEqual({ KEEP: "same", UPDATE: "old", REMOVE: "old" });
});
```
