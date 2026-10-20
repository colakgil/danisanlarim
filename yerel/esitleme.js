'use strict';
/* Cihazlar arası eşitleme: veritabanı Hande'nin Google Drive'ında (Apps Script web uygulaması üzerinden) durur.
   - Drive'daki dosyanın bir sürüm numarası var. Cihaz, bildiği sürüm hâlâ en günceliyse yükler.
   - Arada başka cihaz yüklediyse ("çakışma"): yeni sürüm indirilir, bu cihazın bekleyen işlemleri
     (ekle/güncelle/sil) onun üzerine yeniden uygulanır, sonra yüklenir. Hiçbir cihazın değişikliği kaybolmaz.
   - Bağlantı bilgisi (web uygulaması adresi + gizli anahtar) Google Form ayarlarıyla aynıdır. */
(function () {
  const Y = window.Yerel;
  const ic = Y._ic;
  const ARALIK_SN = 60;          // görünürken en fazla bu kadar saniyede bir Drive'a bakılır
  const GONDERME_GECIKME = 2500; // son değişiklikten sonra gönderme

  // ---------- bağlantı bilgisi ----------
  let baglanti = null;           // { url, anahtar }
  let cihaz = null;
  async function baglantiYukle() {
    const kayitli = await ic.idb.get('baglanti');
    if (kayitli && kayitli.url && kayitli.anahtar) return (baglanti = kayitli);
    const g = ic.ctx().getSetting('googleForm', {}) || {};
    baglanti = g.url && g.anahtar ? { url: g.url, anahtar: g.anahtar } : null;
    return baglanti;
  }
  async function cihazAdi() {
    if (cihaz) return cihaz;
    cihaz = await ic.idb.get('cihaz');
    if (!cihaz) {
      const ua = navigator.userAgent;
      const tur = /iPhone/.test(ua) ? 'iPhone' : /iPad|Macintosh.*Mobile/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
        : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : 'Cihaz';
      cihaz = `${tur}-${Math.random().toString(36).slice(2, 6)}`;
      await ic.idb.set('cihaz', cihaz);
    }
    return cihaz;
  }
  // Bağlantı kodu: yeni cihazı bağlamak için tek satır (adres + anahtar). Gizli anahtar içerir!
  const kodla = b => 'DNS1.' + btoa(unescape(encodeURIComponent(JSON.stringify({ u: b.url, k: b.anahtar })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function coz(kod) {
    const m = /DNS1\.([A-Za-z0-9_-]+)/.exec(String(kod || ''));
    if (!m) throw new Error('Bağlantı kodu tanınmadı. "DNS1." ile başlayan kodun tamamını yapıştırın.');
    let s = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const o = JSON.parse(decodeURIComponent(escape(atob(s))));
    // (localhost: yalnızca testlerdeki sahte Google sunucusu)
    if (!(/^https:\/\/script\.google(usercontent)?\.com\//.test(o.u || '') || /^http:\/\/localhost:\d+\//.test(o.u || '')) || !o.k) throw new Error('Bağlantı kodu eksik.');
    return { url: o.u, anahtar: o.k };
  }

  // ---------- Apps Script çağrısı ----------
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  // ham: Google'ın cevabını olduğu gibi döndür (ok:false dahil); yalnızca bağlantı ve anahtar hatası fırlatılır
  async function cagir(islem, ek = {}, b = baglanti, ham = false) {
    if (!b) throw new Error('Eşitleme bağlantısı yok.');
    let r;
    try {
      r = await fetch(b.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ anahtar: b.anahtar, islem, ...ek }), redirect: 'follow' });
    } catch (e) { throw Object.assign(new Error('İnternet bağlantısı yok'), { cevrimdisi: true }); }
    const j = await r.json().catch(() => null);
    if (!j) throw new Error('Google\'dan beklenmeyen cevap geldi (web uygulaması güncel mi?)');
    if (ham && j.hata !== 'yetkisiz' && j.hata !== 'bilinmeyen işlem' && j.hata !== 'gecersiz') return j;
    if (!j.ok && j.hata !== 'catisma') throw new Error(j.hata === 'yetkisiz' ? 'Gizli anahtar hatalı.' : j.hata === 'bilinmeyen işlem' || j.hata === 'gecersiz' ? 'Google tarafı eski sürüm: Apps Script yeniden dağıtılmalı.' : 'Google: ' + j.hata);
    return j;
  }

  // ---------- çakışmada yeniden uygulama: yeni kayıt numaralarını eşle ----------
  // Bu cihazda eklenen bir kaydın numarası, Drive sürümüne uygulanınca farklı çıkabilir (arada diğer cihaz eklediyse).
  // Sonraki işlemlerdeki adres ve alanlar yeni numaraya çevrilir.
  const EKLEME = [
    [/^\/api\/clients$/, 'clients'], [/^\/api\/clients\/[^/]+\/visits$/, 'visits'], [/^\/api\/appointments$/, 'appointments'],
    [/^\/api\/clients\/[^/]+\/lists$/, 'diet_lists'], [/^\/api\/lists\/[^/]+\/sablon$/, 'templates'], [/^\/api\/templates$/, 'templates'],
    [/^\/api\/blocks$/, 'blocks'], [/^\/api\/packages$/, 'packages'], [/^\/api\/clients\/[^/]+\/packages$/, 'client_packages'],
    [/^\/api\/clients\/[^/]+\/payments$/, 'payments'], [/^\/api\/expenses$/, 'expenses'], [/^\/api\/basvurular\/[^/]+\/aktar$/, 'clients'],
  ];
  const YOL = { clients: 'clients', visits: 'visits', appointments: 'appointments', lists: 'diet_lists', templates: 'templates', blocks: 'blocks',
    packages: 'packages', 'client-packages': 'client_packages', payments: 'payments', expenses: 'expenses' };
  const ALAN = { client_id: 'clients', package_id: 'packages', client_package_id: 'client_packages', sablonId: 'templates', listeId: 'diet_lists' };
  const numaralar = r => (!r ? [] : Array.isArray(r.ids) ? r.ids : r.id != null ? [r.id] : r.client_id != null ? [r.client_id] : []);
  const yenidenYaz = {
    yol(o, h) {
      const cevir = (tablo, id) => (h[tablo] && h[tablo][id] != null ? h[tablo][id] : id);
      const u = o.u.replace(/\/(clients|visits|appointments|lists|templates|blocks|packages|client-packages|payments|expenses)\/(\d+)/g,
        (t, k, id) => `/${k}/${cevir(YOL[k], id)}`);
      let b = o.b;
      if (b && typeof b === 'object' && !Array.isArray(b)) {
        b = { ...b };
        for (const [alan, tablo] of Object.entries(ALAN)) if (b[alan] != null && b[alan] !== '') b[alan] = cevir(tablo, b[alan]);
      }
      return { u, b };
    },
    esle(o, yeniSonuc, h) {
      const tur = EKLEME.find(([re]) => o.m === 'POST' && re.test(o.u.split('?')[0]));
      if (!tur) return;
      const eski = numaralar(o.r), yeni = numaralar(yeniSonuc);
      eski.forEach((id, i) => { if (yeni[i] != null && yeni[i] !== id) (h[tur[1]] = h[tur[1]] || {})[id] = yeni[i]; });
    },
  };

  // ---------- eşitleme ----------
  let durum = { ad: 'kapali', zaman: null, hata: null };
  function bildir(ad, ek = {}) {
    durum = { ...durum, ad, hata: null, ...ek };
    if (ad === 'tamam') durum.zaman = new Date().toISOString();
    dispatchEvent(new CustomEvent('esitleme', { detail: { ...durum, bekleyen: ic.durum().bekleyenSayisi } }));
  }

  let calisan = null, tekrar = false;
  function esitle() {
    if (calisan) { tekrar = true; return calisan; }
    calisan = (async () => {
      try {
        do { tekrar = false; await tur(); } while (tekrar);
      } finally { calisan = null; }
    })();
    return calisan;
  }

  async function tur() {
    await Y.hazir;
    if (!(await baglantiYukle())) return bildir('kapali');
    const cihazAd = await cihazAdi();
    bildir('calisiyor');
    try {
      for (let deneme = 0; deneme < 4; deneme++) {
        const d = await cagir('veri.durum');
        let m = ic.durum();
        if (!m.yerelDegisik) {
          if (d.surum === m.surum) return bildir('tamam');
          if (d.surum > 0) {
            const v = await cagir('veri.indir');
            await ic.indirildi(bytes(v.veri), v.surum);
            dispatchEvent(new CustomEvent('yerel:yenilendi'));
            return bildir('tamam');
          }
          if (ic.bosMu()) return bildir('tamam');        // ikisi de boş
        }
        if (d.surum > 0 && d.surum !== m.surum) {
          // Drive'da bu cihazın görmediği değişiklik var → birleştir
          const v = await cagir('veri.indir');
          const s = await ic.birlestir(bytes(v.veri), v.surum, yenidenYaz);
          dispatchEvent(new CustomEvent('yerel:yenilendi', { detail: s }));
          if (s.atlanan.length) console.warn('Birleştirmede uygulanamayan işlemler', s.atlanan);
          m = ic.durum();
          if (!m.yerelDegisik) return bildir('tamam');
        }
        const a = ic.anlik();
        const y = await cagir('veri.yukle', { taban: ic.durum().surum, veri: b64(a.veri), cihaz: cihazAd });
        if (y.ok) { await ic.gonderildi(y.surum, a); if (!ic.durum().yerelDegisik) return bildir('tamam'); }
        // çakışma ya da gönderirken yeni değişiklik → tekrar
      }
      throw new Error('Eşitleme tamamlanamadı, birazdan tekrar denenecek.');
    } catch (e) {
      bildir(e.cevrimdisi ? 'cevrimdisi' : 'hata', { hata: e.message });
    }
  }

  // ---------- ne zaman eşitlenir ----------
  let gonderZaman = null, otomatik = true;
  ic.degisiklikte(() => { clearTimeout(gonderZaman); if (otomatik) gonderZaman = setTimeout(esitle, GONDERME_GECIKME); });
  const gorunur = () => document.visibilityState === 'visible';
  addEventListener('visibilitychange', () => { if (otomatik && gorunur()) esitle(); });
  addEventListener('online', () => { if (otomatik) esitle(); });
  setInterval(() => { if (otomatik && gorunur()) esitle(); }, ARALIK_SN * 1000);

  window.Esitleme = {
    esitle,
    durum: () => ({ ...durum, bekleyen: ic.durum().bekleyenSayisi }),
    async bagliMi() { await Y.hazir; return !!(await baglantiYukle()); },
    async kod() { await Y.hazir; const b = await baglantiYukle(); return b ? kodla(b) : null; },
    // Yeni cihaz: kodu doğrula, kaydet, veriyi indir
    async baglan(kod) {
      await Y.hazir;
      const b = coz(kod);
      const d = await cagir('veri.durum', {}, b);
      await ic.idb.set('baglanti', b);
      baglanti = b;
      if (!d.surum) throw new Error('Bağlandı, ama Drive\'da henüz veri yok. Önce ana cihazda eşitlemeyi açın.');
      await esitle();
      if (durum.ad !== 'tamam') throw new Error(durum.hata || 'Veri indirilemedi.');
    },
    // Google Form ayarı değişince (adres/anahtar) yeniden oku
    async yenidenOku() { await ic.idb.set('baglanti', null); await baglantiYukle(); return esitle(); },
    // Apps Script'e doğrudan istek (önizleme, takvim): ok:false cevaplar da döner
    async cagir(islem, ek) {
      await Y.hazir;
      if (!(await baglantiYukle())) throw Object.assign(new Error('Eşitleme bağlantısı yok.'), { baglantiYok: true });
      return cagir(islem, ek, baglanti, true);
    },
    _yenidenYaz: yenidenYaz,
    _otomatik: v => { otomatik = !!v; },     // testler için
  };

  Y.hazir.then(() => esitle()).catch(() => {});
})();
