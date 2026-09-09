# CLI依存テストの改修結果

2026-09-09に[改修計画](./cli-test-refactoring-plan.md)の実装と検証を完了した。テスト対象は[テスト方針](../testing-policy.md)と `.agents/instructions/testing/test-scope.md` に従った。バックログのB02〜B07に対応し、B08のUIサンプル整理は含まない。

## 変更と残した検証

- `scripts/connection-graph/cli.test.ts` を削除。`validation.ts` に未知パッケージ名の検証を分離し、登録済み・空・重複・孤立した名前の受理と、未知名が混在した入力の拒否を直接検証する。`graph.test.ts` にnull、空オブジェクト、各フィールドの型・配列要素・辺の長さ、重複パッケージ名の構造検証を追加した。
- グラフの循環、到達性、空集合、孤立点、長い経路、変更からの隔離、workspace除外、設定読み取りの既存テストは維持した。探索が未知起点を無視する仕様と入力検証の拒否規則は区別している。
- workspaceの選択とデプロイメタデータ作成を `selection.ts` に移した。一覧とtargetsの選択規則、workspace順・重複指定、空targets、未知名、Worker名、不正項目が混在した計画の拒否を直接検証する。Worker設定のない対象も保持し、未選択項目のWorker名は選択結果を無効化しない。設定ロード・除外・重複名の既存検証は維持した。
- `scripts/sync-env/sync.test.ts` を全削除し、`sync.ts` のテスト用exportとVITEST起動回避分岐を除去した。設定クラスの更新、null削除、コメント保持、状態の独立性、共有設定の保存と、既存materializeテストは維持した。`syncPackageLocal()` の公開・分解・テストは追加していない。
- `actions.test.ts` の `refine()` と末尾2ケース、`workflows.test.ts` の実deployケースと専用fixture/importを削除した。計画で維持対象とされた既存ケースには追加していない。
- 対象の20秒タイムアウト指定3箇所を除去した。`delete-preview-worker.test.ts` の完全モックとfake timerは維持した。

本番CLIの引数、JSON出力、選択・同期・デプロイの規則は維持した。コードレビューで `ConnectionGraph.fromWorkspace()` のroot既定値がモジュール位置に基づくこと、build CLIがroot上書きを受け付けないことを確認した。タイムアウト延長、リトライ追加、並列度制限は行っていない。

## 自動検証から外れた保証

CLIの起動、stdinの読み分け、stdout/stderr、終了コード、引数解析、JSONの整形、rootオプション拒否の結合動作は検証しない。

複数パッケージの同期が全成功した後だけ共有削除指示を消費する流れ、未登録タスク、dry-run・フィルタ・失敗時の全体制御は自動検証から外れた。コードレビューでは、Turbo失敗時に例外が共有設定更新より前に伝播すること、フィルタ指定時は共有設定更新前に戻ること、dry-runでは保存しないことを確認した。

filter-utilとpreview計画のCLI連携、実Turboによる失敗後の継続実行、シェル・Action連携、実行結果から通知に至る経路の結合保証も削除した。内部関数のテストや診断ログでこれらを代替保証したとは扱わない。Workflowの新規テストは追加していない。

## 診断ログの判断

既存の `deploy.log`、Turbo summary、`status` / `summary_path` / `log_path` 出力、失敗段階を含む結果通知、PR無効時のno-opログ、同期失敗時の例外表示をコードから確認した。実デプロイやCI障害の再現は実施していない。

既存情報を維持し、判別しにくかった箇所にだけ診断を追加した。

- filter-util：タスク名、候補件数、対象件数と、空指定・一致なし・登録タスクなしの区別。
- preview計画：選択パッケージ件数とtargets件数。
- deploy実行：summaryのパスまたはファイルがない場合、その欠落と終了状態を表示する。集計の既存フォールバック動作は維持する。
- 同期：成功後の共有削除指示の消費、またはフィルタ・dry-runによる保持理由。

追加した診断はstderrへ出し、通常のstdoutと `GITHUB_OUTPUT` に混ぜない。環境変数値、トークン、設定内容は追加ログに含めない。ログは事後調査用であり、自動回帰検出と同等の保証ではない。

## 検証結果

Node v24.19.0、pnpm 11.23.0。既存の依存インストールとapp-configビルドがある環境で実施した。

| コマンド | 結果 | 所要時間 |
| --- | --- | --- |
| `pnpm --filter @repo/scripts test --run` | 7ファイル・60テスト成功 | Vitest 0.256秒 |
| `pnpm --filter @repo/app-config build` | 成功 | 未計測 |
| `pnpm --filter @repo/scripts exec tsc --noEmit` | 成功 | 未計測 |
| `pnpm test -- --run` | 9タスク成功、キャッシュ0件 | 4.033秒 |
| `pnpm test --force -- --run`（1回目） | 9タスク成功、キャッシュ0件 | 3.991秒 |
| `pnpm test --force -- --run`（2回目） | 9タスク成功、キャッシュ0件 | 4.103秒 |
| `pnpm test --force -- --run`（3回目） | 9タスク成功、キャッシュ0件 | 4.006秒 |

ルートコマンドの時間はプロセス起動から終了までのwall time。強制反復ではTurboキャッシュを利用せず、毎回テストを実行した。全CI負荷条件で失敗しないことや、改修前との速度差を保証する測定ではない。

`git diff --check`、診断を追加した2つのmjsファイルの `node --check` も成功した。対象テストからのCLI import・実起動・モック内の `importActual`・`planPreview()` 呼び出しの除去を静的確認した。既存Workflowテスト全体の撤去は計画の対象外としている。
