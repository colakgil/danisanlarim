// Google Form (Hasta Takip Kartı) başvuruları: Apps Script web uygulamasından çekilir, onaylanınca danışana dönüştürülür.
// Node ve tarayıcıda aynı.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./yardim'));
  else (root.Cekirdek = root.Cekirdek || {}).basvuru = factory(root.Cekirdek.yardim);
})(typeof self !== 'undefined' ? self : this, function (Y) {
  'use strict';
  const telKey = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('90') && d.length === 12) d = d.slice(2); if (d.startsWith('0')) d = d.slice(1); return d.slice(-10); };
  const num = v => { if (v == null || v === '') return null; const n = Number(String(v).replace(',', '.').replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; };
  const str = v => (v == null ? null : String(Array.isArray(v) ? v.join(', ') : v).trim() || null);

  // Form cevabını danışan alanları + takip kartı (anamnez) yapısına çevirir
  function donustur(c) {
    const k = {
      ad_soyad: str(c['k.ad_soyad']), telefon: str(c['k.telefon']), dogum_tarihi: /^\d{4}-\d{2}-\d{2}$/.test(c['k.dogum_tarihi'] || '') ? c['k.dogum_tarihi'] : null,
      cinsiyet: str(c['k.cinsiyet']), meslek: str(c['k.meslek']), sehir: str(c['k.sehir']), ilce: str(c['k.ilce']),
      tc_kimlik: Y.tcTemiz(c['k.tc_kimlik']), adres: str(c['k.adres']),   // adres: Ekim 2026 öncesi cevaplar
      baslangic_kilo: num(c['k.baslangic_kilo']), boy_cm: num(c['k.boy_cm']), hedef_kilo: num(c['k.hedef_kilo']), hedef: str(c['k.hedef']),
    };
    const a = { saglik: {}, aliskanlik: {}, tuketim: {}, kilo: {}, aktivite: {}, gunluk: [] };
    for (const [key, val] of Object.entries(c)) {
      const [grp, alan, parca] = key.split('.');
      if (['saglik', 'aliskanlik', 'aktivite'].includes(grp)) {
        const x = (a[grp][alan] ||= {});
        if (parca === 'v') x.v = /var/i.test(val) ? 'var' : /yok/i.test(val) ? 'yok' : '';
        else if (parca === 'a') { x.a = str(val) || ''; if (x.a && !x.v) x.v = 'var'; }
      } else if (grp === 'tuketim') {
        if (['asitli', 'alkol'].includes(alan)) a.tuketim[alan] = /evet/i.test(val) ? 'evet' : /hay/i.test(val) ? 'hayir' : undefined;
        else { const n = num(val); if (n != null) a.tuketim[alan] = n; }
      } else if (grp === 'kilo') { if (str(val)) a.kilo[alan] = str(val); }
    }
    const OGUN = [['sabah', 'Sabah'], ['ara1', 'Ara'], ['ogle', 'Öğle'], ['ara2', 'Ara'], ['aksam', 'Akşam'], ['gece', 'Gece']];
    for (const [key, ad] of OGUN) {
      const t = str(c['gunluk.' + key]); if (!t) continue;
      const m = /^\s*(\d{1,2}(?:[.:]\d{2})?)\s*[-–—:]?\s*(.*)$/s.exec(t);   // "09.30 – yumurta…" → saat + içerik
      a.gunluk.push(m && m[2] ? { ogun: ad, saat: m[1], icerik: m[2] } : { ogun: ad, saat: '', icerik: t });
    }
    a.notlar = str(c.notlar) || '';
    a.kaynak = 'Google Form';
    return { k, a };
  }

  function register(app, { db, getSetting, setSetting, wrap }) {
    const { httpErr } = Y;
    const ayar = () => getSetting('googleForm', {}) || {};
    // Son kontrol zamanı ve hata bu cihaza/sürece özel: veritabanına yazılmaz (eşitlemede her dakika boş değişiklik olmasın)
    const anlik = { sonKontrol: null, hata: null };

    async function cek({ tumu = false } = {}) {
      const g = ayar();
      if (!g.url || !g.anahtar) throw httpErr(400, 'Google Form bağlantısı ayarlanmamış.');
      const u = new URL(g.url);
      u.searchParams.set('anahtar', g.anahtar);
      if (!tumu && g.sonZaman) u.searchParams.set('since', String(g.sonZaman + 1));
      const r = await fetch(u, { redirect: 'follow' });
      const txt = await r.text();
      let j; try { j = JSON.parse(txt); } catch { throw httpErr(502, 'Google\'dan beklenmeyen cevap geldi. Web uygulaması "Herkes" erişimiyle dağıtıldı mı?'); }
      if (!j.ok) throw httpErr(502, j.hata === 'yetkisiz' ? 'Gizli anahtar hatalı.' : 'Google Form hatası: ' + (j.hata || ''));
      const ins = db.prepare('INSERT OR IGNORE INTO form_basvurulari(id,zaman,ad_soyad,telefon,veri) VALUES(?,?,?,?,?)');
      let yeni = 0, son = g.sonZaman || 0;
      for (const x of j.cevaplar || []) {
        const res = ins.run(x.id, x.zaman, str(x.cevaplar['k.ad_soyad']), str(x.cevaplar['k.telefon']), JSON.stringify(x.cevaplar));
        if (res.changes) yeni++;
        son = Math.max(son, x.zaman);
      }
      anlik.sonKontrol = new Date().toISOString(); anlik.hata = null;
      const link = j.link || g.link;
      if (son !== (g.sonZaman || 0) || link !== g.link || g.sonKontrol || g.hata) {
        const { sonKontrol, hata, ...kalici } = ayar();
        setSetting('googleForm', { ...kalici, sonZaman: son, link });
      }
      return { yeni };
    }

    // Arka planda dakikada bir kontrol + ekran açıldığında anında kontrol (en fazla 15 sn'de bir)
    let calisan = null;
    const kontrolEt = (enAzSn = 0) => {
      const g = ayar(); if (!g.url || !g.anahtar) return Promise.resolve();
      if (calisan) return calisan;
      if (enAzSn && anlik.sonKontrol && Date.now() - Date.parse(anlik.sonKontrol) < enAzSn * 1000) return Promise.resolve();
      calisan = cek().catch(e => { anlik.hata = e.message; anlik.sonKontrol = new Date().toISOString(); })
        .finally(() => { calisan = null; });
      return calisan;
    };
    const zamanlayici = setInterval(() => kontrolEt(), 60 * 1000);
    if (zamanlayici && zamanlayici.unref) zamanlayici.unref();

    const eslesen = telefon => {
      const t = telKey(telefon); if (t.length < 10) return null;
      return db.prepare('SELECT id, ad_soyad, telefon FROM clients').all().find(c => telKey(c.telefon) === t) || null;
    };

    app.get('/api/google-form', wrap(async (req, res) => {
      if (req.query.kontrol) await Promise.race([kontrolEt(15), new Promise(r => setTimeout(r, 6000))]);
      const g = ayar();
      res.json({ url: g.url || '', anahtarVar: !!g.anahtar, link: g.link || '', sonKontrol: anlik.sonKontrol || g.sonKontrol || null, hata: anlik.hata || null,
        yeni: db.prepare("SELECT COUNT(*) n FROM form_basvurulari WHERE durum='yeni'").get().n });
    }));
    app.put('/api/google-form', wrap(async (req, res) => {
      const url = String(req.body.url || '').trim();
      if (url && !/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) throw httpErr(400, 'Adres "https://script.google.com/…" ile başlamalı.');
      const g = { ...ayar(), url, link: String(req.body.link || '').trim() || ayar().link };
      if (req.body.anahtar) g.anahtar = String(req.body.anahtar).trim();
      setSetting('googleForm', g);
      // Bağlantıyı dene
      if (g.url && g.anahtar) {
        const u = new URL(g.url); u.searchParams.set('anahtar', g.anahtar); u.searchParams.set('test', '1');
        let j; try { j = await fetch(u, { redirect: 'follow' }).then(r => r.json()); } catch { throw httpErr(502, 'Bağlanılamadı. Adresi ve web uygulaması dağıtımını kontrol edin.'); }
        if (!j.ok) throw httpErr(400, j.hata === 'yetkisiz' ? 'Gizli anahtar hatalı.' : 'Bağlantı kurulamadı.');
        setSetting('googleForm', { ...ayar(), link: j.link || g.link, hata: null });
        return res.json({ ok: true, baslik: j.baslik, cevapSayisi: j.cevapSayisi, link: j.link });
      }
      res.json({ ok: true });
    }));
    app.post('/api/basvurular/kontrol', wrap(async (req, res) => res.json(await cek({ tumu: !!req.body.tumu }))));

    app.get('/api/basvurular', wrap(async (req, res) => {
      await Promise.race([kontrolEt(15), new Promise(r => setTimeout(r, 8000))]);
      const rows = db.prepare(`SELECT b.id, b.zaman, b.ad_soyad, b.telefon, b.durum, b.client_id, b.veri, c.ad_soyad AS danisan
        FROM form_basvurulari b LEFT JOIN clients c ON c.id=b.client_id WHERE b.durum != 'silindi' ORDER BY b.durum='yeni' DESC, b.zaman DESC LIMIT 200`).all();
      res.json(rows.map(r => {
        const d = r.veri ? donustur(JSON.parse(r.veri)) : null;
        return { ...r, veri: undefined, kvkk: r.veri ? !!JSON.parse(r.veri).kvkk : null, onizleme: d, eslesen: r.durum === 'yeni' ? eslesen(r.telefon) : null };
      }));
    }));

    // Onay: yeni danışan olarak ekle ya da mevcut danışana işle
    app.post('/api/basvurular/:id/aktar', wrap((req, res) => {
      const b = db.prepare('SELECT * FROM form_basvurulari WHERE id=?').get(req.params.id);
      if (!b || !b.veri) throw httpErr(404, 'Başvuru bulunamadı.');
      const { k, a } = donustur(JSON.parse(b.veri));
      a.tarih = new Date(b.zaman).toISOString().slice(0, 10);
      const hedefId = Number(req.body.client_id) || null;
      let cid;
      if (hedefId) {
        const c = db.prepare('SELECT * FROM clients WHERE id=?').get(hedefId);
        if (!c) throw httpErr(404, 'Danışan bulunamadı.');
        // Formda dolu gelen alanlar mevcut bilginin üzerine yazılır; boş gelenler dokunulmaz
        const set = Object.entries(k).filter(([key, v]) => v != null && key !== 'baslangic_kilo');
        if (set.length) db.prepare(`UPDATE clients SET ${set.map(([key]) => key + '=?').join(',')}, updated_at=datetime('now','localtime') WHERE id=?`).run(...set.map(([, v]) => v), hedefId);
        cid = hedefId;
      } else {
        if (!k.ad_soyad) throw httpErr(400, 'Başvuruda ad soyad yok.');
        const keys = Object.keys(k).filter(key => k[key] != null);
        cid = Number(db.prepare(`INSERT INTO clients(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`).run(...keys.map(key => k[key])).lastInsertRowid);
        if (k.baslangic_kilo) db.prepare('INSERT INTO visits(client_id,tarih,kilo,notlar) VALUES(?,?,?,?)').run(cid, a.tarih, k.baslangic_kilo, 'Takip kartı (Google Form)');
      }
      db.prepare('UPDATE clients SET anamnez=?, hastaliklar=?, ilaclar=?, alerjiler=?, sevmedikleri=? WHERE id=?').run(JSON.stringify(a),
        a.saglik.tani?.v === 'var' ? a.saglik.tani.a || 'Var' : null, a.saglik.ilac?.v === 'var' ? a.saglik.ilac.a || 'Var' : null,
        a.saglik.alerji?.v === 'var' ? a.saglik.alerji.a || 'Var' : null, a.aliskanlik.tuketmedigi?.v === 'var' ? a.aliskanlik.tuketmedigi.a || 'Var' : null, cid);
      db.prepare("UPDATE form_basvurulari SET durum='aktarildi', client_id=? WHERE id=?").run(cid, b.id);
      res.json({ client_id: cid });
    }));
    // Silme: sağlık verisi uygulamada tutulmasın diye içerik de boşaltılır (Google Form'daki cevap ayrıca silinmeli)
    app.delete('/api/basvurular/:id', wrap((req, res) => {
      db.prepare("UPDATE form_basvurulari SET durum='silindi', veri=NULL, ad_soyad=NULL, telefon=NULL WHERE id=?").run(req.params.id);
      res.json({ ok: true });
    }));
    return { durdur: () => clearInterval(zamanlayici) };
  }

  return { register, donustur };
});
