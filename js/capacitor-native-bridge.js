// Capacitor native bridge — এন্ড্রয়েড ব্যাক বাটন এবং স্প্ল্যাশ স্ক্রিন হ্যান্ডলিং
(function () {
  if (!window.Capacitor) return; // ব্রাউজারে চললে কিছু করবে না

  document.addEventListener('DOMContentLoaded', function () {
    // স্প্ল্যাশ স্ক্রিন লুকানো (অ্যাপ রেডি হওয়ার পর)
    if (window.Capacitor.Plugins.SplashScreen) {
      setTimeout(function () {
        window.Capacitor.Plugins.SplashScreen.hide();
      }, 400);
    }

    // ব্যাক বাটন হ্যান্ডলিং: প্রথমে ড্রয়ার/ওভারলে বন্ধ করবে, তারপর হোম ট্যাবে যাবে, তারপর অ্যাপ থেকে বের হবে
    if (window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', function () {
        // paikkariOverlay খোলা থাকলে সেটা বন্ধ করে
        var overlay = document.getElementById('paikkariOverlay');
        if (overlay && overlay.classList.contains('pk-open')) {
          if (typeof window.paikkariClose === 'function') {
            window.paikkariClose();
          } else {
            overlay.classList.remove('pk-open');
          }
          return;
        }
        // হোম ট্যাবে না থাকলে হোমে নিয়ে যায়
        var homeTabBtn = document.getElementById('btabHome');
        var isHomeActive = homeTabBtn && homeTabBtn.classList.contains('active');
        if (homeTabBtn && !isHomeActive) {
          homeTabBtn.click();
          return;
        }
        // হোমে থাকলে অ্যাপ থেকে বের হওয়ার নিশ্চয়তা নেবে
        if (confirm('আপনি কি অ্যাপ থেকে বের হতে চান?')) {
          window.Capacitor.Plugins.App.exitApp();
        }
      });
    }
  });
})();
