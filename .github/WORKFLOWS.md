# GitHub Actionsの構成

イベントを受け付けるworkflowから、用途別の再利用workflowを呼ぶ。デプロイは固定したSHAをcheckoutし、そのコミットの設定・スクリプトを使う。

| 受付                | 再利用workflow             | 処理                                                      |
| ------------------- | -------------------------- | --------------------------------------------------------- |
| `on-tag-change.yml` | `update.full-deploy.yml`   | staging/releaseの初回タグ作成、手動full                   |
| `on-tag-change.yml` | `update.update-deploy.yml` | タグ更新の差分と依存関係による影響先。比較不能ならfull    |
| `on-pr.yml`         | `review.review-deploy.yml` | main向けPRの差分、依存関係、connection graphによるpreview |
| `on-pr-comment.yml` | `review.pick-deploy.yml`   | `/preview <package-name> ...` の指定と影響先からpreview   |
| `on-pr-close.yml`   | `review.clean-preview.yml` | PR close、またはPR番号を指定した手動cleanup               |

コメント受付はrepositoryへのwrite権限と、同じrepositoryのopen PRであることを確認し、head/base SHAを固定する。pickはそのhead上で指定名をTurboの一覧と照合する。フィルタ式や空指定は受け付けない。通常のpreviewもfork PRでは実行しない。

## 選定と実行

fullは全件、diffは直接変更されたパッケージ、pickは指定パッケージをテスト対象にする。デプロイ対象は依存関係による影響先まで含め、review/pickではさらにconnection graphでreview入口からの利用経路を選ぶ。

`filter-util` は指定タスクを持つパッケージだけに絞り、`packages`、依存を含むインストール引数 `deps_args`、正確な実行引数 `affected_args`、`has_hit` を出力する。名前に反して `affected_args` は影響先を再展開しない。空文字は全件、JSONの `[]` は空対象であり、空対象を全件へ展開しない。

`workspace/configs-cli.ts --targets` が選定対象へpathとWorker基底名を付与する。その結果を `TARGETS` に保持し、設定同期・build・deployへ渡す。テストactionは各対象の依存を準備するため、同じ作業領域でのインストール競合を避けて順番に実行する。UIテストはPlaywrightブラウザを導入して実行し、HTMLレポートをartifactへ保存する。

準備に失敗した場合はdeployしない。デプロイ対象が空でもテスト対象があればテストする。空対象は通常は成功扱いだが、pickではデプロイ可能な対象がなければ失敗とする。各deployをTurbo経由で実行し、一部が失敗しても残りの対象を試行し、最終結果を失敗にする。

## 排他とPR状態

full/updateは `deploy-channel-<channel>` でFIFOの待機列を共有する。updateの比較不能時はfullへ処理を渡し、同じロックを二重取得しない。review/pick/cleanupは `preview-pr-<number>` を共有し、実行中をキャンセルせず待機中の最新一件を保持する。

previewは実行開始時とdeploy直前にPR状態を確認する。head/baseが変わった要求はskipし、閉じたPRはcleanupへ進む。close受付後にreopenされたPRのcleanupはskipする。手動cleanupはopen PRも明示的に削除できる。

cleanupは既定ブランチをcheckoutし、各パッケージの `undeploy:preview` をTurboで実行する。PR番号を正の整数として検証し、自身のPR Workerだけをforce削除する。WranglerのWorker／legacy environment不存在は成功扱いとし、一時的な失敗は最大3回試行する。削除・改名されて既定ブランチに存在しない過去のパッケージは、この方式では回収できない。

## 結果と準備

各workflowの最後に、成否、失敗ステップ、パッケージごとのdeploy結果、取得できたWorker URL、Actions runへのリンクをSummaryへ出力する。previewはPRへも通知する。通知失敗は警告として記録する。詳細ログはActionsで確認する。

GitHub Environmentsの `preview`、`staging`、`release` に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定する。retag・merge用のutility workflowは既存のGitHub App資格情報を使用する。

`on-pr.yml` のtooling jobでscriptsのテストと型検査を実行する。`nightly.yml` は毎日UTC 00:00に既定ブランチの型検査・全workspaceの単体テスト・UIテストを実行する。ローカルでは外部APIをmockしてPR状態・権限・部分失敗を検証する。GitHub上の排他、Environment権限、Cloudflareへのdeployとcleanupは実環境での確認が必要になる。

## スクリプト記述と Action 切り出し標準

GitHub Actions 内のスクリプト実装および切り出しについては、[ADR: GitHub Actions スクリプト実装ガイドライン](../docs/ADR/workflow-script-guidelines.md) に基いて構成する。

1. **GitHub API / PR・Issue コメント / Output 設定**: `actions/github-script@v8.0.0` を使用する。
2. **Git / ローカルロジック処理**: インラインヒアドキュメント (`<<'JS'`) を避け、対応する GitHub Action 直下に切り出した `.mjs` 補助スクリプトを実行する。
3. **補助スクリプトの Action 帰属**: 補助スクリプト (`.mjs`) を導入する際は必ず自然な単位での Action 切り出し (`.github/actions/<action-name>/`) を伴う。

