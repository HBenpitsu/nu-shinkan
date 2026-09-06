# デプロイ実装計画

## このドキュメントの目的

[デプロイ設計](./deploy-design.md)を実装するための作業，実現方式の検討，検証項目を整理します．[設計草案](./deploy-design-draft.md)と従来の設計文書にあったコマンド例，実装上の注意，未決定事項を引き継いでいます．用語は[メンタルモデル](./deploy-model.md)に従います．

本書は `188ea27` の追跡ファイルを比較基準として，2026-09-06 にコードを読み合わせた結果を反映しています．実ファイル名は `deploiy-impl-plan.md` です．第 0〜7 節の表は計画時点の比較記録です．2026-09-06 に実装とローカル検証を行いました．現在の実装先は `packages/app-config` と `ui_test` です．実施結果と実環境に残る確認は末尾の「実装・検証記録」に記載します．確定した振る舞いはデプロイ設計に従い，既存実装，実装予定，方式の検証が残る項目を区別します．

ファイルパスはリポジトリルートからの相対パスです．「編集」は既存ファイルの変更，「追加」は新規ファイル，「削除」は移行完了後の撤去，「移動」は改名を表します．新規ファイル名は本計画での配置案です．設定パッケージは第 0 節で改名するため，現状の説明には `packages/env-config`，以後の作業先には `packages/app-config` を使用します．

## 0. 前提となる命名変更を独立して完了する

[e2e の改称](replace-false-e2e.md)と[設定パッケージの改称](package-renaming.md)は，機能変更とは別の変更単位にします．次のパスの対応を確定してから後続作業に進みます．

| 操作       | 作業場所                                                                                                                                                                                                                                                                       | 作業内容・完了条件                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 移動・編集 | `packages/env-config/` → `packages/app-config/`，同ディレクトリの `package.json`                                                                                                                                                                                               | パッケージ名を `@repo/app-config` に変更．`sync`・`materialize` の bin 名は維持する                                                                                                                                              |
| 編集       | `apps/dummy-preview-api/package.json`，`apps/dummy-preview-web/package.json`，`apps/organization-user-service/package.json`，`apps/organization-web-app/package.json`，`templates/backend-template/package.json`，`templates/frontend-template/package.json`，`pnpm-lock.yaml` | workspace 依存を新名に揃え，lockfile を再生成する．子ディレクトリにある既存 `pnpm-lock.yaml` も旧名の参照があれば更新する                                                                                                        |
| 移動・編集 | `.github/workflows/e2e-report.yml` → `ui_test-report.yml`，`.github/scripts/collect-e2e-reports.ts` → `collect-ui_test-reports.ts`，同 `.test.ts`                                                                                                                              | Workflow 呼び出し，import，レポート名，コメント識別子をまとめて変更する                                                                                                                                                          |
| 移動・編集 | `apps/dummy-preview-web/e2e/`，`apps/organization-web-app/e2e/`，`templates/frontend-template/e2e/` → 各 `ui_test/`                                                                                                                                                            | 各 `playwright.config.ts` の `testDir`，各 `package.json` の `e2e`・`e2e:report`，ルート `package.json`・`turbo.json` のタスク名，`.github/workflows/heavy-tests.yml`・`on-pr.yml` の参照を `ui_test`・`ui_test:report` に揃える |
| 編集       | `docs/discussion/configuration-design.md`，`deploy-design.md`，`deploy-design-draft.md`，本書，`package-renaming.md`，`replace-false-e2e.md`                                                                                                                                   | 名称・実装パスの参照を更新し，完了を記録する．設計の振る舞いは変えない                                                                                                                                                           |

以下の表で「4 アプリ」は上記 `apps/` の四つ，「両テンプレート」は上記 `templates/` の二つを指します．

## 1. 現状との差分と実装順序

### 確認できた現状

| 領域・確認したファイル                                                                                       | 現在の実装                                                                                                                                     | 必要な差分・担当節                                                                     |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `.github/workflows/on-tag-change.yml`                                                                        | タグ push のみ．full 受付・channel 排他なし．デプロイは `--concurrency=2`．検出・テスト・deploy が別ジョブで，checkout に対象 SHA の指定がない | full 受付，SHA 固定，排他，準備から deploy までの接続を実装（2・4・5）                 |
| `.github/workflows/on-pr.yml`，`on-pr-close.yml`                                                             | PR は `ready_for_review` も起動対象で，実行中をキャンセルする．close は echo のみ．コメント受付と手動削除はない                                | 設計のイベントへ揃え，デプロイ・削除を共通の PR 排他で扱う（2・6）                     |
| `.github/workflows/retag-by-commit-sha.yml`，`retag-staging-by-branch.yml`，`retag-release-from-staging.yml` | すでに App token を生成し，checkout の認証に使ってタグを push している                                                                         | 認証処理の新設は不要．後続のデプロイ起動を結合検証する（2）                            |
| `.github/scripts/detect-affected.ts`，同 `.test.ts`，`.github/workflows/affected-detection.yml`              | `turbo run deploy/dev --affected --dry-run=json` の cache `MISS` を抽出．初回タグ・検出失敗は空集合．出力はパスとシェル用フィルタ文字列        | キャッシュから独立したパッケージ選定と `changes`・`targets` に置換（3）                |
| `pnpm-workspace.yaml`，`scripts/package.json`，`.github/scripts/package.json`                                | `templates/*` も workspace に含まれ，両テンプレートに deploy がある．二つの scripts パッケージには name がない                                 | 全件選定にはテンプレートも含める．名前付き出力のため scripts の name を追加する（3）   |
| `packages/env-config/src/config-file/runtime.yaml.ts`，`runtime.yaml`，`globalRuntimeEnvs.yaml`              | 読み込み元は旧 `runtime.yaml`．新しい global ファイルは存在するが読まれていない．`deployment.yaml` はリポジトリ内にない                        | 新しい設定読込・移行と review グラフ用の宣言を追加（3・4）                             |
| `packages/env-config/src/materialize/context.ts`，`materialize.ts`                                           | channel 未指定を preview にし，PR は 0・小数も通る．候補は CSV の `PREVIEW_SERVICES`                                                           | 必須入力検証と JSON の `TARGETS` へ変更（4）                                           |
| `packages/env-config/src/materialize/wrangler.ts`，`dotenv.ts`                                               | Worker 命名・profile 展開はある．接続は Worker 文字列・キーの接頭辞で置換．preview の routes 削除がない                                        | パッケージ名による connections 解決，優先順位，候補外の維持を実装（4）                 |
| 4 アプリ・両テンプレートの `package.json`                                                                    | build がなく，生成処理は predeploy．多くは bin に存在しない `env:materialize` を呼ぶ（frontend テンプレートのみ `materialize`）                | build に生成を移し，deploy は生成済み成果物を反映する（4・5）                          |
| `turbo.json`，ルート `package.json`                                                                          | build タスク設定なし．deploy は `^env:sync`・`^deploy` に依存．test は `^test` に依存．ルートに `sync` はない                                  | 入力・成果物・依存を明示し，計画集合以外のテスト・デプロイを暗黙に実行しない（4・5）   |
| 両 Web の `vite.config.ts`，4 アプリの `wrangler.jsonc`                                                      | Vite の root は `src`，envDir は相対指定．生成 Wrangler に元の `main: src/index.ts`・`assets.directory: ./dist` をそのまま出力する             | 生成設定の位置を基準にパスを解決し，実際に同じジョブの成果物を読ませる（4）            |
| 両 Web の `src/routes/index.tsx`，両 API の `src/index.ts`                                                   | Web は接続先定数の表示のみ．Web の Wrangler は assets 配信で，Service Binding を呼ぶ Worker エントリがない                                     | 現行の Worker 間 URL fetch を置換する箇所はない．接続の実動検証用コードが別途必要（4） |
| `.github/workflows/e2e-report.yml`，`on-pr-close.yml`                                                        | UI テストのレポート通知のみ．デプロイ結果の通知・資源列挙・削除は未実装                                                                        | 専用の結果集約・通知・削除を追加（5・6）                                               |

### 作業順と移行の区切り

1. 第 0 節の改名を完了する．
2. 第 3・4 節の設定ローダーと workspace 列挙を先に用意し，設定データを移行する．同じローダーを計画と materialize から使用する．
3. 第 3 節の選定，第 4 節の build，第 5 節の実行・結果集約を実装し，外部反映なしで検証する．
4. 第 2・6 節の受付・排他・通知・削除を接続し，既存 Workflow の呼び出しを切り替える．新旧のデプロイ経路を同時に有効にしない．
5. 本書末尾の削除条件を満たした旧ファイルを撤去し，Workflow と実環境の検証結果を記録する．

mode は `(purpose, selection source)` の組み合わせです．mode フィールドの新設を前提とせず，channel から purpose・profile を導出し，selection source で選定処理を呼び分けます．

## 2. トリガーと同時要求の制御を実装する

### ファイル別の作業

| 操作       | 作業場所                                                                                                     | 作業内容                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 編集       | `.github/workflows/on-tag-change.yml`                                                                        | push と channel 指定の `workflow_dispatch` を受け付ける．タグ削除の除外，before/after の固定，full のタグ解決，channel 共通の排他を追加する                                             |
| 編集       | `.github/workflows/on-pr.yml`                                                                                | opened/reopened/synchronize に揃え，head SHA を明示する．コメント受付からの内部 dispatch の入口と PR 番号・固定 SHA の受取を追加．キャンセル設定を変更し，第 4 節の共通準備・実行を呼ぶ |
| 追加       | `.github/workflows/on-preview-comment.yml`                                                                   | PR の `/preview` を受け付け，PR 番号・head SHA・引数を固定する．PR コメント以外と別コマンドは対象外とする                                                                               |
| 編集       | `.github/workflows/on-pr-close.yml`                                                                          | close と PR 番号指定の手動削除を受け付け，PR 共通の排他と状態分岐を追加する                                                                                                             |
| 追加       | `.github/scripts/deploy/request.ts`，`request.test.ts`                                                       | トリガー入力の正規化，SHA 解決，コマンド解析，PR 状態に応じた実行／削除／スキップを担当する                                                                                             |
| 追加       | `.github/actions/deploy/action.yml`                                                                          | 選定・準備・実行を同一ジョブ内で再利用する composite action．channel・固定 SHA・selection source・PR 番号・手動指定を受け取る                                                           |
| 維持・検証 | `.github/workflows/retag-by-commit-sha.yml`，`retag-staging-by-branch.yml`，`retag-release-from-staging.yml` | 既存の App token 利用を維持．retag の排他とデプロイの排他は責務が異なるため，同じグループへ統合しない                                                                                   |

手動要求の SHA を排他待機の後に初めて解決すると，受付時の版を維持できません．手動 full は受付ジョブでタグを解決してから update の排他対象ジョブへ渡します．コメント受付は head を解決して PR 番号・SHA を固定した内部要求を dispatch し，`on-pr.yml` 側で preview の Workflow 排他を取得する構成を具体化します．受付側ではビルド・デプロイを行いません．内部要求の SHA は利用者が指定する full の入力には公開しません．この受け渡しと PR 番号の concurrency 式評価を結合検証します．

### 起動と対象 SHA の固定

設計の起動条件表に対応する Workflow を構成します．通常のタグ更新では移動前後の SHA，preview では PR の base/head SHA を取得します．手動の full は受付時の channel タグ，manual-pick は受付時の PR head を解決し，以後は同じ SHA を使います．タグ更新用 Workflow の既存の GitHub App インストールアクセストークンによる push を維持します．

タグ更新前後の値は push イベントの `github.event.before`・`github.event.after` から取得し，起動コンテキストとして保持します．更新後のタグを再取得して移動前の位置を推測しません．タグ初回作成は `created`，タグ削除は `deleted` で区別し，初回作成は比較基準なしとして full に進み，削除はデプロイを起動しません．取得値をコミットとして解決できない場合は，比較基準側なら full へ切り替え，対象側なら異常終了します．checkout 先と検証・ビルド・デプロイ対象が同じ SHA であることを確認できるログを残します．フィールドの意味は [GitHub の push イベント仕様](https://docs.github.com/en/webhooks/webhook-events-and-payloads#push)に基づきます．

### update の順序・排他制御

同じ channel の (`update`, `diff`) と (`update`, `full`) を共通の制御に含めます．
update の準備・デプロイを行うジョブの `concurrency` は channel ごとに共通のグループ名を使い，`queue: max` と `cancel-in-progress: false` を指定します．通常のタグ更新と手動 full でグループ名を分けません．

#### 順序保証の調査結果

[GitHub の公式仕様](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)では，既定の `queue: single` は待機を一件だけ保持し，後続要求が既存の待機要求を置き換えます．`queue: max` は最大 100 件を待機させ，超過した要求はキャンセルされます．`queue: max` と `cancel-in-progress: true` は併用できません．

処理は concurrency の待機に入った順の FIFO であり，イベント発生順・Workflow の dispatch 順は保証されません．したがって，上記設定の保証範囲は同時実行の排他と複数要求の待機であり，タグ更新順の反映は保証しません．

#### 採用判断

update のデプロイ要求は低頻度であるという運用前提に基づき，まず `concurrency`・`queue: max`・`cancel-in-progress: false` による排他と待機を採用します．公式仕様はタグ更新順の保証がないことを示していますが，逆転が頻発することを示すものではありません．この制約だけを理由に，独自の永続キューやタグ更新からデプロイ完了までを管理する追加の仕組みは現時点では導入しません．

厳密なタグ更新順の保証は採用する方式の保証範囲に含めず，追加の順序制御方式の決定を，ここに挙げた実装作業の前提条件にはしません．

### review の Workflow 単位の排他制御

preview は Workflow 全体に `concurrency` を設定し，PR ごとに実行中一件・待機中一件とします．同じ PR の (`review`, `diff`)・(`review`, `manual-pick`)・PR close による削除・手動削除は，共通のグループ名 `preview-pr-{PR_NUMBER}` を使用します．`PR_NUMBER` はイベントまたは手動入力から Workflow の concurrency 評価時に参照できる形で取得します．

| 設定                 | 値                       | 意味                                                         |
| -------------------- | ------------------------ | ------------------------------------------------------------ |
| `group`              | `preview-pr-{PR_NUMBER}` | 同じ PR のデプロイと削除を排他にする                         |
| `cancel-in-progress` | `false`                  | 実行中の Workflow は準備段階も含めて自動キャンセルしない     |
| `queue`              | `single`                 | 待機中は一件だけ保持し，後続要求が既存の待機要求を置き換える |

実行中の要求は完了させ，待機要求の置き換えによって中間の要求の実行を省きます．ここで残るのは待機枠へ最後に到着した要求であり，イベント発生順の最新を保証する意味ではありません．待機中の削除要求も置き換わり得るため，実行開始後の PR 状態に応じてデプロイまたは削除を選びます．closed の PR に対するデプロイ要求は，スキップだけで終わらず削除処理を行います．具体的な分岐は後述します．

#### 採用理由と保証範囲

準備・ビルドとデプロイを同じジョブで行い，成果物転送と別 runner での依存解決を不要にします．実行中の古いビルドも完了まで動きますが，待機中の全要求を順番に実行することは避けられます．runner の総実行時間と構成の簡潔さを考慮し，この方式を採用します．

保証するのは Workflow 間の排他と，新しい要求によって実行中の処理を自動キャンセルしないことです．複数の外部操作全体の原子性を保証するものではありません．手動キャンセル・タイムアウト・外部 API に送信済みの処理の残留でリソースが残る場合は，クリーンアップを再実行します．

## 3. 計画処理を実装する

### ファイル別の作業

| 操作       | 作業場所                                                                                                    | 作業内容                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 追加       | `packages/app-config/src/config-file/deployment.yaml.ts`，同 `.test.ts`                                     | deployment 設定の型・読込・省略値・不正な reviewEntry の警告を実装．第 4 節からも利用する                                                              |
| 編集       | `packages/app-config/package.json`                                                                          | 上記ローダーを計画処理から使う公開 export を追加する                                                                                                   |
| 編集       | `scripts/package.json`，`.github/scripts/package.json`，`pnpm-lock.yaml`                                    | それぞれ `@repo/scripts`・`@repo/github-scripts` の name を追加．後者に設定パッケージへの workspace 依存を追加する                                     |
| 追加       | `.github/scripts/deploy/workspace.ts`，`workspace.test.ts`                                                  | turbo ls の JSON を名前・パスへ正規化し，全件／直接変更／依存元展開を引数配列で実行する．manual-pick の早期検証用列挙は全依存の install に依存させない |
| 追加       | `.github/scripts/deploy/graph.ts`，`graph.test.ts`                                                          | connections から二方向グラフを構成し，下記の到達可能性で候補を収集する                                                                                 |
| 追加       | `.github/scripts/deploy/plan.ts`，`plan.test.ts`                                                            | 四つの mode，update の full フォールバック，空集合を実装し，`changes`・`targets` を GITHUB_OUTPUT に出力する                                           |
| 置換後削除 | `.github/scripts/detect-affected.ts`，`detect-affected.test.ts`，`.github/workflows/affected-detection.yml` | 全呼び出しを新しい計画へ移した後に削除する．cache MISS ベースの選定・旧 filter_args 出力は移植しない                                                   |

`templates/*` は現在 workspace に含まれ，deploy を持つため，設計どおりの full ではデプロイ対象になります．本計画で apps のみに絞る例外は追加しません．テンプレートを対象外にしたい場合は workspace／テンプレートの契約を別途変更する必要があります．

### checkout と差分検出

selection source が `diff` の場合は `fetch-depth: 0` で checkout します．`full`・`manual-pick` では，差分検出用の履歴を要求せず，固定した対象コミットを取得します．

草案の差分検出コマンドは次のとおりです．`BASE`・`HEAD` は固定した SHA に置き換えます．

| 用途                                     | コマンドの形                           |
| ---------------------------------------- | -------------------------------------- |
| 直接変更されたパッケージ                 | `turbo ls --filter='[BASE...HEAD]'`    |
| 直接変更とパッケージ依存関係による影響先 | `turbo ls --filter='...[BASE...HEAD]'` |

採用中の Turborepo の出力形式を確認し，パッケージ名・パスを抽出する補助処理を用意します．比較基準なし，比較処理の失敗，巻き戻し・分岐をまたぐタグ移動を判定し，update では対象 SHA を維持して full の計画処理を呼び出します．正常な空差分は別に扱います．

full では全ワークスペースパッケージを列挙します．

### manual-pick の起点と影響先

manual-pick でも `turbo ls --filter` を使用します．固定した対象 SHA で指定パッケージの実在性を確認した後，パッケージ名の前に `...` を付けたフィルタで，指定パッケージ自身と，それに直接・間接に依存するパッケージ（影響先）を取得します．

```sh
turbo ls --output=json --filter='...@repo/example-api'
```

複数指定の場合は，指定ごとに `--filter` を追加し，それらの和集合を取得します．

```sh
turbo ls --output=json --filter='...@repo/example-api' --filter='...@repo/example-lib'
```

前置の `...` は依存元への展開を表し，指定パッケージ自身も含みます．後置の `...` による依存先への展開や，`^` による指定パッケージ自身の除外は行いません．`ls` へのフィルタ適用は [Turborepo のリポジトリ探索](https://turborepo.dev/docs/crafting-your-repository/understanding-your-repository)，展開方向と複数フィルタの和集合は [公式のフィルタ仕様](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/filtering/RULE.md)に従います．

集合は次のように扱います．

| 集合                      | manual-pick での求め方                                       |
| ------------------------- | ------------------------------------------------------------ |
| `changes`                 | 実在性を確認した指定パッケージの集合（重複を除く）           |
| connection グラフへの起点 | 上記の `turbo ls` が返す，指定パッケージ自身と依存元の和集合 |
| `targets`                 | その起点から，次節の connection グラフの規則で収集する集合   |

`turbo ls` の展開結果をそのまま `changes` や最終的な `targets` にしません．diff と manual-pick は，connection グラフへの起点を求めるフィルタが異なり，その後の探索処理は共通化します．

指定はワークスペースの完全なパッケージ名と照合し，任意のフィルタ式としては受け付けません．検証済みの名前から `--filter=...<package-name>` を組み立て，プロセスの引数配列として渡します．空引数・不明なパッケージの検証はこのコマンドの前に完了させます．

### connection グラフ

`connections.bindings` と `connections.urls` から，接続先から接続元に向く辺を作ります．自己ループ・実在しない接続先を除外し，循環があっても停止する探索を実装します．

起点から `reviewEntry: true` へ至るすべてのパスに含まれるパッケージを収集します．指定した起点自身を含めて影響先を求める段階と，connection グラフで確認経路を選ぶ段階を区別します．manual-pick でも確認経路の収集は設計に定めた規則に従い，指定パッケージをそのまま最終候補とする処理に置き換えないようにします．

#### 二方向の到達可能性による選定

順方向と逆方向の二回の探索を行い，到達可能な集合の共通部分を `targets` とします．探索には，訪問済み集合を持つ反復的な DFS を使用します．

| 記号    | 内容                                                                       |
| ------- | -------------------------------------------------------------------------- |
| `S`     | turbo で求めた起点集合（直接変更または手動指定のパッケージと，その依存元） |
| `E`     | `reviewEntry: true` の全パッケージの集合                                   |
| `G`     | 接続先から接続元へ辺を張った connection グラフ                             |
| `G_rev` | `G` のすべての辺を逆向きにしたグラフ                                       |

1. `S` の全ノードから `G` を探索し，到達可能な集合 `F` を求める．
2. `E` の全ノードから `G_rev` を探索し，確認入口へ到達できる集合 `R` を求める．
3. `targets = F ∩ R` とする．

以下は擬似コードです．`G` と `G_rev` は隣接リストとして保持します．

```text
reachable(graph, starts):
    visited = set(starts)
    stack = list(visited)
    while stack is not empty:
        node = stack.pop()
        for next in graph[node]:
            if next not in visited:
                visited.add(next)
                stack.push(next)
    return visited

F = reachable(G, S)
R = reachable(G_rev, E)
targets = F intersection R
```

各探索は開始ノード自身を含みます．したがって，起点自身が確認入口なら長さ 0 の経路として対象に含まれます．起点集合または確認入口集合が空の場合は `targets` も空になります．訪問済みノードは再探索しないため，循環があっても停止します．グラフ構築を含む時間・空間計算量はいずれも，ノード数 `V` と辺数 `A` に対して `O(V + A)` です．

たとえば `変更 API → 中継 API → Web（reviewEntry）` と `変更 API → バッチ` があり，バッチから確認入口への経路がない場合，`F` にはバッチも含まれますが `R` には含まれません．結果として，変更 API・中継 API・Web を選びます．

#### 循環がある場合の扱い

このアルゴリズムは「起点から到達でき，かつ確認入口にも到達できる」ノードをすべて含めます．ノードの再訪を許す経路に基づく選定であり，同じノードを二度通らない単純パスだけに限定する選定とは異なります．

たとえば `起点 → A → Web（reviewEntry）` に `A → B → A` という循環がある場合，`B` も対象になります．設計文書の「すべてのパス」は，本実装計画ではこの到達可能性として解釈します．

#### 探索の検証

複数の起点・確認入口，複数経路，起点自身が確認入口，確認入口へ至らない枝，空の起点・確認入口，循環を確認します．特に上記の循環例で `B` が含まれることを確認し，単純パスへの限定とは区別します．

### 計画結果の受け渡し

`changes`・`targets` を設計の JSON 形式に整え，`GITHUB_OUTPUT` に書き込みます．後続ステップから参照し，channel・PR 番号などはトリガー出力を直接参照します．

空の `changes`・`targets` に対して，フィルタの指定なしで全タスクが実行されないように，呼び出し前に空集合を扱います．`scripts.deploy` のないパッケージは計画から除外せず，実行時のスキップ結果に対応づけます．

### manual-pick の早期検証

引数なしと実在しないパッケージを検出し，Usage・修正コマンド例を PR に返します．全体の依存解決を入力検証の前に必要としない構成を検討します．時間要件は，待機を終えて runner 上で処理を実行開始してから理想的には 10 秒以内，遅くとも 20 秒以内とします．この性能要件をみたすため，`pnpm install --filter` による依存解決範囲の限定を可能なかぎり適用します．

## 4. 準備と設定生成を接続する

### ファイル別の作業

| 操作             | 作業場所                                                                                            | 作業内容                                                                                                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 追加             | `packages/app-config/src/config-file/globalRuntimeEnvs.yaml.ts`，同 `.test.ts`                      | 既存 `globalRuntimeEnvs.yaml` の profile 別読込と local の null 削除を扱う                                                                                                                                                                     |
| 編集             | `packages/app-config/src/sync-local.ts`，追加 `src/sync-local.test.ts`                              | 旧 apps マップの配布をやめ，global local を各ネイティブファイルに同期．null は配布先全件から削除した後，global ファイルから取り除く                                                                                                            |
| 編集             | `packages/app-config/src/materialize.ts`，`src/materialize/context.ts`，同 `context.test.ts`        | 新しいローダーを接続．既定 preview と PREVIEW_SERVICES を撤去し，channel・正の整数 PR・TARGETS を厳密に検証する                                                                                                                                |
| 編集             | `packages/app-config/src/materialize/wrangler.ts`，`dotenv.ts` と各 `.test.ts`                      | 4 段階の優先順位，パッケージ→素の Worker 名の解決，binding・URL の候補内差し替え，候補外維持，routes 削除を実装．文字列の部分置換を撤去する                                                                                                    |
| 編集             | `packages/app-config/src/config-file/wrangler.jsonc.ts`，`dotenv.ts` と各 `.test.ts`                | null によるキー削除と生成先のパス整合を扱う．Wrangler の main・assets.directory などを `.generated` 基準へ補正する                                                                                                                             |
| 追加             | 4 アプリの各 `deployment.yaml`                                                                      | 旧設定の staging/release 値を envs へ移行．両 Web に reviewEntry と対応 API への connections.bindings を宣言する                                                                                                                               |
| 追加             | 両テンプレートの各 `deployment.yaml`                                                                | frontend は reviewEntry を true，backend は false にする．実在アプリへの接続をテンプレートに埋め込まない                                                                                                                                       |
| 編集             | 4 アプリ・両テンプレートの各 `wrangler.jsonc`，両 Web・frontend テンプレートの各 `.env.development` | local はネイティブに，profile の上書きは deployment.yaml に整理．services は素の Worker 名で宣言し，重複する env セクションを移行後に除去する                                                                                                  |
| 編集             | 4 アプリ・両テンプレートの各 `package.json`                                                         | build と同期スクリプトを定義し predeploy を削除．local build は materialize を呼ばず，deploy 入力がある build は生成してから frontend をビルドする                                                                                             |
| 追加             | `packages/app-config/src/build.ts`，同 `.test.ts`，編集 `package.json`                              | 上記 local/deploy 分岐の共通 CLI を公開し，各 build から呼ぶ．Workflow の入力不足は呼出前検証でエラーにする                                                                                                                                    |
| 編集             | 両 Web・frontend テンプレートの各 `vite.config.ts`                                                  | local の `.env.development` と deploy の `.generated/.env.deploy` をパッケージルート基準の絶対パスで参照する                                                                                                                                   |
| 編集             | ルート `package.json`，`turbo.json`                                                                 | ルート sync の入口とタスクを接続．build の出力 `.generated/**`・`dist/**`，入力 DEPLOY_CHANNEL・PR_NUMBER・TARGETS・設定ファイルを明示．まず生成を伴う build は cache false とする．test の `^test` による対象外展開をデプロイ呼出時に抑止する |
| 編集             | `.github/actions/setup/action.yml`，第 2 節で追加する `.github/actions/deploy/action.yml`           | setup の実入力は cache_channel・turbo_cache．呼出側の未定義 deploy_channel・checkout を修正．早期検証を全体 install より前へ置き，設定パッケージのコンパイル→sync→test→build を接続する                                                        |
| 検証・必要時編集 | `scripts/make-app/place-backend.ts`，`place-frontend.ts`                                            | テンプレートコピーが新設定を引き継ぎ，パッケージ名・Worker 名・local ポートを正しく置換することを確認する                                                                                                                                      |

旧 `runtime.yaml` は現在存在しないアプリの項目や現行 dev ポートと異なる SELF を含みます．現存アプリの値と照合し，local は現在の dev 設定へ揃え，存在しないアプリの項目を新設定へ機械的にコピーしません．`xxxxx`・`yyyyy` など既存の仮値は，実環境検証の前に実際の接続設定と区別して確認します．

現状の両 Web は静的配信であり，Service Binding の記述だけでは通信を検証できません．検証用に `apps/dummy-preview-web/src/worker.ts` を追加し，同アプリの `wrangler.jsonc` に入口を設定，`src/routes/index.tsx` から同一オリジンの検証ルートを呼びます．Worker 側で DUMMY_PREVIEW_API binding を使用し，候補内 preview／候補外 staging の接続を確認します．organization 側への同機能の追加は，既存通信の置換としては計上しません．

草案の呼び出し順を次のように具体化します．

1. `pnpm install` で `devDependencies` を含めて依存解決する．
2. `@repo/app-config` を実行可能にし，ルートの `pnpm sync` を実行する．
3. `turbo run test` に `changes` のパッケージを `--filter` で指定する．
4. `turbo run build` に `targets` のパッケージを `--filter` で指定する．

`build` から `@repo/app-config` の `materialize` bin を呼び出し，`.generated/.env.deploy`・`.generated/wrangler.jsonc` と，frontend の `dist` を生成します．設定生成と frontend ビルドの順序，生成した設定の読み込み先を確認します．

### 入力契約

`DEPLOY_CHANNEL` と `PR_NUMBER` に加えて，候補集合を渡す環境変数の名前・シリアライズ形式を統一します．`TARGETS` は計画出力の `targets` 配列そのものを JSON エンコードした値（`[{"package":"@repo/example-api","path":"apps/example-api"}]`）とし，空集合は `[]` とします．Worker 名の配列や CSV は受け付けません．パッケージ側・Workflow 側の両方で同じ契約を使用します．

`materialize` はデプロイ用アーティファクトを生成する専用処理とし，local 用ビルドでは呼び出しません．`materialize` に local へのフォールバックを持たせず，`DEPLOY_CHANNEL` の未指定・未知の値，不正な preview の PR 番号，`TARGETS` など必要入力・設定の不足をエラーにします．

Workflow は build を呼ぶ前にデプロイ入力を検証します．デプロイ用 build は `materialize` を呼び，frontend では生成した設定を使ってビルドします．これにより，Workflow の入力不足を local 用 build と誤認することを防ぎます．

ビルドキャッシュを使用する場合は，channel・PR 番号・候補集合・設定値の違いによって異なるアーティファクトが必要になることを踏まえ，入力と出力の扱いを確認します．preview では，次の方針で今回生成した成果物を使用します．

### preview の準備・ビルド・デプロイの配置

デプロイする場合は，依存解決・設定同期・テスト・設定生成・ビルド・デプロイを同じジョブ内のステップとして実行します．固定した対象 SHA の作業ディレクトリで生成した `.generated/.env.deploy`・`.generated/wrangler.jsonc`・frontend の `dist` などを，そのまま deploy で使用します．

ジョブ間でのビルド成果物の転送，収集用の補助スクリプト，転送用のアーカイブは導入しません．各パッケージが必要な成果物を生成し，deploy がそれを使用することを第 4 節のパス検証で確認します．削除する場合は，テスト・ビルドの成功を条件とせず，削除に必要な準備だけを行います．

### preview 設定

staging profile を基礎として，候補内の Worker への URL・Service Binding を差し替えます．Worker 名のサフィックスが重複しないこと，`routes` を削除すること，候補外の接続が staging のままであることを確認します．

## 5. デプロイと結果集約を実装する

### ファイル別の作業

| 操作 | 作業場所                                               | 作業内容                                                                                                                                          |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 追加 | `.github/scripts/deploy/run.ts`，`run.test.ts`         | targets と scripts.deploy を照合し，空集合をガードして Turbo を実行．全準備成功後に開始し，一部失敗後も残りを実行する                             |
| 追加 | `.github/scripts/deploy/results.ts`，`results.test.ts` | パッケージ別の終了状態・標準出力から成功／不要／失敗，Worker 名，frontend URL，エラーを集約．生ログと結果 JSON を `.artifacts/deploy/` に保存する |
| 編集 | `turbo.json`                                           | deploy の cache false は維持．`^deploy`・`^env:sync` を外し，対象外の反映と実行段階での準備を防ぐ．Cloudflare 認証入力を渡す                      |
| 編集 | `.github/actions/deploy/action.yml`                    | 全対象の準備成功を deploy の条件にし，終了コードを保持して失敗時も結果集約へ進む．update も SHA・集合・フェーズ結果を記録する                     |

既存 deploy スクリプトの `.generated/wrangler.jsonc` 指定は再利用します．predeploy の削除は第 4 節と同時に行い，実行フェーズでの再生成をなくします．Turbo の継続実行オプションとパッケージ別ログ／run summary の対応は，インストール済み版で成功・一部失敗の fixture を動かして確定します．URL が解析できないことだけを成功とみなさず，タスク終了状態を判定の基準にします．

草案の `turbo run deploy` に `targets` を `--filter` で指定する方式を検証し，次の条件を満たすタスク設定と実行制御を決めます．

- `scripts.deploy` がある候補だけを実行する．
- 固定の業務上の並列数上限は設けず，runner の実行資源を基準にする．Turborepo では `--concurrency=100%` を使用し，利用可能な論理プロセッサ数に合わせる．これは CPU 数を基準とする指定であり，メモリ・通信・外部 API の制限を自動検出するものではない．
- 一部が失敗しても，残りの対象を実行する．
- (`update`, `full`) では過去の実行結果による省略を行わず，全 deploy タスクを再実行する．
- 全対象の準備成功後に実行を開始し，一件でも失敗したら Workflow 全体を失敗にする．

並列指定は [Turborepo の公式仕様](https://turborepo.dev/docs/reference/run#--concurrency-number--percentage)に従います．`--parallel` はタスク依存グラフを無視するため，並列上限を緩める目的では使用しません．

実行可能なタスクがないことを検出したとき，manual-pick だけは異常終了と PR 通知につなげます．依存タスクの実行によって意図しない対象までデプロイされないことも確認します．

標準出力の保存・解析形式を決め，候補ごとの成功・不要・失敗，Worker 名，frontend の URL，エラーを集約します．並列実行のログをパッケージに対応づける方法と，出力だけでは結果が確定できない場合の扱いを具体化します．

## 6. 通知とクリーンアップを実装する

### ファイル別の作業

| 操作 | 作業場所                                                                   | 作業内容                                                                                                                                     |
| ---- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 追加 | `.github/scripts/deploy/notify.ts`，`notify.test.ts`                       | 入力エラーから実行結果までを PR コメントへ整形・投稿．SHA，失敗フェーズ，各候補の結果を表示し，通知エラーを別に記録する                      |
| 追加 | `.github/workflows/preview-notify.yml`                                     | 保存した結果を指定して通知のみ再試行できる手動入口を用意する．対象 run・PR の対応を検証し，build／deploy は実行しない                        |
| 編集 | `.github/workflows/on-pr.yml`，`on-preview-comment.yml`，`on-pr-close.yml` | 失敗時にも通知する条件と必要権限を設定し，結果・生ログを保存する．入力エラーも通知対象にする                                                 |
| 追加 | `.github/scripts/deploy/cleanup.ts`，`cleanup.test.ts`                     | 現在存在する preview 専用リソースを列挙し，PR サフィックスの完全一致で削除．一覧取得失敗を空として扱わず，削除済みは許容して再実行可能にする |
| 編集 | `.github/workflows/on-pr-close.yml`，`.github/actions/deploy/action.yml`   | placeholder を cleanup 呼び出しへ置換．排他取得後と deploy 直前に PR 状態を再取得し，下表の分岐へ接続する                                    |

UI テストレポートの Workflow／collector は UI テスト専用として残し，デプロイ通知へ転用しません．現行の有効な設定は Worker と静的 assets が中心で，D1・KV・R2 はコメント例のみです．まず Worker の列挙・削除を実装し，実際に preview 専用資源を追加する場合は種別ごとの列挙・所有判定・削除も cleanup に追加します．単に最後の targets を読み直す方法では，過去の Worker 改名や途中終了の残存を回収できません．

列挙に使える Wrangler コマンドと API の範囲は実装時の検証項目です．「サフィックスから網羅的に削除できる」という未確認のコマンドを前提にせず，CLI で列挙できない種別は Cloudflare API による列挙と Wrangler による削除の組み合わせを確定します．

入力検証・計画・準備・実行のどこで失敗しても，preview の通知処理へ結果を渡せるようにします．通知の実行条件を設定し，デプロイ失敗によって通知がスキップされないことを確認します．通知だけの失敗を区別し，通知の復旧が再デプロイを要求しない構成にします．

update は専用の外部通知を追加せず，Actions のログで対象 SHA，比較基準，選定結果，フェーズごとの結果を確認できるようにします．

クリーンアップについては，

- PRのcloseでトリガー
- デプロイと共通の Workflow 単位の排他グループで待機する．実行中はキャンセルせず，待機中は後続要求による置き換えを許す
- preview 専用サフィックスで現在のリソースを列挙し，種別ごとに検証したコマンドで削除する
- workflow dispatchによって特定のPR_NUMBERへの削除をトリガーできるようにする
- stagingプロファイルから引き継いだリソースを削除しない

### 現在の PR 状態による処理の選択

preview の Workflow は排他枠を取得して実行を開始した後，[Pull Request 取得 API](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request)で現在の `state` を取得し，後続ステップの `if` 条件に使います．イベント時点の `github.event.pull_request.state` や待機前の判定だけで処理を決めません．

| 要求                               | 現在の PR 状態         | 処理                                                |
| ---------------------------------- | ---------------------- | --------------------------------------------------- |
| デプロイ要求（diff / manual-pick） | open                   | 固定した対象 SHA を使って準備・ビルド・デプロイする |
| デプロイ要求（diff / manual-pick） | closed                 | ビルドせず，削除する                                |
| PR close による削除要求            | closed                 | 削除する                                            |
| PR close による削除要求            | open（再オープン済み） | スキップする                                        |
| 手動削除要求                       | open / closed          | 明示的な削除要求として削除する                      |

削除要求が待機中に遅れて到着したデプロイ要求に置き換えられても，その要求が closed を確認して削除を担います．削除処理はサフィックスに一致する現在のリソースを再列挙し，すでに削除されたものがあっても再実行できるようにします．

準備中の close を扱うため，外部へのデプロイ直前にも PR 状態を確認し，closed ならデプロイの代わりに削除します．デプロイ開始後に close された場合は，後続の Workflow が現在の状態を確認して削除します．手動削除も待機中は置き換えの対象であり，個々の手動削除要求が必ず実行される保証は持ちません．必要な場合は手動削除を再要求します．

## 7. 削除・維持するファイルと切り替え条件

| 操作       | 対象                                                                                                        | 条件・理由                                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 削除       | `.github/scripts/detect-affected.ts`，同 `.test.ts`，`.github/workflows/affected-detection.yml`             | on-pr／on-tag-change の移行と新 plan の検証後．他の参照がないことを rg で確認する                                                                                                         |
| 削除       | `packages/app-config/runtime.yaml`，`src/config-file/runtime.yaml.ts`                                       | global／deployment／local へのデータ移行，sync・materialize の import 切り替えと回帰検証後                                                                                                |
| 部分削除   | 4 アプリ・両テンプレートの `package.json` の predeploy，`turbo.json` の旧 deploy 依存                       | build が生成し deploy が既存成果物を使用できた時点で除去する                                                                                                                              |
| 部分削除   | `materialize/context.ts` の PREVIEW_SERVICES，旧 binding／URL 置換処理，旧設定を前提にしたテストケース      | TARGETS／connections の新契約と対応する回帰テストへ置換後                                                                                                                                 |
| 維持・編集 | `.github/workflows/light-tests.yml`，`heavy-tests.yml`，改名後 `ui_test-report.yml`，collector とそのテスト | lint・UI テストを失わないよう維持する．on-pr 内の補助 CI ジョブとして新 plan の集合と固定 SHA を渡し，UI テストの成功をデプロイの条件から外す．再利用 Workflow に head_sha 入力を追加する |
| 維持       | `.github/workflows/integration.yml`，`nightly.yml`，`merge-ff.yml`，`.gitignore`                            | 今回の実装に直接の変更は不要．`.generated`・`.artifacts` はすでに ignore 済み                                                                                                             |

ファイル削除とファイル内の旧処理削除を区別します．改名元の撤去は第 0 節に含め，旧ファイルを新ファイルと重複して残しません．

## 検証項目

検証コードの配置は各節の `.test.ts` に対応させます．設定・選定・実行集約の単体テスト，ローカル成果物検証，GitHub／Cloudflare 上の結合検証の順に進めます．本書の読み合わせは静的調査であり，以下の成功を確認したものではありません．

| 検証場所                                 | 実施内容・完了証跡                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/app-config/src/`               | loader・sync・materialize・build の Vitest を実行する．local null 削除，設定優先順位，候補内外，URL のパス保持，不正入力を含める                                    |
| `.github/scripts/deploy/`                | workspace・plan・graph・request・run・results・notify・cleanup の Vitest を実行．外部操作は fixture／mock とし，失敗継続・削除範囲も検証する                        |
| 4 アプリ・両テンプレート                 | local と staging/release/preview の build を行い，生成先と Vite の環境変数展開を確認．Wrangler の dry-run で main・assets の解決を確認する                          |
| `.github/workflows/`，`.github/actions/` | YAML／Actions の構文と入出力，固定 ref，needs／if，排他グループを検証する．改名前の参照と未定義 setup 入力がないことを確認する                                      |
| GitHub Actions と検証用 preview          | 以下の各ケースについて run URL，対象 SHA，計画 JSON，結果，残存リソースの確認結果を本書に追記する．manual-pick は cold cache も含め runner 開始から返信まで計測する |

### 実装時に確定する方式

未確定なのは作業場所ではなく，実行環境に依存する次の方式です．実装担当箇所と確定条件を分けます．

| 項目                                 | 担当箇所                           | 確定条件                                                                           |
| ------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------- |
| 手動受付時 SHA の固定と内部 dispatch | 第 2 節 request／受付 Workflow     | 待機中にタグ・PR を進めても受付時の SHA を維持し，preview 全体の排他を共通化できる |
| turbo ls 出力・失敗継続・ログ対応    | 第 3・5 節 workspace／run／results | 採用版で名前付き全件列挙，空結果，並列一部失敗を再現し，候補ごとの結果が欠落しない |
| 早期検証の依存解決範囲               | 第 2・4 節受付／setup              | 全体 install より前に不正入力を検出し，20 秒以内の返信を実測できる                 |
| preview 資源の列挙方法               | 第 6 節 cleanup                    | 過去・改名・途中失敗を含む Worker を回収し，共有 staging を残せる                  |

実装時には，次の振る舞いを確認します．単体で確認できる選定・設定生成と，Workflow・デプロイ先で確認する項目を分けて検証します．

| 対象           | 確認するケース                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 対象 SHA       | 受付後のタグ・PR 更新が，進行中の検証・成果物の対象 SHA を変えない                                                                    |
| update の競合  | 連続したタグ更新と手動 full を同じ排他グループで扱い，実行中をキャンセルせず待機順に処理する                                          |
| review の競合  | 準備を含む実行中の Workflow はキャンセルせず，待機は一件だけ保持する．待機中の削除がデプロイ要求に置き換わっても，closed なら削除する |
| 差分と full    | 通常差分，空差分，初回タグ，比較失敗，巻き戻し，分岐移動，full の全件再実行                                                           |
| グラフ         | API から Web への経路，複数経路，長さ 0，入口なし，循環，自己ループ，不明な接続先                                                     |
| manual-pick    | 空引数，不明な名前，一部のみ実在，全指定が実在，実行可能な対象なし，応答時間                                                          |
| 準備           | 空の targets でも changes をテストする，テスト・生成失敗時にデプロイしない                                                            |
| 成果物の使用   | 同じジョブで生成した必要ファイルを deploy が使用する．ジョブ間転送や別 runner での再生成を必要としない                                |
| 設定生成       | 優先順位，候補内外の接続，Worker 名，routes 削除，入力不足，ローカル build                                                            |
| 実行と通知     | deploy なしのスキップ，一部失敗後の続行，失敗時の PR 通知，通知だけの失敗                                                             |
| クリーンアップ | 過去・途中終了のリソースを含め，共有・既存リソースを削除しない．close とデプロイの前後関係，再オープン，手動削除も確認する            |

方式未決定の項目を具体化し，現行コードとの差分を実装して，上記の検証結果を記録した時点で完了とします．以下に実装・検証の進捗を記録します．

## 実装・検証記録（2026-09-06）

### 実装した範囲

- 第 0 節: `@repo/env-config` → `@repo/app-config`，`e2e` → `ui_test` を先に移行した．Vitest の除外，TypeScript の include，collector の import，レポート識別子，workspace 依存，lockfile も変更した．改名前のパスは本書の比較記録にのみ残す．設計草案 `deploy-design-draft.md` は作業開始時点で存在しなかったため，確定版の設計を参照した．
- 第 3・4 節: 共通の deployment／global ローダー，workspace 列挙，4 mode の計画，反復 DFS による二方向探索，厳密な `TARGETS` 検証を実装した．旧 `runtime.yaml` と旧ローダーを削除した．6 パッケージに `deployment.yaml` を追加し，local の SELF は各 dev ポートへ揃えた．`xxxxx`・`yyyyy` は，設計に定めた `nushinkan2.workers.dev` と Worker 命名規則から導いた URL に置き換えた．実アカウント上の到達性は未検証である．
- 第 4 節: ルート `pnpm sync` が全ネイティブファイルを同期し，local の null は全件の更新成功後に消費する．`app-build` を追加し，local build と deploy build を分岐した．`materialize`・`sync` の bin 名は維持する．predeploy を撤去し，deploy は `.generated` と `dist` を使用する．dummy Web の `/__connection` は Worker の Service Binding を呼び，画面のボタンから応答を確認できる．テンプレート生成も新設定・Worker 名・SELF・ポートを引き継ぐ．
- 第 2・5 節: channel の full 受付で SHA を確定してから排他へ渡す．コメントは受付時の PR head を固定して `workflow_dispatch` へ渡す．PR の deploy／close／手動削除は `preview-pr-{番号}` を共有する．同じ checkout 上で install → compile → plan → sync → test → build → deploy を行う．選定前に sync を実行して差分へ混ぜない．Turbo deploy は `--only --continue=always --concurrency=100% --summarize` とし，パッケージ別ログと実際の exitCode を結果へ対応づける．
- 第 6 節: PR 状態は排他取得後と deploy 直前に再取得する．closed なら build 前，または deploy の代わりに cleanup する．cleanup と通知は Node 標準機能だけで動作し，全体 install／test／build を要求しない．checkout や setup の失敗も通知・保存する．結果とログは `.artifacts/deploy/` と `deploy-result` artifact に残す．通知のみの再試行は `preview-notify.yml` から元 run・PR・repository・Workflow を照合して実行する．
- 第 7 節: `detect-affected` と `affected-detection.yml` を撤去した．lint と UI テストは固定 SHA／`changes` を使う補助 CI とし，UI テストを deploy の成功条件にしない．light-tests の重複する単体テストジョブは準備フェーズへ集約した．

コメントからの実行は repository の write／maintain／admin 権限を持つ利用者と，同一 repository 内の main 向け PR に限定する．fork のコードへ Cloudflare 資格情報を渡す経路は設けない．通常の retag Workflow とその App token は変更していない．コメント受付の内部 dispatch は `GITHUB_TOKEN` の `actions: write` を使う．

### 確定した実装方式

| 項目              | 実装・証跡                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Turbo workspace   | 2.10.12 の `packages.items[{name,path}]` を実機で確認．全件は scripts の名前を含む 12 パッケージ，deploy script は 6 パッケージである                                                                                                                                                                                                                                                                                                                                                                                    |
| Turbo 終了状態    | 外部反映のない 2 パッケージの fixture を実行．a が exit 1，b が exit 0 となり，両方実行され全体は失敗．実装した `runDeploy` でも failure／success と `failed: true` を確認した．`tasks[].execution.exitCode` と各 `.turbo/turbo-deploy.log` を使う                                                                                                                                                                                                                                                                       |
| 早期入力検証      | Node 24 の標準ライブラリで workspace の package 名を読む．現在の `pnpm-workspace.yaml` の block-list 形式に対応し，未対応形式は異常終了する．依存のない fixture で不明な名前の通知と修正コマンドを確認（約 85 ms）．これは runner／GitHub API を含む 20 秒要件の実測ではない                                                                                                                                                                                                                                             |
| Worker 一覧・削除 | Cloudflare の [List Workers API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/list/) と [Delete Worker API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/delete/) を使用する．一覧失敗を空扱いせず，完全な PR サフィックスのみ対象にする．404 は許容し，呼出元削除後に接続先削除を再試行する．他 Worker の Binding まで除去し得る `force` は使用しない．依存循環や共有 Worker からの参照等で削除が進まなければ，残存を失敗として報告する |
| Actions queue     | [GitHub 公式仕様](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)に沿って update は max，preview は single を維持する．actionlint 1.7.12 は queue 未対応のため，その診断のみを限定除外し，残りの検査に成功した                                                                                                                                                                                                                                        |

### ローカル検証

| 検証             | 結果                                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 全単体テスト     | 90 件成功（9 パッケージの test タスク）．`pnpm exec turbo run test --only -- --run`．app-config・deploy 補助処理・collector・テンプレート生成・既存アプリのテストを実行 |
| 型検査・lint     | app-config の `tsc -b`，GitHub scripts の `tsc --noEmit`，変更した設定・deploy・テンプレート生成・dummy Web コードの ESLint に成功                                      |
| local build      | 4 アプリと両テンプレートの 6 件で成功．backend は Wrangler dry-run，frontend は tsc と Vite build                                                                       |
| deploy build     | staging／release／preview × 6 パッケージの 18 件で成功．最終設定の SELF preview 差し替えも検査した                                                                      |
| Wrangler dry-run | staging／release／preview × 6 パッケージの 18 件で成功．生成先を基準にした main／assets の解決を確認した                                                                |
| Vite 環境変数    | 両 Web と frontend template の実際の `resolveConfig` で development の localhost と deploy の preview URL が読み込まれることを確認した                                  |
| Actions          | 全 Workflow／composite action の YAML parse と actionlint（前述の queue 診断だけ除外）に成功                                                                            |
| 差分             | `git diff --check` と旧実行経路・旧名の参照検索を実施した．設計の比較記録や生成済み Cloudflare 型のサンプル文字列は改名対象外である                                     |

ローカルの build／dry-run ログは `.artifacts/deploy-validation/` に保存した（git 管理外）．コード変更に伴う生成物の `routeTree.gen.ts` の整形差分は戻した．実装変更は未コミットである．

### 実環境に残る確認

GitHub Actions の起動，コメント投稿，Cloudflare への実 deploy／削除はこの作業では実行していない．したがって，次の項目は未検証であり，run URL や実リソースの成功証跡はまだない．

- retag の App token push から後続 Workflow が起動すること．コメント dispatch と full 受付の SHA が待機中の更新に影響されないこと．queue の競合と PR close／reopen の前後関係．
- GitHub runner の cold cache を含む，manual-pick の返信までの 20 秒要件．fixture の所要時間をこの保証の代わりにしない．
- Cloudflare の実アカウント・`nushinkan2.workers.dev` の設定，preview 内と候補外 staging の Service Binding 通信．初回 staging で接続先 Worker が未作成の場合を含む deploy の挙動．
- 過去の改名・途中失敗を含む preview Worker の列挙／削除，共有資源の残存確認，通知失敗後の通知のみ再試行．

これらの実環境検証まで成功したことを，本記録は意味しない．第 0〜7 節のコード移行とローカル検証を完了し，実環境の結合検証を残した状態である．
