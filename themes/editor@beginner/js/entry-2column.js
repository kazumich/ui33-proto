/**
 * 2カラム編集画面のJS（子テーマ editor@beginner）
 *
 * 親テーマの include/edit/custom.js とは別ファイルにしてある。
 * 同じ名前にすると子テーマのものだけが読まれ、親テーマの custom.js が
 * まるごと効かなくなるため（テーマの継承はチェーンの先頭が勝つ方式で、
 * 同名ファイルはマージされない）。
 * beginner の custom.js は blockEditorConfig のクラス名を設定しているので、
 * 上書きすると本文のスタイルが当たらなくなる。
 *
 * 読み込みは admin/_layouts/entry/edit.html から行う。
 * ACMS のコアJS（acms.js）は <head> で同期読み込みされるため、
 * body の途中で読み込んでも ACMS は定義済みになっている。
 */
ACMS.Ready(function() {
  // タイトルの改行を無効化する
  const disableNewline = () => {
    const textareas = document.querySelectorAll('textarea.js-no-newline');

    textareas.forEach((target) => {
      target.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });
      target.addEventListener('input', () => {
        const start = target.selectionStart;
        const end = target.selectionEnd;

        if (target.value.includes('\n')) {
          target.value = target.value.replace(/\n/g, '');
          target.setSelectionRange(start, end);
        }
      });
    });
  };

  // field-sizing: content 未対応ブラウザ向けのフォールバック。
  // .auto-height の高さを内容に合わせる（min-height / max-height でクランプされる）
  const autoHeight = () => {
    if (CSS.supports('field-sizing', 'content')) {
      return;
    }

    const fit = (target) => {
      target.style.height = 'auto';
      target.style.height = `${target.scrollHeight}px`;
    };

    document.querySelectorAll('textarea.auto-height').forEach((target) => {
      fit(target);
      target.addEventListener('input', () => fit(target));
    });
  };

  // 本文カラムとメタ情報カラムを独立スクロールさせるための高さを実測する。
  // グリッドの高さ = ビューポート - （グリッド以外の高さ）とすることで
  // ページ自体はスクロールせず、各カラムだけがスクロールする状態にする。
  // 引く量はパンくず・見出し・ボタンバー・バージョン情報・保存バー・
  // .entryFormWrapper の上下 padding の合計で、画面の状態によって変わるため
  // CSS で決め打ちにせずここで求めて --entry-form-grid-offset に入れる。
  const fitEntryFormColumns = () => {
    const form = document.getElementById('entryForm');
    const grid = form && form.querySelector('.entryFormGrid');

    if (!grid) {
      return;
    }

    const actionBar = form.querySelector('.acms-admin-entry-form-sticky-container');

    let applied = null;

    // 「グリッド以外の高さ」を測る。
    // 上下のパーツを個別に足していくと #main の下 padding のように数え漏れが出るので
    // 「ページ全体の高さ - グリッドの高さ」で求めるが、#main に min-height: 100vh が
    // 効いているため、内容が短いとページの高さが下限に張り付いて正しく測れない。
    // そこで一時的にグリッドを最大（offset: 0）にしてクランプを外してから測る。
    const measureChrome = () => {
      const previous = form.style.getPropertyValue('--entry-form-grid-offset');

      form.style.setProperty('--entry-form-grid-offset', '0px');
      const chrome = Math.ceil(
        document.documentElement.scrollHeight - grid.getBoundingClientRect().height
      );

      if (previous) {
        form.style.setProperty('--entry-form-grid-offset', previous);
      } else {
        form.style.removeProperty('--entry-form-grid-offset');
      }

      return chrome;
    };

    // 2カラムかどうか。グリッドのトラックが2本あるかで判定する
    const isTwoColumn = () =>
      getComputedStyle(grid).gridTemplateColumns.split(' ').length >= 2;

    const update = () => {
      // 1カラムのときはページ全体がスクロールするので高さを固定しない
      if (!isTwoColumn()) {
        if (applied !== null) {
          applied = null;
          form.style.removeProperty('--entry-form-grid-offset');
        }
        return;
      }

      const offset = measureChrome();

      // 値を書き込むとグリッドの高さが変わり ResizeObserver が再発火するので、
      // 変化したときだけ書き込んでループを止める
      if (offset === applied) {
        return;
      }

      applied = offset;
      form.style.setProperty('--entry-form-grid-offset', `${offset}px`);
    };

    // 本文が空のとき、ブロックエディターの入力領域で本文カラムを埋める。
    // 引く量（ユニットのツールバーと余白、ユニット追加ボタン、本文カラム上下の
    // カスタムフィールド）はテーマの内容で変わるため、
    // 「本文カラムの表示高 - 入力領域以外が使っている高さ」で求める。
    // ユニットが2つ以上あるときは CSS 側で min-height を 0 に戻している。
    let appliedEditorHeight = null;

    const updateEditor = () => {
      const main = grid.querySelector('.entryFormMain');
      const prose = main && main.querySelector('.acms-admin-block-editor .ProseMirror');

      if (!prose) {
        return;
      }

      // 1カラムのときは本文カラムに決まった高さが無いので広げない。
      // CSS 側のフォールバック（50vh）に任せる
      if (!isTwoColumn()) {
        if (appliedEditorHeight !== null) {
          appliedEditorHeight = null;
          form.style.removeProperty('--entry-form-editor-min-height');
        }
        return;
      }

      const columnHeight = main.clientHeight;

      // 「入力領域以外が使っている高さ」を測る。
      //
      // scrollHeight は内容がカラムより短いとき clientHeight まで切り上げられる。
      // 新規作成は内容が短いので scrollHeight === clientHeight となり、
      //   others  = clientHeight - 入力領域の高さ
      //   height  = clientHeight - others = 入力領域の高さ（＝今と同じ値）
      // となって一度も広がらない。
      //
      // そこで、いったん入力領域をカラムいっぱいまで広げて必ずあふれさせ、
      // 切り上げの効かない本当の内容高を測る。
      // 同じ実行中に戻すので画面には出ない。
      form.style.setProperty('--entry-form-editor-min-height', `${columnHeight}px`);
      const others = main.scrollHeight - prose.getBoundingClientRect().height;
      const height = Math.max(0, Math.floor(columnHeight - others));

      // 測るために書き換えた値を戻す
      if (height === appliedEditorHeight) {
        form.style.setProperty('--entry-form-editor-min-height', `${appliedEditorHeight}px`);
        return;
      }

      appliedEditorHeight = height;
      form.style.setProperty('--entry-form-editor-min-height', `${height}px`);
    };

    const refresh = () => {
      update();
      updateEditor();
    };

    // イベントの直後はまだ描画が一巡しておらず、実際とは違う値が測れることがある。
    // 描画を2フレーム待ってから測り直す。
    //
    // 「一度ズレると自力で直らない」のを防ぐのが目的。
    // グリッドの高さは JS が入れた値そのものなので、間違った値で落ち着くと
    // 何もリサイズされず ResizeObserver も鳴らない。ウィンドウサイズを変えたときだけ
    // 直る、という状態になる。
    let refreshPending = false;
    const refreshAfterPaint = () => {
      if (refreshPending) {
        return;
      }
      refreshPending = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refreshPending = false;
          refresh();
        });
      });
    };

    // ユニットの生成イベント後にも、ブロックエディター本体は非同期で追加される。
    // 固定高の grid/body は中身が増えてもリサイズされないため、DOM の追加を監視する。
    // style 属性は監視せず、計測時の CSS 変数更新による再帰を避ける。
    // 本文内の通常の入力は対象外（高さは min-height なので内容に応じて自然に伸びる）。
    const main = grid.querySelector('.entryFormMain');
    if (main && window.MutationObserver) {
      const observer = new MutationObserver((records) => {
        if (records.some((record) => !record.target.closest('.ProseMirror'))) {
          refreshAfterPaint();
        }
      });
      observer.observe(main, { childList: true, subtree: true });
    }

    refresh();
    refreshAfterPaint();

    // ウィンドウサイズの変更（1カラムと2カラムの切り替えもここで拾える）
    window.addEventListener('resize', refresh);

    // 画像やWebフォントを含めて読み込みが終わった後。
    // 上部のパーツの高さがここで確定することがある
    if (document.readyState === 'complete') {
      refreshAfterPaint();
    } else {
      window.addEventListener('load', refreshAfterPaint);
    }

    // Webフォントの読み込みが終わると上部の高さが変わることがある
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refreshAfterPaint);
    }

    // ユニットエディターは非同期でマウントされるので、完了後に測り直す。
    // マウント直後は中身の高さが安定していないので描画を待つ
    if (window.ACMS && ACMS.events && ACMS.events.on) {
      ACMS.events.on('unit-editor.create.after', refreshAfterPaint);
    }

    // ページの組み立てが終わった後に測り直す。
    // ACMS.Ready は「組み込みJSが実行できる段階」で発火するだけで、
    // PostInclude などの読み込みはまだ終わっていないことがある。
    // @see https://developer.a-blogcms.jp/document/javascript/eventhandler.html
    if (window.ACMS && ACMS.addListener) {
      // ACMS.Dispatch() の処理が終わった後
      ACMS.addListener('acmsDispatch', refreshAfterPaint);

      // PostInclude の読み込みが終わった後
      ACMS.addListener('acmsAfterPostInclude', refreshAfterPaint);
    }

    // 上記で拾えない高さの変化（アラートの表示、バージョン管理UIの開閉、
    // 管理ナビの開閉によるカラム幅の変化など）への保険。
    // 対応していないブラウザでも上のイベントだけで実用上は足りる。
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(refresh);

      observer.observe(grid);
      observer.observe(document.body);

      if (actionBar) {
        observer.observe(actionBar);
      }
    }
  };

  disableNewline();
  autoHeight();
  fitEntryFormColumns();

  // 日付・時刻の入力欄をブラウザ標準のピッカーに置き換えさせない。
  //
  // flatpickr はユーザーエージェントがモバイルだと判定すると、入力欄を
  // ネイティブの <input type="date"> / <input type="time"> に差し替える
  // （.flatpickr-mobile が付く）。
  //
  // そうなると入力欄の内側にブラウザ標準のカレンダー／時計アイコンが出て、
  // 右隣にある a-blog cms のボタン（.acms-admin-icon-schedule /
  // .acms-admin-icon-time）と同じアイコンが2つ並んでしまう。
  // 表示形式もブラウザ任せ（2025/07/24 など）になるため止める。
  //
  // ACMS.Config.flatDatePickerConfig / flatTimePickerConfig は
  // flatpickr の初期化オプションにそのまま展開されるので、
  // 既定値（allowInput / dateFormat など）を残したまま1項目だけ足す。
  if (ACMS.Config.flatDatePickerConfig) {
    ACMS.Config.flatDatePickerConfig.disableMobile = true;
  }

  if (ACMS.Config.flatTimePickerConfig) {
    ACMS.Config.flatTimePickerConfig.disableMobile = true;
  }
});

// details の標準操作を保ちつつ、開閉時だけ高さをアニメーションする。
ACMS.Ready(function() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('#entryForm details.acms-admin-accordion').forEach((details) => {
    const summary = details.querySelector(':scope > summary');
    if (!summary || typeof details.animate !== 'function') return;
    let animation = null;
    let expanded = details.open;
    summary.addEventListener('click', (event) => {
      if (reducedMotion.matches) return;
      event.preventDefault();
      const from = details.getBoundingClientRect().height;
      expanded = animation ? !expanded : !details.open;
      if (animation) animation.cancel();
      details.open = true;
      details.toggleAttribute('data-closing', !expanded);
      const to = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
      details.style.overflow = 'hidden';
      animation = details.animate([
        { height: `${from}px` },
        { height: `${to}px` }
      ], { duration: 180, easing: 'ease-out' });
      animation.onfinish = () => {
        details.open = expanded;
        details.removeAttribute('data-closing');
        details.style.removeProperty('overflow');
        animation = null;
      };
    });
  });
});

// 段落の1行目にブロックハンドルの中心を合わせる。
ACMS.Ready(function() {
  document.addEventListener('pointerover', (event) => {
    if (!(event.target instanceof Element)) return;
    const editor = event.target.closest('#entryForm .ProseMirror');
    if (!editor) return;
    const content = editor.closest('.acms-admin-block-editor-content');
    const menu = content?.querySelector('.acms-admin-block-editor-content-item-menu');
    if (!menu) return;
    let block = event.target;
    while (block.parentElement && block.parentElement !== editor && block !== editor) {
      block = block.parentElement;
    }
    let offset = 0;
    if (block.tagName === 'P') {
      const lineHeight = parseFloat(getComputedStyle(block).lineHeight);
      const menuStyle = getComputedStyle(menu);
      if (Number.isFinite(lineHeight)) {
        offset = lineHeight / 2 - menu.getBoundingClientRect().height / 2
          - (parseFloat(menuStyle.marginTop) || 0) - 1; // 視覚的な中心に合わせて1px上げる。
      }
    }
    content.style.setProperty('--paragraph-handle-offset', `${offset}px`);
  });
});

// 新しく位置情報を追加した時、0, 0 の代わりにブラウザの現在地を初期値にする。
ACMS.Ready(function() {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('.entryFormGeoDetails .js-geo-button');
    if (!button) return;

    // a-blog cms 標準のクリック処理が終わってから、追加状態かを判定する。
    window.setTimeout(() => {
      if (button.dataset.type !== 'add') return;
      const geometry = button.closest('.js-entry-geo-edit');
      const lat = geometry?.querySelector('[name="geo_lat"]');
      const lng = geometry?.querySelector('[name="geo_lng"]');
      const zoom = geometry?.querySelector('[name="geo_zoom"]');
      if (!lat || !lng || !zoom) return;

      // 地図の入力イベントは、1項目が変わるたびに3項目すべてを書き戻す。
      // 緯度・経度・ズームを順番に change すると、まだ0の項目で後続値が
      // 上書きされるため、3項目をまとめて地図コンポーネントへ反映する。
      const setCoordinates = (latitude, longitude, zoomLevel) => {
        if (
          !Number.isFinite(latitude) || latitude === 0 ||
          !Number.isFinite(longitude) || longitude === 0 ||
          !Number.isFinite(zoomLevel) || zoomLevel <= 0
        ) return;

        lat.value = String(latitude);
        lng.value = String(longitude);
        zoom.value = String(zoomLevel);

        const syncPicker = () => {
          const osmRoot = geometry.querySelector('.js-open-street-map-editable');
          const osmPicker = osmRoot?.openStreetMapPicker;
          if (osmPicker && typeof osmPicker.updatePin === 'function') {
            osmPicker.updatePin({ lat: latitude, lng: longitude, zoom: zoomLevel });
            return true;
          }

          const googleRoot = geometry.querySelector('.js-map-editable');
          const googlePicker = googleRoot?.googleMapsPicker;
          if (googlePicker) {
            googlePicker.setValue?.();
            googlePicker.googleMap?.setCenter({ lat: latitude, lng: longitude });
            googlePicker.googleMap?.setZoom(zoomLevel);
            googlePicker.googleMapMarker?.setPosition({ lat: latitude, lng: longitude });
            googlePicker.emitChange?.();
            return true;
          }

          return false;
        };

        // 地図ライブラリは「位置情報を追加」の後に非同期で読み込まれる。
        // 初期化時の0による書き戻しが終わってから、同じ3値を再反映する。
        if (!syncPicker()) {
          let attempts = 0;
          const syncAfterInit = () => {
            attempts += 1;
            if (!syncPicker() && attempts < 40) {
              window.setTimeout(syncAfterInit, 50);
            }
          };
          window.setTimeout(syncAfterInit, 0);
        }
      };

      // 許可待ちや取得失敗の間も0にしないよう、管理画面の既定位置を先に使う。
      // 標準処理が緯度だけ先に既定値へ変える場合があるので、どれか1つでも
      // 不完全なら3項目をまとめて補う。
      if (
        Number(lat.value) === 0 ||
        Number(lng.value) === 0 ||
        Number(zoom.value) <= 0
      ) {
        setCoordinates(
          Number(ACMS.Config.adminLocationDefaultLat),
          Number(ACMS.Config.adminLocationDefaultLng),
          Number(ACMS.Config.adminLocationDefaultZoom) || 16
        );
      }

      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        setCoordinates(
          Number(coords.latitude.toFixed(6)),
          Number(coords.longitude.toFixed(6)),
          Number(zoom.value) || 16
        );
      }, () => {}, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000
      });
    }, 0);
  });
});

// 位置情報の住所検索フォームを、虫眼鏡ボタンで開閉する。
//
// 状態は虫眼鏡の aria-expanded だけが持ち、表示の切り替えは CSS が行う
// （css/entry-2column.css）。ここは属性を反転させるだけにしている。
//
// document に委譲しているのは、位置情報のUIがダイレクト編集のモーダルなどで
// あとから差し込まれることがあるため。
ACMS.Ready(function () {
  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('.js-geo-search-toggle');

    if (!toggle) {
      return;
    }

    const expanded = toggle.getAttribute('aria-expanded') === 'true';

    toggle.setAttribute('aria-expanded', String(!expanded));

    if (expanded) {
      return;
    }

    // 開いたらそのまま入力できるようにカーソルを置く
    const details = toggle.closest('.entryFormGeoDetails');
    const input = details && details.querySelector('.js-osm-search, .js-editable_map-search_text');

    if (input) {
      input.focus();
    }
  });
});

// 25 / 40 / 70 で本文幅を切り替える。
// entry_editor ではトピックパス内の切り替えが無いため、
// 「サイトプレビュー」の左へ同じUIを追加する。
// 選択は画面を移動しても維持できるようブラウザーに保存する。
ACMS.Ready(function () {
  const storageKey = 'acms-entry-editor-measure';
  const allowedMeasures = ['25', '40', '70'];
  const previewButton = document.querySelector('.js-acms-preview-button');

  if (previewButton && !document.querySelector('.entryFormMeasureSwitcher')) {
    const switcher = document.createElement('div');
    switcher.className = 'entryFormMeasureSwitcher';
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', '本文の横幅');

    allowedMeasures.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'entryFormMeasureButton';
      button.dataset.entryEditorMeasure = value;
      button.setAttribute('aria-pressed', String(value === '40'));
      button.setAttribute('aria-label', `本文幅${value}文字`);
      button.textContent = value;
      switcher.appendChild(button);
    });

    previewButton.before(switcher);
  }

  const buttons = document.querySelectorAll('.entryFormMeasureButton[data-entry-editor-measure]');
  let measure = '40';

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (allowedMeasures.includes(saved)) {
      measure = saved;
    }
  } catch (error) {
    // localStorage が利用できない場合も、その画面内では切り替えられる。
  }

  const applyMeasure = (value, save) => {
    if (!allowedMeasures.includes(value)) return;

    document.documentElement.dataset.entryEditorMeasure = value;
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.entryEditorMeasure === value));
    });

    if (save) {
      try {
        window.localStorage.setItem(storageKey, value);
      } catch (error) {
        // 保存できなくても現在の画面には適用済み。
      }
    }

    // カラム数の変更後に、エディターとスクロール領域の高さを測り直す。
    window.dispatchEvent(new Event('resize'));
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      applyMeasure(button.dataset.entryEditorMeasure, true);
    });
  });

  applyMeasure(measure, false);
});
