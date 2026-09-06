## このドキュメントの目的

このドキュメントは，現状のgithub workflowsの構成を説明することを目的とした打球メントです．

## Workflowの種別

存在するworkflowは以下に大別できます．

- utility workflow
- trigger workflow
- CI/CD workflow(actions)
- 共通化処理

### utility workflow

utility workflowはgithub上の操作を簡便にすることを目的としたworkflowです．

| workflow file | 用途 | トリガー |
| merge-ff.yml | PRをfead forward only mergeでcloseする | PRにスラッシュコマンドを入力 |
| retag-by-commit-sha.yml | release/stagingタグを特定のコミットに付け替える | Actionsタブから実行 |
| retag-staging-to-branch.yml | stagingタグを特定のブランチのヘッドに付け替える | Actionsタブから実行 |
| retag-release-to-staging.yml | releaseタグをstagingタグと同じコミットに付け替える | Actionsタブから実行 |

### trigger workflow

trigger workflowは，git上の操作やスケジュールに応じて自動でトリガーされるworkflowで，CI/CDへ接続します．

| workflow file | 接続するCI/CDアクション | 
| nightly.yml | なし |
| on-tag-change.yml | release/stagingデプロイ |
| on-pr.yml | previewデプロイ |
| on-pr-comment.yml | previewデプロイ(fallback) |
| on-pr-close.yml | previewデプロイのクリーンアップ |

### CI/CD workflow(action)

CI/CDアクションのオーケストレーションを行うworkflowもしくはactionです

| workflow file | 処理 |
| (actions) update-deploy | ビルド，デプロイ |
| (actions) full-deploy | ビルド，デプロイ |
| (actions) review-deploy | ビルド，デプロイ |
| (actions) pick-deploy | ビルド，デプロイ |
| (actions) ui-test | テスト (ui) |
| (actions) vi-test | テスト (vitest) |


### 共通化処理

pnpmのセットアップなど，複数のworkflowに共通する処理はreusable workflowもしくはcomposit actionとして抽出サれています．

| workflow file | 処理 |
| (actions) comment-reaction | トリガーとなったコメントにリアクションをつける |
| (actions) use-app | Github App のクレデンシャルでリポジトリをCheckoutする |
| (actions) use-repo | リポジトリの依存関係を解決する |
