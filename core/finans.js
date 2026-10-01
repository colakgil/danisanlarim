// Paketler, danışan paketleri, tahsilatlar ve giderler — Node ve tarayıcıda aynı.
// Bakiye = iptal edilmemiş paket tutarları − tahsilatlar (danışan bazında).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./yardim'));
  else (root.Cekirdek = root.Cekirdek || {}).finans = factory(root.Cekirdek.yardim);
})(typeof self !== 'undefined' ? self : this, function (Y) {
  'use strict';
  const YONTEMLER = ['Havale/EFT', 'Kredi kartı', 'Nakit', 'Diğer'];
  const GIDER_KAT = ['Reklam & sosyal medya', 'Yazılım & abonelik', 'Muhasebe', 'Vergi & SGK', 'Kira & ofis', 'Eğitim', 'Ekipman', 'Diğer'];

  // Danışanın bakiyesi (pozitif = alacak)
  const BAKIYE_SQL = `(IFNULL((SELECT SUM(tutar) FROM client_packages cp WHERE cp.client_id = c.id AND cp.durum != 'iptal'), 0)
    - IFNULL((SELECT SUM(tutar) FROM payments p WHERE p.client_id = c.id), 0))`;

  function seedFinans({ db, getSetting, setSetting }) {
    if (getSetting('seededFinans')) return;
    // Örnek paketler — fiyatlar boş; Finans > Paketler'den girilmeli
    const ins = db.prepare('INSERT INTO packages(ad,sure_gun,gorusme_sayisi,fiyat,aciklama,sira) VALUES(?,?,?,?,?,?)');
    [
      ['Tek görüşme', null, 1, null, 'Tek seferlik online görüşme + kişiye özel liste', 1],
      ['1 Aylık Online Paket', 30, 4, null, 'Haftalık kontrol, liste güncellemeleri, WhatsApp destek', 2],
      ['2 Aylık Online Paket', 60, 8, null, 'Haftalık kontrol, liste güncellemeleri, WhatsApp destek', 3],
      ['3 Aylık Online Paket', 90, 12, null, 'Haftalık kontrol, liste güncellemeleri, WhatsApp destek', 4],
    ].forEach(p => ins.run(...p));
    // Eski "paket" metin alanlarını paket kaydına taşı
    const eski = db.prepare("SELECT id, paket, paket_baslangic, paket_bitis, ucret FROM clients WHERE IFNULL(paket,'') != ''").all();
    const insCp = db.prepare('INSERT INTO client_packages(client_id,package_id,ad,baslangic,bitis,liste_fiyati,tutar,durum) VALUES(?,?,?,?,?,?,?,?)');
    const today = new Date().toISOString().slice(0, 10);
    for (const c of eski) {
      const pk = db.prepare('SELECT id FROM packages WHERE lower(ad)=lower(?)').get(c.paket);
      insCp.run(c.id, pk ? pk.id : null, c.paket, c.paket_baslangic || today, c.paket_bitis || null, c.ucret || null, c.ucret || 0,
        c.paket_bitis && c.paket_bitis < today ? 'tamamlandi' : 'aktif');
    }
    setSetting('seededFinans', true);
  }

  function seedIcerik({ db, getSetting, setSetting }) {
    if (getSetting('seededPaketIcerik')) return;
    const up = db.prepare("UPDATE packages SET icerik=? WHERE ad=? AND IFNULL(icerik,'')=''");
    up.run('Online ön görüşme (anamnez)\nKişiye özel beslenme listesi\nListe PDF + tarif linkleri', 'Tek görüşme');
    const aylik = 'Online ön görüşme (anamnez)\nKişiye özel beslenme listesi\nHaftalık online kontrol\nHer kontrolde liste güncelleme\nWhatsApp destek\nTarif ve alışveriş önerileri';
    for (const a of ['1 Aylık Online Paket', '2 Aylık Online Paket', '3 Aylık Online Paket']) up.run(aylik, a);
    setSetting('seededPaketIcerik', true);
  }

  function register(app, { db, getSetting, setSetting, wrap }) {
    const { httpErr, str, num, today, addDays } = Y;
    seedFinans({ db, getSetting, setSetting });
    seedIcerik({ db, getSetting, setSetting });
    const int = v => (v === '' || v == null || isNaN(Number(v)) ? null : Math.round(Number(v)));
    const iso = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null);

    // Danışanın "güncel paket" özet alanlarını (liste/özet ekranları için) son aktif pakete eşitle
    function syncClientPackage(clientId) {
      const cp = db.prepare("SELECT * FROM client_packages WHERE client_id=? AND durum='aktif' ORDER BY baslangic DESC, id DESC LIMIT 1").get(clientId);
      db.prepare('UPDATE clients SET paket=?, paket_baslangic=?, paket_bitis=?, ucret=? WHERE id=?')
        .run(cp ? cp.ad : null, cp ? cp.baslangic : null, cp ? cp.bitis : null, cp ? cp.tutar : null, clientId);
    }

    // ---------- paket tanımları ----------
    app.get('/api/packages', wrap((req, res) => {
      const all = req.query.hepsi ? '' : 'WHERE p.aktif=1';
      res.json(db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM client_packages cp WHERE cp.package_id=p.id) AS satis FROM packages p ${all} ORDER BY p.aktif DESC, p.sira, p.ad`).all());
    }));
    const pickPkg = b => ({ ad: str(b.ad), sure_gun: int(b.sure_gun), gorusme_sayisi: int(b.gorusme_sayisi), fiyat: num(b.fiyat), aciklama: str(b.aciklama), icerik: str(b.icerik), aktif: b.aktif === false || b.aktif === 0 || b.aktif === '0' ? 0 : 1 });
    app.post('/api/packages', wrap((req, res) => {
      const p = pickPkg(req.body);
      if (!p.ad) throw httpErr(400, 'Paket adı gerekli.');
      const sira = (db.prepare('SELECT MAX(sira) m FROM packages').get().m || 0) + 1;
      const r = db.prepare('INSERT INTO packages(ad,sure_gun,gorusme_sayisi,fiyat,aciklama,icerik,aktif,sira) VALUES(?,?,?,?,?,?,?,?)')
        .run(p.ad, p.sure_gun, p.gorusme_sayisi, p.fiyat, p.aciklama, p.icerik, p.aktif, sira);
      res.json({ id: Number(r.lastInsertRowid) });
    }));
    app.put('/api/packages/:id', wrap((req, res) => {
      const p = pickPkg(req.body);
      if (!p.ad) throw httpErr(400, 'Paket adı gerekli.');
      db.prepare('UPDATE packages SET ad=?, sure_gun=?, gorusme_sayisi=?, fiyat=?, aciklama=?, icerik=?, aktif=? WHERE id=?')
        .run(p.ad, p.sure_gun, p.gorusme_sayisi, p.fiyat, p.aciklama, p.icerik, p.aktif, req.params.id);
      res.json({ ok: true });
    }));
    app.delete('/api/packages/:id', wrap((req, res) => {
      // Satılmış paket silinmez, pasife alınır (geçmiş kayıtlar bozulmasın)
      const used = db.prepare('SELECT COUNT(*) n FROM client_packages WHERE package_id=?').get(req.params.id).n;
      if (used) db.prepare('UPDATE packages SET aktif=0 WHERE id=?').run(req.params.id);
      else db.prepare('DELETE FROM packages WHERE id=?').run(req.params.id);
      res.json({ ok: true, pasif: !!used });
    }));

    // ---------- danışana paket ----------
    app.post('/api/clients/:id/packages', wrap((req, res) => {
      const cid = Number(req.params.id);
      if (!db.prepare('SELECT 1 FROM clients WHERE id=?').get(cid)) throw httpErr(404, 'Danışan bulunamadı.');
      const b = req.body;
      const pkg = b.package_id ? db.prepare('SELECT * FROM packages WHERE id=?').get(b.package_id) : null;
      const ad = str(b.ad) || pkg?.ad;
      if (!ad) throw httpErr(400, 'Paket seçin ya da ad girin.');
      const baslangic = iso(b.baslangic) || today();
      const sure = int(b.sure_gun) ?? pkg?.sure_gun ?? null;
      const bitis = iso(b.bitis) || (sure ? addDays(baslangic, sure) : null);
      const liste = num(b.liste_fiyati) ?? pkg?.fiyat ?? null;
      const indirim = num(b.indirim) || 0;
      const tutar = num(b.tutar) ?? Math.max((liste || 0) - indirim, 0);
      // Yeni paket başlarken önceki aktif paketler "tamamlandı" olur
      if (b.oncekiniKapat !== false) db.prepare("UPDATE client_packages SET durum='tamamlandi' WHERE client_id=? AND durum='aktif'").run(cid);
      const fat = b.fatura_kesildi === true || b.fatura_kesildi === 'on' || b.fatura_kesildi === 1 ? 1 : 0;
      const r = db.prepare(`INSERT INTO client_packages(client_id,package_id,ad,baslangic,bitis,gorusme_sayisi,liste_fiyati,indirim,tutar,durum,notlar,fatura_kesildi,fatura_no,fatura_tarihi)
        VALUES(?,?,?,?,?,?,?,?,?,'aktif',?,?,?,?)`).run(cid, pkg?.id ?? null, ad, baslangic, bitis, int(b.gorusme_sayisi) ?? pkg?.gorusme_sayisi ?? null, liste, indirim, tutar, str(b.notlar),
        fat, fat ? str(b.fatura_no) : null, fat ? (iso(b.fatura_tarihi) || today()) : null);
      const cpId = Number(r.lastInsertRowid);
      // Paketle birlikte peşin/ilk ödeme
      const odeme = num(b.odeme_tutar);
      if (odeme && odeme > 0) {
        db.prepare('INSERT INTO payments(client_id,client_package_id,tarih,tutar,yontem,fatura_kesildi,fatura_no) VALUES(?,?,?,?,?,?,?)')
          .run(cid, cpId, iso(b.odeme_tarih) || baslangic, odeme, YONTEMLER.includes(b.odeme_yontem) ? b.odeme_yontem : 'Havale/EFT', fat, fat ? str(b.fatura_no) : null);
      }
      db.prepare("UPDATE clients SET durum='aktif' WHERE id=?").run(cid);
      syncClientPackage(cid);
      res.json({ id: cpId });
    }));
    app.put('/api/client-packages/:id', wrap((req, res) => {
      const old = db.prepare('SELECT * FROM client_packages WHERE id=?').get(req.params.id);
      if (!old) throw httpErr(404, 'Paket kaydı bulunamadı.');
      const b = req.body;
      const v = {
        ad: str(b.ad) || old.ad, baslangic: iso(b.baslangic) || old.baslangic, bitis: 'bitis' in b ? iso(b.bitis) : old.bitis,
        gorusme_sayisi: 'gorusme_sayisi' in b ? int(b.gorusme_sayisi) : old.gorusme_sayisi,
        liste_fiyati: 'liste_fiyati' in b ? num(b.liste_fiyati) : old.liste_fiyati, indirim: 'indirim' in b ? num(b.indirim) || 0 : old.indirim,
        tutar: 'tutar' in b ? num(b.tutar) ?? 0 : old.tutar,
        durum: ['aktif', 'tamamlandi', 'iptal'].includes(b.durum) ? b.durum : old.durum, notlar: 'notlar' in b ? str(b.notlar) : old.notlar,
      };
      db.prepare('UPDATE client_packages SET ad=?, baslangic=?, bitis=?, gorusme_sayisi=?, liste_fiyati=?, indirim=?, tutar=?, durum=?, notlar=? WHERE id=?')
        .run(v.ad, v.baslangic, v.bitis, v.gorusme_sayisi, v.liste_fiyati, v.indirim, v.tutar, v.durum, v.notlar, req.params.id);
      syncClientPackage(old.client_id);
      res.json({ ok: true });
    }));
    // Diyet dönemi (paket) faturası: kesildi / kesilmedi
    app.patch('/api/client-packages/:id/fatura', wrap((req, res) => {
      const k = req.body.fatura_kesildi ? 1 : 0;
      db.prepare('UPDATE client_packages SET fatura_kesildi=?, fatura_no=?, fatura_tarihi=? WHERE id=?')
        .run(k, k ? str(req.body.fatura_no) : null, k ? (iso(req.body.fatura_tarihi) || today()) : null, req.params.id);
      db.prepare('UPDATE payments SET fatura_kesildi=? WHERE client_package_id=?').run(k, req.params.id);
      res.json({ ok: true });
    }));
    // Paket satışları raporu (dönem başlangıcına göre)
    app.get('/api/sales', wrap((req, res) => {
      const from = iso(req.query.from) || '0000-01-01', to = iso(req.query.to) || '9999-12-31';
      res.json(db.prepare(`SELECT cp.*, c.ad_soyad,
          (SELECT IFNULL(SUM(tutar),0) FROM payments p WHERE p.client_package_id=cp.id) AS odenen,
          (SELECT MAX(tarih) FROM payments p WHERE p.client_package_id=cp.id) AS odeme_tarihi
        FROM client_packages cp JOIN clients c ON c.id=cp.client_id
        WHERE cp.baslangic BETWEEN ? AND ? ORDER BY cp.baslangic DESC, cp.id DESC`).all(from, to));
    }));

    app.delete('/api/client-packages/:id', wrap((req, res) => {
      const old = db.prepare('SELECT client_id FROM client_packages WHERE id=?').get(req.params.id);
      db.prepare('DELETE FROM client_packages WHERE id=?').run(req.params.id);
      if (old) syncClientPackage(old.client_id);
      res.json({ ok: true });
    }));

    // ---------- tahsilatlar ----------
    const pickPay = b => ({
      tarih: iso(b.tarih) || today(), tutar: num(b.tutar), yontem: YONTEMLER.includes(b.yontem) ? b.yontem : 'Havale/EFT',
      fatura_kesildi: b.fatura_kesildi === true || b.fatura_kesildi === 1 || b.fatura_kesildi === 'on' || b.fatura_kesildi === '1' ? 1 : 0,
      fatura_no: str(b.fatura_no), notlar: str(b.notlar), client_package_id: int(b.client_package_id),
    });
    app.post('/api/clients/:id/payments', wrap((req, res) => {
      const p = pickPay(req.body);
      if (!p.tutar || p.tutar <= 0) throw httpErr(400, 'Tutar girin.');
      if (!p.client_package_id) p.client_package_id = db.prepare("SELECT id FROM client_packages WHERE client_id=? AND durum!='iptal' ORDER BY baslangic DESC, id DESC LIMIT 1").get(req.params.id)?.id ?? null;
      const r = db.prepare('INSERT INTO payments(client_id,client_package_id,tarih,tutar,yontem,fatura_kesildi,fatura_no,notlar) VALUES(?,?,?,?,?,?,?,?)')
        .run(req.params.id, p.client_package_id, p.tarih, p.tutar, p.yontem, p.fatura_kesildi, p.fatura_no, p.notlar);
      res.json({ id: Number(r.lastInsertRowid) });
    }));
    app.put('/api/payments/:id', wrap((req, res) => {
      const p = pickPay(req.body);
      if (!p.tutar || p.tutar <= 0) throw httpErr(400, 'Tutar girin.');
      db.prepare('UPDATE payments SET tarih=?, tutar=?, yontem=?, fatura_kesildi=?, fatura_no=?, notlar=? WHERE id=?')
        .run(p.tarih, p.tutar, p.yontem, p.fatura_kesildi, p.fatura_no, p.notlar, req.params.id);
      res.json({ ok: true });
    }));
    app.patch('/api/payments/:id/fatura', wrap((req, res) => {
      db.prepare('UPDATE payments SET fatura_kesildi=?, fatura_no=COALESCE(?, fatura_no) WHERE id=?')
        .run(req.body.fatura_kesildi ? 1 : 0, str(req.body.fatura_no), req.params.id);
      res.json({ ok: true });
    }));
    app.delete('/api/payments/:id', wrap((req, res) => {
      db.prepare('DELETE FROM payments WHERE id=?').run(req.params.id);
      res.json({ ok: true });
    }));

    // ---------- giderler ----------
    const pickExp = b => ({ tarih: iso(b.tarih) || today(), kategori: str(b.kategori) || 'Diğer', tutar: num(b.tutar), aciklama: str(b.aciklama) });
    app.post('/api/expenses', wrap((req, res) => {
      const e = pickExp(req.body);
      if (!e.tutar || e.tutar <= 0) throw httpErr(400, 'Tutar girin.');
      const r = db.prepare('INSERT INTO expenses(tarih,kategori,tutar,aciklama) VALUES(?,?,?,?)').run(e.tarih, e.kategori, e.tutar, e.aciklama);
      res.json({ id: Number(r.lastInsertRowid) });
    }));
    app.put('/api/expenses/:id', wrap((req, res) => {
      const e = pickExp(req.body);
      if (!e.tutar || e.tutar <= 0) throw httpErr(400, 'Tutar girin.');
      db.prepare('UPDATE expenses SET tarih=?, kategori=?, tutar=?, aciklama=? WHERE id=?').run(e.tarih, e.kategori, e.tutar, e.aciklama, req.params.id);
      res.json({ ok: true });
    }));
    app.delete('/api/expenses/:id', wrap((req, res) => {
      db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id);
      res.json({ ok: true });
    }));

    // ---------- finans özeti ----------
    const monthRange = ay => { const [y, m] = ay.split('-').map(Number); const e = new Date(y, m, 0).getDate(); return [`${ay}-01`, `${ay}-${String(e).padStart(2, '0')}`]; };
    app.get('/api/finans', wrap((req, res) => {
      const from = iso(req.query.from) || today().slice(0, 8) + '01';
      const to = iso(req.query.to) || monthRange(today().slice(0, 7))[1];
      const q = s => db.prepare(s);
      const tahsilat = q('SELECT IFNULL(SUM(tutar),0) t, COUNT(*) n FROM payments WHERE tarih BETWEEN ? AND ?').get(from, to);
      const gider = q('SELECT IFNULL(SUM(tutar),0) t FROM expenses WHERE tarih BETWEEN ? AND ?').get(from, to).t;
      const satis = q("SELECT IFNULL(SUM(tutar),0) t, COUNT(*) n FROM client_packages WHERE durum!='iptal' AND baslangic BETWEEN ? AND ?").get(from, to);
      // Son 12 ay (seçilen dönemin bitişine göre)
      const aylar = [];
      const end = new Date(to + 'T12:00:00');
      for (let i = 11; i >= 0; i--) {
        const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const ay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const [a, b] = monthRange(ay);
        aylar.push({ ay, gelir: q('SELECT IFNULL(SUM(tutar),0) t FROM payments WHERE tarih BETWEEN ? AND ?').get(a, b).t,
          gider: q('SELECT IFNULL(SUM(tutar),0) t FROM expenses WHERE tarih BETWEEN ? AND ?').get(a, b).t });
      }
      res.json({
        from, to,
        tahsilat: tahsilat.t, tahsilatAdet: tahsilat.n, gider, net: tahsilat.t - gider,
        satis: satis.t, satisAdet: satis.n,
        alacak: q(`SELECT IFNULL(SUM(b),0) t FROM (SELECT ${BAKIYE_SQL} b FROM clients c) WHERE b > 0`).get().t,
        borclular: q(`SELECT c.id, c.ad_soyad, c.telefon, c.paket, ${BAKIYE_SQL} AS bakiye,
            (SELECT MAX(tarih) FROM payments p WHERE p.client_id=c.id) AS son_odeme
          FROM clients c WHERE ${BAKIYE_SQL} > 0.009 ORDER BY bakiye DESC`).all(),
        faturasiz: q(`SELECT cp.*, c.ad_soyad, (SELECT IFNULL(SUM(tutar),0) FROM payments p WHERE p.client_package_id=cp.id) AS odenen
          FROM client_packages cp JOIN clients c ON c.id=cp.client_id
          WHERE cp.fatura_kesildi=0 AND cp.durum!='iptal' AND cp.tutar > 0 ORDER BY cp.baslangic DESC LIMIT 100`).all(),
        paketDagilim: q(`SELECT ad, COUNT(*) n, IFNULL(SUM(tutar),0) t FROM client_packages WHERE durum!='iptal' AND baslangic BETWEEN ? AND ? GROUP BY ad ORDER BY t DESC`).all(from, to),
        yontemDagilim: q('SELECT yontem, IFNULL(SUM(tutar),0) t FROM payments WHERE tarih BETWEEN ? AND ? GROUP BY yontem ORDER BY t DESC').all(from, to),
        giderDagilim: q('SELECT kategori, IFNULL(SUM(tutar),0) t FROM expenses WHERE tarih BETWEEN ? AND ? GROUP BY kategori ORDER BY t DESC').all(from, to),
        aylar,
        yontemler: YONTEMLER, giderKategorileri: GIDER_KAT,
      });
    }));
    app.get('/api/payments', wrap((req, res) => {
      const from = iso(req.query.from) || '0000-01-01', to = iso(req.query.to) || '9999-12-31';
      res.json(db.prepare(`SELECT p.*, c.ad_soyad, cp.ad AS paket_ad, cp.fatura_kesildi AS paket_fatura, cp.fatura_no AS paket_fatura_no
        FROM payments p JOIN clients c ON c.id=p.client_id
        LEFT JOIN client_packages cp ON cp.id=p.client_package_id WHERE p.tarih BETWEEN ? AND ? ORDER BY p.tarih DESC, p.id DESC`).all(from, to));
    }));
    app.get('/api/expenses', wrap((req, res) => {
      const from = iso(req.query.from) || '0000-01-01', to = iso(req.query.to) || '9999-12-31';
      res.json(db.prepare('SELECT * FROM expenses WHERE tarih BETWEEN ? AND ? ORDER BY tarih DESC, id DESC').all(from, to));
    }));
    // Muhasebeci için CSV (Excel Türkçe: ; ayraç + UTF-8 BOM)
    app.get('/api/finans/csv', wrap((req, res) => {
      const from = iso(req.query.from) || '0000-01-01', to = iso(req.query.to) || '9999-12-31';
      const cell = v => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      const money = n => (n == null ? '' : Number(n).toFixed(2).replace('.', ','));
      const lines = [['Tür', 'Tarih', 'Danışan / Kategori', 'Açıklama', 'Ödeme yöntemi', 'Fatura', 'Fatura no', 'Tutar (TL)'].join(';')];
      for (const p of db.prepare(`SELECT p.*, c.ad_soyad, cp.ad paket_ad, COALESCE(cp.fatura_kesildi, p.fatura_kesildi) fk, COALESCE(cp.fatura_no, p.fatura_no) fno
          FROM payments p JOIN clients c ON c.id=p.client_id LEFT JOIN client_packages cp ON cp.id=p.client_package_id
          WHERE p.tarih BETWEEN ? AND ? ORDER BY p.tarih`).all(from, to))
        lines.push(['Tahsilat', p.tarih, p.ad_soyad, p.paket_ad || p.notlar, p.yontem, p.fk ? 'Kesildi' : 'Kesilmedi', p.fno, money(p.tutar)].map(cell).join(';'));
      for (const e of db.prepare('SELECT * FROM expenses WHERE tarih BETWEEN ? AND ? ORDER BY tarih').all(from, to))
        lines.push(['Gider', e.tarih, e.kategori, e.aciklama, '', '', '', money(-e.tutar)].map(cell).join(';'));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="finans-${from}_${to}.csv"`.replace('0000-01-01_9999-12-31', 'tumu'));
      res.send('﻿' + lines.join('\r\n'));
    }));

    // Danışan detayına eklenecek finans bilgisi
    function clientFinance(cid) {
      const packages = db.prepare(`SELECT cp.*,
          (SELECT IFNULL(SUM(tutar),0) FROM payments p WHERE p.client_package_id=cp.id) AS odenen,
          (SELECT COUNT(*) FROM appointments a WHERE a.client_id=cp.client_id AND a.durum='tamamlandi'
             AND a.tarih >= cp.baslangic AND (cp.bitis IS NULL OR a.tarih <= cp.bitis)) AS yapilan_gorusme
        FROM client_packages cp WHERE cp.client_id=? ORDER BY cp.baslangic DESC, cp.id DESC`).all(cid);
      const payments = db.prepare(`SELECT p.*, cp.ad AS paket_ad FROM payments p LEFT JOIN client_packages cp ON cp.id=p.client_package_id
        WHERE p.client_id=? ORDER BY p.tarih DESC, p.id DESC`).all(cid);
      const toplam = packages.filter(p => p.durum !== 'iptal').reduce((a, p) => a + (p.tutar || 0), 0);
      const odenen = payments.reduce((a, p) => a + p.tutar, 0);
      return { packages, payments, finans: { toplam, odenen, bakiye: toplam - odenen } };
    }

    return { BAKIYE_SQL, clientFinance, syncClientPackage, YONTEMLER };
  }

  return { register, BAKIYE_SQL };
});
