'use strict';
/* Eski diyet listesini (Google Dokümanlar / Word) uygulamanın liste yapısına çevirir.
   Hande'nin eski listeleri: başta "TARİH: 23.02.26", "ADI SOYADI: …", "KİLO: 72.5 kg"; her bölümün önünde
   "SAĞLIKLI BESLENME PROGRAMI (ORUÇ)" gibi başlık; iki sütunlu tablo (solda "SABAH / 10.30", sağda öğün); sonda öneriler/notlar.
   Girdi: Docs'tan kopyalanan HTML, .docx dosyası ya da düz metin. Çıktı: { tarih, kilo, data: { sections, notes, recipes } }. */
window.EskiListe = (function () {
  const ETIKET = /^(KALKINCA|KALKAR KALKMAZ|SABAH|KAHVALTI|ARA(\s*ÖĞÜN)?|ÖĞLE(\s*YEMEĞİ)?|ÖĞLEN|AKŞAM(\s*YEMEĞİ)?|GECE|YATMADAN ÖNCE|SAHUR|İFTAR|ANTRENMAN (ÖNCESİ|SONRASI)|SPOR (ÖNCESİ|SONRASI))\b/i;
  const SAAT = /^\d{1,2}[.:]\d{2}(\s*[-–]\s*\d{1,2}[.:]\d{2})?$/;
  const BUYUK = s => /\p{L}/u.test(s) && s === s.toLocaleUpperCase('tr');
  const temiz = s => String(s || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/[ \t]*\n[ \t]*/g, '\n').trim();

  // ---------- bloklar: { tur: 'p', metin, linkler } | { tur: 'tablo', satirlar: [[{ metin, linkler }]] } ----------
  function htmlBloklar(html) {
    const d = new DOMParser().parseFromString(html, 'text/html');
    const bloklar = [];
    const linkler = el => [...el.querySelectorAll('a[href^="http"]')].map(a => ({ title: temiz(a.textContent), url: gercekUrl(a.href) }));
    // Hücre/paragraf metni: her paragraf ayrı satır, boş paragraf boş satır
    const metin = el => {
      const ps = [...el.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6')].filter(p => !p.querySelector('p, li'));
      if (!ps.length) return temiz(el.innerText ?? el.textContent);
      return temiz(ps.map(p => satirMetni(p)).join('\n')).replace(/\n{3,}/g, '\n\n');
    };
    const gez = el => {
      for (const c of el.children) {
        const t = c.tagName;
        if (t === 'TABLE') {
          bloklar.push({ tur: 'tablo', satirlar: [...c.rows].map(r => [...r.cells].map(h => ({ metin: metin(h), linkler: linkler(h) }))) });
        } else if (/^(P|H\d|LI)$/.test(t)) {
          bloklar.push({ tur: 'p', metin: temiz(satirMetni(c)), linkler: linkler(c) });
        } else if (/^(DIV|SECTION|ARTICLE|BODY|B|SPAN|UL|OL|MAIN|CENTER)$/.test(t)) {
          if (c.querySelector('table, p, li, h1, h2, h3, div')) gez(c);
          else if (temiz(c.textContent)) bloklar.push({ tur: 'p', metin: temiz(satirMetni(c)), linkler: linkler(c) });
        }
      }
    };
    gez(d.body);
    return bloklar;
  }
  // <br> satır sonu olsun
  function satirMetni(el) {
    const k = el.cloneNode(true);
    k.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
    return k.textContent;
  }
  // Google yönlendirme linki (google.com/url?q=…) → asıl adres
  function gercekUrl(u) {
    try { const x = new URL(u); if (/google\.[a-z.]+$/.test(x.hostname) && x.pathname === '/url' && x.searchParams.get('q')) return x.searchParams.get('q'); } catch { /* */ }
    return u;
  }

  // ---------- .docx (zip içindeki word/document.xml) ----------
  async function zipOku(buf, adlar) {
    const v = new DataView(buf), u8 = new Uint8Array(buf);
    let e = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Word dosyası okunamadı');
    const adet = v.getUint16(e + 10, true);
    let o = v.getUint32(e + 16, true);
    const cikti = {};
    const td = new TextDecoder();
    for (let n = 0; n < adet; n++) {
      const yontem = v.getUint16(o + 10, true), boy = v.getUint32(o + 20, true);
      const adBoy = v.getUint16(o + 28, true), ekBoy = v.getUint16(o + 30, true), yorumBoy = v.getUint16(o + 32, true);
      const yerel = v.getUint32(o + 42, true);
      const ad = td.decode(u8.subarray(o + 46, o + 46 + adBoy));
      if (adlar.includes(ad)) {
        const bas = yerel + 30 + v.getUint16(yerel + 26, true) + v.getUint16(yerel + 28, true);
        const veri = u8.subarray(bas, bas + boy);
        if (yontem === 0) cikti[ad] = td.decode(veri);
        else if (yontem === 8) {
          if (typeof DecompressionStream === 'undefined') throw new Error('Bu tarayıcı Word dosyasını açamıyor; listeyi kopyalayıp yapıştırın.');
          const s = new Blob([veri]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          cikti[ad] = await new Response(s).text();
        }
      }
      o += 46 + adBoy + ekBoy + yorumBoy;
    }
    return cikti;
  }
  async function docxBloklar(file) {
    const z = await zipOku(await file.arrayBuffer(), ['word/document.xml', 'word/_rels/document.xml.rels']);
    if (!z['word/document.xml']) throw new Error('Bu bir Word (.docx) dosyası değil.');
    const xml = new DOMParser().parseFromString(z['word/document.xml'], 'application/xml');
    const rels = {};
    if (z['word/_rels/document.xml.rels']) {
      const r = new DOMParser().parseFromString(z['word/_rels/document.xml.rels'], 'application/xml');
      for (const x of r.getElementsByTagName('Relationship')) rels[x.getAttribute('Id')] = x.getAttribute('Target');
    }
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const ad = el => el.localName;
    const parag = p => {
      let s = '';
      const linkler = [];
      const yuru = el => {
        for (const c of el.childNodes) {
          if (c.nodeType !== 1) continue;
          if (ad(c) === 't') s += c.textContent;
          else if (ad(c) === 'tab') s += ' ';
          else if (ad(c) === 'br' || ad(c) === 'cr') s += '\n';
          else if (ad(c) === 'hyperlink') {
            const once = s.length;
            yuru(c);
            const id = c.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            if (id && rels[id] && /^https?:/.test(rels[id])) linkler.push({ title: temiz(s.slice(once)), url: rels[id] });
          } else if (ad(c) !== 'pPr' && ad(c) !== 'rPr') yuru(c);
        }
      };
      yuru(p);
      return { metin: temiz(s), linkler };
    };
    const hucre = tc => {
      const ps = [...tc.childNodes].filter(c => c.nodeType === 1 && ad(c) === 'p').map(parag);
      return { metin: temiz(ps.map(p => p.metin).join('\n')).replace(/\n{3,}/g, '\n\n'), linkler: ps.flatMap(p => p.linkler) };
    };
    const govde = xml.getElementsByTagNameNS(W, 'body')[0];
    const bloklar = [];
    for (const c of govde.childNodes) {
      if (c.nodeType !== 1) continue;
      if (ad(c) === 'p') { const p = parag(c); bloklar.push({ tur: 'p', ...p }); }
      else if (ad(c) === 'tbl') {
        const satirlar = [...c.childNodes].filter(r => r.nodeType === 1 && ad(r) === 'tr')
          .map(r => [...r.childNodes].filter(h => h.nodeType === 1 && ad(h) === 'tc').map(hucre));
        bloklar.push({ tur: 'tablo', satirlar });
      }
    }
    return bloklar;
  }

  // ---------- düz metin (Word/PDF'ten kopyalanmış, tablosuz) ----------
  function metinBloklar(metin) {
    const satir = String(metin || '').replace(/\r/g, '').split('\n').map(s => temiz(s));
    const bloklar = [];
    let tablo = null, ogun = null;
    for (let i = 0; i < satir.length; i++) {
      const s = satir[i];
      const et = ETIKET.exec(s);
      if (et && s.length < 40) {
        // "SABAH 10.30" ya da "SABAH" + alttaki "10.30"
        let sol = s;
        if (SAAT.test(satir[i + 1] || '')) { sol += '\n' + satir[i + 1]; i++; }
        ogun = [{ metin: sol, linkler: [] }, { metin: '', linkler: [] }];
        if (!tablo) { tablo = { tur: 'tablo', satirlar: [] }; bloklar.push(tablo); }
        tablo.satirlar.push(ogun);
      } else if (ogun && !(BUYUK(s) && s.length < 60 && /PROGRAM|ÖNERİ|NOT/.test(s))) {
        ogun[1].metin += (ogun[1].metin ? '\n' : '') + s;
        (s.match(/https?:\/\/\S+/g) || []).forEach(u => ogun[1].linkler.push({ title: '', url: u }));
      } else {
        ogun = null; tablo = null;
        bloklar.push({ tur: 'p', metin: s, linkler: (s.match(/https?:\/\/\S+/g) || []).map(u => ({ title: '', url: u })) });
      }
    }
    for (const b of bloklar) if (b.tur === 'tablo') b.satirlar.forEach(r => { r[1].metin = temiz(r[1].metin).replace(/\n{3,}/g, '\n\n'); });
    return bloklar;
  }

  // ---------- bloklar → liste ----------
  function tarihOku(s) {
    const m = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/.exec(s);
    if (!m) return null;
    let y = Number(m[3]); if (y < 100) y += 2000;
    const ay = Number(m[2]), gun = Number(m[1]);
    if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return null;
    return `${y}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`;
  }
  // İmzadan sonraki satırlar: Hande'nin listelerinde tarif (başlık + malzemeler + yapılışı).
  // Kısa, rakamla başlamayan, noktayla bitmeyen ve ardından malzeme satırı (rakamla başlayan) gelen satır → yeni tarif başlığı.
  function tarifler(satirlar) {
    const baslikMi = (s, sonraki) => s.length <= 40 && !/^[\d(*•-]/.test(s) && !/[.:]$/.test(s) && /^[\d½¼¾]/.test(sonraki || '');
    const kartlar = [], artan = [];
    let k = null;
    satirlar.forEach((s, i) => {
      if (baslikMi(s, satirlar[i + 1])) { k = { title: s, body: [] }; kartlar.push(k); }
      else if (k) k.body.push(s);
      else artan.push(s);
    });
    return { recipes: kartlar.map(x => ({ title: x.title, body: x.body.join('\n'), url: '' })), artan };
  }

  function cevir(bloklar, { unvan = '' } = {}) {
    const sonuc = { tarih: null, kilo: null, data: { sections: [], notes: [], recipes: [], ekNot: '' } };
    const imzaMi = s => /^DYT\.?\s/i.test(s) || (unvan && s.toLocaleLowerCase('tr') === unvan.toLocaleLowerCase('tr'));
    let baslik = null;
    let tabloGeldi = false, imzaGecti = false;
    const imzaSonrasi = [];
    for (const b of bloklar) {
      if (b.tur === 'p') {
        for (const s of b.metin.split('\n').map(temiz).filter(Boolean)) {
          if (/^TAR[İI]H\s*:/i.test(s)) { sonuc.tarih = sonuc.tarih || tarihOku(s); continue; }
          if (/^K[İI]LO\s*:/i.test(s)) { const k = /(\d+(?:[.,]\d+)?)/.exec(s); if (k && !sonuc.kilo) sonuc.kilo = Number(k[1].replace(',', '.')); continue; }
          if (/^(ADI|AD SOYAD|ADI SOYADI|BOY|YAŞ|HEDEF)\b.*:/i.test(s)) continue;     // kişisel bilgi: danışan kartında
          if (imzaMi(s)) { if (tabloGeldi) imzaGecti = true; continue; }
          const linkVar = /https?:\/\//.test(s) || b.linkler.some(l => l.title && s.includes(l.title));
          if (imzaGecti && !linkVar) { imzaSonrasi.push(s); continue; }
          // Tablonun önündeki büyük harfli kısa satır → bölüm başlığı
          if (BUYUK(s) && s.length <= 70 && /PROGRAM|GÜN|HAFTA|NÖBET|ORUÇ|RAMAZAN|TATİL|SPOR|VARDİYA|MESAİ|DİYET/.test(s) && !/ÖNERİ/.test(s)) { baslik = s; continue; }
          const url = (s.match(/https?:\/\/\S+/) || [])[0] || b.linkler.find(l => s.includes(l.title) && l.title)?.url;
          if (url) { sonuc.data.recipes.push({ title: temiz(s.replace(url, '')) || 'Tarif', body: '', url: gercekUrl(url) }); continue; }
          // Öneri başlıkları ("RAMAZANDA BESLENME ÖNERİLERİ") not listesinde başlık olarak kalmaz
          if (BUYUK(s) && s.length < 60 && tabloGeldi) continue;
          if (tabloGeldi || !BUYUK(s)) sonuc.data.notes.push(s.replace(/^[*•\-–]\s*/, ''));
        }
      } else {
        const rows = [];
        for (const r of b.satirlar) {
          const h = r.filter(x => x.metin || x.linkler.length);
          if (!h.length) continue;
          let label = '', time = '', content = '', linkler = [];
          if (h.length === 1) {
            // Tek hücre: "SABAH 10.30\n…" ya da bölüm başlığı satırı
            const [ilk, ...kalan] = h[0].metin.split('\n');
            if (ETIKET.test(ilk)) { label = ilk; content = kalan.join('\n'); linkler = h[0].linkler; }
            else if (BUYUK(h[0].metin) && h[0].metin.length < 70) { baslik = h[0].metin; continue; }
            else { content = h[0].metin; linkler = h[0].linkler; }
          } else {
            const sol = h[0].metin.split('\n').map(temiz).filter(Boolean).join(' ');
            if (h.length >= 3 && SAAT.test(h[1].metin)) { label = sol; time = h[1].metin; content = h.slice(2).map(x => x.metin).join('\n'); linkler = h.slice(2).flatMap(x => x.linkler); }
            else {
              // Sol hücre: "ARA / 12.00- / 13.00" gibi satırlara bölünmüş saat aralığı da olabilir
              const saatler = sol.match(/\d{1,2}[.:]\d{2}/g) || [];
              label = sol.replace(/\d{1,2}[.:]\d{2}/g, ' ').replace(/\s[-–]\s|\s[-–]$|^[-–]\s/g, ' ').replace(/[-–]\s*$/, '');
              time = saatler.length >= 2 ? `${saatler[0]}-${saatler[1]}` : saatler[0] || '';
              content = h.slice(1).map(x => x.metin).join('\n'); linkler = h.slice(1).flatMap(x => x.linkler);
            }
          }
          // Etiket satırındaki saat ("SABAH 10.30")
          if (!time) { const m = /\s(\d{1,2}[.:]\d{2}(\s*[-–]\s*\d{1,2}[.:]\d{2})?)$/.exec(label); if (m) { time = m[1]; label = label.slice(0, m.index); } }
          rows.push({ label: temiz(label).toLocaleUpperCase('tr'), time: temiz(time).replace(':', '.'), content: temiz(content).replace(/\n{3,}/g, '\n\n'),
            links: linkler.filter(l => l.url).map(l => ({ title: l.title || 'Tarif', url: gercekUrl(l.url) })) });
        }
        if (rows.length) {
          sonuc.data.sections.push({ title: baslik || 'SAĞLIKLI BESLENME PROGRAMI', rows });
          baslik = null; tabloGeldi = true; imzaGecti = false;
        }
      }
    }
    if (imzaSonrasi.length) {
      const t = tarifler(imzaSonrasi);
      sonuc.data.recipes.push(...t.recipes);
      // Tarif gibi görünmeyen satırlar kaybolmasın: imzadan sonra gelenler "ek not" kutusuna
      sonuc.data.ekNot = t.artan.join('\n');
    }
    return sonuc;
  }

  return {
    // kaynak: { html } | { metin } | { dosya }
    async oku({ html, metin, dosya }, secenek) {
      let bloklar;
      if (dosya) {
        if (/\.docx$/i.test(dosya.name)) bloklar = await docxBloklar(dosya);
        else if (/\.(html?|htm)$/i.test(dosya.name)) bloklar = htmlBloklar(await dosya.text());
        else if (/\.txt$/i.test(dosya.name)) bloklar = metinBloklar(await dosya.text());
        else throw new Error('Word (.docx) dosyası seçin. Google Dokümanlar: Dosya → İndir → Microsoft Word.');
      } else if (html && /<table/i.test(html)) bloklar = htmlBloklar(html);
      else bloklar = metinBloklar(metin || (html ? new DOMParser().parseFromString(html, 'text/html').body.innerText : ''));
      return cevir(bloklar, secenek);
    },
    _ic: { htmlBloklar, metinBloklar, cevir, tarihOku },
  };
})();
