// ==UserScript==
// @name         HRIS Tool by Ade Ivan
// @namespace    http://tampermonkey.net/
// @version      6.0
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

  // ── Hide ALL rows where SelStatus_XX = "OFF" ────────────────────────────
  function hideOffRows() {
    document.querySelectorAll('input[name^="SelStatus_"]').forEach(input => {
      if (input.value === 'OFF') {
        const tr = input.closest('tr');
        if (tr) tr.style.display = 'none';
      }
    });
  }

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

  // ── Items ────────────────────────────────────────────────────────────────
  const ITEMS = [
    {
      label: 'Koreksi Absen',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M7 12l3.5 3.5L17 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      color: '#2DB870',
      expand: true,
      action: () => typeof scutlink === 'function' && scutlink('index.cfm?FID=HR8713&FUID=HR87130002&menu=1&selRequestBy=0'),
      revisiAction: () => {
        const doc = window.frames.ifrmSunFishBody
          ? window.frames.ifrmSunFishBody.document
          : document;

        const startInputs = doc.querySelectorAll('input[name^="txt_Start_"]');

        startInputs.forEach(startInput => {
          const num = startInput.name.replace('txt_Start_', '');

          const selStatus = doc.querySelector(`input[name="SelStatus_${num}"]`);
          if (selStatus && selStatus.value === 'OFF') return;

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

          if (checkbox) checkbox.checked = true;
          if (txtChange) txtChange.value = '1';

          if (statSelect) {
            statSelect.value = 'ACRSHI';
            statSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }

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
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
      color: '#E05A2B',
      expand: false,
      action: () => typeof scutlink === 'function' && scutlink('index.cfm?helpcategory_id=xxx&FID=HR7195&menu=1&refresh=%7Bts%20%272026%2D03%2D04%2008%3A59%3A37%27%7D'),
    },
    {
      label: 'Ajukan Cuti',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,
      color: '#7C3AED',
      expand: false,
      action: () => typeof scutlink === 'function' && scutlink('index.cfm?helpcategory_id=eHRMTimeAndAttendance&FID=HR0543&menu=1&refresh=%7Bts%20%272026%2D03%2D04%2008%3A56%3A44%27%7D'),
    },
  ];

  // ── CSS ──────────────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');

    #_op-wrap {
      position: fixed;
      bottom: 42px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      font-family: 'DM Sans', sans-serif;
      pointer-events: none;
    }

    /* ── Popup tray (above pill) ── */
    #_op-tray {
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity .22s ease, transform .22s ease;
    }
    #_op-tray.open {
      pointer-events: auto;
      opacity: 1;
      transform: translateY(0);
    }

    ._tray-card {
      background: #1a1a1a;
      border-radius: 16px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,.28);
      min-width: 220px;
    }
    ._tray-label {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      flex: 1;
    }
    ._tray-revisi {
      background: #F5A623;
      color: #fff;
      border: none;
      border-radius: 50px;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: background .12s, transform .1s;
      pointer-events: auto;
    }
    ._tray-revisi:hover { background: #e09510; transform: scale(1.04); }
    ._tray-revisi:active { transform: scale(.97); }

    /* ── Main pill bar ── */
    #_op-pill {
      pointer-events: auto;
      display: flex;
      align-items: center;
      background: #1a1a1a;
      border-radius: 100px;
      padding: 6px 8px;
      gap: 4px;
      box-shadow: 0 8px 36px rgba(0,0,0,.32), 0 2px 8px rgba(0,0,0,.2);
    }

    ._pill-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 9px 16px;
      border-radius: 100px;
      border: none;
      background: transparent;
      color: #ccc;
      font-size: 12px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: background .15s, color .15s, transform .1s;
      white-space: nowrap;
    }
    ._pill-btn:hover {
      background: rgba(255,255,255,.08);
      color: #fff;
    }
    ._pill-btn:active { transform: scale(.96); }
    ._pill-btn.active {
      background: #fff;
      color: #1a1a1a;
    }
    ._pill-btn .icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    ._pill-divider {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,.1);
      flex-shrink: 0;
    }
  `;

  // ── Build UI ─────────────────────────────────────────────────────────────
  function build() {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);

    const wrap = document.createElement('div');
    wrap.id = '_op-wrap';

    // Tray (popup above pill for expandable items)
    const tray = document.createElement('div');
    tray.id = '_op-tray';

    // Pill bar
    const pill = document.createElement('div');
    pill.id = '_op-pill';

    let activeTrayItem = null;

    ITEMS.forEach((item, idx) => {
      // Pill button
      const btn = document.createElement('button');
      btn.className = '_pill-btn';
      btn.innerHTML = `<span class="icon" style="color:${item.color}">${item.icon}</span><span>${item.label}</span>`;

      if (idx > 0) {
        const div = document.createElement('div');
        div.className = '_pill-divider';
        pill.appendChild(div);
      }

      if (item.expand) {
        // Build tray card for this item
        const card = document.createElement('div');
        card.className = '_tray-card';
        card.innerHTML = `<span class="_tray-label">Revisi semua absen merah?</span>`;
        const revBtn = document.createElement('button');
        revBtn.className = '_tray-revisi';
        revBtn.textContent = 'Revisi Semua';
        revBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('[HRIS Tool] Revisi Semua clicked —', item.label, new Date().toLocaleTimeString());
          item.revisiAction();
        });
        card.appendChild(revBtn);

        btn.addEventListener('click', () => {
          item.action && item.action();
          const isOpen = tray.classList.contains('open') && activeTrayItem === idx;
          // close
          tray.classList.remove('open');
          tray.innerHTML = '';
          document.querySelectorAll('._pill-btn').forEach(b => b.classList.remove('active'));
          activeTrayItem = null;
          if (!isOpen) {
            tray.appendChild(card);
            tray.classList.add('open');
            btn.classList.add('active');
            activeTrayItem = idx;
          }
        });
      } else {
        btn.addEventListener('click', () => {
          // Close tray if open
          tray.classList.remove('open');
          tray.innerHTML = '';
          document.querySelectorAll('._pill-btn').forEach(b => b.classList.remove('active'));
          activeTrayItem = null;
          item.action && item.action();
        });
      }

      pill.appendChild(btn);
    });

    // Close tray on outside click
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        tray.classList.remove('open');
        tray.innerHTML = '';
        document.querySelectorAll('._pill-btn').forEach(b => b.classList.remove('active'));
        activeTrayItem = null;
      }
    });

    wrap.appendChild(tray);
    wrap.appendChild(pill);
    (document.getElementById('bodyHeaderID') || document.body).appendChild(wrap);
  }

  function tryBuild() {
    if (document.getElementById('_op-wrap')) return;
    if (document.getElementById('bodyHeaderID')) { build(); return; }
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', tryBuild)
      : setTimeout(tryBuild, 500);
  }

  tryBuild();
})();
