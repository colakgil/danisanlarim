'use strict';
/* Diyetisyen Hasta Takip Kartı (anamnez) — kağıt formun birebir dijital karşılığı.
   Veri danışan kaydında JSON olarak (clients.anamnez) saklanır. app.js yardımcılarını kullanır. */

const AN = {
  saglik: [
    ['tani', 'Tanısı konulmuş hastalık'],
    ['ilac', 'Düzenli kullandığı ilaç(lar)'],
    ['ameliyat', 'Geçirdiği işlem / ameliyat'],
    ['idrar', 'İdrar söktürücü / laksatif / zayıflama ilacı / kusma öyküsü'],
    ['uyku', 'Günlük uyku düzeni'],
    ['alerji', 'Besin alerjisi'],
    ['mens', 'Menstrüasyon düzeni'],
    ['tuvalet', 'Düzenli tuvalet alışkanlığı'],
    ['sindirim', 'Sindirim sistemi problemi'],
    ['mide', 'Midesine rahatsızlık veren yiyecek / içecek'],
  ],
  aliskanlik: [
    ['ogun_duzeni', 'Öğün düzeni'],
    ['atlanan', 'Atlanan öğün'],
    ['ara_ogun', 'Ara öğün alışkanlığı'],
    ['atistirma', 'Atıştırma alışkanlığı'],
    ['vazgecilmez', 'Vazgeçilmez besin'],
    ['tuketmedigi', 'Tüketmediği besin'],
    ['disarida', 'Dışarıda yemek yeme alışkanlığı'],
    ['hizli', 'Hızlı yemek yeme alışkanlığı'],
    ['gece', 'Gece yemek yeme alışkanlığı'],
  ],
  // [anahtar, etiket, tür (sayi | eh = evet/hayır), birim, adım]
  tuketim: [
    ['su', 'Su', 'sayi', 'litre', 0.1], ['cay', 'Çay', 'sayi', 'adet', 1], ['kahve', 'Kahve', 'sayi', 'adet', 1],
    ['maden', 'Maden suyu', 'sayi', 'tane', 1], ['asitli', 'Asitli içecekler', 'eh'],
    ['seker', 'Şeker', 'sayi', 'çay kaşığı', 0.5], ['sigara', 'Sigara', 'sayi', 'adet', 1], ['alkol', 'Alkol', 'eh'],
  ],
  kilo: [
    ['baslangic', 'Ne zaman kilo almaya / vermeye başladı?'],
    ['en_yuksek_dusuk', 'Şu ana kadar görülen en yüksek / en düşük kilo'],
    ['sebep', 'Kilo alma / verme sebebi'],
    ['onceki_diyet', 'Daha önce uygulanan diyet programı / süresi / sonucu'],
    ['geri_alinan', 'Geri alındıysa / verildiyse kaç kilo?'],
  ],
  aktivite: [
    ['duzenli', 'Düzenli fiziksel aktivite (sıklığı)'],
    ['engel', 'Fiziksel aktiviteye engel sağlık sorunu'],
  ],
};
const GUNLUK_VARSAYILAN = [['Sabah', ''], ['Ara', ''], ['Öğle', ''], ['Ara', ''], ['Akşam', ''], ['Gece', '']];

function parseAnamnez(c) {
  let a = c.anamnez;
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = null; } }
  a = a && typeof a === 'object' ? a : {};
  a.saglik ||= {}; a.aliskanlik ||= {}; a.tuketim ||= {}; a.kilo ||= {}; a.aktivite ||= {};
  // Eski serbest metin alanlarından ilk doldurma
  const eski = (grp, k, v) => { if (v && !a[grp][k]) a[grp][k] = { v: 'var', a: v }; };
  eski('saglik', 'tani', c.hastaliklar); eski('saglik', 'ilac', c.ilaclar); eski('saglik', 'alerji', c.alerjiler);
  eski('aliskanlik', 'tuketmedigi', c.sevmedikleri);
  if (!Array.isArray(a.gunluk) || !a.gunluk.length) a.gunluk = GUNLUK_VARSAYILAN.map(([ogun]) => ({ ogun, saat: '', icerik: '' }));
  return a;
}

// ---------- form ----------
function vyRow(grp, [k, label], val, yeni) {
  const a = val?.a || '', v = val?.v || (yeni && !a ? 'yok' : '');   // yeni danışanda varsayılan: Yok
  const n = `an_${grp}_${k}`;
  return `<div class="vy ${v === 'var' ? 'is-var' : ''}" data-vy>
    <div class="vy-l">${esc(label)}</div>
    <div class="vy-s" role="radiogroup" aria-label="${esc(label)}">
      <label><input type="radio" name="${n}_v" value="yok" ${v === 'yok' ? 'checked' : ''}><span>Yok</span></label>
      <label><input type="radio" name="${n}_v" value="var" ${v === 'var' ? 'checked' : ''}><span>Var</span></label>
    </div>
    <input class="i vy-a" name="${n}_a" value="${esc(a)}" placeholder="Açıklama">
  </div>`;
}

function renderAnamnezForm(c) {
  const a = parseAnamnez(c);
  const yeni = !c.id;
  const txt = (grp, [k, label], full) => `<label class="f ${full ? 'full' : ''}">${esc(label)}<input class="i" name="an_${grp}_${k}" value="${esc(a[grp][k] || '')}"></label>`;
  return `
  <div class="fs"><h3>Sağlık öyküsü</h3><div class="vy-list">${AN.saglik.map(r => vyRow('saglik', r, a.saglik[r[0]], yeni)).join('')}</div></div>
  <div class="fs"><h3>Beslenme alışkanlıkları</h3><div class="vy-list">${AN.aliskanlik.map(r => vyRow('aliskanlik', r, a.aliskanlik[r[0]], yeni)).join('')}</div></div>
  <div class="fs"><h3>Günlük tüketim miktarları</h3><div class="fg tuk">${AN.tuketim.map(r => tukInput(r, a.tuketim[r[0]], yeni)).join('')}</div></div>
  <div class="fs"><h3>Kilo alma / verme öyküsü</h3><div class="fg">${AN.kilo.map(r => txt('kilo', r, true)).join('')}</div>
    <div class="muted small" style="margin-top:8px">Hedeflenen kilo, "Ölçü ve hedef" bölümündeki <b>Hedef kilo</b> alanına girilir.</div></div>
  <div class="fs"><h3>Fiziksel aktivite öyküsü</h3><div class="vy-list">${AN.aktivite.map(r => vyRow('aktivite', r, a.aktivite[r[0]], yeni)).join('')}</div></div>
  <div class="fs"><h3>Günlük beslenme düzeni</h3>
    <div class="muted small" style="margin:-6px 0 10px">Danışanın şu an bir gün içinde ne zaman, ne yediği</div>
    <div class="gunluk" id="an-gunluk">${a.gunluk.map(gunlukRow).join('')}</div>
    <button type="button" class="btn sm" id="an-gadd">${ic('plus')}Satır ekle</button></div>
  <div class="fs"><h3>Diğer notlar</h3><div class="fg">
    <label class="f full">Görüşmede alınan notlar<textarea class="i" name="an_notlar" rows="3" placeholder="Aile, iş, yaşam koşulları, özel durumlar…">${esc(a.notlar || '')}</textarea></label>
    <label class="f">Kart tarihi<input class="i" type="date" name="an_tarih" value="${esc(a.tarih || todayIso())}"></label>
    <label class="f">Uygulayan kişi<input class="i" name="an_uygulayan" value="${esc(a.uygulayan ?? S.brand.unvan ?? '')}"></label>
  </div></div>`;
}
// Eski serbest metin değerinden sayıyı çıkar ("1,5 litre" → 1.5)
const sayiAl = v => { if (v == null || v === '') return ''; if (typeof v === 'number') return v; const m = /\d+(?:[.,]\d+)?/.exec(String(v)); return m ? Number(m[0].replace(',', '.')) : ''; };
const ehAl = v => (v === 'evet' || v === 'hayir' ? v : v ? (/yok|hayır|hayir|^-+$|—/i.test(String(v)) ? 'hayir' : 'evet') : '');
function tukInput([k, label, tur, birim, adim], v, yeni) {
  if (tur === 'eh') {
    const d = ehAl(v) || (yeni ? 'hayir' : '');   // yeni danışanda varsayılan: Hayır
    return `<div class="eh-f"><span>${esc(label)}</span><div class="vy-s eh" role="radiogroup" aria-label="${esc(label)}">
      <label><input type="radio" name="an_tuketim_${k}" value="hayir" ${d === 'hayir' ? 'checked' : ''}><span>Hayır</span></label>
      <label><input type="radio" name="an_tuketim_${k}" value="evet" ${d === 'evet' ? 'checked' : ''}><span>Evet</span></label></div></div>`;
  }
  return `<label class="f">${esc(label)}<div class="birimli"><input class="i" type="number" min="0" step="${adim}" inputmode="decimal" name="an_tuketim_${k}" value="${esc(sayiAl(v))}"><span>${esc(birim)}</span></div></label>`;
}
// Görünüm metni: "1,5 litre", "Evet"
function tukMetin([k, , tur, birim], v) {
  if (tur === 'eh') { const d = ehAl(v); return d === 'evet' ? 'Evet' : d === 'hayir' ? 'Hayır' : ''; }
  const n = sayiAl(v); return n === '' ? '' : `${Number(n).toLocaleString('tr-TR')} ${birim}`;
}

function gunlukRow(g) {
  return `<div class="g-row"><input class="i g-ogun" value="${esc(g.ogun || '')}" placeholder="Öğün" list="an-ogunler"><input class="i g-saat" value="${esc(g.saat || '')}" placeholder="Saat">
    <input class="i g-icerik" value="${esc(g.icerik || '')}" placeholder="Ne yiyor / içiyor?"><button type="button" class="tbtn del g-del" title="Satırı sil">${ic('x')}</button></div>`;
}
function bindAnamnezForm(root) {
  root.addEventListener('change', e => { const r = e.target.closest('[data-vy]'); if (r && e.target.type === 'radio') r.classList.toggle('is-var', e.target.value === 'var'); });
  // Açıklama yazılınca otomatik "Var"
  root.addEventListener('input', e => {
    if (!e.target.classList.contains('vy-a') || !e.target.value.trim()) return;
    const r = e.target.closest('[data-vy]'); const rv = r.querySelector('input[value=var]');
    if (!r.querySelector('input:checked')) { rv.checked = true; r.classList.add('is-var'); }
  });
  $('#an-gadd', root).onclick = () => $('#an-gunluk', root).insertAdjacentHTML('beforeend', gunlukRow({}));
  $('#an-gunluk', root).onclick = e => { const d = e.target.closest('.g-del'); if (d) d.closest('.g-row').remove(); };
  if (!$('#an-ogunler')) document.body.insertAdjacentHTML('beforeend', `<datalist id="an-ogunler">${['Sabah', 'Ara', 'Öğle', 'Akşam', 'Gece'].map(o => `<option>${o}</option>`).join('')}</datalist>`);
}
function collectAnamnez(form) {
  const fd = new FormData(form);
  const a = { saglik: {}, aliskanlik: {}, tuketim: {}, kilo: {}, aktivite: {} };
  for (const grp of ['saglik', 'aliskanlik', 'aktivite']) for (const [k] of AN[grp]) {
    const v = fd.get(`an_${grp}_${k}_v`) || '', t = (fd.get(`an_${grp}_${k}_a`) || '').trim();
    if (v || t) a[grp][k] = { v: v || (t ? 'var' : ''), a: t };
  }
  for (const [k, , tur] of AN.tuketim) {
    const t = (fd.get(`an_tuketim_${k}`) || '').trim();
    if (t !== '') a.tuketim[k] = tur === 'eh' ? t : Number(t.replace(',', '.'));
  }
  for (const [k] of AN.kilo) { const t = (fd.get(`an_kilo_${k}`) || '').trim(); if (t) a.kilo[k] = t; }
  a.gunluk = $$('.g-row', form).map(r => ({ ogun: $('.g-ogun', r).value.trim(), saat: $('.g-saat', r).value.trim(), icerik: $('.g-icerik', r).value.trim() }))
    .filter(g => g.ogun || g.saat || g.icerik);
  a.notlar = (fd.get('an_notlar') || '').trim();
  a.tarih = fd.get('an_tarih') || '';
  a.uygulayan = (fd.get('an_uygulayan') || '').trim();
  return a;
}
// FormData'dan anamnez alanlarını ayıkla (danışan kaydına düz alan olarak gitmesin)
function stripAnamnez(body) { for (const k of Object.keys(body)) if (k.startsWith('an_')) delete body[k]; return body; }

// ---------- okuma görünümü ----------
function vyView(grp, rows, a, { sadeceDolu } = {}) {
  return rows.map(([k, label]) => {
    const x = a[grp][k]; const v = x?.v;
    if (sadeceDolu && !v && !x?.a) return '';
    return `<div class="vy-v ${v === 'var' ? 'is-var' : ''}"><span>${esc(label)}</span>
      <b class="badge ${v === 'var' ? 'sari' : v === 'yok' ? '' : ''}">${v === 'var' ? 'Var' : v === 'yok' ? 'Yok' : '—'}</b>
      <em>${esc(x?.a || '')}</em></div>`;
  }).join('');
}
function renderAnamnezView(c) {
  const a = parseAnamnez(c);
  const dl = (grp, rows) => rows.filter(([k]) => a[grp][k]).map(([k, l]) => `<dt>${esc(l)}</dt><dd>${esc(a[grp][k])}</dd>`).join('');
  const gun = a.gunluk.filter(g => g.saat || g.icerik);
  const bos = '<div class="muted small">Doldurulmamış</div>';
  return `
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Sağlık öyküsü</h2></div><div class="card-pad vy-view">${vyView('saglik', AN.saglik, a)}</div></div>
    <div class="card"><div class="card-head"><h2>Beslenme alışkanlıkları</h2></div><div class="card-pad vy-view">${vyView('aliskanlik', AN.aliskanlik, a)}</div></div>
  </div>
  <div class="grid g3" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Günlük tüketim</h2></div><div class="card-pad"><dl class="info-list">${AN.tuketim.map(r => [r[1], tukMetin(r, a.tuketim[r[0]])]).filter(([, v]) => v).map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('') || bos}</dl></div></div>
    <div class="card"><div class="card-head"><h2>Kilo öyküsü</h2></div><div class="card-pad"><dl class="info-list tek">${dl('kilo', AN.kilo)}${c.hedef_kilo ? `<dt>Hedeflenen kilo</dt><dd>${fmtNum(c.hedef_kilo)} kg</dd>` : ''}</dl>${dl('kilo', AN.kilo) || c.hedef_kilo ? '' : bos}</div></div>
    <div class="card"><div class="card-head"><h2>Fiziksel aktivite</h2></div><div class="card-pad vy-view">${vyView('aktivite', AN.aktivite, a)}</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-head"><h2>Günlük beslenme düzeni</h2></div>
      ${gun.length ? `<div class="list" style="margin-top:6px">${gun.map(g => `<div class="item"><div class="appt-time"><b>${esc(g.saat || '—')}</b><span>${esc(g.ogun)}</span></div><div class="appt-bar"></div><div class="grow">${esc(g.icerik)}</div></div>`).join('')}</div>` : `<div class="card-pad">${bos}</div>`}</div>
    <div class="card"><div class="card-head"><h2>Notlar</h2></div><div class="card-pad">
      ${a.notlar ? `<div style="white-space:pre-wrap">${esc(a.notlar)}</div>` : bos}
      ${a.tarih || a.uygulayan ? `<div class="muted small" style="margin-top:12px">Kart tarihi: ${a.tarih ? fmtDate(a.tarih) : '—'}${a.uygulayan ? ` · Uygulayan: ${esc(a.uygulayan)}` : ''}</div>` : ''}</div></div>
  </div>`;
}
// Genel bakış için: "Var" işaretli önemli maddeler
function anamnezOzet(c) {
  const a = parseAnamnez(c);
  const out = [];
  for (const [grp, rows] of [['saglik', AN.saglik], ['aliskanlik', AN.aliskanlik], ['aktivite', AN.aktivite]])
    for (const [k, l] of rows) { const x = a[grp][k]; if (x?.v === 'var') out.push([l, x.a || 'Var']); }
  for (const r of AN.tuketim) { const m = tukMetin(r, a.tuketim[r[0]]); if (m && (r[2] === 'eh' ? m === 'Evet' : Number(sayiAl(a.tuketim[r[0]])) > 0)) out.push([r[1], m]); }
  if (a.kilo.onceki_diyet) out.push(['Önceki diyet', a.kilo.onceki_diyet]);
  if (a.notlar) out.push(['Notlar', a.notlar]);
  return out;
}
