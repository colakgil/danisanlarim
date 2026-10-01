'use strict';
/* Tarif linklerinin kapak görselleri (yerel mod).
   - Görseller veritabanındaki "gorseller" tablosunda durur → eşitlemeyle tüm cihazlara gider, internetsiz de görünür.
   - Yeni link için görsel, Hande'nin Apps Script'i üzerinden alınır (tarayıcı Instagram'a doğrudan erişemez).
   - Ekrandaki "/gorsel/<ad>" adresleri, cevaplarda cihazdaki görselin blob: adresine çevrilir. */
(function () {
  const Y = window.Yerel;
  const ic = Y._ic;
  const BEKLE_MS = 1500;

  // ---------- /gorsel/<ad> → blob: adresi ----------
  let adresler = new Map();
  function gorselAdresi(ad) {
    if (adresler.has(ad)) return adresler.get(ad);
    const r = ic.ctx().db.prepare('SELECT tur, veri FROM gorseller WHERE ad=?').get(ad);
    const u = r ? URL.createObjectURL(new Blob([r.veri], { type: r.tur || 'image/jpeg' })) : null;
    adresler.set(ad, u);
    return u;
  }
  // Veritabanındaki görselin data: adresi (PDF üretimi için; blob adresi başka belgede çalışmayabilir)
  function gorselVeri(ad) {
    const r = ic.ctx().db.prepare('SELECT tur, veri FROM gorseller WHERE ad=?').get(String(ad).replace(/^\/?gorsel\//, ''));
    if (!r) return null;
    let s = ''; const b = r.veri;
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return `data:${r.tur || 'image/jpeg'};base64,${btoa(s)}`;
  }
  const cevir = metin => metin.replace(/\/gorsel\/([\w.-]+)/g, (t, ad) => gorselAdresi(ad) || t);

  // ---------- kuyruk ----------
  const kuyruk = [], sirada = new Set();
  let calisiyor = false;
  const sha1 = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))), x => x.toString(16).padStart(2, '0')).join('');
  const kanonik = url => {
    const m = /instagram\.com\/(?:[\w.]+\/)?(reel|p|tv)\/([\w-]+)/i.exec(url || '');
    return m ? `https://www.instagram.com/${m[1].toLowerCase()}/${m[2]}/` : url;
  };
  const videoMu = u => /instagram\.com\/(?:[\w.]+\/)?(reel|tv)\//i.test(u) || /youtube\.com\/(watch|shorts)|youtu\.be\//i.test(u);

  function ekle(url, zorla = false) {
    if (!url || !/^https?:\/\//i.test(url) || sirada.has(url)) return;
    if (!zorla && ic.ctx().db.prepare('SELECT 1 FROM link_previews WHERE url=?').get(url)) return;
    sirada.add(url); kuyruk.push(url); calistir();
  }
  async function calistir() {
    if (calisiyor) return;
    calisiyor = true;
    try {
      while (kuyruk.length) {
        const url = kuyruk.shift();
        try { await getir(url); }
        catch (e) {
          if (e.cevrimdisi || e.baglantiYok) { kuyruk.length = 0; sirada.clear(); break; }
          console.warn('Önizleme alınamadı', url, e.message);     // geçici: kayıt yok → sonraki açılışta yeniden denenir
        }
        sirada.delete(url);
        await new Promise(r => setTimeout(r, BEKLE_MS));
      }
    } finally { calisiyor = false; }
  }
  async function getir(url) {
    if (!window.Esitleme || !(await Esitleme.bagliMi())) throw Object.assign(new Error('bağlantı yok'), { baglantiYok: true });
    const r = await Esitleme.cagir('onizleme', { url });     // hata: 'kapak görseli bulunamadı' vb. → kalıcı "hata"
    // Instagram giriş sayfası (başlık "Instagram", görsel = logo) ya da geçici engel → kaydetme, sonra yeniden dene
    if ((!r.ok && r.tekrar) || (r.ok && /^instagram$/i.test((r.baslik || '').trim()))) throw new Error(r.hata || 'Instagram giriş sayfası döndü');
    const db = ic.ctx().db;
    const kaydet = db.prepare(`INSERT INTO link_previews(url,gorsel,video,baslik,durum,fetched_at) VALUES(?,?,?,?,?,datetime('now','localtime'))
      ON CONFLICT(url) DO UPDATE SET gorsel=excluded.gorsel, video=excluded.video, baslik=excluded.baslik, durum=excluded.durum, fetched_at=excluded.fetched_at`);
    if (!r.ok) { kaydet.run(url, null, videoMu(url) ? 1 : 0, null, 'hata'); return Y.kaydet(); }
    const ad = (await sha1(kanonik(url))).slice(0, 16) + '.jpg';
    const { veri, tur } = await kucult(Uint8Array.from(atob(r.gorsel), c => c.charCodeAt(0)), r.tur || 'image/jpeg');
    db.prepare('INSERT INTO gorseller(ad,tur,veri) VALUES(?,?,?) ON CONFLICT(ad) DO UPDATE SET tur=excluded.tur, veri=excluded.veri').run(ad, tur, veri);
    kaydet.run(url, '/gorsel/' + ad, r.video ? 1 : 0, r.baslik || null, 'ok');
    adresler.delete(ad);
    await Y.kaydet();
  }
  // Kapak görselini en fazla 720 px JPEG'e indir (telefonda yer ve eşitleme boyutu için); olmazsa olduğu gibi
  async function kucult(bytes, tur) {
    try {
      const bmp = await createImageBitmap(new Blob([bytes], { type: tur }));
      const k = Math.min(1, 720 / Math.max(bmp.width, bmp.height));
      if (k === 1 && bytes.length < 250e3) return { veri: bytes, tur };
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const b = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
      return { veri: new Uint8Array(await b.arrayBuffer()), tur: 'image/jpeg' };
    } catch { return { veri: bytes, tur }; }
  }
  // Onarım: daha önce Instagram giriş sayfasından kaydedilmiş (logo) önizlemeleri sil → yeniden alınır
  function bozuklariOnar() {
    const db = ic.ctx().db;
    const bozuk = db.prepare("SELECT url FROM link_previews WHERE durum='ok' AND lower(trim(IFNULL(baslik,'')))='instagram'").all();
    if (!bozuk.length) return;
    db.prepare("DELETE FROM link_previews WHERE durum='ok' AND lower(trim(IFNULL(baslik,'')))='instagram'").run();
    Y.kaydet();
    console.info('Onarılacak önizleme:', bozuk.length);
  }
  function eksikleriEkle() {
    ic.ctx().db.prepare(`SELECT DISTINCT b.url FROM blocks b LEFT JOIN link_previews p ON p.url=b.url WHERE b.url IS NOT NULL AND p.url IS NULL`).all()
      .forEach(r => ekle(r.url));
  }

  // Çekirdeğin beklediği arayüz (Node'daki onizleme.js ile aynı)
  const oniz = {
    enqueue: (u, zorla) => ekle(u, zorla),
    enqueueData(data) {
      (data?.sections || []).forEach(s => (s.rows || []).forEach(r => (r.links || []).forEach(l => ekle(l.url))));
      (data?.recipes || []).forEach(r => ekle(r.url));
    },
    enqueueMissing: eksikleriEkle,
    getPreview: url => (url ? ic.ctx().db.prepare('SELECT gorsel, video, durum FROM link_previews WHERE url=?').get(url) || null : null),
  };
  ic.acildiginda((app, ctx) => {
    ctx.oniz = oniz;
    for (const u of adresler.values()) if (u) URL.revokeObjectURL(u);
    adresler = new Map();
  });
  ic.cevapCevir(cevir);

  window.Onizleme = { gorselVeri, eksikleriEkle, bozuklariOnar };
  // Açılışta ve bağlantı gelince eksik görselleri tamamla
  Y.hazir.then(() => { bozuklariOnar(); setTimeout(eksikleriEkle, 3000); }).catch(() => {});
  addEventListener('online', () => eksikleriEkle());
})();
