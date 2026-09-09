# Action補助スクリプトのテスト

Action固有の入力検証・変換ロジックとそのテストは、対応する `actions/<action-name>/` に置く。検証対象の判断は[テスト方針](../docs/testing-policy.md)に従う。WorkflowのYAML、実行指示、通知・集計の代替テストは追加しない。

`.github` は `@repo/github-actions` という非公開workspaceで、Vitestが `actions/` 配下の `*.test.ts` や `*.test.mjs` を再帰的に検出する。Actionごとのpackage.jsonや検出設定は不要。テストは同じディレクトリの内部モジュールを相対importし、CLIエントリーポイントはimport・起動しない。

リポジトリ指定のNode・pnpmと依存関係を準備したうえで、ルートから実行する。

```sh
pnpm --filter @repo/github-actions test --run
```

ルートの `pnpm test -- --run` でもTurboを通じて実行される。キャッシュを使わず確認する場合は `pnpm test --force -- --run` を使う。テストと補助スクリプトは同じworkspace内にあり、Turboの既定入力に含まれる。

依存関係だけを準備する場合は、ルートで `pnpm install --frozen-lockfile --filter @repo/github-actions` を実行する。既存のVitest Actionも選択されたworkspaceの依存関係をインストールしてからテストするため、Action追加ごとのインストール設定は不要。
