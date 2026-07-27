/* fund-flow-ledger.js
   Fund Flow (পার্টি লেজার) কার্ড সিস্টেম: entity-party (ep*) ফর্ম হেল্পার এবং
   fv* ফাংশনসমূহ (কার্ড ওপেন/ক্লোজ, লিস্ট/সার্চ, ড্র্যাগ-রিঅর্ডার, ডিটেইল স্ক্রিন, এডিট)।
   Depends on (window.* এক্সপোজড, তাই লোড-অর্ডার independent):
     - notifPush, toBn, fmtAmt, fmtDate, _lsGet/_lsSet/_lsClear  <- js/shared-state.js
     - _fbAutoSync, _delIdsAdd                                    <- js/firebase-sync.js
   Exposes: EP_META, epRender, epSaveCustomer, epSaveSupplier,
            fvOpenDetail, fvFilterRender (js/debtors-list.js এগুলো ব্যবহার করে)
   (এই ফাইল আগে fund-flow-ledger.js-এর একটা অংশ ছিল; ধাপ ৭-এর split-এ
    debtors-list/nav-shell/firebase-sync অংশ আলাদা ফাইলে সরানো হলো।)
*/
(function () {

  /* কার্ড মেটা */
  const EP_META = {
    1: {
      title: 'রেগুলার কাস্টমার', sub: 'নতুন এন্ট্রি যোগ করুন',
      key: 'is_c1_list',
      iconBg: 'rgba(155,44,44,.12)', iconBorder: 'rgba(155,44,44,.35)', iconColor: '#e07070',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      type: 'customer'
    },
    2: {
      title: 'ইর-রেগুলার কাস্টমার', sub: 'নতুন এন্ট্রি যোগ করুন',
      key: 'is_c2_list',
      iconBg: 'rgba(26,74,122,.12)', iconBorder: 'rgba(26,74,122,.35)', iconColor: '#7ab8f0',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
      type: 'customer'
    },
    3: {
      title: 'রেগুলার মহাজন', sub: 'নতুন এন্ট্রি যোগ করুন',
      key: 'is_c3_list',
      iconBg: 'rgba(184,144,42,.12)', iconBorder: 'rgba(184,144,42,.35)', iconColor: '#d4aa46',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1.5"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
      type: 'supplier'
    },
    4: {
      title: 'ইর-রেগুলার মহাজন', sub: 'নতুন এন্ট্রি যোগ করুন',
      key: 'is_c4_list',
      iconBg: 'rgba(26,92,53,.12)', iconBorder: 'rgba(26,92,53,.35)', iconColor: '#4ecb7a',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="14" height="10" rx="1"/><path d="M16 9h3l3 4v4h-6V9z"/><circle cx="5.5" cy="19.5" r="1.5"/><circle cx="19.5" cy="19.5" r="1.5"/><path d="M8 7V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2"/></svg>`,
      type: 'supplier'
    }
  };
window.EP_META = EP_META;

  /* shared form helpers */
  function _epField(id, legend, type, cls, extra) {
    extra = extra || '';
    return '<div class="ep-field">'
      + '<fieldset><legend>' + legend + '</legend>'
      + '<input class="ep-inp' + (cls?' '+cls:'') + '" id="' + id + '" type="' + type + '"'
      + (type==='number'?' inputmode="decimal"':(type==='text'?'':' inputmode="numeric"'))
      + ' placeholder=" " oninput="_epFV(this)"' + extra + '></fieldset>'
      + '<label class="ep-label">' + legend + '</label>'
      + '</div>';
  }
  function _epMobField(n) {
    return '<div class="ep-field"><div class="ep-mob-wrap">'
      + '<span class="ep-mob-prefix">+88</span>'
      + '<input class="ep-inp" id="ep' + n + 'Mob" type="tel" inputmode="numeric" placeholder=" ">'
      + '</div></div>';
  }
  function _epSaveBtn(fn) {
    return '<div class="ep-foot">'
      + '<button type="button" class="ep-back-btn" onclick="_epBackClose()" title="বাতিল">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      + '</button>'
      + '<button type="button" class="ep-save-btn" onclick="' + fn + '">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      + 'সেভ করুন</button>'
      + '</div>';
  }
  function _epBackClose() {
    /* inline ফর্ম বন্ধ করি */
    let inf = document.getElementById('fvInlineForm');
    let bd  = document.getElementById('fvFormBackdrop');
    let eb  = document.getElementById('fvEntryBtn');
    if (inf) inf.classList.remove('visible');
    if (bd)  bd.classList.remove('visible');
    if (eb)  eb.classList.remove('active');
  }
window._epBackClose = _epBackClose;
  /* তারিখ ফিল্ড helper */
  function _epDateField(id) {
    return '<div class="ep-field">'
      + '<fieldset><legend>তারিখ</legend>'
      + '<input class="ep-inp" id="' + id + '" type="text" placeholder=" "'
      + ' onfocus="this.type=\'date\';this.placeholder=\'\'"'
      + ' onblur="if(!this.value){this.type=\'text\';this.placeholder=\' \';_epFV(this)}else{_epFV(this)}"'
      + ' onchange="_epFV(this)"></fieldset>'
      + '<label class="ep-label">তারিখ</label>'
      + '</div>';
  }

  /* গ্রাহক ফর্ম HTML */
  function _epCustomerForm(n) {
    return '<div class="ep-form-box">'
      + '<div class="ep-row">'
      + _epField('ep'+n+'Name','নাম','text','')
      + _epField('ep'+n+'Addr','ঠিকানা','text','')
      + '</div>'
      + '<div class="ep-row">'
      + _epMobField(n)
      + _epDateField('ep'+n+'Date')
      + '</div>'
      + '<div class="ep-row">'
      + _epField('ep'+n+'Memo','ম্যামো নং','text','',' inputmode="numeric"')
      + _epField('ep'+n+'Bill','পাওনা','number','amt')
      + '</div>'
      + '<div class="ep-row">'
      + _epField('ep'+n+'Joma','জমা','number','amt')
      + _epField('ep'+n+'Goj','গজ','number','amt')
      + '</div>'
      + '<div class="ep-row">'
      + _epField('ep'+n+'Note','মন্তব্য','text','')
      + '</div>'
      + _epSaveBtn('epSaveCustomer('+n+')')
      + '</div>';
  }

  /* সরবরাহকারী ফর্ম HTML */
  function _epSupplierForm(n) {
    return '<div class="ep-form-box">'
      + '<div class="ep-row">'
      + '<div class="ep-field"><fieldset><legend>নাম *</legend>'
      + '<input class="ep-inp" id="ep'+n+'Name" type="text" placeholder=" " oninput="_epFV(this)"></fieldset>'
      + '<label class="ep-label">নাম <span style="color:#e07070">*</span></label></div>'
      + _epField('ep'+n+'Addr','ঠিকানা','text','')
      + '</div>'
      + '<div class="ep-row">'
      + _epMobField(n)
      + _epDateField('ep'+n+'Date')
      + '</div>'
      + '<div class="ep-row">'
      + _epField('ep'+n+'Memo','ম্যামো নং','text','',' inputmode="numeric"')
      + _epField('ep'+n+'Baki','বকেয়া','number','amt')
      + '</div>'
      + '<div class="ep-row">'
      + _epField('ep'+n+'Joma','জমা','number','amt')
      + _epField('ep'+n+'Goj','গজ','number','amt')
      + '</div>'
      + '<div class="ep-row">'
      + _epField('ep'+n+'Note','মন্তব্য','text','')
      + '</div>'
      + _epSaveBtn('epSaveSupplier('+n+')')
      + '</div>';
  }

  /* গ্রাহক সেভ */
  function epSaveCustomer(n) {
    const name  = document.getElementById(`ep${n}Name`).value.trim();
    const bill  = parseFloat(document.getElementById(`ep${n}Bill`)?.value)  || 0;
    const joma  = parseFloat(document.getElementById(`ep${n}Joma`)?.value)  || 0;
    const memo  = document.getElementById(`ep${n}Memo`)?.value.trim() || '';
    const goj   = document.getElementById(`ep${n}Goj`)?.value.trim()  || '';
    const addr  = document.getElementById(`ep${n}Addr`)?.value.trim() || '';
    const mobRaw = document.getElementById(`ep${n}Mob`)?.value.trim()  || '';
    const mob    = mobRaw ? '+88' + mobRaw : '';
    const note  = document.getElementById(`ep${n}Note`)?.value.trim() || '';
    const dateEl = document.getElementById(`ep${n}Date`);
    const date  = (dateEl && dateEl.value) ? dateEl.value : new Date().toISOString();
    if (!name && !bill) { document.getElementById(`ep${n}Name`).focus(); return; }
    const baki = Math.max(0, bill - joma);
    const key  = EP_META[n].key;
    const list = window._lsGet(key);
    list.push({ id: Date.now(), name, memo, goj, bill, joma, baki, addr, mob, note, date });
    window._lsSet(key, list);
    /* ফর্ম রিসেট */
    [`ep${n}Name`,`ep${n}Memo`,`ep${n}Goj`,`ep${n}Bill`,`ep${n}Joma`,`ep${n}Addr`,`ep${n}Mob`,`ep${n}Note`]
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    if (dateEl) { dateEl.value = ''; dateEl.type = 'text'; dateEl.placeholder = ' '; }
    epRender(n);
    window._fbAutoSync();
    /* ইনলাইন ফর্ম বন্ধ করি ও লিস্ট উপরে স্ক্রল */
    (function(){ let inf=document.getElementById('fvInlineForm'); let bkd=document.getElementById('fvFormBackdrop'); let eb=document.getElementById('fvEntryBtn'); if(inf) inf.classList.remove('visible'); if(bkd) bkd.classList.remove('visible'); if(eb) eb.classList.remove('active'); let bd=document.getElementById('fvBody'); if(bd) bd.scrollTop=0; })();
  }
window.epSaveCustomer = epSaveCustomer;

  /* সরবরাহকারী সেভ */
  function epSaveSupplier(n) {
    const name    = document.getElementById(`ep${n}Name`).value.trim();
    const baki    = parseFloat(document.getElementById(`ep${n}Baki`)?.value)    || 0;
    const joma    = parseFloat(document.getElementById(`ep${n}Joma`)?.value)    || 0;
    const memo    = document.getElementById(`ep${n}Memo`)?.value.trim() || '';
    const goj     = document.getElementById(`ep${n}Goj`)?.value.trim()  || '';
    const mobRaw  = document.getElementById(`ep${n}Mob`)?.value.trim()  || '';
    const mob     = mobRaw ? '+88' + mobRaw : '';
    const addr    = document.getElementById(`ep${n}Addr`)?.value.trim() || '';
    const note    = document.getElementById(`ep${n}Note`)?.value.trim() || '';
    const dateEl  = document.getElementById(`ep${n}Date`);
    const date    = (dateEl && dateEl.value) ? dateEl.value : new Date().toISOString();
    if (!name) { document.getElementById(`ep${n}Name`).focus(); return; }
    const netBaki = Math.max(0, baki - joma);
    const key  = EP_META[n].key;
    const list = window._lsGet(key);
    list.push({ id: Date.now(), name, memo, goj, baki: netBaki, joma, initPawna: baki, mob, addr, note, date });
    window._lsSet(key, list);
    [`ep${n}Name`,`ep${n}Memo`,`ep${n}Goj`,`ep${n}Baki`,`ep${n}Joma`,`ep${n}Mob`,`ep${n}Addr`,`ep${n}Note`]
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    if (dateEl) { dateEl.value = ''; dateEl.type = 'text'; dateEl.placeholder = ' '; }
    epRender(n);
    window._fbAutoSync();
    /* ইনলাইন ফর্ম বন্ধ করি ও লিস্ট উপরে স্ক্রল */
    (function(){ let inf=document.getElementById('fvInlineForm'); let bkd=document.getElementById('fvFormBackdrop'); let eb=document.getElementById('fvEntryBtn'); if(inf) inf.classList.remove('visible'); if(bkd) bkd.classList.remove('visible'); if(eb) eb.classList.remove('active'); let bd=document.getElementById('fvBody'); if(bd) bd.scrollTop=0; })();
  }
window.epSaveSupplier = epSaveSupplier;

  /* রেন্ডার (হোম কার্ড কাউন্ট আপডেট) */
  function epRender(n) {
    const key   = EP_META[n].key;
    const list  = window._lsGet(key);

    /* হোম কার্ড কাউন্ট */
    const cntEl = document.getElementById(`c${n}Count`);
    if (cntEl) cntEl.textContent = '';

    /* ফুল ভিউ খোলা থাকলে সেটাও আপডেট করি */
    if (_fvCard === n) fvFilterRender();
  }
window.epRender = epRender;

  /* ফুল স্ক্রিন লিস্ট ভিউ — JS
  */
  let _fvCard = 0;

  function fvOpen(n) {
    _fvCard = n;
    const m = EP_META[n];

    /* হেডার আইকন */
    const hi = document.getElementById('fvHdrIcon');
    hi.style.background  = '';
    hi.style.borderColor = '';
    hi.style.color       = 'rgba(60,32,8,0.92)';
    hi.innerHTML         = m.iconSvg;

    document.getElementById('fvHdrTitle').textContent = m.title;
    document.getElementById('fvSearch').value = '';

    /* ইনলাইন ফর্ম বন্ধ করি প্রথমে */
    let inf = document.getElementById('fvInlineForm');
    let bd  = document.getElementById('fvFormBackdrop');
    let eb  = document.getElementById('fvEntryBtn');
    if (inf) inf.classList.remove('visible');
    if (bd)  bd.classList.remove('visible');
    if (eb)  eb.classList.remove('active');

    /* কন্টেন্ট রেন্ডার, তারপর GPU transform দিয়ে স্লাইড-ইন */
    fvFilterRender();
    document.getElementById('fvScreen').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
window.fvOpen = fvOpen;

  function fvClose() {
    if (_dr.active) _dragEnd();
    _fvLpClear();
    /* ইনলাইন ফর্ম বন্ধ করি */
    let inf = document.getElementById('fvInlineForm');
    let bd  = document.getElementById('fvFormBackdrop');
    let eb  = document.getElementById('fvEntryBtn');
    if (inf) inf.classList.remove('visible');
    if (bd)  bd.classList.remove('visible');
    if (eb)  eb.classList.remove('active');
    document.getElementById('fvScreen').classList.remove('open');
    document.body.style.overflow = '';
    _fvCard = 0;
  }
window.fvClose = fvClose;

  /* ইনলাইন ফর্ম টগল */
  function fvToggleEntryForm() {
    let inf   = document.getElementById('fvInlineForm');
    let bd    = document.getElementById('fvFormBackdrop');
    let inner = document.getElementById('fvInlineFormInner');
    let eb    = document.getElementById('fvEntryBtn');
    if (!inf || !_fvCard) return;

    let isOpen = inf.classList.contains('visible');
    if (isOpen) {
      inf.classList.remove('visible');
      if (bd) bd.classList.remove('visible');
      eb.classList.remove('active');
    } else {
      /* ফর্ম বিল্ড করি */
      let m = EP_META[_fvCard];
      inner.innerHTML = m.type === 'customer'
        ? _epCustomerForm(_fvCard) : _epSupplierForm(_fvCard);
      inner.querySelectorAll('.ep-inp').forEach(function(el){ _epFV(el); });
      inf.classList.add('visible');
      if (bd) bd.classList.add('visible');
      eb.classList.add('active');
      /* প্রথম ইনপুটে ফোকাস */
      let firstInp = inner.querySelector('.ep-inp');
      if (firstInp) setTimeout(function(){ firstInp.focus(); }, 120);
    }
  }
window.fvToggleEntryForm = fvToggleEntryForm;

  /* debounced সার্চ — প্রতি keystroke-এ full re-render এড়ায় */
  const _fvSearchDebounced = _debounce(fvFilterRender, 120);
window._fvSearchDebounced = _fvSearchDebounced;
  const _dlSearchDebounced = _debounce(function() { window.dlRender(); }, 120);
window._dlSearchDebounced = _dlSearchDebounced;

  function fvFilterRender() {
    if (!_fvCard) return;
    const n    = _fvCard;
    const meta = EP_META[n];
    const key  = meta.key;
    const q    = (document.getElementById('fvSearch').value || '').trim().toLowerCase();

    /* সার্চ চলছে — lp selection বন্ধ করো */
    if (q) _fvLpClear();

    const all  = window._lsGet(key);
    const list = q ? all.filter(x =>
      (x.name || '').toLowerCase().includes(q) ||
      (x.addr || '').toLowerCase().includes(q) ||
      (x.mob  || '').toLowerCase().includes(q) ||
      (x.memo || '').toLowerCase().includes(q)
    ) : all;

    /* কাস্টম অর্ডার অনুযায়ী সর্ট — না থাকলে তৈরির ক্রম */
    const orderKey = 'is_order_' + key;
    let savedOrder = null;
    try {
      savedOrder = JSON.parse(localStorage.getItem(orderKey) || 'null');
    } catch (e) {
      console.error(orderKey + ' parse error, ignoring saved order:', e);
    }
    if (savedOrder && !q) {
      list.sort((a, b) => {
        const ai = savedOrder.indexOf(a.id);
        const bi = savedOrder.indexOf(b.id);
        const av = ai === -1 ? 99999 : ai;
        const bv = bi === -1 ? 99999 : bi;
        return av - bv;
      });
    } else {
      list.sort((a, b) => (a.id || 0) - (b.id || 0));
    }

    /* সাব লেবেল */
    const totBaki = all.reduce((s, x) => s + (x.baki || 0), 0);
    document.getElementById('fvHdrSub').textContent =
      all.length ? window.toBn(all.length) + ' জন · মোট বাকি ' + window.fmtAmt(totBaki) : 'কোনো এন্ট্রি নেই';
    if (typeof epUpdateCardStats === 'function') epUpdateCardStats();

    const body = document.getElementById('fvBody');
    if (!list.length) {
      body.innerHTML = `<div class="fv-empty">${q ? 'কোনো ফলাফল নেই' : 'কোনো এন্ট্রি নেই'}</div>`;
      return;
    }

    body.innerHTML = list.map((item, i) => {
      const mob    = (item.mob || '').trim();
      const hasMob = mob.length > 0;
      /* mob নতুন ফরম্যাট: +880XXXXXXXXX | পুরনো ফরম্যাট: 01XXXXXXXXX */
      let waNum = '';
      if (hasMob) {
        if (mob.startsWith('+')) {
          waNum = mob.slice(1); /* + বাদ দিই */
        } else if (mob.startsWith('0')) {
          waNum = '880' + mob.slice(1); /* 0 সরিয়ে 880 বসাই */
        } else {
          waNum = mob;
        }
      }

      const LOC_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
      const TEL_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>';
      const WA_SVG  = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.122 1.532 5.857L.057 23.714l5.988-1.57A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.882 9.882 0 0 1-5.031-1.378l-.361-.214-3.735.979 1-3.648-.235-.374A9.86 9.86 0 0 1 2.106 12C2.106 6.579 6.579 2.106 12 2.106c5.42 0 9.894 4.474 9.894 9.894 0 5.42-4.474 9.894-9.894 9.894z"/></svg>';
      const isCustomer = meta.type === 'customer';
      const cardId = 'fvc-' + item.id;

      let innerContent = '';
      if (isCustomer) {
        /* সব লেনদেন কালানুক্রমিক তালিকা বানাই */
        let txns = [];
        /* রুট এন্ট্রি (history আসার আগের পুরনো ডেটা) */
        if (item.bill !== undefined && item.bill !== null)  txns.push({ date: item.date, memo: item.memo, type: 'bill',  amt: item.bill,  note: item.note, goj: item.goj || '' });
        if (item.joma && !(item.history||[]).length)
                        txns.push({ date: item.date, memo: item.memo, type: 'joma',  amt: item.joma,  note: '' });
        /* history লগ */
        (item.history || []).forEach(function(h) {
          if (h.type === 'bokeyoa') {
            if (h.bill !== undefined && h.bill !== null)  txns.push({ date: h.date, memo: h.memo, type: 'bill',  amt: h.bill,  note: h.note || '', goj: h.goj || '' });
          } else if (h.type === 'joma') {
            txns.push({ date: h.date, memo: h.memo, type: 'joma', amt: h.joma, note: h.note || '' });
          }
        });

        let rows = '';
        let running = 0;
        txns.forEach(function(t) {
          if (t.type === 'bill') {
            running += t.amt;
            rows += '<tr class="tr-bill">'
              + '<td>' + window.fmtDate(t.date) + '</td>'
              + '<td class="td-label">' + _esc(t.memo || '—') + '</td>'
              + '<td class="td-num">' + window.fmtAmt(t.amt) + '</td>'
              + '<td>—</td>'
              + '<td class="td-num td-baki">' + window.fmtAmt(running) + '</td>'
              + '<td>' + _esc(t.goj || '—') + '</td>'
              + '<td>' + _esc(t.note || '—') + '</td>'
              + '</tr>';
          } else {
            running -= t.amt;
            if (running < 0) running = 0;
            rows += '<tr class="tr-joma">'
              + '<td>' + window.fmtDate(t.date) + '</td>'
              + '<td class="td-label">' + _esc(t.memo || '—') + '</td>'
              + '<td>—</td>'
              + '<td class="td-num">' + window.fmtAmt(t.amt) + '</td>'
              + '<td class="td-num">' + window.fmtAmt(running) + '</td>'
              + '<td>—</td>'
              + '<td>' + _esc(t.note || '—') + '</td>'
              + '</tr>';
          }
        });
        if (!rows) rows = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:12px">কোনো লেনদেন নেই</td></tr>';
        innerContent =
          '<table class="fv-excel"><thead><tr>'
          + '<th>তারিখ</th><th>ম্যামো</th><th>পাওনা/প্রাপ্য</th><th>জমা</th><th>মোট বাকি</th><th>গজ</th><th>মন্তব্য</th>'
          + '</tr></thead><tbody>' + rows + '</tbody></table>';
      } else {
        let txns = [];
        let initPawna = (item.initPawna !== undefined) ? item.initPawna : (item.baki||0) + (item.joma||0);
        if (initPawna > 0 && !(item.history||[]).length)
          txns.push({ date: item.date, memo: item.memo, type: 'pawna', amt: initPawna, note: item.note || '', goj: item.goj || '' });
        if (item.joma && !(item.history||[]).length)
          txns.push({ date: item.date, memo: item.memo, type: 'joma', amt: item.joma, note: '' });
        (item.history || []).forEach(function(h) {
          if (h.type === 'bokeyoa') {
            if (h.baki !== undefined && h.baki !== null) txns.push({ date: h.date, memo: h.memo, type: 'pawna', amt: h.baki, note: h.note || '', goj: h.goj || '' });
          } else if (h.type === 'joma') {
            txns.push({ date: h.date, memo: h.memo, type: 'joma', amt: h.joma, note: h.note || '' });
          }
        });
        txns.sort(function(a,b){ return (a.date||'') < (b.date||'') ? -1 : 1; });

        let rows = '';
        let running = 0;
        txns.forEach(function(t) {
          if (t.type === 'pawna') {
            running += t.amt;
            rows += '<tr class="tr-bill">'
              + '<td>' + window.fmtDate(t.date) + '</td>'
              + '<td class="td-label">' + _esc(t.memo || '—') + '</td>'
              + '<td class="td-num">' + window.fmtAmt(t.amt) + '</td>'
              + '<td>—</td>'
              + '<td class="td-num td-baki">' + window.fmtAmt(running) + '</td>'
              + '<td>' + _esc(t.goj || '—') + '</td>'
              + '</tr>';
          } else {
            running -= t.amt;
            if (running < 0) running = 0;
            rows += '<tr class="tr-joma">'
              + '<td>' + window.fmtDate(t.date) + '</td>'
              + '<td class="td-label">' + _esc(t.memo || '—') + '</td>'
              + '<td>—</td>'
              + '<td class="td-num">' + window.fmtAmt(t.amt) + '</td>'
              + '<td class="td-num">' + window.fmtAmt(running) + '</td>'
              + '<td>—</td>'
              + '</tr>';
          }
        });
        if (!rows) rows = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:12px">কোনো লেনদেন নেই</td></tr>';
        innerContent =
          '<table class="fv-excel"><thead><tr>'
          + '<th>তারিখ</th><th>ম্যামো</th><th>বকেয়া/প্রদেয়</th><th>জমা</th><th>মোট বাকি</th><th>গজ</th>'
          + '</tr></thead><tbody>' + rows + '</tbody></table>';
      }

      const DRAG_HANDLE_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/></svg>';

      return '<div class="fv-card" id="' + cardId + '" data-item-id="' + item.id + '" data-cat="' + n + '">'
        + '<div class="fv-card-top" onclick="_fvCardTap(' + n + ',' + item.id + ',event)" onpointerdown="_fvCardLpDown(event,this,' + n + ',' + item.id + ')">'
        +   '<div class="fv-drag-handle" onpointerdown="_dragHandleDown(event,' + item.id + ')">' + DRAG_HANDLE_SVG + '</div>'
        +   '<div class="fv-card-left">'
        +     '<div class="fv-name">' + _esc(item.name || '—') + '</div>'
        +     (item.addr ? '<div class="fv-contact-line">' + LOC_SVG + ' ' + _esc(item.addr) + '</div>' : '')
        +     (hasMob    ? '<div class="fv-contact-line">' + TEL_SVG + ' ' + _esc(mob) + '</div>' : '')
        +   '</div>'
        +   '<div class="fv-top-actions" onclick="event.stopPropagation()">'
        +     '<div class="fv-top-btns-row">'
        +       (hasMob ? '<a class="fv-phone-btn" href="tel:' + _esc(mob) + '">' + TEL_SVG + '</a>' : '')
        +       (waNum  ? '<a class="fv-wa-btn" href="https://wa.me/' + _esc(waNum) + '" target="_blank">' + WA_SVG + '</a>' : '')
        +     '</div>'
        +     '<div class="fv-card-del-row">'
        +       '<span class="fv-card-baki-lbl">'
        +         ((item.baki > 0) ? window.fmtAmt(item.baki) : ((item.bill > 0 || item.khoroch > 0 || item.initPawna > 0 || (item.history||[]).some(function(h){ return h.type==='bokeyoa' && (h.bill||h.baki||0) > 0; })) ? 'পরিশোধ ' : ''))
        +       '</span>'
        +     '</div>'
        +   '</div>'
        + '</div>'
        + '</div>';
    }).join('');

    /* লং প্রেস + ড্র্যাগ সিস্টেম init */
    _dragInitCards(n);
  }
window.fvFilterRender = fvFilterRender;

  /* লং প্রেস + ড্র্যাগ-টু-রিঅর্ডার সিস্টেম
  */
  const _dr = {
    active:      false,   /* ড্র্যাগ চলছে? */
    cardEl:      null,    /* যে কার্ড ড্র্যাগ হচ্ছে */
    placeholder: null,    /* খালি জায়গা */
    startY:      0,
    offsetY:     0,       /* touch point → card top offset */
    cardH:       0,
    catN:        0,
    moved:       false,
    scrollTimer: null,
  };

  /* order সেভ */
  function _dragSaveOrder() {
    let body = document.getElementById('fvBody');
    if (!body) return;
    let cards = body.querySelectorAll('.fv-card[data-item-id]');
    let ids = [];
    cards.forEach(function(c) { ids.push(parseInt(c.getAttribute('data-item-id'))); });
    let key = EP_META[_dr.catN].key;
    localStorage.setItem('is_order_' + key, JSON.stringify(ids));
  }

  /* handle pointerdown — lp-selected কার্ডের বাম হ্যান্ডেলে */
  function _dragHandleDown(e, itemId) {
    e.stopPropagation();
    e.preventDefault();
    /* inline onpointerdown থেকে call হয় — e.target দিয়ে card খুঁজি */
    let handle = e.target.closest('.fv-drag-handle') || e.target;
    let card   = handle.closest('.fv-card');
    if (!card) return;
    /* শুধু lp-selected কার্ডেই drag কাজ করবে */
    if (!card.classList.contains('lp-selected')) return;
    _dr.catN = _fvCard;
    _dragStart(card, e.clientY, itemId);
  }

  /* drag শুরু */
  function _dragStart(card, clientY, itemId) {
    if (_dr.active) return;
    _dr.active  = true;
    _dr.cardEl  = card;
    _dr.catN    = _fvCard;
    _dr.moved   = false;

    let rect    = card.getBoundingClientRect();
    _dr.cardH   = rect.height;
    _dr.offsetY = clientY - rect.top;
    _dr.startY  = clientY;

    /* placeholder বানাই */
    let ph = document.createElement('div');
    ph.className = 'fv-card-placeholder';
    ph.style.height = _dr.cardH + 'px';
    card.parentNode.insertBefore(ph, card);
    _dr.placeholder = ph;

    /* card fixed করি */
    card.classList.add('dragging');
    card.style.width  = rect.width  + 'px';
    card.style.left   = rect.left   + 'px';
    card.style.top    = (clientY - _dr.offsetY) + 'px';

    document.addEventListener('pointermove', _dragMove, { passive: false });
    document.addEventListener('pointerup',   _dragEnd);
    document.addEventListener('pointercancel', _dragEnd);
  }

  /* drag মুভ */
  function _dragMove(e) {
    if (!_dr.active) return;
    e.preventDefault();
    let y = e.clientY;
    _dr.moved = true;

    /* কার্ড সরাই */
    _dr.cardEl.style.top = (y - _dr.offsetY) + 'px';

    /* placeholder কোথায় যাবে খুঁজি */
    let body  = document.getElementById('fvBody');
    if (!body) return;
    let cards = Array.from(body.querySelectorAll('.fv-card[data-item-id]:not(.dragging)'));
    let ph    = _dr.placeholder;
    let placed = false;

    for (let i = 0; i < cards.length; i++) {
      let r = cards[i].getBoundingClientRect();
      let mid = r.top + r.height / 2;
      if (y < mid) {
        body.insertBefore(ph, cards[i]);
        placed = true;
        break;
      }
    }
    if (!placed) body.appendChild(ph);

    /* অটো স্ক্রল */
    let bodyRect = body.getBoundingClientRect();
    clearInterval(_dr.scrollTimer);
    if (y > bodyRect.bottom - 60) {
      _dr.scrollTimer = setInterval(function() { body.scrollTop += 6; }, 16);
    } else if (y < bodyRect.top + 60) {
      _dr.scrollTimer = setInterval(function() { body.scrollTop -= 6; }, 16);
    }
  }

  /* drag শেষ */
  function _dragEnd(e) {
    if (!_dr.active) return;
    _dr.active = false;
    clearInterval(_dr.scrollTimer);
    document.removeEventListener('pointermove', _dragMove);
    document.removeEventListener('pointerup',   _dragEnd);
    document.removeEventListener('pointercancel', _dragEnd);

    let card = _dr.cardEl;
    let ph   = _dr.placeholder;

    /* fixed → normal */
    card.classList.remove('dragging');
    card.style.position = '';
    card.style.width    = '';
    card.style.left     = '';
    card.style.top      = '';

    /* placeholder এর জায়গায় কার্ড বসাই */
    if (ph && ph.parentNode) {
      ph.parentNode.insertBefore(card, ph);
      ph.parentNode.removeChild(ph);
    }
    _dr.placeholder = null;
    _dr.cardEl      = null;

    /* order সেভ */
    _dragSaveOrder();
    _fvLpClear(); /* drag শেষে selection ও action bar বন্ধ */
    window.notifPush('success', 'ফোল্ডারের ক্রম সেভ হয়েছে।');
  }

  /* fvBody click outside → lp-selected বন্ধ */
  document.addEventListener('pointerdown', function(e) {
    if (_dr.active) return;
    let body = document.getElementById('fvBody');
    if (!body) return;
    /* drag handle বা action bar নয় এমন জায়গায় ক্লিক করলে selection off */
    if (!e.target.closest('.fv-drag-handle') &&
        !e.target.closest('.fv-lp-action-bar') &&
        body.querySelector('.fv-card.lp-selected')) {
      _fvLpClear();
    }
  }, true);

  /* render এর পরে no-op (drag এখন lp-selected থেকে চালু হয়) */
  function _dragInitCards(n) { /* intentional no-op */ }

  /* কার্ড লং প্রেস → হেডার অ্যাকশন বার
  */
  let _fvLpTimer   = null;
  let _fvLpSelN    = 0;
  let _fvLpSelId   = 0;
  let _fvLpSelCard = null;

  function _fvCardLpDown(e, cardEl, n, itemId) {
    /* drag চলছে থাকলে LP trigger করবে না */
    if (_dr.active) return;
    let startX = e.clientX, startY = e.clientY;

    _fvLpTimer = setTimeout(function() {
      document.removeEventListener('pointermove', cancelMove);
      document.removeEventListener('pointerup',   cancelUp);
      document.removeEventListener('pointercancel', cancelUp);
      _fvLpSelect(n, itemId, cardEl);
    }, 450);

    function cancelMove(ev) {
      let dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (Math.sqrt(dx*dx + dy*dy) > 8) cancelUp();
    }
    function cancelUp() {
      clearTimeout(_fvLpTimer);
      document.removeEventListener('pointermove', cancelMove);
      document.removeEventListener('pointerup',   cancelUp);
      document.removeEventListener('pointercancel', cancelUp);
    }
    document.addEventListener('pointermove',   cancelMove);
    document.addEventListener('pointerup',     cancelUp, { once: true });
    document.addEventListener('pointercancel', cancelUp, { once: true });
  }

  function _fvCardTap(n, itemId, e) {
    /* লং প্রেস সিলেক্ট অবস্থায় ট্যাপ করলে clear করো, detail খুলো না */
    if (_fvLpSelId) { _fvLpClear(); return; }
    fvOpenDetail(n, itemId);
  }
window._fvCardTap = _fvCardTap;

  function _fvLpSelect(n, itemId, cardEl) {
    /* আগেরটা clear করো */
    if (_fvLpSelCard) _fvLpSelCard.classList.remove('lp-selected');

    /* cardEl হতে পারে fv-card-top — আসল fv-card parent নিই
       যাতে CSS .fv-card.lp-selected সিলেক্টর কাজ করে */
    let fvCard = (cardEl && cardEl.closest('.fv-card')) || cardEl;

    _fvLpSelN    = n;
    _fvLpSelId   = itemId;
    _fvLpSelCard = fvCard;
    fvCard.classList.add('lp-selected');
    if (navigator.vibrate) navigator.vibrate(40);

    /* drag catN সেট করো — handle থেকে drag শুরুর জন্য */
    _dr.catN = n;

    /* নাম দেখাই */
    let key  = EP_META[n].key;
    let list = window._lsGet(key);
    let item = list.find(function(x){ return x.id === itemId; });
    let bar  = document.getElementById('fvLpActionBar');
    let nameEl = document.getElementById('fvLpActionName');
    if (nameEl) nameEl.textContent = (item && item.name) ? item.name : '';
    if (bar) bar.classList.add('show');
  }

  function _fvLpClear() {
    if (_fvLpSelCard) _fvLpSelCard.classList.remove('lp-selected');
    _fvLpSelN = 0; _fvLpSelId = 0; _fvLpSelCard = null;
    let bar = document.getElementById('fvLpActionBar');
    if (bar) bar.classList.remove('show');
  }
window._fvLpClear = _fvLpClear;

  function _fvLpEdit() {
    if (!_fvLpSelN || !_fvLpSelId) return;
    let n = _fvLpSelN, id = _fvLpSelId;
    _fvLpClear();
    /* fvEditOpen এ evt লাগে — dummy event দিই */
    fvEditOpen(n, id, { stopPropagation: function(){} });
  }
window._fvLpEdit = _fvLpEdit;

  function _fvLpDelete() {
    if (!_fvLpSelN || !_fvLpSelId) return;
    let n = _fvLpSelN, id = _fvLpSelId;
    _fvLpClear();
    fvCardDelete(n, id, { stopPropagation: function(){} });
  }
window._fvLpDelete = _fvLpDelete;

  let _detailN = 0, _detailId = 0;

  function fvOpenDetail(n, itemId) {
    _detailN  = n;
    _detailId = itemId;
    const meta = EP_META[n];
    const key  = meta.key;
    const list = window._lsGet(key);
    const item = list.find(x => x.id === itemId);
    if (!item) return;

    const isCustomer = meta.type === 'customer';
    const mob = (item.mob || '').trim();
    const hasMob = mob.length > 0;

    /* হেডারে নাম ও মেটা */
    document.getElementById('fvDetailName').textContent = item.name || '—';
    let metaParts = [];
    if (item.addr) metaParts.push(item.addr);
    if (hasMob)   metaParts.push(mob);
    document.getElementById('fvDetailMeta').textContent = metaParts.join(' · ');

    /* Excel টেবিল কন্টেন্ট */
    let innerContent = '';
    let _detailRunning = 0; /* টেবিলের সব transaction শেষে প্রকৃত বাকি */
    if (isCustomer) {
      /* txns বানাই — _histIdx = original history[] index, sort নেই */
      let txns = [];
      if (item.bill !== undefined && item.bill !== null && item.bill > 0)
        txns.push({ date: item.date, memo: item.memo, type: 'bill', amt: item.bill, note: item.note || '', goj: item.goj || '', _src: 'init', _histIdx: '' });
      /* init joma — সবসময় দেখাবে (history থাকুক বা না থাকুক) */
      if (item.joma !== undefined && item.joma !== null && item.joma > 0)
        txns.push({ date: item.date, memo: item.memo, type: 'joma', amt: item.joma, note: '', goj: '', _src: 'init_joma', _histIdx: '' });
      /* history — _histIdx = loop index (sort এর আগে assign, পরে অপরিবর্তিত) */
      let _hist = item.history || [];
      for (let hi = 0; hi < _hist.length; hi++) {
        let h = _hist[hi];
        if (h.type === 'bokeyoa' && h.bill !== undefined && h.bill !== null)
          txns.push({ date: h.date, memo: h.memo, type: 'bill', amt: h.bill, note: h.note || '', goj: h.goj || '', _src: 'hist', _histIdx: hi });
        else if (h.type === 'joma')
          txns.push({ date: h.date, memo: h.memo, type: 'joma', amt: h.joma || 0, note: h.note || '', goj: '', _src: 'hist', _histIdx: hi });
      }
      let rows = '';
      let running = 0;
      for (let ti = 0; ti < txns.length; ti++) {
        let t = txns[ti];
        let srcAttr = ' data-src="' + t._src + '" data-hist-idx="' + t._histIdx + '" data-txn-type="' + t.type + '"'
          + ' data-raw-date="' + (t.date||'') + '" data-raw-memo="' + _esc(t.memo||'') + '" data-raw-note="' + _esc(t.note||'') + '" data-raw-goj="' + _esc(t.goj||'') + '" data-raw-amt="' + (t.amt||0) + '"';
        if (t.type === 'bill') {
          running += (t.amt || 0);
          rows += '<tr class="tr-bill"' + srcAttr + '>'
            + '<td data-field="date">' + window.fmtDate(t.date) + '</td>'
            + '<td class="td-label" data-field="memo">' + _esc(t.memo || '—') + '</td>'
            + '<td class="td-num" data-field="amt">' + window.fmtAmt(t.amt) + '</td>'
            + '<td data-field="readonly">—</td>'
            + '<td class="td-num td-baki" data-field="readonly">' + window.fmtAmt(running) + '</td>'
            + '<td data-field="goj">' + _esc(t.goj || '—') + '</td>'
            + '<td data-field="note">' + _esc(t.note || '—') + '</td>'
            + '</tr>';
        } else {
          running = Math.max(0, running - (t.amt || 0));
          rows += '<tr class="tr-joma"' + srcAttr + '>'
            + '<td data-field="date">' + window.fmtDate(t.date) + '</td>'
            + '<td class="td-label" data-field="memo">' + _esc(t.memo || '—') + '</td>'
            + '<td data-field="readonly">—</td>'
            + '<td class="td-num td-joma" data-field="amt">' + window.fmtAmt(t.amt) + '</td>'
            + '<td class="td-num td-baki" data-field="readonly">' + window.fmtAmt(running) + '</td>'
            + '<td data-field="readonly">—</td>'
            + '<td data-field="note">' + _esc(t.note || '—') + '</td>'
            + '</tr>';
        }
      }
      _detailRunning = running;
      if (!rows) rows = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:12px">কোনো লেনদেন নেই</td></tr>';
      innerContent =
        '<table class="fv-excel"><thead><tr>'
        + '<th>তারিখ</th><th>ম্যামো</th><th>পাওনা/প্রাপ্য</th><th>জমা</th><th>মোট বাকি</th><th>গজ</th><th>মন্তব্য</th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table>';
    } else {
      /* সরবরাহকারী */
      let txns = [];
      let initPawna = (item.initPawna !== undefined) ? item.initPawna : (item.baki||0) + (item.joma||0);
      if (initPawna > 0)
        txns.push({ date: item.date, memo: item.memo, type: 'pawna', amt: initPawna, note: item.note || '', goj: item.goj || '', _src: 'init', _histIdx: '' });
      /* init joma — সবসময় দেখাবে */
      if (item.joma !== undefined && item.joma !== null && item.joma > 0)
        txns.push({ date: item.date, memo: item.memo, type: 'joma', amt: item.joma, note: '', goj: '', _src: 'init_joma', _histIdx: '' });
      /* history — _histIdx sort এর আগে assign */
      let _hist = item.history || [];
      for (let hi = 0; hi < _hist.length; hi++) {
        let h = _hist[hi];
        if (h.type === 'bokeyoa')
          txns.push({ date: h.date, memo: h.memo, type: 'pawna', amt: h.baki || 0, note: h.note || '', goj: h.goj || '', _src: 'hist', _histIdx: hi });
        else if (h.type === 'joma')
          txns.push({ date: h.date, memo: h.memo, type: 'joma', amt: h.joma || 0, note: h.note || '', goj: '', _src: 'hist', _histIdx: hi });
      }
      /* তারিখ অনুযায়ী sort — _histIdx অপরিবর্তিত থাকে */
      txns.sort(function(a, b) { let da = a.date||'', db = b.date||''; return da < db ? -1 : da > db ? 1 : 0; });
      let rows = '';
      let running = 0;
      for (let ti = 0; ti < txns.length; ti++) {
        let t = txns[ti];
        let srcAttr = ' data-src="' + t._src + '" data-hist-idx="' + t._histIdx + '" data-txn-type="' + t.type + '"'
          + ' data-raw-date="' + (t.date||'') + '" data-raw-memo="' + _esc(t.memo||'') + '" data-raw-note="' + _esc(t.note||'') + '" data-raw-goj="' + _esc(t.goj||'') + '" data-raw-amt="' + (t.amt||0) + '"';
        if (t.type === 'pawna') {
          running += (t.amt || 0);
          rows += '<tr class="tr-bill"' + srcAttr + '>'
            + '<td data-field="date">' + window.fmtDate(t.date) + '</td>'
            + '<td class="td-label" data-field="memo">' + _esc(t.memo || '—') + '</td>'
            + '<td class="td-num" data-field="amt">' + window.fmtAmt(t.amt) + '</td>'
            + '<td data-field="readonly">—</td>'
            + '<td class="td-num td-baki" data-field="readonly">' + window.fmtAmt(running) + '</td>'
            + '<td data-field="goj">' + _esc(t.goj || '—') + '</td>'
            + '<td data-field="note">' + _esc(t.note || '—') + '</td>'
            + '</tr>';
        } else {
          running = Math.max(0, running - (t.amt || 0));
          rows += '<tr class="tr-joma"' + srcAttr + '>'
            + '<td data-field="date">' + window.fmtDate(t.date) + '</td>'
            + '<td class="td-label" data-field="memo">' + _esc(t.memo || '—') + '</td>'
            + '<td data-field="readonly">—</td>'
            + '<td class="td-num td-joma" data-field="amt">' + window.fmtAmt(t.amt) + '</td>'
            + '<td class="td-num td-baki" data-field="readonly">' + window.fmtAmt(running) + '</td>'
            + '<td data-field="readonly">—</td>'
            + '<td data-field="note">' + _esc(t.note || '—') + '</td>'
            + '</tr>';
        }
      }
      _detailRunning = running;
      if (!rows) rows = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:12px">কোনো লেনদেন নেই</td></tr>';
      innerContent =
        '<table class="fv-excel"><thead><tr>'
        + '<th>তারিখ</th><th>ম্যামো</th><th>বকেয়া/প্রদেয়</th><th>জমা</th><th>মোট বাকি</th><th>গজ</th><th>মন্তব্য</th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    /* বডি কন্টেন্ট: Excel + বাকি ফুটার + বকেয়া/জমা বাটন + মিনি ফর্ম */
    let bodyHtml =
      '<div class="fv-table-card">'
      + '<div class="fv-excel-wrap" style="margin-bottom:0;">' + innerContent + '</div>'
      + '<div class="fv-excel-foot" id="fvDetailFoot-' + itemId + '">'
      + '<div><span class="fv-excel-foot-lbl">' + (isCustomer ? 'বর্তমান পাওনা/প্রাপ্য' : 'বর্তমান বকেয়া/প্রদেয়') + '&nbsp;&nbsp;</span><span class="fv-excel-foot-val">' + window.fmtAmt(_detailRunning) + '</span></div>'
      + '<button type="button" class="tbl-edit-mode-btn" id="fvDetailEditBtn-' + itemId + '" onclick="fvDetailToggleEditMode(' + n + ',' + itemId + ',this)">'
      +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
      + '</button>'
      + '</div>'
      + '<div class="fv-entry-btns">'
      +   '<button type="button" class="fv-joma-btn" id="djbtn-' + itemId + '" onclick="fvToggleMiniDetail(\'' + itemId + '\',\'joma\',event)">'
      +     'জমা এন্ট্রি'
      +   '</button>'
      +   '<button type="button" class="fv-bokeyoa-btn" id="dbbtn-' + itemId + '" onclick="fvToggleMiniDetail(\'' + itemId + '\',\'bokeyoa\',event)">'
      +     '' + (isCustomer ? 'পাওনা এন্ট্রি' : 'বকেয়া এন্ট্রি')
      +   '</button>'
      + '</div>'
      + '</div>';

    if (isCustomer) {
      bodyHtml +=
        '<div class="fv-mini-form" id="dmf-bokeyoa-' + itemId + '">'
        + '<div class="fv-mini-form-title">পাওনা এন্ট্রি — ' + _esc(item.name||'') + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>তারিখ</legend><input class="fv-mini-inp" id="dmb-date-' + itemId + '" type="text" placeholder=" " onfocus="this.type=\'date\';this.placeholder=\'\'" onblur="if(!this.value){this.type=\'text\';this.placeholder=\' \';_fvMiniFV(this)}else{_fvMiniFV(this)}" onchange="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">তারিখ</label></div>'
        +   '<div class="fv-mini-field"><fieldset><legend>ম্যামো নং</legend><input class="fv-mini-inp" id="dmb-memo-' + itemId + '" type="text" inputmode="numeric" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">ম্যামো নং</label></div>'
        + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>গজ</legend><input class="fv-mini-inp amt" id="dmb-goj-' + itemId + '" type="number" inputmode="decimal" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">গজ</label></div>'
        +   '<div class="fv-mini-field"><fieldset><legend>পাওনা</legend><input class="fv-mini-inp amt" id="dmb-bill-' + itemId + '" type="number" inputmode="decimal" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">পাওনা</label></div>'
        + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>মন্তব্য</legend><input class="fv-mini-inp" id="dmb-note-' + itemId + '" type="text" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">মন্তব্য</label></div>'
        + '</div>'
        + '<button type="button" class="fv-mini-save-btn" onclick="fvDetailSaveBokeyoa()">'
        +   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> সেভ করুন'
        + '</button>'
        + '</div>'
        + '<div class="fv-mini-form" id="dmf-joma-' + itemId + '">'
        + '<div class="fv-mini-form-title">জমা এন্ট্রি — ' + _esc(item.name||'') + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>তারিখ</legend><input class="fv-mini-inp" id="dmj-date-' + itemId + '" type="text" placeholder=" " onfocus="this.type=\'date\';this.placeholder=\'\'" onblur="if(!this.value){this.type=\'text\';this.placeholder=\' \';_fvMiniFV(this)}else{_fvMiniFV(this)}" onchange="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">তারিখ</label></div>'
        +   '<div class="fv-mini-field"><fieldset><legend>জমার পরিমাণ</legend><input class="fv-mini-inp amt" id="dmj-joma-' + itemId + '" type="number" inputmode="decimal" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">জমার পরিমাণ</label></div>'
        + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>মন্তব্য</legend><input class="fv-mini-inp" id="dmj-note-' + itemId + '" type="text" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">মন্তব্য</label></div>'
        + '</div>'
        + '<button type="button" class="fv-mini-save-btn" onclick="fvDetailSaveJoma()">'
        +   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> সেভ করুন'
        + '</button>'
        + '</div'+'>';
    } else {
      bodyHtml +=
        '<div class="fv-mini-form" id="dmf-bokeyoa-' + itemId + '">'
        + '<div class="fv-mini-form-title">বকেয়া এন্ট্রি — ' + _esc(item.name||'') + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>তারিখ</legend><input class="fv-mini-inp" id="dmb-date-' + itemId + '" type="text" placeholder=" " onfocus="this.type=\'date\';this.placeholder=\'\'" onblur="if(!this.value){this.type=\'text\';this.placeholder=\' \';_fvMiniFV(this)}else{_fvMiniFV(this)}" onchange="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">তারিখ</label></div>'
        +   '<div class="fv-mini-field"><fieldset><legend>ম্যামো নং</legend><input class="fv-mini-inp" id="dmb-memo-' + itemId + '" type="text" inputmode="numeric" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">ম্যামো নং</label></div>'
        + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>গজ</legend><input class="fv-mini-inp amt" id="dmb-goj-' + itemId + '" type="number" inputmode="decimal" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">গজ</label></div>'
        +   '<div class="fv-mini-field"><fieldset><legend>বকেয়া</legend><input class="fv-mini-inp amt" id="dmb-baki-' + itemId + '" type="number" inputmode="decimal" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">বকেয়া</label></div>'
        + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>মন্তব্য</legend><input class="fv-mini-inp" id="dmb-note-' + itemId + '" type="text" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">মন্তব্য</label></div>'
        + '</div>'
        + '<button type="button" class="fv-mini-save-btn" onclick="fvDetailSaveBokeyoaSupplier()">'
        +   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> সেভ করুন'
        + '</button>'
        + '</div>'
        + '<div class="fv-mini-form" id="dmf-joma-' + itemId + '">'
        + '<div class="fv-mini-form-title">জমা এন্ট্রি — ' + _esc(item.name||'') + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>তারিখ</legend><input class="fv-mini-inp" id="dmj-date-' + itemId + '" type="text" placeholder=" " onfocus="this.type=\'date\';this.placeholder=\'\'" onblur="if(!this.value){this.type=\'text\';this.placeholder=\' \';_fvMiniFV(this)}else{_fvMiniFV(this)}" onchange="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">তারিখ</label></div>'
        +   '<div class="fv-mini-field"><fieldset><legend>জমার পরিমাণ</legend><input class="fv-mini-inp amt" id="dmj-joma-' + itemId + '" type="number" inputmode="decimal" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">জমার পরিমাণ</label></div>'
        + '</div>'
        + '<div class="fv-mini-row">'
        +   '<div class="fv-mini-field"><fieldset><legend>মন্তব্য</legend><input class="fv-mini-inp" id="dmj-note-' + itemId + '" type="text" placeholder=" " oninput="_fvMiniFV(this)"></fieldset><label class="fv-mini-label">মন্তব্য</label></div>'
        + '</div>'
        + '<button type="button" class="fv-mini-save-btn" onclick="fvDetailSaveJomaSupplier()">'
        +   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> সেভ করুন'
        + '</button>'
        + '</div>';
    }

    let _scr = document.getElementById('fvDetailScreen');
    let _bdy = document.getElementById('fvDetailBody');

    /* transform-based — display toggle নেই, সরাসরি content set করে open */
    _scr.classList.remove('open');
    _bdy.innerHTML = bodyHtml;
    void _scr.offsetHeight; /* force reflow — Bengali font layout নিশ্চিত */

    requestAnimationFrame(function() {
      _scr.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }
window.fvOpenDetail = fvOpenDetail;

  function fvDetailClose() {
    document.getElementById('fvDetailScreen').classList.remove('open');
    document.body.style.overflow = '';
    _detailN = 0; _detailId = 0;
    _detailEditActive = false;
  }
window.fvDetailClose = fvDetailClose;

  /* পার্সন ডিলিট — সিক্রেট কী যাচাই করে */
  function fvDetailDelete() {
    if (!_detailN || !_detailId) return;
    const entered = prompt('এই ব্যক্তির সব ডেটা স্থায়ীভাবে মুছে যাবে।\nসিক্রেট কী দাও:');
    if (entered === null) return;
    if (entered !== _FB_SECRET) {
      window.showToast('ভুল সিক্রেট কী!', 'ডেটা মোছা হয়নি।');
      return;
    }
    const n    = _detailN; /* fvDetailClose() এর আগে ধরে রাখা হলো, কারণ ওটা _detailN রিসেট করে দেয় */
    const key  = EP_META[n].key;
    const list = window._lsGet(key);
    const name = (list.find(x => x.id === _detailId) || {}).name || 'এই ব্যক্তি';
    const newList = list.filter(x => x.id !== _detailId);
    window._lsSet(key, newList);
    window._fbAutoSync();
    fvDetailClose();
    epRender(n);
    fvFilterRender();
    window.showToast('ডেটা মুছে ফেলা হয়েছে', name);
  }
window.fvDetailDelete = fvDetailDelete;

  /* কার্ড থেকে সরাসরি ডিলিট */
  function fvCardDelete(n, itemId, evt) {
    evt.stopPropagation();
    const key  = EP_META[n].key;
    const list = window._lsGet(key);
    const name = (list.find(x => x.id === itemId) || {}).name || 'এই ব্যক্তি';
    const entered = prompt(name + '-এর সব ডেটা মুছে ফেলতে\nসিক্রেট কী দাও:');
    if (entered === null) return;
    if (entered !== _FB_SECRET) {
      window.showToast('ভুল সিক্রেট কী!', 'ডেটা মোছা হয়নি।');
      return;
    }
    window._delIdsAdd(key, itemId);   /* tombstone — merge-এ ফিরে আসবে না */
    window._lsSet(key, list.filter(x => x.id !== itemId));
    window._fbAutoSync();
    epRender(n);
    fvFilterRender();
    window.showToast('ডেটা মুছে ফেলা হয়েছে', name);
  }
  function fvToggleMiniDetail(itemId, type, evt) {
    evt.stopPropagation();
    let bokForm  = document.getElementById('dmf-bokeyoa-' + itemId);
    let jomaForm = document.getElementById('dmf-joma-'    + itemId);
    let bokBtn   = document.getElementById('dbbtn-' + itemId);
    let jomaBtn  = document.getElementById('djbtn-' + itemId);
    if (!bokForm || !jomaForm) return;
    if (type === 'bokeyoa') {
      let isOpen = bokForm.classList.contains('open');
      bokForm.classList.toggle('open', !isOpen);
      jomaForm.classList.remove('open');
      bokBtn.classList.toggle('active', !isOpen);
      jomaBtn.classList.remove('active');
    } else {
      let isOpen = jomaForm.classList.contains('open');
      jomaForm.classList.toggle('open', !isOpen);
      bokForm.classList.remove('open');
      jomaBtn.classList.toggle('active', !isOpen);
      bokBtn.classList.remove('active');
    }
  }
window.fvToggleMiniDetail = fvToggleMiniDetail;

  /* ডিটেইল গ্রাহক বকেয়া সেভ */
  function fvDetailSaveBokeyoa() {
    let n = _detailN, parentId = _detailId;
    let key  = EP_META[n].key;
    let list = window._lsGet(key);
    let idx  = list.findIndex(x => x.id === parentId);
    if (idx < 0) return;
    let memo  = (document.getElementById('dmb-memo-'  + parentId)?.value || '').trim();
    let date  = document.getElementById('dmb-date-'  + parentId)?.value || new Date().toISOString().slice(0,10);
    let goj   = (document.getElementById('dmb-goj-'   + parentId)?.value || '').trim();
    let bill  = parseFloat(document.getElementById('dmb-bill-'  + parentId)?.value) || 0;
    let note  = (document.getElementById('dmb-note-'  + parentId)?.value || '').trim();
    if (!list[idx].history) list[idx].history = [];
    list[idx].history.push({ type:'bokeyoa', memo, date, bill, baki: bill, note, goj, ts: Date.now() });
    /* history থেকে সম্পূর্ণ recalculate — কোনো accumulation নেই */
    let _tb = list[idx].bill || 0;
    let _tj = list[idx].joma || 0;
    list[idx].history.forEach(function(h) {
      if (h.type === 'bokeyoa') _tb += (h.bill || 0);
      else if (h.type === 'joma') _tj += (h.joma || 0);
    });
    list[idx].baki = Math.max(0, _tb - _tj);
    window._lsSet(key, list);
    epRender(n);
    fvOpenDetail(n, parentId); /* রিফ্রেশ */
    window._fbAutoSync();
  }
window.fvDetailSaveBokeyoa = fvDetailSaveBokeyoa;

  /* ডিটেইল গ্রাহক জমা সেভ */
  function fvDetailSaveJoma() {
    let n = _detailN, parentId = _detailId;
    let key  = EP_META[n].key;
    let list = window._lsGet(key);
    let idx  = list.findIndex(x => x.id === parentId);
    if (idx < 0) return;
    let memo = (document.getElementById('dmj-memo-' + parentId)?.value || '').trim();
    let date = document.getElementById('dmj-date-' + parentId)?.value || new Date().toISOString().slice(0,10);
    let joma = parseFloat(document.getElementById('dmj-joma-' + parentId)?.value) || 0;
    let note = (document.getElementById('dmj-note-' + parentId)?.value || '').trim();
    if (!list[idx].history) list[idx].history = [];
    list[idx].history.push({ type:'joma', memo, date, joma, note, ts: Date.now() });
    /* history থেকে সম্পূর্ণ recalculate */
    let _tb = list[idx].bill || 0;
    let _tj = list[idx].joma || 0;
    list[idx].history.forEach(function(h) {
      if (h.type === 'bokeyoa') _tb += (h.bill || 0);
      else if (h.type === 'joma') _tj += (h.joma || 0);
    });
    list[idx].baki = Math.max(0, _tb - _tj);
    window._lsSet(key, list);
    epRender(n);
    fvOpenDetail(n, parentId);
    window._fbAutoSync();
  }
window.fvDetailSaveJoma = fvDetailSaveJoma;

  /* ডিটেইল সরবরাহকারী বকেয়া সেভ */
  function fvDetailSaveBokeyoaSupplier() {
    let n = _detailN, parentId = _detailId;
    let key  = EP_META[n].key;
    let list = window._lsGet(key);
    let idx  = list.findIndex(x => x.id === parentId);
    if (idx < 0) return;
    let memo  = (document.getElementById('dmb-memo-' + parentId)?.value || '').trim();
    let date  = document.getElementById('dmb-date-'  + parentId)?.value || new Date().toISOString().slice(0,10);
    let goj   = (document.getElementById('dmb-goj-'  + parentId)?.value || '').trim();
    let pawna = parseFloat(document.getElementById('dmb-baki-' + parentId)?.value) || 0;
    let note  = (document.getElementById('dmb-note-' + parentId)?.value || '').trim();
    if (!list[idx].history) list[idx].history = [];
    list[idx].history.push({ type:'bokeyoa', memo, date, baki: pawna, note, goj, ts: Date.now() });
    /* history থেকে সম্পূর্ণ recalculate
       initPawna = মূল পাওনা (save-এর সময় store করা), না থাকলে baki+joma দিয়ে অনুমান */
    let _initP = (list[idx].initPawna !== undefined) ? list[idx].initPawna : (list[idx].baki || 0) + (list[idx].joma || 0);
    let _initJ = list[idx].joma || 0;
    let _tp  = _initP;
    let _tjs = _initJ;
    list[idx].history.forEach(function(h) {
      if (h.type === 'bokeyoa') _tp  += (h.baki || 0);
      else if (h.type === 'joma') _tjs += (h.joma || 0);
    });
    list[idx].baki = Math.max(0, _tp - _tjs);
    window._lsSet(key, list);
    epRender(n);
    fvOpenDetail(n, parentId);
    window._fbAutoSync();
  }
window.fvDetailSaveBokeyoaSupplier = fvDetailSaveBokeyoaSupplier;

  /* ডিটেইল সরবরাহকারী জমা সেভ */
  function fvDetailSaveJomaSupplier() {
    let n = _detailN, parentId = _detailId;
    let key  = EP_META[n].key;
    let list = window._lsGet(key);
    let idx  = list.findIndex(x => x.id === parentId);
    if (idx < 0) return;
    let memo = (document.getElementById('dmj-memo-' + parentId)?.value || '').trim();
    let date = document.getElementById('dmj-date-' + parentId)?.value || new Date().toISOString().slice(0,10);
    let joma = parseFloat(document.getElementById('dmj-joma-' + parentId)?.value) || 0;
    let note = (document.getElementById('dmj-note-' + parentId)?.value || '').trim();
    if (!list[idx].history) list[idx].history = [];
    list[idx].history.push({ type:'joma', memo, date, joma, note, ts: Date.now() });
    /* history থেকে সম্পূর্ণ recalculate */
    let _initP2 = (list[idx].initPawna !== undefined) ? list[idx].initPawna : (list[idx].baki || 0) + (list[idx].joma || 0);
    let _initJ2 = list[idx].joma || 0;
    let _tp2  = _initP2;
    let _tjs2 = _initJ2;
    list[idx].history.forEach(function(h) {
      if (h.type === 'bokeyoa') _tp2  += (h.baki || 0);
      else if (h.type === 'joma') _tjs2 += (h.joma || 0);
    });
    list[idx].baki = Math.max(0, _tp2 - _tjs2);
    window._lsSet(key, list);
    epRender(n);
    fvOpenDetail(n, parentId);
    window._fbAutoSync();
  }
window.fvDetailSaveJomaSupplier = fvDetailSaveJomaSupplier;

  /* এডিট মোডাল — ফাংশন
  */
  let _editN = 0, _editId = 0;

  function fvEditOpen(n, id, evt) {
    evt.stopPropagation();
    const entered = prompt('তথ্য সম্পাদনা করতে সিক্রেট কী দাও:');
    if (entered === null) return;
    if (entered !== _FB_SECRET) {
      window.showToast('ভুল সিক্রেট কী!', 'এডিট করা যাবে না।');
      return;
    }
    _fvEditOpenDo(n, id);
  }

  function _fvEditOpenDo(n, id) {
    const key  = EP_META[n].key;
    const list = window._lsGet(key);
    const item = list.find(x => x.id === id);
    if (!item) return;
    _editN  = n;
    _editId = id;
    document.getElementById('fvEditName').value = item.name || '';
    document.getElementById('fvEditAddr').value = item.addr || '';
    /* +880 প্রিফিক্স থাকলে বাদ দিয়ে শুধু নম্বর দেখাই */
    const storedMob = item.mob || '';
    document.getElementById('fvEditMob').value  = storedMob.startsWith('+88') ? storedMob.slice(3) : storedMob;
    /* has-val আপডেট */
    ['fvEditName','fvEditAddr'].forEach(function(id2){
      let el = document.getElementById(id2);
      if (el) _fvEditFV(el);
    });
    document.getElementById('fvEditOverlay').classList.add('open');
    /* mob field ছাড়া বাকি সব floating label update */
    document.querySelectorAll('#fvEditOverlay .fv-edit-field').forEach(function(field) {
      let inp = field.querySelector('input');
      if (inp) field.classList.toggle('has-val', inp.value.trim() !== '');
    });
  }

  function fvEditClose() {
    document.getElementById('fvEditOverlay').classList.remove('open');
    _editN = 0; _editId = 0;
  }
window.fvEditClose = fvEditClose;

  function fvEditSave() {
    const name = document.getElementById('fvEditName').value.trim();
    if (!name) { document.getElementById('fvEditName').focus(); return; }
    const addr = document.getElementById('fvEditAddr').value.trim();
    const mobRaw = document.getElementById('fvEditMob').value.trim();
    const mob  = mobRaw ? '+88' + mobRaw : '';
    const key  = EP_META[_editN].key;
    const list = window._lsGet(key);
    const idx  = list.findIndex(x => x.id === _editId);
    if (idx < 0) return;
    list[idx].name = name;
    list[idx].addr = addr;
    list[idx].mob  = mob;
    window._lsSet(key, list);
    /* fvEditClose এর আগে n সংরক্ষণ করি — close করলে _editN শূন্য হয়ে যায় */
    const savedN  = _editN;
    const savedId = _editId;
    fvEditClose();
    epRender(savedN);
    /* fvScreen খোলা থাকলে পাইল রিফ্রেশ */
    if (_fvCard === savedN) fvFilterRender();
    /* ডিটেইল স্ক্রিন খোলা থাকলে রিফ্রেশ */
    if (_detailN && _detailId === savedId) fvOpenDetail(_detailN, _detailId);
    window.notifPush('success', 'তথ্য সম্পাদনা সেভ হয়েছে।');
    window._fbAutoSync();
  }
window.fvEditSave = fvEditSave;

  /* floating label helper — সব field type এর জন্য একটাই function */
  function _setFV(inp, sel) {
    let field = inp.closest(sel || '.ep-field,.fv-edit-field,.fv-mini-field');
    if (!field) field = inp.closest('[class*="-field"]');
    if (field) field.classList.toggle('has-val', inp.value.trim() !== '');
  }
  function _epFV(inp)     { _setFV(inp); }
  function _fvEditFV(inp) { _setFV(inp); }
window._fvEditFV = _fvEditFV;
  function _fvMiniFV(inp) { _setFV(inp); }
window._fvMiniFV = _fvMiniFV;

  [1,2,3,4].forEach(n => {
    const key   = EP_META[n].key;
    const list  = window._lsGet(key);
    const cntEl = document.getElementById(`c${n}Count`);
    if (cntEl) cntEl.textContent = '';
  });


})();
