/* debtors-list.js
   পার্টি (DL) লেজার স্ক্রিন: ডেবটর/ক্রেডিটর লিস্ট রেন্ডার, জমা মোডাল,
   এবং ডিটেইল টেবিল থেকে row ডিলিট।
   Depends on (window.* এক্সপোজড, তাই লোড-অর্ডার independent):
     - notifPush, toBn, fmtAmt, fmtDate, _lsGet/_lsSet  <- js/shared-state.js
     - _fbAutoSync                                       <- js/firebase-sync.js
     - EP_META, epRender                                 <- js/fund-flow-ledger.js
   Exposes: dlRender (js/nav-shell.js এটা ব্যবহার করে)
   (এই ফাইল আগে fund-flow-ledger.js-এর একটা অংশ ছিল; ধাপ ৭-এর split-এ আলাদা করা হলো।)
*/
(function () {

  /* DEBTORS LIST — dl* ফাংশন
  */
  let _dlActiveCat = 'all';

  const _DL_META = {
    1: { label: 'রেগুলার কাস্টমার',    badgeCls: 'dl-badge-c1', amtField: 'baki' },
    2: { label: 'ইর-রেগুলার কাস্টমার', badgeCls: 'dl-badge-c2', amtField: 'baki' },
    3: { label: 'রেগুলার মহাজন',       badgeCls: 'dl-badge-c3', amtField: 'baki' },
    4: { label: 'ইর-রেগুলার মহাজন',    badgeCls: 'dl-badge-c4', amtField: 'baki' }
  };

  function dlTabChange(btn, cat) {
    _dlActiveCat = cat;
    document.querySelectorAll('#dlTabs .dl-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.cat === cat);
    });
    dlRender();
  }
window.dlTabChange = dlTabChange;

  function dlRender() {
    let q   = (document.getElementById('dlSearch').value || '').trim().toLowerCase();
    let all = [];

    [1, 2, 3, 4].forEach(function(n) {
      let list = window._lsGet(window.EP_META[n].key);
      list.forEach(function(item) {
        all.push(Object.assign({}, item, { _cat: n }));
      });
    });

    /* ক্যাটাগরি ফিল্টার */
    if (_dlActiveCat !== 'all') {
      let catNum = parseInt(_dlActiveCat);
      all = all.filter(function(item) { return item._cat === catNum; });
    }

    /* সার্চ ফিল্টার */
    if (q) {
      all = all.filter(function(item) {
        return (item.name || '').toLowerCase().indexOf(q) !== -1
            || (item.addr || '').toLowerCase().indexOf(q) !== -1
            || (item.mob  || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    /* কাউন্ট */
    let dlCountEl = document.getElementById('dlCount');
    if (dlCountEl) dlCountEl.textContent = all.length.toLocaleString('bn-BD') + ' জন';

    let wrap = document.getElementById('dlTableWrap');
    let foot = document.getElementById('dlFoot');

    if (!all.length) {
      wrap.innerHTML = '<div class="dl-empty">কোনো এন্ট্রি পাওয়া যায়নি</div>';
      foot.style.display = 'none';
      return;
    }

    /* মোট হিসাব */
    let totalPawona = all.reduce(function(s, x) { return (x._cat === 3 || x._cat === 4) ? s + (x.baki || 0) : s; }, 0);
    let totalBokea  = all.reduce(function(s, x) { return (x._cat === 1 || x._cat === 2) ? s + (x.baki || 0) : s; }, 0);

    let rows = '';
    all.forEach(function(item, i) {
      let baki   = item.baki || 0;
      let isCat  = item._cat;
      let catLbl = _DL_META[isCat].label;
      let isZero = baki === 0;
      let mobNum = item.mob || '';
      /* নম্বর ফরম্যাট: +880XXXXXXXXX বা 01XXXXXXXXX দুটোই handle */
      let waNum = '';
      if (mobNum) {
        if (mobNum.startsWith('+')) waNum = mobNum.slice(1);
        else if (mobNum.startsWith('0')) waNum = '880' + mobNum.slice(1);
        else waNum = mobNum;
      }
      let callBtn = mobNum
        ? '<a href="tel:' + mobNum + '" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#2e7d32,#43a047);color:#fff;text-decoration:none;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.15)" title="কল করুন"><i class="fa fa-phone"></i></a>'
        : '<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#3a3020;color:#6a5a40;font-size:13px;border:1px solid #4a3a20"><i class="fa fa-phone"></i></span>';
      let waBtn = waNum
        ? '<a href="https://wa.me/' + _esc(waNum) + '" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#25d366,#128c7e);color:#fff;text-decoration:none;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.15)" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>'
        : '<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#3a3020;color:#6a5a40;font-size:13px;border:1px solid #4a3a20"><i class="fa-brands fa-whatsapp"></i></span>';
      rows += '<tr data-cat="' + item._cat + '" data-item-id="' + item.id + '" data-raw-name="' + _esc(item.name||'') + '" data-raw-addr="' + _esc(item.addr||'') + '" data-raw-baki="' + baki + '">'
        + '<td data-field="name" style="min-width:110px;font-weight:700">' + _esc(item.name || '—') + '</td>'
        + '<td data-field="baki" class="' + (isZero ? 'td-joma' : 'td-baki') + '" style="min-width:80px">'
            + window.fmtAmt(baki) + '</td>'
        + '<td data-field="addr" style="min-width:110px;color:#5a4a30">' + _esc(item.addr || '—') + '</td>'
        + '<td data-field="readonly" style="min-width:80px;text-align:center">'
            + '<div style="display:flex;gap:6px;justify-content:center;align-items:center">'
            + callBtn + waBtn
            + '</div></td>'
        + '<td data-field="readonly" style="min-width:70px;text-align:center">'
            + '<button type="button" onclick="dlJomaOpen(' + item._cat + ',' + item.id + ',event)" style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:8px;background:linear-gradient(135deg,#1a5c35,#256b40);color:#fff;border:1px solid rgba(255,255,255,0.15);font-family:\'Noto Sans Bengali\',sans-serif;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.35);white-space:nowrap">'
            + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>জমা'
            + '</button></td>'
        + '</tr>';
    });

    let pawonaLabel;
    if (_dlActiveCat === 'all') {
      pawonaLabel = 'পাওনা/বকেয়া';
    } else if (_dlActiveCat === '1' || _dlActiveCat === '2') {
      pawonaLabel = 'বকেয়া/প্রাপ্য';
    } else {
      pawonaLabel = 'পাওনা/প্রদেয়';
    }

    wrap.innerHTML = '<table class="fv-excel">'
      + '<thead><tr>'
      + '<th>পার্টির নাম</th>'
      + '<th>' + pawonaLabel + '</th>'
      + '<th>ঠিকানা</th>'
      + '<th>যোগাযোগ</th>'
      + '<th>জমা</th>'
      + '</tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table>';

    foot.style.display = 'flex';
    document.getElementById('dlFootPawona').textContent = window.fmtAmt(totalPawona);
    document.getElementById('dlFootBokea').textContent  = window.fmtAmt(totalBokea);
  }
window.dlRender = dlRender;

  /* DL জমা মোডাল — ফাংশন
  */
  let _dlJomaCat = 0, _dlJomaItemId = 0;

  function dlJomaOpen(cat, itemId, evt) {
    evt.stopPropagation();
    _dlJomaCat    = cat;
    _dlJomaItemId = itemId;
    /* পার্টির নাম বের করা */
    let key  = window.EP_META[cat].key;
    let list = window._lsGet(key);
    let item = list.find(function(x){ return x.id === itemId; });
    document.getElementById('dlJomaName').textContent = item ? (item.name || '') : '';
    /* ফিল্ড ক্লিয়ার */
    ['dlJomaDate','dlJomaAmt','dlJomaNote'].forEach(function(id2){
      let el = document.getElementById(id2);
      if (!el) return;
      el.value = '';
      if (el.type === 'date') { el.type = 'text'; el.placeholder = ' '; }
      let field = el.closest('.fv-mini-field');
      if (field) field.classList.remove('has-val');
    });
    let overlay = document.getElementById('dlJomaOverlay');
    overlay.style.display = 'flex';
  }
window.dlJomaOpen = dlJomaOpen;

  function dlJomaClose() {
    document.getElementById('dlJomaOverlay').style.display = 'none';
    _dlJomaCat = 0; _dlJomaItemId = 0;
  }
window.dlJomaClose = dlJomaClose;

  function dlJomaSave() {
    let joma = parseFloat(document.getElementById('dlJomaAmt').value) || 0;
    if (!joma) { document.getElementById('dlJomaAmt').focus(); return; }
    let date = document.getElementById('dlJomaDate').value || new Date().toISOString().slice(0,10);
    let memo = '';
    let note = (document.getElementById('dlJomaNote').value || '').trim();
    let key  = window.EP_META[_dlJomaCat].key;
    let list = window._lsGet(key);
    let idx  = list.findIndex(function(x){ return x.id === _dlJomaItemId; });
    if (idx < 0) return;
    let isCustomer = window.EP_META[_dlJomaCat].type === 'customer';
    if (!list[idx].history) list[idx].history = [];
    list[idx].history.push({ type:'joma', memo: memo, date: date, joma: joma, note: note, ts: Date.now() });
    /* history থেকে সম্পূর্ণ recalculate */
    if (isCustomer) {
      let _tb = list[idx].bill || 0;
      let _tj = list[idx].joma || 0;
      list[idx].history.forEach(function(h) {
        if (h.type === 'bokeyoa') _tb += (h.bill || 0);
        else if (h.type === 'joma') _tj += (h.joma || 0);
      });
      list[idx].baki = Math.max(0, _tb - _tj);
    } else {
      let _tp3 = 0, _tjs3 = 0;
      list[idx].history.forEach(function(h) {
        if (h.type === 'bokeyoa') _tp3  += (h.baki || 0);
        else if (h.type === 'joma') _tjs3 += (h.joma || 0);
      });
      list[idx].baki = Math.max(0, _tp3 - _tjs3);
    }
    window._lsSet(key, list);
    window.epRender(_dlJomaCat);
    dlJomaClose();
    dlRender();
    if (typeof epUpdateCardStats === 'function') epUpdateCardStats();
    window._fbAutoSync();
  }
window.dlJomaSave = dlJomaSave;

  /* helper — HTML escape: এখন js/util-esc.js-এ single-source define করা,
     সব block ফাইলের আগে লোড হয়। এখানে আলাদা কপি রাখা হয়নি যাতে
     ভবিষ্যতে দুই জায়গায় আলাদা আলাদা ফিক্স করার ঝুঁকি না থাকে। */

  /* DETAIL TABLE — একটি row ডিলিট করা
  */
  function _fvDetailDeleteRow(tr, src, histIdx, n, itemId) {
    if (!confirm('এই লাইনটি মুছে ফেলবেন?')) return;

    let key  = window.EP_META[n].key;
    let list = window._lsGet(key);
    let idx  = list.findIndex(function(x){ return x.id === itemId; });
    if (idx < 0) return;
    let item = list[idx];
    let isCustomer = window.EP_META[n].type === 'customer';

    if (src === 'init') {
      /* প্রথম বকেয়া/পাওনা এন্ট্রি মুছি */
      if (isCustomer) { item.bill = 0; item.memo = ''; item.note = ''; item.goj = ''; }
      else            { item.baki = 0; item.memo = ''; item.note = ''; item.goj = ''; item.initPawna = 0; }
    } else if (src === 'init_joma') {
      /* প্রথম জমা এন্ট্রি মুছি */
      item.joma = 0;
    } else if (src === 'hist' && histIdx !== '') {
      let hi = parseInt(histIdx);
      if (item.history && item.history[hi] !== undefined) {
        item.history.splice(hi, 1);
      }
    }

    /* baki পুনর্গণনা */
    if (isCustomer) {
      let _tb = item.bill || 0;
      let _tj = item.joma || 0;
      (item.history || []).forEach(function(h) {
        if (h.type === 'bokeyoa') _tb += (h.bill || 0);
        else if (h.type === 'joma') _tj += (h.joma || 0);
      });
      item.baki = Math.max(0, _tb - _tj);
    } else {
      let _initP = (item.initPawna !== undefined) ? item.initPawna : (item.baki || 0) + (item.joma || 0);
      let _tp = _initP, _tjs = item.joma || 0;
      (item.history || []).forEach(function(h) {
        if (h.type === 'bokeyoa') _tp  += (h.baki || 0);
        else if (h.type === 'joma') _tjs += (h.joma || 0);
      });
      item.baki = Math.max(0, _tp - _tjs);
    }

    window._lsSet(key, list);
    window.epRender(n);
    window._fbAutoSync();
    /* এডিট মোড রিসেট করে ডিটেইল রিফ্রেশ */
    _detailEditActive = false;
    fvOpenDetail(n, itemId);
    window.notifPush('success', 'লাইনটি মুছে ফেলা হয়েছে।');
  }

  /* DETAIL SCREEN — ইনলাইন এডিট মোড
  */
  let _detailEditActive = false;

  function fvDetailToggleEditMode(n, itemId, btn) {
    /* এডিট চালু করতে সিক্রেট কী লাগবে, বন্ধ করতে লাগবে না */
    if (!_detailEditActive) {
      const entered = prompt('টেবিল এডিট করতে সিক্রেট কী দাও:');
      if (entered === null) return;
      if (entered !== _FB_SECRET) {
        window.showToast('ভুল সিক্রেট কী!', 'এডিট করা যাবে না।');
        return;
      }
    }
    _fvDetailToggleDo(n, itemId, btn);
  }
window.fvDetailToggleEditMode = fvDetailToggleEditMode;

  function _fvDetailToggleDo(n, itemId, btn) {
    let wrap = document.querySelector('#fvDetailBody .fv-excel-wrap');
    if (!wrap) return;
    let table = wrap.querySelector('.fv-excel');
    if (!table) return;

    if (!_detailEditActive) {
      /* এডিট মোড চালু */
      _detailEditActive = true;
      btn.classList.add('active');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      table.classList.add('edit-mode');

      table.querySelectorAll('tbody tr').forEach(function(tr) {
        tr.querySelectorAll('td').forEach(function(td) {
          let field = td.getAttribute('data-field');
          if (!field || field === 'readonly') return;

          td.classList.add('editable-cell');
          let rawVal = '';
          if (field === 'date')  rawVal = tr.getAttribute('data-raw-date')  || '';
          if (field === 'memo')  rawVal = tr.getAttribute('data-raw-memo')  || '';
          if (field === 'note')  rawVal = tr.getAttribute('data-raw-note')  || '';
          if (field === 'goj')   rawVal = tr.getAttribute('data-raw-goj')   || '';
          if (field === 'amt')   rawVal = tr.getAttribute('data-raw-amt')   || '';

          let inp = document.createElement('input');
          inp.className = 'cell-input';
          inp.setAttribute('data-field', field);
          if (field === 'date') {
            inp.type = 'date';
            inp.value = rawVal;
          } else if (field === 'amt') {
            inp.type = 'number';
            inp.inputMode = 'decimal';
            inp.value = rawVal;
            inp.style.textAlign = 'right';
          } else {
            inp.type = 'text';
            inp.value = rawVal;
          }
          td.textContent = '';
          td.appendChild(inp);
        });

        /* মন্তব্য কলামের পরে ডিলিট বাটন সেল যোগ */
        let delTd = document.createElement('td');
        delTd.setAttribute('data-field', 'del-btn');
        let src     = tr.getAttribute('data-src');
        let histIdx = tr.getAttribute('data-hist-idx');
        let delBtn  = document.createElement('button');
        delBtn.className = 'row-del-btn';
        delBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        delBtn.title = 'এই লাইন মুছুন';
        (function(r, s, hi, n2, iId) {
          delBtn.onclick = function(e) {
            e.stopPropagation();
            _fvDetailDeleteRow(r, s, hi, n2, iId);
          };
        })(tr, src, histIdx, n, itemId);
        delTd.appendChild(delBtn);
        tr.appendChild(delTd);
      });

    } else {
      /* সেভ মোড */
      _detailEditActive = false;
      btn.classList.remove('active');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
      table.classList.remove('edit-mode');

      let key  = window.EP_META[n].key;
      let list = window._lsGet(key);
      let itemIdx = list.findIndex(function(x){ return x.id === itemId; });
      if (itemIdx < 0) return;
      let item = list[itemIdx];
      let isCustomer = window.EP_META[n].type === 'customer';

      table.querySelectorAll('tbody tr').forEach(function(tr) {
        /* ডিলিট বাটন সেল সরাই */
        let delTd = tr.querySelector('td[data-field="del-btn"]');
        if (delTd) tr.removeChild(delTd);

        let src     = tr.getAttribute('data-src');
        let histIdx = tr.getAttribute('data-hist-idx');
        let txnType = tr.getAttribute('data-txn-type');
        if (!src) return;

        /* input মান পড়ি */
        function getInp(field) {
          let inp = tr.querySelector('input.cell-input[data-field="' + field + '"]');
          return inp ? inp.value.trim() : '';
        }
        let newDate = getInp('date');
        let newMemo = getInp('memo');
        let newNote = getInp('note');
        let newGoj  = getInp('goj');
        let newAmt  = parseFloat(getInp('amt'));

        if (src === 'init') {
          /* প্রথম/প্রাথমিক এন্ট্রি */
          if (newDate) item.date = newDate;
          if (newMemo !== '') item.memo = newMemo;
          if (newNote !== '') item.note = newNote;
          if (newGoj  !== '') item.goj  = newGoj;
          if (!isNaN(newAmt) && newAmt >= 0) {
            if (isCustomer) { item.bill = newAmt; }
            else            { item.baki = newAmt; }
          }
        } else if (src === 'init_joma') {
          if (newDate) item.date = newDate;
          if (!isNaN(newAmt) && newAmt >= 0) item.joma = newAmt;
        } else if (src === 'hist' && histIdx !== '') {
          let hi = parseInt(histIdx);
          let h  = item.history && item.history[hi];
          if (!h) return;
          if (newDate) h.date = newDate;
          if (newMemo !== '') h.memo = newMemo;
          if (newNote !== '') h.note = newNote;
          if (newGoj  !== '') h.goj  = newGoj;
          if (!isNaN(newAmt) && newAmt >= 0) {
            if (h.type === 'bokeyoa') {
              if (isCustomer) h.bill = newAmt;
              else            h.baki = newAmt;
            } else if (h.type === 'joma') {
              h.joma = newAmt;
            }
          }
        }
      });

      /* baki পুনর্গণনা করি সমস্ত history থেকে */
      if (isCustomer) {
        let totalBill = item.bill || 0;
        let totalJoma = item.joma || 0;
        (item.history || []).forEach(function(h) {
          if (h.type === 'bokeyoa') totalBill += (h.bill || 0);
          else if (h.type === 'joma') totalJoma += (h.joma || 0);
        });
        item.baki = Math.max(0, totalBill - totalJoma);
      } else {
        /* সরবরাহকারী — history থেকে সম্পূর্ণ পুনর্গণনা */
        if ((item.history||[]).length === 0) {
          /* history নেই — শুধু init entry আছে, item.baki ইতিমধ্যে সেট হয়েছে */
        } else {
          let _initPE = (item.initPawna !== undefined) ? item.initPawna : (item.baki || 0) + (item.joma || 0);
          let _initJE = item.joma || 0;
          let totalPawna = _initPE;
          let totalJomaSup = _initJE;
          (item.history || []).forEach(function(h) {
            if (h.type === 'bokeyoa') totalPawna   += (h.baki || 0);
            else if (h.type === 'joma') totalJomaSup += (h.joma || 0);
          });
          item.baki = Math.max(0, totalPawna - totalJomaSup);
        }
      }

      window._lsSet(key, list);
      window.epRender(n);
      window._fbAutoSync();
      fvOpenDetail(n, itemId);
      window.notifPush('success', 'টেবিল এডিট সেভ হয়েছে।');
    }
  }


})();
