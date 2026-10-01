'use strict';
/* Cihazda PDF üretimi (sunucu yok): şablon HTML'i gizli bir çerçevede A4 genişliğinde açılır, sayfalara bölünür
   (öğün kartı / tarif gibi "bölünmesin" kutularının ortasından kesilmez), her sayfa görüntüye çevrilir (html2canvas),
   jsPDF ile PDF'e eklenir; linkler tıklanabilir alan olarak geri konur. iPhone, iPad, Mac'te aynı sonuç verir.
   iPhone dersi: geniş sayfada Safari yazıyı büyütür → text-size-adjust:100% şart. */
window.PdfUret = (function () {
  const MM = 96 / 25.4;                 // 1 mm = px (CSS 96 dpi)
  const OLCEK = 2;                      // çözünürlük (2 → ~190 dpi)
  const A4 = { w: 210, h: 297 };

  function cerceve(html) {
    return new Promise((res, rej) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden';
      f.onload = () => res(f);
      f.onerror = rej;
      f.srcdoc = html;
      document.body.append(f);
    });
  }

  // Sayfa bölme: bölünmesin kutularının içinden ve "başlıktan sonra kesme" geçişlerinden kaçın
  function sayfalariBol(doc, H, ilkAlan, alan) {
    const ust = e => e.getBoundingClientRect().top, alt = e => e.getBoundingClientRect().bottom;
    const hepsi = [...doc.querySelectorAll('.sheet *')].filter(e => getComputedStyle(e).display !== 'inline' && e.getBoundingClientRect().height > 0);
    const kacin = [];
    for (const e of hepsi) {
      const cs = getComputedStyle(e);
      if (cs.breakInside === 'avoid' || cs.pageBreakInside === 'avoid') kacin.push([ust(e), alt(e)]);
      if ((cs.breakAfter === 'avoid' || cs.pageBreakAfter === 'avoid') && e.nextElementSibling) kacin.push([ust(e), ust(e.nextElementSibling) + 0.5]);
    }
    const guvenli = y => !kacin.some(([a, b]) => y > a + 0.5 && y < b);
    const aday = [...new Set(hepsi.map(e => Math.round(ust(e))))].filter(guvenli).sort((a, b) => a - b);
    const sayfalar = [];
    let bas = 0;
    while (bas < H - 2) {
      const yer = sayfalar.length ? alan : ilkAlan, sinir = bas + yer;
      if (sinir >= H) { sayfalar.push([bas, H]); break; }
      const uygun = aday.filter(y => y > bas + yer * 0.3 && y <= sinir);
      const son = uygun.length ? uygun[uygun.length - 1] : Math.floor(sinir);
      sayfalar.push([bas, son]); bas = son;
    }
    return sayfalar;
  }

  /**
   * html: şablon çıktısı (preview:false). s: { ust, alt, yan, ilkUst } kenar boşlukları (mm, şablonun @page değerleri)
   * altBilgi: { sol, renk, font } | null — her sayfanın altına "sol ……… n / N"
   */
  async function olustur(html, { sayfa, altBilgi = null, ilerleme = () => {} } = {}) {
    if (!window.jspdf) throw new Error('PDF araçları yüklenemedi');
    const f = await cerceve(html);
    try {
      const doc = f.contentDocument;
      const st = doc.createElement('style');
      st.textContent = `html{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}
        html,body{width:${A4.w}mm;margin:0} .sheet{max-width:none;width:${A4.w}mm;padding:0 ${sayfa.yan}mm;margin:0}`;
      doc.head.append(st);
      // Tanımlı tüm yazı tiplerini açıkça yükle (fonts.ready, henüz istenmemiş yazı tipini beklemez)
      await Promise.all([...doc.fonts].map(f => f.load().catch(() => null)));
      await doc.fonts.ready;
      await Promise.all([...doc.images].map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))));
      // html2canvas PDF sayfasının KENDİ içinde çalışmalı: yazılar o belgenin tuvalinde, o belgenin yazı tipleriyle çizilir
      // (ana sayfadan çağrılınca yazı tipleri tanınmaz → harf aralıkları bozulur)
      await new Promise((res, rej) => {
        const sc = doc.createElement('script');
        sc.src = new URL('vendor/html2canvas.min.js', location.href).href;
        sc.onload = res; sc.onerror = () => rej(new Error('PDF aracı yüklenemedi'));
        doc.head.append(sc);
      });
      // İçeriğin gerçek yüksekliği (belgenin scrollHeight'i çerçeve boyundan küçük olamaz → kısa listede boş sayfa çıkardı)
      const H = Math.ceil(Math.max(...[...doc.body.children].map(e => e.getBoundingClientRect().bottom), 1));
      f.style.height = H + 'px';
      await new Promise(r => setTimeout(r, 60));

      const ilkAlan = (A4.h - sayfa.ilkUst - sayfa.alt) * MM, alan = (A4.h - sayfa.ust - sayfa.alt) * MM;
      const sayfalar = sayfalariBol(doc, H, ilkAlan, alan);
      const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const linkler = [...doc.querySelectorAll('a[href^="http"]')];
      for (let i = 0; i < sayfalar.length; i++) {
        const [bas, son] = sayfalar[i];
        ilerleme(i + 1, sayfalar.length);
        const dilim = await f.contentWindow.html2canvas(doc.documentElement, {
          x: 0, y: bas, width: 794, height: son - bas, scale: OLCEK, windowWidth: 794, windowHeight: H,
          scrollX: 0, scrollY: 0, backgroundColor: '#ffffff', logging: false, useCORS: true,
          // html2canvas sayfanın bir kopyasını çizer; kopyada da yazı tipleri yüklenmeden çizim başlamasın
          onclone: kopya => Promise.all([...kopya.fonts].map(y => y.load().catch(() => null))).then(() => kopya.fonts.ready),
        });
        const ust = i === 0 ? sayfa.ilkUst : sayfa.ust;
        const c = doc.createElement('canvas');
        c.width = Math.round(A4.w * MM * OLCEK); c.height = Math.round(A4.h * MM * OLCEK);
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(dilim, 0, Math.round(ust * MM * OLCEK));
        if (altBilgi) {
          g.fillStyle = altBilgi.renk || '#999'; g.textBaseline = 'alphabetic';
          g.font = `600 ${7.5 * OLCEK * 96 / 72}px ${altBilgi.font || 'Arial, sans-serif'}`;
          const y = (A4.h - sayfa.alt / 2) * MM * OLCEK, kenar = sayfa.yan * MM * OLCEK;
          if (altBilgi.sol) { g.textAlign = 'left'; g.fillText(altBilgi.sol, kenar, y); }
          g.textAlign = 'right'; g.fillText(`${i + 1} / ${sayfalar.length}`, c.width - kenar, y);
        }
        if (i) pdf.addPage();
        pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, A4.w, A4.h, undefined, 'FAST');
        for (const a of linkler) for (const r of a.getClientRects()) {
          const y0 = Math.max(r.top, bas), y1 = Math.min(r.bottom, son);
          if (y1 - y0 < 2 || r.width < 2) continue;
          pdf.link(r.left / MM, ust + (y0 - bas) / MM, r.width / MM, (y1 - y0) / MM, { url: a.href });
        }
      }
      return new Uint8Array(pdf.output('arraybuffer'));
    } finally {
      f.remove();
    }
  }

  return { olustur };
})();
