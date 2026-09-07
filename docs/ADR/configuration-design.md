> **For agents:** This document is the authoritative design; align the implementation with it. Design changes require explicit user instruction.

# このドキュメントの目的

このドキュメントは，実行時環境変数の取り扱いに関して説明することを目的としたドキュメントです．

ここで言う実行時環境変数とは，クライアントサイドや，デプロイされたWorkerの中で参照可能な環境変数のことを指します．

たとえば，クライアントサイドの実行時環境変数はビルド時に展開されて組み込まれる必要があります．デプロイされたWorkerの中で参照可能な環境変数は，wrangler.jsoncに記入されたものです．いずれの場合でも，開発マシンのシェル環境変数とは異なります．

# Workerの命名規則

`release`プロファイル向けのworkerのsuffixには自動で`-release`が付され，
`staging`プロファイル向けのworkerのsuffixには自動で`-staging`が付される．

`wrangler.jsonc`の`name`フィールド，`serviceBinding`の設定では，suffixなしの素のworker名を記入すれば良い．`env`フィールドで別途設定する必要などはない．
D1やKVなどのリソースに関しても同様の命名規則と自動bind機構を持つものとする．

# URLを指定する環境変数の書式

`API`などの環境変数に，APIを提供するWorkerへの接続を設定する場合，ベースURL(プロトコル，ドメイン，場合によってはパス`api/`など．e.g. `https://subdomain.domain/api/`)の形式で指定する．

# 実行時環境変数を記入するべき場所

Viteプロジェクト（frontend）であれば，実行時環境変数は`.env.development`に，`VITE_`プレフィックスを付して記入する必要があります．

Honoプロジェクト（backend）であれば，実行時環境変数は，`wrangler.jsonc`の`vars`フィールドに記入する必要があります．

以下，`.env.development`，`wrangler.jsonc`を*ネイティブファイル*と呼びます．

なお，これらはgit管理下にあるため，クレデンシャルは記入しないでください．
クレデンシャルはGithub Secretで別に管理します．

# デプロイ設定ファイル `deployment.yaml`

各パッケージには，以下の書式を持つ`deployment.yaml`を配置することが期待される．

```yaml
envs:
  # local向けの環境変数の設定値は.env.developmentやwrangler.jsoncに書きます．
  release:
    [環境変数名]: [releaseプロファイルでの設定値]
  staging:
    [環境変数名]: [stagingプロファイルでの設定値]

connections:
  bindings:
    [BINDING名]: [Service Workerのパッケージ名 @repo/xxxxなど]
  urls:
    [環境変数名]: [APIを提供するWorkerのパッケージ名 @repo/xxxxなど]

reviewEntry: [boolean]
```

## envs

`envs`フィールドには，環境によって上書きする必要のある環境変数の設定を書き込む．たとえば，環境変数`ENV`がlocal環境では`LOCAL`, staging環境は`STAGING`, release環境では`RELEASE`になってほしい場合は次のように設定する．

1. ネイティブファイル(`.env.development`，`wrangler.jsonc`)で`LOCAL`を指定
2. `deployment.yaml`で次のように指定

```yaml
envs:
  release:
    ENV: RELEASE
  staging:
    ENV: STAGING
```

`envs`フィールドで指定の無い環境変数については，ネイティブファイルの設定を引き継つぐ．

## connections

`connections`は`preview`チャンネルデプロイ時に使用される．

`preview`チャンネルデプロイ時には，基本的には`staging`プロファイルの設定値が使われる．ただし，

- `connections.bindings`に設定されたBINDING名をもつService Binding(`wrangler.jsonc`の設定項目)は，そのserviceを，必要なら，設定されたパッケージをデプロイした`preview`用ワーカーに差し替えられる．
- `connections.urls`に設定された環境変数は，その内容を，必要なら，設定されたパッケージをデプロイした`preview`用ワーカーへのベースURLに差し替えられる．

実際に差し替えが発生する条件に関する詳細な説明は，deployに関する文書を参照のこと．

## reviewEntry

`reviewEntry`は`review`モードデプロイ時に使用される．
`reviewEntry`は，変更を人間が確認するためにデプロイが必要なパッケージであるかを表す．典型的には，frontendプロジェクトでれば`true`, そうでなければ`false`である．
`true`が指定されている場合，`connections`が張る利用関係グラフで，変更のあったパッケージへのパスがあればプレビュー用にデプロイされる．

## 省略時の振る舞い

それぞれのフィールドについて省略時は次のように解釈される．

- **`reviewEntry`:** `false`
- **`connections.bindings`:** 空のマッピング
- **`connections.urls`:** 空のマッピング
- **`connections`:** bindings，urls双方が空のマッピングである
- **`envs.release`:** 空のマッピング
- **`envs.staging`:** 空のマッピング
- **`envs`:** release, stagingが空のマッピングである

**`reviewEntry`**については，不正値は警告して`false`にフォールバックする．

`deployment.yaml`自体がパッケージ内に存在しない場合は，すべての項目が省略されたものとみなす．

# app-configによる実行時環境変数の配布

`packages/app-config`パッケージの`globalRuntimeEnvs.yaml`で，全パッケージで利用される実行時環境変数を設定できる．書式は次の通り．

```yaml
local:
    [環境変数名]: [設定値]
    [環境変数名]: null
staging:
    [環境変数名]: [設定値]
release:
    [環境変数名]: [設定値]
```

`local`フィールドの設定値は，`sync`スクリプトで，各パッケージに配布される．
つまり，`sync`スクリプトは，`local`フィールドの設定値に基づいてネイティブファイル（`.env.development`, `wrangler.jsonc`）の内容を書き換える．

書き換え動作は基本的には追加であり，同名の環境変数の設定があった場合はそれを上書きする．ただし，`null`が設定された環境変数の設定は，`sync`スクリプト実行時に，各パッケージの設定ファイル・`globalRuntimeEnvs.yaml`から同時に取り除かれる．

`staging`, `release`フィールドの設定値は，デプロイアーティファクトの生成時に取り込まれて利用される．

# 実行時環境変数設定の優先順位

環境変数の設定値は，優先順位が高い方から順につぎのようになる:

1. `preview`用の上書き
2. `deployment.yaml`における`envs`フィールドでの設定
3. `globalRuntimeEnvs.yaml`における設定
4. 各プロジェクトの環境変数設定ファイルによる設定

`globalRuntimeEnvs.yaml`の`local`フィールドは，`sync`スクリプトの実行まで効力を持たないことに注意する．

## リポジトリ処理とパッケージ処理の責務

`packages/app-config` は各パッケージの設定読み取り・変換・生成を担当し、workspace列挙や他パッケージの設定ファイル読み取りは行わない。リポジトリ全体の列挙・接続グラフ・同期・接続先情報収集は `scripts/` が担当する。

`pnpm sync` は `scripts/sync-env/sync.ts` から `turbo run sync:local` を実行し、`sync:local` を登録した全パッケージへの反映に成功してから共有local設定のnullを削除する。タスク未登録のパッケージは配布対象外とする。各パッケージの `sync:local` はapp-configの `sync-local` CLIを実行する。app-configの単一パッケージ更新処理は`globalRuntimeEnvs.yaml`を変更しない。
