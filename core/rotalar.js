// Uygulamanın veri uçları (/api/…) — Node sunucusunda Express'e, tarayıcıda yerel yönlendiriciye bağlanır.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./yardim'), require('./finans'), require('./basvuru'), require('./icerik-paketi'));
  else { const C = root.Cekirdek; C.rotalar = factory(C.yardim, C.finans, C.basvuru, C.icerikPaketi); }
})(typeof self !== 'undefined' ? self : this, function (Y, Finans, Basvuru, Paket) {
  'use strict';
  const { today, addDays, num, str, httpErr, cleanUrl, normalizeData, tcGecerli, tcTemiz } = Y;
  const rastgeleHex = n => {
    const a = new Uint8Array(n);
    globalThis.crypto.getRandomValues(a);
    return Array.from(a, x => x.toString(16).padStart(2, '0')).join('');
  };

  // ctx: { db, getSetting, setSetting, wrap, oniz }
  function register(app, ctx) {
    const { db, getSetting, setSetting, wrap, oniz } = ctx;
    let fin = null;   // Finans.register sonrası: clientFinance vb.

    // ---------- danışanlar ----------
    const CLIENT_FIELDS = {
      ad_soyad: str, telefon: str, email: str, dogum_tarihi: str, cinsiyet: str, meslek: str, sehir: str,
      boy_cm: num, baslangic_kilo: num, hedef_kilo: num, hedef: str,
      hastaliklar: str, ilaclar: str, alerjiler: str, sevmedikleri: str, aliskanliklar: str, notlar: str,
      paket: str, paket_baslangic: str, paket_bitis: str, ucret: num, gorusme_tipi: str,
      sonraki_kontrol: str, durum: str, adres: str, ilce: str, tc_kimlik: tcTemiz,
      anamnez: v => (v && typeof v === 'object' ? JSON.stringify(v).slice(0, 60000) : null),
    };
    function pickClient(body) {
      const out = {};
      for (const [k, f] of Object.entries(CLIENT_FIELDS)) if (k in body) out[k] = f(body[k]);
      // Takip kartındaki temel maddeleri arama/özet için düz alanlara da yaz
      if (body.anamnez && typeof body.anamnez === 'object') {
        const g = (grp, k) => { const x = body.anamnez[grp]?.[k]; return x && x.v === 'var' ? str(x.a) || 'Var' : null; };
        out.hastaliklar = g('saglik', 'tani'); out.ilaclar = g('saglik', 'ilac'); out.alerjiler = g('saglik', 'alerji');
        out.sevmedikleri = g('aliskanlik', 'tuketmedigi');
      }
      if (out.tc_kimlik && !tcGecerli(out.tc_kimlik)) throw httpErr(400, 'TC kimlik numarası geçersiz (11 hane olmalı, kontrol hanesi tutmuyor).');
      return out;
    }

    const CLIENT_LIST_SQL = `
      SELECT c.*,
        (SELECT kilo FROM visits v WHERE v.client_id=c.id AND kilo IS NOT NULL ORDER BY tarih DESC, id DESC LIMIT 1) AS son_kilo,
        (SELECT tarih FROM visits v WHERE v.client_id=c.id ORDER BY tarih DESC, id DESC LIMIT 1) AS son_gorusme,
        (SELECT COUNT(*) FROM diet_lists l WHERE l.client_id=c.id) AS liste_sayisi,
        ${Finans.BAKIYE_SQL} AS bakiye
      FROM clients c`;

    app.get('/api/clients', wrap((req, res) => {
      const q = `%${(req.query.q || '').trim()}%`;
      const durum = req.query.durum || 'aktif';
      const rows = db.prepare(`${CLIENT_LIST_SQL}
        WHERE (c.ad_soyad LIKE ? OR IFNULL(c.telefon,'') LIKE ? OR IFNULL(c.email,'') LIKE ? OR IFNULL(c.tc_kimlik,'') LIKE ?)
          AND (? = 'hepsi' OR c.durum = ?)
        ORDER BY c.ad_soyad COLLATE NOCASE`).all(q, q, q, q, durum, durum);
      res.json(rows);
    }));

    app.post('/api/clients', wrap((req, res) => {
      const c = pickClient(req.body);
      if (!c.ad_soyad) throw httpErr(400, 'Ad soyad zorunlu.');
      const keys = Object.keys(c);
      const r = db.prepare(`INSERT INTO clients(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`).run(...keys.map(k => c[k]));
      // Başlangıç kilosu girildiyse ilk ölçüm kaydını da aç
      if (c.baslangic_kilo) {
        db.prepare('INSERT INTO visits(client_id,tarih,kilo,notlar) VALUES(?,?,?,?)')
          .run(r.lastInsertRowid, c.paket_baslangic || today(), c.baslangic_kilo, 'İlk görüşme');
      }
      res.json({ id: Number(r.lastInsertRowid) });
    }));

    app.get('/api/clients/:id', wrap((req, res) => {
      const c = db.prepare(`${CLIENT_LIST_SQL} WHERE c.id=?`).get(req.params.id);
      if (!c) throw httpErr(404, 'Danışan bulunamadı.');
      c.visits = db.prepare('SELECT * FROM visits WHERE client_id=? ORDER BY tarih DESC, id DESC').all(c.id);
      c.lists = db.prepare('SELECT id,baslik,tarih,kilo,created_at,updated_at FROM diet_lists WHERE client_id=? ORDER BY tarih DESC, id DESC').all(c.id);
      c.appointments = db.prepare('SELECT * FROM appointments WHERE client_id=? ORDER BY tarih DESC, saat DESC').all(c.id);
      Object.assign(c, fin.clientFinance(c.id));
      res.json(c);
    }));

    app.put('/api/clients/:id', wrap((req, res) => {
      const c = pickClient(req.body);
      if ('ad_soyad' in c && !c.ad_soyad) throw httpErr(400, 'Ad soyad zorunlu.');
      const keys = Object.keys(c);
      if (keys.length) {
        db.prepare(`UPDATE clients SET ${keys.map(k => `${k}=?`).join(',')}, updated_at=datetime('now','localtime') WHERE id=?`)
          .run(...keys.map(k => c[k]), req.params.id);
      }
      res.json({ ok: true });
    }));

    app.delete('/api/clients/:id', wrap((req, res) => {
      db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id);
      res.json({ ok: true });
    }));

    // ---------- kontroller / ölçümler ----------
    const VISIT_FIELDS = { tarih: str, kilo: num, bel: num, kalca: num, gogus: num, kol: num, bacak: num, yag_orani: num, kas_kutlesi: num, su_orani: num, notlar: str };
    function pickVisit(body) {
      const out = {};
      for (const [k, f] of Object.entries(VISIT_FIELDS)) if (k in body) out[k] = f(body[k]);
      return out;
    }
    app.post('/api/clients/:id/visits', wrap((req, res) => {
      const v = pickVisit(req.body);
      v.tarih = v.tarih || today();
      const keys = Object.keys(v);
      const r = db.prepare(`INSERT INTO visits(client_id,${keys.join(',')}) VALUES(?,${keys.map(() => '?').join(',')})`)
        .run(req.params.id, ...keys.map(k => v[k]));
      db.prepare("UPDATE appointments SET durum='tamamlandi' WHERE client_id=? AND tarih=? AND durum='planli'").run(req.params.id, v.tarih);
      syncNextControl(req.params.id);
      res.json({ id: Number(r.lastInsertRowid) });
    }));
    app.put('/api/visits/:id', wrap((req, res) => {
      const v = pickVisit(req.body);
      const keys = Object.keys(v);
      if (keys.length) db.prepare(`UPDATE visits SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`).run(...keys.map(k => v[k]), req.params.id);
      res.json({ ok: true });
    }));
    app.delete('/api/visits/:id', wrap((req, res) => {
      db.prepare('DELETE FROM visits WHERE id=?').run(req.params.id);
      res.json({ ok: true });
    }));

    // ---------- randevular ----------
    // Danışanın "sonraki kontrol" tarihi = ileri tarihli ilk planlı randevu
    function syncNextControl(clientId) {
      const n = db.prepare("SELECT tarih FROM appointments WHERE client_id=? AND durum='planli' AND tarih >= ? ORDER BY tarih, saat LIMIT 1").get(clientId, today());
      db.prepare('UPDATE clients SET sonraki_kontrol=? WHERE id=?').run(n ? n.tarih : null, clientId);
    }
    const APPT_SQL = `SELECT a.*, c.ad_soyad, c.telefon, c.durum AS danisan_durum FROM appointments a JOIN clients c ON c.id = a.client_id`;
    function pickAppt(b) {
      const o = {};
      if ('client_id' in b) o.client_id = Number(b.client_id) || null;
      if ('tarih' in b) o.tarih = /^\d{4}-\d{2}-\d{2}$/.test(b.tarih) ? b.tarih : null;
      if ('saat' in b) o.saat = /^\d{2}:\d{2}$/.test(b.saat) ? b.saat : null;
      if ('sure_dk' in b) o.sure_dk = Math.min(Math.max(Number(b.sure_dk) || 45, 5), 480);
      for (const k of ['tur', 'kanal', 'notlar']) if (k in b) o[k] = str(b[k]);
      if ('durum' in b) o.durum = ['planli', 'tamamlandi', 'gelmedi', 'iptal'].includes(b.durum) ? b.durum : 'planli';
      return o;
    }
    app.get('/api/appointments', wrap((req, res) => {
      const from = req.query.from || today(), to = req.query.to || addDays(from, 42);
      res.json(db.prepare(`${APPT_SQL} WHERE a.tarih BETWEEN ? AND ? ORDER BY a.tarih, a.saat`).all(from, to));
    }));
    app.post('/api/appointments', wrap((req, res) => {
      const a = pickAppt(req.body);
      if (!a.client_id || !a.tarih || !a.saat) throw httpErr(400, 'Danışan, tarih ve saat gerekli.');
      if (!db.prepare('SELECT 1 FROM clients WHERE id=?').get(a.client_id)) throw httpErr(404, 'Danışan bulunamadı.');
      // Tekrarlı randevu: her N günde bir, toplam adet kadar
      const aralik = Math.max(Number(req.body.tekrar_gun) || 0, 0);
      const adet = aralik ? Math.min(Math.max(Number(req.body.tekrar_adet) || 1, 1), 26) : 1;
      const keys = Object.keys(a).filter(k => k !== 'tarih');
      const ins = db.prepare(`INSERT INTO appointments(tarih,${keys.join(',')}) VALUES(?,${keys.map(() => '?').join(',')})`);
      const ids = [];
      for (let i = 0; i < adet; i++) ids.push(Number(ins.run(addDays(a.tarih, i * aralik), ...keys.map(k => a[k])).lastInsertRowid));
      syncNextControl(a.client_id);
      res.json({ ids });
    }));
    app.put('/api/appointments/:id', wrap((req, res) => {
      const old = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
      if (!old) throw httpErr(404, 'Randevu bulunamadı.');
      const a = pickAppt(req.body);
      for (const k of ['client_id', 'tarih', 'saat']) if (k in a && !a[k]) throw httpErr(400, 'Danışan, tarih ve saat gerekli.');
      const keys = Object.keys(a);
      if (keys.length) db.prepare(`UPDATE appointments SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`).run(...keys.map(k => a[k]), req.params.id);
      syncNextControl(old.client_id);
      if (a.client_id && a.client_id !== old.client_id) syncNextControl(a.client_id);
      res.json({ ok: true });
    }));
    app.delete('/api/appointments/:id', wrap((req, res) => {
      const old = db.prepare('SELECT client_id FROM appointments WHERE id=?').get(req.params.id);
      db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
      if (old) syncNextControl(old.client_id);
      res.json({ ok: true });
    }));
    app.get('/api/takvim-linki', wrap((req, res) => {
      let t = getSetting('icsToken');
      if (!t || req.query.yenile) { t = rastgeleHex(18); setSetting('icsToken', t); }
      res.json({ yol: `/takvim/${t}.ics` });
    }));

    // ---------- diyet listeleri ----------
    const loadList = id => {
      const l = db.prepare('SELECT * FROM diet_lists WHERE id=?').get(id);
      if (!l) throw httpErr(404, 'Liste bulunamadı.');
      l.data = JSON.parse(l.data);
      return l;
    };

    app.post('/api/clients/:id/lists', wrap((req, res) => {
      const cid = req.params.id;
      const client = db.prepare(`${CLIENT_LIST_SQL} WHERE c.id=?`).get(cid);
      if (!client) throw httpErr(404, 'Danışan bulunamadı.');
      let data;
      const { kaynak, sablonId, listeId } = req.body;          // kaynak: bos | sablon | liste
      if (kaynak === 'sablon') {
        const t = db.prepare('SELECT data FROM templates WHERE id=?').get(sablonId);
        if (!t) throw httpErr(404, 'Şablon bulunamadı.');
        data = JSON.parse(t.data);
      } else if (kaynak === 'liste') {
        data = loadList(listeId).data;
      } else {
        data = { sections: [{ title: 'SAĞLIKLI BESLENME PROGRAMI', rows: [
          { label: 'SABAH', time: '08.30', content: '' }, { label: 'ARA', time: '10.30', content: '' },
          { label: 'ÖĞLE', time: '12.30', content: '' }, { label: 'ARA', time: '15.30', content: '' },
          { label: 'AKŞAM', time: '19.00', content: '' }, { label: 'ARA', time: '21.00', content: '' }] }],
          notes: getSetting('defaultNotes', []), recipes: [] };
      }
      data = normalizeData(data);
      const r = db.prepare('INSERT INTO diet_lists(client_id,baslik,tarih,kilo,data) VALUES(?,?,?,?,?)')
        .run(cid, str(req.body.baslik), req.body.tarih || today(), num(req.body.kilo) ?? client.son_kilo ?? null, JSON.stringify(data));
      res.json({ id: Number(r.lastInsertRowid) });
    }));

    app.get('/api/lists/:id', wrap((req, res) => {
      const l = loadList(req.params.id);
      l.client = db.prepare('SELECT id,ad_soyad,telefon FROM clients WHERE id=?').get(l.client_id);
      res.json(l);
    }));
    app.put('/api/lists/:id', wrap((req, res) => {
      loadList(req.params.id);
      db.prepare(`UPDATE diet_lists SET baslik=?, tarih=?, kilo=?, data=?, updated_at=datetime('now','localtime') WHERE id=?`)
        .run(str(req.body.baslik), req.body.tarih || today(), num(req.body.kilo), JSON.stringify(normalizeData(req.body.data)), req.params.id);
      oniz.enqueueData(normalizeData(req.body.data));
      res.json({ ok: true });
    }));
    app.delete('/api/lists/:id', wrap((req, res) => {
      db.prepare('DELETE FROM diet_lists WHERE id=?').run(req.params.id);
      res.json({ ok: true });
    }));

    // Listeyi şablon olarak kaydet
    app.post('/api/lists/:id/sablon', wrap((req, res) => {
      const l = loadList(req.params.id);
      const ad = str(req.body.ad);
      if (!ad) throw httpErr(400, 'Şablon adı gerekli.');
      const r = db.prepare('INSERT INTO templates(ad,aciklama,data) VALUES(?,?,?)').run(ad, str(req.body.aciklama), JSON.stringify(l.data));
      res.json({ id: Number(r.lastInsertRowid) });
    }));

    // ---------- şablonlar ----------
    app.get('/api/templates', wrap((req, res) => {
      res.json(db.prepare('SELECT id,ad,aciklama,updated_at FROM templates ORDER BY ad COLLATE NOCASE').all());
    }));
    app.get('/api/templates/:id', wrap((req, res) => {
      const t = db.prepare('SELECT * FROM templates WHERE id=?').get(req.params.id);
      if (!t) throw httpErr(404, 'Şablon bulunamadı.');
      t.data = JSON.parse(t.data);
      res.json(t);
    }));
    app.post('/api/templates', wrap((req, res) => {
      const ad = str(req.body.ad);
      if (!ad) throw httpErr(400, 'Şablon adı gerekli.');
      const data = normalizeData(req.body.data || { sections: [{ title: 'SAĞLIKLI BESLENME PROGRAMI', rows: [] }], notes: getSetting('defaultNotes', []) });
      const r = db.prepare('INSERT INTO templates(ad,aciklama,data) VALUES(?,?,?)').run(ad, str(req.body.aciklama), JSON.stringify(data));
      res.json({ id: Number(r.lastInsertRowid) });
    }));
    app.put('/api/templates/:id', wrap((req, res) => {
      const ad = str(req.body.ad);
      if (!ad) throw httpErr(400, 'Şablon adı gerekli.');
      db.prepare(`UPDATE templates SET ad=?, aciklama=?, data=?, updated_at=datetime('now','localtime') WHERE id=?`)
        .run(ad, str(req.body.aciklama), JSON.stringify(normalizeData(req.body.data)), req.params.id);
      res.json({ ok: true });
    }));
    app.delete('/api/templates/:id', wrap((req, res) => {
      db.prepare('DELETE FROM templates WHERE id=?').run(req.params.id);
      res.json({ ok: true });
    }));

    // ---------- hazır metin kütüphanesi ----------
    app.get('/api/blocks', wrap((req, res) => {
      res.json(db.prepare(`SELECT b.*, p.gorsel, p.video, p.durum AS onizleme FROM blocks b LEFT JOIN link_previews p ON p.url = b.url
        ORDER BY b.tur, b.kategori, b.baslik COLLATE NOCASE`).all());
    }));
    app.post('/api/blocks', wrap((req, res) => {
      const b = { tur: str(req.body.tur) || 'ogun', kategori: str(req.body.kategori), baslik: str(req.body.baslik), icerik: String(req.body.icerik || '').trim(), url: cleanUrl(req.body.url) || null };
      if (!b.baslik || (!b.icerik && !b.url)) throw httpErr(400, 'Başlık ve içerik (ya da tarif linki) gerekli.');
      if (b.tur === 'tarif') b.kategori = Paket.tekMevsim(b.kategori, b.baslik, b.icerik);
      const r = db.prepare('INSERT INTO blocks(tur,kategori,baslik,icerik,url) VALUES(?,?,?,?,?)').run(b.tur, b.kategori, b.baslik, b.icerik, b.url);
      oniz.enqueue(b.url);
      res.json({ id: Number(r.lastInsertRowid) });
    }));
    app.put('/api/blocks/:id', wrap((req, res) => {
      const tur = str(req.body.tur) || 'ogun', baslik = str(req.body.baslik), icerik = String(req.body.icerik || '').trim();
      const kategori = tur === 'tarif' ? Paket.tekMevsim(str(req.body.kategori), baslik, icerik) : str(req.body.kategori);
      db.prepare('UPDATE blocks SET tur=?, kategori=?, baslik=?, icerik=?, url=? WHERE id=?')
        .run(tur, kategori, baslik, icerik, cleanUrl(req.body.url) || null, req.params.id);
      oniz.enqueue(cleanUrl(req.body.url));
      res.json({ ok: true });
    }));
    app.delete('/api/blocks/:id', wrap((req, res) => {
      db.prepare('DELETE FROM blocks WHERE id=?').run(req.params.id);
      res.json({ ok: true });
    }));

    // ---------- hazır içerik paketi (Docs'taki listelerden) ----------
    app.get('/api/icerik-paketi', wrap((req, res) => {
      res.json(Paket.ozet(Paket.eksikler(db)));
    }));
    // Yalnızca aynı başlıkla olmayanları ekler → tekrar çalışsa da (ör. eşitleme çakışmasında) çift kayıt olmaz
    app.post('/api/icerik-paketi', wrap((req, res) => {
      const e = Paket.eksikler(db);
      const insT = db.prepare('INSERT INTO templates(ad,aciklama,data) VALUES(?,?,?)');
      const insB = db.prepare('INSERT INTO blocks(tur,kategori,baslik,icerik) VALUES(?,?,?,?)');
      for (const s of e.sablonlar) insT.run(s.ad, s.aciklama, JSON.stringify(normalizeData(s.data)));
      for (const b of e.bloklar) insB.run(b.tur, b.kategori, b.baslik, b.icerik);
      res.json(Paket.ozet(e));
    }));

    // ---------- link önizlemeleri ----------
    app.get('/api/onizleme', wrap((req, res) => {
      const urls = [].concat(req.query.url || []).map(cleanUrl).filter(Boolean).slice(0, 100);
      const out = {};
      for (const u of urls) { const p = oniz.getPreview(u); if (p) out[u] = p; else oniz.enqueue(u); }
      res.json(out);
    }));
    app.post('/api/onizleme/yenile', wrap((req, res) => {
      const u = cleanUrl(req.body.url);
      if (!u) throw httpErr(400, 'Geçerli bir link gerekli.');
      oniz.enqueue(u, true);
      res.json({ ok: true });
    }));

    // ---------- ayarlar ----------
    app.get('/api/settings', wrap((req, res) => {
      res.json({ brand: getSetting('brand', {}), defaultNotes: getSetting('defaultNotes', []) });
    }));
    app.put('/api/settings', wrap((req, res) => {
      if (req.body.brand) setSetting('brand', { ...getSetting('brand', {}), ...req.body.brand });
      if (Array.isArray(req.body.defaultNotes)) setSetting('defaultNotes', req.body.defaultNotes.map(String).filter(s => s.trim()));
      res.json({ ok: true });
    }));

    // ---------- ana sayfa özeti ----------
    app.get('/api/dashboard', wrap((req, res) => {
      const t = today();
      const hafta = addDays(t, 7);
      const ayBasi = t.slice(0, 8) + '01';
      const q = sql => db.prepare(sql);
      res.json({
        bugun: t,
        aktif: q("SELECT COUNT(*) n FROM clients WHERE durum='aktif'").get().n,
        buAyTahsilat: q('SELECT IFNULL(SUM(tutar),0) t FROM payments WHERE tarih >= ?').get(ayBasi).t,
        alacak: q(`SELECT IFNULL(SUM(b),0) t FROM (SELECT ${Finans.BAKIYE_SQL} b FROM clients c) WHERE b > 0`).get().t,
        buAyYeni: q('SELECT COUNT(*) n FROM clients WHERE substr(created_at,1,10) >= ?').get(ayBasi).n,
        buAyListe: q('SELECT COUNT(*) n FROM diet_lists WHERE tarih >= ?').get(ayBasi).n,
        toplamVerilen: q(`SELECT ROUND(SUM(ilk - son),1) n FROM (
            SELECT (SELECT kilo FROM visits WHERE client_id=c.id AND kilo IS NOT NULL ORDER BY tarih, id LIMIT 1) ilk,
                   (SELECT kilo FROM visits WHERE client_id=c.id AND kilo IS NOT NULL ORDER BY tarih DESC, id DESC LIMIT 1) son
            FROM clients c WHERE durum='aktif') WHERE ilk > son`).get().n || 0,
        // Tarihi geçmiş ama sonucu (tamamlandı / gelmedi / iptal) işaretlenmemiş randevular
        geciken: q(`${APPT_SQL} WHERE a.tarih < ? AND a.durum = 'planli' ORDER BY a.tarih DESC, a.saat DESC LIMIT 20`).all(t),
        // Aktif ama ileri tarihli randevusu olmayan danışanlar → takip unutulmasın
        randevusuz: q(`${CLIENT_LIST_SQL} WHERE c.durum='aktif' AND NOT EXISTS (
            SELECT 1 FROM appointments a WHERE a.client_id=c.id AND a.durum='planli' AND a.tarih >= ?) ORDER BY c.ad_soyad`).all(t),
        bugunRandevu: q(`${APPT_SQL} WHERE a.tarih = ? AND a.durum != 'iptal' ORDER BY a.saat`).all(t),
        haftaRandevu: q(`${APPT_SQL} WHERE a.tarih > ? AND a.tarih <= ? AND a.durum = 'planli' ORDER BY a.tarih, a.saat`).all(t, hafta),
        paketBitiyor: q(`${CLIENT_LIST_SQL} WHERE c.durum='aktif' AND c.paket_bitis BETWEEN ? AND ? ORDER BY c.paket_bitis`).all(t, addDays(t, 10)),
        sonListeler: q(`SELECT l.id,l.baslik,l.tarih,l.client_id,c.ad_soyad FROM diet_lists l JOIN clients c ON c.id=l.client_id
            ORDER BY l.updated_at DESC LIMIT 6`).all(),
      });
    }));

    // ---------- yedek ----------
    app.get('/api/yedek', wrap((req, res) => {
      const dump = {
        surum: 1, tarih: new Date().toISOString(),
        clients: db.prepare('SELECT * FROM clients').all(),
        visits: db.prepare('SELECT * FROM visits').all(),
        diet_lists: db.prepare('SELECT * FROM diet_lists').all(),
        templates: db.prepare('SELECT * FROM templates').all(),
        blocks: db.prepare('SELECT * FROM blocks').all(),
        appointments: db.prepare('SELECT * FROM appointments').all(),
        packages: db.prepare('SELECT * FROM packages').all(),
        client_packages: db.prepare('SELECT * FROM client_packages').all(),
        payments: db.prepare('SELECT * FROM payments').all(),
        expenses: db.prepare('SELECT * FROM expenses').all(),
        settings: { brand: getSetting('brand'), defaultNotes: getSetting('defaultNotes') },
      };
      res.setHeader('Content-Disposition', `attachment; filename="diyet-yedek-${today()}.json"`);
      res.json(dump);
    }));

    fin = Finans.register(app, ctx);
    const bv = Basvuru.register(app, ctx);
    return { loadList, CLIENT_LIST_SQL, durdur: bv.durdur };
  }

  return { register };
});
