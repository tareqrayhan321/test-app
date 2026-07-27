/* home-grid-layout.js
   হোম গ্রিড লেআউট ফিট — কার্ডগুলো বটম বার পর্যন্ত এবং পুরো প্রস্থ জুড়ে
   viewport/header সাইজ অনুযায়ী পুনর্গণনা করা হয়।
   Exposes: fitHomeGrid (js/nav-shell.js এটা ব্যবহার করে)
   (paikkari-open/close লজিক এখন আলাদা js/paikkari-drawer.js ফাইলে; ধাপ ৭-এর split।)
*/
(function () {

/* HOME GRID — কার্ডগুলো বটম বার পর্যন্ত এবং পুরো প্রস্থ জুড়ে */
let _fitGridTimer = null;
function fitHomeGrid() {
  let grid = document.querySelector('.main .home-grid');
  let hdr  = document.querySelector('.hdr');
  let main = document.querySelector('.main');
  let calCard = document.getElementById('dashCalCard');
  let aggCard = document.getElementById('dashAggCard');
  let ffCard  = document.getElementById('dashFundFlowCard');
  if (grid && hdr && main) {
    let vw = (window.visualViewport && window.visualViewport.width)  || window.innerWidth;
    let vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    let hdrH = hdr.offsetHeight;
    let ms = getComputedStyle(main);
    let padTop    = parseFloat(ms.paddingTop)    || 0;
    let padBottom = parseFloat(ms.paddingBottom) || 0;
    let padLeft   = parseFloat(ms.paddingLeft)   || 0;
    let padRight  = parseFloat(ms.paddingRight)  || 0;
    let tabBar = document.getElementById('bottomTabBar');
    let tabBarH = (tabBar && tabBar.offsetHeight) || 0;
    let availW = vw - padLeft - padRight;
    if (availW > 0) grid.style.width = availW + 'px';

    /* ড্যাশবোর্ড স্ক্রিনের খালি জায়গা agg-card ও fundflow-card-এ ভাগ করে বড় করা — শুধু ড্যাশবোর্ড ট্যাবে (body.show-home না থাকলে); ক্যালেন্ডার শুধু হোমে দেখা যায় তাই এখানে ধরা হচ্ছে না */
    if (aggCard && ffCard && !document.body.classList.contains('show-home')) {
      /* Fund Flow কার্ডের height আর কৃত্রিমভাবে স্ট্রেচ করা হয় না — এতে কার্ডের ভেতরে খালি জায়গা/গ্যাপ তৈরি হচ্ছিল */
      aggCard.style.minHeight = '';
      ffCard.style.minHeight  = '';
    } else if (calCard && document.body.classList.contains('show-home')) {
      /* হোম ট্যাবে ক্যালেন্ডার তার স্বাভাবিক/আসল সাইজে থাকবে — কোনো স্ট্রেচ নয় */
      calCard.style.minHeight = '';
      let hwc3 = calCard.querySelector('.hdr-week-cal');
      if (hwc3) hwc3.style.paddingBottom = '';
    }
  }
  /* হোম স্ক্রিন (৬টা কার্ডের গ্রিড) — body padding-top = full header height (strip সহ) + gap */
  let homeBody = document.getElementById('pk-body-home');
  if (hdr && homeBody) homeBody.style.paddingTop = hdr.offsetHeight + 'px';
  /* হোম স্ক্রিনের কার্ড গ্রিড — খালি জায়গা পূরণ করতে রো-গুলো স্ট্রেচ করানো */
  let homeCardGrid = document.getElementById('homeCardsGrid');
  if (homeCardGrid && homeBody) {
    let dbs = getComputedStyle(homeBody);
    let dPadTop    = parseFloat(dbs.paddingTop)    || 0;
    let dPadBottom = parseFloat(dbs.paddingBottom) || 0;
    let tabBar2 = document.getElementById('bottomTabBar');
    let tabBarH2 = (tabBar2 && tabBar2.offsetHeight) || 0;
    let availDashH = homeBody.clientHeight - dPadTop - dPadBottom - tabBarH2;
    if (availDashH > 0) homeCardGrid.style.minHeight = availDashH + 'px';
  }
}
window.fitHomeGrid = fitHomeGrid;
function fitHomeGridThrottled() {
  if (_fitGridTimer) return;
  _fitGridTimer = setTimeout(function() { _fitGridTimer = null; fitHomeGrid(); }, 150);
}
window.addEventListener('load', fitHomeGrid);
window.addEventListener('resize', fitHomeGridThrottled);
window.addEventListener('orientationchange', function(){ setTimeout(fitHomeGrid, 200); });
fitHomeGrid();

})();
