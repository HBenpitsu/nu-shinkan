#!/usr/bin/env bash
set -euo pipefail

# このリポジトリでは remote のタグを正とする。
# すでに同じ refspec があれば追加しないことで、postCreate の再実行時も重複登録を防ぐ。
if ! git config --local --get-all remote.origin.fetch | grep -Fxq '+refs/tags/*:refs/tags/*'; then
	# "+" 付き refspec により、同名タグが食い違っていても fetch で local を remote 側へ合わせる。
	git config --local --add remote.origin.fetch '+refs/tags/*:refs/tags/*'
fi

# remote で削除されたタグを local からも削除する設定を有効化する。
git config --local fetch.pruneTags true

# ここで即時 fetch して、上記設定を次回以降ではなく今この postCreate で反映させる。
# --prune は追跡ブランチ掃除、--prune-tags は削除済みタグ掃除を行う。
git fetch --prune --prune-tags origin
