/* Shared utility — HTML escape
   এটাই একমাত্র জায়গা যেখানে _esc() define করা।
   ব্যবহারকারীর টাইপ করা যেকোনো টেক্সট innerHTML-এ বসানোর
   আগে অবশ্যই এই ফাংশন দিয়ে escape করতে হবে (XSS প্রতিরোধ)।
   সব js/block-*.js ফাইলের আগে লোড হয়, তাই window._esc সব
   জায়গা থেকে সরাসরি কল করা যায় — আলাদা কপি/fallback লাগে না।
*/
(function () {
  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  window._esc = _esc;
})();

/* Shared utility — SVG bar chart helpers
   আগে block-8.js ও block-11.js দুই জায়গায় আলাদাভাবে সংজ্ঞায়িত ছিল
   (হুবহু একই লজিক, শুধু corner-radius 4px বনাম 5px পার্থক্য ছিল —
   এখানে 5px রাখা হলো, যা block-11.js-এর মূল মান)।
   এই ফাইল সব block-*.js-এর আগে লোড হয়, তাই window.barPath/window.fmtV
   সরাসরি কল করা যায়, আলাদা কপি লাগে না।
*/
(function () {
  function barPath(x1, y1, bw, bh, isUp) {
    let x2 = x1 + bw, y2 = y1 + bh, r = Math.min(5, bw / 2);
    if (isUp) {
      return 'M' + (x1+r) + ',' + y1
        + ' Q' + x1 + ',' + y1 + ' ' + x1 + ',' + (y1+r)
        + ' L' + x1 + ',' + y2
        + ' L' + x2 + ',' + y2
        + ' L' + x2 + ',' + (y1+r)
        + ' Q' + x2 + ',' + y1 + ' ' + (x2-r) + ',' + y1 + 'Z';
    } else {
      return 'M' + x1 + ',' + y1
        + ' L' + x2 + ',' + y1
        + ' L' + x2 + ',' + (y2-r)
        + ' Q' + x2 + ',' + y2 + ' ' + (x2-r) + ',' + y2
        + ' L' + (x1+r) + ',' + y2
        + ' Q' + x1 + ',' + y2 + ' ' + x1 + ',' + (y2-r) + 'Z';
    }
  }
  function fmtV(v) {
    let abs = Math.abs(v);
    let str = abs >= 100000 ? (abs/100000).toFixed(1)+'ল'
            : abs >= 1000    ? (abs/1000).toFixed(1)+'হা'
            : abs.toString();
    return (v >= 0 ? '+' : '−') + str;
  }
  window.barPath = barPath;
  window.fmtV = fmtV;
})();
