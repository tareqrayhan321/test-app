
(function () {
  /* AGGREGATE REPORT TOGGLE
  */
  function toggleAggregateReport() {
    let body    = document.getElementById('aggReportBody');
    let chevron = document.getElementById('aggReportChevron');
    let open    = body.style.display !== 'none';
    body.style.display      = open ? 'none' : 'block';
    chevron.style.transform = open ? '' : 'rotate(180deg)';
  }

  function togglePLTrends() {
    let body    = document.getElementById('plTrendsBody');
    let chevron = document.getElementById('plTrendsChevron');
    let open    = body.style.display !== 'none';
    body.style.display      = open ? 'none' : 'block';
    chevron.style.transform = open ? '' : 'rotate(180deg)';
  }

  function toggleFundFlow() {
    let body    = document.getElementById('fundFlowBody');
    let chevron = document.getElementById('fundFlowChevron');
    let open    = body.style.display !== 'none';
    body.style.display      = open ? 'none' : 'block';
    chevron.style.transform = open ? '' : 'rotate(180deg)';
  }

  /* NAVIGATION
  */

  let currentPage = 'calc';

  function goToPage(page) {
    if (page === 'chart') page = 'home'; // গ্রাফ এখন হোম ড্যাশবোর্ডে
    if (page === currentPage) return;

    const oldPage = document.getElementById('page-' + currentPage);
    const newPage = document.getElementById('page-' + page);
    if (!newPage) { currentPage = page; return; }

    if (oldPage) {
      oldPage.classList.add('exit-left');
      oldPage.classList.remove('active');
    }

    newPage.style.transform = 'translateX(40px)';
    newPage.style.opacity   = '0';
    newPage.classList.add('active');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        newPage.style.transform = '';
        newPage.style.opacity   = '';
      });
    });

    if (oldPage) {
      setTimeout(() => {
        oldPage.classList.remove('exit-left');
        oldPage.style.transform = '';
        oldPage.style.opacity   = '';
      }, 320);
    }

    currentPage = page;

    if (page === 'chart') renderCharts();
    if (page === 'home') renderAggReportChart();
    if (page === 'calc') autoFillWeeklyCreditFields();
  }
  window.goToPage = goToPage;

  /* সাপ্তাহিক (সোম–রবি) কাস্টমার/মহাজন হিস্টরি থেকে
     "বাকিতে বিক্রি", "পাওনা আদায়", "বাকিতে ক্রয়", "বকেয়া পরিশোধ" —
     এই ৪টা বক্স অটোমেটিক পূরণ করে।
     (অ্যাপের হেডার সপ্তাহ-ক্যালেন্ডারের মতোই সোমবার থেকে সপ্তাহ শুরু ধরা হয়েছে)
  */
  function _awGetWeekRange() {
    let t = new Date();
    let ti = t.getDay(); /* 0=রবি...6=শনি */
    let diff = (ti - 1 + 7) % 7;
    let mon = new Date(t.getFullYear(), t.getMonth(), t.getDate() - diff);
    mon.setHours(0,0,0,0);
    let sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    sun.setHours(23,59,59,999);
    return { start: mon, end: sun };
  }

  function _awSumHistory(keys, bokeyoaField, jomaField) {
    let range = _awGetWeekRange();
    let bokeyoaTotal = 0, jomaTotal = 0;
    for (let k = 0; k < keys.length; k++) {
      let list = [];
      try { list = JSON.parse(localStorage.getItem(keys[k]) || '[]'); } catch (e) { console.error(keys[k] + ' parse error:', e); list = []; }
      for (let i = 0; i < list.length; i++) {
        let hist = list[i].history || [];
        for (let j = 0; j < hist.length; j++) {
          let h = hist[j];
          if (!h.date) continue;
          let hd = new Date(h.date + 'T00:00:00');
          if (isNaN(hd.getTime()) || hd < range.start || hd > range.end) continue;
          if (h.type === 'bokeyoa') bokeyoaTotal += (h[bokeyoaField] || 0);
          else if (h.type === 'joma') jomaTotal += (h.joma || 0);
        }
      }
    }
    return { bokeyoa: bokeyoaTotal, joma: jomaTotal };
  }

  function autoFillWeeklyCreditFields() {
    /* is_c1_list, is_c2_list = কাস্টমার তালিকা; is_c3_list, is_c4_list = মহাজন তালিকা
       (EP_META অবজেক্টেও এই একই key ব্যবহার হয়, কিন্তু সেটা আলাদা স্কোপে থাকায় এখানে সরাসরি key ব্যবহার করা হলো) */
    let custKeys = ['is_c1_list', 'is_c2_list'];
    let suppKeys = ['is_c3_list', 'is_c4_list'];
    let custSums = _awSumHistory(custKeys, 'bill', 'joma');
    let suppSums = _awSumHistory(suppKeys, 'baki', 'joma');

    let fCreditSale     = $('creditSale');
    let fOldCollection  = $('oldCollection');
    let fCreditPurchase = $('creditPurchase');
    let fOldDebt        = $('oldDebt');

    /* যেসব বক্সে ইউজার নিজে হাতে কিছু লেখেননি (খালি আছে), শুধু সেগুলোতেই অটো-ভ্যালু বসানো হয় —
       যাতে ম্যানুয়াল এডিট করা কোনো মান ভুলে মুছে না যায় */
    if (fCreditSale     && fCreditSale.value     === '' && custSums.bokeyoa > 0) fCreditSale.value     = custSums.bokeyoa;
    if (fOldCollection  && fOldCollection.value  === '' && custSums.joma    > 0) fOldCollection.value  = custSums.joma;
    if (fCreditPurchase && fCreditPurchase.value === '' && suppSums.bokeyoa > 0) fCreditPurchase.value = suppSums.bokeyoa;
    if (fOldDebt        && fOldDebt.value        === '' && suppSums.joma    > 0) fOldDebt.value        = suppSums.joma;

    if (typeof updateTotalSale === 'function') updateTotalSale();
    if (typeof updateEstCOGS   === 'function') updateEstCOGS();
  }

  function updateReview() {
    const cs = n($('cashSale').value), cr = n($('creditSale').value);
    const totalSale = cs + cr;
    const sg = n($('soldGaj').value), pg = n($('profitGaj').value);
    const estCogs = totalSale > 0 && sg > 0 ? totalSale - (sg * pg) : 0;
    const sal  = n($('salary').value) + n($('ownerSalary').value) +
                 n($('transport').value) +
                 n($('vehicle').value) + n($('misc').value);
    const f    = weeklyFixed();
    const fx   = f.wRent + f.wElec + f.wWifi + f.wMath + f.wToilet + f.wZakat;
    set('rv-sale',  T(totalSale));
    set('rv-cogs',  estCogs > 0 ? T(estCogs) : '—');
    set('rv-opex',  T(sal));
    set('rv-fixed', T(fx));
  }

  /* CORE HELPERS
  */
  const n   = v => parseFloat(v) || 0;
  window.n = n;
  const $   = id => document.getElementById(id);
  const set = (id, t) => { const el=$(id); if(el) el.textContent = t; };
  window.set = set;

  function fmt(v) {
    if (isNaN(v) || !isFinite(v)) return '0';
    const s = v < 0 ? '−' : '', a = Math.abs(v);
    if (a >= 10000000) return s + (a/10000000).toFixed(2) + ' কোটি';
    if (a >= 100000)   return s + (a/100000).toFixed(2)   + ' লক্ষ';
    return s + Math.round(a).toLocaleString();
  }
  window.fmt = fmt;
  const T = v => fmt(v) + ' ৳';
  window.T = T;

  /* শতাংশ ফরম্যাটার — ১০-এর কম মানে ১ দশমিক দেখায় (০.৮% → ১% রাউন্ডিং বাগ ঠিক) */
  function fmtPct(v) {
    return parseFloat(v.toFixed(Math.abs(v) < 10 ? 1 : 0));
  }

  const BN_MONTHS = ['জানু','ফেব্রু','মার্চ','এপ্রি','মে','জুন','জুলা','আগস্ট','সেপ্ট','অক্টো','নভে','ডিসে'];
  window.BN_MONTHS = BN_MONTHS;
  const BN_NUMS   = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  function toBN(n) { return String(Math.round(n)).replace(/[0-9]/g, d => BN_NUMS[d]); }
  function fmtK(v) {
    const s = v < 0 ? '−' : '+', a = Math.abs(v);
    if (a >= 100000) return s + (a/100000).toFixed(1) + 'লক্ষ';
    if (a >= 1000)   return s + (a/1000).toFixed(1)   + 'হা';
    return s + Math.round(a);
  }

  /* LIVE UPDATE HELPERS
  */
  function weeklyFixed() {
    return {
      wRent:   n($('yearlyRent').value)  / 52,
      wElec:   n($('monthlyElec').value) / 4.333,
      wWifi:   n($('monthlyWifi').value) / 4.333,
      wMath:   n($('weeklyMath').value),
      wToilet: n($('weeklyToilet').value),
      wZakat:  (n($('closingStock').value) + n($('cashSale').value) + n($('creditSale').value) + n($('cashPurchase').value)) * 0.025 / 52,
    };
  }

  function updateHint() {
    const f     = weeklyFixed();
    const total = f.wRent + f.wElec + f.wWifi + f.wMath + f.wToilet + f.wZakat;
    const h     = $('fixedHint');
    if (total > 0) {
      const rows = [
        ['দোকান ভাড়া', f.wRent],
        ['বিদ্যুৎ',     f.wElec],
        ['ওয়াইফাই',    f.wWifi],
        ['মাঠ ভাড়া',   f.wMath],
        ['টয়লেট',      f.wToilet],
        ['যাকাত',       f.wZakat],
      ].filter(r => r[1] > 0)
       .map(r => `<div class="hint-row"><span>${r[0]}</span><span>${T(r[1])}</span></div>`)
       .join('');
      h.innerHTML = rows + `<div class="hint-total"><span>সাপ্তাহিক স্থায়ী মোট</span><span>${T(total)}</span></div>`;
      h.style.display = 'block';
    } else {
      h.style.display = 'none';
    }
  }
  window.updateHint = updateHint;

  function updateEstCOGS() {
    const sg   = n($('soldGaj').value);
    const pg   = n($('profitGaj').value);
    const estProfit = sg * pg;
    $('estProfitAuto').textContent = estProfit > 0 ? T(estProfit) : '—';
  }
  window.updateEstCOGS = updateEstCOGS;

  function updateActualCOGS() {
    const op  = n($('openingStock').value);
    const pur = n($('auditPurchase').value);
    const cl  = n($('closingStock').value);
    const sl  = n($('stockLoss').value);
    const actual = op + pur - cl + sl;
    $('cogsAuto').textContent = (op > 0 || pur > 0 || cl > 0) ? T(actual) : '—';
  }
  window.updateActualCOGS = updateActualCOGS;

  function updateTotalSale() {
    const cs    = n($('cashSale').value);
    const cr    = n($('creditSale').value);
    const total = cs + cr;
    $('totalSaleAuto').textContent = total > 0 ? T(total) : '—';
  }
  window.updateTotalSale = updateTotalSale;

  /* CALCULATE
  */
  /* সংশোধন: goStep() মূল কোডে কল হতো কিন্তু কখনো define করা হয়নি —
     ফলে validation ব্যর্থ হলেই calculate() ReferenceError দিয়ে ভেঙে যেত এবং
     ইউজার কোনো error message দেখতেই পেত না। এখানে সেই ধাপে scroll করে
     ইউজারকে দেখানো হচ্ছে কোথায় ভুল আছে। */
  function goStep(n) {
    const el = document.getElementById('step' + n);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* সংশোধন: 'validation-error' element তিন জায়গায় null-check ছাড়াই
     ব্যবহার হচ্ছিল (goStep()-এর মতো defensive pattern অনুসরণ করা হয়নি)।
     আজকের HTML-এ ভাঙবে না, কিন্তু element মিসিং থাকলে TypeError দিয়ে
     পুরো calculate() ভেঙে যেত। একটা guarded helper দিয়ে তিনটা সাইট একীভূত করা হলো। */
  function showValidationError(message) {
    const errEl = document.getElementById('validation-error');
    if (!errEl) return null;
    errEl.textContent = message;
    errEl.style.display = 'block';
    return errEl;
  }

  function calculate() {
    // ইনপুট ভ্যালিডেশন 
    const cashSaleVal  = parseFloat(document.getElementById('cashSale').value);
    const creditSaleVal = parseFloat(document.getElementById('creditSale').value);
    const totalSaleVal = (isNaN(cashSaleVal) ? 0 : cashSaleVal) + (isNaN(creditSaleVal) ? 0 : creditSaleVal);
    if (totalSaleVal <= 0) {
      const errEl = showValidationError('বিক্রির পরিমাণ শূন্য হতে পারবে না। অনুগ্রহ করে Purchase & Sale তথ্য পূরণ করুন।');
      goStep(3);
      if (errEl) setTimeout(() => { errEl.style.display = 'none'; }, 4000);
      return;
    }
    const soldGajVal = n(document.getElementById('soldGaj').value);
    const profitGajVal = n(document.getElementById('profitGaj').value);
    if (soldGajVal <= 0 || profitGajVal <= 0) {
      const errEl = showValidationError('Stock ধাপে বিক্রিত গজ ও প্রতি গজে লাভ পূরণ করুন।');
      goStep(2);
      if (errEl) setTimeout(() => { errEl.style.display = 'none'; }, 4000);
      return;
    }
    const validationErrEl = document.getElementById('validation-error');
    if (validationErrEl) validationErrEl.style.display = 'none';
    const cashSale      = n($('cashSale').value);
    const creditSale    = n($('creditSale').value);
    const totalSale     = cashSale + creditSale;

    /* আনুমানিত COGS (প্রাথমিক) */
    const soldGaj    = n($('soldGaj').value);
    const profitGaj  = n($('profitGaj').value);
    const estProfit  = soldGaj * profitGaj;
    const estCogs    = totalSale - estProfit;        // মূল হিসাব

    /* লোকসান মাল (COGS-এ যোগ করা হবে) */
    const stockLoss  = n($('stockLoss').value);

    /* প্রকৃত COGS (Stock অডিট, ঐচ্ছিক) */
    const openingStock   = n($('openingStock').value);
    const auditPurchase  = n($('auditPurchase').value);
    const closingStock   = n($('closingStock').value);
    const hasAudit       = openingStock > 0 || auditPurchase > 0 || closingStock > 0;
    const actualCogs     = openingStock + auditPurchase - closingStock + stockLoss;

    const cogs = estCogs + stockLoss;   // Stock লস COGS-এ যোগ করা হয়েছে

    const gross       = totalSale - cogs;
    const salary      = n($('salary').value);
    const ownerSalary = n($('ownerSalary').value);
    const transport   = n($('transport').value);
    const vehicle     = n($('vehicle').value);
    const misc        = n($('misc').value);
    const opex        = salary + ownerSalary + transport + vehicle + misc;
    const f           = weeklyFixed();
    const zakat       = f.wZakat;
    const fixedExp    = f.wRent + f.wElec + f.wWifi + f.wMath + f.wToilet;
    const netProfit   = gross - opex - fixedExp - zakat;

    const cashPurchase  = n($('cashPurchase').value);
    const creditPurchase= n($('creditPurchase').value);
    const oldCollection = n($('oldCollection').value);
    const oldDebt       = n($('oldDebt').value);

    const cashIn      = cashSale + oldCollection;
    const cashOut     = cashPurchase + oldDebt + opex + fixedExp;
    const netCashflow = cashIn - cashOut;

    /* ENTERPRISE RENDER: LEVEL 1 KPI BAR (কার্ডগুলো UI থেকে সরানো হয়েছে,
       কিন্তু নিচের হিসাব/ভ্যারিয়েবলগুলো অন্য ফিচারে ব্যবহৃত হয় বলে রাখা হলো) */
    // Net Profit KPI Card
    const kpiPC = $('kpiProfitCard');
    if (kpiPC) kpiPC.className = 'kpi-card ' + (netProfit >= 0 ? 'kpi-profit' : 'kpi-loss');
    const kpiNP = $('kpiNetProfit');
    if (kpiNP) {
      kpiNP.textContent = T(netProfit);
      kpiNP.className   = 'kpi-value ' + (netProfit >= 0 ? 'kv-green' : 'kv-red');
    }
    set('kpiProfitSub', 'নিট মার্জিন: ' + fmtPct(netProfit / totalSale * 100) + '%');

    // Gross Profit KPI Card
    const kpiGC = $('kpiGrossCard');
    if (kpiGC) kpiGC.className = 'kpi-card ' + (gross >= 0 ? 'kpi-neutral' : 'kpi-loss');
    const kpiGP = $('kpiGrossProfit');
    if (kpiGP) { kpiGP.textContent = T(gross); kpiGP.className = 'kpi-value ' + (gross >= 0 ? 'kv-blue' : 'kv-red'); }
    set('kpiGrossSub', 'গ্রস মার্জিন: ' + fmtPct(gross / totalSale * 100) + '%');

    // Cash Inflow KPI
    set('kpiCashIn', T(cashIn));

    // Cash Outflow KPI + net cashflow sub
    const kpiCOC = $('kpiCashOutCard');
    if (kpiCOC) kpiCOC.className = 'kpi-card ' + (netCashflow >= 0 ? 'kpi-neutral' : 'kpi-cashout');
    const kpiCO = $('kpiCashOut');
    if (kpiCO) { kpiCO.textContent = T(cashOut); kpiCO.className = 'kpi-value kv-orange'; }
    const kpiCOS = $('kpiCashOutSub');
    if (kpiCOS) {
      kpiCOS.textContent = 'নিট: ' + (netCashflow >= 0 ? '+' : '') + T(netCashflow);
      kpiCOS.style.color = netCashflow >= 0 ? '#16a34a' : '#dc2626';
    }

    /* ALERT CHECKS */
    const creditRatio = totalSale > 0 ? creditSale / totalSale : 0;
    const shrinkRatio = totalSale > 0 ? stockLoss / totalSale : 0;

    // Alert 1: Net Loss
    const al = $('ffh-alertLoss');
    if (al) al.classList.toggle('show', netProfit < 0);

    // Alert 2: Liquidity Risk (credit > 60%)
    const alq = $('ffh-alertLiquidity');
    if (alq) alq.classList.toggle('show', creditRatio > 0.60);

    // Alert 3: Cash Gap (profit > 0 but cashflow < 0)
    const acg = $('ffh-alertCashGap');
    if (acg) acg.classList.toggle('show', netCashflow < 0 && netProfit > 0);

    /* ACCORDION TOTALS (header summary values) */
    set('accRevTotal',      T(totalSale));
    set('accCogsTotal',     T(cogs));
    set('accOpexTotal',     T(opex));
    set('accOpexTotalRow',  T(opex));
    set('accFixedTotal',    T(fixedExp + zakat));
    set('accFixedTotalRow', T(fixedExp + zakat));
    // Tab 2 revenue
    set('accRevDetailTotal',    T(totalSale));
    set('accCogsDetailTotal',   T(cogs));
    // CashFlow headers
    set('cfTotalInHeader',  T(cashIn));
    set('cfTotalOutHeader', T(cashOut));
    // Stock audit headers
    set('accEstCogsTotal',      T(estCogs));
    set('accShrinkageTotal',    stockLoss > 0 ? T(stockLoss) : '—');

    /* TAB 1 P&L: ACCORDION BODY VALUES */
    // Sales analytics — declare BEFORE use
    const cashPct   = totalSale > 0 ? fmtPct(cashSale   / totalSale * 100) : 0;
    const creditPct = totalSale > 0 ? fmtPct(creditSale / totalSale * 100) : 0;
    const avgPerGaj = soldGaj > 0 ? gross / soldGaj : 0;

    // Revenue accordion body
    set('rvCashSale',   T(cashSale));
    set('rvCreditSale', T(creditSale));
    set('rvTotalSale',  T(totalSale));
    const cnEl = $('rvCreditNote');
    if (cnEl) { cnEl.textContent = creditPct + '%'; cnEl.className = 'acc-note ' + (creditRatio > 0.6 ? 'n-warning' : 'n-info'); }
    set('rvCashPct',   cashPct + '%');
    set('rvCreditPct', creditPct + '%');
    set('rvAvgPerGaj', soldGaj > 0 ? T(avgPerGaj) + '/গজ' : '—');
    set('rvSoldGaj',   soldGaj > 0 ? fmt(soldGaj) + ' গজ' : '—');

    // COGS accordion
    set('pEstProfit', T(estProfit));
    set('pCOGS',      T(cogs));
    if (stockLoss > 0) {
      set('pStockLoss', T(stockLoss));
      const row = $('stockLossRow');
      if (row) row.style.display = '';
    } else {
      const row = $('stockLossRow');
      if (row) row.style.display = 'none';
    }

    // Gross Profit net row
    const pgEl = $('pGross');
    if (pgEl) { pgEl.textContent = T(gross); pgEl.className = 'acc-net-val ' + (gross >= 0 ? 'pos' : 'neg'); }

    // OPEX accordion
    set('pSalary',     T(salary));
    set('pOwnerSalary',T(ownerSalary));
    set('pTransport',  T(transport));
    set('pVehicle',    T(vehicle));
    set('pMisc',       T(misc));

    // Fixed overhead accordion
    set('pRent',   T(f.wRent));
    set('pElec',   T(f.wElec));
    set('pWifi',   T(f.wWifi));
    set('pMath',   T(f.wMath));
    set('pToilet', T(f.wToilet));
    if (zakat > 0) {
      set('pZakat', T(zakat));
      const zrow = $('zakatRow');
      if (zrow) zrow.style.display = '';
    } else {
      const zrow = $('zakatRow');
      if (zrow) zrow.style.display = 'none';
    }

    // Net Profit final row
    const pnEl = $('pNet');
    if (pnEl) { pnEl.textContent = T(netProfit); pnEl.className = 'acc-net-val ' + (netProfit >= 0 ? 'pos' : 'neg'); }

    /* TAB 2 REVENUE: ACCORDION BODY VALUES */
    set('rvCashSale2',   T(cashSale));
    set('rvCreditSale2', T(creditSale));
    set('rvTotalSale2',  T(totalSale));
    const cn2 = $('rvCreditNote2');
    if (cn2) { cn2.textContent = creditPct + '%'; cn2.className = 'acc-note ' + (creditRatio > 0.6 ? 'n-warning' : 'n-info'); }
    set('rvCashPct2',   cashPct + '%');
    set('rvCreditPct2', creditPct + '%');
    set('rvAvgPerGaj2', soldGaj > 0 ? T(avgPerGaj) + '/গজ' : '—');
    set('rvSoldGaj2',   soldGaj > 0 ? fmt(soldGaj) + ' গজ' : '—');
    set('rvCOGS',      T(cogs));
    const rvgEl = $('rvGross');
    if (rvgEl) { rvgEl.textContent = T(gross); rvgEl.className = 'acc-row-val bold ' + (gross >= 0 ? 'v-green' : 'v-red'); }
    set('rvTotalExp', T(opex + fixedExp + zakat));
    const rvnEl = $('rvNetProfit');
    if (rvnEl) { rvnEl.textContent = T(netProfit); rvnEl.className = 'acc-net-val ' + (netProfit >= 0 ? 'pos' : 'neg'); }

    /* TAB 3 CASHFLOW: ACCORDION BODY VALUES */
    set('cfCashSale',      T(cashSale));
    set('cfOldCollection', T(oldCollection));
    set('cfTotalIn',       T(cashIn));
    set('cfCashPurchase',  T(cashPurchase));
    set('cfOldDebt',       T(oldDebt));
    set('cfOpex',          T(opex));
    set('cfFixed',         T(fixedExp));
    set('cfTotalOut',      T(cashOut));

    const cfnEl = $('cfNet');
    if (cfnEl) { cfnEl.textContent = T(netCashflow); cfnEl.className = 'acc-net-val ' + (netCashflow >= 0 ? 'pos' : 'neg'); }

    set('diffCreditSale',     '+' + T(creditSale));
    set('diffCreditPurchase', '−' + T(creditPurchase));
    set('diffOldCollection',  '+' + T(oldCollection));
    set('diffOldDebt',        '−' + T(oldDebt));

    /* TAB 4 STOCK AUDIT */
    set('auSoldGaj',   fmt(soldGaj) + ' গজ');
    set('auProfitGaj', T(profitGaj) + '/গজ');
    set('auEstProfit', T(estProfit));
    set('auEstCOGS',   T(estCogs));

    // Shrinkage alert (> 3% of total sales)
    const alShrink = $('alertShrinkage');
    if (alShrink) alShrink.style.display = (shrinkRatio > 0.03 && stockLoss > 0) ? 'flex' : 'none';

    // Stock loss
    if (stockLoss > 0) {
      set('auStockLoss', T(stockLoss));
      const lrow = $('auLossRow'), noloss = $('auNoLoss');
      if (lrow)   lrow.style.display = '';
      if (noloss) noloss.style.display = 'none';
    } else {
      const lrow = $('auLossRow'), noloss = $('auNoLoss');
      if (lrow)   lrow.style.display = 'none';
      if (noloss) noloss.style.display = '';
    }

    /* প্রকৃত COGS (অডিট) */
    const auActual  = $('auActualContent');
    const auNone    = $('auNoAudit');
    if (hasAudit) {
      if (auActual) auActual.style.display = '';
      if (auNone)   auNone.style.display   = 'none';
      set('auOpening',          T(openingStock));
      set('auPurchase',         T(auditPurchase));
      set('auClosing',          T(closingStock));
      set('auActualCOGS',       T(actualCogs));
      set('auActualCOGSHeader', T(actualCogs));

      /* COGS Variance Analysis */
      const variance = actualCogs - estCogs;
      const variancePct = estCogs > 0 ? Math.abs(variance) / estCogs : 0;
      set('auVariance',    (variance >= 0 ? '+' : '') + T(variance));
      set('auVarianceVal', (variance >= 0 ? '+' : '') + T(variance));

      // Variance box class (enterprise: ok < 5%, warn 5-10%, crit > 10%)
      const vbox = $('auVarianceBox');
      if (vbox) {
        if (variancePct < 0.05)       vbox.className = 'acc-variance-box ok';
        else if (variancePct < 0.10)  vbox.className = 'acc-variance-box warn';
        else                          vbox.className = 'acc-variance-box crit';
      }

      // Variance alert (> 10%)
      const alVar = $('alertVariance');
      if (alVar) alVar.style.display = variancePct > 0.10 ? 'flex' : 'none';

      const vn = $('auVarianceNote');
      if (vn) {
        if (variancePct < 0.05) {
          vn.style.color = '#16a34a';
          vn.textContent = 'পণ্য ব্যয় মিলছে — Stock রেকর্ড সঠিক আছে (Variance < 5%)';
        } else if (variancePct < 0.10) {
          vn.style.color = '#b45309';
          vn.textContent = variance > 0
            ? '↑ প্রকৃত COGS সামান্য বেশি — গজ হিসাব যাচাই করুন (5–10%)'
            : '↓ প্রকৃত COGS সামান্য কম — Stock রেকর্ড পরীক্ষা করুন (5–10%)';
        } else {
          vn.style.color = '#dc2626';
          vn.textContent = variance > 0
            ? 'উল্লেখযোগ্য পার্থক্য — অতিরিক্ত মাল বিক্রি বা রেকর্ডে গড়মিল (>10%)'
            : 'উল্লেখযোগ্য পার্থক্য — Stockএ মাল বেশি বা গজ হিসাব পুনরায় করুন (>10%)';
        }
      }
    } else {
      if (auActual) auActual.style.display = 'none';
      if (auNone)   auNone.style.display   = '';
      set('auActualCOGSHeader', '—');
    }

    /* RADIAL PROGRESS — reset আগে */
    function resetRadial(arcId, txtId) {
      const arc = $(arcId), txt = $(txtId);
      if (!arc || !txt) return;
      arc.style.transition = 'none';
      arc.style.strokeDashoffset = '163.4';
      txt.textContent = '0%';
    }
    resetRadial('radialProfitArc', 'radialProfitTxt');
    resetRadial('radialGrossArc',  'radialGrossTxt');
    resetRadial('radialCashArc',   'radialCashTxt');

    const profitRate = totalSale > 0 ? (netProfit   / totalSale) * 100 : 0;
    const grossRate  = totalSale > 0 ? (gross       / totalSale) * 100 : 0;
    const cashRate   = cashIn    > 0 ? (netCashflow / cashIn)    * 100 : 0;

    /* Show result content */
    $('result-empty').style.display   = 'none';
    $('result-content').style.display = 'block';
    $('saveWeekWrap').style.display   = 'flex';

    window._lastNet     = netProfit;
    window._lastGross   = gross;
    if (window.saveProfitStripData) window.saveProfitStripData(netProfit, gross);
    if (window.updateProfitStrip) window.updateProfitStrip();
    if (window.aggOvRender) window.aggOvRender();
    window._lastSales   = totalSale;
    window._lastCashIn  = cashIn;
    window._lastCashOut = cashOut;
    window._lastOpex    = opex;
    window._lastFixed   = fixedExp;
    window._lastZakat   = zakat;
    window._lastCogs    = cogs;

    /* Navigate to result page */
    goToPage('result');

    /* Page transition (~320ms) + animate */
    function animateRadial(arcId, txtId, value) {
      const arc = $(arcId), txt = $(txtId);
      if (!arc || !txt) return;
      const clipped = Math.min(100, Math.max(0, value));
      const v = Math.round(clipped);
      const circumference = 163.4;
      arc.style.transition = 'stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
      arc.style.strokeDashoffset = String(circumference - (circumference * v / 100));
      txt.textContent = fmtPct(clipped) + '%';
    }
    setTimeout(() => {
      requestAnimationFrame(() => {
        animateRadial('radialProfitArc', 'radialProfitTxt', profitRate);
        animateRadial('radialGrossArc',  'radialGrossTxt',  grossRate);
        animateRadial('radialCashArc',   'radialCashTxt',   cashRate);
      });
    }, 380);
  }
  window.calculate = calculate;

  function resetWeekly() {
    ['openingStock','closingStock','stockLoss','auditPurchase',
     'soldGaj','profitGaj',
     'cashSale','creditSale','oldCollection',
     'cashPurchase','creditPurchase','oldDebt',
     'salary','ownerSalary','transport','vehicle','misc'
    ].forEach(id => { const el=$(id); if(el) el.value=''; });
    $('cogsAuto').textContent       = '—';
    $('estProfitAuto').textContent  = '—';
    $('totalSaleAuto').textContent  = '—';
    $('result-empty').style.display    = 'block';
    $('result-content').style.display  = 'none';
    goToPage('calc');
    goStep(1);
  }

  /* সর্বশেষ সংরক্ষিত সাপ্তাহিক রিপোর্ট ফিরিয়ে আনা —
     অ্যাপ বন্ধ করে আবার খুললেও আগের ডাটা "চলে যায় না",
     নতুন হিসাব সেভ না করা পর্যন্ত শেষ সংরক্ষিত সপ্তাহের
     ফলাফলই দেখানো হয় */
  function restoreLastSavedReport() {
    let data = (typeof getChartData === 'function') ? getChartData() : [];
    if (!data || data.length === 0) return; /* কোনো ডাটা সেভ করা নেই — খালি state-ই থাকবে */

    let sorted = data.slice().sort(function(a, b) { return b.ts - a.ts; });
    let e = sorted[0];

    let netProfit   = e.net     || 0;
    let gross       = e.gross   !== undefined ? e.gross   : netProfit;
    let totalSale   = e.sales   || 0;
    let cashIn      = e.cashIn  || 0;
    let cashOut     = e.cashOut || 0;
    let netCashflow = cashIn - cashOut;
    let opex        = e.opex    || 0;
    let fixedExp    = e.fixed   || 0;
    let cogs        = e.cogs    || 0;

    let kpiPC = $('kpiProfitCard');
    if (kpiPC) kpiPC.className = 'kpi-card ' + (netProfit >= 0 ? 'kpi-profit' : 'kpi-loss');
    let kpiNP = $('kpiNetProfit');
    if (kpiNP) {
      kpiNP.textContent = T(netProfit);
      kpiNP.className   = 'kpi-value ' + (netProfit >= 0 ? 'kv-green' : 'kv-red');
    }
    if (totalSale > 0) set('kpiProfitSub', 'নিট মার্জিন: ' + fmtPct(netProfit / totalSale * 100) + '%');

    let kpiGC = $('kpiGrossCard');
    if (kpiGC) kpiGC.className = 'kpi-card ' + (gross >= 0 ? 'kpi-neutral' : 'kpi-loss');
    let kpiGP = $('kpiGrossProfit');
    if (kpiGP) { kpiGP.textContent = T(gross); kpiGP.className = 'kpi-value ' + (gross >= 0 ? 'kv-blue' : 'kv-red'); }
    if (totalSale > 0) set('kpiGrossSub', 'গ্রস মার্জিন: ' + fmtPct(gross / totalSale * 100) + '%');

    set('kpiCashIn', T(cashIn));

    let kpiCOC = $('kpiCashOutCard');
    if (kpiCOC) kpiCOC.className = 'kpi-card ' + (netCashflow >= 0 ? 'kpi-neutral' : 'kpi-cashout');
    let kpiCO = $('kpiCashOut');
    if (kpiCO) { kpiCO.textContent = T(cashOut); kpiCO.className = 'kpi-value kv-orange'; }
    let kpiCOS = $('kpiCashOutSub');
    if (kpiCOS) {
      kpiCOS.textContent = 'নিট: ' + (netCashflow >= 0 ? '+' : '') + T(netCashflow);
      kpiCOS.style.color = netCashflow >= 0 ? '#16a34a' : '#dc2626';
    }

    /* runtime ভ্যারিয়েবল আপডেট, যাতে অন্য ফিচার (প্রফিট স্ট্রিপ, অ্যাগ্রিগেট রিপোর্ট) ঠিকভাবে কাজ করে */
    window._lastNet     = netProfit;
    window._lastGross   = gross;
    window._lastSales   = totalSale;
    window._lastCashIn  = cashIn;
    window._lastCashOut = cashOut;
    window._lastOpex    = opex;
    window._lastFixed   = fixedExp;
    window._lastCogs    = cogs;

    /* চারটা ট্যাবের accordion টোটাল — সেভ করা সামারি ডাটা থেকে যতটা সম্ভব পূরণ,
       যাতে সংরক্ষিত রিপোর্ট খুললে টেবিল একদম ফাঁকা না থাকে।
       (লাইন-আইটেম ব্রেকডাউন যেমন নগদ/বাকি বিক্রয়ের আলাদা অঙ্ক chart_data-এ সংরক্ষিত থাকে না,
        তাই সেসব সারি "—"-ই থাকবে; কিন্তু টোটাল/হেডার লাইনগুলো ঠিকভাবে দেখাবে) */

    /* Tab 1: P&L বিবরণী */
    set('accRevTotal',      T(totalSale));
    set('accCogsTotal',     T(cogs));
    set('accOpexTotal',     T(opex));
    set('accOpexTotalRow',  T(opex));
    set('accFixedTotal',    T(fixedExp));
    set('accFixedTotalRow', T(fixedExp));
    set('pCOGS',  T(cogs));
    set('pGross', T(gross));
    set('pNet',   T(netProfit));

    /* Tab 2: রাজস্ব বিশ্লেষণ */
    set('accRevDetailTotal',  T(totalSale));
    set('rvTotalSale2',       T(totalSale));
    set('accCogsDetailTotal', T(cogs));
    set('rvCOGS',             T(cogs));
    set('rvGross',            T(gross));
    set('rvTotalExp',         T(opex + fixedExp));
    set('rvNetProfit',        T(netProfit));

    /* Tab 3: ক্যাশফ্লো */
    set('cfTotalInHeader',  T(cashIn));
    set('cfTotalIn',        T(cashIn));
    set('cfTotalOutHeader', T(cashOut));
    set('cfOpex',           T(opex));
    set('cfFixed',          T(fixedExp));
    set('cfTotalOut',       T(cashOut));
    set('cfNet',            (netCashflow >= 0 ? '+' : '') + T(netCashflow));

    /* Tab 4: Stock অডিট */
    set('accEstCogsTotal', T(cogs));
    set('auEstCOGS',       T(cogs));

    let re = $('result-empty'), rc = $('result-content'), sw = $('saveWeekWrap');
    if (re) re.style.display = 'none';
    if (rc) rc.style.display = 'block';
    if (sw) sw.style.display = 'flex';

    /* সর্বশেষ কোন সপ্তাহের ডাটা দেখানো হচ্ছে তার একটা ছোট নোট, যদি এলিমেন্ট থাকে */
    let noteEl = $('kpiRestoredNote');
    if (noteEl) noteEl.textContent = 'সর্বশেষ সংরক্ষিত: ' + (e.label || '');
  }
  document.addEventListener('DOMContentLoaded', restoreLastSavedReport);
  window.restoreLastSavedReport = restoreLastSavedReport;

  /* CHART ENGINE
  */
  function getChartData()    { try { return JSON.parse(localStorage.getItem('chart_data') || '[]'); } catch (e) { console.error('chart_data parse error:', e); return []; } }
  function saveChartData(d)  { localStorage.setItem('chart_data', JSON.stringify(d)); if (typeof _fbAutoSync === 'function') _fbAutoSync(); }

  function getWeekLabel() {
    const now = new Date();
    const wn  = getWeekNumber(now);
    return BN_MONTHS[now.getMonth()] + ' ' + toBN(now.getFullYear()) + ' সপ্তা-' + toBN(wn);
  }
  function getWeekNumber(d) {
    const s   = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = s.getUTCDay() || 7;
    s.setUTCDate(s.getUTCDate() + 4 - day);
    const y   = new Date(Date.UTC(s.getUTCFullYear(), 0, 1));
    return Math.ceil((((s - y) / 86400000) + 1) / 7);
  }

  function saveToChart() {
    const net = window._lastNet;
    if (net === undefined) {
      window.showToast('আগে হিসাব করুন', 'হিসাব করুন বাটন চাপার পর এটি ব্যবহার করুন।');
      return;
    }
    try {
      const now   = new Date();
      const data  = getChartData();
      const entry = {
        ts:      now.getTime(),
        year:    now.getFullYear(),
        month:   now.getMonth(),
        week:    getWeekNumber(now),
        label:   getWeekLabel(),
        net:     Math.round(net),
        gross:   Math.round(window._lastGross   || 0),
        sales:   Math.round(window._lastSales   || 0),
        cashIn:  Math.round(window._lastCashIn  || 0),
        cashOut: Math.round(window._lastCashOut || 0),
        opex:    Math.round(window._lastOpex    || 0),
        fixed:   Math.round(window._lastFixed   || 0),
        cogs:    Math.round(window._lastCogs    || 0),
      };
      const idx = data.findIndex(e => e.year === entry.year && e.week === entry.week);
      if (idx >= 0) { data[idx] = entry; } else { data.push(entry); }
      if (data.length > 26) data.shift();
      saveChartData(data);

      /* badge */
      const badge = $('savedBadge');
      if (badge) {
        $('savedBadgeText').textContent = entry.label + ' — ' + T(net) + ' সংরক্ষিত';
        badge.classList.add('show');
        setTimeout(() => badge.classList.remove('show'), 3000);
      }

      /* Toast Notification (enterprise success) */
      window.showToast('সফলভাবে সংরক্ষিত', entry.label + ' — ' + T(net));

      /* Button confirmation */
      const btn = document.querySelector('#saveWeekWrap .btn-save');
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = 'গ্রাফে যোগ হয়েছে';
        btn.style.background = 'var(--teal)';
        btn.disabled = true;
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.style.background = '';
          btn.disabled = false;
        }, 2500);
      }

      renderCharts();
      renderAggReportChart();
      if (typeof ffhRenderCashflowPie === 'function') ffhRenderCashflowPie();
      if (typeof aggOvRender === 'function') aggOvRender();
    } catch(e) {
      console.error('saveToChart error:', e);
      window.showToast('সংরক্ষণে সমস্যা', e.message);
    }
  }
  window.saveToChart = saveToChart;

  /* ENTERPRISE: ACCORDION TOGGLE
  */
  function toggleAcc(id) {
    const card = $(id);
    if (!card) return;
    card.classList.toggle('open');
    // Update sub-text
    const subEl = card.querySelector('.acc-title-sub');
    const isOpen = card.classList.contains('open');
    if (subEl) {
      const baseText = subEl.dataset.base || subEl.textContent.replace(/^[▼▲]\s*/, '');
      subEl.dataset.base = baseText;
      subEl.textContent  = (isOpen ? '▲ ' : '▼ ') + baseText;
    }
    // Body visibility
    const body = card.querySelector('.acc-body');
    if (body) body.style.display = isOpen ? 'block' : 'none';
  }
  window.toggleAcc = toggleAcc;

  /* ENTERPRISE: ALERT DISMISS
  */
  function dismissAlert(id) {
    const el = $(id);
    if (el) el.classList.remove('show');
  }
  window.dismissAlert = dismissAlert;

  /* ENTERPRISE: TOAST NOTIFICATION
  */
  /* showToast এখন js/shared-state.js-এ — সব ফাইল থেকে window.showToast(title, sub) দিয়ে ব্যবহারযোগ্য */

  

  function deleteEntry(ts) {
    const data = getChartData().filter(e => e.ts !== ts);
    saveChartData(data);
    renderCharts();
    renderAggReportChart();
  }
  window.deleteEntry = deleteEntry;

  function clearChartData(type) {
    if (confirm('সব চার্ট ডেটা মুছে ফেলবেন?')) {
      saveChartData([]);
      renderCharts();
      renderAggReportChart();
    }
  }

  function switchChart(type) {
    document.getElementById('panel6m').classList.toggle('active', type === '6m');
    document.getElementById('panel1y').classList.toggle('active', type === '1y');
    document.getElementById('tabSix').classList.toggle('active',  type === '6m');
    document.getElementById('tabYear').classList.toggle('active', type === '1y');
    if (type === '6m' && _lwChart6m) {
      setTimeout(() => {
        const el = $('lwChartSixm');
        if (el) _lwChart6m.applyOptions({ width: el.clientWidth });
      }, 50);
    }
  }

  function renderCharts() {
    const data = getChartData();
    const now  = new Date();
    render6mChart(data, now);
    render1yChart(data, now);
  }
  window.renderCharts = renderCharts;

  /* DASHBOARD RENDER */
  /* সাপ্তাহিক গ্রস + নিট প্রফিট বার চার্ট */
  function renderRevenueBarChart() {
    let data    = getChartData();
    let titleEl = document.getElementById('revBarTitle');
    let cardEl  = document.getElementById('revBarCard');
    let svg     = document.getElementById('svgRevBar');
    let lblEl   = document.getElementById('revBarXLabels');

    if (!data || data.length === 0) {
      if (cardEl)  cardEl.style.display  = 'none';
      return;
    }

    if (cardEl) cardEl.style.display = 'block';
    if (titleEl) titleEl.innerHTML =
        '<span style="color:oklch(55% 0.14 220);">▌</span> গ্রস &nbsp;'
      + '<span style="color:oklch(55% 0.18 160);">▌</span> নিট';
    if (!svg || !lblEl) return;

    let sorted = data.slice().sort(function(a, b) { return a.ts - b.ts; });

    /* প্রতিটি গ্রুপে ২টি বার: Gross (বাম) + Net (ডান) */
    let NBW   = 15;   /* একটি বারের প্রস্থ */
    let BPAD  = 3;    /* দুই বারের মধ্যে ফাঁক */
    let GW    = NBW * 2 + BPAD;  /* একটি গ্রুপের প্রস্থ */
    let GAP   = 10;   /* গ্রুপের মধ্যে ফাঁক */
    let HALF  = 90;
    let VLBL  = 18;
    let XLBL  = 16;
    let HT    = HALF * 2 + VLBL * 2 + XLBL;
    let W     = sorted.length * (GW + GAP) - GAP;
    let ZERO_Y = VLBL + HALF;

    /* absMax — gross এবং net দুটো মিলিয়ে */
    let absMax = 0;
    for (let i = 0; i < sorted.length; i++) {
      let ag = Math.abs(sorted[i].gross || sorted[i].net || 0);
      let an = Math.abs(sorted[i].net   || 0);
      if (ag > absMax) absMax = ag;
      if (an > absMax) absMax = an;
    }
    if (absMax === 0) absMax = 1;

    let html = '<defs>'
      /* Gross — নীলাভ (উপরে) */
      + '<linearGradient id="grossGradUp" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="oklch(62% 0.14 220)"/>'
      + '<stop offset="100%" stop-color="oklch(45% 0.11 220)"/>'
      + '</linearGradient>'
      /* Gross — লস */
      + '<linearGradient id="grossGradDn" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="oklch(68% 0.10 220)"/>'
      + '<stop offset="100%" stop-color="oklch(50% 0.08 220)"/>'
      + '</linearGradient>'
      /* Net profit — সবুজ */
      + '<linearGradient id="netGradUp" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="oklch(60% 0.18 160)"/>'
      + '<stop offset="100%" stop-color="oklch(40% 0.14 160)"/>'
      + '</linearGradient>'
      /* Net loss — লাল */
      + '<linearGradient id="netGradDn" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="oklch(55% 0.20 22)"/>'
      + '<stop offset="100%" stop-color="oklch(38% 0.16 22)"/>'
      + '</linearGradient>'
      + '</defs>';

    /* শূন্য রেখা */
    html += '<line x1="0" y1="' + ZERO_Y + '" x2="' + W
          + '" y2="' + ZERO_Y + '" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round"/>';

    /* helper: rounded bar path */
    /* barPath ও fmtV এখন js/util-esc.js-এ শেয়ার্ড (window.barPath / window.fmtV) */
    let labHTML = '';

    for (let j = 0; j < sorted.length; j++) {
      let e    = sorted[j];
      let gx   = j * (GW + GAP);
      let gross = (e.gross !== undefined) ? e.gross : e.net; /* পুরনো entry-তে gross নেই */
      let net   = e.net || 0;

      /* Gross বার (বাম) */
      let gbh    = Math.max(4, Math.round((Math.abs(gross) / absMax) * HALF));
      let gIsUp  = gross >= 0;
      let gby    = gIsUp ? (ZERO_Y - gbh) : ZERO_Y;
      let gFill  = gIsUp ? 'url(#grossGradUp)' : 'url(#grossGradDn)';
      html += '<path d="' + barPath(gx, gby, NBW, gbh, gIsUp) + '" fill="' + gFill + '" opacity="0.85"/>';

      /* Gross লেবেল */
      let gLblY = gIsUp ? (gby - 4) : (gby + gbh + 11);
      let gClr  = 'oklch(48% 0.12 220)';
      if (gross !== 0) html += '<text x="' + (gx + NBW/2) + '" y="' + gLblY
        + '" text-anchor="middle" font-size="8" font-family="monospace" fill="' + gClr + '" font-weight="700">'
        + fmtV(gross) + '</text>';

      /* Net বার (ডান) */
      let nbh   = Math.max(4, Math.round((Math.abs(net) / absMax) * HALF));
      let nIsUp = net >= 0;
      let nby   = nIsUp ? (ZERO_Y - nbh) : ZERO_Y;
      let nFill = nIsUp ? 'url(#netGradUp)' : 'url(#netGradDn)';
      let nx    = gx + NBW + BPAD;
      html += '<path d="' + barPath(nx, nby, NBW, nbh, nIsUp) + '" fill="' + nFill + '"/>';

      /* Net লেবেল */
      let nLblY = nIsUp ? (nby - 4) : (nby + nbh + 11);
      let nClr  = nIsUp ? 'oklch(45% 0.16 160)' : 'oklch(50% 0.20 22)';
      if (net !== 0) html += '<text x="' + (nx + NBW/2) + '" y="' + nLblY
        + '" text-anchor="middle" font-size="8" font-family="monospace" fill="' + nClr + '" font-weight="700">'
        + fmtV(net) + '</text>';

      /* X লেবেল */
      let lbl = (e.label || '').replace(/^.*সপ্তা-/, 'স-');
      labHTML += '<span style="width:' + (GW + GAP) + 'px;">' + lbl + '</span>';
    }

    svg.setAttribute('width',   W);
    svg.setAttribute('height',  HT);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + HT);
    svg.innerHTML = html;
    lblEl.innerHTML = labHTML;

    let scroll = document.getElementById('revBarScroll');
    if (scroll) setTimeout(function() { scroll.scrollLeft = scroll.scrollWidth; }, 50);
  }

  /* রিপোর্ট টেবিল */
  function renderReportTable(data) {
    let tbody   = document.getElementById('reportTableBody');
    let tGross  = document.getElementById('rtTotalGross');
    let tNet    = document.getElementById('rtTotalNet');
    let tIn     = document.getElementById('rtTotalIn');
    let tOut    = document.getElementById('rtTotalOut');
    if (!tbody) return;

    /* নতুন → পুরনো ক্রমে */
    let sorted = data.slice().sort(function(a, b) { return b.ts - a.ts; });

    let sumGross = 0, sumNet = 0, sumIn = 0, sumOut = 0;

    function fmt(v) {
      if (v === undefined || v === null) return '—';
      let abs = Math.abs(v);
      let s = abs >= 100000 ? (abs/100000).toFixed(1)+'ল'
            : abs >= 1000    ? (abs/1000).toFixed(1)+'হা'
            : abs.toString();
      return (v < 0 ? '−' : '') + s + '৳';
    }

    let rows = '';
    sorted.forEach(function(e) {
      let gross   = e.gross  !== undefined ? e.gross  : e.net;
      let net     = e.net    || 0;
      let cashIn  = e.cashIn || 0;
      let cashOut = e.cashOut|| 0;

      sumGross += gross;
      sumNet   += net;
      sumIn    += cashIn;
      sumOut   += cashOut;

      let netCls = net >= 0 ? 'rt-net-pos' : 'rt-net-neg';

      rows += '<tr>'
        + '<td>' + (e.label || '—') + '</td>'
        + '<td class="rt-gross">' + fmt(gross)   + '</td>'
        + '<td class="' + netCls + '">' + fmt(net) + '</td>'
        + '<td class="rt-in">'    + fmt(cashIn)  + '</td>'
        + '<td class="rt-out">'   + fmt(cashOut) + '</td>'
        + '</tr>';
    });
    tbody.innerHTML = rows;

    /* Footer totals */
    function setFoot(el, v, cls) {
      if (!el) return;
      el.textContent = fmt(v);
      el.className = cls || '';
    }
    setFoot(tGross, sumGross, 'rt-gross');
    setFoot(tNet,   sumNet,   sumNet >= 0 ? 'rt-net-pos' : 'rt-net-neg');
    setFoot(tIn,    sumIn,    'rt-in');
    setFoot(tOut,   sumOut,   'rt-out');
  }

  /* ক্যাশফ্লো পাই চার্ট */
  function renderCashflowPie() {
    let data     = getChartData();
    let cardEl   = document.getElementById('pieChartCard');
    let svg      = document.getElementById('svgPie');
    let legendEl = document.getElementById('pieLegend');
    let netEl    = document.getElementById('pieNetCash');
    let lblEl    = document.getElementById('pieWeekLabel');

    if (!data || data.length === 0) {
      if (cardEl)  cardEl.style.display  = 'none';
      return;
    }

    /* সর্বশেষ entry */
    let sorted = data.slice().sort(function(a, b) { return b.ts - a.ts; });
    let e = sorted[0];

    /* cashIn / cashOut না থাকলে (পুরনো entry) hide করো */
    if (!e.cashIn && !e.cashOut && !e.cogs) {
      if (cardEl)  cardEl.style.display  = 'none';
      return;
    }

    if (cardEl)  cardEl.style.display  = 'block';
    if (!svg || !legendEl) return;

    if (lblEl) lblEl.textContent = e.label || '—';

    let cashIn  = e.cashIn  || 0;
    let cashOut = e.cashOut || 0;
    let cogs    = e.cogs    || 0;
    let opex    = e.opex    || 0;
    let fixed   = e.fixed   || 0;
    let netCF   = cashIn - cashOut;

    /* --- পাই সেগমেন্ট ডেটা (cashOut breakdown + cashIn) --- */
    let total = cashIn + cashOut;
    if (total === 0) total = 1;

    let segments = [
      { label: 'নগদ আয়',      val: cashIn,  color: 'oklch(55% 0.17 160)',  clr2: 'oklch(40% 0.14 160)'  },
      { label: 'পণ্য ক্রয়', val: cogs,    color: 'oklch(60% 0.18 22)',   clr2: 'oklch(45% 0.16 22)'   },
      { label: 'Maintenance Costs', val: opex,    color: 'oklch(70% 0.16 60)',   clr2: 'oklch(55% 0.14 60)'   },
      { label: 'Fixed Costs',   val: fixed,   color: 'oklch(62% 0.16 280)',  clr2: 'oklch(48% 0.14 280)'  },
    ].filter(function(s) { return s.val > 0; });

    if (segments.length === 0) {
      if (cardEl)  cardEl.style.display  = 'none';
      return;
    }

    /* --- SVG পাই আঁকা --- */
    let cx = 65, cy = 65, R = 52, iR = 30; /* donut */
    let grandTotal = segments.reduce(function(s, x) { return s + x.val; }, 0);
    if (grandTotal === 0) grandTotal = 1;

    let angle = -Math.PI / 2; /* উপর থেকে শুরু */
    let paths = '';
    let gradDefs = '<defs>';

    segments.forEach(function(seg, idx) {
      let sweep  = (seg.val / grandTotal) * 2 * Math.PI;
      let startA = angle;
      let endA   = angle + sweep;

      let x1o = cx + R  * Math.cos(startA), y1o = cy + R  * Math.sin(startA);
      let x2o = cx + R  * Math.cos(endA),   y2o = cy + R  * Math.sin(endA);
      let x1i = cx + iR * Math.cos(endA),   y1i = cy + iR * Math.sin(endA);
      let x2i = cx + iR * Math.cos(startA), y2i = cy + iR * Math.sin(startA);
      let large = sweep > Math.PI ? 1 : 0;

      let gid = 'pg' + idx;
      gradDefs += '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0%" stop-color="' + seg.color + '"/>'
        + '<stop offset="100%" stop-color="' + seg.clr2 + '"/>'
        + '</linearGradient>';

      let d = 'M' + x1o.toFixed(2) + ',' + y1o.toFixed(2)
            + ' A' + R + ',' + R + ' 0 ' + large + ',1 ' + x2o.toFixed(2) + ',' + y2o.toFixed(2)
            + ' L' + x1i.toFixed(2) + ',' + y1i.toFixed(2)
            + ' A' + iR + ',' + iR + ' 0 ' + large + ',0 ' + x2i.toFixed(2) + ',' + y2i.toFixed(2)
            + 'Z';

      paths += '<path d="' + d + '" fill="url(#' + gid + ')" stroke="var(--surface)" stroke-width="1.5"/>';
      angle = endA;
    });
    gradDefs += '</defs>';

    /* মাঝখানে মোট */
    let centerTxt = cashIn >= 100000 ? (cashIn/100000).toFixed(1)+'ল' : cashIn >= 1000 ? (cashIn/1000).toFixed(1)+'হা' : cashIn;
    paths += '<text x="' + cx + '" y="' + (cy - 5) + '" text-anchor="middle" font-size="10" font-family="monospace" fill="var(--text3)" font-weight="600">আয়</text>';
    paths += '<text x="' + cx + '" y="' + (cy + 9) + '" text-anchor="middle" font-size="12" font-family="monospace" fill="var(--text)" font-weight="900">' + centerTxt + '৳</text>';

    svg.innerHTML = gradDefs + paths;

    /* --- লিজেন্ড --- */
    let legHTML = '';
    segments.forEach(function(seg) {
      let pct = ((seg.val / grandTotal) * 100).toFixed(1);
      let valFmt = seg.val >= 100000 ? (seg.val/100000).toFixed(1)+'ল'
                 : seg.val >= 1000    ? (seg.val/1000).toFixed(1)+'হা'
                 : seg.val;
      legHTML += '<div style="display:flex;align-items:center;gap:7px;">'
        + '<span style="flex-shrink:0;width:9px;height:9px;border-radius:50%;background:' + seg.color + ';"></span>'
        + '<span style="flex:1;font-size:11px;color:var(--text2);font-weight:600;">' + seg.label + '</span>'
        + '<span style="font-family:var(--mono);font-size:11px;font-weight:800;color:var(--text);">'
        + pct + '%</span>'
        + '<span style="font-family:var(--mono);font-size:10px;color:var(--text3);min-width:42px;text-align:right;">'
        + valFmt + '৳</span>'
        + '</div>';
    });
    legendEl.innerHTML = legHTML;

    /* নিট ক্যাশফ্লো */
    if (netEl) {
      let nFmt = (netCF >= 0 ? '+' : '−') + (Math.abs(netCF) >= 100000 ? (Math.abs(netCF)/100000).toFixed(1)+'ল' : Math.abs(netCF) >= 1000 ? (Math.abs(netCF)/1000).toFixed(1)+'হা' : Math.abs(netCF)) + '৳';
      netEl.textContent = nFmt;
      netEl.style.color = netCF >= 0 ? 'var(--green)' : 'var(--red)';
    }
  }
  window.renderCashflowPie = renderCashflowPie;

  function renderAggReportChart() {
    let data = getChartData();
    let empty = document.getElementById('aggChartEmpty');
    let dataEl = document.getElementById('aggChartData');
    let histTitle  = document.getElementById('aggChartHistoryTitle');
    if (!empty || !dataEl) return;

    if (!data || data.length === 0) {
      empty.style.display = 'flex';
      dataEl.style.display = 'none';
      if (histTitle) histTitle.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    dataEl.style.display = 'block';
    if (histTitle) histTitle.style.display = 'block';

    let netCFEl = document.getElementById('aggChartNetCF');
    let totEl   = document.getElementById('aggChartTotalEntries');
    let latEl   = document.getElementById('aggChartLatestLabel');
    if (netCFEl || totEl || latEl) {
      let sumNetCF = 0;
      data.forEach(function(e) { sumNetCF += (e.cashIn || 0) - (e.cashOut || 0); });
      let sorted2 = data.slice().sort(function(a, b) { return b.ts - a.ts; });
      if (netCFEl) {
        let nf = Math.abs(sumNetCF) >= 100000 ? (Math.abs(sumNetCF)/100000).toFixed(1)+'ল'
               : Math.abs(sumNetCF) >= 1000    ? (Math.abs(sumNetCF)/1000).toFixed(1)+'হা'
               : Math.abs(sumNetCF);
        netCFEl.textContent = (sumNetCF >= 0 ? '+' : '−') + nf + '৳';
        netCFEl.className = 'dash-card-val ' + (sumNetCF > 0 ? 'pos' : sumNetCF < 0 ? 'neg' : 'neu');
      }
      if (totEl) totEl.textContent = data.length;
      if (latEl) latEl.textContent = (sorted2[0] && sorted2[0].label) || '—';
    }

    renderRevenueBarChart();
    renderCashflowPie();
    renderReportTable(data);
  }
  window.renderAggReportChart = renderAggReportChart;

  /* 6-MONTH CANDLESTICK (LightweightCharts v5) */
  let _lwChart6m = null;
  let _lwSeries6m = null;

  function render6mChart(data, now) {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 6);

    const recent = data
      .filter(e => new Date(e.ts) >= cutoff)
      .sort((a, b) => a.ts - b.ts);

    const emptyEl = $('sixmEmpty');
    const lwEl    = $('lwChartSixm');
    if (!emptyEl || !lwEl) return;

    if (!recent.length) {
      emptyEl.style.display = 'flex';
      lwEl.style.display    = 'none';
      set('sixmLatestVal',   '৳ 0');
      set('sixmLatestWeek',  '—');
      set('sixmChange',      '—');
      set('sixmTotalProfit', '—');
      set('sixmMax',         '—');
      set('sixmMin',         '—');
      $('sixmChange').className    = 'chart-change zero';
      $('sixmLatestVal').className = 'chart-live-val zero';
      if (_lwChart6m) { _lwChart6m.remove(); _lwChart6m = null; _lwSeries6m = null; }
      return;
    }

    emptyEl.style.display = 'none';
    lwEl.style.display    = 'block';

    /* chart rebuild */
    if (_lwChart6m) { _lwChart6m.remove(); _lwChart6m = null; _lwSeries6m = null; }

    if (typeof LightweightCharts === 'undefined') {
      lwEl.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">চার্ট লোড হচ্ছে, একটু পরে আবার চেষ্টা করুন…</div>';
      return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bg     = isDark ? '#1e1e2e' : '#ffffff';
    const txt    = isDark ? '#cdd6f4' : '#374151';
    const grid   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    _lwChart6m = LightweightCharts.createChart(lwEl, {
      width:  lwEl.clientWidth || 340,
      height: 220,
      layout: { background: { type: 'solid', color: bg }, textColor: txt, fontSize: 10 },
      grid:   { vertLines: { color: grid }, horzLines: { color: grid } },
      timeScale: { borderVisible: false, timeVisible: false },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Magnet },
      handleScroll: false,
      handleScale:  false,
    });

    _lwSeries6m = _lwChart6m.addSeries(LightweightCharts.CandlestickSeries, {
      upColor:       '#26a69a',
      downColor:     '#ef5350',
      borderVisible: false,
      wickUpColor:   '#26a69a',
      wickDownColor: '#ef5350',
    });

    /* OHLC data বানানো — প্রতিটা সপ্তাহ একটা candle */
    const ohlc = recent.map((d, i) => {
      const open  = i === 0 ? Math.round(d.net * 0.9) : recent[i - 1].net;
      const close = d.net;
      const top   = Math.max(open, close);
      const bot   = Math.min(open, close);
      const wick  = Math.max(Math.abs(close - open) * 0.3, Math.abs(d.net) * 0.06, 1);
      /* LightweightCharts এ time = 'YYYY-MM-DD' string লাগে */
      const date  = new Date(d.ts);
      const time  = date.toISOString().slice(0, 10);
      return { time, open, high: top + wick, low: bot - wick, close };
    });

    /* duplicate date হলে সরাও */
    const seen = new Set();
    const unique = ohlc.filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; });

    _lwSeries6m.setData(unique);
    _lwChart6m.timeScale().fitContent();

    /* tooltip — সর্বশেষ সপ্তাহের label দেখানো */
    _lwChart6m.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData) return;
      const bar = param.seriesData.get(_lwSeries6m);
      if (!bar) return;
      const idx = recent.findIndex(d => d.ts && new Date(d.ts).toISOString().slice(0,10) === param.time);
      const entry = idx >= 0 ? recent[idx] : null;
      if (entry) set('sixmLatestWeek', entry.label);
      const lvEl = $('sixmLatestVal');
      lvEl.textContent = (bar.close >= 0 ? '+' : '−') + Math.abs(bar.close).toLocaleString() + '৳';
      lvEl.className   = 'chart-live-val ' + (bar.close >= 0 ? 'pos' : 'neg');
    });

    /* Stats */
    const vals  = recent.map(d => d.net);
    const total = vals.reduce((a, b) => a + b, 0);
    const maxV  = Math.max(...vals);
    const minV  = Math.min(...vals);
    const last  = recent[recent.length - 1];
    const prev  = recent[recent.length - 2];

    const lvEl = $('sixmLatestVal');
    lvEl.textContent = (last.net >= 0 ? '+' : '−') + Math.abs(last.net).toLocaleString() + '৳';
    lvEl.className   = 'chart-live-val ' + (last.net >= 0 ? 'pos' : 'neg');
    set('sixmLatestWeek', last.label);

    if (prev) {
      const diff = last.net - prev.net;
      const chEl = $('sixmChange');
      chEl.textContent = (diff >= 0 ? '▲ ' : '▼ ') + fmtK(Math.abs(diff)) + '৳';
      chEl.className   = 'chart-change ' + (diff >= 0 ? 'pos' : 'neg');
    }

    const tpEl = $('sixmTotalProfit');
    tpEl.textContent = fmtK(total) + '৳';
    tpEl.className   = 'cs-val ' + (total >= 0 ? 'pos' : 'neg');
    set('sixmMax', fmtK(maxV) + '৳');
    set('sixmMin', fmtK(minV) + '৳');
    $('sixmXLabels').innerHTML = '';

    renderEntryList(recent);
  }

  function renderEntryList(data) {
    const container = $('sixmEntries');
    const list      = $('sixmList');
    if (!data.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    list.innerHTML = [...data].reverse().map(d => `
      <div class="entry-row">
        <div class="er-left">
          <span class="er-label">${d.label}</span>
          <span class="er-sub">বিক্রি: ${d.sales ? d.sales.toLocaleString() + '৳' : '—'}</span>
        </div>
        <div class="er-right">
          <span class="er-val ${d.net >= 0 ? 'cg' : 'cr'}">${d.net >= 0 ? '+' : '−'}${Math.abs(d.net).toLocaleString()}৳</span>
          <span class="er-del" onclick="deleteEntry(${d.ts})">×</span>
        </div>
      </div>
    `).join('');
  }

  /* 1-YEAR BAR CHART */
  function render1yChart(data, now) {
    if (!$('yearEmpty') || !$('yearBarsWrap')) return;
    if (!data.length) {
      $('yearEmpty').style.display     = 'flex';
      $('yearBarsWrap').style.display  = 'none';
      set('yearTotal',      '—');
      set('yearBestMonth',  '—');
      set('yearWorstMonth', '—');
      set('yearLatestVal',  '৳ 0');
      set('yearLatestMonth','—');
      set('yearChange',     '—');
      return;
    }
    $('yearEmpty').style.display    = 'none';
    $('yearBarsWrap').style.display = 'block';

    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), net: 0, label: BN_MONTHS[d.getMonth()] });
    }
    data.forEach(e => {
      const m = months.find(m => m.year === e.year && m.month === e.month);
      if (m) m.net += e.net;
    });

    const vals   = months.map(m => m.net);
    const total  = vals.reduce((a,b) => a+b, 0);
    const mx     = Math.max(...vals, 1);
    const mn     = Math.min(...vals, -1);
    const absMax = Math.max(Math.abs(mx), Math.abs(mn), 1);

    const totalEl = $('yearTotal');
    totalEl.textContent = fmtK(total) + '৳';
    totalEl.className   = 'cs-val ' + (total >= 0 ? 'pos' : 'neg');

    const bmIdx = vals.indexOf(Math.max(...vals));
    const wmIdx = vals.indexOf(Math.min(...vals));

    const bmEl = $('yearBestMonth');
    bmEl.textContent = months[bmIdx].label + ' ' + fmtK(vals[bmIdx]) + '৳';
    bmEl.className   = 'cs-val pos';

    const wmEl = $('yearWorstMonth');
    wmEl.textContent = months[wmIdx].label + ' ' + fmtK(vals[wmIdx]) + '৳';
    wmEl.className   = 'cs-val ' + (vals[wmIdx] < 0 ? 'neg' : 'neu');

    const curMonth  = months[months.length - 1];
    const lvEl      = $('yearLatestVal');
    lvEl.textContent = (curMonth.net >= 0 ? '+' : '−') + Math.abs(curMonth.net).toLocaleString() + '৳';
    lvEl.className   = 'chart-live-val ' + (curMonth.net >= 0 ? 'pos' : 'neg');
    set('yearLatestMonth', curMonth.label + ' ' + toBN(curMonth.year));

    const prevMonth = months[months.length - 2];
    const chEl = $('yearChange');
    if (prevMonth) {
      const diff = curMonth.net - prevMonth.net;
      chEl.textContent = (diff >= 0 ? '▲ ' : '▼ ') + fmtK(Math.abs(diff)) + '৳';
      chEl.className   = 'chart-change ' + (diff >= 0 ? 'pos' : 'neg');
    }

    const barsEl = $('monthBars');
    barsEl.innerHTML = months.map((m,i) => {
      const pct = (Math.abs(m.net) / absMax) * 90;
      const cls = m.net > 0 ? 'profit' : m.net < 0 ? 'loss' : 'zero';
      return `
        <div class="month-bar-wrap" title="${m.label}: ${m.net.toLocaleString()}৳">
          <div class="month-bar ${cls}" style="height:${pct}%"></div>
          <span class="month-bar-label">${m.label}</span>
          ${m.net !== 0 ? `<span class="month-bar-val ${m.net >= 0 ? 'pos' : 'neg'}">${fmtK(m.net)}</span>` : ''}
        </div>`;
    }).join('');
  }

  /* INIT */
  goToPage('calc');
  renderCharts();
  renderAggReportChart();

  /* HASH DEEP LINK (#quickaction / #report) */
  (function () {
    const hash = location.hash.toLowerCase();
    if (hash === '#quickaction') { goToPage('calc'); if (typeof autoFillWeeklyCreditFields === 'function') autoFillWeeklyCreditFields(); }
    else if (hash === '#report')      goToPage('result');
  })();

  /* SPLASH DISMISS */
  (function () {
    const splash = document.getElementById('splash');
    if (!splash) return;
    function hideSplash() {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 450);
    }
    if (document.readyState === 'complete') {
      setTimeout(hideSplash, 2200);
    } else {
      window.addEventListener('load', () => setTimeout(hideSplash, 2200));
    }
  })();

  /* RESULT CARDS → DRAWER */
  const RD_TITLES = {
    1: 'P&L বিবরণী',
    2: 'রাজস্ব বিশ্লেষণ',
    3: 'ক্যাশফ্লো',
    4: 'Stock অডিট'
  };

  function switchResultCard(n) {
    // Update card active state
    for (let i = 1; i <= 4; i++) {
      document.getElementById('rcCard' + i).classList.toggle('rc-active', i === n);
    }
    // Show the selected panel inline, hide the rest
    for (let i = 1; i <= 4; i++) {
      const panel = document.getElementById('rcPanel' + i);
      panel.classList.toggle('rc-open', i === n);
      panel.style.display = (i === n) ? 'block' : 'none';
    }
  }
  window.switchResultCard = switchResultCard;

  function openResultDrawer() {}
  function closeResultDrawer() {}

  /* ACCORDION INIT — sync .open class with body display */
  (function () {
    document.querySelectorAll('.acc-card').forEach(card => {
      const body = card.querySelector('.acc-body');
      if (!body) return;
      if (card.classList.contains('open')) {
        body.style.display = 'block';
      } else {
        body.style.display = 'none';
      }
      // Store base sub-text
      const subEl = card.querySelector('.acc-title-sub');
      if (subEl) {
        const base = subEl.textContent.replace(/^[▼▲]\s*/, '');
        subEl.dataset.base = base;
      }
    });
  })();
  /* THEME TOGGLE (swap swap-rotate) */
  function applyTheme(isDark) {
    const theme = isDark ? 'synthwave' : 'cupcake';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }

  /* Load saved theme on init */
  (function () {
    const saved = localStorage.getItem('app-theme') || 'cupcake';
    const isDark = saved === 'synthwave';
    document.documentElement.setAttribute('data-theme', saved);
    const chk = document.getElementById('theme-toggle-chk');
    if (chk) chk.checked = isDark;
    if (isDark) applyTheme(true);
  })();

  /* TEXT ROTATE (home tagline) */
  (function () {
    const wrap   = document.getElementById('homeTagline');
    if (!wrap) return;
    const inner  = wrap.querySelector('span');
    const items  = Array.from(inner.querySelectorAll('span'));
    const total  = items.length;
    let   idx    = 0;

    // set initial position
    inner.style.transform = 'translateY(0px)';

    function rotate() {
      idx = (idx + 1) % total;
      inner.style.transform = `translateY(-${idx * 28}px)`;
    }

    setInterval(rotate, 2000);
  })();

// Expose to window.PK for onclick= handlers 
window.PK = {
  resetWeekly:          typeof resetWeekly          !== 'undefined' ? resetWeekly          : function(){},
  goToPage:             typeof goToPage             !== 'undefined' ? goToPage             : function(){},
  updateReview:         typeof updateReview         !== 'undefined' ? updateReview         : function(){},
  updateHint:           typeof updateHint           !== 'undefined' ? updateHint           : function(){},
  calculate:            typeof calculate            !== 'undefined' ? calculate            : function(){},
  toggleAcc:            typeof toggleAcc            !== 'undefined' ? toggleAcc            : function(){},
  dismissAlert:         typeof dismissAlert         !== 'undefined' ? dismissAlert         : function(){},
  showToast:            typeof showToast            !== 'undefined' ? showToast            : function(){},
  deleteEntry:          typeof deleteEntry          !== 'undefined' ? deleteEntry          : function(){},
  clearChartData:       typeof clearChartData       !== 'undefined' ? clearChartData       : function(){},
  switchChart:          typeof switchChart          !== 'undefined' ? switchChart          : function(){},
  renderCharts:         typeof renderCharts         !== 'undefined' ? renderCharts         : function(){},
  renderAggReportChart:      typeof renderAggReportChart      !== 'undefined' ? renderAggReportChart      : function(){},
  switchResultCard:     typeof switchResultCard     !== 'undefined' ? switchResultCard     : function(){},
  openResultDrawer:     typeof openResultDrawer     !== 'undefined' ? openResultDrawer     : function(){},
  closeResultDrawer:    typeof closeResultDrawer    !== 'undefined' ? closeResultDrawer    : function(){},
  applyTheme:           typeof applyTheme           !== 'undefined' ? applyTheme           : function(){},
  toggleAggregateReport:typeof toggleAggregateReport!== 'undefined' ? toggleAggregateReport: function(){},
  togglePLTrends:       typeof togglePLTrends       !== 'undefined' ? togglePLTrends       : function(){},
  toggleFundFlow:       typeof toggleFundFlow       !== 'undefined' ? toggleFundFlow       : function(){},
  saveToChart:          typeof saveToChart          !== 'undefined' ? saveToChart          : function(){},
  getChartData:         typeof getChartData         !== 'undefined' ? getChartData         : function(){},
  saveChartData:        typeof saveChartData        !== 'undefined' ? saveChartData        : function(){},
  renderReportTable:    typeof renderReportTable    !== 'undefined' ? renderReportTable    : function(){},
  renderCashflowPie:    typeof renderCashflowPie   !== 'undefined' ? renderCashflowPie    : function(){},
  autoFillWeeklyCreditFields: typeof autoFillWeeklyCreditFields !== 'undefined' ? autoFillWeeklyCreditFields : function(){}
};
window.PK._open = function(section) {
  document.getElementById('paikkariOverlay').classList.add('pk-open');
  document.body.style.overflow = 'hidden';
  if (section === 'quickaction') {
    goToPage('calc');
    if (typeof autoFillWeeklyCreditFields === 'function') autoFillWeeklyCreditFields();
  }
  else if (section === 'report')  {
    goToPage('result');
    if (typeof restoreLastSavedReport === 'function') restoreLastSavedReport();
  }
};

})();

