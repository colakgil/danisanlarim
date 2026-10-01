// "Yeni PDF" şablonu — modern tasarım: zaman çizelgesi öğün kartları, seçenek listeleri, tıklanabilir + QR'lı tarif linkleri.
// Veri yapısı klasik PDF ile aynıdır; içerik metni burada yorumlanarak düzenlenir. Node ve tarayıcıda aynı.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('qrcode-generator'));
  else (root.Cekirdek = root.Cekirdek || {}).pdfModern = factory(root.qrcode);
})(typeof self !== 'undefined' ? self : this, function (QR) {
  'use strict';
  QR.stringToBytes = QR.stringToBytesFuncs['UTF-8'];
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const trDateLong = iso => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-'); return `${Number(d)} ${AYLAR[Number(m) - 1]} ${y}`; };
const lower = s => s.toLocaleLowerCase('tr');
const upperFirst = s => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
const isAllCaps = s => /\p{L}/u.test(s) && s === s.toLocaleUpperCase('tr');
const titleCase = s => lower(s).replace(/(^|[\s(\/-])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('tr'));
const sentence = s => (isAllCaps(s) ? upperFirst(lower(s)) : s);
const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : null);

// Öğün etiketi → okunur ad + ikon
const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cup: '<path d="M4 8h13v5a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3"/>',
  apple: '<path d="M12 7c-1.5-1-5-1.5-6.5 1.5S5 16 7.5 19c1.5 1.8 3 1.5 4.5.8 1.5.7 3 1 4.5-.8C19 16 20 11.5 18.5 8.5S13.5 6 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5"/>',
  plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-6 10-8"/>',
};
const svg = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

function mealInfo(label, time) {
  const l = lower(label || '').trim();
  const h = parseInt((time || '').split(/[.:]/)[0], 10);
  let name = label ? titleCase(label) : 'Öğün', icon = 'plate';
  if (/kalk/.test(l)) icon = 'cup';
  else if (/sabah|kahvalt/.test(l)) { icon = 'sun'; if (l === 'sabah') name = 'Sabah'; }
  else if (/öğle/.test(l)) icon = 'bowl';
  else if (/akşam/.test(l)) icon = 'plate';
  else if (/gece|sahur/.test(l)) icon = 'moon';
  else if (/iftar/.test(l)) icon = 'plate';
  else if (/^ara/.test(l)) { name = 'Ara öğün'; icon = !isNaN(h) && h >= 20 ? 'moon' : !isNaN(h) && h < 11 ? 'cup' : 'apple'; }
  return { name, icon, time: (time || '').replace('.', ':') };
}

// Öğün metnini yapılandırılmış HTML'e çevirir:
//  - boş satırla ayrılan paragraflar
//  - tek başına "Veya" → alternatif ayracı;  tek başına "+" → "yanında" bağlacı
//  - "... veya" ile biten ardışık satırlar → "Birini seç" seçenek listesi
//  - "Kalkınca:" gibi "Etiket:" ile başlayan satırlarda etiket vurgulanır
function formatContent(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(s => s.trim());
  const out = [];
  let opts = null;
  const flushOpts = () => {
    if (!opts) return;
    if (opts.length === 1) out.push(`<p>${inline(opts[0])}</p>`);
    else out.push(`<div class="opts"><div class="opts-h">Birini seçin</div><ul>${opts.map(o => `<li>${inline(o)}</li>`).join('')}</ul></div>`);
    opts = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!ln) { flushOpts(); continue; }
    if (/^veya$/i.test(ln)) { flushOpts(); out.push('<div class="alt"><span>veya</span></div>'); continue; }
    if (ln === '+') { flushOpts(); out.push('<div class="plus"><span>+</span></div>'); continue; }
    const endsVeya = /\s+veya\s*$/i.test(ln);
    if (endsVeya) { (opts ||= []).push(ln.replace(/\s+veya\s*$/i, '')); continue; }
    if (opts) { opts.push(ln); flushOpts(); continue; }   // zincirin son seçeneği
    out.push(`<p>${inline(ln)}</p>`);
  }
  flushOpts();
  return out.join('');
}
function inline(s) {
  let h = esc(s);
  h = h.replace(/^([\p{L} ]{3,20}):\s*/u, '<b class="tag">$1</b> ');
  h = h.replace(/\s\+$/, ' <span class="and">+</span>');
  h = h.replace(/(\([^)]*\))/g, '<span class="note">$1</span>');
  return h;
}

// QR kodu (SVG) — qrcode-generator: Node'da ve tarayıcıda aynı çıktı
function qrSvg(url, color) {
  try {
    const q = QR(0, 'M');
    q.addData(url, 'Byte');
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path fill="${color}" d="${d}"/></svg>`;
  } catch { return ''; }
}

// gorsel(url) → linkin kapak görseli adresi (yoksa null); Node ve tarayıcı kendi kaynağını verir
function renderModernHtml({ list, client, brand, baseUrl, preview = false, gorsel = null }) {
  const d = list.data || {};
  const ana = brand.renkAna || '#4F7F2A';
  const vurgu = brand.renkHucre || '#CFE6B5';
  const motto = d.motto ?? brand.motto;
  const imza = d.imza ?? brand.imza;
  const notes = (d.notes || []).filter(n => n && n.trim());
  const recipes = (d.recipes || []).filter(r => r && (r.title || r.body || r.url));

  // Tüm tarif linkleri (öğün satırlarındaki + tarif kartlarındaki) → QR ekinde bir kez
  const linkMap = new Map();
  const addLink = (title, url) => { const u = safeUrl(url); if (u && !linkMap.has(u)) linkMap.set(u, { title: title || 'Tarif', url: u }); };
  (d.sections || []).forEach(s => (s.rows || []).forEach(r => (r.links || []).forEach(l => addLink(l.title, l.url))));
  recipes.forEach(r => addLink(r.title, r.url));
  const links = [...linkMap.values()];
  links.forEach(l => { l.qr = qrSvg(l.url, '#2A2D22'); });
  const qrOf = u => linkMap.get(u)?.qr || '';
  // Linkin indirilmiş kapak görseli (varsa) — base adrese göre göreli yol
  const thumbOf = u => (gorsel ? gorsel(u) : null);
  const isVid = u => /\/(reel|tv)\/|youtube\.com|youtu\.be/i.test(u || '');

  // Özel logo yüklenmediyse markanın logosunun beyaz sürümü (koyu yeşil kapak üzerinde)
  const heroLogo = brand.logo || 'logo-beyaz.png';

  const sections = (d.sections || []).map((sec, si) => {
    const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(sec.title || '');
    const main = m ? m[1] : sec.title || '';
    const tag = m ? m[2] : '';
    return `
    <section class="prog">
      <div class="prog-h">
        <div class="eyebrow">${esc(titleCase(main || 'Beslenme Programı'))}</div>
        ${tag ? `<h2>${esc(titleCase(tag))}</h2>` : ''}
      </div>
      <div class="timeline">
      ${(sec.rows || []).map(row => {
        const mi = mealInfo(row.label, row.time);
        const rl = (row.links || []).filter(l => safeUrl(l.url));
        return `
        <div class="meal">
          <div class="when"><div class="t">${esc(mi.time)}</div><div class="n">${esc(mi.name)}</div></div>
          <div class="dot">${svg(mi.icon)}</div>
          <div class="card">
            ${formatContent(row.content)}
            ${rl.length ? `<div class="chips">${rl.map(l => `<a class="chip ${thumbOf(l.url) ? 'has-t' : ''}" href="${esc(l.url)}">${thumbOf(l.url) ? `<img class="ct" src="${esc(thumbOf(l.url))}" alt="">` : svg('play', 'pi')}${esc(l.title || 'Tarifi izle')}</a>`).join('')}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
      </div>
    </section>`;
  }).join('');

  const recipeCards = recipes.length ? `
    <section class="recipes">
      <div class="block-h">${svg('leaf')}<h3>Tarifler</h3></div>
      <div class="rgrid">
      ${recipes.map(r => {
        const u = safeUrl(r.url);
        const t = u && thumbOf(u);
        return `<div class="rcard">
          ${t ? `<a class="rthumb" href="${esc(u)}" style="background-image:url('${esc(t)}')">${isVid(u) ? `<span class="rplay">${svg('play', 'pi')}</span>` : ''}</a>` : ''}
          <div class="rin">
            <div class="rt">${esc(sentence(r.title || 'Tarif'))}</div>
            ${r.body ? `<div class="rb">${esc(r.body)}</div>` : ''}
            ${u ? `<div class="rfoot"><a class="rlink" href="${esc(u)}">${svg('play', 'pi')}${isVid(u) ? 'Videoyu izle' : 'Tarifi aç'}</a><a class="qr" href="${esc(u)}">${qrOf(u)}</a></div>` : ''}
          </div>
        </div>`;
      }).join('')}
      </div>
    </section>` : '';

  // Sadece öğünlere eklenmiş (tarif kartında olmayan) linkler için QR eki
  const recipeUrls = new Set(recipes.map(r => safeUrl(r.url)).filter(Boolean));
  const rowLinks = links.filter(l => !recipeUrls.has(l.url));
  const linkAppendix = rowLinks.length ? `
    <section class="links">
      <div class="block-h">${svg('link')}<h3>Tarif bağlantıları</h3><span class="hint">Telefon kamerasıyla okutun ya da dokunun</span></div>
      <div class="lgrid">${rowLinks.map(l => `<a class="lcard" href="${esc(l.url)}">${thumbOf(l.url) ? `<span class="lthumb" style="background-image:url('${esc(thumbOf(l.url))}')"></span>` : ''}<span class="qr">${l.qr}</span><span><b>${esc(sentence(l.title))}</b><small>${esc(l.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42))}</small></span></a>`).join('')}</div>
    </section>` : '';

  const iletisim = [brand.instagram, brand.telefon, brand.web, brand.email].filter(Boolean);

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<base href="${esc(baseUrl || '/')}"${preview ? ' target="_blank"' : ''}>
<title>Beslenme Programı – ${esc(client.ad_soyad)}</title>
<style>
  @font-face { font-family: 'NunitoE'; src: url('fonts/Nunito.ttf'); font-weight: 200 1000; }
  @font-face { font-family: 'QuicksandE'; src: url('fonts/Quicksand.ttf'); font-weight: 300 700; }
  @page { size: A4; margin: 14mm 13mm 16mm 13mm; }
  @page :first { margin-top: 0; }
  :root { --ana: ${ana}; --vurgu: ${vurgu}; --metin: #2A2D22; --ikincil: #6D705F; --cizgi: #DAE8CB; --zemin: #F2F8EA; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  body { font-family: 'NunitoE', 'Nunito', system-ui, sans-serif; color: var(--metin); font-size: 10.5pt; line-height: 1.5;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  a { color: inherit; text-decoration: none; }
  .sheet { max-width: 184mm; margin: 0 auto; }

  /* kapak şeridi */
  .hero { margin: 0 -13mm 0; padding: 13mm 13mm 9mm; background: var(--ana); color: #fff; position: relative; overflow: hidden; }
  .hero::after { content: ''; position: absolute; right: -30mm; top: -34mm; width: 90mm; height: 90mm; border-radius: 50%; background: var(--vurgu); opacity: .22; }
  .hero::before { content: ''; position: absolute; right: 22mm; bottom: -26mm; width: 46mm; height: 46mm; border-radius: 50%; background: #fff; opacity: .07; }
  .hero-grid { display: flex; justify-content: space-between; align-items: center; gap: 8mm; position: relative; z-index: 1; }
  .hlogo { width: 38mm; height: auto; flex: none; ${brand.logo ? 'background:#fff;border-radius:50%;padding:3mm;' : ''} }
  .eyebrow-w { font-size: 8pt; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; opacity: .75; }
  .contact-line { position: relative; z-index: 1; margin-top: 6mm; padding-top: 3mm; border-top: 1px solid rgba(255,255,255,.2); font-size: 8.5pt; opacity: .85; letter-spacing: .03em; }
  .mono { width: 38px; height: 38px; border-radius: 50%; background: var(--vurgu); color: var(--ana); display: grid; place-items: center; font-family: 'QuicksandE'; font-weight: 700; font-size: 13pt; }
  .who img { height: 40px; width: auto; border-radius: 8px; background: #fff; padding: 3px; }
  .who b { font-family: 'QuicksandE'; font-weight: 700; font-size: 12.5pt; display: block; letter-spacing: .01em; }
  .who small { opacity: .8; font-size: 8.5pt; }
  .contact { text-align: right; font-size: 8.5pt; opacity: .85; line-height: 1.45; }
  .hero h1 { font-family: 'QuicksandE'; font-weight: 700; font-size: 25pt; line-height: 1.1; margin: 3mm 0 2mm; position: relative; z-index: 1; letter-spacing: -.01em; }
  .hero .for { font-size: 11pt; opacity: .9; position: relative; z-index: 1; }
  .facts { display: flex; gap: 8px; margin-top: 6mm; position: relative; z-index: 1; flex-wrap: wrap; }
  .fact { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.22); border-radius: 10px; padding: 6px 12px; }
  .fact small { display: block; font-size: 7.5pt; letter-spacing: .08em; text-transform: uppercase; opacity: .75; font-weight: 700; }
  .fact span { font-weight: 800; font-size: 11pt; }

  /* program */
  .prog { margin-top: 9mm; }
  .prog + .prog { margin-top: 11mm; }
  .prog-h { break-inside: avoid; margin-bottom: 5mm; padding-bottom: 3mm; border-bottom: 2px solid var(--cizgi); break-after: avoid; }
  .eyebrow { font-size: 8pt; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--ana); }
  .prog-h h2 { font-family: 'QuicksandE'; font-weight: 700; font-size: 17pt; margin: 1mm 0 0; color: var(--metin); }

  .timeline { position: relative; }
  .timeline::before { content: ''; position: absolute; left: 25.5mm; top: 6px; bottom: 6px; width: 2px; background: var(--cizgi); }
  .meal { display: grid; grid-template-columns: 21mm 10mm 1fr; gap: 0; margin-bottom: 4mm; break-inside: avoid; position: relative; }
  .when { text-align: right; padding-top: 5px; }
  .when .t { font-weight: 900; font-size: 12.5pt; color: var(--metin); font-variant-numeric: tabular-nums; line-height: 1.1; }
  .when .n { font-size: 8pt; font-weight: 700; color: var(--ikincil); text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }
  .dot { display: flex; justify-content: center; padding-top: 3px; position: relative; z-index: 1; }
  .dot svg { width: 26px; height: 26px; padding: 5px; border-radius: 50%; background: #fff; border: 2px solid var(--ana); color: var(--ana); }
  .card { background: var(--zemin); border: 1px solid var(--cizgi); border-radius: 12px; padding: 9px 13px; }
  .card p { margin: 0 0 3px; }
  .card p:last-child { margin-bottom: 0; }
  .tag { color: var(--ana); font-weight: 800; }
  .and { color: var(--ana); font-weight: 900; }
  .note { color: var(--ikincil); font-size: 9.5pt; }
  .opts { margin: 4px 0 6px; background: #fff; border: 1px solid var(--cizgi); border-radius: 9px; padding: 6px 10px 6px; }
  .opts-h { font-size: 7.5pt; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--ana); margin-bottom: 2px; }
  .opts ul { margin: 0; padding: 0; list-style: none; }
  .opts li { position: relative; padding: 2.5px 0 2.5px 16px; border-top: 1px dashed var(--cizgi); }
  .opts li:first-child { border-top: 0; }
  .opts li::before { content: ''; position: absolute; left: 2px; top: 9px; width: 7px; height: 7px; border-radius: 50%; border: 1.6px solid var(--ana); }
  .alt, .plus { display: flex; align-items: center; gap: 8px; margin: 5px 0; color: var(--ana); }
  .alt::before, .alt::after, .plus::before, .plus::after { content: ''; flex: 1; height: 1px; background: var(--cizgi); }
  .alt span { font-size: 7.5pt; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; background: #fff; border: 1px solid var(--cizgi); border-radius: 99px; padding: 0 9px; }
  .plus span { font-weight: 900; font-size: 11pt; line-height: 1; width: 18px; height: 18px; border-radius: 50%; background: var(--vurgu); color: var(--ana); display: grid; place-items: center; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 7px; }
  .chip { display: inline-flex; align-items: center; gap: 5px; background: var(--ana); color: #fff; border-radius: 99px; padding: 3px 11px 3px 8px; font-weight: 800; font-size: 8.5pt; }
  .pi { width: 11px; height: 11px; fill: currentColor; stroke: none; }

  /* kapanış */
  .closing { margin-top: 8mm; display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; break-inside: avoid; }
  .closing.solo { grid-template-columns: 1fr; }
  .box { border-radius: 14px; padding: 12px 15px; }
  .remember { background: var(--zemin); border: 1px solid var(--cizgi); }
  .block-h { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; color: var(--ana); break-after: avoid; }
  .block-h svg { width: 18px; height: 18px; }
  .block-h h3 { margin: 0; font-family: 'QuicksandE'; font-weight: 700; font-size: 12.5pt; color: var(--metin); }
  .block-h .hint { margin-left: auto; font-size: 8pt; color: var(--ikincil); }
  .remember ul { list-style: none; margin: 0; padding: 0; }
  .remember li { display: flex; gap: 8px; padding: 3px 0; font-weight: 700; }
  .remember li svg { width: 16px; height: 16px; flex: none; color: var(--ana); margin-top: 2px; }
  .motto { background: var(--ana); color: #fff; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; min-height: 30mm; }
  .motto::after { content: '“'; position: absolute; right: 8px; top: -18px; font-family: 'QuicksandE'; font-size: 90pt; opacity: .15; }
  .motto q { quotes: none; font-family: 'QuicksandE'; font-weight: 700; font-size: 14pt; line-height: 1.25; }
  .motto .sig { margin-top: 8px; font-size: 8.5pt; letter-spacing: .12em; font-weight: 800; opacity: .85; }

  .recipes, .links { margin-top: 8mm; }
  .rgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .rcard { border: 1px solid var(--cizgi); border-radius: 12px; break-inside: avoid; overflow: hidden; display: flex; flex-direction: column; }
  .rin { padding: 10px 13px 11px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
  .rthumb { display: block; height: 42mm; background: var(--zemin) center 30% / cover no-repeat; position: relative; }
  .rplay { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 11mm; height: 11mm; border-radius: 50%; background: rgba(0,0,0,.5); display: grid; place-items: center; color: #fff; }
  .rplay .pi { width: 4.5mm; height: 4.5mm; margin-left: .6mm; }
  .rfoot { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; margin-top: auto; }
  .rfoot .qr { width: 16mm; height: 16mm; }
  .lthumb { width: 17mm; height: 17mm; border-radius: 8px; flex: none; background: var(--zemin) center / cover no-repeat; }
  .chip.has-t { padding-left: 3px; }
  .ct { width: 6mm; height: 6mm; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(255,255,255,.7); }
  .rmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; align-self: stretch; }
  .rt { font-family: 'QuicksandE'; font-weight: 700; font-size: 11.5pt; }
  .rb { white-space: pre-wrap; font-size: 9.5pt; color: #4A4D3E; }
  .rlink { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; color: var(--ana); font-weight: 800; font-size: 9pt; border: 1.5px solid var(--ana); border-radius: 99px; padding: 2px 11px 2px 8px; margin-top: auto; }
  .qr { display: block; width: 19mm; height: 19mm; flex: none; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .lgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
  .lcard { display: flex; gap: 10px; align-items: center; border: 1px solid var(--cizgi); border-radius: 12px; padding: 8px 10px; break-inside: avoid; }
  .lcard .qr { width: 17mm; height: 17mm; }
  .lcard b { display: block; font-size: 10pt; }
  .lcard small { color: var(--ikincil); font-size: 8pt; word-break: break-all; }
  .eknot { margin-top: 6mm; padding: 10px 14px; border-left: 3px solid var(--vurgu); background: #F6FAF0; white-space: pre-wrap; border-radius: 0 10px 10px 0; break-inside: avoid; }
</style>
${preview ? `<style>
  @media screen { html { background: #EEF4E6; } body { padding: 14px 0; background: transparent; }
    .sheet { width: 210mm; max-width: none; padding: 0 13mm 16mm; background: #fff; box-shadow: 0 2px 12px rgba(50, 56, 30,.12); }
    .prog + .prog { margin-top: 12mm; } }
</style>
<script>
  function fit() { var w = document.documentElement.clientWidth, a4 = 794 + 28; document.body.style.zoom = w < a4 ? (w / a4) : 1; }
  addEventListener('resize', fit); addEventListener('DOMContentLoaded', fit);
</script>` : ''}
</head>
<body><div class="sheet">
  <header class="hero">
    <div class="hero-grid"><div>
    <div class="eyebrow-w">Online beslenme danışmanlığı</div>
    <h1>Kişisel Beslenme<br>Programın</h1>
    <div class="for">${esc(client.ad_soyad)} için hazırlandı</div>
    <div class="facts">
      <div class="fact"><small>Tarih</small><span>${esc(trDateLong(list.tarih))}</span></div>
      ${list.kilo ? `<div class="fact"><small>Kilo</small><span>${esc(Number(list.kilo).toLocaleString('tr-TR'))} kg</span></div>` : ''}
      ${(d.sections || []).length > 1 ? `<div class="fact"><small>Program</small><span>${(d.sections || []).length} farklı gün tipi</span></div>` : ''}
    </div>
    </div><img class="hlogo" src="${esc(heroLogo)}" alt=""></div>
    ${iletisim.length ? `<div class="contact-line">${iletisim.map(esc).join(' &nbsp;·&nbsp; ')}</div>` : ''}
  </header>

  ${sections}

  ${(notes.length || motto) ? `<div class="closing ${notes.length && motto ? '' : 'solo'}">
    ${notes.length ? `<div class="box remember"><div class="block-h">${svg('drop')}<h3>Unutma</h3></div>
      <ul>${notes.map(n => `<li>${svg('check')}<span>${esc(sentence(n))}</span></li>`).join('')}</ul></div>` : ''}
    ${motto ? `<div class="box motto"><q>${esc(motto)}</q>${imza ? `<div class="sig">— ${esc(imza)}</div>` : ''}</div>` : ''}
  </div>` : ''}

  ${recipeCards}
  ${linkAppendix}
  ${d.ekNot && d.ekNot.trim() ? `<div class="eknot">${esc(d.ekNot)}</div>` : ''}
</div></body></html>`;
}

  return { renderModernHtml, formatContent };
});
