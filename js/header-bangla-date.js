
    /* বাম বোতাম: বাংলা (বঙ্গাব্দ) তারিখ — Intl API দিয়ে সঠিক */
    (function () {
      let BN_MONTHS = ['বৈশাখ','জ্যৈষ্ঠ','আষাঢ়','শ্রাবণ','ভাদ্র','আশ্বিন','কার্তিক','অগ্রহায়ণ','পৌষ','মাঘ','ফাল্গুন','চৈত্র'];

      function getBanglaDate() {
        /* বাংলাদেশ সময় (Asia/Dhaka) অনুযায়ী আজকের তারিখ */
        let fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Dhaka',
          year: 'numeric', month: '2-digit', day: '2-digit'
        });
        let parts = fmt.formatToParts(new Date());
        let p = {};
        parts.forEach(function(x){ p[x.type] = parseInt(x.value, 10); });
        let gY = p.year, gM = p.month, gD = p.day;

        /* বাংলা ক্যালেন্ডার রূপান্তর টেবিল
           [গ্রেগ মাস, বাংলা মাস শুরুর গ্রেগ দিন, বাংলা মাস idx, বাংলা বছরে +১?] */
        let tr = [
          [4, 14, 0, 1],[5, 15, 1, 1],[6, 15, 2, 1],[7, 16, 3, 1],
          [8, 16, 4, 1],[9, 16, 5, 1],[10,17, 6, 1],[11,16, 7, 1],
          [12,15, 8, 1],[1, 14, 9, 0],[2, 13,10, 0],[3, 14,11, 0]
        ];

        let bnMonIdx = 8, bnYearAdd = 0, bnDay = gD;
        for (let i = 0; i < tr.length; i++) {
          if (gM === tr[i][0]) {
            if (gD >= tr[i][1]) {
              bnMonIdx  = tr[i][2];
              bnYearAdd = tr[i][3];
              bnDay     = gD - tr[i][1] + 1;
            } else {
              /* মাসের শুরু হয়নি — আগের বাংলা মাস */
              let prev  = (i - 1 + 12) % 12;
              bnMonIdx  = tr[prev][2];
              bnYearAdd = tr[prev][3];
              /* আগের মাসের কতটুকু পার হয়েছে */
              let prevStart = tr[prev][1];
              /* আগের গ্রেগ মাসের দিন-সংখ্যা */
              let prevGM  = tr[prev][0];
              let prevGY  = (prevGM > gM) ? gY - 1 : gY;
              let daysInPrevGM = new Date(prevGY, prevGM, 0).getDate();
              bnDay = (daysInPrevGM - prevStart + 1) + gD;
            }
            break;
          }
        }
        let bnYear = gY - 593 + bnYearAdd - (bnMonIdx < tr[0][2] ? 0 : 0);
        /* বৈশাখ (idx=0) থেকে চৈত্র (idx=11) — বৈশাখের আগে সন এক কম */
        if (bnYearAdd === 0 && gM >= 1 && gM <= 3) bnYear = gY - 594;

        return { day: bnDay, monthIdx: bnMonIdx, year: bnYear };
      }

      function toBnNum(n) {
        return String(n).replace(/[0-9]/g, function(d){ return '০১২৩৪৫৬৭৮৯'[+d]; });
      }

      let bd   = getBanglaDate();
      let btns = document.querySelectorAll('.js-hdr-date-btn');
      if (!btns.length) return;

      let bnDayStr  = toBnNum(bd.day);
      let monName   = BN_MONTHS[bd.monthIdx];
      let fullYear  = toBnNum(bd.year);
      let shortYear = toBnNum(bd.year % 100);

      function setDateLabel() {
        let fullTxt  = bnDayStr + ' ' + monName + ' ' + fullYear;
        let shortTxt = bnDayStr + ' ' + monName + ' ' + shortYear;
        let c = document.createElement('canvas');
        let ctx = c.getContext('2d');
        ctx.font = '700 13px sans-serif';
        for (let i = 0; i < btns.length; i++) {
          let btn = btns[i];
          let available = (btn.offsetWidth || 130) - 34;
          let displayTxt = ctx.measureText(fullTxt).width <= available ? fullTxt : shortTxt;
          btn.innerHTML = '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + displayTxt + '</span>';
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setDateLabel);
      } else {
        setDateLabel();
      }
    })();
  