# 内部ロジックをtestExportsで公開する

`testExports` は、通常の利用者へ個別に公開しない内部ロジックをテストから参照するための作例である。[テスト方針](../testing-policy.md)で検証対象になる内部モジュールだけに使う。

CLIエントリーポイントには置かず、`main` を公開しない。単純な転送・保存・委譲関数をテストする理由として使わない。

次は、設定の更新・削除規則を担う内部関数 `patch` がある場合の公開部分を示す。関数本体は省略している。

```ts
// settings.ts: 独自の設定更新規則を実装したpatch関数の定義に続けて置く。
export const testExports = {
  patch,
};
```

```ts
// settings.test.ts: CLIではなく内部モジュールをimportする。
import { testExports } from "./settings.js";

const { patch } = testExports;
// patchを取得済みの値で呼び、更新・削除規則を検証する。
```

すでに通常のexportを持つ内部関数は直接importすればよく、`testExports` に統一する必要はない。
