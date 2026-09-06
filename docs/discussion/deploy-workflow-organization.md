# Deploy workflow の整理方針

2026-09-06 時点の議論を記録する。配置と責務の方針をまとめたものであり、移行の完了を示す文書ではない。

## 目的

deploy workflow の可読性を高め、実際に運用できる状態へ接続する。既に整理が進んでいる connection graph や設定生成の構成を活かし、主に `scripts/workspace` と `.github` を整理する。

## 合意した方針

### Deploy action は4つに分ける

`full-deploy`、`update-deploy`、`review-deploy`、`pick-deploy` は異なるフローとして表現し、トリガーに応じて呼び分ける。全 mode を一つの deploy action に統合しない。

| action | フローとして表現する違い |
| --- | --- |
| `full-deploy` | 指定 SHA の全対象を選定して準備・デプロイする |
| `update-deploy` | 差分と依存関係から選定し、比較不能時は full 相当へフォールバックする |
| `review-deploy` | PR 差分と connection graph から preview 対象を選定し、PR 状態を確認して実行する |
| `pick-deploy` | 明示指定を検証し、依存関係と connection graph から preview 対象を選定して実行する |

各 action のステップから処理順序と違いを読めるようにする。短い YAML の重複は許容し、共通ロジックはスクリプトとして共有する。共通の巨大な入口へ mode や多数のフラグを渡してフローを隠す構成は避ける。

### スクリプトの配置

`.github/scripts/deploy` は削除する。deploy 関連処理は次の配置へ整理する。

| 配置 | 責務 |
| --- | --- |
| `.github/scripts/*.mjs` | 複数の action・workflow で共有する軽い GitHub 側の補助処理。GitHub API、結果要約の整形・出力など |
| `.github/actions/**/*.mjs` | 各 action 固有の入力解釈、ステップの補助、共有処理の呼び出し |
| `scripts/workspace/*.ts` | Worker 情報取得など、リポジトリ共通の実質的な処理。Turbo の薄いラッパーや `/preview` 固有の処理は置かない |
| `scripts/deploy/*.ts` | デプロイ計画、実行、結果集計などの重い共通処理 |

処理の長さだけでなく、共有範囲、GitHub への依存、依存インストール前に必要かどうかで配置を判断する。短くてもデプロイ結果の判定などの共通ロジックは `scripts/` に置く。

workflow はトリガー、checkout、環境、認証、排他、job 間の接続を担当する。各 deploy action はステップの順序を表現する。

`scripts/deploy/cli.ts` は削除する。各 action から必要な処理を呼べる構成にし、plan・task・deploy を振り分ける統合 CLI は維持しない。その専用ラッパーである `.github/scripts/deploy/commands.ts` も削除対象とし、同等のラッパーを `.mjs` に移植しない。処理別の実行入口を設けるか、補助スクリプトから関数を呼ぶかは、実行条件と合わせて決定する。

### ログ・結果要約・PR 通知

詳細ログは標準出力・標準エラーへ出し、Actions の実行ログで確認する。パッケージごとの成功・失敗や URL、失敗したステップなどの要約は `GITHUB_STEP_SUMMARY` へ出力する。PR 通知には要約と Actions run URL を載せ、詳細調査は Actions へ接続する。

- 通知だけを再試行する機能は削除する。通知失敗は Actions のログに残す。
- deploy の単なるログや通知用 report を artifact に保存しない。再通知用の report 永続化と、各フェーズでの逐次保存も廃止する。
- `record.mjs` は削除し、終了時に各ステップの結果とパッケージごとの実行結果から要約を作る。
- 処理間で必要な結果データは、一時ファイルやステップ出力などで受け渡してよい。受け渡し方式は未決定とする。
- HTML の UI テストレポートなど、ダウンロードして利用する成果物は別途 artifact に保存する。

## 移行案

以下は具体化のための案であり、新しいファイル名や補助 action の粒度は未確定とする。

| 現在の処理 | 移行案 |
| --- | --- |
| `scripts/deploy/cli.ts` | 削除する。入力検証など必要な責務は処理別の入口へ引き継ぎ、各 action から呼ぶ方式を定める |
| `.github/scripts/deploy/commands.ts` | 統合 CLI の削除に伴い削除する。後継の汎用コマンドラッパーは前提にしない |
| `record.mjs` と各入口に分散した report の読み書き | 削除する。逐次保存を廃止し、終了時の要約に必要な結果だけを受け渡す |
| `request.ts` | GitHub API 呼び出しを共有 `.mjs` へ分ける。`/preview` の解析・入力検証・利用方法やエラーの文言は `pick-deploy` 配下へ集約する |
| `early.mjs` | pick 固有の処理は `.github/actions/pick-deploy/parse.mjs`（入力の解析・正規化）と `check.mjs`（入力・実行条件の検証）へ分ける。PR 状態に応じた deploy・cleanup・skip の判断など、他のフローでも使う処理は分離する |
| GitHub 側の `cli.ts` | 廃止する。処理順序を4つの action に戻し、必要な補助だけ `.mjs` として切り出す |
| `ci.ts` | 利用するテスト action 配下の薄い `.mjs` にする |
| `notify.ts`、`notify-run.mjs` | 通常の PR 通知を action 配下へ整理し、要約と run URL を送る |
| `retry-notify.mjs` と `.github/workflows/preview-notify.yml` | 削除する。通知のみの再試行と、元 run・artifact の照合処理は維持しない |
| deploy ログ・report の artifact 保存処理 | 削除する。詳細ログは Actions ログ、要約は `GITHUB_STEP_SUMMARY` へ出力する |
| `cleanup-run.mjs` | cleanup action 配下へ移す |
| `cleanup.ts` | 各パッケージの preview 削除タスクへ責務を移し、Turbo で実行する。`scripts/deploy/cleanup.ts` への集約は前提としない |
| GitHub 側の `results.ts` | 永続 report の型を廃止し、deploy 結果型の重複を解消する。要約・通知に必要な一時データの型表現は JSDoc 等を候補とする |
| `scripts/workspace/query.ts` 等の Turbo ラッパー | Turbo を直接呼ぶ構成へ整理する。出力の検証・整形だけが必要なら action 配下の `.mjs`、共有する場合は `.github/scripts/turbo-parse.mjs` に置く。`/preview` 固有の検証・文言は `pick-deploy` へ移す |
| `vi-test` と `ui-test` の `prepare-filter.mjs` | `.github/actions/filter-limit` を追加し、その配下の `prepare-filter.mjs` へ集約する。両テスト action はタスク名とフィルタを渡してこの action を呼ぶ |

`filter-limit` は、指定タスクの Turbo dry-run から実行可能なパッケージを抽出し、インストール対象の依存フィルタと対象の有無を出力する。元のテスト対象フィルタは維持する。`test` と `ui_test` の違いは入力で表し、共通処理は action 単位で再利用する。`scripts/` の `.ts` への抽出は行わない。具体的な入力・出力名は実装時に確定する。

`scripts/deploy/results.ts` と `scripts/deploy/graph.ts` は共通ロジックとして現在の配置を維持する。`comment-reaction/*.mjs` は action 内で完結する補助処理の例として現在の配置が方針に合う。

## 移行時に維持する性質

- 対象 SHA を固定し、選定した計画を準備・実行へ渡す。update の full フォールバックでも不要な再選定をしない。
- review・pick・cleanup は PR 単位、full・update は channel 単位で排他を共有する。action の分割と排他の分割を混同しない。
- Worker 情報は計画時に選定対象へ付与し、準備時に再収集しない。
- 空対象を全件実行へ展開しない。準備失敗時は deploy せず、一部 deploy 失敗も結果として残す。
- 全体 install が失敗した場合も、ステップの結果から失敗の要約・通知ができるようにする。cleanup の実行条件も明示する。
- GitHub 側の共有 `.mjs` に、全 mode のフローを統括する大きな司令塔を再作成しない。

## 設計上の論点と決定事項

決定した方針と残る論点を分けて記録する。未決定の項目は、決定欄へ採用案・理由・検証条件を追記する。

### 1. 全体インストール前の入力検証

pick 固有の入力処理は `.github/actions/pick-deploy/parse.mjs` と `check.mjs` に分ける。`parse.mjs` はコメント等から指定パッケージを取り出して正規化し、`check.mjs` は指定内容と実行条件を検証する。

現状の `early.mjs` はコメント受付・権限確認・dispatch に加え、通常の PR deploy と cleanup でも使う PR 状態確認を含む。これらをすべて pick 配下へ移すのではなく、pick 固有の処理と共有処理を分離する。

workspace の列挙には `pnpm exec turbo ls --output=json` を直接使う。その前に `pnpm install --filter=.` でルート依存を準備する。依存のインストールを一切しないことは要件にせず、全体インストールに進む前に入力を検証する。

- 決定：ルート依存の準備後、対象の固定 SHA の checkout 上で Turbo に workspace を列挙させ、`check.mjs` で指定名を照合する。早期検証専用の workspace YAML 解析は廃止する。
- 理由：ルートにある Turbo を利用し、workspace 定義の解釈を独自実装せずに済ませる。全パッケージの依存をインストールする前に不正な指定を検出できる。
- 検証条件：依存未導入の checkout で、ルートのみのインストールから列挙・名前照合まで動作すること。インストール範囲と cold cache 時の所要時間を確認する。列挙失敗や不正な出力は空一覧として扱わず、検証失敗として報告する。
- 残る論点：コメント受付時と固定 SHA の checkout 後で、それぞれ何を検証するか。内部 dispatch を行う受付側から pick の補助スクリプトを呼ぶ方法と、dispatch 自体の配置。
- 残る論点の決定：TODO

### 2. Cleanup の配置と実行方式

各パッケージに PR 番号を必須入力とする preview 削除タスクを設け、Turbo でまとめて実行する。タスク名は `preview:prune` を仮称とし、正式名称は別途決定する。各パッケージが自身の対象リソースを解決して削除し、workflow は PR 番号の検証、タスクの実行、結果の要約・通知を担当する。

- 決定：preview Worker の削除では force を利用する。パッケージ側の薄い削除処理層で、対象 Worker が既に存在しない場合を成功扱いにする。依存関係の解消を待つ再試行、削除順序の制御、循環の解消処理は設けない。workflow は Turbo による削除タスクの実行と結果の報告を担当する。
- 前提：preview Worker への参照元は同じ PR の削除対象内に閉じる。preview の破棄中に参照関係や通信が壊れることは許容する。削除対象名は PR 番号とパッケージの設定から確定し、共有環境や別 PR の Worker を削除対象に含めない。
- 理由：破棄する preview 内の参照を維持する必要はなく、force を使うことで依存関係に応じた順序制御と再試行を省ける。不存在の正常化は削除処理層で扱い、cleanup を再実行できるようにする。
- 検証条件：参照が残る preview Worker を force で削除できること。削除済みの Worker は成功扱いになること。認証失敗などを不存在として握りつぶさず、削除失敗と残存対象を報告すること。共有環境や別 PR のリソースへ影響しないこと。
- 残る論点：タスク名、PR 番号の渡し方、必要な依存の準備範囲、削除処理層の配置と Wrangler／API の使い分け。通信障害やレート制限への上限付き再試行を設けるか（依存関係待ちの再試行とは別）。削除・改名されたパッケージの過去リソースを別途回収する運用。
- 残る論点の決定：TODO

force は関連 Binding 等による削除の阻止を解除する指定であり、不存在を成功扱いにする指定ではない。API の動作は [Cloudflare Delete Worker API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/delete/) を参照する。

### 3. 共通補助と action 固有処理の粒度

まず `full-deploy`、`update-deploy`、`review-deploy`、`pick-deploy` を実装し、それぞれのフローを読める状態にする。その後、実装上の肥大化や重複を確認して、補助スクリプトや共通 action を抽出する。抽出の粒度は実装を通じて判断する。選定したパッケージ一覧や実行結果など、ステップ間の受け渡しも各 action の実装時に具体化する。テストと CI の接続も実装時に決め、変更した処理の複雑さや影響に応じて必要な検証を行う。軽い補助 `.mjs` に対する型検査は必須としない。

- 決定：共通補助の構成を事前にすべて確定することを、各 deploy action の実装開始条件にしない。短いステップ列や補助処理の一時的な重複は許容する。
- 判断基準：各 action の処理順序と違いが読み取れること。抽出によって見通しがよくなり、同じ責務の修正を複数箇所へ反映する負担が減ること。共有化のために多数のフラグや分岐が必要になる場合は、個別の実装を維持する。
- 配置：action 固有の補助はその配下の `.mjs`、複数 action で共有する軽い補助は `.github/scripts/*.mjs`、重い共通処理は `scripts/` の `.ts` とする。ステップ単位での共有が自然なら共通 action として抽出する。
- 残る論点：通知・cleanup・コメント受付を独立 action にする範囲、共有 `.mjs` の公開関数とファイル構成は、各フローの実装後に見直す。既に方針を決めた `filter-limit` などはその方針に従う。
- 抽出・見直しの記録：TODO

### 4. Workspace の API と責務

Turbo は呼び出し元から直接利用し、単に Turbo を起動して出力を整形して返すための TypeScript ラッパーは廃止する方針とする。出力の検証・整形が必要なら action 配下の `.mjs` へ置き、複数 action で共有する場合は `.github/scripts/turbo-parse.mjs` にまとめる。

- 決定：`scripts/workspace` に汎用 Turbo ラッパーを設けない。GitHub 側の整形補助は必要な範囲にとどめ、別の汎用 Turbo API を作り直さない。
- 決定：`/preview` は `pick-deploy` 固有のコマンドとする。コマンドの解析・正規化は `pick-deploy/parse.mjs`、指定名の照合等は `pick-deploy/check.mjs` に置く。Usage、エラー、修正候補などの表示文言も同 action 配下へ集約し、workspace 共通処理に混ぜない。
- 理由：Turbo 自体の機能を直接読めるようにし、薄い中継層を減らす。利用者向けのコマンド仕様は、それを受け付ける action 内で完結させる。
- 残る論点：connection graph など GitHub 外の利用者も踏まえ、既存の workspace 列挙処理と CLI の要否を整理する。Worker 情報取得など残す実質的な処理の入出力、root の渡し方、Git 比較処理の配置を決める。
- 残る論点の決定：TODO

## 作業順序の案

1. 実装に必要な実行条件と入出力を定め、workspace の責務を整理する。共通補助の粒度は事前にすべて確定しない。
2. 4つの deploy action のフローをまず実装する。肥大化・重複が見えた部分を、配置方針に沿って補助スクリプトや共通 action へ抽出する。
3. Summary・PR 通知・cleanup を整理し、report の逐次保存、deploy ログの artifact 保存、再通知機能と `.github/scripts/deploy` を削除する。
4. workflow の参照と CI を接続し、旧入口・空 action・古い参照を整理する。
5. 単体・結合検証後、検証用 preview、staging、release の順に実運用を確認する。

実環境では固定 SHA、排他、PR close との競合、preview 接続、途中失敗後の cleanup、失敗時の Summary・PR 通知、通知失敗時のログを確認し、run URL と結果を記録する。

## コード移行の記録

4つの deploy action をトリガーへ接続し、統合 CLI、旧 `scripts/workspace/query.ts`、`.github/scripts/deploy`、deprecated action、再通知 workflow を撤去した。full は channel だけを受け取り、全件 test/build を Turbo で直接実行する。preview 用入力・差分入力・plan ステップを持たない。

フィルタ共通 action は実装中の整理により `refine-filter` とし、`direct_args`・`deps_args` を返す。各 Worker パッケージとテンプレートには `preview:prune` を登録した。API に対する削除処理は `scripts/deploy/prune.ts` を共有し、force と既に不存在の場合の正常化を行う。

現行の接続は [.github/WORKFLOWS.md](../../.github/WORKFLOWS.md) に記載する。ローカルの単体・選定経路・YAML と action 入力参照の検査を実施した。実際の Cloudflare deploy/削除と GitHub 上の実行は行っていない。
