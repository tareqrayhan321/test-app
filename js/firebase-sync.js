/* firebase-sync.js
   Firebase Firestore অটো-সিঙ্ক সিস্টেম: init, real-time listener, push/pull,
   wipe, এবং tombstone (ডিলিটেড আইডি) merge লজিক।
   Depends on (window.* এক্সপোজড, তাই লোড-অর্ডার independent):
     - notifPush, _lsGet/_lsSet/_lsClear  <- js/shared-state.js
     - EP_META                             <- js/fund-flow-ledger.js
   (এই ফাইল আগে fund-flow-ledger.js-এর অংশ ছিল; ধাপ ৭-এর split-এ আলাদা করা হলো।)
*/
(function () {

  /* Firebase Firestore — অটো-সিঙ্ক সিস্টেম
  */
  const _FB_CONFIG = {
    apiKey:            "AIzaSyBKAihBx-YYxskEZeShnfK03a1DzxrtIqg",
    authDomain:        "dokane-aa207.firebaseapp.com",
    projectId:         "dokane-aa207",
    storageBucket:     "dokane-aa207.firebasestorage.app",
    messagingSenderId: "394082302202",
    appId:             "1:394082302202:web:f328696a8ad2312acff143"
  };
  const _FB_KEYS    = ['is_c1_list','is_c2_list','is_c3_list','is_c4_list','fabricPurchaseData_v2'];
  const _FB_ARR_KEYS = ['chart_data']; /* array data, merge by 'ts' instead of 'id' */
  const _FB_OBJ_KEYS = ['profitStripData_v1']; /* single-object data, last-write-wins */
  const _FB_DOC     = 'backup';
  const _FB_COL     = 'imran_store';
  /* NOTE: এটা প্রকৃত অথেন্টিকেশন না — শুধু accidental click/wipe থেকে বাঁচানোর
     একটা 4-digit gate। যেহেতু client-side JS-এ প্লেইনটেক্সটে আছে, view-source
     করলেই যে কেউ এটা দেখতে পাবে। ইচ্ছাকৃত অ্যাক্সেস আটকাতে এটা নির্ভরযোগ্য নয়। */
  const _FB_SECRET  = '1212';

  let _fbApp = null, _fbDb = null, _fbReady = false;
  let _autoSyncTimer = null;   /* debounce টাইমার */
  let _pendingSync   = false;  /* অফলাইনে পরিবর্তন হয়েছে কিনা */
  let _fbListener    = null;   /* onSnapshot unsubscribe হ্যান্ডেল */
  let _fbLastWriteTs = 0;      /* নিজে যে updatedAt লিখেছি — echo এড়াতে */

  /* Firebase ইনিশিয়ালাইজ */
  function _fbInit() {
    if (_fbReady && _fbDb) return;
    _fbReady = false;
    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK এখনো লোড হয়নি');
        return;
      }
      _fbApp = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(_FB_CONFIG);
      _fbDb  = firebase.firestore(_fbApp);

      /* ব্রাউজিং ডেটা ক্লিয়ারের পর "client is offline" এড়াতে:
         - persistence disable করো (IndexedDB cache ব্যবহার হবে না)
         - LongPolling চালু করো (WebSocket ছাড়াও কাজ করে)
         settings() শুধু প্রথমবার কাজ করে, পরে error আসলে ignore করি */
      try {
        _fbDb.settings({ experimentalForceLongPolling: true, merge: true });
      } catch(_) {}

      /* persistence বন্ধ — ব্রাউজার ডেটা ক্লিয়ার হলেও reconnect হবে */
      _fbDb.disableNetwork().then(() => _fbDb.enableNetwork()).catch(() => {});

      _fbReady = true;
    } catch(e) { _fbReady = false; _fbDb = null; console.error('Firebase init:', e); }
  }

  /* network force-reconnect — ব্রাউজিং ডেটা ক্লিয়ারের পর */
  async function _fbReconnect() {
    if (!_fbDb) return;
    try {
      await _fbDb.disableNetwork();
      await _fbDb.enableNetwork();
      console.log('Firebase network reconnected');
    } catch(e) { console.warn('Reconnect warn:', e); }
  }

  /* Real-time Listener — onSnapshot
     অন্য ডিভাইস কিছু সেভ করলে এই ডিভাইসে
     অটো আপডেট হবে, পেজ রিলোড ছাড়াই।
  */
  function _fbStartListener() {
    if (!_fbReady || !_fbDb) return; /* Firebase প্রস্তুত নয় */
    /* আগের listener থাকলে বন্ধ করো (ব্রাউজার ডেটা ক্লিয়ারের পর stale হতে পারে) */
    if (_fbListener) { try { _fbListener(); } catch(_){} _fbListener = null; }
    try {
      _fbListener = _fbDb
        .collection(_FB_COL)
        .doc(_FB_DOC)
        .onSnapshot(snap => {
          if (!snap.exists) return;
          const data = snap.data();

          /* নিজের লেখা echo এড়াও — ২ সেকেন্ডের মধ্যে আসলে skip */
          if (data.updatedAt && Math.abs(data.updatedAt - _fbLastWriteTs) < 2500) return;

          /* অন্য ডিভাইসের ডেটা — localStorage আপডেট করো */
          /* আগে remote deleted IDs sync করো */
          if (data[_FB_DEL_KEY]) _delIdsMerge(data[_FB_DEL_KEY]);
          const snapDelIds = _delIdsGet();

          let changed = false;
          _FB_KEYS.forEach(k => {
            if (!data[k]) return;
            /* deleted আইটেম বাদ দিয়ে filter করো */
            const deletedForKey = new Set(snapDelIds[k] || []);
            let filtered = data[k].filter(r => !deletedForKey.has(r.id));
            if (k === 'fabricPurchaseData_v2' && typeof _fabricPurgeGroups === 'function') {
              filtered = _fabricPurgeGroups(filtered);
            }
            const remote = JSON.stringify(filtered);
            const local  = localStorage.getItem(k) || '[]';
            if (remote !== local) {
              window._lsSet(k, filtered);
              changed = true;
            }
          });
          _FB_ARR_KEYS.forEach(k => {
            if (!data[k]) return;
            let localArr = [];
            try {
              localArr = JSON.parse(localStorage.getItem(k) || '[]');
            } catch (e) {
              console.error(k + ' parse error during merge, treating as empty:', e);
            }
            const mergedArr = _mergeArrByTs(localArr, data[k], k);
            if (JSON.stringify(mergedArr) !== JSON.stringify(localArr)) {
              localStorage.setItem(k, JSON.stringify(mergedArr));
              window._lsClear(k);
              changed = true;
            }
          });
          _FB_OBJ_KEYS.forEach(k => {
            if (!data[k]) return;
            const localRaw = localStorage.getItem(k);
            const remoteRaw = JSON.stringify(data[k]);
            /* echo গার্ড উপরে আগেই হ্যান্ডেল হয়েছে (updatedAt দিয়ে) — এখানে শুধু ভিন্ন হলে লেখো */
            if (remoteRaw !== localRaw) {
              localStorage.setItem(k, remoteRaw);
              changed = true;
            }
          });

          if (!changed) return;

          /* সময় সেভ */
          localStorage.setItem('db_last_sync', Date.now().toString());

          /* UI রিফ্রেশ — সব কার্ড, খোলা লিস্ট, খোলা ডিটেইল */
          [1,2,3,4].forEach(n => {
            const cntEl = document.getElementById('c' + n + 'Count');
            if (cntEl) {
              let list = [];
              try {
                list = JSON.parse(localStorage.getItem(window.EP_META[n].key) || '[]');
              } catch (e) {
                console.error(window.EP_META[n].key + ' parse error during UI refresh:', e);
              }
              const total = list.reduce((s,x) => s + (x.baki||0), 0);
              cntEl.textContent = '';
            }
          });
          if (typeof fvFilterRender === 'function' && _fvCard) fvFilterRender();
          if (typeof epUpdateCardStats === 'function') epUpdateCardStats();
          if (typeof fvOpenDetail  === 'function' && _detailN && _detailId) {
            fvOpenDetail(_detailN, _detailId);
          }
          if (typeof fabricRender === 'function') fabricRender();
          if (typeof updateProfitStrip === 'function') updateProfitStrip();
          if (typeof ffhRenderCashflowPie === 'function') ffhRenderCashflowPie();
          if (typeof renderCashflowPie === 'function') renderCashflowPie();
          if (typeof renderAggReportChart === 'function') renderAggReportChart();

          /* স্ট্যাটাস ও নোটিফিকেশন */
          _dbSetStatus('connected', 'অন্য ডিভাইস থেকে আপডেট এসেছে', _dbLastSyncText());
          window.notifPush('info', 'অন্য ডিভাইস ডেটা আপডেট করেছে — সিঙ্ক হয়েছে।');
          const sub = document.getElementById('dbMenuSub');
          if (sub) sub.textContent = '' + _dbLastSyncText().replace('সর্বশেষ সিঙ্ক: ','');
        }, err => {
          console.error('onSnapshot error:', err);
          _fbListener = null; /* error হলে reset করো যাতে পরে আবার চেষ্টা হয় */
        });
    } catch(e) { console.error('Listener start error:', e); }
  }

  /* স্ট্যাটাস UI হেল্পার */
  function _dbSetStatus(state, text, sub) {
    const dot  = document.getElementById('dbDot');
    const txt  = document.getElementById('dbStatusText');
    const last = document.getElementById('dbLastSync');
    if (dot) {
      dot.className = 'db-dot ' + (state || '');
      if (txt)  txt.textContent = text || '';
      if (sub !== undefined && last) last.textContent = sub || '';
    }
    _dbUpdateCardStat();
  }
  function _dbUpdateCardStat() {
    const el = document.getElementById('c9CardStat');
    if (!el) return;
    const rt = _fbListener ? 'Real-time সক্রিয়' : 'Real-time বন্ধ';
    const sync = _dbLastSyncText().replace('সর্বশেষ সিঙ্ক: ', '');
    el.textContent = rt + (sync ? ' · সর্বশেষ সিঙ্ক ' + sync : '');
  }
window._dbUpdateCardStat = _dbUpdateCardStat;
  function _dbSetBtns(disabled) {
    ['dbPushBtn','dbPullBtn'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.disabled = disabled;
    });
  }
  function _dbLastSyncText() {
    const t = localStorage.getItem('db_last_sync');
    if (!t) return '';
    const d = new Date(parseInt(t));
    return 'সর্বশেষ সিঙ্ক: ' + d.toLocaleDateString('bn-BD') + ' ' +
           d.toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'});
  }

  /* অটো-সিঙ্ক কোর (debounced) — merge strategy */
  function _fbAutoSync() {
    clearTimeout(_autoSyncTimer);
    if (!navigator.onLine) {
      _pendingSync = true;
      localStorage.setItem('db_pending_sync', '1');
      _dbSetStatus('error', 'অফলাইন — নেট চালু হলে সিঙ্ক হবে', _dbLastSyncText());
      return;
    }
    /* ২ সেকেন্ড debounce */
    _autoSyncTimer = setTimeout(async () => {
      _fbInit();
      if (!_fbReady) return;
      try {
        /* ১. Firebase থেকে বর্তমান ডেটা আনো */
        const snap = await _fbDb.collection(_FB_COL).doc(_FB_DOC).get();

        /* ২. Remote + Local merge করো (id দিয়ে deduplicate) */
        const payload = { secret: _FB_SECRET, updatedAt: Date.now() };
        /* remote-এর deleted IDs আগে sync করো */
        const remoteData = snap.exists ? snap.data() : {};
        if (remoteData[_FB_DEL_KEY]) _delIdsMerge(remoteData[_FB_DEL_KEY]);
        const delIds = _delIdsGet();
        _FB_KEYS.forEach(k => {
          const local  = JSON.parse(localStorage.getItem(k) || '[]');
          const remote = remoteData[k] || [];
          const deletedForKey = new Set(delIds[k] || []);

          /* remote-এ যা আছে local-এ নেই এবং deleted নয় সেগুলো যোগ করো */
          const localIds = new Set(local.map(x => x.id));
          let merged   = [...local];
          remote.forEach(r => { if (!localIds.has(r.id) && !deletedForKey.has(r.id)) merged.push(r); });
          if (k === 'fabricPurchaseData_v2' && typeof _fabricPurgeGroups === 'function') {
            merged = _fabricPurgeGroups(merged);
          }

          /* merge ফলাফল localStorage-এ সেভ করো */
          window._lsSet(k, merged);
          payload[k] = merged;
        });
        _FB_ARR_KEYS.forEach(k => {
          const local  = JSON.parse(localStorage.getItem(k) || '[]');
          const remote = remoteData[k] || [];
          const merged = _mergeArrByTs(local, remote, k);
          localStorage.setItem(k, JSON.stringify(merged));
          window._lsClear(k);
          payload[k] = merged;
        });
        _FB_OBJ_KEYS.forEach(k => {
          const local = JSON.parse(localStorage.getItem(k) || 'null');
          if (local !== null) payload[k] = local;
          else if (remoteData[k] !== undefined) payload[k] = remoteData[k];
        });
        /* deleted IDs Firebase-এ push করো যাতে অন্য ডিভাইসেও কাজ করে */
        payload[_FB_DEL_KEY] = delIds;

        /* ৩. Merged ডেটা Firebase-এ লিখো */
        _fbLastWriteTs = payload.updatedAt;
        await _fbDb.collection(_FB_COL).doc(_FB_DOC).set(payload);

        const now = Date.now().toString();
        localStorage.setItem('db_last_sync', now);
        localStorage.removeItem('db_pending_sync');
        _pendingSync = false;
        _dbSetStatus('connected', 'অটো-সিঙ্ক হয়েছে', _dbLastSyncText());
        window.notifPush('success', 'ডেটা অটো-সিঙ্ক হয়েছে — ' + _dbLastSyncText().replace('সর্বশেষ সিঙ্ক: ',''));
        const sub = document.getElementById('dbMenuSub');
        if (sub) sub.textContent = '' + _dbLastSyncText().replace('সর্বশেষ সিঙ্ক: ','');

        /* UI রিফ্রেশ */
        [1,2,3,4].forEach(n => { if (typeof epRender === 'function') epRender(n); });
        if (typeof fvFilterRender === 'function' && _fvCard) fvFilterRender();
          if (typeof epUpdateCardStats === 'function') epUpdateCardStats();
        if (typeof fabricRender === 'function') fabricRender();
        if (typeof updateProfitStrip === 'function') updateProfitStrip();

      } catch(e) {
        console.error('Auto-sync error:', e);
        _pendingSync = true;
        localStorage.setItem('db_pending_sync', '1');
        if (e.code === 'unavailable' || e.code === 'failed-precondition' || !_fbDb) {
          _fbReady = false; _fbDb = null; _fbListener = null;
        }
        _dbSetStatus('error', 'সিঙ্ক ব্যর্থ — পরে চেষ্টা হবে', '');
        window.notifPush('error', 'অটো-সিঙ্ক ব্যর্থ হয়েছে। নেট সংযোগ চেক করো।');
      }
    }, 2000);
  }
window._fbAutoSync = _fbAutoSync;

  /* নেট ফিরলে পেন্ডিং সিঙ্ক + Listener restart */
  window.addEventListener('online', async () => {
    /* ব্রাউজার ডেটা ক্লিয়ার হলে _fbReady false থাকতে পারে — পুনরায় init */
    if (!_fbReady || !_fbDb) _fbInit();
    /* network force-reconnect — "client is offline" error fix */
    await _fbReconnect();
    /* listener বন্ধ বা stale থাকলে আবার চালু */
    if (_fbReady) _fbStartListener();
    if (localStorage.getItem('db_pending_sync') === '1' || _pendingSync) {
      _dbSetStatus('syncing', 'নেট পেয়েছে — সিঙ্ক হচ্ছে…', '');
      window.notifPush('info', 'নেট সংযোগ ফিরে এসেছে। পেন্ডিং ডেটা সিঙ্ক হচ্ছে…');
      _fbAutoSync();
    }
  });
  window.addEventListener('offline', () => {
    _dbSetStatus('error', 'অফলাইন', _dbLastSyncText());
    window.notifPush('error', 'ইন্টারনেট সংযোগ বিচ্ছিন্ন। নেট চালু হলে অটো-সিঙ্ক হবে।');
  });

  /* মোডাল খোলা */
  async function dbConnectOpen() {
    _fbInit();
    document.getElementById('dbOverlay').classList.add('open');
    _dbSetBtns(true);
    _dbSetStatus('syncing', 'সংযোগ যাচাই করা হচ্ছে…', '');
    if (!_fbReady || !_fbDb) {
      _dbSetStatus('error', 'Firebase লোড হয়নি। পেজ রিফ্রেশ করো।', '');
      return;
    }
    /* ব্রাউজিং ডেটা ক্লিয়ারের পর "client is offline" এড়াতে reconnect */
    await _fbReconnect();
    try {
      await _fbDb.collection(_FB_COL).doc(_FB_DOC).get();
      const isPending = localStorage.getItem('db_pending_sync') === '1';
      const isListening = !!_fbListener;
      _dbSetStatus('connected',
        isPending ? 'পেন্ডিং সিঙ্ক আছে' :
        isListening ? 'Firebase সংযুক্ত — Real-time সক্রিয় ' : 'Firebase সংযুক্ত',
        _dbLastSyncText());
      _dbSetBtns(false);
      /* listener চালু না থাকলে এখনই চালু করো */
      if (!isListening) _fbStartListener();
    } catch(e) {
      console.error('dbConnectOpen error:', e);
      _dbSetStatus('error', 'সংযোগ ব্যর্থ: ' + e.message, '');
    }
  }
window.dbConnectOpen = dbConnectOpen;

  function dbClose() {
    document.getElementById('dbOverlay').classList.remove('open');
  }
window.dbClose = dbClose;

  /* ম্যানুয়াল আপলোড (merge করে) */
  async function dbPush() {
    if (!_fbReady || !_fbDb) { _fbInit(); }
    if (!_fbReady || !_fbDb) {
      _dbSetStatus('error', 'Firebase লোড হয়নি। পেজ রিফ্রেশ করো।', '');
      window.notifPush('error', 'Firebase প্রস্তুত নয়। পেজ রিফ্রেশ করো।');
      return;
    }
    _dbSetBtns(true);
    _dbSetStatus('syncing', 'আপলোড হচ্ছে…', '');
    try {
      /* আগে remote ডেটা এনে merge করো */
      const snap = await _fbDb.collection(_FB_COL).doc(_FB_DOC).get();
      const payload = { secret: _FB_SECRET, updatedAt: Date.now() };
      const pushRemote = snap.exists ? snap.data() : {};
      if (pushRemote[_FB_DEL_KEY]) _delIdsMerge(pushRemote[_FB_DEL_KEY]);
      const pushDelIds = _delIdsGet();
      _FB_KEYS.forEach(k => {
        const local  = JSON.parse(localStorage.getItem(k) || '[]');
        const remote = pushRemote[k] || [];
        const deletedForKey = new Set(pushDelIds[k] || []);
        const localIds = new Set(local.map(x => x.id));
        let merged   = [...local];
        remote.forEach(r => { if (!localIds.has(r.id) && !deletedForKey.has(r.id)) merged.push(r); });
        if (k === 'fabricPurchaseData_v2' && typeof _fabricPurgeGroups === 'function') {
          merged = _fabricPurgeGroups(merged);
        }
        window._lsSet(k, merged);
        payload[k] = merged;
      });
      _FB_ARR_KEYS.forEach(k => {
        const local  = JSON.parse(localStorage.getItem(k) || '[]');
        const remote = pushRemote[k] || [];
        const merged = _mergeArrByTs(local, remote, k);
        localStorage.setItem(k, JSON.stringify(merged));
        window._lsClear(k);
        payload[k] = merged;
      });
      _FB_OBJ_KEYS.forEach(k => {
        const local = JSON.parse(localStorage.getItem(k) || 'null');
        if (local !== null) payload[k] = local;
        else if (pushRemote[k] !== undefined) payload[k] = pushRemote[k];
      });
      payload[_FB_DEL_KEY] = pushDelIds;
      _fbLastWriteTs = payload.updatedAt;
      await _fbDb.collection(_FB_COL).doc(_FB_DOC).set(payload);
      localStorage.setItem('db_last_sync', Date.now().toString());
      localStorage.removeItem('db_pending_sync');
      _pendingSync = false;
      _dbSetStatus('connected', 'আপলোড সফল — সব ডেটা merge হয়েছে', _dbLastSyncText());
      window.notifPush('success', 'আপলোড সফল — সব ডিভাইসের ডেটা merge হয়েছে।');
      document.getElementById('dbInfoText').textContent = 'সমস্ত ডেটা merge করে ক্লাউডে সেভ হয়েছে।';
      [1,2,3,4].forEach(n => { if (typeof epRender === 'function') epRender(n); });
      if (typeof fvFilterRender === 'function' && _fvCard) fvFilterRender();
          if (typeof epUpdateCardStats === 'function') epUpdateCardStats();
      if (typeof fabricRender === 'function') fabricRender();
      if (typeof updateProfitStrip === 'function') updateProfitStrip();
    } catch(e) {
      console.error('dbPush error:', e);
      _dbSetStatus('error', 'আপলোড ব্যর্থ: ' + e.message, '');
      window.notifPush('error', 'আপলোড ব্যর্থ: ' + e.message);
    }
    _dbSetBtns(false);
  }
window.dbPush = dbPush;

  /* ডাউনলোড */
  async function dbPull() {
    if (!_fbReady || !_fbDb) { _fbInit(); }
    if (!_fbReady || !_fbDb) {
      _dbSetStatus('error', 'Firebase লোড হয়নি। পেজ রিফ্রেশ করো।', '');
      window.notifPush('error', 'Firebase প্রস্তুত নয়। পেজ রিফ্রেশ করো।');
      return;
    }
    if (!confirm('ক্লাউড থেকে ডেটা ডাউনলোড করলে ফোনের বর্তমান ডেটা পরিবর্তন হবে। নিশ্চিত?')) return;
    _dbSetBtns(true);
    _dbSetStatus('syncing', 'ডাউনলোড হচ্ছে…', '');
    try {
      const snap = await _fbDb.collection(_FB_COL).doc(_FB_DOC).get();
      if (!snap.exists) {
        _dbSetStatus('error', 'ক্লাউডে কোনো ডেটা নেই। আগে আপলোড করো।', '');
        _dbSetBtns(false); return;
      }
      const data = snap.data();
      /* deleted IDs আগে sync করো */
      if (data[_FB_DEL_KEY]) _delIdsMerge(data[_FB_DEL_KEY]);
      const pullDelIds = _delIdsGet();
      _FB_KEYS.forEach(k => {
        if (!data[k]) return;
        const deletedForKey = new Set(pullDelIds[k] || []);
        let filtered = data[k].filter(r => !deletedForKey.has(r.id));
        if (k === 'fabricPurchaseData_v2' && typeof _fabricPurgeGroups === 'function') {
          filtered = _fabricPurgeGroups(filtered);
        }
        localStorage.setItem(k, JSON.stringify(filtered));
      });
      _FB_ARR_KEYS.forEach(k => {
        if (!data[k]) return;
        localStorage.setItem(k, JSON.stringify(data[k]));
      });
      _FB_OBJ_KEYS.forEach(k => {
        if (data[k] === undefined) return;
        localStorage.setItem(k, JSON.stringify(data[k]));
      });
      localStorage.setItem('db_last_sync', Date.now().toString());
      _dbSetStatus('connected', 'ডাউনলোড সফল — পেজ রিলোড হবে', _dbLastSyncText());
      window.notifPush('info', 'ক্লাউড থেকে ডেটা ডাউনলোড সফল হয়েছে।');
      setTimeout(() => { dbClose(); location.reload(); }, 1800);
    } catch(e) {
      console.error('dbPull error:', e);
      _dbSetStatus('error', 'ডাউনলোড ব্যর্থ: ' + e.message, '');
      window.notifPush('error', 'ডাউনলোড ব্যর্থ: ' + e.message);
      _dbSetBtns(false);
    }
  }
window.dbPull = dbPull;

  /* ক্লাউড ডেটা মুছো — সিক্রেট কী যাচাই করে */
  function dbConfirmWipe() {
    const entered = prompt('ক্লাউড ডেটা মুছতে সিক্রেট কী দাও:');
    if (entered === null) return; /* বাতিল */
    if (entered !== _FB_SECRET) {
      window.showToast('ভুল সিক্রেট কী!', 'ডেটা মোছা হয়নি।');
      return;
    }
    _dbDoWipe();
  }
window.dbConfirmWipe = dbConfirmWipe;
  async function _dbDoWipe() {
    _fbInit();
    _dbSetBtns(true);
    _dbSetStatus('syncing', 'মুছে ফেলা হচ্ছে…', '');
    try {
      await _fbDb.collection(_FB_COL).doc(_FB_DOC).delete();
      _dbSetStatus('connected', 'ক্লাউড ডেটা মুছে ফেলা হয়েছে।', '');
      document.getElementById('dbInfoText').textContent = 'Firebase থেকে সব ডেটা ডিলিট করা হয়েছে।';
    } catch(e) {
      console.error('dbConfirmWipe error:', e);
      _dbSetStatus('error', 'মুছতে ব্যর্থ: ' + e.message, '');
    }
    _dbSetBtns(false);
  }

  /* পেজ লোডে পেন্ডিং সিঙ্ক চেক + Listener চালু */
  window.addEventListener('load', () => {
    // defer script লোড নিশ্চিত করতে সামান্য দেরি
    setTimeout(async () => {
      _fbInit();
      if (_fbReady) {
        /* ব্রাউজিং ডেটা ক্লিয়ারের পর network reconnect নিশ্চিত করো */
        await _fbReconnect();
        _fbStartListener();
      }
      if (navigator.onLine && localStorage.getItem('db_pending_sync') === '1') {
        _fbAutoSync();
      }
    }, 800);
  });

  /* এন্ট্রি পপআপ — সব লজিক
  */

  /* chart_data-এর মতো array merge: dedup by ts, তারপর year+week collapse */
  function _mergeArrByTs(local, remote, tombstoneKey) {
    let deadIds = null;
    if (tombstoneKey) {
      let delMap = _delIdsGet();
      let arr = delMap[tombstoneKey] || [];
      deadIds = {};
      arr.forEach(function(id) { deadIds[id] = true; });
    }
    let byTs = {};
    (local || []).forEach(function(e) { if (e && e.ts !== undefined && !(deadIds && deadIds[e.ts])) byTs[e.ts] = e; });
    (remote || []).forEach(function(e) { if (e && e.ts !== undefined && !byTs[e.ts] && !(deadIds && deadIds[e.ts])) byTs[e.ts] = e; });
    let merged = Object.keys(byTs).map(function(k) { return byTs[k]; });
    /* একই year+week থাকলে সবচেয়ে নতুন ts রাখো */
    let byWeek = {};
    merged.forEach(function(e) {
      let wk = (e.year !== undefined && e.week !== undefined) ? (e.year + '_' + e.week) : ('ts_' + e.ts);
      if (!byWeek[wk] || e.ts > byWeek[wk].ts) byWeek[wk] = e;
    });
    let result = Object.keys(byWeek).map(function(k) { return byWeek[k]; });
    result.sort(function(a, b) { return a.ts - b.ts; });
    if (result.length > 26) result = result.slice(result.length - 26);
    return result;
  }

  /* Deleted IDs Tombstone — ডিলিট হওয়া
     আইটেম যাতে merge-এ ফিরে না আসে
  */
  const _FB_DEL_KEY = 'is_deleted_ids';

  function _delIdsGet() {
    try { return JSON.parse(localStorage.getItem(_FB_DEL_KEY) || '{}'); } catch(e) { console.error('_FB_DEL_KEY parse error:', e); return {}; }
  }

  function _delIdsAdd(key, id) {
    let obj = _delIdsGet();
    if (!obj[key]) obj[key] = [];
    if (obj[key].indexOf(id) < 0) obj[key].push(id);
    localStorage.setItem(_FB_DEL_KEY, JSON.stringify(obj));
  }
window._delIdsAdd = _delIdsAdd;

  /* fabricPurchaseData_v2 — nested purchases-এর tombstone সহ পার্জ করো,
     যাতে ডিলিট করা purchase বা গ্রুপ merge/sync-এ ফিরে না আসে */
  function _fabricPurgeGroups(list) {
    if (!Array.isArray(list)) return list;
    let delMap = _delIdsGet();
    let deadGroups    = new Set(delMap['fabricPurchaseData_v2'] || []);
    let deadPurchases = new Set(delMap['fabricPurchaseData_v2_purchases'] || []);
    return list
      .filter(function(g) { return g && !deadGroups.has(g.id); })
      .map(function(g) {
        if (Array.isArray(g.purchases)) {
          g.purchases = g.purchases.filter(function(p) { return p && !deadPurchases.has(p.id); });
        }
        return g;
      })
      .filter(function(g) { return !Array.isArray(g.purchases) || g.purchases.length > 0; });
  }

  function _delIdsMerge(remote) {
    if (!remote || typeof remote !== 'object') return;
    let local = _delIdsGet();
    Object.keys(remote).forEach(function(k) {
      if (!Array.isArray(remote[k])) return;
      if (!local[k]) local[k] = [];
      remote[k].forEach(function(id) {
        if (local[k].indexOf(id) < 0) local[k].push(id);
      });
    });
    localStorage.setItem(_FB_DEL_KEY, JSON.stringify(local));
    Object.keys(local).forEach(function(k) {
      if (!Array.isArray(local[k]) || !local[k].length) return;
      let list = window._lsGet(k);
      let delSet = new Set(local[k]);
      let filtered = list.filter(function(x) { return !delSet.has(x.id); });
      if (filtered.length !== list.length) window._lsSet(k, filtered);
    });
  }


})();
