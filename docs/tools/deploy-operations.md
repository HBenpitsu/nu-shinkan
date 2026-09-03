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
2. 変更appのみが対象になる。
3. PR番号は PR_NUMBER として preview 生成名に反映される。

対象 workflow:
- .github/workflows/deploy-preview-by-pr.yml

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
pnpm --filter @repo/organization-content-service run deploy:preview --dry-run
pnpm turbo run deploy:preview --filter=./apps/organization-content-service --dry-run=json
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
