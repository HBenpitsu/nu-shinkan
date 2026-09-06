# Connection graph

[デプロイ設計](../../docs/discussion/deploy-design.md#review-に共通の-connection-グラフ)の review 用対象選定を、独立した CLI として提供する。リポジトリルートで実行する。

```sh
pnpm exec tsx scripts/connection-graph/build.ts > connection-graph.json
pnpm exec tsx scripts/connection-graph/select.ts \
  --graph connection-graph.json \
  @repo/dummy-preview-api > targets.json
```

ファイルを保存せず、パイプでも接続できる。`--graph -` は標準入力を読む。

```sh
set -o pipefail
pnpm exec tsx scripts/connection-graph/build.ts |
  pnpm exec tsx scripts/connection-graph/select.ts --graph - @repo/dummy-preview-api
```

両 CLI とも結果の JSON を標準出力、警告・エラーを標準エラー出力へ書く。エラー時は終了コード 1。ファイルの保存先や GitHub Actions artifact へのアップロードは呼び出し側で決める。

## build.ts

`--root <directory>` で対象 workspace ルートを指定できる。省略時はカレントディレクトリから pnpm workspace ルートを探す。

全パッケージの `deployment.yaml` を既存の app-config ローダーで読み、`connections.bindings` / `urls` を接続先 → 接続元の辺に変換する。自己ループ・不明な接続先は無視し、重複する辺をまとめる。設定省略・不正な `reviewEntry` の扱いもローダーに従う。

出力の形式は次のとおり。

```json
{
  "packages": [
    { "package": "api", "path": "apps/api" },
    { "package": "web", "path": "apps/web" }
  ],
  "edges": [["api", "web"]],
  "reviewEntries": ["web"]
}
```

## select.ts

`--graph <file|->` は必須。残りの引数に起点のパッケージ名を渡す。起点が空なら空配列、不明な名前や不正なグラフ JSON はエラーになる。

起点から到達できる集合と、review 入口に到達できる集合の積を返す。循環を含め反復探索し、入口自身の長さ 0 の経路も含める。出力は `{ package, path }[]` で入力グラフのパッケージ順を維持する。

起点には呼び出し側でパッケージ依存関係による影響先まで含める。差分検出・manual-pick の受付・`scripts.deploy` による実行対象の絞り込みは呼び出し側の責務とする。

`.github/scripts/deploy/graph.ts` も両 CLI を実行して JSON を受け渡す。`graph.ts` はツール内部の実装であり、外部向けの import API ではない。
