# リポジトリ全体の処理

`packages/app-config` は単一パッケージの設定読み取り・変換・生成を担当する。workspace探索、他パッケージの設定収集、一括更新はこのディレクトリで行う。scriptsからapp-configを利用するときは公開APIを使う。

- `workspace/list.ts [--root <directory>]`: workspaceの `{ package, path }[]` をJSONで標準出力へ返す。
- `connection-graph/build.ts` / `select.ts`: [connection graphの構築とreview対象選定](connection-graph/README.md)。
- `sync-local/cli.ts [--root <directory>] [--dry-run]`: 共有local設定を全workspaceに反映する。`pnpm sync` の実体。単一パッケージへの反映はapp-configの `syncPackageLocal` を使用し、共有設定のnullは全件成功後にのみ消費する。失敗時はnullを保持して再実行可能にする。`--check` は従来どおりdry-runの別名。
- `deploy-context/build.ts [--root <directory>]`: 標準入力の対象一覧JSONをworkspaceと照合し、対象Workerの `{ "package-name": "bare-worker-name" }` をJSONで標準出力へ返す。Worker設定を持たない対象は含めない。

deploy準備では `deploy-context/build.ts` の出力を `WORKER_NAMES` 環境変数として各パッケージのbuildへ渡す。`DEPLOY_CHANNEL`・`PR_NUMBER`・`TARGETS` と合わせてmaterializeが利用する。preview対象外への接続は既存のprofile設定を維持し、対象内への接続には渡されたWorker名を使う。必要なWorker名がなければ生成時にエラーになる。

`WORKER_NAMES` はTurboのbuildの `env` に宣言し、値をタスクへ渡すとともにキャッシュキーの入力とする。buildの既存の `cache: false` は維持する。app-configが読み取らなくなった他パッケージのdeployment/Wranglerファイルはbuildの共通inputsから除外する。

各CLIのエラーは標準エラー出力と終了コード1で通知する。`.github/` 側はリポジトリ用CLIを呼び出し、JSONで連携する。
