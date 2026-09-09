# Instructions for Test Scope

> **Applies to:** Creating, changing, or removing tests

作業前に[テスト方針](../../../docs/testing-policy.md)を読み、検証対象の判断とテスト設計に従う。既存実装を根拠に方針の例外を設けない。

特に、次の禁止事項を守る。

- テスト中にCLIツールを呼び出さない。CLIエントリーポイントをテスト・importしない。
- 標準機能や単純な委譲・入出力をテストしない。
- GitHub Workflowをテストしない。YAML・シェル・Actionの代替テストも作らない。
