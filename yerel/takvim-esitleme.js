'use strict';
/* Randevular → Google Takvim ("Danışan randevuları" takvimi, Hande'nin Google hesabında).
   Randevular değişince (birkaç saniye sonra) son 60 gün + gelecek 1 yıl, Apps Script'e gönderilir; takvim bu listeyle
   birebir aynı hâle gelir. Aynı liste daha önce gönderildiyse tekrar gönderilmez. iPhone/Mac Takvim, Google takvimini gösterir. */
(function () {
  const Y = window.Yerel;
  const ic = Y._ic;
  const GECIKME = 5000;
  const GERI_GUN = 60, ILERI_GUN = 365;

  const gun = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  function liste() {
    const aralik = [gun(-GERI_GUN), gun(ILERI_GUN)];
    const rows = ic.ctx().db.prepare(`SELECT a.id, a.tarih, a.saat, a.sure_dk, a.tur, a.kanal, a.notlar, a.durum, c.ad_soyad
      FROM appointments a JOIN clients c ON c.id = a.client_id WHERE a.tarih BETWEEN ? AND ? AND a.durum != 'iptal' ORDER BY a.tarih, a.saat, a.id`).all(...aralik);
    const olaylar = rows.map(a => ({
      id: a.id,
      baslik: `${a.ad_soyad} – ${a.tur || 'Görüşme'}${a.durum === 'tamamlandi' ? ' ✓' : a.durum === 'gelmedi' ? ' (gelmedi)' : ''}`,
      aciklama: [a.kanal, a.notlar].filter(Boolean).join('\n'),
      bas: `${a.tarih}T${a.saat}`, dk: a.sure_dk || 45,
    }));
    return { aralik, olaylar };
  }
  const ozet = o => JSON.stringify(o);

  let durum = { ad: 'bekliyor', zaman: null, hata: null, adet: 0 };
  const bildir = ek => { durum = { ...durum, ...ek }; dispatchEvent(new CustomEvent('takvim', { detail: durum })); };

  let calisan = null, zaman = null;
  async function gonder(zorla = false) {
    if (calisan) return calisan;
    calisan = (async () => {
      await Y.hazir;
      if (!window.Esitleme || !(await Esitleme.bagliMi())) return bildir({ ad: 'kapali' });
      const l = liste();
      const son = await ic.idb.get('takvim-son');
      // Gün değişince aralık kayar; aynı gün aynı liste tekrar gönderilmez
      const anahtar = ozet(l);
      if (!zorla && son && son.ozet === anahtar) return bildir({ ad: 'tamam', zaman: son.zaman, adet: l.olaylar.length });
      bildir({ ad: 'calisiyor' });
      try {
        const r = await Esitleme.cagir('takvim', l);
        if (!r.ok) throw new Error(r.hata || 'Takvim güncellenemedi');
        const z = new Date().toISOString();
        await ic.idb.set('takvim-son', { ozet: anahtar, zaman: z, sonuc: r });
        bildir({ ad: 'tamam', zaman: z, hata: null, adet: l.olaylar.length, takvim: r.takvim });
      } catch (e) {
        bildir({ ad: e.cevrimdisi ? 'cevrimdisi' : 'hata', hata: e.message });
      }
    })().finally(() => { calisan = null; });
    return calisan;
  }
  const planla = () => { clearTimeout(zaman); zaman = setTimeout(() => gonder(), GECIKME); };
  ic.degisiklikte(planla);
  addEventListener('yerel:yenilendi', planla);
  addEventListener('online', planla);
  Y.hazir.then(() => setTimeout(() => gonder(), 8000)).catch(() => {});

  window.TakvimEsitleme = { gonder: () => gonder(true), durum: () => durum, _liste: liste };
})();
