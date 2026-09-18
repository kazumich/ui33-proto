# editor@beginner

`beginner` テーマのエントリー編集画面を**2カラム**に差し替える子テーマ。

仕様の詳細は [`tasks/entry-edit-2column-spec.md`](../../../tasks/entry-edit-2column-spec.md) を参照。

## 使い方

管理ページ > コンフィグ > テーマ設定 で、テーマに **`editor@beginner`** を指定する。

### あわせて有効にするコンフィグ

管理ページ > コンフィグ > 編集設定 の「エントリーコード」にある
**「重複チェック」を有効**にしておく（`check_duplicate_entry_code`）。

このテーマは新規作成時、ファイル名の欄に次の発番（`entry-148.html` など）を
あらかじめ入れておき、要らなければ消して保存する形にしている。
発番のもとになる `next_eid` は編集画面を**開いた時点**の見込み値なので、
新規作成の画面を2つ開くと同じ名前が入り、重なりうる。

重複チェックが無効だと `ACMS_POST_Entry_Insert` / `Update` が
`code` の `double` 検証そのものを呼ばないため、同じファイル名がそのまま保存される。

`config.system.yaml` に書いても効かない。DB のブログコンフィグが優先されるため、
管理画面から設定すること。コンフィグセットごとに別レコードなので、
セットを使い分けている場合はそれぞれで設定する。

## 仕組み

a-blog cms のテーマ継承は、ディレクトリ名の `@` でチェーンを作る。

```
editor@beginner  →  beginner  →  system
```

見つからないファイルは順に親へフォールバックするので、
このテーマに置いてあるファイルだけが `beginner` を上書きする。

@see `php/Services/Template/ThemeInheritanceResolver.php`

## 中身

```
admin/_layouts/entry/edit.html   2カラムのレイアウト本体。CSS / JS もここから読み込む
admin/entry/field.html           URLコンテキスト別のみ（beginner 版から field-seo.html を外した）
admin/entry/field_base.html      メイン画像をメタ情報カラムへ
admin/entry/field_side.html      SEO設定をメタ情報カラムへ
admin/entry/field_foot.html      空（beginner の URLコンテキスト別 _foot を出さない）
admin/entry/field-main-image.html  メイン画像の中身
admin/entry/field-seo.html         SEO設定の中身（メイン画像は含まない）
css/entry-2column.css            レイアウトと入力欄のCSS
js/entry-2column.js              高さの実測、タイトルの改行抑止、flatpickr の設定
js/entry-status-select.js        ステータス用 RichSelect
```

親テーマのファイルは**1つも書き換えていない**。`beginner` が更新されても、
編集画面以外はそのまま追随する。

## 設計上の約束ごと

### 1. `custom.css` / `custom.js` という名前を使わない

テーマの継承は**チェーンの先頭が勝つ方式**で、同名ファイルはマージされない。
`include/edit/custom.css` を子テーマに置くと、`beginner/include/edit/custom.css` は
一切読まれなくなる。`custom.js` も同様で、こちらは
`blockEditorConfig` のクラス名設定が消えて本文のスタイルが当たらなくなる。

そのため `entry-2column.css` / `entry-2column.js` という別名にしてある。

### 2. CSS / JS は `admin.html` ではなくレイアウトから読み込む

親テーマの `admin.html` に別名ファイルの `<link>` を足す方法もあるが、
子テーマに `admin.html` を置くと**親の `admin.html` はまるごと置き換わる**ため、
親の `editor-css` セクションの中身をコピーして持ち回る必要が出てしまう。
親テーマごとにメンテが必要になるので採らなかった。

代わりに、自分が所有している `admin/_layouts/entry/edit.html` から読み込んでいる。
`acms.js` は `<head>` で同期読み込みされるので、body の途中で
`<script>` を置いても `ACMS` は定義済みになっている。

### 3. カスタムフィールドの `name` を重複させない

レイアウトには4つの挿入位置がある。

| ファイル | 位置 |
|---|---|
| `field.html` | 本文カラムの上（エディターの上） |
| `field_foot.html` | 本文カラムの下（エディターの下） |
| `field_base.html` | メタ情報カラム、基本項目の下（詳細設定の上） |
| `field_side.html` | メタ情報カラムの最下部（詳細設定の下） |

**同じフィールドを複数の位置から読み込むと `input` の `name` が重複して保存が壊れる。**
`beginner` は `field.html` から `field-seo.html`（メイン画像 + SEO設定）を読み込んでいるが、
このテーマではそれを外し、メイン画像とSEO設定をメタ情報カラムへ分けて置いている。

現在の割り当ては次のとおり。

| スロット | 読み込むもの |
|---|---|
| `field.html` | URLコンテキスト別（ccd / rccd / bcd）のみ |
| `field_base.html` | `field-main-image.html`（メイン画像） |
| `field_side.html` | `field-seo.html`（SEO設定。メイン画像は含まない） |
| `field_foot.html` | 空 |

### `@include` 先のファイルもこのテーマに要る

**ファイルが見つからない `@include` はエラーにならず、何も出力しない。**
スロットのファイルだけ置いて中身のファイルを忘れると、
「スロットが効いていない」ように見えるので注意。

`field-main-image.html` と `field-seo.html` は `beginner` にも `system` にも
（`beginner` の `field-seo.html` はメイン画像入りの別物）無いので、
このテーマに実体を置いてある。

チェーン上に実体があるか確かめるには、`editor@beginner` → `beginner` → `system` の
順に同じパスを探すこと。

## 別の親テーマに載せ替える

このディレクトリごとコピーして名前を変えるだけでよい。

```
themes/editor@beginner  →  themes/editor@site
```

ただし `admin/entry/field.html` と `field_side.html` は
**`beginner` のカスタムフィールド構成に合わせたもの**なので、
載せ替え先に応じて見直すこと。この2つを消せば、
親テーマのフィールド構成をそのまま使う（すべて本文カラムに出る）。
