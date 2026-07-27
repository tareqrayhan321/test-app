
(function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
          .then(function(reg) {
            console.log('[PWA] Service Worker registered. Scope:', reg.scope);
          })
          .catch(function(err) {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }
})();
  