'use strict';
/* Yerel modda liste önizleme ve PDF uçları: /api/lists/:id/html ve /api/lists/:id/pdf
   Şablon Node sunucusuyla ortak (public/core/pdf-modern.js); PDF cihazda üretilir (yerel/pdf.js). */
(function () {
  const C = window.Cekirdek;
  const ic = window.Yerel._ic;
  // Kenar boşlukları şablonun @page değerleriyle aynı (mm)
  const SAYFA = { ust: 14, alt: 16, yan: 13, ilkUst: 0 };

  // PDF'te yazı tipleri sayfaya gömülür: dosyadan geç yüklenirse görüntü yedek yazı tipiyle alınır
  // (harf aralıkları bozulur, satırlar uzar). Bir kez okunur, sonra bellekten.
  const fontlar = new Map();
  async function fontlariGom(html) {
    const adlar = [...new Set([...html.matchAll(/url\('(fonts\/[\w.-]+\.ttf)'\)/g)].map(m => m[1]))];
    for (const ad of adlar) {
      if (!fontlar.has(ad)) {
        const b = new Uint8Array(await (await fetch(ad)).arrayBuffer());
        let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
        fontlar.set(ad, `data:font/ttf;base64,${btoa(s)}`);
      }
    }
    return html.replace(/url\('(fonts\/[\w.-]+\.ttf)'\)/g, (t, ad) => `url('${fontlar.get(ad)}')`);
  }

  ic.acildiginda((app, ctx) => {
    const taban = new URL('.', location.href).href;   // fontlar ve logolar uygulamanın kendi dosyalarından
    const yukle = id => {
      const list = ctx.db.prepare('SELECT * FROM diet_lists WHERE id=?').get(id);
      if (!list) throw C.yardim.httpErr(404, 'Liste bulunamadı.');
      list.data = JSON.parse(list.data);
      const client = ctx.db.prepare('SELECT * FROM clients WHERE id=?').get(list.client_id);
      return { list, client, brand: ctx.getSetting('brand', {}) };
    };
    // Kapak görseli: veritabanındaki görselin data: adresi (önizleme çerçevesi ve PDF'te sorunsuz çalışır)
    const gorsel = u => { const p = ctx.oniz.getPreview(u); return p && p.gorsel && window.Onizleme ? Onizleme.gorselVeri(p.gorsel) : null; };
    const olustur = (a, preview) => C.pdfModern.renderModernHtml({ ...a, baseUrl: taban, preview, gorsel });

    app.get('/api/lists/:id/html', (req, res) => {
      res.type('html').send(olustur(yukle(req.params.id), true));
    });
    app.get('/api/lists/:id/pdf', async (req, res) => {
      const a = yukle(req.params.id);
      const b = a.brand;
      const bytes = await PdfUret.olustur(await fontlariGom(olustur(a, false)), {
        sayfa: SAYFA,
        altBilgi: { sol: [b.unvan, b.instagram, b.telefon].filter(Boolean).join('  ·  '), renk: b.renkAna || '#4F7F2A', font: 'NunitoE, sans-serif' },
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.end(bytes);
    });
  });
})();
