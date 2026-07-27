/* agg-report-card.js
   Dashboard Aggregate Report কার্ড: টেবিল রেন্ডার, ডিলিট মুড, row-ডিলিট, ওভারলে ওপেন/ক্লোজ।
   Depends on (typeof-গার্ডেড, তাই লোড-অর্ডার independent):
     - _delIdsAdd, _fbAutoSync, _dbUpdateCardStat  <- js/firebase-sync.js
     - ffhRenderCashflowPie, renderAggReportChart   <- js/pl-trends.js
     - renderCharts, plRenderRevenueBarChart        <- js/weekly-report.js, js/pl-trends.js
   (এই ফাইল আগে fabric-purchase.js (পূর্বে block-12.js)-এর একটা অংশ ছিল;
    ধাপ ৭-এর split-এ আলাদা করা হলো।)
*/
(function () {
/* Dashboard Aggregate Report card render */
function aggOvRender() {
  let data = (function() {
    try { return JSON.parse(localStorage.getItem('chart_data') || '[]'); } catch(e) { console.error('chart_data parse error:', e); return []; }
  })();
  let emptyEl = document.getElementById('aggOvEmpty');
  let tableEl = document.getElementById('aggOvTableWrap');
  let subEl   = document.getElementById('aggOvSub');
  let tbody   = document.getElementById('aggOvTbody');
  if (!emptyEl || !tableEl || !tbody) return;
  if (!data || data.length === 0) {
    emptyEl.style.display = 'block'; tableEl.style.display = 'none';
    if (subEl) subEl.textContent = 'কোনো ডাটা নেই';
    let cardSubE = document.getElementById('aggOvCardSub');
    if (cardSubE) cardSubE.textContent = 'কোনো ডাটা নেই';
    return;
  }
  emptyEl.style.display = 'none'; tableEl.style.display = 'block';
  let sorted = data.slice().sort(function(a, b) { return b.ts - a.ts; });
  let sumSales=0, sumGross=0, sumNet=0, sumIn=0, sumOut=0;
  function fmt(v) {
    if (v===undefined||v===null) return '—';
    let abs=Math.abs(v);
    /* সংক্ষেপে (ল/হা) না লিখে পুরো সংখ্যা, কমা সহ */
    let s=Math.round(abs).toLocaleString('en-IN');
    return (v<0?'−':'')+'৳'+s;
  }
  let rows='';
  sorted.forEach(function(e) {
    let sales=e.sales||0, gross=e.gross!==undefined?e.gross:(e.net||0), net=e.net||0, cashIn=e.cashIn||0, cashOut=e.cashOut||0;
    sumSales+=sales; sumGross+=gross; sumNet+=net; sumIn+=cashIn; sumOut+=cashOut;
    rows+='<tr><td>'+(e.label||'—')+'</td>'
      +'<td class="agg-td-sales">'+fmt(sales)+'</td>'
      +'<td class="'+(net>=0?'agg-td-net-pos':'agg-td-net-neg')+'">'+fmt(net)+'</td>'
      +'<td class="agg-td-gross">'+fmt(gross)+'</td>'
      +'<td class="agg-td-in">'+fmt(cashIn)+'</td>'
      +'<td class="agg-td-out">'+fmt(cashOut)+'</td>'
      +'<td style="text-align:center;">'+(window._aggDelMode ? (
        '<button type="button" onclick="aggOvDeleteRow('+e.ts+')" '
        +'style="border:none;background:transparent;color:#c0392b;cursor:pointer;font-size:16px;line-height:1;padding:4px 6px;" '
        +'title="মুছে ফেলুন" aria-label="মুছে ফেলুন"></button>'
      ) : '')+'</td></tr>';
  });
  tbody.innerHTML=rows;
  function setFoot(id,v,cls){ let el=document.getElementById(id); if(!el)return; el.textContent=fmt(v); el.className=cls; }
  setFoot('aggOvTSales',sumSales,'agg-td-sales');
  setFoot('aggOvTNet',  sumNet,  sumNet>=0?'agg-td-net-pos':'agg-td-net-neg');
  setFoot('aggOvTGross',sumGross,'agg-td-gross');
  setFoot('aggOvTIn',   sumIn,  'agg-td-in');
  setFoot('aggOvTOut',  sumOut, 'agg-td-out');
  if (subEl) subEl.textContent=sorted.length+' সপ্তাহের ডাটা';
  /* ড্যাশবোর্ডের full-size Aggregate Report কার্ড (আগের ক্যালেন্ডার কার্ডের জায়গায়) — চলতি সপ্তাহের In Flow/বহির্গমন */
  function setStat(id, v, isLoss) {
    let el = document.getElementById(id);
    if (!el) return;
    el.textContent = fmt(v);
    el.classList.toggle('is-loss', !!isLoss);
  }
  let curWeek = sorted[0] || {};
  setStat('aggFullIn',  curWeek.cashIn  || 0, false);
  setStat('aggFullOut', curWeek.cashOut || 0, false);
  /* card-এর count আপডেট */
  let cardSub = document.getElementById('aggOvCardSub');
  if (cardSub) cardSub.textContent = sorted.length + ' সপ্তাহের ডাটা';
}
window.aggOvRender = aggOvRender;

/* ডিলিট মুড টগল — Aggregate Report */
function aggOvToggleDelMode() {
  window._aggDelMode = !window._aggDelMode;
  let btn = document.getElementById('aggOvDelModeBtn');
  if (btn) {
    if (window._aggDelMode) {
      btn.textContent = 'ডিলিট মুড বন্ধ করুন';
      btn.classList.add('del-mode-active');
    } else {
      btn.textContent = 'ডিলিট মুড';
      btn.classList.remove('del-mode-active');
    }
  }
  aggOvRender();
}
window.aggOvToggleDelMode = aggOvToggleDelMode;

/* Aggregate Report টেবিল থেকে একটি সপ্তাহ/লাইন ডিলিট করা */
function aggOvDeleteRow(ts) {
  if (!confirm('এই সপ্তাহের ডাটা মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।')) return;
  try {
    let data = JSON.parse(localStorage.getItem('chart_data') || '[]');
    let filtered = data.filter(function(e) { return e.ts !== ts; });
    localStorage.setItem('chart_data', JSON.stringify(filtered));
    if (typeof _delIdsAdd === 'function') _delIdsAdd('chart_data', ts);
    if (typeof _fbAutoSync === 'function') _fbAutoSync();
  } catch (e) {
    console.error('aggOvDeleteRow error:', e);
    window.showToast('মুছে ফেলতে সমস্যা হয়েছে', e.message);
    return;
  }
  aggOvRender();
  if (typeof ffhRenderCashflowPie === 'function') ffhRenderCashflowPie();
  if (typeof renderAggReportChart === 'function') renderAggReportChart();
  if (typeof renderCharts === 'function') renderCharts();
  if (typeof plRenderRevenueBarChart === 'function') plRenderRevenueBarChart();
}
window.aggOvDeleteRow = aggOvDeleteRow;

document.addEventListener('DOMContentLoaded', aggOvRender);
document.addEventListener('DOMContentLoaded', function() {
  if (typeof _dbUpdateCardStat === 'function') _dbUpdateCardStat();
});

function aggOverlayOpen() {
  document.getElementById('aggOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  aggOvRender();
}
function aggOverlayClose() {
  document.getElementById('aggOverlay').style.display = 'none';
  document.body.style.overflow = '';
}
window.aggOverlayOpen  = aggOverlayOpen;
window.aggOverlayClose = aggOverlayClose;

})();
