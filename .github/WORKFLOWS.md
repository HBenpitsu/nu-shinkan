# GitHub Actions の構成

開発中の CI/CD 構成。配置・責務の方針は [deploy workflow の整理方針](../docs/discussion/deploy-workflow-organization.md) を参照する。

## トリガーと処理

| Workflow | 処理 |
| --- | --- |
| `on-tag-change.yml` | 手動実行・初回タグは `full-deploy`、既存 staging/release タグの更新は `update-deploy` |
| `on-pr.yml` | 通常 PR は `review-deploy`、コメント受付からの内部 dispatch は `pick-deploy` |
| `on-pr-comment.yml` | `/preview` を解析し、権限を確認して PR の SHA と指定名を固定し内部 dispatch |
| `on-pr-close.yml` | PR 状態を確認し、`preview-prune` で削除 |

full/update は channel 単位、review/pick/cleanup は PR 単位で排他を共有する。checkout は受付時に確定した SHA を使う。preview は実行開始時と deploy 直前に PR 状態を再確認する。

## Deploy actions

- `full-deploy`：channel のみを受け取り、設定準備後に全件 test → build → deploy。対象選定ステップは持たない。
- `update-deploy`：差分と依存関係で対象を選び、比較不能時は全件にフォールバックする。
- `review-deploy`：PR 差分の影響先と connection graph から対象を選ぶ。
- `pick-deploy`：ルート依存の準備後に Turbo の一覧と指定名を照合し、影響先と connection graph から対象を選ぶ。

対象選定は各 action の `plan.mjs`、Worker 情報との対応付けは `scripts/deploy/targets.ts`、実行と結果集計は `scripts/deploy/run.ts`・`results.ts` が担当する。統合 CLI は使用しない。

## 補助処理

- `use-repo`：Node/pnpm と依存の準備。
- `refine-filter`：タスクを持つパッケージを調べ、実行引数と依存インストール引数を出力。`vi-test`・`ui-test` が利用する。
- `preview-prune`：各パッケージの `preview:prune` を Turbo で実行。PR 番号は必須。削除処理は自身の PR Worker を force で削除し、API の Worker 不存在を成功扱いにする。
- `deploy-notify/notify.mjs`：結果を `GITHUB_STEP_SUMMARY` と PR コメントへ出力。通知失敗はログへ記録する。

通常ログは Actions ログで確認する。再通知 workflow と deploy ログの artifact 保存は廃止した。HTML の UI テストレポートは artifact に保存する。

既存の retag・merge 用 utility workflow は維持する。実環境での dispatch、排他、Cloudflare deploy/cleanup はローカル検証とは別に確認する。
