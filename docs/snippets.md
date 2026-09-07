## TEST時のメイン発火を防ぐエントリーポイント

```ts
function main() {
    ...
}

try {
    if (!process.env.VITEST) main();
} catch {
    // エラーハンドリング
}
```

## TESTのためだけに公開するインタフェース

```ts
function someTestedFunction() {
    // ...
}

export const testExports = {
    someTestedFunction
}
```