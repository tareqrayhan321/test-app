/* profit-strip.js
   ড্যাশবোর্ডের নিট ও গ্রস প্রফিট strip কার্ড আপডেট।
   Depends on: _fbAutoSync (js/firebase-sync.js, typeof-গার্ডেড)
   (এই ফাইল আগে fabric-purchase.js (পূর্বে block-12.js)-এর একটা অংশ ছিল;
    ধাপ ৭-এর split-এ আলাদা করা হলো, যেহেতু fabric purchase-এর সাথে সম্পর্কহীন।)
*/
(function () {

/* নিট ও গ্রস প্রফিট strip কার্ড আপডেট */
const PROFIT_STRIP_LS_KEY = 'profitStripData_v1';

function saveProfitStripData(net, gross) {
  try {
    localStorage.setItem(PROFIT_STRIP_LS_KEY, JSON.stringify({ net: net, gross: gross }));
    if (typeof _fbAutoSync === 'function') _fbAutoSync();
  } catch (e) { /* localStorage না থাকলে নিরাপদে ignore */ }
}

function loadProfitStripData() {
  try {
    let raw = localStorage.getItem(PROFIT_STRIP_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { console.error('profitStripData parse error:', e); return null; }
}

function updateProfitStrip() {
  /* প্রথমে in-memory ভ্যালু চেক করো, না থাকলে localStorage থেকে নাও */
  let net, gross;
  if (window._lastNet !== undefined && window._lastNet !== null) {
    net   = window._lastNet;
    gross = window._lastGross || 0;
  } else {
    let saved = loadProfitStripData();
    if (saved) {
      net   = saved.net   || 0;
      gross = saved.gross || 0;
      window._lastNet   = net;
      window._lastGross = gross;
    } else {
      net   = 0;
      gross = 0;
    }
  }
  let T = function(v) {
    return (v < 0 ? '-' : '') + '৳' + Math.abs(Math.round(v)).toLocaleString('en-IN');
  };
  let netEl   = document.getElementById('kpiNetProfitStrip');
  let grossEl = document.getElementById('kpiGrossProfitStrip');
  if (netEl) {
    netEl.textContent = T(net);
    netEl.classList.toggle('is-loss', net < 0);
    /* লোকসানে parent card-ও লাল আভা */
    let nc = netEl.closest('.profit-kpi-net');
    if (nc) {
      nc.style.background   = net < 0 ? 'oklch(96% 0.04 20)'  : '';
      nc.style.borderColor  = net < 0 ? 'oklch(82% 0.12 20)'  : '';
      let nLbl = nc.querySelector('.profit-kpi-label');
      if (nLbl) nLbl.textContent = net < 0 ? 'Weekly Net Loss' : 'Weekly Net Profit';
    }
  }
  if (grossEl) {
    grossEl.textContent = T(gross);
    grossEl.classList.toggle('is-loss', gross < 0);
    let gc = grossEl.closest('.profit-kpi-gross');
    if (gc) {
      let gLbl = gc.querySelector('.profit-kpi-label');
      if (gLbl) gLbl.textContent = gross < 0 ? 'Weekly Gross Loss' : 'Weekly Gross Profit';
    }
  }
}
window.updateProfitStrip = updateProfitStrip;
window.saveProfitStripData = saveProfitStripData;
document.addEventListener('DOMContentLoaded', updateProfitStrip);

})();
