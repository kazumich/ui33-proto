# ステータス用 RichSelect

カテゴリーと同じ `@ablogcms/components/rich-select` を使うテーマ用バンドル。
CMS 本体のビルドや外部 CDN に依存せず、生成済み JS をテーマと一緒に配置する。

- 元の `select[name=status]` を送信用に残し、変更イベントも発火する。
- 解除と検索は無効。Backspace でも解除しない。
- 選択肢・初期値はテンプレートの select から取得する。
- JS を読み込めないときは通常の select が残る。

## 再ビルド

このディレクトリで `npm ci`、`npm run build` を実行する。
バンドルは `themes/editor@beginner/js/entry-status-select.js` に出力される。

## サーバー反映

利用テーマの次の2ファイルをアップロードする。

- `admin/_layouts/entry/edit.html`
- `js/entry-status-select.js`

ソースと node_modules をサーバーに配置する必要はない。
