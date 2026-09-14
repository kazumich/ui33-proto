import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { RichSelect } from '@ablogcms/components/rich-select';

ACMS.Ready(() => {
  document.querySelectorAll('select.js-entry-status-select').forEach((select) => {
    if (select.dataset.richStatusMounted) return;
    const host = document.createElement('div');
    host.className = 'entryFormStatusSelect';
    select.after(host);
    const root = createRoot(host);
    const render = () => {
      const options = Array.from(select.options, (option) => ({
        value: option.value,
        label: option.textContent,
        isDisabled: option.disabled,
      }));
      root.render(
        <RichSelect
          inputId={`${select.id}-control`}
          instanceId={`${select.id}-rich`}
          aria-labelledby="entry-status-label"
          options={options}
          value={options.find((option) => option.value === select.value) || options[0]}
          isClearable={false}
          isSearchable={false}
          backspaceRemovesValue={false}
          isDisabled={select.disabled}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          closeMenuOnScroll={(event) => event.target instanceof Element && !event.target.closest('.acms-admin-rich-select-menu-portal')}
          onChange={(option) => {
            if (!option) return;
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }}
        />
      );
    };
    // 元の select を送信元として残す。JS が読み込めない場合も通常の select で操作できる。
    flushSync(render);
    select.hidden = true;
    // 管理画面の select { display: inline-block } より優先して隠す。
    select.style.display = 'none';
    select.dataset.richStatusMounted = 'true';
    const label = document.querySelector('label[for="entry-status"]');
    if (label) label.htmlFor = `${select.id}-control`;
    select.addEventListener('change', render);
    select.form?.addEventListener('reset', () => setTimeout(render, 0));
  });
});
