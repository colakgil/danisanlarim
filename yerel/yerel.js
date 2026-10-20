'use strict';
/* Yerel çalışma: veritabanı cihazda (SQLite-WASM + IndexedDB), /api/… istekleri tarayıcıdaki çekirdeğe gider.
   Sunucu gerekmez. Çekirdek (public/core/) Node sunucusuyla ortaktır; davranış birebir aynıdır. */
(function () {
  const C = window.Cekirdek;

  // ---------- IndexedDB (anahtar → değer) ----------
  const idb = (() => {
    let acik;
    const ac = () => acik || (acik = new Promise((res, rej) => {
      const r = indexedDB.open('danisanlarim', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const islem = (mod, f) => ac().then(d => new Promise((res, rej) => {
      const t = d.transaction('kv', mod);
      const r = f(t.objectStore('kv'));
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
    return {
      get: k => islem('readonly', s => s.get(k)),
      set: (k, v) => islem('readwrite', s => s.put(v, k)),
      // Birden çok anahtar tek işlemde: ya hepsi yazılır ya hiçbiri
      setCok: o => islem('readwrite', s => { let r; for (const [k, v] of Object.entries(o)) r = s.put(v, k); return r; }),
    };
  })();

  // ---------- sql.js → node:sqlite ile aynı arayüz (prepare().get/all/run, exec) ----------
  function sarmala(raw, degisti) {
    const baglanti = p => p.map(v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
    const calistir = (sql, params, f) => {
      const st = raw.prepare(sql);
      try { st.bind(baglanti(params)); return f(st); } finally { st.free(); }
    };
    return {
      raw,
      exec(sql) { raw.exec(sql); degisti(); },
      prepare(sql) {
        return {
          all: (...p) => calistir(sql, p, st => { const o = []; while (st.step()) o.push(st.getAsObject()); return o; }),
          get: (...p) => calistir(sql, p, st => (st.step() ? st.getAsObject() : undefined)),
          run: (...p) => {
            calistir(sql, p, st => st.step());
            const changes = raw.getRowsModified();
            const lastInsertRowid = raw.exec('SELECT last_insert_rowid()')[0].values[0][0];
            if (changes) degisti();
            return { changes, lastInsertRowid };
          },
        };
      },
    };
  }

  // ---------- Express benzeri küçük yönlendirici ----------
  function yonlendirici() {
    const rotalar = [];
    const ekle = m => (yol, ...h) => {
      const anahtar = [];
      const re = new RegExp('^' + yol.replace(/:(\w+)/g, (_, k) => { anahtar.push(k); return '([^/]+)'; }) + '$');
      rotalar.push({ m, re, anahtar, h: h[h.length - 1] });
    };
    async function istek(method, url, body) {
      const u = new URL(url, 'http://yerel');
      const query = {};
      for (const [k, v] of u.searchParams) query[k] = k in query ? [].concat(query[k], v) : v;
      const res = {
        statusCode: 200, headers: {}, body: null,
        status(c) { this.statusCode = c; return this; },
        setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
        type(t) { this.headers['content-type'] = t === 'html' ? 'text/html; charset=utf-8' : t; return this; },
        json(o) { this.headers['content-type'] = 'application/json'; this.body = JSON.stringify(o === undefined ? null : o); this.headersSent = true; },
        send(s) { this.body = s; this.headersSent = true; },
        end(s) { this.body = s == null ? '' : s; this.headersSent = true; },
      };
      const r = rotalar.find(x => x.m === method && x.re.test(u.pathname));
      if (!r) { res.status(404).json({ error: 'Bulunamadı' }); return res; }
      const params = {};
      u.pathname.match(r.re).slice(1).forEach((v, i) => { params[r.anahtar[i]] = decodeURIComponent(v); });
      const req = { method, params, query, body: body || {}, headers: {}, ip: 'yerel' };
      try {
        await r.h(req, res);
      } catch (e) {
        console.error(e);
        if (!res.headersSent) res.status(e.status || 500).json({ error: e.expose ? e.message : 'Hata: ' + e.message });
      }
      return res;
    }
    return { get: ekle('GET'), post: ekle('POST'), put: ekle('PUT'), patch: ekle('PATCH'), delete: ekle('DELETE'), istek };
  }

  // ---------- kayıt: her değişiklik cihaza (IndexedDB) yazılır ----------
  // db: veritabanı dosyası · bekleyen: henüz Drive'a gitmemiş işlemler (çakışmada yeniden uygulanır)
  // esitleme: { surum: Drive'daki hangi sürümün üzerindeyiz, yerelDegisik: gönderilmemiş değişiklik var mı, sayac }
  let raw = null, kirli = false, zamanlayici = null, sessiz = false;
  let bekleyen = [];
  let esitleme = { surum: 0, yerelDegisik: false, sayac: 0 };
  // Yazmalar sıraya girer; kaydet() bekleyen son yazma bitince çözülür (arada yarım kalan kayıt olmaz)
  let sonKayit = Promise.resolve();
  // sql.js export() bağlantıyı kapatıp yeniden açar → PRAGMA'lar sıfırlanır; ilişkili kayıt silme (CASCADE) için yeniden aç
  const disaVer = () => { const b = raw.export(); raw.exec('PRAGMA foreign_keys = ON'); return b; };
  function kaydet() {
    clearTimeout(zamanlayici); zamanlayici = null;
    if (!kirli || !raw) return sonKayit;
    kirli = false;
    const kayit = { db: disaVer(), bekleyen: bekleyen.slice(), esitleme: { ...esitleme } };
    sonKayit = sonKayit.catch(() => {}).then(() => idb.setCok(kayit))
      .catch(e => { kirli = true; throw new Error('Cihaza kaydedilemedi: ' + (e && e.message || e)); });
    return sonKayit;
  }
  const arkaPlanKaydet = () => kaydet().catch(e => console.error(e));
  const degisikliktenSonra = [];   // eşitleme modülü buraya abone olur
  // Arka plandaki değişiklikler (ör. Google Form kontrolü) kısa gecikmeyle yazılır
  const degisti = () => {
    kirli = true;
    if (!sessiz) { esitleme.yerelDegisik = true; esitleme.sayac++; degisikliktenSonra.forEach(f => f()); }
    if (!zamanlayici) zamanlayici = setTimeout(arkaPlanKaydet, 400);
  };
  const isaretle = () => { kirli = true; };
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') arkaPlanKaydet(); });
  addEventListener('pagehide', arkaPlanKaydet);

  // WAL modundaki dosya (Node sunucusundan gelen) sql.js'te açılsın diye başlığı klasik moda çevir
  const walDuzelt = b => { if (b[18] === 2 || b[19] === 2) { b = b.slice(); b[18] = 1; b[19] = 1; } return b; };
  const sqliteMi = b => new TextDecoder().decode(b.slice(0, 15)) === 'SQLite format 3';

  let app = null, SQL = null, ctx = null, cekirdek = null;
  const acmaKancalari = [];        // yeni veritabanı açılınca (önizleme kuyruğu vb.)
  function ac(bytes) {
    if (cekirdek) cekirdek.durdur();
    if (raw) raw.close();
    raw = bytes ? new SQL.Database(walDuzelt(bytes)) : new SQL.Database();
    const db = sarmala(raw, degisti);
    C.sema.kur(db);
    const { getSetting, setSetting } = C.yardim.ayarlar(db);
    const onizleme = { enqueue() {}, enqueueData() {}, enqueueMissing() {}, getPreview: () => null };  // 3. adımda
    ctx = { db, getSetting, setSetting, wrap: f => f, oniz: onizleme };
    app = yonlendirici();
    // Yerelde oturum yok: uygulama cihazın kendisinde
    app.get('/api/auth', (req, res) => res.json({ kurulu: true, girisli: true, marka: getSetting('brand') }));
    app.post('/api/auth/cikis', (req, res) => res.json({ ok: true }));
    // Liste önizleme/PDF uçları: yerel/liste-pdf.js (açılış kancasıyla)
    acmaKancalari.forEach(f => f(app, ctx));
    cekirdek = C.rotalar.register(app, ctx);
  }
  // Başka kaynaktan gelen veritabanını aç (eşitleme/içe aktarma): açılıştaki şema kurulumu "yerel değişiklik" sayılmaz
  function sessizAc(bytes) { sessiz = true; try { ac(bytes); } finally { sessiz = false; } isaretle(); }

  const bosMu = () => !ctx.db.prepare("SELECT 1 FROM settings WHERE key='brand'").get() && !ctx.db.prepare('SELECT 1 FROM clients LIMIT 1').get();

  const hazir = (async () => {
    // Aynı anda iki sekmede açık olursa biri diğerinin kaydını ezer → tek sekme
    if (navigator.locks) {
      const kilit = await new Promise(res => navigator.locks.request('danisanlarim-db', { ifAvailable: true }, l => { res(!!l); return l ? new Promise(() => {}) : null; }));
      if (!kilit) throw Object.assign(new Error('Uygulama başka bir sekmede açık. O sekmeyi kapatıp sayfayı yenileyin.'), { sekme: true });
    }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    SQL = await initSqlJs({ locateFile: f => 'vendor/' + f });
    const [b, bk, es] = await Promise.all([idb.get('db'), idb.get('bekleyen'), idb.get('esitleme')]);
    bekleyen = Array.isArray(bk) ? bk : [];
    if (es) esitleme = { ...esitleme, ...es };
    if (b) sessizAc(new Uint8Array(b));
    else ac(null);           // yepyeni cihaz: şema kurulumu bir değişiklik değil
    if (!b) { esitleme.yerelDegisik = false; isaretle(); }
    await kaydet();
  })();

  // Bekleyen işlem kaydı: aynı adrese art arda gelen PUT/PATCH'ler (ör. liste otomatik kaydı) tek işleme iner
  function islemEkle(method, url, body, sonuc) {
    if (method === 'PUT' || method === 'PATCH') bekleyen = bekleyen.filter(o => !(o.m === method && o.u === url));
    bekleyen.push({ m: method, u: url, b: body === undefined ? null : body, r: sonuc });
  }

  // Cevap metnini çeviren kancalar (ör. /gorsel/… → cihazdaki görselin adresi)
  const cevapCeviriciler = [];
  // Değişiklik cihaza yazılmadan cevap dönmez: "kaydedildi" görünen her şey uygulama hemen kapansa da kalır
  async function istek(method, url, body) {
    await hazir;
    const once = esitleme.sayac;
    const r = await app.istek(method, url, body);
    if (typeof r.body === 'string' && /json|html/.test(r.headers['content-type'] || '')) for (const f of cevapCeviriciler) r.body = f(r.body);
    if (method !== 'GET' && r.statusCode < 400 && esitleme.sayac !== once) {
      let sonuc = null; try { sonuc = JSON.parse(r.body); } catch { /* */ }
      islemEkle(method, url, body, sonuc);
      isaretle();
    }
    await kaydet();
    return r;
  }

  // app.js'teki fetch('/api/…') çağrıları sunucu yerine buraya gelir
  const asilFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    // input: metin, URL nesnesi (ör. Google Form adresi) ya da Request
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith('/api/')) return asilFetch(input, init);
    const body = init.body ? JSON.parse(init.body) : undefined;
    const r = await istek((init.method || 'GET').toUpperCase(), url, body);
    return new Response(r.body, { status: r.statusCode, headers: r.headers });
  };

  window.Yerel = {
    hazir,
    istek,
    bosMu: async () => { await hazir; return bosMu(); },
    // Yedek dosyasından (SQLite .db) tüm veriyi al — bu cihazın yeni verisi olur, Drive'a da gönderilir
    async icerAktar(file) {
      await hazir;
      const b = new Uint8Array(await file.arrayBuffer());
      if (!sqliteMi(b)) throw new Error('Bu bir Danışanlarım veri dosyası değil.');
      const once = disaVer();
      try { sessizAc(b); }
      catch (e) { sessizAc(once); throw new Error('Dosya açılamadı: ' + e.message); }
      bekleyen = [];
      esitleme = { ...esitleme, yerelDegisik: true, sayac: esitleme.sayac + 1 };
      isaretle();
      await kaydet();
      degisikliktenSonra.forEach(f => f());
    },
    // Tüm veritabanı dosyası (yedek / eşitleme için)
    async disaAktar() { await hazir; await kaydet(); return disaVer(); },
    kaydet,
    // ---- eşitleme modülünün (esitleme.js) kullandığı iç arayüz ----
    _ic: {
      idb,
      durum: () => ({ ...esitleme, bekleyenSayisi: bekleyen.length }),
      ctx: () => ctx,
      bosMu,
      degisiklikte: f => degisikliktenSonra.push(f),
      acildiginda: f => acmaKancalari.push(f),
      cevapCevir: f => cevapCeviriciler.push(f),
      // Gönderilecek anlık görüntü: veritabanı + o ana kadarki işlem sayısı
      anlik() { return { veri: disaVer(), sayac: esitleme.sayac, adet: bekleyen.length }; },
      // Drive'a yazıldı: o ana kadarki işlemler gitti; sonradan gelen değişiklik yoksa temiz
      async gonderildi(surum, a) {
        esitleme.surum = surum;
        bekleyen = bekleyen.slice(a.adet);
        esitleme.yerelDegisik = esitleme.sayac !== a.sayac;
        isaretle(); await kaydet();
      },
      // Drive'daki sürümü al (bu cihazda gönderilmemiş değişiklik yokken)
      async indirildi(bytes, surum) {
        sessizAc(bytes);
        esitleme.surum = surum; esitleme.yerelDegisik = false; bekleyen = [];
        isaretle(); await kaydet();
      },
      // Çakışma: Drive'daki yeni sürümün üzerine bu cihazın bekleyen işlemlerini yeniden uygula
      async birlestir(bytes, surum, yenidenYaz) {
        const yedek = disaVer();
        const eski = bekleyen.slice();
        sessizAc(bytes);
        const harita = {}, yeni = [], atlanan = [];
        for (const o of eski) {
          const { u, b } = yenidenYaz.yol(o, harita);
          const r = await app.istek(o.m, u, b);
          let sonuc = null; try { sonuc = JSON.parse(r.body); } catch { /* */ }
          if (r.statusCode < 400) { yenidenYaz.esle(o, sonuc, harita); yeni.push({ m: o.m, u, b, r: sonuc }); }
          else atlanan.push({ ...o, hata: sonuc && sonuc.error });
        }
        bekleyen = yeni;
        esitleme.surum = surum;
        esitleme.yerelDegisik = yeni.length > 0;
        esitleme.sayac++;
        isaretle();
        await idb.set('catisma-yedegi', { zaman: new Date().toISOString(), db: yedek, islemler: eski, atlanan });
        await kaydet();
        return { uygulanan: yeni.length, atlanan };
      },
    },
  };
})();
