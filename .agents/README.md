# `.agents/` ディレクトリについて

`.agents/` は、このリポジトリで作業する AI Agent 向けの指示、方針、手順を管理するためのディレクトリです。

ここに置かれる文書は、リポジトリそのものの仕様や設計を説明する `docs/` とは役割が異なります。

* `docs/`
  * リポジトリについて理解するための文書
  * 設計、仕様、運用方法、議論記録など
  * 人間と AI Agent の両方が参照しうる

* `.agents/instructions/`
  * AI Agent 自身がどのように振る舞うべきかを定める文書
  * 方針、制約、禁止事項、判断基準など

* `.agents/skills/`
  * 特定の作業を実行するための具体的な手順や方法
  * タスク固有の workflow や reusable procedure

## ディレクトリ構成

`.agents/instructions/` はフラットである必要はありません。
Instruction が増えて見通しが悪くなった場合は、対象領域や目的ごとにサブディレクトリへ整理して構いません。

例えば:

```text
.agents/
├── README.md
├── instructions/
│   ├── documentation/
│   │   ├── writing-documents.md
│   │   └── protected-documents.md
│   ├── ci/
│   │   ├── github-actions.md
│   │   └── deployment.md
│   ├── code/
│   │   └── dependency-management.md
│   └── ...
└── skills/
    ├── some-skill/
    │   └── SKILL.md
    └── ...
```

サブディレクトリ名も discovery の手掛かりになります。
そのため、`misc/` や `other/` のような意味の弱い分類より、対象領域が分かる名前を優先してください。

## Instructions と Skills の使い分け

### Instructions

`.agents/instructions/` には、Agent の振る舞いに対するルールを置きます。

例えば、次のような内容です。

* ドキュメントを作成するときの方針
* GitHub Actions を編集するときの制約
* 設計文書を保護するためのルール
* 変更してはいけない領域
* ユーザーへの確認が必要になる条件
* リポジトリ固有の判断基準

基本的には、次のような内容が Instructions に向いています。

> 「X を行う場合、Agent は Y のように振る舞うこと」

### Skills

`.agents/skills/` には、特定の目的を達成するための手順や方法を置きます。

例えば、次のような内容です。

* Preview 環境をデプロイする
* 新しい workspace を追加する
* Release を作成する
* 特定の検証手順を実行する
* 特殊なツールを用いてコード生成する

基本的には、次のような内容が Skills に向いています。

> 「X を達成するには、次の手順で実行すること」

Instructions は主に 方針 / 制約 / 不変条件 を表し、Skills は 手続き / ワークフロー / 技術 を表します。

境界が曖昧な場合は、無理に分割する必要はありません。短い手順を含むルール文書であれば、そのまま Instruction として管理して構いません。

## Instruction の discovery

`AGENTS.md` では、個別の Instruction ファイルを列挙しません。

新しい Instruction を追加するたびに中央の index を更新する方式は採用しません。

Agent は `.agents/instructions/` を再帰的に探索し、次の順序で必要な Instruction を発見します。

1. `.agents/instructions/` 以下のディレクトリ構造、パス、ファイル名を確認する
2. パスやファイル名から関連しそうな候補を選ぶ
3. 必要であれば候補ファイルの冒頭にある適用条件を確認する
4. タスクに適用される Instruction のみ全文を読む
5. 適用されるすべての Instruction に従う

この方式を成立させるため、ディレクトリ名、ファイル名、Instruction 冒頭の適用条件を discovery metadata として扱います。

## ファイル名とディレクトリ名

ファイル名は、その Instruction の対象が推測できる具体的な名前にします。

推奨:

```text
documentation/writing-documents.md
ci/github-actions.md
ci/deployment.md
code/dependency-management.md
database/migrations.md
```

非推奨:

```text
misc/rules.md
other/notes.md
instruction-01.md
stuff/misc.md
```

ファイル名だけで完全な適用範囲を表現する必要はありませんが、候補を絞り込める程度には具体的であるべきです。

階層化は整理と discovery のために使います。単にファイル数を均等に分散させる目的で、意味のない階層を追加しないでください。

## 適用条件

すべての Instruction は、文書の冒頭で適用条件を明示します。

適用条件には，例えば次のような情報を含みます．

- Instructionが有効であるディレクトリ e.g. "This is effective in xxx/..."
- Instructionが有効なタスクの種類 e.g. "When writing documents in docs/ for future reference..."

推奨形式:

```md
# Instructions for Writing Documents

> **Applies to:** Creating, editing, or restructuring repository documentation,
> including README files, design documents, reference documents, discussion
> documents, and operational procedures.

## Rules

...
```

`Applies to` はタイトルの直後など、ファイルの先頭付近に置いてください。

Agent が全文を読み込まずに適用条件だけ確認できるようにすることが目的です。


## 中央 index を作らない

`AGENTS.md` やこの `README.md` に、Instructions や Skills の完全な一覧を維持しないでください。

一覧を中央管理すると、新しい文書を追加するたびに複数ファイルの更新が必要になり、index が実態とずれる原因になります。

代わりに、以下を discovery metadata として利用します。

* ディレクトリ構造
* パス
* ファイル名
* Instruction 冒頭の applicability
* Skill が持つ metadata

新しい Instruction や Skill は、その適切なディレクトリに追加するだけで discovery 可能になる構造を維持してください。

## 階層化の方針

Instruction の数が少なく、フラットな構造で十分に見通せる場合は、無理にサブディレクトリを作る必要はありません。

一方で、次のような場合は階層化を検討してください。

* 同じ領域に属する Instruction が複数増えた
* ファイル名だけでは一覧性が悪くなった
* 異なる領域の Instruction が混在し、候補選択が難しくなった
* ディレクトリ名を付けることで applicability の大まかな分類が明確になる

階層構造も discovery の一部であるため、分類は対象領域や目的に基づいて行ってください。

中央 index を作る代わりに、ディレクトリ構造そのものを粗い分類として利用します。

## `docs/` との関係

`.agents/` と `docs/` は相互に参照して構いません。

例えば、Instruction がリポジトリの設計上の制約を Agent に守らせる場合、設計そのものを Instruction に複製するのではなく、`docs/` 内の設計文書を参照してください。

原則として、

* 「リポジトリがどうなっているか」は `docs/`
* 「Agent がそれに対してどう振る舞うか」は `.agents/instructions/`
* 「Agent が具体的にどう作業するか」は `.agents/skills/`

に置きます。

## `.agents/` 自体を変更するとき

`.agents/` 配下の構造、Instructions、Skills を追加・変更・整理するときは、この README の方針に従ってください。

特に次の点を維持してください。

* `AGENTS.md` に個別ファイルの index を作らない
* `.agents/instructions/` が階層化されうることを前提にする
* ディレクトリ名とファイル名を discovery metadata として有効に使う
* Instruction は具体的なファイル名を使う
* 適用条件を文書冒頭に置く
* リポジトリの設計情報を Agent 用文書へ不必要に複製しない
* Instructions と Skills の役割を必要以上に混同しない
* 新しい文書を追加しただけで discovery 可能な構造を維持する
