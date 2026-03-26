// ==UserScript==
// @name         HRIS Tool by Ade Ivan
// @namespace    http://tampermonkey.net/
// @version      8.1
// @match        *://hris.bakmigm.co.id/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/heyadeivan/stuckbrain/main/script3.user.js
// @downloadURL  https://raw.githubusercontent.com/heyadeivan/stuckbrain/main/script3.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // revisedSet  : inputs fixed by "Revisi Semua" — permanently orange
  // coloringNow : re-entrancy guard so MutationObserver won't loop on itself
  // ─────────────────────────────────────────────────────────────────────────
  const revisedSet  = new WeakSet();
  let   coloringNow = false;

  // ── Utility ───────────────────────────────────────────────────────────────
  const pad = n => String(n).padStart(2, '0');

  function getDoc() {
    try {
      const f = window.frames.ifrmSunFishBody;
      return (f && f.document && f.document.body) ? f.document : document;
    } catch (e) { return document; }
  }

  function timeToMinutes(val) {
    const parts = (val || '').trim().split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return (isNaN(h) || isNaN(m)) ? null : h * 60 + m;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COLOR ENGINE
  //
  // KEY FIX: applyColor() always enforces display:inline on EVERY colored
  // input — green, red, and orange alike. The site's ChangeSetStat() /
  // setTimeFormat() functions set display:block on inputs after they run,
  // which causes a line-break after the &nbsp; in the <td>. We counteract
  // this for every color pass, not just revised inputs.
  //
  // no-op guard: only writes style when something actually changes, so the
  // MutationObserver watching childList won't create a feedback loop.
  // ─────────────────────────────────────────────────────────────────────────
  const ORANGE = 'rgb(255, 213, 128)';  // #FFD580
  const GREEN  = 'rgb(168, 240, 198)';  // #A8F0C6
  const RED    = 'rgb(244, 168, 168)';  // #F4A8A8
  const TEXT   = 'rgb(17, 17, 17)';     // #111

  function applyColor(el, rgbColor) {
    const changed =
      el.style.backgroundColor !== rgbColor ||
      el.style.color            !== TEXT     ||
      el.style.display          !== 'inline';
    if (!changed) return; // true no-op — won't fire MutationObserver
    el.style.backgroundColor = rgbColor;
    el.style.color           = TEXT;
    el.style.display         = 'inline'; // ← fix display:block from site JS (all colors)
  }

  function colorInput(input) {
    const name    = input.name || '';
    const isStart = name.startsWith('txt_Start_');
    const isEnd   = name.startsWith('txt_End_');
    if (!isStart && !isEnd) return;

    // Permanently revised → always orange
    if (revisedSet.has(input)) {
      applyColor(input, ORANGE);
      return;
    }

    const val  = input.value.trim();
    const mins = timeToMinutes(val);

    if (!val || mins === null) { applyColor(input, RED); return; }

    const good = isStart ? (mins <= 8 * 60 + 30) : (mins >= 17 * 60 + 30);
    applyColor(input, good ? GREEN : RED);
  }

  function colorAllInputs() {
    if (coloringNow) return;
    coloringNow = true;
    try {
      getDoc()
        .querySelectorAll('input[name^="txt_Start_"], input[name^="txt_End_"]')
        .forEach(colorInput);
    } finally {
      coloringNow = false;
    }
  }

  // rAF debounce — batches rapid DOM mutations into one repaint
  let rafPending = false;
  function colorAllDebounced() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; colorAllInputs(); });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT ATTACHMENT
  // MutationObserver watches childList only (NOT attributes/style) to avoid
  // the restyle → mutation → restyle feedback loop.
  // ─────────────────────────────────────────────────────────────────────────
  const attachedDocs = new WeakSet();

  function attachEvents(d) {
    if (attachedDocs.has(d)) return;
    attachedDocs.add(d);

    d.addEventListener('input', e => {
      const n = e.target.name || '';
      if (n.startsWith('txt_Start_') || n.startsWith('txt_End_')) colorInput(e.target);
    }, true);

    d.addEventListener('blur', e => {
      const n = e.target.name || '';
      if (n.startsWith('txt_Start_') || n.startsWith('txt_End_')) colorInput(e.target);
    }, true);

    // childList only — structural DOM additions, never style attribute mutations
    new MutationObserver(muts => {
      if (muts.some(m => m.addedNodes.length > 0)) colorAllDebounced();
    }).observe(d.body || d.documentElement, { childList: true, subtree: true });
  }

  function initColorWatcher() {
    colorAllInputs();
    attachEvents(document);

    let tries = 0;
    const t = setInterval(() => {
      const d = getDoc();
      if (d !== document && d.body) {
        clearInterval(t);
        colorAllInputs();
        attachEvents(d);
      }
      if (++tries > 60) clearInterval(t);
    }, 500);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HARI LIBUR
  // Guard: tr.dataset.hlDone set on the ORIGINAL row before any DOM work.
  // The polling interval always finds the original row (hidden but still in
  // DOM with SelStatus_ input) — so guarding the original row prevents
  // duplicate replacement rows.
  // ─────────────────────────────────────────────────────────────────────────
  function extractDateLabel(tr) {
    for (const td of tr.querySelectorAll('td')) {
      if (td.querySelector('input,select,textarea,button')) continue;
      const t = td.textContent.trim();
      if (!t) continue;
      if (/^[A-Za-z]{3},?\s+[A-Za-z]{3}\s+\d{1,2}/.test(t)) return t;
      if (/\d{1,4}[-/]\d{1,2}[-/]\d{2,4}/.test(t)) return t;
    }
    for (const td of tr.querySelectorAll('td')) {
      if (td.querySelector('input,select,textarea,button')) continue;
      const t = td.textContent.trim();
      if (t) return t;
    }
    return '—';
  }

  function processOffRow(tr) {
    if (tr.dataset.hlDone) return;   // guard on ORIGINAL row — prevents duplicates
    tr.dataset.hlDone = '1';

    tr.querySelectorAll('input,select,textarea,button').forEach(el => {
      el.disabled            = true;
      el.style.pointerEvents = 'none';
    });

    const label    = extractDateLabel(tr);
    const colCount = tr.querySelectorAll('td,th').length || 8;

    tr.style.display = 'none';

    const rep    = tr.ownerDocument.createElement('tr');
    rep.style.background = '#f5f5f5';

    const tdDate = tr.ownerDocument.createElement('td');
    tdDate.style.cssText = 'padding:5px 10px;font-size:12px;font-weight:600;color:#555;white-space:nowrap;border-bottom:1px solid #e8e8e8;';
    tdDate.textContent   = label;

    const tdInfo = tr.ownerDocument.createElement('td');
    tdInfo.colSpan       = Math.max(1, colCount - 1);
    tdInfo.style.cssText = 'padding:5px 10px;font-size:12px;color:#bbb;font-style:italic;border-bottom:1px solid #e8e8e8;';
    tdInfo.textContent   = 'HARI LIBUR';

    rep.appendChild(tdDate);
    rep.appendChild(tdInfo);
    tr.parentNode.insertBefore(rep, tr.nextSibling);
  }

  function scanOffRows() {
    getDoc().querySelectorAll('input[name^="SelStatus_"]').forEach(input => {
      if (input.value !== 'OFF') return;
      const tr = input.closest('tr');
      if (tr) processOffRow(tr);
    });
  }

  function initOffCleaner() {
    let waitTries = 0;
    const wait = setInterval(() => {
      if (!getDoc().querySelector('input[name^="SelStatus_"]')) {
        if (++waitTries > 100) clearInterval(wait);
        return;
      }
      clearInterval(wait);
      scanOffRows();
      let polls = 0;
      const poll = setInterval(() => {
        scanOffRows();
        if (++polls >= 20) clearInterval(poll);
      }, 300);
    }, 300);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-FILL DATES
  // ─────────────────────────────────────────────────────────────────────────
  function tryAutoFill() {
    const txtDate   = document.getElementById('txtDate');
    const txtToDate = document.getElementById('txtToDate');
    if (!txtDate || !txtToDate) return;

    const today     = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 11);
    const fromVal   = `${pad(prevMonth.getMonth() + 1)}/${pad(11)}/${prevMonth.getFullYear()}`;
    const toVal     = `${pad(today.getMonth() + 1)}/${pad(today.getDate())}/${today.getFullYear()}`;

    if (txtDate.value === fromVal && txtToDate.value === toVal) return;

    txtDate.value   = fromVal;
    txtToDate.value = toVal;
    txtDate.dispatchEvent(new Event('change', { bubbles: true }));
    txtToDate.dispatchEvent(new Event('change', { bubbles: true }));

    const frm = document.forms['frmRequest'] || document.querySelector('form');
    if (typeof form_submit === 'function' && frm) form_submit(frm);
    else if (frm) frm.submit();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REVISI SEMUA
  // ─────────────────────────────────────────────────────────────────────────
  function isRedNow(el) {
    if (!el)                return false;
    if (revisedSet.has(el)) return false;       // already revised
    if (!el.value.trim())   return true;        // empty = red
    const bg = el.style.backgroundColor;
    return bg === RED || bg === '#F4A8A8' || bg === '#f4a8a8' || bg.includes('244, 168, 168');
  }

  function lockOrange(el) {
    revisedSet.add(el);
    applyColor(el, ORANGE); // uses applyColor → enforces display:inline too
  }

  function revisiSemua() {
    const doc = getDoc();

    doc.querySelectorAll('input[name^="txt_Start_"]').forEach(startEl => {
      const num = startEl.name.replace('txt_Start_', '');

      const selStatus = doc.querySelector(`input[name="SelStatus_${num}"]`);
      if (selStatus && selStatus.value === 'OFF') return;

      const statSel = doc.querySelector(`select[name="selStatCode_${num}"]`);
      if (statSel && statSel.value === 'L1') return;

      const endEl    = doc.querySelector(`input[name="txt_End_${num}"]`);
      const checkbox = doc.querySelector(`input[name="selStatChange_${num}"]`);
      const txtChg   = doc.querySelector(`input[name="txtChange_${num}"]`);

      const fixStart = isRedNow(startEl);
      const fixEnd   = endEl && isRedNow(endEl);
      if (!fixStart && !fixEnd) return;

      if (fixStart) { startEl.value = '08:30'; lockOrange(startEl); }
      if (fixEnd)   { endEl.value   = '17:30'; lockOrange(endEl);   }
      if (checkbox) checkbox.checked = true;
      if (txtChg)   txtChg.value     = '1';

      if (statSel) {
        statSel.value = 'ACRSHI';
        statSel.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Re-enforce after site JS (ChangeSetStat / setTimeFormat) runs
      const reEnforce = () => {
        if (fixStart) lockOrange(startEl);
        if (fixEnd)   lockOrange(endEl);
      };

      setTimeout(() => {
        if (typeof ChangeSetStat === 'function') ChangeSetStat(Number(num));
        reEnforce();
        setTimeout(reEnforce, 150);
      }, 300);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ITEMS
  // ─────────────────────────────────────────────────────────────────────────
  const ITEMS = [
    {
      label: 'Koreksi Absen',
      icon:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M7 12l3.5 3.5L17 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      color: '#2DB870',
      expand: true,
      navAction:    () => typeof scutlink === 'function' && scutlink('index.cfm?FID=HR8713&FUID=HR87130002&menu=1&selRequestBy=0'),
      revisiAction: revisiSemua,
    },
    {
      label: 'Reimburse',
      icon:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
      color: '#E05A2B',
      expand: false,
      navAction: () => typeof scutlink === 'function' && scutlink('index.cfm?helpcategory_id=xxx&FID=HR7195&menu=1&refresh=%7Bts%20%272026%2D03%2D04%2008%3A59%3A37%27%7D'),
    },
    {
      label: 'Ajukan Cuti',
      icon:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,
      color: '#7C3AED',
      expand: false,
      navAction: () => typeof scutlink === 'function' && scutlink('index.cfm?helpcategory_id=eHRMTimeAndAttendance&FID=HR0543&menu=1&refresh=%7Bts%20%272026%2D03%2D04%2008%3A56%3A44%27%7D'),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // CSS
  // ─────────────────────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
    #_op-wrap {
      position:fixed; bottom:42px; left:50%; transform:translateX(-50%);
      z-index:2147483647; display:flex; flex-direction:column;
      align-items:center; gap:10px; font-family:'DM Sans',sans-serif; pointer-events:none;
    }
    #_op-tray {
      pointer-events:none; display:flex; flex-direction:column; gap:8px;
      align-items:center; opacity:0; transform:translateY(8px);
      transition:opacity .22s ease, transform .22s ease;
    }
    #_op-tray.open { pointer-events:auto; opacity:1; transform:translateY(0); }
    ._tray-card {
      background:#1a1a1a; border-radius:16px; padding:14px 18px;
      display:flex; align-items:center; gap:12px;
      box-shadow:0 8px 32px rgba(0,0,0,.28); min-width:220px;
    }
    ._tray-label { font-size:13px; font-weight:600; color:#fff; flex:1; }
    ._tray-revisi {
      background:#F5A623; color:#fff; border:none; border-radius:50px;
      padding:7px 16px; font-size:12px; font-weight:700;
      font-family:'DM Sans',sans-serif; cursor:pointer;
      transition:background .12s,transform .1s; pointer-events:auto;
    }
    ._tray-revisi:hover  { background:#e09510; transform:scale(1.04); }
    ._tray-revisi:active { transform:scale(.97); }
    #_op-pill {
      pointer-events:auto; display:flex; align-items:center;
      background:#1a1a1a; border-radius:100px; padding:6px 8px; gap:4px;
      box-shadow:0 8px 36px rgba(0,0,0,.32),0 2px 8px rgba(0,0,0,.2);
    }
    ._pill-btn {
      display:flex; align-items:center; gap:7px; padding:9px 16px;
      border-radius:100px; border:none; background:transparent; color:#ccc;
      font-size:12px; font-weight:600; font-family:'DM Sans',sans-serif;
      cursor:pointer; transition:background .15s,color .15s,transform .1s; white-space:nowrap;
    }
    ._pill-btn:hover  { background:rgba(255,255,255,.08); color:#fff; }
    ._pill-btn:active { transform:scale(.96); }
    ._pill-btn.active { background:#fff; color:#1a1a1a; }
    ._pill-btn .icon  { display:flex; align-items:center; flex-shrink:0; }
    ._pill-divider    { width:1px; height:20px; background:rgba(255,255,255,.1); flex-shrink:0; }
  `;

  // ─────────────────────────────────────────────────────────────────────────
  // UI
  // Panel is always inserted inside #bodyHeaderID.
  // buildUI() is idempotent — checks #_op-wrap existence first.
  // tryBuildUI() only calls buildUI() once #bodyHeaderID exists in DOM.
  // ─────────────────────────────────────────────────────────────────────────
  function buildUI() {
    // Strict duplicate guard — if the panel already exists anywhere, stop
    if (document.getElementById('_op-wrap')) return;

    const host = document.getElementById('bodyHeaderID');
    if (!host) return; // not ready yet — tryBuildUI will retry

    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);

    const wrap = document.createElement('div'); wrap.id = '_op-wrap';
    const tray = document.createElement('div'); tray.id = '_op-tray';
    const pill = document.createElement('div'); pill.id = '_op-pill';
    let activeTrayIdx = null;

    const closeTray = () => {
      tray.classList.remove('open');
      tray.innerHTML = '';
      wrap.querySelectorAll('._pill-btn').forEach(b => b.classList.remove('active'));
      activeTrayIdx = null;
    };

    ITEMS.forEach((item, idx) => {
      if (idx > 0) {
        const sep = document.createElement('div');
        sep.className = '_pill-divider';
        pill.appendChild(sep);
      }

      const btn = document.createElement('button');
      btn.className = '_pill-btn';
      btn.innerHTML = `<span class="icon" style="color:${item.color}">${item.icon}</span><span>${item.label}</span>`;

      if (item.expand) {
        const card   = document.createElement('div');
        card.className = '_tray-card';

        const lbl = document.createElement('span');
        lbl.className   = '_tray-label';
        lbl.textContent = 'Revisi semua absen merah?';

        const revBtn = document.createElement('button');
        revBtn.className   = '_tray-revisi';
        revBtn.textContent = 'Revisi Semua';
        revBtn.addEventListener('click', e => { e.stopPropagation(); item.revisiAction(); });

        card.appendChild(lbl);
        card.appendChild(revBtn);

        btn.addEventListener('click', () => {
          item.navAction && item.navAction();
          const wasOpen = activeTrayIdx === idx;
          closeTray();
          if (!wasOpen) {
            tray.appendChild(card);
            tray.classList.add('open');
            btn.classList.add('active');
            activeTrayIdx = idx;
          }
        });

      } else {
        btn.addEventListener('click', () => {
          closeTray();
          item.navAction && item.navAction();
        });
      }

      pill.appendChild(btn);
    });

    document.addEventListener('click', e => { if (!wrap.contains(e.target)) closeTray(); });

    wrap.appendChild(tray);
    wrap.appendChild(pill);
    host.appendChild(wrap); // always inside #bodyHeaderID
  }

  function tryBuildUI() {
    if (document.getElementById('_op-wrap')) return; // already exists
    if (document.getElementById('bodyHeaderID')) {
      buildUI();
      return;
    }
    // bodyHeaderID not yet in DOM — keep waiting
    setTimeout(tryBuildUI, 300);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────
  function init() {
    tryAutoFill();
    initOffCleaner();
    initColorWatcher();
    tryBuildUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
