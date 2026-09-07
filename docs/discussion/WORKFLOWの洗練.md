1. 単一のワークフローが長大なため，とくに複数のワークフローで共有されている部分を新たにgithub actionsに切り出す
    1. actionになることによって，補助スクリプト(.mjs)への切り出しも行えるようになる．
    2. 典型的な共有部分は
        1. 結果コメントの構築・送信アクション
        2. PRの状態確認アクション
2. ui_test:prepareなどのキャッシュができないか，キャッシュされているのか検討する
3. update.update-deploy.yml内に
4. テストの種類で環境変数TESTの内容を変える．-> ui-test, vi-testをこれに対応
    1. 単体テストはTEST=UNIT, 
    2. パッケージ単位のテストの場合は TEST=PACKAGE
    3. 統合テスト(e2eテスト)の場合は TEST=INTEGRATION 
        1. 統合テストの実行は <- ui-test, vi-testとはまた異なるaction integration-testを用意するのが良い．workflowとしては，integration-testはローカルで実行されるより，staging profileで実行されるようにしたい．（データ操作を伴う可能性を考慮し，release profileで実行するべきではない．）タイミングについてはstagingデプロイ時/nightlyのどちらがいいのか要検討．

        workflowの文脈とは離れるが，integration-testをローカルでも実行できるようにすることには意味が有る．test時のプロファイルもlocal/stagingで差し替えられる仕組みがあればよい．

        通常，テストはlocalプロファイルで実行されるが，stagingプロファイルでビルド & テストできる新たな仕組み（deploy-artifactのようにtest-artifactを生成する）などを検討する必要がある．
    4. また，現状存在するすべてのテストはパッケージ単位テストであるものとする．
5. 冗長なフローを整理する．
    1. update.updat-deploy.ymlがupdate.full-deploy.ymlへのフォールバック機能を持っているにも関わらず，on-tag-change.ymlにもフォールバックの仕組みが有る．
    2. デプロイURLの報告に`/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i`が使われているが，カスタムドメインが使用されている場合，このパターンには当てはまらないので，修正が必要．
    3. ./.github/actions/use-repoのスキーマがfilterを含むのは適切か？
       リポジトリルートと@repo/scriptsだけ解決させて，あとは呼び出し元がpnpm installするほうがいいのでは？
6. workflow.yamlの流儀を揃える．
    1. actions/github-script@v7を使うのか，node --input-type=module <<'EOF'...EOF'を使うのか. はたまたJS...JSか．jsonの取り回しに便利 & 見やすいので，JSの利用は必至だが，素のshellと使い分ける基準は？
7. 自動レビューフローを追加する．