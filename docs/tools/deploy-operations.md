## デプロイ運用ガイド

このドキュメントは、環境差分を伴う build/deploy の実運用手順をまとめたものです。

## 日常運用フロー

1. まずローカル配布差分を確認する。

```sh
pnpm env:sync:local --check
```

2. 差分を反映する。

```sh
pnpm env:sync:local --apply
```

3. 必要な環境で生成する。

```sh
pnpm env:materialize --env staging --app organization-web-app
pnpm env:materialize --env preview --app organization-content-service --pr-number 123
```

4. 対象appだけ build/deploy する。

```sh
pnpm --filter @repo/organization-web-app run build:staging
pnpm --filter @repo/organization-content-service run deploy:staging
```

## PR Preview 自動化

1. pull_request イベントで preview deploy が自動実行される。
2. 対象選定は base branch 差分を基準に行い、変更appのみを対象にする。
3. deploy 前に、変更された frontend app（`playwright.config.ts` を持つ app）の E2E が必須で実行される。
4. frontend 対象が 0 件のときは E2E は skip 扱いで deploy を継続する。
5. PR番号は PR_NUMBER として preview 生成名 `-preview-pr-{PR_NUMBER}` に反映される。

対象 workflow:

- .github/workflows/on-pr.yml

## Frontend E2E（ルート統合）

1. frontend E2E はルート workflow で一元管理する。
2. app 配下や template 配下の `.github/workflows` は持たない。
3. `apps/*` を走査し、`playwright.config.ts` がある app を自動で対象化する。

対象 workflow:

- .github/workflows/e2e-frontend.yml

## PRコメント自動化

1. preview deploy 結果は PR コメントへ自動反映される。
2. 同一マーカーコメントを更新するため、コメントは増殖しない。
3. 成功時は preview URL を表示する。
4. 失敗時はエラー要約のみ表示する。
5. PR close 時は preview コメントを削除する。

## トラブルシュート

1. ローカル設定のズレ確認

```sh
pnpm env:sync:local --check
```

2. 生成物の再作成

```sh
pnpm env:materialize --env preview --app organization-content-service --pr-number 999
```

3. 生成結果確認

```sh
cat apps/organization-content-service/.generated/wrangler.preview.jsonc
cat apps/organization-web-app/.generated/.env.preview
```

4. 対象appで dry-run

```sh
TURBO_SCM_BASE=<base_sha> TURBO_SCM_HEAD=<head_sha> pnpm turbo run deploy --affected --only --filter=./apps/organization-content-service --dry-run=json
TURBO_SCM_BASE=<base_sha> TURBO_SCM_HEAD=<head_sha> pnpm turbo run dev --affected --dry-run=json
```

## 設定ファイル

環境設定の単一ソースは次の YAML ファイルです。

- packages/env-config/runtime.yaml

最小スキーマ例:

```yaml
globals:
	local:
		SELF: XXXX
	release:
		SELF: YYYY
	staging:
		SELF: ZZZZ

apps:
	someapp:
		local: {}
		release: {}
		staging: {}
		preview: {}
```

`preview` は未指定時に `staging` を流用する。

`materialize` と `sync-local` は app ごとに `.env.development`/`wrangler.jsonc` の有無で frontend/backend の処理対象を判定する。
frontend 側の `VITE_` プレフィックスは、生成・同期時に付与する。
