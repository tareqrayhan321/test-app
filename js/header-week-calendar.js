
    (function () {
      let t   = new Date();
      let ti  = t.getDay(); /* আজকের JS weekday (0=রবি…6=শনি) */
      /* সোমবার (1) থেকে সপ্তাহ শুরু — সোমের তারিখ বের করি */
      let diff = (ti - 1 + 7) % 7;
      let mon  = new Date(t);
      mon.setDate(t.getDate() - diff);
      /* ক্রম: সোম(1) মঙ্গল(2) বুধ(3) বৃহ(4) শুক্র(5) শনি(6) রবি(0) */
      let order = [1, 2, 3, 4, 5, 6, 0];
      for (let i = 0; i < 7; i++) {
        let dayIdx = order[i];
        let d = new Date(mon);
        d.setDate(mon.getDate() + i);
        let dateVal = d.getDate();
        let des = document.querySelectorAll('.js-hwc-date[data-day-idx="' + dayIdx + '"]');
        let dys = document.querySelectorAll('.js-hwc-day[data-day-idx="' + dayIdx + '"]');
        for (let k = 0; k < des.length; k++) des[k].textContent = dateVal;
        if (dayIdx === ti) {
          for (let j = 0; j < dys.length; j++) dys[j].classList.add('hwc-today');
        }
      }
    })();
  