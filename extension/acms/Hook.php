<?php

namespace Acms\Custom;

/**
 * ユーザー定義のHookを設定します。
 */
class Hook
{
    /** 新規作成・更新リクエストの「空にする」。複製・インポートには適用しない。 */
    private bool $blankEntryCode = false;

    private bool $fillInsertedMainImage = false;

    private string $mainImageField = 'entry_main_image';

    /**
     * 起動時
     * @return void
     */
    public function init()
    {
    }

    /**
     * ログイン判定前
     * @return void
     */
    public function beforeAuthenticate()
    {
    }

    /**
     * ログイン判定後
     * @return void
     */
    public function afterAuthenticate()
    {
    }

    /**
     * 権限チェック
     * @param int|null $suid
     * @param int $bid
     * @return void
     */
    public function restrictionAuthority($suid, $bid)
    {
    }

    /**
     * header指定
     *
     * @param bool $cache キャッシュ利用
     * @return void
     */
    public function header($cache)
    {
        // header('Vary: User-Agent');
        // header('Vary: Accept-Encoding');
        // header('Vary: Accept-Language');
        // header('Vary: Cookie');
    }

    /**
     * クエリ発行前
     *
     * @param array{
     *  sql: string,
     *  list<mixed>|array<string, mixed>,
     * } $sql
     * @return void
     */
    public function query(&$sql)
    {
    }

    /**
     * ルール判定のカスタム値
     *
     * @param string $value
     * @return void
     */
    public function customRuleValue(&$value)
    {
        // ここで設定した値を、ルール判定に使用できるようになります。
        // $value = '';
    }

    /**
     * キャッシュルールに特殊ルールを追加
     *
     * @param string $customRuleString
     * @return void
     */
    public function addCacheRule(&$customRuleString)
    {
        // $customRuleString = UA_GROUP; // デバイスによってルールを分ける場合
    }

    /**
     * テンプレートキャッシュ有効時に、
     * インクルードのパスで使用できるグローバル変数を設定
     *
     * ページ毎に値が違うようなグローバル変数を設定しないでください。
     * 値別にキャッシュが作成されるので、値の種類が多いとキャッシュの意味がなくなります。
     *
     * @param string[] $globalVarNames
     * @return void
     */
    public function addGlobalVarsInIncludePath(&$globalVarNames)
    {
        // $globalVarNames = ['SESSION_USER_AUTH', 'HOGE']; // 例）インクルード文に %{SESSION_USER_AUTH} と %{HOGE} を使えるようにする
    }

    /**
     * GETモジュール処理前
     * 解決前テンプレートの中間処理など
     *
     * @param string &$tpl
     * @param \ACMS_GET $thisModule
     * @return void
     */
    public function beforeGetFire(&$tpl, $thisModule)
    {
    }

    /**
     * GETモジュール処理後
     * 解決済みテンプレートの中間処理など
     *
     * @param string &$res
     * @param \ACMS_GET $thisModule
     */
    public function afterGetFire(&$res, $thisModule)
    {
    }

    /**
     * V2 GETモジュール処理後
     * モジュールが返した配列を参照・加工できます。
     *
     * @param array &$response モジュールが返した配列（参照渡し）
     * @param \Acms\Modules\Get\V2\Base $thisModule V2 GETモジュール
     * @return void
     */
    public function afterV2GetFire(array &$response, \Acms\Modules\Get\V2\Base $thisModule)
    {
    }

    /**
     * POSTモジュール処理前
     * $thisModuleのプロパティを参照・操作するなど
     *
     * @param \ACMS_POST $thisModule
     * @return void
     */
    public function beforePostFire($thisModule)
    {
        $this->fillInsertedMainImage = false;
        $this->blankEntryCode = false;
        $this->mainImageField = 'entry_main_image';
        if (!in_array(get_class($thisModule), ['ACMS_POST_Entry_Insert', 'ACMS_POST_Entry_Update'], true)) {
            return;
        }

        $post = $thisModule->Post;

        // ファイル名の「空にする」。新規作成・更新のどちらでも受け付ける。
        // チェックが外れているときは値そのものが送られてこないので、false のままになる。
        $this->blankEntryCode = $post->get('ecd_blank') === 'true';

        // フォームで指定された画像フィールド名。未指定・空欄はテーマの既定名。
        $this->mainImageField = trim($post->get('main_image_field')) ?: 'entry_main_image';
        $imageField = $this->mainImageField;
        // このフィールドを持つ編集画面だけが対象。設定済みの画像は優先する。
        if (!in_array($imageField, $post->getArray('field'), true)
            || $post->get($imageField) !== '') {
            return;
        }

        $this->fillInsertedMainImage = get_class($thisModule) === 'ACMS_POST_Entry_Insert';

        // primary_image はユニットID。メディアユニット内の先頭画像を取得する。
        $unitId = $post->get('primary_image');
        if ($unitId === '') {
            return;
        }
        $mediaId = $post->get('media_id_' . $unitId);
        if (!ctype_digit((string) $mediaId) || (int) $mediaId <= 0) {
            return;
        }

        // 標準の抽出・検証・保存に渡し、リビジョンにも同じ値を保存する。
        $post->set($imageField, (string) $mediaId);
        $post->set($imageField . ':extension', 'media');
    }

    /**
     * POSTモジュール処理後
     * $thisModuleのプロパティを参照・操作するなど
     *
     * @param \ACMS_POST $thisModule
     * @return void
     */
    public function afterPostFire($thisModule)
    {
    }

    /**
     * ビルド前（GETモジュール解決前）
     *
     * @param $tpl &$tpl テンプレート文字列
     * @return void
     */
    public function beforeBuild(&$tpl)
    {
    }

    /**
     * ビルド後（GETモジュール解決後）
     * ※ 空白の除去・文字コードの変換・POSTモジュールに対するSIDの割り当てなどはこの後に行われます
     *
     * BID/CID/EID/VIEW確定後、かつ本体のJS/CSS埋め込み処理より前に呼ばれるため、
     * ページのコンテキストに応じて Asset::script() / Asset::style() 等を呼び出すのにも使える。
     * 常時読み込みたいだけで文脈判定が不要なアセットは ServiceProvider::init() から呼んでも構わない。
     *
     * @param string &$res レスポンス文字列
     * @return void
     */
    public function afterBuild(&$res)
    {
        // 例: エントリー詳細ページのみでJSを読み込む
        // if (defined('VIEW') && VIEW === 'entry') {
        //     \Acms\Services\Facades\Asset::script('my-custom-javascript', '/extension/acms/assets/custom.js', [
        //         'deps' => ['acms-vendor'],
        //         'position' => 'body_end',
        //     ]);
        // }
    }

    /**
     * HTTPレスポンス直前に呼ばれます
     *
     * @param string &$res レスポンス文字列
     * @return void
     */
    public function beforeResponse(&$res)
    {
    }

    /**
     * エントリー作成、更新時 または エントリーインポート時（CSV, WordPress, Movable Type）
     *
     * @param int $eid エントリーID
     * @param int|null $revisionId リビジョンID
     * @return void
     */
    public function saveEntry($eid, $revisionId)
    {
        if ($this->fillInsertedMainImage) {
            $this->fillInsertedMainImage = false;
            $this->fillMainImageAfterInsert((int) $eid, $revisionId);
        }

        if (!$this->blankEntryCode) {
            return;
        }
        $this->blankEntryCode = false;

        // 保存処理の中で生成・維持されたコードを、Webhook・リダイレクトより前に空へ戻す。
        $sql = \SQL::newUpdate('entry');
        $sql->addUpdate('entry_code', '');
        $sql->addWhereOpr('entry_id', $eid);
        $sql->addWhereOpr('entry_blog_id', BID);
        \DB::query($sql->get(dsn()), 'exec');

        // 作業領域にも反映し、後のバージョン適用で生成コードが復活するのを防ぐ。
        if ($revisionId !== null) {
            $sql = \SQL::newUpdate('entry_rev');
            $sql->addUpdate('entry_code', '');
            $sql->addWhereOpr('entry_id', $eid);
            $sql->addWhereOpr('entry_blog_id', BID);
            $sql->addWhereOpr('entry_rev_id', $revisionId);
            \DB::query($sql->get(dsn()), 'exec');
        }

        \ACMS_RAM::entry($eid, null);
        \Acms\Services\Facades\Fulltext::saveFulltext(
            'eid',
            $eid,
            \Acms\Services\Facades\Fulltext::loadEntryFulltext($eid)
        );
    }

    /** 新規保存で確定したメイン画像を使う。フォーム上の仮ユニットIDには依存しない。 */
    private function fillMainImageAfterInsert(int $eid, ?int $revisionId): void
    {
        $repository = \App::make('unit-repository');
        $units = $repository->loadUnits($eid, null, null, ['setPrimaryImage' => true]);
        $unit = $units->getPrimaryImageUnit();
        if (!$unit instanceof \Acms\Services\Unit\Models\Media) {
            return;
        }
        $mediaId = $unit->getMediaIds()[0] ?? 0;
        if ($mediaId <= 0) {
            return;
        }

        // 新規作成では本体と作業領域の両方が保存されるため、それぞれ補完する。
        $targets = $revisionId === null ? [null] : [null, $revisionId];
        foreach ($targets as $rvid) {
            $field = \Acms\Services\Facades\Field::load(eid: $eid, rvid: $rvid);
            if ($field->get($this->mainImageField) !== '') {
                continue;
            }
            $patch = new \Field();
            $patch->set('updateField', 'on');
            $patch->set($this->mainImageField, (string) $mediaId);
            $patch->set($this->mainImageField . '@media', (string) $mediaId);
            \Acms\Services\Facades\Field::save('eid', $eid, $patch, null, $rvid);
        }
    }

    /**
     * エントリー複製前
     *
     * @param int $toEntryId 新規エントリーID
     * @param int $fromEntryId 元エントリーID
     * @return void
     */
    public function beforeDuplicateEntry(int $toEntryId, int $fromEntryId): void
    {
    }

    /**
     * エントリー複製後
     *
     * @param int $toEntryId 新規エントリーID
     * @param int $fromEntryId 元エントリーID
     * @return void
     */
    public function afterDuplicateEntry(int $toEntryId, int $fromEntryId): void
    {
    }

    /**
     * メディア作成・更新時
     *
     * @param int $mid メディアID
     * @param string $method 新規・更新（insert|update|）
     * @param bool $isUpload アップロードファイルがあるかどうか
     * @return void
     */
    public function saveMedia($mid, $method, $isUpload)
    {
        // $data = \Media::getMedia($mid);
    }

    /**
     * フォーム Submit時
     *
     * @param array $mail 自動返信メール
     * @param array $mailAdmin 管理者宛メール
     * @return void
     */
    public function formSubmit($mail, $mailAdmin)
    {
    }

    /**
     * 自動返信メール送信前
     * $abortをtrueにすると、メール送信を中止します。
     *
     * @param \ACMS_POST_Form_Submit $thisModule POSTモジュール
     * @param bool &$abort メール送信を中止するかどうか
     * @param \Field $mail メール設定フィールド
     * @param \Field_Validation $field フォームフィールド
     * @return void
     */
    public function beforeSendAutoReply(
        \ACMS_POST_Form_Submit $thisModule,
        bool &$abort,
        \Field $mail,
        \Field_Validation $field,
    ): void {
        // 例: 特定の条件でメール送信を中止
        // if ($mail->get('To') === 'test@example.com') {
        //     $abort = true;
        //     $thisModule->Post->set('step', 'forbidden'); // フォームのステップをforbiddenに設定
        // }

        // 例: メール設定を変更
        // $mail->set('AdminTo', 'admin@example.com');
    }

    /**
     * 承認通知
     *
     * @param array $data 通知データ
     * @param bool &$send falseを設定するとデフォルトのメールが飛ばないように設定
     * @return void
     */
    public function approvalNotification($data, &$send = true)
    {
    }

    /**
     * 処理の一番最後のシャットダウン時
     *
     * @return void
     */
    public function beforeShutdown()
    {
    }

    /**
     * グローバル変数の拡張
     *
     * @param \Field $globalVars
     * @return void
     */
    public function extendsGlobalVars(&$globalVars)
    {
        // $globalVars->set('key', 'var');
    }

    /**
     * 埋め込みユニット拡張
     * $htmlに値を設定すると、その値を埋め込みユニットのHTMLとして保存します。
     * 値を設定した場合、OGP/oEmbedの取得は行われません。
     * @param string $url 埋め込みURL
     * @param string &$html 整形後HTML
     * @return void
     */
    public function extendsEmbedUnit(string $url, string &$html): void
    {
        // 例: 自社の動画配信サービスのURLを独自のiframeに差し替える
        // if (preg_match('@^https://video\.example\.com/watch/([0-9a-z]+)@', $url, $match)) {
        //     $html = '<iframe src="https://video.example.com/embed/' . $match[1] . '" allowfullscreen></iframe>';
        // }
    }

    /**
     * ビデオユニット拡張
     * $videoIdに値を設定すると、その値をビデオIDとして保存します。
     * @param string $url ユニットに設定されたURL
     * @param string &$videoId 上書き用のVideo ID
     * @return void
     */
    public function extendsVideoUnit($url, &$videoId)
    {
        // $parsed_url = parse_url($url);
        // if (!empty($parsed_url['path'])) {
        //     $id = preg_replace('@/@', '', $parsed_url['path']);
        // }
    }

    /**
     * ブロックエディターHTML拡張
     *
     * ブロックエディターの組み立て済みHTML（配信URL置換まで終えた最終HTML）が渡されます。
     * $html を参照渡しで書き換えると、その結果が最終出力に反映されます。
     * ショートコード的な独自記法の展開などに利用できます。
     *
     * このフックはフロント描画時のみ発火します。編集画面（ブロックエディターの編集UIへ
     * 読み込むJSON生成）では、ショートコード等が展開されて編集中コンテンツに混入するのを
     * 避けるため発火しません。
     *
     * 注意: ページキャッシュ有効時は出力ごとキャッシュされるため、
     * 時刻やログイン状態に依存する動的な展開には向きません。
     *
     * @param string &$html 組み立て済みHTML（書き換え可）
     * @param array{resizeImage: bool, resizeImageSize: int, lightboxClass: string} $options 描画文脈
     * @return void
     */
    public function filterBlockEditorHtml(string &$html, array $options): void
    {
        // 例: ショートコード [today] を現在日付に置換する
        // $html = str_replace('[today]', date('Y-m-d'), $html);
    }

    /**
     * キャッシュのリフレッシュ時
     * @return void
     */
    public function cacheRefresh()
    {
    }

    /**
     * キャッシュのクリア時
     * @return void
     */
    public function cacheClear()
    {
    }

    /**
     * メディアデータ作成
     * @param string $path 作成先パス
     * @return void
     */
    public function mediaCreate($path)
    {
    }

    /**
     * メディアデータ削除
     * @param string $path 削除パス
     * @return void
     */
    public function mediaDelete($path)
    {
    }


    /**
     * エントリーのフルテキストをカスタマイズ
     *
     * @param array<string, string> &$entry
     * @param array<string, string[]> &$field
     * @param int $entryId
     * @return void
     */
    public function filterEntryFulltext(array &$entry, array &$field, int $entryId): void
    {
        // // エントリーIDとコードをフルテキスト検索から除外する
        // unset($entry['id']);
        // unset($entry['code']);

        // // 特定のフィールドをフルテキスト検索から除外する
        // $exceptFields = [
        //     'private_field',
        //     'internal_memo',
        // ];
        // foreach ($exceptFields as $exceptField) {
        //     unset($field[$exceptField]);
        // }
    }

    /**
     * ユーザーのフルテキストをカスタマイズ
     *
     * @param array<string, string> &$user
     * @param array<string, string[]> &$field
     * @param int $userId
     * @return void
     */
    public function filterUserFulltext(array &$user, array &$field, int $userId): void
    {
        // // メールアドレスをフルテキスト検索から除外する
        // unset($user['mail']);
        // unset($user['mail_mobile']);

        // // 特定のフィールドをフルテキスト検索から除外する
        // $exceptFields = [
        //     'private_field',
        //     'internal_memo',
        // ];
        // foreach ($exceptFields as $exceptField) {
        //     unset($field[$exceptField]);
        // }
    }

    /**
     * カテゴリーのフルテキストをカスタマイズ
     *
     * @param array<string, string> &$category
     * @param array<string, string[]> &$field
     * @param int $categoryId
     * @return void
     */
    public function filterCategoryFulltext(array &$category, array &$field, int $categoryId): void
    {
        // // カテゴリーコードをフルテキスト検索から除外する
        // unset($category['code']);

        // // 特定のフィールドをフルテキスト検索から除外する
        // $exceptFields = [
        //     'internal_note',
        //     'admin_memo',
        // ];
        // foreach ($exceptFields as $exceptField) {
        //     unset($field[$exceptField]);
        // }
    }

    /**
     * ブログのフルテキストをカスタマイズ
     *
     * @param array<string, string> &$blog
     * @param array<string, string[]> &$field
     * @param int $blogId
     * @return void
     */
    public function filterBlogFulltext(array &$blog, array &$field, int $blogId): void
    {
        // // ドメインをフルテキスト検索から除外する
        // unset($blog['domain']);

        // // 特定のフィールドをフルテキスト検索から除外する
        // $exceptFields = [
        //     'private_setting',
        //     'system_config',
        // ];
        // foreach ($exceptFields as $exceptField) {
        //     unset($field[$exceptField]);
        // }
    }

    /**
     * 全文検索の対象テキストの正規化を拡張する
     *
     * config('search_convert_kana')（mb_convert_kana）による幅の正規化の後に呼ばれる。
     * 長音記号の畳み込みや旧字体・異体字の統一など、案件固有の追加正規化をここで行う。
     * 保存側（フルテキストの生成時）と検索側（キーワード受付時）の両方で同じ結果になるよう、
     * ここでの変換は入力の内容だけに依存させ、日時など実行時に変わる値は使わないこと。
     *
     * @param string &$text
     * @return void
     */
    public function extendsSearchNormalization(string &$text): void
    {
        // // 長音記号（ー）を取り除いて表記ゆれを吸収する
        // $text = str_replace('ー', '', $text);
    }

    /**
     * デリアライズ可能なクラスを追加
     *
     * @param string[] &$classes デフォルトで許可されているクラスの配列。必要なクラスをこの配列に追加する。
     * @return void
     */
    public function unserializeAllowedClasses(array &$classes): void
    {
        // $classes[] = \Acms\Plugins\SamplePlugin\SampleClass::class;
    }

    /**
     * Twig Environment 構築時に呼ばれる拡張ポイント
     *
     * Twig Filter / Function / Extension の登録はここで行う。
     *
     * @param \Acms\Services\Template\Twig $twig
     * @return void
     */
    public function extendsTwig(\Acms\Services\Template\Twig $twig): void
    {
        // $twig->registerFilter('site_format', fn(string $s) => '⚡' . $s);
        // $twig->registerFunction('site_now', fn() => date('Y-m-d H:i:s'));
        // $twig->registerExtension(new \Acms\Custom\Twig\SiteExtension());
    }

    /**
     * HTMLPurifier の設定構築時に呼ばれる拡張ポイント（カスタム HTML 定義の取得前）。
     *
     * 変数出力のサニタイズ（dangerous_tags / iframe ホワイトリスト等）に使う HTMLPurifier の
     * config をここで上書き・追加できる。HTML.* 系は定義取得前に確定する必要があるため、
     * 許可タグ・属性・URI スキームなどの調整はこのタイミングで行う。
     *
     * @param \HTMLPurifier_Config $config
     * @return void
     */
    public function extendsHtmlPurifierConfig(\HTMLPurifier_Config $config): void
    {
        // 例: data: スキームの画像を許可する
        // $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true, 'data' => true]);

        // 例: 特定タグをさらに禁止する（既定値を上書き）
        // $config->set('HTML.ForbiddenElements', ['script', 'iframe', 'form', 'object']);
    }

    /**
     * HTMLPurifier のカスタム HTML 定義の構築時に呼ばれる拡張ポイント（定義の取得後）。
     *
     * addAttribute / addElement で、許可する要素・属性を追加できる。
     *
     * 注意: カスタム定義はキャッシュされる。定義を変更した場合はダッシュボードからキャッシュをクリアしてください。
     *
     * @param \HTMLPurifier_HTMLDefinition $def
     * @param \HTMLPurifier_Config $config
     * @return void
     */
    public function extendsHtmlPurifierDefinition(\HTMLPurifier_HTMLDefinition $def, \HTMLPurifier_Config $config): void
    {
        // 例: <details> / <summary> を許可し、独自 data 属性を通す
        // $def->addElement('details', 'Block', 'Flow', 'Common', ['open' => 'Bool#open']);
        // $def->addElement('summary', 'Inline', 'Inline', 'Common');
        // $def->addAttribute('div', 'data-my-widget', 'CDATA');
    }

    /**
     * htmx の設定構築時に呼ばれる拡張ポイント（meta[name="htmx-config"] に埋め込む値。
     * config('htmx_config') のJSON、およびテンプレートに書かれた meta[name="htmx-config"] で
     * 上書きされた後に呼ばれる）。allowEval は上書き不可。
     *
     * @param array $config
     * @return void
     */
    public function extendsHtmxConfig(array &$config): void
    {
        // 例: ログイン中のユーザーだけ履歴キャッシュを有効化する
        // if (\Acms\Services\Facades\Login::isLoggedIn()) {
        //     $config['historyCacheSize'] = 10;
        // }
    }
}
