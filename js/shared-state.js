/* shared-state.js
   এই ফাইলে সেইসব helper আছে যেগুলো nav-shell.js, firebase-sync.js,
   fund-flow-ledger.js, debtors-list.js — চারটা ফাইলই ব্যবহার করে।
   এই ফাইল সবগুলোর আগে লোড হয়, তাই window.* সরাসরি কল করা যায়।
   (আগে এই সব একটাই fund-flow-ledger.js ফাইলে ছিল; ধাপ ৭-এর split-এ
   এখানে বের করা হলো যাতে বাকি ৪টা ফাইল independently কাজ করতে পারে।)
*/
(function () {

  /* debounce utility */
  function _debounce(fn, ms) {
    let t;
    return function() {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }
  window._debounce = _debounce;

  /* নোটিফিকেশন সিস্টেম
  */
  const _NOTIF_KEY = 'app_notifications';

  function _notifLoad() {
    try {
      return JSON.parse(localStorage.getItem(_NOTIF_KEY) || '[]');
    } catch (e) {
      console.error(_NOTIF_KEY + ' parse error:', e);
      return [];
    }
  }
  function _notifSave(list) {
    localStorage.setItem(_NOTIF_KEY, JSON.stringify(list.slice(0, 50)));
  }

  /* type: 'success' | 'error' | 'info' */
  function notifPush(type, msg) {
    let list = _notifLoad();
    list.unshift({ type: type, msg: msg, ts: Date.now(), read: false });
    _notifSave(list.slice(0, 50));
    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.add('show');
  }
  window.notifPush = notifPush;

  function _notifTimeText(ts) {
    let diff = Math.floor((Date.now() - ts) / 1000);
    let m = Math.floor(diff / 60);
    let h = Math.floor(diff / 3600);
    if (diff < 60) return 'এখনই';
    if (m < 60) return toBn(m) + ' মিনিট আগে';
    if (h < 24) return toBn(h) + ' ঘণ্টা আগে';
    return toBn(Math.floor(h / 24)) + ' দিন আগে';
  }

  function _notifRender() {
    let list = _notifLoad();
    let wrap = document.getElementById('notifList');
    if (!wrap) return;
    if (!list.length) {
      wrap.innerHTML = '<div class="notif-empty">কোনো নোটিফিকেশন নেই</div>';
      return;
    }
    wrap.innerHTML = list.map(function(n, i) {
      return '<div class="notif-item notif-' + n.type + '">'
        + '<div class="notif-msg">' + n.msg + '</div>'
        + '<div class="notif-time">' + _notifTimeText(n.ts) + '</div>'
        + '</div>';
    }).join('');
  }

  function notifOpen() {
    let list = _notifLoad();
    list.forEach(function(n) { n.read = true; });
    _notifSave(list);
    _notifRender();
    document.getElementById('notifOverlay').style.display = 'flex';
    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.remove('show');
  }
  window.notifOpen = notifOpen;

  function notifClose() {
    document.getElementById('notifOverlay').style.display = 'none';
  }
  window.notifClose = notifClose;

  function notifClear() {
    _notifSave([]);
    _notifRender();
    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.remove('show');
  }
  window.notifClear = notifClear;

  /* পেজ লোডে আগের আনরিড নোটিফিকেশন থাকলে badge দেখাও */
  window.addEventListener('DOMContentLoaded', () => {
    if (_notifLoad().length) {
      const badge = document.getElementById('notifBadge');
      if (badge) badge.classList.add('show');
    }
  });

  /* সংখ্যা/টাকা/তারিখ ফরম্যাটার */
  function toBn(n) { return String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]); }
  window.toBn = toBn;
  function fmtAmt(n) { return '৳' + (n||0).toLocaleString('bn-BD'); }
  window.fmtAmt = fmtAmt;
  function fmtDate(d) {
    if (!d) return '—';
    let p = d.slice(0,10).split('-');
    return p.length < 3 ? d : p[2] + '/' + p[1] + '/' + p[0];
  }
  window.fmtDate = fmtDate;

  /* সাধারণ toast নোটিফিকেশন — নিচের ডানে সংক্ষিপ্ত সময়ের জন্য দেখানো বার্তা।
     এটা notifPush (উপরের নোটিফিকেশন প্যানেল)-এর থেকে আলাদা — showToast তাৎক্ষণিক,
     history রাখে না, এবং validation/error বার্তার জন্য alert()-এর replacement হিসেবে ব্যবহার করা হয়। */
  function showToast(title, sub) {
    const toast = document.getElementById('toastNotify');
    if (!toast) return;
    const titleEl = document.getElementById('toastTitle');
    const subEl   = document.getElementById('toastSub');
    if (titleEl) titleEl.textContent = title;
    if (subEl)   subEl.textContent   = sub || '';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }
  window.showToast = showToast;

  /* ========================================================================
     localStorage ভার্সনিং ও মাইগ্রেশন সিস্টেম
     ------------------------------------------------------------------------
     এই অ্যাপের localStorage key-গুলো (is_c1_list, chart_data, fabricPurchaseData_v2,
     ইত্যাদি) আগে কোনো central versioning ছাড়াই ব্যবহৃত হতো — প্রতিটা key-এর data
     shape (array/object, কোন ফিল্ড আছে) কোথাও ট্র্যাক করা হতো না, ফলে ভবিষ্যতে
     shape বদলালে পুরনো ডেটা কীভাবে নতুন shape-এ রূপান্তর হবে সেটার কোনো
     ব্যবস্থা ছিল না।

     এই সিস্টেম key-নাম **অপরিবর্তিত** রেখেছে (যাতে বিদ্যমান ইউজারদের ডেটা
     migration ছাড়াই সাথে সাথে পড়া যায়), এবং schema-version ট্র্যাক + migration
     hook যোগ করেছে যাতে ভবিষ্যতে কোনো key-এর shape বদলালে নিরাপদে migrate
     করা যায়।
     ======================================================================== */

  const _SCHEMA_KEY = 'app_schema_version';
  const CURRENT_SCHEMA_VERSION = 1;

  /* প্রতিটা key-এর জন্য migration ধাপ — চাবি: key-নাম, মান: {fromVersion: fn(oldValue) => newValue}
     এই মুহূর্তে কোনো key-এর shape বদলায়নি, তাই তালিকা খালি। ভবিষ্যতে কোনো
     key-এর ডেটা shape বদলাতে হলে এখানে migration ফাংশন যোগ করলেই
     _migrateIfNeeded() স্বয়ংক্রিয়ভাবে পুরনো ইউজারদের ডেটা রূপান্তর করে দেবে।

     উদাহরণ (ভবিষ্যতে ব্যবহারের জন্য):
     'is_c1_list': {
       1: function(oldArr) {
         // v0 (unversioned) → v1: প্রতিটা এন্ট্রিতে 'createdAt' ফিল্ড যোগ করা
         return oldArr.map(function(item) {
           if (item.createdAt === undefined) item.createdAt = Date.now();
           return item;
         });
       }
     }
  */
  const _MIGRATIONS = {};

  function _getStoredSchemaVersion() {
    const raw = localStorage.getItem(_SCHEMA_KEY);
    const v = raw ? parseInt(raw, 10) : 0; /* 0 = ভার্সনিং যোগ হওয়ার আগের ডেটা */
    return isNaN(v) ? 0 : v;
  }

  function _setStoredSchemaVersion(v) {
    localStorage.setItem(_SCHEMA_KEY, String(v));
  }

  /* পেজ লোডে একবার চলে — প্রতিটা key-এর জন্য প্রযোজ্য migration ধাপ ক্রমান্বয়ে প্রয়োগ করে */
  function _migrateIfNeeded() {
    const storedVersion = _getStoredSchemaVersion();
    if (storedVersion >= CURRENT_SCHEMA_VERSION) return; /* আগে থেকেই up-to-date */

    let migratedAny = false;
    Object.keys(_MIGRATIONS).forEach(function(key) {
      const steps = _MIGRATIONS[key];
      const raw = localStorage.getItem(key);
      if (raw === null) return; /* এই ইউজারের কাছে এই key-এর ডেটাই নেই — migrate করার কিছু নেই */
      let value;
      try {
        value = JSON.parse(raw);
      } catch (e) {
        console.error('Migration: ' + key + ' parse error, skipping migration for this key:', e);
        return;
      }
      for (let fromV = storedVersion; fromV < CURRENT_SCHEMA_VERSION; fromV++) {
        const step = steps[fromV];
        if (typeof step === 'function') {
          try {
            value = step(value);
            migratedAny = true;
          } catch (e) {
            console.error('Migration step failed for ' + key + ' (v' + fromV + '→v' + (fromV+1) + '):', e);
          }
        }
      }
      localStorage.setItem(key, JSON.stringify(value));
    });

    _setStoredSchemaVersion(CURRENT_SCHEMA_VERSION);
    if (migratedAny) console.log('localStorage migration সম্পন্ন — schema v' + storedVersion + ' → v' + CURRENT_SCHEMA_VERSION);
  }
  window._migrateIfNeeded = _migrateIfNeeded;

  /* localStorage cache — একই key বারবার parse এড়ায়।
     corrupted JSON থাকলে (আগে try/catch ছিল না — একটা corrupted key পুরো
     অ্যাপ ক্র্যাশ করাতে পারত) এখন নিরাপদে খালি array-তে fallback করে এবং
     console.error-এ লগ করে, যাতে সমস্যাটা silent না থাকে। */
  const _lsCache = {};
  function _lsGet(key) {
    if (!_lsCache[key]) {
      const raw = localStorage.getItem(key);
      try {
        _lsCache[key] = raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('_lsGet(' + key + ') parse error, falling back to []:', e);
        _lsCache[key] = [];
      }
    }
    return _lsCache[key];
  }
  window._lsGet = _lsGet;
  function _lsSet(key, val) {
    _lsCache[key] = val;
    localStorage.setItem(key, JSON.stringify(val));
  }
  window._lsSet = _lsSet;
  function _lsClear(key) { delete _lsCache[key]; }
  window._lsClear = _lsClear;

  /* পেজ লোডের একদম শুরুতে migration চালাও — অন্য কোনো ফাইল localStorage
     পড়ার আগে, যেহেতু shared-state.js সবার আগে লোড হয় */
  _migrateIfNeeded();

})();

