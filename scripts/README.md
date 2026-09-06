# リポジトリ全体の処理

`packages/app-config` は単一パッケージの設定読み取り・変換・生成を担当する。workspace探索、他パッケージの設定収集、一括更新はこのディレクトリで行う。scriptsからapp-configを利用するときは公開APIを使う。

- `workspace/list.ts [--root <directory>]`: workspaceの `{ package, path }[]` をJSONで標準出力へ返す。
- `connection-graph/build.ts` / `select.ts`: [connection graphの構築とreview対象選定](connection-graph/README.md)。
- `sync-env/sync.ts [--root <directory>] [--dry-run]`: `pnpm sync` の実体。`turbo run sync:local` を実行する。タスクを登録したパッケージだけが共有local設定の配布対象となる。全件成功後のみ共有local設定のnullを消費する。`--check` はdry-runの別名。各パッケージの `sync:local` はapp-configの `sync-local` CLIを呼び、自分のネイティブ設定だけを更新する。単独実行では共有設定のnullを消費しない。Turboの同期タスクはキャッシュを無効にし、パッケージ間の実行順序は設けない。
- `workspace/resolve-workers.ts [--root <directory>]`: 標準入力の対象一覧JSONをworkspaceと照合し、対象Workerの `{ "package-name": "bare-worker-name" }` をJSONで標準出力へ返す。Worker設定を持たない対象は含めない。

計画時に `workspace/resolve-workers.ts` で候補のWorker基底名を解決し、`targets: { package, path, workerName? }[]` に付与する。テスト対象の `changes` はパッケージ名の配列とする。準備フェーズでは `TARGETS` として受け取り、Worker名を再収集しない。preview対象外への接続は既存のprofile設定を維持する。

`TARGETS` はTurboのbuildの `env` に宣言し、Worker名も含めてタスクへ渡す。buildの既存の `cache: false` は維持する。

各CLIのエラーは標準エラー出力と終了コード1で通知する。`.github/` 側はリポジトリ用CLIを呼び出し、JSONで連携する。
