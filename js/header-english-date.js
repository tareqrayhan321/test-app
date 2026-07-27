
    /* তৃতীয় বোতাম: ইংরেজি (Gregorian) তারিখ */
    (function () {
      let EN_MONTHS = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
      let EN_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                             'Jul','Aug','Sep','Oct','Nov','Dec'];

      function getEngDate() {
        let fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Dhaka',
          year: 'numeric', month: '2-digit', day: '2-digit'
        });
        let parts = fmt.formatToParts(new Date());
        let p = {};
        parts.forEach(function(x){ p[x.type] = parseInt(x.value, 10); });
        return { day: p.day, month: p.month - 1, year: p.year };
      }

      let ed   = getEngDate();
      let btns = document.querySelectorAll('.js-hdr-eng-btn');
      if (!btns.length) return;

      function setEngLabel() {
        let fullTxt  = ed.day + ' ' + EN_MONTHS[ed.month]       + ' ' + ed.year;
        let shortTxt = ed.day + ' ' + EN_MONTHS_SHORT[ed.month] + ' ' + ed.year;
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
        document.addEventListener('DOMContentLoaded', setEngLabel);
      } else {
        setEngLabel();
      }
    })();
  