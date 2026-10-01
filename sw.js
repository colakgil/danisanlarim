// Otomatik üretildi (tools/yayin-hazirla.js) — elle düzenlemeyin.
// Uygulama dosyalarını önbelleğe alır: internet olmadan da açılır. Veriler burada değil, IndexedDB'dedir.
const SURUM = "danisanlarim-6aba79d002b4";
const DOSYALAR = ["./","anamnez.js","app.js","basvuru.js","core/basvuru.js","core/finans.js","core/icerik-paketi.js","core/pdf-modern.js","core/rotalar.js","core/sema.js","core/yardim.js","favicon.png","finans.js","fonts/Nunito.ttf","fonts/Quicksand.ttf","fonts/Tinos-Bold.ttf","fonts/Tinos-Regular.ttf","icon-180.png","icon-192.png","icon-512.png","index.html","isaret-beyaz.png","isaret.png","logo-beyaz.png","logo-koyu.png","logo.png","manifest.webmanifest","styles.css","takvim.js","tarifler.js","vendor/html2canvas.min.js","vendor/jspdf.umd.min.js","vendor/qrcode-generator.js","vendor/sql-wasm.js","vendor/sql-wasm.wasm","yerel/arayuz.js","yerel/esitleme.js","yerel/liste-pdf.js","yerel/onizleme.js","yerel/pdf.js","yerel/takvim-esitleme.js","yerel/yerel.js"];
self.addEventListener('install', e => e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(k => Promise.all(k.filter(x => x !== SURUM && x.startsWith('danisanlarim-')).map(x => caches.delete(x))))
  .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // Yalnızca uygulamanın kendi dosyaları; Google (eşitleme, görsel, takvim) istekleri doğrudan gider
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(caches.open(SURUM).then(c => c.match(e.request, { ignoreSearch: true })
    .then(r => r || (e.request.mode === 'navigate' ? c.match('./') : null))
    .then(r => r || fetch(e.request))));
});
