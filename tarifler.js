'use strict';
/* Tarif kütüphanesi: kategoriler, kapak görselli kartlar, uygulama içi video önizleme, öğüne link ekleme.
   app.js'teki yardımcıları kullanır ($, $$, api, modal, ic, esc, toast, onErr, confirmBox). */

const TARIF_KAT = ['SABAH', 'ÖĞLE', 'AKŞAM', 'ARA ÖĞÜN', 'ATIŞTIRMALIK & TATLI', 'İÇECEK', 'BİLGİ & VİDEO'];
const KAT_AD = { 'SABAH': 'Sabah', 'ÖĞLE': 'Öğle', 'AKŞAM': 'Akşam', 'ARA ÖĞÜN': 'Ara öğün', 'ATIŞTIRMALIK & TATLI': 'Atıştırmalık & tatlı', 'İÇECEK': 'İçecek', 'BİLGİ & VİDEO': 'Bilgi & video' };
const katAd = k => KAT_AD[k] || (k ? k.charAt(0) + k.slice(1).toLocaleLowerCase('tr') : 'Diğer');

// Uygulama içinde oynatılabilen gömme adresi — yalnızca YouTube.
// Instagram reelleri başka sitelerde oynamıyor ("Instagram'da izle" + siyah alan); onlar için kapak görseli + dokununca Instagram.
function embedUrl(url) {
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/i.exec(url || '');
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return null;
}

function kapak(b, cls = '') {
  const video = b.video || /\/(reel|tv)\//.test(b.url || '');
  // Instagram kapak görselinin ortasında zaten oynatma simgesi var; sadece köşeye küçük video işareti
  if (b.gorsel) return `<div class="kapak ${cls}" style="background-image:url('${esc(b.gorsel)}')">${video ? `<span class="play" title="Video">${ic('play')}</span>` : ''}</div>`;
  if (b.url) return `<div class="kapak bos ${cls}"><span>${video ? ic('play') : ic('link')}</span><small>${b.onizleme === 'hata' ? 'Önizleme yok' : 'Önizleme hazırlanıyor…'}</small></div>`;
  return `<div class="kapak bos metin ${cls}"><span>${ic('book')}</span><small>Tarif metni</small></div>`;
}

// Bir kayıt birden fazla kategoride olabilir: "SABAH,ARA ÖĞÜN" (virgülle ayrılır)
const katlar = b => String(b.kategori || '').split(',').map(s => s.trim()).filter(Boolean);
// Mevsim de bir kategori olarak tutulur ama ayrı filtrelenir/seçilir
const MEVSIM = ['YAZ', 'KIŞ'];
// Not kategorileri
const NOT_KAT = ['SU', 'ÇAY & KAHVE', 'SPOR', 'BESLENME KURALI', 'PORSİYON', 'MOTİVASYON'];
const mevsimMi = k => MEVSIM.includes(k);
const katRozet = b => katlar(b).map(k => `<span class="badge ${k === 'YAZ' ? 'sari' : mevsimMi(k) ? '' : 'mor'}">${esc(katAd(k))}</span>`).join(' ');
// sira: kategorilerin gösterim sırası; listede olup sırada olmayanlar sona eklenir, hiç kategorisi olmayanlar "Diğer"
function katChips(list, secili, id, sira = TARIF_KAT) {
  const ekstra = [...new Set(list.flatMap(katlar))].filter(k => !sira.includes(k) && !mevsimMi(k));
  const tum = sira.concat(ekstra);
  const say = k => list.filter(b => katlar(b).includes(k)).length;
  const digerSay = list.filter(b => !katlar(b).some(k => tum.includes(k))).length;
  const kats = tum.filter(k => say(k)).concat(digerSay ? ['DİĞER'] : []);
  return `<div class="chips-row" id="${id}"><button data-k="" class="${secili ? '' : 'on'}">Tümü <i>${list.length}</i></button>${kats.map(k => `<button data-k="${esc(k)}" class="${secili === k ? 'on' : ''}">${esc(k === 'DİĞER' ? 'Diğer' : katAd(k))} <i>${k === 'DİĞER' ? digerSay : say(k)}</i></button>`).join('')}</div>`;
}
const katUyar = (b, k) => !k || (k === 'DİĞER' ? !katlar(b).some(x => !mevsimMi(x)) : katlar(b).includes(k));
// Mevsim filtresi (öğün/kategori filtresiyle birlikte çalışır); hiç mevsimli kayıt yoksa gösterilmez
function mevsimChips(list, secili, id) {
  const say = k => list.filter(b => katlar(b).includes(k)).length;
  if (!MEVSIM.some(say)) return '';
  return `<div class="chips-row" id="${id}"><button data-k="" class="${secili ? '' : 'on'}">Tüm mevsimler</button>${MEVSIM.map(k => `<button data-k="${k}" class="${secili === k ? 'on' : ''}">${katAd(k)} <i>${say(k)}</i></button>`).join('')}</div>`;
}
const mevsimUyar = (b, m) => !m || katlar(b).includes(m);
// Tek seçimli düğme grubu (filtre satırları)
function tekSecimBagla(el, onSec) {
  if (!el) return;
  el.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onSec(b.dataset.k); };
}

// Kategori seçici (çoklu): düğmelere dokunarak birden fazla seçilir; değer virgülle birleştirilir
// haric: bu seçicide gösterilmeyecek değerler (ör. mevsimler ayrı seçicide)
function katSecici(id, secenekler, secili, haric = []) {
  const s = new Set(String(secili || '').split(',').map(x => x.trim()).filter(x => x && !haric.includes(x)));
  const tum = secenekler.concat([...s].filter(k => !secenekler.includes(k)));
  return `<div class="chips-row kat-sec" id="${id}" style="flex-wrap:wrap;margin-bottom:0">${tum.map(k => `<button type="button" data-k="${esc(k)}" class="${s.has(k) ? 'on' : ''}">${esc(katAd(k))}</button>`).join('')}</div>`;
}
// tek: true ise düğmelerden yalnızca biri seçili kalır (ör. tarifte mevsim)
function katSeciciBagla(el, tek = () => false) {
  el.onclick = e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    if (tek()) el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    else b.classList.toggle('on');
  };
}
const katSeciciDeger = el => [...el.querySelectorAll('button.on')].map(b => b.dataset.k).join(',');

// Tarif detayı: video/gönderi uygulama içinde oynar, altında malzemeler
function tarifModal(b, { onEdit } = {}) {
  const emb = embedUrl(b.url);
  const ig = /instagram\.com/i.test(b.url || '');
  const m = modal({
    title: esc(b.baslik), size: 'lg',
    body: `<div class="tarif-detay">
      ${emb ? `<div class="embed yt"><iframe src="${esc(emb)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" title="${esc(b.baslik)}"></iframe></div>`
    : b.url ? `<a class="kapak-link" href="${esc(b.url)}" target="_blank" rel="noopener" title="${ig ? "Instagram'da izle" : 'Linki aç'}">${kapak(b, 'buyuk')}<span class="kapak-oynat">${ic('play')}<b>${ig ? "Instagram'da izle" : 'Aç'}</b></span></a>`
    : kapak(b, 'buyuk')}
      <div>
        ${katRozet(b)}
        <div style="white-space:pre-wrap;margin-top:10px;line-height:1.55">${esc(b.icerik || 'Tarif metni eklenmemiş; detaylar videoda.')}</div>
      </div></div>`,
    foot: `${onEdit ? `<button class="btn" id="td-ed" style="margin-right:auto">${ic('edit')}Düzenle</button>` : ''}
      ${b.url ? `<a class="btn" href="${esc(b.url)}" target="_blank" rel="noopener">${ic('link')}${ig ? "Instagram'da aç" : 'Linki aç'}</a>` : ''}
      <button class="btn primary" data-close>Kapat</button>`,
  });
  $('#td-ed', m.el) && ($('#td-ed', m.el).onclick = () => { m.close(); onEdit(b); });
}

// Kütüphane > Tarifler sekmesi
function renderTarifGrid(el, list, { onEdit, onDelete }) {
  const st = renderTarifGrid.st || (renderTarifGrid.st = { k: '', q: '', m: '' });
  const draw = () => {
    const q = st.q.toLocaleLowerCase('tr');
    const rows = list.filter(b => katUyar(b, st.k) && mevsimUyar(b, st.m) && (!q || (b.baslik + ' ' + b.icerik).toLocaleLowerCase('tr').includes(q)));
    $('#tg-l', el).innerHTML = rows.map(b => `
      <div class="tkart" data-id="${b.id}">
        <button class="tkart-g" data-open="${b.id}" aria-label="${esc(b.baslik)}">${kapak(b)}</button>
        <div class="tkart-b">
          <div class="tkart-t">${esc(b.baslik)}</div>
          <div class="row" style="gap:6px;justify-content:space-between;flex-wrap:nowrap">
            <span class="row" style="gap:4px">${katRozet(b)}</span>
            <span class="row" style="gap:0;flex-wrap:nowrap"><button class="tbtn" data-eb="${b.id}" title="Düzenle">${ic('edit')}</button><button class="tbtn del" data-db="${b.id}" title="Sil">${ic('trash')}</button></span>
          </div>
        </div>
      </div>`).join('') || '<div class="empty" style="grid-column:1/-1">Bu kategoride tarif yok</div>';
  };
  el.innerHTML = `<div class="row" style="margin-bottom:12px"><div class="search grow" style="min-width:200px">${ic('search')}<input class="i" id="tg-q" type="search" placeholder="Tarif ara (ör. smoothie, brownie, kabak)" value="${esc(st.q)}"></div></div>
    ${katChips(list, st.k, 'tg-c')}${mevsimChips(list, st.m, 'tg-m')}
    <div class="tgrid" id="tg-l"></div>`;
  draw();
  $('#tg-q', el).oninput = e => { st.q = e.target.value; draw(); };
  tekSecimBagla($('#tg-c', el), k => { st.k = k; draw(); });
  tekSecimBagla($('#tg-m', el), k => { st.m = k; draw(); });
  $('#tg-l', el).onclick = e => {
    const o = e.target.closest('[data-open]'), ed = e.target.closest('[data-eb]'), dl = e.target.closest('[data-db]');
    if (o) tarifModal(list.find(b => b.id == o.dataset.open), { onEdit });
    if (ed) onEdit(list.find(b => b.id == ed.dataset.eb));
    if (dl) onDelete(dl.dataset.db);
  };
}

// Öğüne tarif linki: kütüphanedeki linkli tariflerden (kapak görselli) seç ya da yeni link gir
function linkModal(blocks, onAdd) {
  const lib = blocks.filter(b => b.tur === 'tarif' && b.url);
  let kat = '';
  const m = modal({
    title: 'Tarif linki ekle', size: 'lg',
    body: `${lib.length ? `<div class="search" style="margin-bottom:10px">${ic('search')}<input class="i" id="lk-q" type="search" placeholder="Tarif ara (ör. smoothie, brownie)"></div>
      ${katChips(lib, '', 'lk-c')}
      <div class="tgrid kucuk" id="lk-l"></div>` : ''}
      <details class="yeni-link" ${lib.length ? '' : 'open'}><summary>${ic('plus')} Listede olmayan yeni bir link ekle</summary>
        <div class="fg" style="grid-template-columns:1fr 1.4fr;margin-top:10px">
          <label class="f">Başlık<input class="i" id="lk-t" placeholder="Örn. Yulaf lapası tarifi"></label>
          <label class="f">Link<input class="i" id="lk-u" inputmode="url" placeholder="instagram.com/reel/…"></label>
          <label class="f">Kategori<select class="i" id="lk-k">${TARIF_KAT.map(k => `<option value="${esc(k)}">${esc(katAd(k))}</option>`).join('')}</select></label>
          <label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="lk-save" checked> Kütüphaneye de kaydet</label>
        </div>
        <div style="text-align:right;margin-top:8px"><button class="btn primary" id="lk-ok">Ekle</button></div>
      </details>`,
  });
  const draw = () => {
    const q = ($('#lk-q', m.el)?.value || '').toLocaleLowerCase('tr');
    const rows = lib.filter(b => katUyar(b, kat) && (!q || (b.baslik + ' ' + (b.icerik || '')).toLocaleLowerCase('tr').includes(q)));
    $('#lk-l', m.el).innerHTML = rows.map(b => `<button class="tkart secim" data-id="${b.id}">${kapak(b)}<div class="tkart-b"><div class="tkart-t">${esc(b.baslik)}</div>${katRozet(b)}</div></button>`).join('')
      || '<div class="empty" style="grid-column:1/-1">Eşleşen tarif yok</div>';
  };
  if (lib.length) {
    draw();
    $('#lk-q', m.el).oninput = draw;
    $('#lk-c', m.el).onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; kat = b.dataset.k; $$('#lk-c button', m.el).forEach(x => x.classList.toggle('on', x === b)); draw(); };
    $('#lk-l', m.el).onclick = e => {
      const b = e.target.closest('[data-id]'); if (!b) return;
      const bl = lib.find(x => x.id == b.dataset.id); m.close(); onAdd({ title: bl.baslik, url: bl.url });
    };
  }
  $('#lk-ok', m.el).onclick = async () => {
    const title = $('#lk-t', m.el).value.trim(), url = $('#lk-u', m.el).value.trim();
    if (!url) return toast('Link girin');
    const full = /^https?:\/\//i.test(url) ? url : 'https://' + url;
    if ($('#lk-save', m.el).checked) {
      try {
        const body = { tur: 'tarif', kategori: $('#lk-k', m.el).value, baslik: title || 'Tarif', icerik: '', url: full };
        const r = await api('/blocks', { method: 'POST', body });
        blocks.push({ id: r.id, ...body });
      } catch (e) { onErr(e); }
    }
    m.close(); onAdd({ title: title || 'Tarifi izle', url: full });
  };
}
