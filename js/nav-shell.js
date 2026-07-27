/* nav-shell.js
   বটম ট্যাব বার (Dashboard/Home/Ledger সুইচ), সাইড মেনু, এবং
   পার্টি (DL) স্ক্রিনে ঢোকা/বেরনোর নেভিগেশন লজিক।
   Depends on (window.* এক্সপোজড, তাই লোড-অর্ডার independent):
     - dlRender()      <- js/debtors-list.js
     - fitHomeGrid()   <- js/home-grid-layout.js
     - aggOvRender()   <- js/fabric-purchase.js
*/
(function () {

  /* BOTTOM TAB BAR — TAB SWITCH লজিক
  */
  let _dlReturnTab = 'dashboard'; /* পার্টি (DL) স্ক্রিন থেকে ব্যাক করলে কোথায় ফিরবে */

  function btabSwitch(tab) {
    let dashBtn      = document.getElementById('btabDashboard');
    let ledgerBtn    = document.getElementById('btabLedger');
    let homeBtn      = document.getElementById('btabHome');
    if (!dashBtn) return;

    /* ledger-এ ঢোকার আগে বর্তমান ভিউ মনে রাখি, যাতে ব্যাক করলে সেখানেই ফেরা যায় */
    if (tab === 'ledger') {
      _dlReturnTab = document.body.classList.contains('show-home') ? 'home' : 'dashboard';
    }

    /* সব active class সরাও */
    [homeBtn, ledgerBtn, dashBtn].forEach(function(b){ if(b) b.classList.remove('active'); });
    /* সব page class সরাও */
    document.body.classList.remove('show-ledger', 'show-home');

    if (tab === 'ledger') {
      document.body.classList.add('show-ledger');
      if (ledgerBtn) ledgerBtn.classList.add('active');
      window.dlRender();
      document.body.style.overflow = 'hidden';
    } else if (tab === 'home') {
      document.body.classList.add('show-home');
      if (homeBtn) homeBtn.classList.add('active');
      document.body.style.overflow = 'hidden';
      /* header height পরিবর্তনের পর home screen padding-top recalculate */
      setTimeout(window.fitHomeGrid, 50);
      if (window.aggOvRender) window.aggOvRender();
    } else {
      if (dashBtn) dashBtn.classList.add('active');
      document.body.style.overflow = '';
      setTimeout(window.fitHomeGrid, 50);
    }
  }
  window.btabSwitch = btabSwitch;

  /* পার্টি (DL) স্ক্রিন থেকে ব্যাক — যেখান থেকে ঢুকেছিল সেখানেই ফেরত */
  let _dlOpenedViaCard = false; /* হোম কার্ড থেকে সরাসরি (overlay ভাবে) খোলা হয়েছে কিনা */

  /* হোম কার্ড থেকে পার্টি (ledger) সরাসরি ওপেন — কোনো স্লাইড অ্যানিমেশন ছাড়াই, body.show-home ছুঁয়ে দেয় না */
  function partyOpen() {
    _dlOpenedViaCard = true;
    window.dlRender();
    document.getElementById('dlScreen').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  window.partyOpen = partyOpen;

  function dlBack() {
    if (_dlOpenedViaCard) {
      _dlOpenedViaCard = false;
      document.getElementById('dlScreen').classList.remove('open');
      document.body.style.overflow = '';
      return;
    }
    btabSwitch(_dlReturnTab);
  }
  window.dlBack = dlBack;

  /* মেনু toggle */
  function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('open');
    document.getElementById('menuOverlay').classList.toggle('open');
  }
  window.toggleMenu = toggleMenu;
  function closeMenu() {
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('menuOverlay').classList.remove('open');
  }
  window.closeMenu = closeMenu;

})();
