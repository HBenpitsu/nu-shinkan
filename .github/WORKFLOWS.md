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



### 共通化処理

pnpmのセットアップなど，複数のworkflowに共通する処理はreusable workflowもしくはcomposit actionとして抽出サれています．

- actions
    - setup
    - comment-reaction: コメントに開始時 🚀、ジョブ成功時 🎉、失敗時 😕 を付与する。
      checkout 後、対象処理の前に呼び出し、`token: ${{ github.token }}` を渡す。
      `pull-requests: write` が必要。内部の JavaScript action の `post-if` でジョブの結果を判定する。
      キャンセル時のリアクションは追加しない。post はジョブ終了時に逆順で実行されるため、
      判定はリアクションの post 実行時点の状態となる。最初の checkout 自体の失敗は対象外。
