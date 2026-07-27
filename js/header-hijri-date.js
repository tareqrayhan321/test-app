
    /* ডান বোতাম: হিজরি (আরবি) তারিখ — Intl API দিয়ে সঠিক */
    (function () {
      let AR_MONTHS = [
        'مُحَرَّم','صَفَر','رَبِيعُ ٱلْأَوَّل','رَبِيعُ ٱلثَّانِي',
        'جُمَادَىٰ ٱلْأُولَىٰ','جُمَادَىٰ ٱلْآخِرَة','رَجَب','شَعْبَان',
        'رَمَضَان','شَوَّال','ذُو ٱلْقَعْدَة','ذُو ٱلْحِجَّة'
      ];
      let AR_MONTHS_SHORT = [
        'محرم','صفر','ربيع الأول','ربيع الثاني',
        'جمادى الأولى','جمادى الآخرة','رجب','شعبان',
        'رمضان','شوال','ذو القعدة','ذو الحجة'
      ];

      function toArNum(n) {
        return String(n).replace(/[0-9]/g, function(d){ return '٠١٢٣٤٥٦٧٨٩'[+d]; });
      }

      function getHijriDate() {
        let now = new Date();
        /* প্রথমে islamic-umalqura চেষ্টা, না হলে islamic */
        let calendars = ['islamic-umalqura', 'islamic'];
        let hD, hM, hY;
        for (let c = 0; c < calendars.length; c++) {
          try {
            let fmt = new Intl.DateTimeFormat('en-u-ca-' + calendars[c], {
              timeZone: 'Asia/Dhaka',
              year: 'numeric', month: 'numeric', day: 'numeric'
            });
            let parts = fmt.formatToParts(now);
            let p = {};
            parts.forEach(function(x){ p[x.type] = parseInt(x.value, 10); });
            if (p.year && p.month && p.day) {
              hY = p.year; hM = p.month; hD = p.day;
              break;
            }
          } catch(e) { console.warn('Hijri calendar "' + calendars[c] + '" unsupported:', e.message); }
        }
        return { day: hD, month: hM - 1, year: hY };
      }

      let hd   = getHijriDate();
      let btns = document.querySelectorAll('.js-hdr-hijri-btn');
      if (!btns.length) return;

      function setHijriLabel() {
        let hDay  = toArNum(hd.day);
        let hYear = toArNum(hd.year);
        let fullTxt  = hDay + ' ' + AR_MONTHS[hd.month]       + ' ' + hYear;
        let shortTxt = hDay + ' ' + AR_MONTHS_SHORT[hd.month] + ' ' + hYear;
        let c = document.createElement('canvas');
        let ctx = c.getContext('2d');
        ctx.font = '700 13px sans-serif';
        for (let i = 0; i < btns.length; i++) {
          let btn = btns[i];
          let available = (btn.offsetWidth || 130) - 34;
          let displayTxt = ctx.measureText(fullTxt).width <= available ? fullTxt : shortTxt;
          btn.innerHTML = '<span dir="rtl" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:\'Noto Naskh Arabic\',\'Scheherazade New\',serif;letter-spacing:0;">' + displayTxt + '</span>';
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setHijriLabel);
      } else {
        setHijriLabel();
      }
    })();
  