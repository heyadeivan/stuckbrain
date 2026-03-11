// ==UserScript==
// @name         HRIS Tool by Ade Ivan
// @namespace    http://tampermonkey.net/
// @version      4.9
// @match        *://hris.bakmigm.co.id/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/heyadeivan/stuckbrain/main/script3.user.js
// @downloadURL  https://raw.githubusercontent.com/heyadeivan/stuckbrain/main/script3.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ── Auto-fill dates ──────────────────────────────────────────────────────
  function tryAutoFill() {
    const txtDate   = document.getElementById('txtDate');
    const txtToDate = document.getElementById('txtToDate');
    if (!txtDate || !txtToDate) return;

    const today = new Date();
    const pad   = n => String(n).padStart(2, '0');

    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 11);
    const fromVal   = `${pad(prevMonth.getMonth() + 1)}/${pad(11)}/${prevMonth.getFullYear()}`;
    const toVal     = `${pad(today.getMonth() + 1)}/${pad(today.getDate())}/${today.getFullYear()}`;

    if (txtDate.value === fromVal && txtToDate.value === toVal) return;

    txtDate.value   = fromVal;
    txtToDate.value = toVal;
    txtDate.dispatchEvent(new Event('change', { bubbles: true }));
    txtToDate.dispatchEvent(new Event('change', { bubbles: true }));

    const frmRequest = document.forms['frmRequest'] || document.querySelector('form');
    if (typeof form_submit === 'function' && frmRequest) {
      form_submit(frmRequest);
    } else if (frmRequest) {
      frmRequest.submit();
    }
  }

  // ── Hide ALL rows where SelStatus_XX = "OFF" (kept in DOM for Revisi) ────
  function hideOffRows() {
    document.querySelectorAll('input[name^="SelStatus_"]').forEach(input => {
      if (input.value === 'OFF') {
        const tr = input.closest('tr');
        if (tr) tr.style.display = 'none';
      }
    });
  }

  // ── Poll until no visible SelStatus_XX with value="OFF" remains ──────────
  function startOffCleaner() {
    const waitForInputs = setInterval(() => {
      if (!document.querySelector('input[name^="SelStatus_"]')) return;
      clearInterval(waitForInputs);

      const interval = setInterval(() => {
        hideOffRows();
        const stillHasOff = !!document.querySelector('input[name^="SelStatus_"][value="OFF"]');
        if (!stillHasOff) clearInterval(interval);
      }, 300);

      setTimeout(() => clearInterval(interval), 30000);
    }, 300);
  }

  // ── Color time inputs ────────────────────────────────────────────────────
  function timeToMinutes(val) {
    const [h, m] = val.trim().split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

function colorTimeInput(input) {
  const name = input.name || '';
  if (!name.startsWith('txt_Start_') && !name.startsWith('txt_End_')) return;

  // Empty value → red
  if (!input.value.trim()) {
    input.style.backgroundColor = '#F4A8A8';
    input.style.color = '#111';
    return;
  }

  const mins = timeToMinutes(input.value);
  if (mins === null) return;

  let green = false;
  if (name.startsWith('txt_Start_')) {
    green = mins <= 8 * 60 + 30;
  } else if (name.startsWith('txt_End_')) {
    green = mins >= 17 * 60 + 30;
  }

  input.style.backgroundColor = green ? '#A8F0C6' : '#F4A8A8';
  input.style.color = '#111';
}

  function colorAllTimeInputs() {
    document.querySelectorAll('input[name^="txt_Start_"], input[name^="txt_End_"]')
      .forEach(colorTimeInput);
  }

  function watchTimeInputs() {
    colorAllTimeInputs();

    document.addEventListener('input', e => {
      const n = e.target.name || '';
      if (n.startsWith('txt_Start_') || n.startsWith('txt_End_')) colorTimeInput(e.target);
    });

    document.addEventListener('blur', e => {
      const n = e.target.name || '';
      if (n.startsWith('txt_Start_') || n.startsWith('txt_End_')) colorTimeInput(e.target);
    }, true);

    new MutationObserver(colorAllTimeInputs)
      .observe(document.body, { childList: true, subtree: true });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryAutoFill();
      startOffCleaner();
      watchTimeInputs();
    });
  } else {
    tryAutoFill();
    startOffCleaner();
    watchTimeInputs();
  }

  // ── Panel ────────────────────────────────────────────────────────────────
  const ITEMS = [
    {
      label: 'Koreksi Absen',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#2DB870" stroke-width="2"/><path d="M7 12l3.5 3.5L17 8" stroke="#2DB870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      expand: true,
      tidakSesuai: 2,
      sesuai: 2,
      action: () => typeof scutlink === 'function' && scutlink('index.cfm?FID=HR8713&FUID=HR87130002&menu=1&selRequestBy=0'),
      revisiAction: () => {

        const doc = window.frames.ifrmSunFishBody
          ? window.frames.ifrmSunFishBody.document
          : document;

        const startInputs = doc.querySelectorAll('input[name^="txt_Start_"]');

        startInputs.forEach(startInput => {

          const num = startInput.name.replace('txt_Start_', '');

          // ── Skip OFF rows ───────────────────────────────────────────────
          const selStatus = doc.querySelector(`input[name="SelStatus_${num}"]`);
          if (selStatus && selStatus.value === 'OFF') return;

          // ── Skip L1 rows ────────────────────────────────────────────────
          const statSelect = doc.querySelector(`select[name="selStatCode_${num}"]`);
          if (statSelect && statSelect.value === 'L1') return;

          const endInput  = doc.querySelector(`input[name="txt_End_${num}"]`);
          const checkbox  = doc.querySelector(`input[name="selStatChange_${num}"]`);
          const txtChange = doc.querySelector(`input[name="txtChange_${num}"]`);

          const isRed = c =>
            c.includes('244, 168, 168') ||
            c.includes('#f4a8a8');

          const startRed = isRed(getComputedStyle(startInput).backgroundColor);
          const endRed   = endInput && isRed(getComputedStyle(endInput).backgroundColor);

          if (!startRed && !endRed) return;

          // ── Apply time fixes ────────────────────────────────────────────
          if (startRed) {
            startInput.value = '08:30';
            startInput.style.background = '#FFD580';
            startInput.style.color = '#111';
          }

          if (endRed) {
            endInput.value = '17:30';
            endInput.style.background = '#FFD580';
            endInput.style.color = '#111';
          }

          // ── Set status fields directly — do NOT call changeselstat()  ───
          // changeselstat() re-renders the row and wipes values we just set
          if (checkbox) checkbox.checked = true;
          if (txtChange) txtChange.value = '1';

          if (statSelect) {
            statSelect.value = 'ACRSHI';
            statSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // ── Re-assert colours + ChangeSetStat after HRIS may repaint ───
          setTimeout(() => {
            if (startRed) {
              startInput.style.background = '#FFD580';
              startInput.style.color = '#111';
            }
            if (endRed) {
              endInput.style.background = '#FFD580';
              endInput.style.color = '#111';
            }
            if (typeof ChangeSetStat === 'function') {
              ChangeSetStat(Number(num));
            }
          }, 300);

        });

      },
    },
    {
      label: 'Reimburse',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#E05A2B" stroke-width="2"/><path d="M12 7v5l3 3" stroke="#E05A2B" stroke-width="2" stroke-linecap="round"/></svg>`,
      expand: false,
      action: () => typeof scutlink === 'function' && scutlink('index.cfm?helpcategory_id=xxx&FID=HR7195&menu=1&refresh=%7Bts%20%272026%2D03%2D04%2008%3A59%3A37%27%7D'),
    },
    {
      label: 'Ajukan Cuti',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#7C3AED" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#7C3AED"/></svg>`,
      expand: false,
      action: () => typeof scutlink === 'function' && scutlink('index.cfm?helpcategory_id=eHRMTimeAndAttendance&FID=HR0543&menu=1&refresh=%7Bts%20%272026%2D03%2D04%2008%3A56%3A44%27%7D'),
    },
  ];

  const CSS = `
    #_op{position:fixed;bottom:42px;right:42px;z-index:2147483647;width:280px;background:#F0EFE9;border-radius:18px;box-shadow:0 6px 28px rgba(0,0,0,.13);font-family:Consolas,monospace;overflow:hidden;user-select:none}
    #_op ._hd{padding:14px 16px 10px;font-size:11px;font-weight:700;color:#333;letter-spacing:.01em}
    #_op ._row{border-top:1px solid #E2E0D9;padding:0}
    #_op ._ri{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:pointer;transition:background .12s}
    #_op ._ri:hover{background:rgba(0,0,0,.03)}
    #_op ._rl{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#222}
    #_op ._plus{font-size:16px;color:#999;line-height:1;transition:transform .2s}
    #_op ._plus.open{transform:rotate(45deg)}
    #_op ._body{display:none;padding:0 14px 14px;flex-direction:column;gap:10px}
    #_op ._body.open{display:flex}
    #_op ._stats{display:flex;gap:10px}
    #_op ._stat{flex:1;background:#fff;border-radius:12px;padding:12px 8px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    #_op ._sn{font-size:24px;font-weight:800;line-height:1.1}
    #_op ._sl{font-size:10px;color:#666;margin-top:4px;font-family:Consolas,monospace}
    #_op ._revisi{background:#F5A623;color:#fff;border:none;border-radius:50px;width:100%;padding:11px;font-size:12px;font-weight:800;font-family:Consolas,monospace;cursor:pointer;transition:background .12s,transform .1s}
    #_op ._revisi:hover{background:#e09510;transform:scale(1.02)}
    #_op ._revisi:active{transform:scale(.98)}
  `;

  function toggleRow(row) {
    const body = row.querySelector('._body');
    const plus = row.querySelector('._plus');
    if (!body) return;
    const open = body.classList.toggle('open');
    plus.classList.toggle('open', open);
  }

  function build() {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
    const panel = document.createElement('div');
    panel.id = '_op';
    panel.innerHTML = `<div class="_hd">HRIS Tool by Ade Ivan</div>`;

    ITEMS.forEach(item => {
      const row = document.createElement('div');
      row.className = '_row';
      const ri = document.createElement('div');
      ri.className = '_ri';
      ri.innerHTML = `<span class="_rl">${item.icon}<span>${item.label}</span></span><span class="_plus">+</span>`;

      if (item.expand) {
        const body = document.createElement('div');
        body.className = '_body';
        body.innerHTML = `

          <button class="_revisi">Revisi Semua</button>`;
        body.querySelector('._revisi').addEventListener('click', () => {
          console.log('[HRIS Tool] Revisi Semua clicked —', item.label, new Date().toLocaleTimeString());
          item.revisiAction();
        });
        ri.addEventListener('click', () => { toggleRow(row); item.action && item.action(); });
        row.append(ri, body);
      } else {
        ri.addEventListener('click', item.action);
        row.appendChild(ri);
      }
      panel.appendChild(row);
    });

    (document.getElementById('bodyHeaderID') || document.body).appendChild(panel);
  }

  function tryBuild() {
    if (document.getElementById('_op')) return;
    if (document.getElementById('bodyHeaderID')) { build(); return; }
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', tryBuild)
      : setTimeout(tryBuild, 500);
  }

  tryBuild();
})();
