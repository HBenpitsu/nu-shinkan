# frontend-templateの利用

1. このテンプレートを`apps/`配下にコピーします

```sh
cp -r templates/backend-template apps/xxxx
```

2. `package.json`, `wrangler.jsonc`のnameフィールドをアプリ名に書き換えます．

```json
{
  ...
	"name": "xxxx",
  ...
}
```

3. `package.json`のdevDependenciesに，利用する他のbackendを記述します．

```json
{
  ...
  "devDependencies": {
    ...
    "yyyy": "workspace:*",
    ...
  }
  ...
}
```

4. 依存関係を解決します．

```sh
cp apps/xxxx
pnpm install
```

# import エイリアスの追加

1. `tsconfig.app.json`のpathsフィールドに追記します．
