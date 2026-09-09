# CLI 起動に依存するテスト整理のバックログ

## このバックログの使い方

CIリソース状況によってCLI起動を含むテストがタイムアウトする問題を扱う。2026-09-09時点の静的調査に基づく実行担当者への引き継ぎであり、全項目は未着手。コード・方針の実装を終えた記録ではない。タスクを受け取った担当者はリポジトリの現状との差分を確認する。

作業前に `AGENTS.md` に従いdocs・instructions・skillsを探索し、適用される文書を読む。pnpmを使い、全体検証は既存のルートスクリプトを優先する。`.agents/` を編集する際は `.agents/README.md` を読む。

## 全タスクに適用する要求

各CLIのエントリーポイントを独立した1ファイルとし、引数取得・入出力・エラー表示などを担当させる。テストからimportも起動もしない。検証が必要な業務ロジック・バリデーションのみ外へ抽出する。単純な委譲や引数転送、syncPackageLocalをテストしない。GitHub Workflowのテストは追加せず、必要ならロギングを検討する。標準ライブラリのパーサやI/O、終了コードの代替テストも不要。テストを削除するために本番仕様を変更しない。

## 実行順序

B01で継続的な方針を文書化する。続いてB02〜B05で対象を改修し、B06で診断上の不足を評価、最後にB07で統合確認する。この順序は作業依存関係を示すものであり、エージェントの並列起動を要求するものではない。B08は今回の完了条件に含めない。

## B01: テスト方針と作例の整合

- 優先度：P1。依存：なし。
- 背景：現在 `docs/snippets/script_entrypoint.md` はVITEST分岐でmainを抑制する作例であり、CLIをimportしない新方針と整合しない。
- 対象：`docs/testing-policy.md` と `.agents/instructions/testing/test-scope.md` を新設し、`docs/snippets/script_entrypoint.md` と `ts_export_for_test.md` を更新する。
- 作業：内部ロジックだけを検証する規則とWorkflowテスト追加禁止を記す。CLIと内部モジュールを別ファイルで例示する。指示冒頭に適用条件を記す。AGENTS/READMEのindexや保護ADRは変更しない。
- 完了条件：会話なしで判断できる文書、正しいリンク、CLIテストを勧めない作例が揃う。文書用テストは追加しない。

## B02: connection-graph CLIテストの廃止と入力検証の分離

- 優先度：P1。依存：B01。
- 対象：`scripts/connection-graph/cli.test.ts`、`select.ts`、`graph.ts`、`graph.test.ts`。必要に応じ同ディレクトリに入力検証モジュールを追加。
- 作業：cli.test.tsを削除。select.tsの未知パッケージ検証を外へ抽出し、取得済み入力に対して検証する。fromJSONの独自構造検証を直接テストする。既存グラフ検証と重複しない。
- 対象外：build.tsのテスト用関数化、parseArgs/JSON.parseのテスト、stdin/stdout/stderr/終了コード/`--root`オプション拒否のテスト。
- 完了条件：探索の既存仕様が維持され、未知起点を無視する探索と未知名を拒否する入力検証が混同されない。CLIをimport・起動しない。20秒指定が消える。

## B03: workspace CLI内の対象選択を分離

- 優先度：P1。依存：B01。
- 対象：`scripts/workspace/configs-cli.ts`、`configs.test.ts`、必要に応じ新規の選択・検証モジュール。
- 作業：CLIヘルパーを除去。設定一覧からの対象選択とWorker名検証を外へ抽出。空targets、未知名、不正Worker名、部分結果を返さない規則を直接テストする。Worker設定のない対象も現行仕様どおり扱う。
- 維持：一時workspaceからの設定取得、除外、重複名検出。CLI契約。
- 完了条件：pnpm/tsxを起動せず、選択規則を確認できる。単純なJSON整形・転記のテストを作らず、20秒指定が消える。

## B04: 同期の単純な制御を検証するテストの撤去

- 優先度：P1。依存：B01。
- 対象：`scripts/sync-env/sync.test.ts`。参照：`scripts/sync-env/sync.ts`、`packages/app-config/src/sync-local.ts` とconfig-file配下のテスト。
- 作業：sync.test.ts全体を削除する。モック内の実CLI呼び出し、binコピー、symlink fixture、単純なTurbo引数転送の検証を撤去する。
- 維持：dotenv.test.ts、wrangler.jsonc.test.ts、package-path.test.ts、globalRuntimeEnvs.yaml.test.tsの設定更新・削除・コメント保持・保存の検証。
- 禁止：syncPackageLocalの公開・直接テスト、同期CLIのimport、テストだけのための実行器注入、単純な条件式の抽出とテスト。
- 完了条件：既存の設定ロジックの検証が残る。全体同期の成功後だけ削除指示を消費する制御、dry-run、フィルタ、未登録タスクの全体動作の自動検証を削除したことを報告する。診断不足はB06へ渡す。

## B05: Workflowの実CLI結合テストの撤去

- 優先度：P1。依存：B01。
- 対象：`scripts/connection-graph/actions.test.ts` と `scripts/workspace/workflows.test.ts`。
- 作業：actions.test.tsのrefineヘルパーとそれを使う末尾2ケースを削除。workflows.test.tsの `attempts remaining deployments after a failure and reports their actual results` と専用fixture/importを削除する。
- 維持：既存の実CLI起動なしのフィルタ正規化・コマンド解析・PR判定・concurrency・no-opのテスト。これらへのケース追加はしない。
- 禁止：偽Turbo summaryでの代替レポートテスト、YAML/シェルの文字列検証追加、Actionのコマンド組み立てテスト、planPreviewのテスト目的の依存注入。
- 完了条件：テストからplanPreviewを含むCLI実行経路を呼ばず、20秒指定が消える。実Turboの継続実行とAction連携は自動検証対象から外れたと報告する。本番plan.mjsのCLI実行は変更不要。

## B06: 同期・Workflowの診断ログの不足を評価

- 優先度：P2。依存：B04、B05。
- 対象：`scripts/sync-env/sync.ts`、`.github/actions/filter-util/filter-util.mjs`、`.github/actions/preview-deploy/plan.mjs`、`action.yaml`、`comment.mjs`。変更対象は調査結果で最小化する。
- 作業：既存の例外出力、deploy.log、Turbo summary、status/summary_path/log_path、結果通知で、どの段階・対象・終了状態・失敗理由か判断できるか確認する。不足があるときだけ診断ログを追加する。
- 候補：対象が空である理由、計画した件数、summary欠落、同期の削除指示を保持した理由。既存情報と重複するログは追加しない。
- 制約：テスト追加や本番デプロイ実行は不要。環境変数値・秘密情報・設定内容は出力しない。stdout/GITHUB_OUTPUTの機械可読な出力を壊さない。ログのために複雑な抽象化を導入しない。
- 完了条件：具体的な診断不足と最小の変更、または既存ログで十分と判断した理由を記録する。ログは自動回帰テストと同等の保証ではないと明示する。

## B07: 全体検証と完了報告

- 優先度：P1。依存：B01〜B06。
- 対象：変更したテスト・実装・文書とルートのtestスクリプト。
- 作業：CLIファイルのimport、child_processの実実行、vi.importActualによる抜け道を確認。完全モックのdelete-preview-worker.test.tsは維持する。変更対象のテストと必要な型チェック・ビルド、`pnpm test -- --run` を実行。キャッシュ無効の `pnpm test --force -- --run` を3回実行して結果と時間を記録する。
- 完了条件：新規CLI/単純委譲/Workflowテストがなく、5対象ファイルの実起動が除去されている。削除したファイルとケース、維持した独自ロジックの検証、ログ判断、各検証結果を報告する。CI負荷由来の全失敗が解決したと測定なしに断定しない。

## B08: 外部サイト依存のUIサンプルテストの整理（別件）

- 優先度：P3。依存：なし。今回の実装・完了条件の対象外。
- 背景：`apps/dummy-preview-web/ui_test/example.spec.ts`、`apps/organization-web-app/ui_test/example.spec.ts`、`templates/frontend-template/ui_test/example.spec.ts` は `https://playwright.dev/` へアクセスする。
- 将来の作業：製品の振る舞いを検証しないサンプルの削除か、自前の画面を検証するUIテストへの置換かを用途に応じて決める。今回便乗して実装しない。
- 完了条件：実施する場合は、外部サイト依存を減らす目的・対象・維持するUIの検証を別タスクとして明確にする。

## 詳細計画

- [テスト改修計画](./cli-test-refactoring-plan.md)
- [文書更新計画](./cli-test-documentation-plan.md)
