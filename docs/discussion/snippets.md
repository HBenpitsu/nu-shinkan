TEST時のメイン発火を防ぐエントリーポイント

```ts
function main() {
    ...
}

if (!process.env.VITEST) main();
```