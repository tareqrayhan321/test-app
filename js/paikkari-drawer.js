/* paikkari-drawer.js
   Paikkari overlay (বটম শিট ড্রয়ার) খোলা/বন্ধ করার লজিক।
   Depends on: window.PK._open (css/paikkari-drawer.css সংশ্লিষ্ট আরেকটা মডিউলে সংজ্ঞায়িত)
   (এই ফাইল আগে home-grid-layout.js-এর (পূর্বে block-10.js) অংশ ছিল;
    ধাপ ৭-এর split-এ আলাদা করা হলো, যেহেতু এর home-grid লজিকের সাথে কোনো সম্পর্ক নেই।)
*/
(function () {

function paikkariOpen(section){
  document.getElementById('paikkariOverlay').classList.add('pk-open');
  document.body.style.overflow='hidden';
  if(window.PK && window.PK._open) window.PK._open(section);
}
window.paikkariOpen = paikkariOpen;
function paikkariClose(){
  document.getElementById('paikkariOverlay').classList.remove('pk-open');
  document.body.style.overflow='';
}
window.paikkariClose = paikkariClose;
function paikkariOverlayClick(e){
  if(e.target===document.getElementById('paikkariOverlay')) paikkariClose();
}
window.paikkariOverlayClick = paikkariOverlayClick;

})();
