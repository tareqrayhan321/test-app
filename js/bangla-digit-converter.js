
/* সব জায়গায় ইংরেজি সংখ্যার বদলে বাংলা সংখ্যা দেখানোর গ্লোবাল কনভার্টার (মোবাইল নাম্বার বাদে) 
   MutationObserver + requestAnimationFrame ভিত্তিক ভার্সন — DOM পরিবর্তনের সাথে সাথেই
   (পরের পেইন্টের আগেই) সংখ্যা বাংলায় রূপান্তর করে, ফলে ইংরেজি→বাংলা "ফ্ল্যাশ" দেখা যায় না।
   একই সাথে সব মিউটেশন এক ফ্রেমে ব্যাচ করে স্ক্যান করায় অ্যাপ হ্যাং হওয়ার ঝুঁকিও থাকে না। */
(function () {
  let BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  function toBnDigitsRaw(str) {
    return str.replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  /* মোবাইল নাম্বারের মতো দেখতে অংশ (যেমন +8801XXXXXXXXX বা 01XXXXXXXXX) ইংরেজিতেই রেখে
     বাকি সংখ্যাগুলো বাংলায় রূপান্তর করে */
  let PHONE_RE = /\+?\d{10,14}/g;
  function toBnDigits(str) {
    if (str.indexOf('0') === -1 && str.indexOf('1') === -1 && str.indexOf('2') === -1 &&
        str.indexOf('3') === -1 && str.indexOf('4') === -1 && str.indexOf('5') === -1 &&
        str.indexOf('6') === -1 && str.indexOf('7') === -1 && str.indexOf('8') === -1 &&
        str.indexOf('9') === -1) return str;
    PHONE_RE.lastIndex = 0;
    if (!PHONE_RE.test(str)) return toBnDigitsRaw(str);
    let result = '';
    let lastIndex = 0;
    let m;
    PHONE_RE.lastIndex = 0;
    while ((m = PHONE_RE.exec(str)) !== null) {
      result += toBnDigitsRaw(str.slice(lastIndex, m.index));
      result += m[0]; /* ফোন নাম্বার — ইংরেজি অক্ষরেই থাকবে */
      lastIndex = m.index + m[0].length;
    }
    result += toBnDigitsRaw(str.slice(lastIndex));
    return result;
  }

  let SKIP_TAGS = { SCRIPT: 1, STYLE: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1 };

  function shouldSkip(el) {
    while (el) {
      if (el.nodeType === 1) {
        if (SKIP_TAGS[el.tagName]) return true;
        if (el.tagName === 'A' && el.getAttribute && el.getAttribute('href') &&
            el.getAttribute('href').indexOf('tel:') === 0) return true;
        if (el.classList && (el.classList.contains('ep-mob-prefix') || el.classList.contains('fv-edit-mob-prefix'))) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  let running = false;
  function scanAndConvert(root) {
    if (running) return; /* একই সময়ে দুইবার না চলুক */
    running = true;
    try {
      let walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        let val = node.nodeValue;
        if (val && val.length && /[0-9]/.test(val) && !shouldSkip(node.parentNode)) {
          let converted = toBnDigits(val);
          if (converted !== val) node.nodeValue = converted;
        }
      }
    } finally {
      running = false;
    }
  }

  /* প্রাথমিক পাস — DOM তৈরি হওয়ার সাথে সাথেই, কোনো বিলম্ব ছাড়া */
  let _observer = null;
  let _rafPending = false;

  function requestScan() {
    if (_rafPending) return;
    _rafPending = true;
    /* পরের পেইন্টের ঠিক আগে চালানো হয় — তাই ইংরেজি সংখ্যা এক ফ্রেমের জন্যও স্ক্রিনে দেখা যায় না */
    requestAnimationFrame(function () {
      _rafPending = false;
      scanAndConvert(document.body);
    });
  }

  function startObserving() {
    if (!document.body) return;
    scanAndConvert(document.body); /* সিনক্রোনাস প্রাথমিক পাস */
    if (_observer) return;
    _observer = new MutationObserver(function () {
      requestScan();
    });
    _observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.body) {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving);
  }
})();
