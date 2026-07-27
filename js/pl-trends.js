
(function () {
/* AGGREGATE REPORT & P&L TRENDS — হোম কার্ড ফাংশন */

function aggGetChartData() {
  try { return JSON.parse(localStorage.getItem('chart_data') || '[]'); } catch(e) { console.error('chart_data parse error:', e); return []; }
}

/* Profit & Loss Trends */
function openPLTrends() {
  let el = document.getElementById('plTrendsOverlay');
  el.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  plRenderRevenueBarChart();
}
window.openPLTrends = openPLTrends;
function closePLTrends() {
  document.getElementById('plTrendsOverlay').style.display = 'none';
  document.body.style.overflow = '';
}
window.closePLTrends = closePLTrends;
function plRenderRevenueBarChart() {
  let data    = aggGetChartData();
  let emptyEl = document.getElementById('plR-empty');
  let svg     = document.getElementById('plR-svgRevBar');
  if (!data||data.length===0) {
    if(emptyEl) emptyEl.style.display='block';
    if(svg) svg.innerHTML=''; return;
  }
  if(emptyEl) emptyEl.style.display='none';
  if(!svg) return;
  let sorted=data.slice().sort(function(a,b){return a.ts-b.ts;});
  /* লেআউট: [WLBL = খাড়া সপ্তাহ/মাস লেবেলের জন্য নির্দিষ্ট লেন] [VLBL = সংখ্যা লেবেলের জন্য] [HALF = বার] [VLBL] [HALF = বার] */
  let BW=28,GAP=14,HALF=90,VLBL=20,WLBL=64;
  let HT=WLBL+VLBL+HALF*2+VLBL, W=sorted.length*(BW+GAP)-GAP, ZERO_Y=WLBL+VLBL+HALF;
  let absMax=0;
  for(let i=0;i<sorted.length;i++){
    let an=Math.abs(sorted[i].net||0);
    if(an>absMax)absMax=an;
  }
  if(absMax===0)absMax=1;
  let html='<defs>'
    +'<linearGradient id="plNGU" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5db8a6"/><stop offset="100%" stop-color="#3f8c7d"/></linearGradient>'
    +'<linearGradient id="plNGD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cc785c"/><stop offset="100%" stop-color="#a9583e"/></linearGradient>'
    +'</defs>';
  html+='<line x1="0" y1="'+ZERO_Y+'" x2="'+W+'" y2="'+ZERO_Y+'" stroke="#d8d2c7" stroke-width="1.5" stroke-linecap="round"/>';
  /* barPath ও fmtV এখন js/util-esc.js-এ শেয়ার্ড (window.barPath / window.fmtV) */
  /* লেবেলের জন্য সবসময় নির্দিষ্ট, ধারাবাহিক জায়গা রাখা হয় — বারের উচ্চতা যত কম/বেশি হোক,
     সংখ্যা কখনো বারের সাথে বা একে অপরের সাথে ওভারল্যাপ করবে না */
  let LABEL_GAP=6, LABEL_H=12;
  for(let j=0;j<sorted.length;j++){
    let e=sorted[j], x=j*(BW+GAP);
    let net=e.net||0;
    let bh=Math.max(4,Math.round((Math.abs(net)/absMax)*HALF)), isUp=net>=0, by=isUp?(ZERO_Y-bh):ZERO_Y;
    html+='<path d="'+barPath(x,by,BW,bh,isUp)+'" fill="'+(isUp?'url(#plNGU)':'url(#plNGD)')+'"/>';
    if(net!==0){
      /* পজিটিভ বার হলে লেবেল বারের ঠিক উপরে, নেগেটিভ হলে বারের ঠিক নিচে — বার যত বড়/ছোট হোক, নির্দিষ্ট gap বজায় থাকে */
      let lY=isUp?(by-LABEL_GAP):(by+bh+LABEL_GAP+LABEL_H);
      html+='<text x="'+(x+BW/2)+'" y="'+lY+'" text-anchor="middle" font-size="10" font-family="monospace" fill="'+(isUp?'#3f8c7d':'#a9583e')+'" font-weight="700">'+fmtV(net)+'</text>';
    }
    /* সপ্তাহ/মাসের নাম — বারের ঠিক উপরে, খাড়াখাড়িভাবে (৯০° রোটেট) লেখা, তাই কম আনুভূমিক জায়গা লাগে
       e.label ফরম্যাট: "মাস বছর সপ্তা-নং" → শুধু "মাস সপ্তা-নং" রাখা হয়, বছর বাদ */
    let wl = (e.label||'').replace(/^(\S+)\s+\S+\s+(সপ্তা-\S+)$/,'$1 $2');
    if (wl) {
      html += '<text x="0" y="0" text-anchor="start" font-size="9.5" font-family="var(--fab-sans,sans-serif)" '
        + 'fill="#6c6a64" font-weight="600" transform="translate('+(x+BW/2+4)+','+(WLBL-6)+') rotate(-90)">'+wl+'</text>';
    }
    /* ডিলিট বাটন — প্রতিটি বারের ঠিক উপরে, চার্টের একদম উপরের লেনে (×), শুধু ডিলিট মুডে দৃশ্যমান */
    if (window._plDelMode) {
      let delCx = x + BW/2, delCy = 9;
      html += '<g class="pl-del-btn" style="cursor:pointer;" '
        + 'onclick="plDeleteEntry(' + e.ts + ')" role="button" aria-label="মুছে ফেলুন">'
        + '<circle cx="' + delCx + '" cy="' + delCy + '" r="8" fill="#fff" stroke="#d8988a" stroke-width="1"/>'
        + '<text x="' + delCx + '" y="' + (delCy + 3.5) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#c0392b" font-family="sans-serif">×</text>'
        + '</g>';
    }
  }
  svg.setAttribute('width',W); svg.setAttribute('height',HT); svg.setAttribute('viewBox','0 0 '+W+' '+HT);
  svg.innerHTML=html;
  let scroll=document.getElementById('plR-revBarScroll');
  if(scroll) setTimeout(function(){scroll.scrollLeft=scroll.scrollWidth;},50);
}
window.plRenderRevenueBarChart = plRenderRevenueBarChart;

/* ডিলিট মুড টগল — P&L Trends */
function plToggleDelMode() {
  window._plDelMode = !window._plDelMode;
  let btn = document.getElementById('plDelModeBtn');
  if (btn) {
    if (window._plDelMode) {
      btn.textContent = 'ডিলিট মুড বন্ধ করুন';
      btn.classList.add('del-mode-active');
    } else {
      btn.textContent = 'ডিলিট মুড';
      btn.classList.remove('del-mode-active');
    }
  }
  plRenderRevenueBarChart();
}
window.plToggleDelMode = plToggleDelMode;

/* P&L Trends চার্ট থেকে একটি সপ্তাহের ইন্ডিকেটর ডিলিট করা */
function plDeleteEntry(ts) {
  if (!confirm('এই সপ্তাহের ইন্ডিকেটর মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।')) return;
  try {
    let data = JSON.parse(localStorage.getItem('chart_data') || '[]');
    let filtered = data.filter(function(e) { return e.ts !== ts; });
    localStorage.setItem('chart_data', JSON.stringify(filtered));
    if (typeof _delIdsAdd === 'function') _delIdsAdd('chart_data', ts);
    if (typeof _fbAutoSync === 'function') _fbAutoSync();
  } catch (e) {
    console.error('plDeleteEntry error:', e);
    window.showToast('মুছে ফেলতে সমস্যা হয়েছে', e.message);
    return;
  }
  plRenderRevenueBarChart();
  if (typeof aggOvRender === 'function') aggOvRender();
  if (typeof ffhRenderCashflowPie === 'function') ffhRenderCashflowPie();
  if (typeof renderAggReportChart === 'function') renderAggReportChart();
  if (typeof renderCharts === 'function') renderCharts();
}
window.plDeleteEntry = plDeleteEntry;

/* হোমপেজ কার্ডে সরাসরি Fund Flow ডাটা — ওভারলে না খুলেই দেখা যায় */
function ffhRenderCashflowPie() {
  let data     = aggGetChartData();
  let emptyEl  = document.getElementById('ffh-empty');
  let dataEl   = document.getElementById('ffh-data');
  let svg      = document.getElementById('ffh-svgPie');
  let legendEl = document.getElementById('ffh-legend');
  let lblEl    = document.getElementById('ffhWeekLabel');
  if (!emptyEl || !dataEl) return;

  if (!data || data.length === 0) {
    emptyEl.style.display = 'flex'; dataEl.style.display = 'none'; return;
  }

  let sorted = data.slice().sort(function(a, b) { return b.ts - a.ts; });
  let e = sorted[0];

  if (!e.cashIn && !e.cashOut && !e.cogs) {
    emptyEl.style.display = 'flex'; dataEl.style.display = 'none'; return;
  }

  emptyEl.style.display = 'none'; dataEl.style.display = 'flex';
  if (!svg || !legendEl) return;

  if (lblEl) lblEl.textContent = e.label || 'তহবিল প্রবাহ';

  let cashIn  = e.cashIn  || 0;
  let cashOut = e.cashOut || 0;
  let cogs    = e.cogs    || 0;
  let opex    = e.opex    || 0;
  let fixed   = e.fixed   || 0;
  let netCF   = cashIn - cashOut;

  let segments = [
    { label: 'নগদ আয়',           val: cashIn, color: 'oklch(55% 0.17 160)', clr2: 'oklch(40% 0.14 160)' },
    { label: 'পণ্য ক্রয়', val: cogs,   color: 'oklch(60% 0.18 22)',  clr2: 'oklch(45% 0.16 22)'  },
    { label: 'Maintenance Costs', val: opex,   color: 'oklch(70% 0.16 60)',  clr2: 'oklch(55% 0.14 60)'  },
    { label: 'Fixed Costs',       val: fixed,  color: 'oklch(62% 0.16 280)', clr2: 'oklch(48% 0.14 280)' },
  ].filter(function(s) { return s.val > 0; });

  if (segments.length === 0) {
    emptyEl.style.display = 'flex'; dataEl.style.display = 'none'; return;
  }

  let cx = 65, cy = 65, R = 46, iR = 28;
  let grandTotal = segments.reduce(function(s, x) { return s + x.val; }, 0);
  if (grandTotal === 0) grandTotal = 1;

  let angle = -Math.PI / 2;
  let paths = '', gradDefs = '<defs>';
  let cashSegStartA = null, cashSegEndA = null; /* 'নগদ আয়' সেগমেন্টের কৌণিক পরিসর — নেস্টেড লেয়ারের জন্য */

  segments.forEach(function(seg, idx) {
    let sweep  = (seg.val / grandTotal) * 2 * Math.PI;
    let startA = angle, endA = angle + sweep;
    let x1o = cx + R  * Math.cos(startA), y1o = cy + R  * Math.sin(startA);
    let x2o = cx + R  * Math.cos(endA),   y2o = cy + R  * Math.sin(endA);
    let x1i = cx + iR * Math.cos(endA),   y1i = cy + iR * Math.sin(endA);
    let x2i = cx + iR * Math.cos(startA), y2i = cy + iR * Math.sin(startA);
    let large = sweep > Math.PI ? 1 : 0;
    let gid = 'ffhpg' + idx;
    gradDefs += '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="' + seg.color + '"/>'
      + '<stop offset="100%" stop-color="' + seg.clr2 + '"/>'
      + '</linearGradient>';
    let d = 'M' + x1o.toFixed(2) + ',' + y1o.toFixed(2)
          + ' A' + R + ',' + R + ' 0 ' + large + ',1 ' + x2o.toFixed(2) + ',' + y2o.toFixed(2)
          + ' L' + x1i.toFixed(2) + ',' + y1i.toFixed(2)
          + ' A' + iR + ',' + iR + ' 0 ' + large + ',0 ' + x2i.toFixed(2) + ',' + y2i.toFixed(2) + 'Z';
    paths += '<path d="' + d + '" fill="url(#' + gid + ')" stroke="#fff" stroke-width="1.5"/>';
    if (seg.label === 'নগদ আয়') { cashSegStartA = startA; cashSegEndA = endA; }
    angle = endA;
  });
  gradDefs += '</defs>';

  /* সবুজ 'নগদ আয়' সেগমেন্টের ভেতরেই নেস্টেড লেয়ার: নিট মুনাফার নগদ অংশ (একই কৌণিক পরিসরে, চিকন সাব-ব্যান্ড) */
  let netVal   = e.net   !== undefined ? e.net   : netCF;
  /* নিট মুনাফার নগদ অংশ — মোট বিক্রয়ের কতটা নগদে পাওয়া গেছে (cashIn/sales) সেই অনুপাত নিট মুনাফার উপর বসানো */
  let salesVal = e.sales || 0;
  let cashRatio = salesVal > 0 ? (cashIn / salesVal) : 0;
  cashRatio = Math.max(0, Math.min(cashRatio, 1));
  let cashOnHandVal = netVal * cashRatio;
  (function updateNetCashStrip() {
    let el = document.getElementById('kpiNetCashStrip');
    if (!el) return;
    let abs = Math.abs(cashOnHandVal);
    el.textContent = (cashOnHandVal < 0 ? '-' : '') + '৳' + Math.round(abs).toLocaleString('en-IN');
    el.classList.toggle('is-loss', cashOnHandVal < 0);
    el.classList.toggle('is-profit', cashOnHandVal >= 0);
    let cc = el.closest('.kpi-mini-card');
    if (cc) {
      let cLbl = cc.querySelector('.card-title');
      if (cLbl) cLbl.textContent = cashOnHandVal < 0 ? 'Weekly Cash Loss' : 'Weekly Cash Profit';
      cc.style.background   = cashOnHandVal < 0 ? 'oklch(96% 0.04 20)'  : '';
      cc.style.borderColor  = cashOnHandVal < 0 ? 'oklch(82% 0.12 20)'  : '';
    }
  })();
  (function drawNestedCashLayer() {
    if (cashIn <= 0 || cashSegStartA === null) return;
    /* সবুজ সেগমেন্টের রেডিয়াল ব্যান্ড (iR → R) এর ভেতরে দুটি সাব-ব্যান্ড, একই কৌণিক পরিসরে (cashSegStartA → cashSegEndA) */
    let bandThickness = R - iR;
    let subOuter = iR + bandThickness * 0.55;  /* ভিতরের বর্ডার ঘেঁষে, মোটা — Cash Profit */
    let subInner = iR;                          /* একদম ভিতরের বর্ডার বরাবর */
    let lossOuter = R;                          /* বাইরের বর্ডার ঘেঁষে — Cash Loss */
    let lossInner = R - bandThickness * 0.55;

    let frac = cashIn > 0 ? (cashOnHandVal / cashIn) : 0;
    frac = Math.max(0, Math.min(Math.abs(frac), 1));

    /* Cash Profit আর্ক (নিট মুনাফা ধনাত্মক হলে) */
    if (netVal >= 0 && frac > 0) {
      let sA = cashSegStartA, eA = cashSegStartA + frac * (cashSegEndA - cashSegStartA);
      let large = (eA - sA) > Math.PI ? 1 : 0;
      let cohColor1 = 'oklch(88% 0.09 160)';
      let cohColor2 = 'oklch(78% 0.11 160)';
      let gid = 'ffhCashNested';
      gradDefs += '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0%" stop-color="' + cohColor1 + '"/>'
        + '<stop offset="100%" stop-color="' + cohColor2 + '"/>'
        + '</linearGradient>';
      let x1o = cx + subOuter * Math.cos(sA), y1o = cy + subOuter * Math.sin(sA);
      let x2o = cx + subOuter * Math.cos(eA), y2o = cy + subOuter * Math.sin(eA);
      let x1i = cx + subInner * Math.cos(eA), y1i = cy + subInner * Math.sin(eA);
      let x2i = cx + subInner * Math.cos(sA), y2i = cy + subInner * Math.sin(sA);
      let d = 'M' + x1o.toFixed(2) + ',' + y1o.toFixed(2)
        + ' A' + subOuter + ',' + subOuter + ' 0 ' + large + ',1 ' + x2o.toFixed(2) + ',' + y2o.toFixed(2)
        + ' L' + x1i.toFixed(2) + ',' + y1i.toFixed(2)
        + ' A' + subInner + ',' + subInner + ' 0 ' + large + ',0 ' + x2i.toFixed(2) + ',' + y2i.toFixed(2) + 'Z';
      paths += '<path d="' + d + '" fill="url(#' + gid + ')" stroke="#fff" stroke-width="0.75"/>';
    }

    /* Cash Loss আর্ক (নিট মুনাফা ঋণাত্মক হলে, লাল রঙে) */
    if (netVal < 0 && frac > 0) {
      let lsA = cashSegStartA, leA = cashSegStartA + frac * (cashSegEndA - cashSegStartA);
      let lLarge = (leA - lsA) > Math.PI ? 1 : 0;
      let lossColor1 = 'oklch(68% 0.20 25)';
      let lossColor2 = 'oklch(52% 0.19 25)';
      let lgid = 'ffhCashLossNested';
      gradDefs += '<linearGradient id="' + lgid + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0%" stop-color="' + lossColor1 + '"/>'
        + '<stop offset="100%" stop-color="' + lossColor2 + '"/>'
        + '</linearGradient>';
      let lx1o = cx + lossOuter * Math.cos(lsA), ly1o = cy + lossOuter * Math.sin(lsA);
      let lx2o = cx + lossOuter * Math.cos(leA), ly2o = cy + lossOuter * Math.sin(leA);
      let lx1i = cx + lossInner * Math.cos(leA), ly1i = cy + lossInner * Math.sin(leA);
      let lx2i = cx + lossInner * Math.cos(lsA), ly2i = cy + lossInner * Math.sin(lsA);
      let ld = 'M' + lx1o.toFixed(2) + ',' + ly1o.toFixed(2)
        + ' A' + lossOuter + ',' + lossOuter + ' 0 ' + lLarge + ',1 ' + lx2o.toFixed(2) + ',' + ly2o.toFixed(2)
        + ' L' + lx1i.toFixed(2) + ',' + ly1i.toFixed(2)
        + ' A' + lossInner + ',' + lossInner + ' 0 ' + lLarge + ',0 ' + lx2i.toFixed(2) + ',' + ly2i.toFixed(2) + 'Z';
      paths += '<path d="' + ld + '" fill="url(#' + lgid + ')" stroke="#fff" stroke-width="0.75"/>';
    }
  })();

  let cTxt = cashIn >= 100000 ? (cashIn/100000).toFixed(1)+'ল' : cashIn >= 1000 ? (cashIn/1000).toFixed(1)+'হা' : cashIn;
  paths += '<text x="'+cx+'" y="'+(cy-5)+'" text-anchor="middle" font-size="10" font-family="monospace" fill="#8a8896" font-weight="600">আয়</text>';
  paths += '<text x="'+cx+'" y="'+(cy+9)+'" text-anchor="middle" font-size="12" font-family="monospace" fill="#2b2640" font-weight="900">'+cTxt+'৳</text>';

  svg.innerHTML = gradDefs + paths;

  let legHTML = '';
  segments.forEach(function(seg) {
    let pct    = ((seg.val / grandTotal) * 100).toFixed(1);
    let valFmt = seg.val >= 100000 ? (seg.val/100000).toFixed(1)+'ল'
               : seg.val >= 1000    ? (seg.val/1000).toFixed(1)+'হা'
               : seg.val;
    legHTML += '<div style="display:flex;align-items:center;gap:5px;min-width:0;">'
      + '<span style="flex-shrink:0;width:9px;height:9px;border-radius:50%;background:' + seg.color + ';"></span>'
      + '<span style="flex:1;min-width:0;font-size:11px;color:#5a5868;font-weight:600;overflow-wrap:break-word;">' + seg.label + '</span>'
      + '<span style="flex-shrink:0;font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:800;color:#2b2640;">' + pct + '%</span>'
      + '<span style="flex-shrink:0;font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:#8a8896;min-width:38px;text-align:right;">' + valFmt + '৳</span>'
      + '</div>';
  });
  /* নিট মুনাফার নগদ অংশ — এই সপ্তাহের বিক্রয়ের কতটা নগদে পাওয়া গেছে সেই অনুপাত নিট মুনাফার উপর */
  let cohAbs = Math.abs(cashOnHandVal);
  let cohFmt = (cashOnHandVal >= 0 ? '+' : '−')
    + (cohAbs >= 100000 ? (cohAbs/100000).toFixed(1)+'ল' : cohAbs >= 1000 ? (cohAbs/1000).toFixed(1)+'হা' : cohAbs) + '৳';
  if (netVal >= 0) {
    let cohColor = 'oklch(68% 0.14 175)';
    legHTML += '<div style="display:flex;align-items:center;gap:5px;min-width:0;">'
      + '<span style="flex-shrink:0;width:9px;height:9px;border-radius:50%;background:' + cohColor + ';"></span>'
      + '<span style="flex:1;min-width:0;font-size:11px;color:#5a5868;font-weight:600;overflow-wrap:break-word;">Cash Profit</span>'
      + '<span id="ffh-cashOnHand-profit" style="flex-shrink:0;font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:800;color:' + cohColor + ';">' + cohFmt + '</span>'
      + '</div>';
  } else {
    let lossColor = 'oklch(58% 0.20 25)';
    legHTML += '<div style="display:flex;align-items:center;gap:5px;min-width:0;">'
      + '<span style="flex-shrink:0;width:9px;height:9px;border-radius:50%;background:' + lossColor + ';"></span>'
      + '<span style="flex:1;min-width:0;font-size:11px;color:#5a5868;font-weight:600;overflow-wrap:break-word;">Cash Loss</span>'
      + '<span id="ffh-cashOnHand-loss" style="flex-shrink:0;font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:800;color:' + lossColor + ';">' + cohFmt + '</span>'
      + '</div>';
  }
  legendEl.innerHTML = legHTML;
}
window.ffhRenderCashflowPie = ffhRenderCashflowPie;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    ffhRenderCashflowPie();
    if (window.fitHomeGrid) window.fitHomeGrid();
  });
} else {
  ffhRenderCashflowPie();
  if (window.fitHomeGrid) window.fitHomeGrid();
}

})();
