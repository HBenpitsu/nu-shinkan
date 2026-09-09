# CLI 起動に依存するテストの改修計画

## 目的・状態

CI の負荷によって CLI 起動を含むテストがタイムアウトする問題を減らすため、実プロセスを起動するテストを廃止し、検証価値のある内部ロジックだけをテストする。これは実装担当エージェントへの引き継ぎ用の提案であり、実装済みの記録ではない。2026-09-09 時点でテスト30ファイルと関連コード・CI設定を静的調査した。実行時間の測定や失敗再現は未実施であり、原因の寄与率は未確定。

## 担当者が守る条件

- 作業開始時に `AGENTS.md` に従い、`docs/`、`.agents/instructions/`、`.agents/skills/` を再帰的に探索し、適用される文書を読む。パッケージマネージャは pnpm を使う。
- 各 CLI のエントリーポイントは独立した1ファイルとする。引数・環境変数の取得、入出力、処理呼び出し、エラー表示・終了処理を担当し、テストから import も起動もしない。全 CLI を1ファイルに統合する意味ではない。
- テストが必要な選択・変換・業務上のバリデーションはエントリーポイントの外に置く。バリデーションには取得済みの値を渡す。`parseArgs` や `JSON.parse` 自体の挙動、stdout/stderr、終了コード、stdin の読み分けはテストしない。
- 単純な処理呼び出し、引数転送、I/O のために関数を公開したり依存注入を増やしたりしない。`syncPackageLocal()` のテストは追加しない。
- GitHub Workflow に対するテストは追加しない。YAML、シェル、Action の実行指示、通知・集計を代替テストで再現する方法も採らない。品質上の不足があれば、まず既存ログを調べ、必要な診断ログを検討する。
- 本番の CLI 契約、同期・デプロイの仕様は維持する。タイムアウト延長、リトライ追加、並列度制限で問題を隠さない。

## 対象と変更内容

| 対象 | 現在の問題 | 改修 |
| --- | --- | --- |
| `scripts/connection-graph/cli.test.ts` | Node → tsx で CLI を繰り返し起動。20秒指定あり | ファイルを削除。意味のあるグラフ入力検証だけ内部テストへ移す |
| `scripts/workspace/configs.test.ts` | pnpm → tsx で一覧と対象指定を検証。20秒指定あり | CLI ヘルパーを廃止。選択・検証は非CLIモジュールへ抽出して直接検証 |
| `scripts/connection-graph/actions.test.ts` | `refine()` が Node/Turbo を実行。`planPreview()` の内部でも3つの CLI を実行 | `refine()` とそれを使う末尾2テスト、不要な import を削除。既存の純粋関数テストは維持し、Workflow 関連のケースを追加しない |
| `scripts/sync-env/sync.test.ts` | モック内の `vi.importActual` で実CLIを起動。ビルド済みbinをコピー | ファイル全体を削除。単純な引数転送の2ケースも代替しない。既存設定クラスのテストを維持 |
| `scripts/workspace/workflows.test.ts` | Bash → pnpm → Turbo → ダミーdeployを実行。20秒指定あり | `attempts remaining deployments after a failure and reports their actual results` と専用fixture/importを削除。他の既存ケースは維持。代替テストは追加しない |

Workflow テストの全面撤去は今回の対象にしない。「新規追加しない」という制約と、今回の実CLI起動除去の範囲を区別する。

## 1. グラフと入力検証

対象実装は `scripts/connection-graph/build.ts`、`select.ts`、`graph.ts`。

`build.ts` はすでに薄いのでテスト目的の関数化はしない。`select.ts` の未知パッケージ検証は、たとえば `validation.ts` の関数として抽出し、取得済みの名前とグラフを受け取る。関数名は実装時に既存規約に合わせる。CLI ファイルにはテスト用 export や VITEST 分岐を設けない。

`graph.test.ts` の循環・到達性・空集合・孤立点・長い経路・変更からの隔離・workspace除外・設定読み取りを維持する。既存ケースと重複させず、`ConnectionGraph.fromJSON()` の構造検証を直接確認する。例は null、空オブジェクト、不正な配列要素、重複パッケージ名。未知パッケージを拒否する入力検証と、グラフ探索が未知の起点を無視する既存仕様を混同しない。

文字列 `not json` に対する `JSON.parse` の失敗、JSON の整形、stdin、終了コード、`--root` のオプション拒否の代替テストは作らない。`fromWorkspace()` の既定値がモジュール位置からrootを決める実装と、CLIがroot上書きを受け付けない仕様はコードレビューで確認する。

## 2. workspace の選択とバリデーション

対象実装は `scripts/workspace/configs-cli.ts`、`configs.ts`。選択とデプロイメタデータ作成を、たとえば `selection.ts` に抽出する。CLI は `getWorkspaceConfigurations()` の結果と取得済みオプションを関数に渡し、返り値を出力する。

テストするのは、一覧モードとtargetsモードの選択規則、空のtargetsが全件にならないこと、未知の名前の拒否、Worker名の妥当性、不正項目を含むと部分的な計画を返さないこと。Worker設定がない対象を勝手に除外しない。標準のJSON直列化や単純なプロパティ転記は独立したテストにしない。

既存の一時workspaceを用いた設定ロード・除外・重複名検出は維持する。外部プロセスを起動せず、実リポジトリのアプリ名やビルド済みCLIをfixtureにしない。

## 3. 同期テストの整理

`syncPackageLocal()` は `Dotenv` と `WranglerJsonc` の更新・保存を呼ぶ単純な処理なので、公開・抽出・直接テストを追加しない。`sync.ts` の引数転送を検証するための実行器注入も行わない。

既存の `packages/app-config/src/config-file/dotenv.test.ts`、`wrangler.jsonc.test.ts`、`package-path.test.ts`、`globalRuntimeEnvs.yaml.test.ts` で値の更新、nullによる削除、コメント保持、独立した状態、共有設定の保存が検証されている。これらを維持する。

旧テストの削除により、複数パッケージ同期後だけ共有の削除指示を消費する流れ、未登録タスクの扱い、dry-run・フィルタ・失敗時の全体制御は自動検証対象から外れる。この保証の縮小を明記する。現在の簡潔な制御はコードレビューで確認し、診断不足がある場合だけ、成功・失敗・削除指示を保持した理由を示すログを検討する。単純な真偽値関数をテスト目的で抽出しない。

`packages/app-config/src/build.ts` も今回新たにテストする対象ではない。既存のmaterialize配下のテストを維持し、テストを増やすための分解は行わない。

## 4. Workflow とロギング

`actions.test.ts` の CLI 結合ケースと `workflows.test.ts` の実deployケースを削除する。`planPreview()` の依存注入、filter-utilのテスト向け分解、偽のTurbo summaryによる新規レポートテスト、YAMLのコマンド文字列検証は行わない。

本番の `plan.mjs` が CLI を使うこと自体は今回の対象外。テストからの呼び出しをなくせば、テスト中の起動は除去できる。

既存の `deploy.log`、Turbo summary、status/summary_path/log_path の出力、結果通知を先に確認する。足りない場合のみ、段階名、対象件数、終了状態、summary欠落などを追加する。環境変数値・トークン・設定ファイル内容をログに出さない。通常の処理結果を載せるstdoutや `GITHUB_OUTPUT` に診断文を混ぜない。実際のTurbo継続実行、シェル連携、通知経路の保証は内部関数テストで置き換えられないことを記録する。

## 検証・完了条件

1. 対象テストのCLI helper、モック内の実起動、CLIファイルのimportを除去する。単に `child_process` のimportがあるだけで削除しない。`delete-preview-worker.test.ts` の完全モックとfake timerは維持する。
2. 対象パッケージの既存testスクリプトで変更を検証し、最後にルートの `pnpm test -- --run` を実行する。必要な依存準備は既存スクリプトに従う。
3. 安定性の確認として `pnpm test --force -- --run` を3回実行し、各結果と所要時間を記録する。Turboキャッシュのヒットを成功の根拠にしない。反復の成功は全てのCI負荷条件での無失敗を保証しない。
4. 実装変更に対応する既存の型チェック・ビルドがあれば実行する。lintは自動修正を含むため対象外の変更を残さない。
5. 3箇所の20秒指定が対象ケースの削除とともになくなる。CLIエントリーポイント、単純な委譲関数、Workflowの新規テストがない。
6. レビュー報告に、残した業務上の検証、削除した保証、検証コマンドと結果、必要と判断したログまたは既存ログで十分な理由を記す。

## 関連引き継ぎ

- [文書更新計画](./cli-test-documentation-plan.md)
- [バックログ](./cli-test-backlog.md)
