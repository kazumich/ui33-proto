# エントリー編集画面 2カラム化 — 最終仕様

次バージョンの管理画面UI検討用として、エントリー編集画面を2カラムに再構成した試作の仕様書。

- 対象URL
  - `/bid/1/admin/entry-edit/` （管理ナビ非表示）
  - `/bid/1/admin/entry_editor/cid/1/eid/78/` （管理ナビ表示）
  - どちらも `admin/entry/editor.html` 経由で同じレイアウトを使う
- `themes/system` は未変更
- 最終更新: 2026-09-14

> **このリポジトリを読む人へ**
>
> 本書は開発環境で書き進めた記録をそのまま持ってきたもの。
> 1〜16章は、最初に `themes/site` を直接上書きして作っていた頃の記述になっている。
> **このリポジトリに入っているのは子テーマ版（`themes/editor@beginner`）だけ**で、
> そちらの説明は17章にある。
>
> 1〜16章を残しているのは、数値の根拠・試した結果・踏んだ落とし穴が
> ファイルの持ち方に関係なくそのまま通用するため。
> 「なぜその値なのか」を知りたいときはそちらを読んでほしい。

## 配置場所は2つある（開発環境での話）

| | 用途 |
|---|---|
| `themes/site`（直接上書き） | 最初に作った試作。開発環境にのみ存在する |
| `themes/editor@beginner`（子テーマ） | `beginner` に載せる形へ切り出したもの。**これがこのリポジトリの中身** → 17章 |

本書の1〜16章は `themes/site` 版を基準に書いている。
子テーマ版は中身は同じで、**ファイルの持ち方だけが違う**（17章に差分をまとめた）。

---

## 1. 変更・追加したファイル

| ファイル | 区分 | 内容 |
|---|---|---|
| `web/themes/site/admin/_layouts/entry/edit.html` | 新規 | `themes/system` の同パスを上書きする2カラム版レイアウト |
| `web/themes/site/include/edit/custom.css` | 追記 | レイアウト・入力欄のカスタムCSS（既存ファイルの末尾に追記） |
| `web/themes/site/include/edit/custom.js` | 追記 | 高さの実測、改行抑止、flatpickr 設定 |
| `web/themes/site/admin/entry/field-main-image.html` | 変更 | `.js-droparea` の `style="width:200px"` を削除 |
| `web/themes/site/admin/entry/field_base.html` | 新規 | カスタムフィールドのスロット（メイン画像を読み込み） |
| `web/themes/site/admin/entry/field_side.html` | 新規 | カスタムフィールドのスロット（SEO設定を読み込み） |

`custom.css` / `custom.js` は `web/themes/site/admin.html` が読み込む（既存の仕組みをそのまま利用）。

```html
@section("editor-css")
<link rel="stylesheet" href="/include/edit/custom.css">
@endsection

@section("admin-js")
@parent
<script src="/include/edit/custom.js" charset="UTF-8"></script>
@endsection
```

### システムテンプレートとの差分

`themes/system/admin/_layouts/entry/edit.html` に対して、

- `@section` 名（19個）・`@include` のパス・`input` の `name` / `id` は**すべて維持**
- 追加したのは `name="ecd_blank"` のチェックボックスと、スロット用の `@include` 2本のみ
- 保存に関わるフォーム構造（`entry[]` の hidden、バリデータ、保存バー）は変更なし

---

## 2. DOM構造

```
#entryForm
└ .entryFormBody                 ← コンテナクエリの基準
  └ .entryFormWrapper
    └ .entryFormGrid .acms-admin-cssgrid
      ├ .entryFormSide           ← DOM順1番目 / 2カラム時は「右」
      │ └ .entryFormSideInner .acms-admin-field-container
      │   ├ .entryFormHead > table.entryFormTable
      │   │   ステータス / タイトル / カテゴリー / サブカテゴリー /
      │   │   タグ / 日時 / 会員限定
      │   ├ @include field_base.html            ← スロット
      │   ├ details#js-entry-details「詳細設定」
      │   │   ファイル名 / 公開日時 / 掲載期限 / インデキシング / リンク先URL
      │   └ @include field_side.html            ← スロット
      └ .entryFormMain           ← DOM順2番目 / 2カラム時は「左」
        ├ 位置情報 / 関連エントリー
        ├ @include field.html                   ← スロット
        ├ #entry-unit-display（ユニットエディター）
        └ @include field_foot.html              ← スロット
.acms-admin-entry-form-sticky-container（保存バー）← .entryFormBody の外
```

### DOM順を「メタ情報 → 本文」にしている理由

1カラムに戻ったとき、この順に縦積みされて**元の1カラムレイアウトと同じ並び**（メタ情報が本文の上）になる。
2カラム時は `grid-area` で位置を明示する。`order` を使わないのは、どちらがどの位置かをCSSから直接読めるようにするため。

```css
.entryFormWrapper .entryFormMain { grid-area: 1 / 1; }  /* 左 */
.entryFormWrapper .entryFormSide { grid-area: 1 / 2; }  /* 右 */
```

### 保存バーを `.entryFormBody` の外に出している理由

`container-type: inline-size` は layout containment を伴い、指定した要素がスタッキングコンテキストになる。
保存バーは `z-index: 100015` で管理ナビ（`z-index: 100005`）より前に出る必要があるため、containment の外に残す。

---

## 3. カラム幅

### 算出根拠

本文カラムは「読みやすい行長」を基準に決め、メタ情報カラムの幅は**その外側に追加される**。
比率分割ではないので 12カラムの `.acms-admin-g-col-*` は使わず、トラック定義のみ上書きしている。

| 項目 | 値 | 根拠 |
|---|---|---|
| 本文の行長 | `40rem` = 640px | 和文40字（エディター本文は 16px = 1rem/字） |
| エディター余白 | `6rem + 20px` = 116px | ProseMirror の左右 padding 3rem×2 ＋ `.acms-unit-content` の 10px×2 |
| **本文カラム** | **756px** | 640 + 116 |
| 本文の最小行長 | `33rem` = 528px | 33字 |
| **本文カラム最小** | **644px** | 528 + 116 |
| **メタ情報カラム** | **384px**（`24rem`） | `.acms-admin-form-width-medium`（max-width 380px）が収まる幅 |
| **メタ情報カラム最小** | **280px** | これ以上縮むなら1カラムに戻す |
| wrapper の左右 padding | 40px | md以上で 20px×2 |
| グリッドの gap | `1.25rem` = 20px | `.acms-admin-cssgrid` の既定 |
| **フォーム最大幅** | **1200px** | 40 + 756 + 20 + 384 |

### 2カラム / 1カラムの切り替え

**ビューポート幅ではなく「フォームに使える幅」で判定する（コンテナクエリ）。**
`entry-edit` は管理ナビが非表示、`entry_editor` は表示（245px）で、同じビューポート幅でも使える幅が大きく変わるため、メディアクエリでは両方に対応できない。

```css
.entryFormBody { container-type: inline-size; container-name: entry-form; }

@container entry-form (min-width: 984px) { /* 2カラム */ }
```

しきい値 **984px** = 本文の最小 644 + gap 20 + メタ情報の最小 280 + wrapper の左右 padding 40。
`.entryFormWrapper` の padding はコンテナ（`.entryFormBody`）の**内側**にあるので必ず足すこと。

> iPad mini 横向き（1024×768）は `#acms-admin-main` の左右 padding 10px×2 を引いて使える幅が **1004px**。984px を超えるので2カラムになる。

幅に余裕があれば 756 / 384、足りなくなると**両方が縮んで** 644 / 280 まで粘る。

### 1カラム時

```css
.entryFormWrapper .entryFormGrid {
  grid-template-columns: minmax(0, var(--entry-form-main-width));
  justify-content: center;
}
```

1本のトラックにして本文が読みやすい行長を超えないよう絞り、中央寄せする。

### フォーム外パーツの幅揃え

バージョン管理バー・ボタンバー・パンくずはフォームと同じ 1200px・中央寄せに揃える。

```css
@media (min-width: 768px) {
  #entryForm { --acms-admin-entry-form-width: var(--entry-form-width); }
  #main:has(#entryForm) .acms-admin-revison-admin,
  #main:has(#entryForm) .acms_fix_bg_index,
  #main:has(#entryForm) .entryFormTopicpath {
    box-sizing: border-box;
    max-width: var(--entry-form-width);
    margin-inline: auto;
  }
}
```

> **変数名は `--acms-admin-entry-form-width`。**
> SCSS ソース（`admin/_edit-page.scss`）では `--acms-entry-form-width` だが、管理画面向けビルドがカスタムプロパティにも `acms-admin-` を付与する。
> また `acms-admin.css` が `#entryForm` 自身に 880px を宣言しているので、継承ではなく `#entryForm` に直接指定しないと勝てない。

> **`box-sizing: border-box` は必須。**
> 管理画面CSSには全体への box-sizing リセットが無い。`.acms-admin-revison-admin` は padding 10px + border 1px を持つので、指定しないと 22px 広くなる。

---

## 4. 独立スクロール（2カラム時のみ）

グリッドの高さをビューポートから「グリッド以外の高さ」を引いた値にすることで、**ページ自体はスクロールせず各カラムだけがスクロールする**。

```css
.entryFormWrapper .entryFormGrid {
  height: calc(100dvh - var(--entry-form-grid-offset, 260px));
  min-height: 320px;
}
.entryFormMain, .entryFormSide {
  min-height: 0;              /* グリッドアイテムの既定 min-size を外さないと overflow が効かない */
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
```

引く量（パンくず・見出し・ボタンバー・バージョン情報・保存バー・wrapper の上下 padding）は画面の状態で変わるため、`custom.js` が実測して `--entry-form-grid-offset` に入れる。CSS 側の 260px は JS が動く前のフォールバック。

1カラム時はページ全体がスクロールするので、この指定は適用しない。

---

## 5. メタ情報カラム内のテーブル（2カラム時）

ラベルを値の上に積む。`.acms-admin-table-entry` が SP 時に行っている縦積みを、狭いカラム内で再適用するもの。

```css
.entryFormSide table, .entryFormSide tbody, .entryFormSide tr { display: block; }
.entryFormSide table th, .entryFormSide table td {
  box-sizing: border-box;
  display: block; width: 100% !important;
  padding: 0 !important; text-align: left !important; white-space: normal;
}
.entryFormSide table th { padding-top: 7px !important; }
.entryFormSide table td { padding-top: 3px !important; padding-bottom: 7px !important; }
.entryFormSide table { border: none !important; }
```

- **`table` / `tbody` / `tr` も `display: block` にする**。`th` / `td` だけでは、テーブルボックス自体がセル内容の min-content 幅で広がり、カラム幅（最小280px）を超えてはみ出す
- **padding は上下も明示する**。メタ情報カラムには余白の異なるテーブルが混在しているため（`.entryFormTable` = 7px 10px、`.acms-admin-table-admin-edit` = 2px 5px、メイン画像の `.adminTable` = 無指定）、左右だけ揃えると行間がバラつく
- `.entryFormSide table { width: 100% }` はコンテナクエリの**外**。メイン画像の `.adminTable` にだけ幅指定が無く、1カラム時に内容幅まで縮むため

---

## 6. パンくず（Topicpath）

編集中のコンテンツがサイトのどこにあるかを示す。フォームの外、`<form>` の直前に置く。

```html
<!-- BEGIN_MODULE Topicpath id="topicpath" -->
<nav class="entryFormTopicpath" aria-label="編集中のコンテンツの位置">
  <ol class="acms-admin-topicpath acms-admin-clearfix">
    <!-- BEGIN blog:loop -->
    <li><a href="{url}"><!-- BEGIN_IF [{sNum}/eq/1] -->HOME<!-- ELSE -->{name}<!-- END_IF --></a></li>
    <!-- END blog:loop -->
    <!-- BEGIN category:loop --><li><a href="{url}">{name}</a></li><!-- END category:loop -->
    <!-- BEGIN entry --><li><a href="{url}">{title}</a></li><!-- END entry -->
  </ol>
</nav>
<!-- END_MODULE Topicpath -->
```

- **モジュールID `topicpath` を指定する。** 閲覧画面（`include/parts/topicpath/default.html`）と同じIDにすることで、ブログ階層の深さやカテゴリーの出し方が揃い、管理画面 > モジュールID から設定を変えられる
- **ID を指定しないと** システム既定（`private/config.system.default.yaml`）にフォールバックし、`mo_topicpath_blog_limit` が 1 のため子ブログの親までさかのぼれない
- 先頭（`{sNum}` が 1）は **HOME に固定**。モジュールID側の `mo_topicpath_root_label` に依存しないようテンプレートでも固定する
- `.acms-admin-topicpath` は `li` を float させるので `acms-admin-clearfix` が要る

---

## 7. カスタムフィールドのスロット

4か所にインクルードを仕込んであり、`@include` を書くファイルを変えるだけで表示位置を移動できる。ファイルが無ければ何も出力されない。

| ファイル | 位置 | 現在の内容 |
|---|---|---|
| `field.html` | 本文カラムの上（エディターの上） | URLコンテキスト別（ccd / rccd / bcd）、ダミー設定 |
| `field_foot.html` | 本文カラムの下（エディターの下） | URLコンテキスト別（`*_foot`）、ダミー設定2 |
| `field_base.html` | メタ情報カラム、基本項目の下（詳細設定の上） | メイン画像 |
| `field_side.html` | メタ情報カラムの最下部（詳細設定の下） | SEO設定 |

例: メイン画像を `field_base.html` で読み込めばメタ情報カラムに、`field.html` に移せば本文の上に出せる。

> ⚠️ 同じフィールドを複数のスロットで読み込むと `input` の `name` が重複して**保存が壊れる**。必ずどれか1か所にすること。

---

## 8. 入力欄の仕様

### 8-1. 文字サイズ（メタ情報カラムのみ）

`acms-admin.css` の既定は、テキスト入力・textarea が 14px、セレクトが 12px。高さもばらついている（textarea 1行 = 38px、input = 26px、リッチセレクト = 26px）。

タイトルの textarea（`padding: 5px 5px 4px` / `line-height: 1.7`）を基準に **16px** へ統一する。

```css
#entryForm {
  --entry-form-control-font-size: 16px;
  --entry-form-control-line-height: 1.7;
  --entry-form-control-min-height: 38px;   /* 16 × 1.7 + 5 + 4 + 枠線2 */
}
```

対象は `input` 各種 / `select` / `textarea` / `.entryFormLiteEditor` / `.acms-admin-rich-select`。

> **適用範囲は `.entryFormSide` の中だけ。**
> `#entryForm` 全体にかけると、ユニットエディターのグループユニットのセレクトや、保存バーのバージョン名・バージョン種別まで巻き込んで大きくなる。
> 本文カラムのカスタムフィールドも対象外。すぐ隣にユニットエディターが並ぶので、既定サイズのほうが揃って見えるため。

リッチセレクト（react-select）は水平 padding が `0 5px` 固定で textarea と同じなので、文字サイズ・行送り・高さの3つだけ合わせる。

```css
.entryFormSide .acms-admin-rich-select {
  --acms-admin-rich-select-font-size: var(--entry-form-control-font-size);
  --acms-admin-rich-select-line-height: var(--entry-form-control-line-height);
  --acms-admin-rich-select-height: var(--entry-form-control-min-height);
}
```

### 8-2. 等幅フォント

ファイル名・日時（3種）・リンク先URL に、スタイルガイドの `.acms-admin-font-monospace` を振る。

日時のように `@include` で入力欄を生成する箇所は、**ラッパー側に付ければ入力欄へ継承される**（`normalize.css` が `input { font-family: inherit }` を指定しているため）。アイコンフォントは自前の `font-family` 宣言を持つので影響を受けない。

### 8-3. タイトル（自動リサイズ、最大4行）

```html
<textarea name="title" id="entry-title" rows="1"
          class="acms-admin-form-width-full auto-height js-no-newline">{title}</textarea>
```

```css
.auto-height {
  --auto-height-lines: 4;
  field-sizing: content;
  min-height: 2em;
  max-height: calc(1.7em * var(--auto-height-lines) + 11px);  /* 11px = padding 9 + 枠線 2 */
  overflow-y: auto;
  resize: none !important;
}
```

- 1行から始まり、文字数に応じて4行まで伸び、超えるとスクロール
- 行数を変えるときは `--auto-height-lines` だけ触ればよい
- `box-sizing: border-box` なので padding と枠線を含めて指定する
- `field-sizing: content` 未対応ブラウザ向けに `custom.js` が `scrollHeight` フォールバックを持つ
- 改行は `js-no-newline` で無効化（`keydown` で `preventDefault`、`input` で `\n` を除去）

**実測値（カラム幅 384px）**

| 文字数 | 高さ | 行数 |
|---|---|---|
| 1〜16字 | 38px | 1行 |
| 24〜40字 | 65px | 2行 |
| 48〜64字 | 93px | 3行 |
| 80字 | 120px | 4行 |
| 120字 | 120px | 4行 + スクロール |

### 8-4. ファイル名 ＋「空にする」

入力欄の後ろに `name="ecd_blank" value="true"` のチェックボックスを横並びで置く。

```html
<div class="entryFormFileNameStack acms-admin-hstack">
  <input type="text" name="code" id="entry-file-name"
         class="acms-admin-form-width-medium acms-admin-font-monospace" ... />
  <div class="acms-admin-form-checkbox">
    <input type="checkbox" name="ecd_blank" value="true" id="input-checkbox-ecd_blank" />
    <label for="input-checkbox-ecd_blank"><i class="acms-admin-ico-checkbox"></i>空にする</label>
  </div>
</div>
```

チェックボックスは文字数ぶんの幅で固定し、**残り幅はすべて入力欄に渡す**。
チェックボックスの幅はアイコン 20px + 右マージン 5px + ラベル 56px ≒ 81px でこれ以上削れないため、入力欄が 220px を下回るときはチェックボックスを次の行へ送る。

### 8-5. 日時 / 公開日時 / 掲載期限

3か所とも同じ構造に統一する。日付と時刻を横並びにし、「日付」「時刻」のラベルは `.acms-admin-hide-visually` で視覚的に隠す（入力欄が無名にならないよう要素自体は残す）。

```html
<div class="entryFormDateTimeStack acms-admin-hstack acms-admin-font-monospace">
  <div class="entryFormDateBlockWrap">
    <label class="entryFormDateLabel acms-admin-hide-visually">日付</label>
    <div class="entryFormDateBlock">@include(".../date-field.html", {...})</div>
  </div>
  <div class="entryFormDateBlockWrap">…時刻…</div>
</div>
```

2つの入力欄が幅を等分する（`flex: 1 1 0`）。
`.acms-admin-form-input-group` は `display: table` なので `width: 100%` の指定が要る。

### 8-6. リンク先URL

URL は長くなるので、1カラムのときもカラム幅いっぱい（`.acms-admin-form-width-full`）にする。

### 8-7. メイン画像（メディアフィールドのプレビュー）

幅はカラムいっぱいに使い、高さだけ上限を設ける。

```css
.entryFormSide {
  --entry-form-media-max-height: 180px;
  --entry-form-media-max-width: 328px;   /* 180 × 16/9 = 320 ＋ 枠の padding 8px */
}
.entryFormSide .acms-admin-media-field-preview { max-height: var(--entry-form-media-max-height); }
.entryFormSide .acms-admin-media-unit-droparea { width: 100%; max-width: var(--entry-form-media-max-width); }
```

- テンプレート側の `style="width:200px"` を外して幅を解放し、代わりに高さの上限で抑える
- `.acms-admin-media-unit-preview-wrap` は inline-block なので、画像が上限に当たって縮むと枠も縮み、余分な余白は出ない
- 16:9 の画像なら 384px カラムで 320×180、280px カラムで 280×158
- 未設定時のドロップエリアは内容幅（約168px）まで縮むので、設定済みと同じ大きさに揃えて見た目が飛ばないようにする
- **`.entryFormSide` 限定**。ブロックエディターの画像ユニットも同じクラスを使っているため

### 8-8. カテゴリーの「追加」ボタン

隣のセレクトと同じ高さ（38px）に揃える。`.acms-admin-btn-admin` は `min-height: auto` なので、38px にしたセレクトと並ぶと背が低く見える。

```css
.entryFormSide .acms-admin-category-select-container .acms-admin-btn-admin {
  min-height: var(--entry-form-control-min-height);
}
```

**コンフィグでボタンを非表示にしたとき**（既定はOFF）、`admin/entry/style.html` は `visibility: hidden` で隠すためボタンの幅 42px と gap 4px が残り、セレクトがカラム幅いっぱいにならない。同じ条件で `display: none` を後から当てて打ち消している。

```html
<!-- BEGIN_MODULE Config -->
<style>
  <!-- BEGIN_IF [{entry_edit_create_category_display}/nre/^(true|on)$] -->
  #entry-create-category-display { display: none; }
  <!-- END_IF -->
</style>
<!-- END_MODULE Config -->
```

`style.html` の直後に置いているので、同じ特異度でもこちらが勝つ。

---

## 9. 余白の調整

| 対象 | 既定 | 変更後 | 理由 |
|---|---|---|---|
| `#main` の上 padding | 20px | **10px** | 編集画面だけ詰める |
| `#main` の下 padding | あり | **0** | 保存バーが画面下端に固定されるので不要 |
| `.entryFormWrapper` の下 padding | 80px | **13px** | 保存バーは `position: sticky` で通常フローにも場所を取るため、最後までスクロールすれば内容は隠れない |
| `.acms-admin-unit-appender` の上下 padding | 36px | **18px** | 「最後のユニット→追加ボタン」「追加ボタン→本文カラム下のフィールド」の間隔 |

`.entryFormWrapper` の下 padding は **1カラム時にも効かせる必要がある**のでコンテナクエリの外に置く。

---

## 10. 新規作成時のブロックエディター高さ

本文が空だとエディターが最小の高さになり、カラム下部に大きな余白ができる。ProseMirror に最低高さを与えて、初期表示から書き始めやすくする。

```css
#entry-unit-display .acms-admin-block-editor .ProseMirror {
  box-sizing: border-box;                              /* 指定しないと padding のぶんはみ出す */
  min-height: var(--entry-form-editor-min-height, 50vh);
}
/* ユニットが2つ以上 = 中身があるので解除（足すたびに画面高ぶん積み上がるのを防ぐ）*/
#entry-unit-display:has(.acms-admin-unit ~ .acms-admin-unit) .acms-admin-block-editor .ProseMirror {
  min-height: 0;
}
```

`--entry-form-editor-min-height` は `custom.js` が実測して入れる。引く量（ユニットのツールバーと余白、ユニット追加ボタン、本文カラム上下のカスタムフィールド）はテーマの内容で変わるため固定値にできない。

> **`scrollHeight` をそのまま使うと動かない（2026-09-12 修正）**
>
> `scrollHeight` は**内容がコンテナより短いとき `clientHeight` まで切り上げられる**。
> 新規作成は内容が短いので `scrollHeight === clientHeight` となり、
>
> ```
> others = clientHeight - 入力領域の高さ
> height = clientHeight - others = 入力領域の高さ   ← 今と同じ値
> ```
>
> となって一度も広がらず、CSS のフォールバック（`50vh`）のままになっていた。
>
> 対策として、**いったん入力領域をカラムいっぱいまで広げて必ずあふれさせてから測る**。
> 同じ実行中に値を戻すので画面には出ない（`measureChrome()` と同じ手口）。
>
> 1カラムのときは本文カラムに決まった高さが無いため広げず、`50vh` に任せる。

また、1カラム時は `--entry-form-editor-min-height` を削除してフォールバックへ戻す。

---

## 11. JavaScript（`include/edit/custom.js`）

すべて既存の `ACMS.Ready(function () { … })` の中に追記している。

### `disableNewline()`
`textarea.js-no-newline` の改行を無効化する。`keydown` で Enter を `preventDefault`、貼り付け対策として `input` でも `\n` を除去する。

### `autoHeight()`
`field-sizing: content` 未対応ブラウザ向けのフォールバック。`CSS.supports()` で対応済みなら何もしない。

### `fitEntryFormColumns()`

`--entry-form-grid-offset`（カラムの高さ）と `--entry-form-editor-min-height`（エディターの最低高さ）を実測して書き込む。

**「グリッド以外の高さ」の測り方**

上下のパーツを個別に足すと `#main` の下 padding のような数え漏れが出るので、`ページ全体の高さ - グリッドの高さ` で求める。
ただし `#main` に `min-height: 100vh` が効いているため、内容が短いとページ高さが下限に張り付いて正しく測れない。そこで**一時的にグリッドを最大（offset: 0）にしてクランプを外してから測る**。

```js
const measureChrome = () => {
  const previous = form.style.getPropertyValue('--entry-form-grid-offset');
  form.style.setProperty('--entry-form-grid-offset', '0px');
  const chrome = Math.ceil(
    document.documentElement.scrollHeight - grid.getBoundingClientRect().height
  );
  if (previous) form.style.setProperty('--entry-form-grid-offset', previous);
  else form.style.removeProperty('--entry-form-grid-offset');
  return chrome;
};
```

- 1カラムのとき（`gridTemplateColumns` が1本）は高さを固定せず、変数を削除する
- 値を書き込むとグリッドの高さが変わって ResizeObserver が再発火するので、**変化したときだけ書き込んで**ループを止める

**再計測のトリガー**

| トリガー | 目的 |
|---|---|
| 初回実行 | 初期表示 |
| `window.resize` | 1カラム / 2カラムの切り替えを含む |
| `document.fonts.ready` | Webフォント読み込みで上部の高さが変わる |
| `ACMS.events.on('unit-editor.create.after')` | ユニットエディターは非同期でマウントされる |
| `ACMS.addListener('acmsDispatch')` | **ページの組み立て完了後** |
| `ACMS.addListener('acmsAfterPostInclude')` | PostInclude の読み込み完了後 |
| `ResizeObserver`（grid / body / 保存バー） | アラート表示、バージョン管理UIの開閉、管理ナビの開閉などへの保険 |

> **`ACMS.Ready` は「組み込みJSが実行できる段階」で発火するだけで、ページの組み立てはまだ終わっていない。**
> 寸法を実測する処理を `ACMS.Ready` だけに置くと組み立て前の値を拾って誤る。
> @see https://developer.a-blogcms.jp/document/javascript/eventhandler.html

### flatpickr のモバイルフォールバック無効化

```js
if (ACMS.Config.flatDatePickerConfig) ACMS.Config.flatDatePickerConfig.disableMobile = true;
if (ACMS.Config.flatTimePickerConfig) ACMS.Config.flatTimePickerConfig.disableMobile = true;
```

flatpickr はユーザーエージェントがモバイルだと判定すると、入力欄をネイティブの `<input type="date">` / `<input type="time">` に差し替える（`.flatpickr-mobile` が付く）。
そうなると入力欄の内側にブラウザ標準のカレンダー／時計アイコンが出て、**右隣にある a-blog cms のボタンと同じアイコンが2つ並ぶ**。表示形式もブラウザ任せになるため止める。

これは今回の実装で起きた問題ではなく、**配布されている flatpickr（MIT、`^4.6.13`）の標準挙動**。`flatDatePickerConfig` / `flatTimePickerConfig` は初期化オプションにそのまま展開されるので、既定値（`allowInput` / `dateFormat` など）を残したまま1項目だけ足す形にしている。

---

## 12. 使用したスタイルガイドのclass

レイアウトCSSはできる限りスタイルガイドで賄い、賄えない差分のみ `custom.css` に定義した。
@see https://developer.a-blogcms.jp/document/reference/styleguide/

| class | 用途 |
|---|---|
| `.acms-admin-cssgrid` | グリッド本体（トラック定義のみ上書き） |
| `.acms-admin-field-container` | カラム内のフィールドのまとまり |
| `.acms-admin-hstack` | ファイル名・日時の横並び |
| `.acms-admin-font-monospace` | ファイル名・日時・URL の等幅 |
| `.acms-admin-hide-visually` | 日付・時刻のラベルを視覚的に隠す |
| `.acms-admin-topicpath` / `.acms-admin-clearfix` | パンくず |
| `.acms-admin-accordion` / `-button` / `-panel` | 詳細設定 |
| `.acms-admin-form-checkbox` / `.acms-admin-ico-checkbox` | チェックボックス |
| `.acms-admin-form-width-full` / `-medium` | 入力欄の幅 |
| `.acms-admin-table-entry` / `-admin-entry` | フォームのテーブル |
| `.acms-admin-margin-top-mini` / `.acms-admin-mb-3` | 余白 |

---

## 13. 調整用のカスタムプロパティ一覧

`#main:has(#entryForm)` と `#entryForm` の両方に宣言している（ダイレクト編集のモーダルのように `#main` が無い状況でも効くようにするため）。

| 変数 | 既定値 | 意味 |
|---|---|---|
| `--entry-form-measure` | `40rem` | 本文の行長（40字） |
| `--entry-form-measure-min` | `33rem` | 本文の最小行長（33字） |
| `--entry-form-editor-gutter` | `calc(6rem + 20px)` | エディターの左右余白 |
| `--entry-form-main-width` | 計算値 756px | 本文カラム幅 |
| `--entry-form-main-min-width` | 計算値 644px | 本文カラム最小幅 |
| `--entry-form-side-width` | `24rem` | メタ情報カラム幅 |
| `--entry-form-side-min-width` | `280px` | メタ情報カラム最小幅 |
| `--entry-form-wrapper-gutter` | `40px` | wrapper の左右 padding |
| `--entry-form-column-gap` | `1.25rem` | グリッドの gap |
| `--entry-form-width` | 計算値 1200px | フォーム全体の幅 |
| `--entry-form-control-font-size` | `16px` | メタ情報カラムの入力欄の文字サイズ |
| `--entry-form-control-line-height` | `1.7` | 同 行送り |
| `--entry-form-control-min-height` | `38px` | 同 高さ |
| `--auto-height-lines` | `4` | タイトルの最大行数 |
| `--entry-form-media-max-height` | `180px` | メイン画像プレビューの高さ上限 |
| `--entry-form-file-name-min-width` | `220px` | ファイル名入力欄の最小幅（下回ると折り返す） |
| `--entry-form-grid-offset` | JS が実測 | グリッド以外の高さ（フォールバック 260px） |
| `--entry-form-editor-min-height` | JS が実測 | エディターの最低高さ（フォールバック 50vh） |

> ⚠️ コンテナクエリの条件部には `var()` を使えないため、しきい値 **984px** だけは手書きになっている。
> 上記の幅の変数を変えるときは、`@container entry-form (min-width: 984px)` も合わせて直すこと。

---

## 14. 検証の状況

### 検証済み（実測）

管理画面にログインできないため、**実際にコンパイル済みの `acms-admin.min.css` / `acms-system.min.css` / `custom.css` / `custom.js` を読み込むローカル検証用ページ**を用意し、DOM の寸法を数値で測って確認した。

- カラム幅の切り替わり（984px 前後、iPad mini 1004px で2カラム）
- 本文の行長が 40字ぶんになっていること
- メタ情報カラムが 280px まで縮んでもテーブルがはみ出さないこと
- 入力欄の高さが 38px でそろうこと（input / select / リッチセレクト / textarea）
- タイトルの行数と max-height（上の実測表）
- メイン画像プレビューの上限
- カテゴリー「追加」ボタンの有無によるセレクト幅（設定オン 338px / 設定オフ 384px）
- フォーム外パーツの幅（1200px、box-sizing 込み）

### 実機で確認済み

- **ブロックエディターのフローティングツールバーの見切れ** — 問題なし（2026-09-12、実機の管理画面で目視確認）

  `.entryFormMain` の `overflow-y: auto` と、`.entryFormBody` の `container-type: inline-size`
  （layout containment により `position: fixed` の子孫の包含ブロックになる）が重なると、
  カラムの上端・下端付近でツールバーが切り抜かれる懸念があったが、実際には発生しなかった。

- **body 直下に出る浮動要素と保存バーの重なり順** — 問題なし・**現状維持**（2026-09-12、実機の管理画面で目視確認）

  詳細は「16. 浮動要素の重なり順」を参照。

- **ポータルのスクロール追従** — 問題なし（2026-09-12、実機の管理画面で目視確認）

  サブカラム / 本文カラムを `overflow-y: auto` にしたため、メニューを開いたまま
  カラムをスクロールすると body 直下のメニューだけが取り残される懸念があった。
  カテゴリー / サブカテゴリー / タグ / 関連エントリーの各セレクトは `closeMenuOnScroll` を
  指定しておらず、react-select の既定は `false`（スクロールしても閉じない）だが、
  実機ではメニューが入力欄に追従したため対処は不要。

### 未検証だが許容（2026-09-12 判断）

- **ResizeObserver の挙動**

  `fitEntryFormColumns()` の再計測トリガー7つのうち、ResizeObserver だけが確認できていない
  （検証用ブラウザペインでは、ただの `div` でもコールバックが発火しなかった。
  実装の問題ではなくブラウザペイン側の制約とみているが、実機では未確認）。

  ResizeObserver は**保険**の位置づけで、他6つのトリガーで拾えない高さ変化
  （アラートの表示・非表示、バージョン管理UIの開閉、管理ナビの開閉、保存バーの高さ変化）
  だけを担当する。効いていなくても通常の操作には影響せず、
  最悪でも**カラムの高さが古いままになり、ページ自体に縦スクロールバーが出る**だけで、
  内容が見えなくなることはない。

  よって未検証のまま運用する。挙動が気になったときは、コンソールで
  `new ResizeObserver(...)` が発火するかを確認すれば足りる。

- **タブレットサイズ（1024×768）での2カラム表示** — 問題なし（2026-09-12、ブラウザのレスポンシブモードで確認）

  iPad 実機は用意できないため、**ブラウザ上で 1024×768 にして確認する方針**とした。
  タッチ操作と Safari 固有の描画は対象外。

  1024 − `#acms-admin-main` の左右 padding 20px = 使える幅 1004px。
  しきい値 984px を 20px 上回るので2カラムになる（ローカル検証でも実測済み）。
  余裕が 20px しかないので、**管理画面の左右 padding を増やすと1カラムに落ちる**点に注意。

### 参考: iPadOS Safari での機能の対応状況

実機確認はしていない。下記は一般的な対応表に基づく整理。

  | 使っている機能 | 対応 | 未対応時の挙動 |
  |---|---|---|
  | `container-type` / `@container` | Safari 16+ | **1カラムになる**（安全に縮退） |
  | `:has()` | Safari 15.4+ | 幅の上書きが効かない |
  | `100dvh` | Safari 15.4+ | カラムの高さ計算が効かない |
  | `overscroll-behavior` | Safari 16+ | スクロールが親へ伝播する |
  | `scrollbar-gutter: stable` | Safari 18.2+ | 無視されるだけ |
  | `field-sizing: content` | **Safari 未対応** | `custom.js` の JS フォールバックが動く |

実質の下限は **iPadOS 16**。それ未満では2カラムにならず1カラムで表示されるが、壊れるわけではない。
`field-sizing` だけは Safari では常に JS フォールバック側が動くので、
実機を触る機会があれば**タイトルの自動リサイズ**を見ておくとよい。

---

## 15. 残タスク

1. 固まった仕様を `themes/system` 側へ反映する（別タスク）
2. 検討中の未確定事項
   - 公開日時・掲載期限に等幅フォントを維持するか
   - パンくずの先頭を HOME 固定のままにするか、`{name}` にするか
   - タグ候補ボタンにも「追加」ボタンと同じ高さ合わせを広げるか
   - 1カラム時のファイル名入力欄も 100% にするか

---

## 16. 浮動要素の重なり順（変更しないこと）

**結論: 今回は何も変更していない。保存バーは既定の `z-index: 100015` のまま。**

### a-blog cms の層の順序

`acms-admin.min.css` から 100000 以上の `z-index` を抜き出したもの。意図的に設計された順序になっている。

```
100008  管理ナビ（.acms-admin-navbar）
100015  保存バー（.acms-admin-entry-form-sticky-container）
100016  プレビュー領域
100018  ブロックエディターのテキストメニュー
100026  モーダル / バックドロップ
100028  メディアモーダル
100031  ドラッグ中
100033  flatpickr のカレンダー（!important）
100034  ドロップダウン / ポップオーバー
100035  ツールチップ
100036  モーダル内の select2
100038  リッチセレクトのポータル
100039  保存中のスプラッシュ
100040  トースト
100042  trumbowyg 全画面
```

**保存バーは「ページの一部」の層**に属し、モーダル・浮動メニュー・通知はすべてその上に来る。

### 「保存バーを最前面にしたい」を採らなかった理由

検討したが、以下の理由で**現状維持**とした（2026-09-12 決定）。

1. **モーダルを突き抜ける。**
   この層の並びでは モーダル(100026) < メニュー類(100033〜100038) であり、
   その間に空き番号が無い。保存バーをメニューより上げると**必然的にモーダルよりも上**になり、
   メディア選択モーダルやカテゴリー作成モーダルを開いたときに保存バーがオーバーレイの手前に残る。

2. **選択肢が押せなくなる。**
   ドロップダウンは開いた位置に固定されて動かせないため、保存バーに隠れると選択できなくなる。
   逆に保存バーが一瞬隠れても、選択すればすぐ戻る。
   ネイティブの `<select>` がブラウザの最前面に描かれるのも同じ理由。

### 実機で確認した結果

| 要素 | スタイルシート上の z-index | 実機 |
|---|---|---|
| リッチセレクト（カテゴリー / サブカテゴリー / タグ）のポータル | `100038` | 保存バーの上 |
| flatpickr のカレンダー（日時） | `100033 !important` | 保存バーの上 |
| select2 のドロップダウン（ステータス） | `1051`（select2 本体の既定値。`js/dest/select2.*.chunk.css`） | **保存バーの上** |

> ⚠️ select2 だけは数値上は保存バー（100015）より小さく、隠れる想定だったが、実機では手前に描画された。
> **スタイルシートの値だけでは重なり順を判断できない。**
> 保存バーやドロップダウンの `z-index` を触るときは、必ず実機で見直すこと。

---
## 17. 子テーマ版（`themes/editor@beginner`）

**このリポジトリに入っているのはこの版だけ。** 1〜16章の `themes/site` 版は開発環境にのみ存在する。
以下は 2026-09-14 時点の実装。

詳細は [`themes/editor@beginner/README.md`](../themes/editor@beginner/README.md)。

### テーマの継承

ディレクトリ名の `@` でチェーンを作る。

```
editor@beginner  →  beginner  →  system
```

@see `php/Services/Template/ThemeInheritanceResolver.php`

```php
public function getInheritedThemes(string $theme): array
{
    $themes = [];
    $theme = trim($theme, '@');
    $themes[] = $theme;
    while ($pos = strpos($theme, '@')) {
        $theme = substr($theme, $pos + 1);
        $themes[] = $theme;
    }
    $themes[] = 'system';
    return array_unique($themes);
}
```

多段（`foo@editor@beginner`）も可能。
**チェーンは親の名前がディレクトリ名に埋まっているので、1つの子テーマを複数の親で使い回すことはできない。**
別の親に載せるときはディレクトリごとコピーして名前を変える。

使うときは 管理ページ > コンフィグ > テーマ設定 でテーマに `editor@beginner` を指定する。

### ファイル構成

```
themes/editor@beginner/
├── README.md
├── admin/
│   ├── _layouts/entry/edit.html      2カラムのレイアウト本体。CSS / JS もここから読み込む
│   └── entry/
│       ├── field.html                URLコンテキスト別のみ（beginner 版から field-seo.html を外した）
│       ├── field_base.html           メイン画像をメタ情報カラムへ
│       ├── field_side.html           SEO設定をメタ情報カラムへ
│       ├── field_foot.html           空
│       ├── field_htmx.html
│       ├── field-main-image.html     メイン画像の中身
│       ├── field-seo.html            SEO設定の中身（メイン画像は含まない）
│       └── geo-accordion.html        位置情報をアコーディオンに包んだもの
├── css/
│   └── entry-2column.css
└── js/
    ├── entry-2column.js
    └── entry-status-select.js        ステータス用リッチセレクト（ビルド済み。ソースは src/）
```

**親テーマのファイルは1つも書き換えていない。** `beginner` が更新されても追随する。

> CSS / JS は `include/edit/` ではなく `css/` と `js/` に置いている。
> 親テーマの `include/edit/custom.css` と同じ場所に置く必要はないため、分かりやすい場所にした。

### 画面の構成

1〜16章から項目の配置が変わっている。現在はこの並び。

| カラム | 中身 |
|---|---|
| **本文（2カラム時は左）** | タイトル → 関連エントリー → `field.html` → ユニットエディター → `field_foot.html` |
| **メタ情報（2カラム時は右）** | ステータス → カテゴリー → サブカテゴリー → タグ → 日時 → 会員限定 → `field_base.html`（メイン画像）→ 詳細設定 → 位置情報 → `field_side.html`（SEO設定） |

1〜16章からの主な移動は次のとおり。

- **タイトルを本文カラムの先頭へ。** そのページの名前なので、本文と同じ幅で大きく見せる（32px / bold）。
  ラベルとバリデーションのメッセージは横並びにして縦を詰めている
- **位置情報をメタ情報カラムへ。** `geo-accordion.html` でアコーディオンに包み、
  住所検索フォームは虫眼鏡を押したときだけ開く（→ 後述）
- **メタ情報カラムにはタイトルの雛形（`entry-title2`）がコメントアウトで残っている。**
  サブ側にもう1つタイトル系の項目を置く検討用。使わないなら消してよい

### 本文幅の切り替え

パンくずの右に 25 / 40 / 70 字の切り替えボタン（`.entryFormMeasureSwitcher`）を置いている。
押すと `<html>` の `data-entry-editor-measure` が変わり、`--entry-form-measure` を差し替える。

```css
html[data-entry-editor-measure='25'] #main:has(#entryForm),
html[data-entry-editor-measure='25'] #entryForm {
  --entry-form-measure: 25rem;
  --entry-form-measure-min: 25rem;
}
```

- 既定は **40字**（3章の算出根拠どおり）
- **70字を選ぶと1カラムになる。** `grid-area: auto` と `order` でメタ情報を本文の下へ回す
- 選択値は `localStorage` に保存し、次に開いたときに復元する。
  `localStorage` が使えない環境でも、その画面の中では切り替えられる
- 768px 未満では切り替えUIを隠す

### 1カラム時の並び

1〜16章の版では DOM順どおり「メタ情報 → 本文」に積んでいたが、現在は **`order` で「本文 → メタ情報」** にしている。
本文を先に書き始められるほうが自然なため。

```css
.entryFormWrapper .entryFormMain { order: 1; }
.entryFormWrapper .entryFormSide { order: 2; }
```

### 画面まわりの調整

| 対象 | 内容 |
|---|---|
| フォーカスリング | カラムの `overflow-y: auto` で左右が切れるため、`padding-inline: 3px` ＋同量の負マージンで逃げ場を作る（内容幅は変わらない） |
| スクロールバー | 内容と重ならないよう右に 8px。本文カラムはトラック幅にも同じ量を足しているので行長は変わらない |
| タイトル | 32px / bold。最大4行（`--auto-height-lines`）で、`max-height` は `em` 基準なので文字サイズを変えても4行のまま |
| メイン画像 | カラム幅いっぱいの 16:9。設定前後で枠の大きさが変わらないよう、ドロップエリアとプレビューの両方に `aspect-ratio` を指定。画像は `object-fit: contain` |
| アコーディオン | 見出しの高さを入力欄と同じ38pxに。開いているときは背景を一段濃くし、下側の角を角ばらせてパネルと地続きに見せる |
| パンくず | 14px（既定は11px）。`a` にも `font-size` が直接指定されているので `ol` と `a` の両方を指定する |
| ステータス | `entry-status-select.js` でカテゴリーと同じリッチセレクトに置き換える。JS が読めなければ通常の `select` が残る |

> **アコーディオンをスクロールで見せに行くことはしない。**
> カラムの下のほうで開くと中身は画面外に伸びるが、押した見出しがカーソルの下から逃げるほうが分かりにくいため、
> 見出し自身の見た目を変えて知らせる方針にしている。

### 位置情報の住所検索

住所で探すのは位置を決める最初の1回だけなので、常時は隠して虫眼鏡ボタンで開く。

- 状態は虫眼鏡の `aria-expanded` が持ち、表示の切り替えは CSS が行う
- 虫眼鏡は**地図が出ているときだけ**表示する。`admin.js` が `.js-geo-button` の `data-type` を
  地図表示後に `add`、非表示後に `delete` へ書き換えるので、それを判定に使う

### 設計上の約束ごと

#### `custom.css` / `custom.js` という名前を使わない

**テーマの継承はチェーンの先頭が勝つ方式で、同名ファイルはマージされない。**
`include/edit/custom.css` を子テーマに置くと、`beginner/include/edit/custom.css` は
一切読まれなくなる。`custom.js` も同様で、こちらは `beginner` 側にある
`blockEditorConfig` のクラス名設定が消えて本文のスタイルが当たらなくなる。

#### CSS / JS は `admin.html` ではなくレイアウトから読み込む

子テーマに `admin.html` を置くと、**親の `admin.html` はまるごと置き換わる**。
親の `editor-css` セクションの中身をコピーして持ち回ることになり、親テーマごとにメンテが必要になる。

代わりに、自分が所有している `admin/_layouts/entry/edit.html` から読み込んでいる。

```html
<link rel="stylesheet" href="/css/entry-2column.css">
<script src="/js/entry-2column.js" charset="UTF-8"></script>
<script src="/js/entry-status-select.js" charset="UTF-8"></script>
```

`acms.js` は `include/head/admin-js.html` により `<head>` で**同期読み込み**されるので、
body の途中で `<script>` を置いても `ACMS` は定義済みになっている（`defer` / `async` なし・確認済み）。

#### カスタムフィールドの `name` を重複させない

`beginner` は `field.html` から `field-seo.html`（**メイン画像 + SEO設定**）を読み込んでいる。
子テーマではこれを外し、メイン画像とSEO設定をメタ情報カラムへ分けて置いた。

| スロット | 読み込むもの |
|---|---|
| `field.html` | URLコンテキスト別（ccd / rccd / bcd）のみ |
| `field_base.html` | `field-main-image.html`（メイン画像） |
| `field_side.html` | `field-seo.html`（SEO設定。メイン画像は含まない） |
| `field_foot.html` | 空 |

**同じフィールドを複数のスロットから読み込むと `input` の `name` が重複して保存が壊れる。**

> **`@include` 先の実体もテーマに要る（はまった点）**
>
> **見つからない `@include` はエラーにならず、何も出力しない。**
> スロットのファイルだけ置いて中身のファイルを置き忘れると、
> 「スロットが効いていない」ように見える。

### キャッシュに注意

`web/.htaccess` が **`.css` / `.js` すべてに 1年・`immutable` のキャッシュ**を付けている。

```
Header set Cache-Control "public, max-age=31536000, immutable"
```

`immutable` は「再検証するな」という指示なので、**通常のリロードでは新しいファイルを取りに行かない**。
テーマのCSS / JSを編集して確認するときは、DevTools の Network タブで
「Disable cache」をONにすること。

### 未検証

- 実機の iPad / タブレットでの表示（ブラウザのレスポンシブモード 1024×768 では確認済み）
- `ResizeObserver` の発火（→ 14章）
