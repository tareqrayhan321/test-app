/* fabric-purchase.js
   কাপড় ক্রয় — DCA (গড় দর) সিস্টেম। Data: [{id, name, unit, purchases:[{id,qty,rate,total}]}]
   Depends on (window.* এক্সপোজড):
     - _esc                       <- js/util-shared.js
     - _lsGet, toBn, fmtAmt        <- js/shared-state.js
     - _fbAutoSync, _delIdsAdd     <- js/firebase-sync.js (typeof-গার্ডেড)
     - EP_META                     <- js/fund-flow-ledger.js
   (এই ফাইল আগে fabric-purchase.js-এর একটা অংশ ছিল; profit-strip ও agg-report-card
    অংশ এখন যথাক্রমে js/profit-strip.js এবং js/agg-report-card.js-এ। ধাপ ৭-এর split।)
*/
(function () {

/* কাপড় ক্রয় — DCA (গড় দর) সিস্টেম
   Data: [{id, name, unit, purchases:[{id,qty,rate,total}]}]
*/
/* কাপড় ক্রয় হিসাব — FABRIC PURCHASE
  */
  /* কাপড় ক্রয় — DCA (গড় দর) সিস্টেম
     Data: [{id, name, unit, purchases:[{id,qty,rate,total}]}]
  */
  const FAB_KEY = 'fabricPurchaseData_v2';

  function fabricGetData() {
    try { return JSON.parse(localStorage.getItem(FAB_KEY) || '[]'); } catch (e) { console.error(FAB_KEY + ' parse error:', e); return []; }
  }
  function fabricSaveData(arr) { localStorage.setItem(FAB_KEY, JSON.stringify(arr)); if (typeof _fbAutoSync === 'function') _fbAutoSync(); }

  function fabricOpen() {
    document.getElementById('fabricOverlay').style.display = 'flex';
    fabricRender();
    fabricUpdateCard();
  }
  function fabricClose() {
    document.getElementById('fabricOverlay').style.display = 'none';
    document.getElementById('fabricFormWrap').style.display = 'none';
  }
  function fabricToggleForm() {
    let fw = document.getElementById('fabricFormWrap');
    let isOpen = fw.style.display !== 'none';
    fw.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) { document.getElementById('fabName').focus(); fabricCalcPreview(); }
  }
  function fabricCalcPreview() {
    let qty  = parseFloat(document.getElementById('fabQty').value)  || 0;
    let rate = parseFloat(document.getElementById('fabRate').value) || 0;
    let prev = document.getElementById('fabTotalPreview');
    if (prev) prev.textContent = (qty && rate) ? 'মোট: ৳' + (qty * rate).toLocaleString('en-IN') : '';
  }
  document.addEventListener('DOMContentLoaded', function() {
    ['fabQty','fabRate'].forEach(function(id) {
      let el = document.getElementById(id);
      if (el) el.addEventListener('input', fabricCalcPreview);
    });
  });

  /* নতুন কাপড় (নতুন গ্রুপ) save */
  function fabricSave() {
    let name = (document.getElementById('fabName').value || '').trim();
    let qty  = parseFloat(document.getElementById('fabQty').value)  || 0;
    let unit = document.getElementById('fabUnit').value || 'গজ';
    let rate = parseFloat(document.getElementById('fabRate').value) || 0;
    if (!name)    { window.showToast('তথ্য অসম্পূর্ণ', 'কাপড়ের নাম লিখুন'); return; }
    if (qty <= 0) { window.showToast('তথ্য অসম্পূর্ণ', 'পরিমাণ দিন'); return; }
    if (rate <= 0){ window.showToast('তথ্য অসম্পূর্ণ', 'একক দর দিন'); return; }

    let data = fabricGetData();
    /* একই নামের গ্রুপ আছে কিনা চেক */
    let existing = data.find(function(g){ return g.name.toLowerCase() === name.toLowerCase(); });
    if (existing) {
      /* আছে → নতুন purchase যোগ করো */
      existing.purchases.unshift({ id: Date.now(), date: new Date().toISOString(), qty: qty, rate: rate, total: qty * rate });
    } else {
      /* নেই → নতুন গ্রুপ */
      data.unshift({ id: Date.now(), name: name, unit: unit,
        purchases: [{ id: Date.now() + 1, date: new Date().toISOString(), qty: qty, rate: rate, total: qty * rate }] });
    }
    fabricSaveData(data);
    ['fabName','fabQty','fabRate'].forEach(function(id){ document.getElementById(id).value = ''; });
    document.getElementById('fabTotalPreview').textContent = '';
    document.getElementById('fabricFormWrap').style.display = 'none';
    fabricRender();
    fabricUpdateCard();
  }

  /* গ্রুপের ভেতরে নতুন purchase (DCA row) save */
  function fabricDcaSave(groupId) {
    let qtyEl  = document.getElementById('fab-dca-qty-'  + groupId);
    let rateEl = document.getElementById('fab-dca-rate-' + groupId);
    let qty    = parseFloat(qtyEl  ? qtyEl.value  : 0) || 0;
    let rate   = parseFloat(rateEl ? rateEl.value : 0) || 0;
    if (qty <= 0) { window.showToast('তথ্য অসম্পূর্ণ', 'পরিমাণ দিন'); return; }
    if (rate <= 0){ window.showToast('তথ্য অসম্পূর্ণ', 'দর দিন'); return; }

    let data  = fabricGetData();
    let group = data.find(function(g){ return g.id === groupId; });
    if (!group) return;
    group.purchases.unshift({ id: Date.now(), date: new Date().toISOString(), qty: qty, rate: rate, total: qty * rate });
    fabricSaveData(data);
    fabricRender();
    fabricUpdateCard();
  }

  /* একটা purchase মুছো */
  function fabricDeletePurchase(groupId, purchaseId) {
    if (!confirm('এই ক্রয় মুছবেন?')) return;
    let data  = fabricGetData();
    let group = data.find(function(g){ return g.id === groupId; });
    if (!group) return;
    group.purchases = group.purchases.filter(function(p){ return p.id !== purchaseId; });
    if (typeof _delIdsAdd === 'function') _delIdsAdd('fabricPurchaseData_v2_purchases', purchaseId);
    if (group.purchases.length === 0) {
      /* গ্রুপেও কিছু নেই → গ্রুপ মুছো */
      data = data.filter(function(g){ return g.id !== groupId; });
      if (typeof _delIdsAdd === 'function') _delIdsAdd('fabricPurchaseData_v2', groupId);
    }
    fabricSaveData(data);
    fabricRender();
    fabricUpdateCard();
  }

  /* DCA inline form toggle */
  function fabricToggleDcaForm(groupId) {
    let form = document.getElementById('fab-dca-form-' + groupId);
    if (!form) return;
    let isOpen = form.style.display !== 'none';
    /* সব DCA form বন্ধ করো আগে */
    document.querySelectorAll('.fab-dca-form').forEach(function(el){ el.style.display = 'none'; });
    if (!isOpen) {
      form.style.display = 'block';
      let qEl = document.getElementById('fab-dca-qty-' + groupId);
      if (qEl) qEl.focus();
    }
  }

  function fabricRender() {
    let data   = fabricGetData();
    let search = (document.getElementById('fabricSearch') ? document.getElementById('fabricSearch').value : '').toLowerCase();
    if (search) data = data.filter(function(g){ return g.name.toLowerCase().includes(search); });

    let hasData = fabricGetData().length > 0;
    document.getElementById('fabricEmpty').style.display     = hasData ? 'none'  : 'block';
    document.getElementById('fabricTableWrap').style.display = hasData ? 'block' : 'none';
    document.getElementById('fabricFilterBar').style.display = hasData ? 'block' : 'none';

    let list = document.getElementById('fabricCardsList');
    if (!list) return;

    let grandTotal = 0;
    let cardsHTML = '';

    function fabricFmtDate(p) {
      let BN_MONTHS = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্ট','অক্টো','নভে','ডিসে'];
      let d = new Date(p.date || p.id || Date.now());
      if (isNaN(d.getTime())) d = new Date();
      let dd = String(d.getDate()).padStart(2, '0');
      let mon = BN_MONTHS[d.getMonth()];
      let yy = d.getFullYear();
      return dd + ' ' + mon + ' ' + yy;
    }

    data.forEach(function(g) {
      let gTotalQty = g.purchases.reduce(function(s,p){ return s + p.qty; }, 0);
      let gTotalAmt = g.purchases.reduce(function(s,p){ return s + p.total; }, 0);
      let gAvgRate  = gTotalQty > 0 ? gTotalAmt / gTotalQty : 0;
      grandTotal   += gTotalAmt;

      let multiPurchase = g.purchases.length > 1;

      let rowsHTML = '';
      g.purchases.forEach(function(p, idx) {
        rowsHTML +=
          '<div style="display:flex; align-items:center; gap:8px; padding:9px 14px;' +
            (idx % 2 === 1 ? 'background:rgba(20,20,19,0.015);' : '') +
            (idx > 0 ? 'border-top:1px solid #ebe6df;' : '') + '">' +
            '<span style="font-size:10px; color:#8e8b82; font-family:var(--fab-mono,monospace); width:82px; flex-shrink:0; white-space:nowrap;">' + fabricFmtDate(p) + '</span>' +
            '<span style="flex:1; font-size:12px; color:#3d3d3a; font-family:var(--fab-mono,monospace);">' + p.qty.toLocaleString('en-IN') + ' ' + (g.unit||'গজ') + ' × ৳' + p.rate.toLocaleString('en-IN') + '</span>' +
            '<span class="fab-total-cell" style="font-size:12px;">৳' + p.total.toLocaleString('en-IN') + '</span>' +
            '<button type="button" class="fab-del-btn" onclick="fabricDeletePurchase(' + g.id + ',' + p.id + ')">×</button>' +
          '</div>';
      });

      cardsHTML +=
        '<div class="fab-group-card">' +
          '<div class="fab-group-head">' +
            '<div>' +
              '<span class="fab-group-title">' + _esc(g.name) + '</span>' +
              '<span class="fab-group-unit-tag">' + (g.unit||'গজ') + '</span>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
              (multiPurchase ? '<span class="fab-avg-badge">গড় দর ৳' + gAvgRate.toFixed(1) + '</span>' : '') +
              '<button type="button" class="fab-add-more-btn" onclick="fabricToggleDcaForm(' + g.id + ')">+ আরো কিনেছি</button>' +
            '</div>' +
          '</div>' +
          '<div id="fab-dca-form-' + g.id + '" class="fab-dca-form" style="display:none; padding:12px 14px; background:#fdf6f0; border-top:1px dashed #e6dfd8;">' +
            '<div style="display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">' +
              '<div style="flex:1; min-width:80px;">' +
                '<label class="fab-label">পরিমাণ (' + (g.unit||'গজ') + ')</label>' +
                '<input id="fab-dca-qty-' + g.id + '" type="number" min="0" step="0.5"' +
                  'class="fab-input" style="width:100%; box-sizing:border-box;" placeholder="0">' +
              '</div>' +
              '<div style="flex:1; min-width:80px;">' +
                '<label class="fab-label">দর (টাকা/' + (g.unit||'গজ') + ')</label>' +
                '<input id="fab-dca-rate-' + g.id + '" type="number" min="0"' +
                  'class="fab-input" style="width:100%; box-sizing:border-box;" placeholder="0">' +
              '</div>' +
              '<button type="button" onclick="fabricDcaSave(' + g.id + ')" style="' +
                'background:#5db8a6; color:#fff; border:none; border-radius:8px;' +
                'padding:9px 14px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;' +
                'font-family:var(--fab-sans,sans-serif);">যোগ করুন</button>' +
              '<button type="button" onclick="fabricToggleDcaForm(' + g.id + ')" style="' +
                'background:#faf9f5; color:#141413; border:1px solid #e6dfd8; border-radius:8px;' +
                'padding:9px 10px; font-size:12px; cursor:pointer;">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="fab-group-body">' + rowsHTML + '</div>' +
        '</div>';
    });

    list.innerHTML = cardsHTML;
  }

  function fabricUpdateCard() {
    let data = fabricGetData();
    let el    = document.getElementById('fabricCardCount');
    let elDash = document.getElementById('fabricCardCountDash');
    if (!el && !elDash) return;
    let text;
    if (data.length === 0) {
      text = 'ক্রয় তালিকা';
    } else {
      let total = data.reduce(function(s,g){
        return s + g.purchases.reduce(function(ss,p){ return ss + p.total; }, 0); }, 0);
      let count = data.reduce(function(s,g){ return s + g.purchases.length; }, 0);
      text = count + 'টি | ৳' + total.toLocaleString('en-IN');
    }
    if (el)     el.textContent     = text;
    if (elDash) elDash.textContent = text;
  }

  document.addEventListener('DOMContentLoaded', fabricUpdateCard);

  /* রেগুলার/ইর-রেগুলার কাস্টমার ও মহাজন কার্ডে মোট জন ও টাকা দেখানো */
  function epUpdateCardStats() {
    [1, 2, 3, 4].forEach(function(n) {
      let meta = EP_META[n];
      let el = document.getElementById('c' + n + 'CardStat');
      if (!el || !meta) return;
      let list = window._lsGet(meta.key);
      let count = list.length;
      let total = list.reduce(function(s, x) { return s + (x.baki || 0); }, 0);
      el.textContent = 'মোট ' + toBn(count) + ' জন · ' + fmtAmt(total);
    });

    /* পার্টি কার্ড — শুধু কাস্টমার (ক্যাটাগরি ১ ও ২) মিলিয়ে */
    let partyEl = document.getElementById('c10CardStat');
    if (partyEl) {
      let custCount = 0, custTotal = 0;
      [1, 2].forEach(function(n) {
        let list = window._lsGet(window.EP_META[n].key);
        custCount += list.length;
        custTotal += list.reduce(function(s, x) { return s + (x.baki || 0); }, 0);
      });
      partyEl.textContent = 'মোট ' + toBn(custCount) + ' জন · ' + fmtAmt(custTotal);
    }
  }
  window.epUpdateCardStats = epUpdateCardStats;
  document.addEventListener('DOMContentLoaded', epUpdateCardStats);

  /* global scope-এ expose — onclick থেকে call হয় */
window.fabricOpen           = fabricOpen;
window.fabricClose          = fabricClose;
window.fabricToggleForm     = fabricToggleForm;
window.fabricSave           = fabricSave;
window.fabricDcaSave        = fabricDcaSave;
window.fabricDeletePurchase = fabricDeletePurchase;
window.fabricToggleDcaForm  = fabricToggleDcaForm;
window.fabricRender         = fabricRender;

})();
