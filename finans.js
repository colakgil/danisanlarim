'use strict';
/* Paketler, danışan paketi, tahsilatlar, giderler ve finans özeti.
   app.js'teki yardımcıları kullanır ($, $$, api, modal, ic, esc, toast, onErr, confirmBox, fmtDate, todayIso, addDays). */

const tl = (n, dig = 0) => (n == null || n === '' ? '—' : Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: 2 }) + ' ₺');
const YONTEM = ['Havale/EFT', 'Kredi kartı', 'Nakit', 'Diğer'];
const GIDER_KAT = ['Reklam & sosyal medya', 'Yazılım & abonelik', 'Muhasebe', 'Vergi & SGK', 'Kira & ofis', 'Eğitim', 'Ekipman', 'Diğer'];
const CP_DURUM = { aktif: ['Aktif', 'yesil'], tamamlandi: ['Tamamlandı', ''], iptal: ['İptal', 'kirmizi'] };
const AY_AD = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const sureMetin = g => (!g ? 'Süresiz' : g % 30 === 0 ? `${g / 30} ay` : g % 7 === 0 ? `${g / 7} hafta` : `${g} gün`);
const ayAralik = ay => { const [y, m] = ay.split('-').map(Number); return [`${ay}-01`, `${ay}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`]; };
const ayKaydir = (ay, n) => { const [y, m] = ay.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const opts = (arr, cur) => arr.map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');

// ============ FİNANS SAYFASI ============
async function viewFinance(main, tab, donem) {
  tab = ['ozet', 'rapor', 'satislar', 'tahsilat', 'gider', 'paketler'].includes(tab) ? tab : 'ozet';
  const buAy = todayIso().slice(0, 7);
  // dönem: YYYY-MM (ay) | YYYY (yıl) | tum
  donem = /^\d{4}(-\d{2})?$/.test(donem || '') || donem === 'tum' ? donem : buAy;
  const yil = /^\d{4}$/.test(donem);
  const [from, to] = donem === 'tum' ? ['2000-01-01', '2099-12-31'] : yil ? [`${donem}-01-01`, `${donem}-12-31`] : ayAralik(donem);
  const baslik = donem === 'tum' ? 'Tüm zamanlar' : yil ? `${donem} yılı` : `${AY_AD[Number(donem.slice(5)) - 1]} ${donem.slice(0, 4)}`;
  const go = (t, d) => { location.hash = `#/finans/${t}/${d}`; };
  const refresh = () => viewFinance(main, tab, donem);

  main.innerHTML = `
  <div class="page-head" style="margin-bottom:10px">
    <div><h1>Finans</h1><div class="sub">${esc(baslik)}</div></div>
    <div class="row">
      ${paraGoz()}
      <button class="btn" id="f-gider">${ic('minus')}<span>Gider</span></button>
      <button class="btn primary" id="f-tahsil">${ic('plus')}<span>Tahsilat</span></button>
    </div>
  </div>
  <div class="row" style="margin-bottom:6px">
    ${donem === 'tum' ? '' : `<button class="btn icon sm" id="f-prev" aria-label="Önceki">${ic('back')}</button>`}
    <div class="seg" id="f-mod"><button data-m="ay" class="${!yil && donem !== 'tum' ? 'on' : ''}">Ay</button><button data-m="yil" class="${yil ? 'on' : ''}">Yıl</button><button data-m="tum" class="${donem === 'tum' ? 'on' : ''}">Tümü</button></div>
    ${donem === 'tum' ? '' : `<button class="btn icon sm" id="f-next" aria-label="Sonraki">${ic('back', 'style="transform:rotate(180deg)"')}</button>`}
    <a class="btn sm ghost" href="/api/finans/csv?from=${from}&to=${to}" download style="margin-left:auto">${ic('save')}<span>Muhasebeci için Excel (CSV)</span></a>
  </div>
  <div class="tabs" id="f-tabs">${[['ozet', 'Özet'], ['rapor', 'Raporlar'], ['satislar', 'Paket satışları'], ['tahsilat', 'Tahsilatlar'], ['gider', 'Giderler'], ['paketler', 'Paket tanımları']].map(([k, t]) => `<button data-k="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>
  <div id="f-body"><div class="empty">Yükleniyor…</div></div>`;

  $('#f-tabs').onclick = e => { const b = e.target.closest('[data-k]'); if (b) go(b.dataset.k, donem); };
  $('#f-mod').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; go(tab, b.dataset.m === 'ay' ? buAy : b.dataset.m === 'yil' ? buAy.slice(0, 4) : 'tum'); };
  $('#f-prev') && ($('#f-prev').onclick = () => go(tab, yil ? String(Number(donem) - 1) : ayKaydir(donem, -1)));
  $('#f-next') && ($('#f-next').onclick = () => go(tab, yil ? String(Number(donem) + 1) : ayKaydir(donem, 1)));
  $('#f-tahsil').onclick = () => paymentModal(null, null, refresh);
  $('#f-gider').onclick = () => expenseModal(null, refresh);

  const el = $('#f-body');
  if (tab === 'ozet') return renderFinOzet(el, await api(`/finans?from=${from}&to=${to}`), refresh);
  if (tab === 'rapor') return renderRapor(el, await api(`/finans/rapor?from=${from}&to=${to}`), donem === 'tum', refresh);
  if (tab === 'satislar') return renderSatislar(el, await api(`/sales?from=${from}&to=${to}`), refresh);
  if (tab === 'tahsilat') return renderTahsilatlar(el, await api(`/payments?from=${from}&to=${to}`), refresh);
  if (tab === 'gider') return renderGiderler(el, await api(`/expenses?from=${from}&to=${to}`), refresh);
  return renderPaketler(el, await api('/packages?hepsi=1'), refresh);
}

function renderFinOzet(el, d, refresh) {
  const bar = (rows, key) => { const t = rows.reduce((a, r) => a + r.t, 0) || 1; return rows.map(r => `<div class="dagilim"><div class="row" style="justify-content:space-between"><span>${esc(r[key] || 'Diğer')}</span><b class="num">${para(r.t)}</b></div><div class="dbar"><i style="width:${(r.t / t) * 100}%"></i></div></div>`).join(''); };
  el.innerHTML = `
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="k">Tahsilat</div><div class="v num">${para(d.tahsilat)}</div><div class="d muted">${d.tahsilatAdet} ödeme</div></div>
    <div class="card stat"><div class="k">Gider</div><div class="v num">${para(d.gider)}</div><div class="d muted">&nbsp;</div></div>
    <div class="card stat"><div class="k">Net</div><div class="v num ${d.net < 0 ? 'up' : 'down'}">${para(d.net)}</div><div class="d muted">Tahsilat − gider</div></div>
    <div class="card stat"><div class="k">Açık alacak (toplam)</div><div class="v num ${d.alacak > 0 ? 'up' : ''}">${para(d.alacak)}</div><div class="d muted">${d.borclular.length} danışan</div></div>
  </div>
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Son 12 ay</h2><div class="legend"><span><i class="lg-g"></i>Tahsilat</span><span><i class="lg-e"></i>Gider</span></div></div>
      <div class="card-pad" id="f-grafik">${finChart(d.aylar)}</div></div>
    <div class="card"><div class="card-head"><h2>Dönemde satılan paketler</h2><span class="badge">${d.satisAdet} paket · ${para(d.satis)}</span></div>
      <div class="card-pad">${d.paketDagilim.length ? d.paketDagilim.map(p => `<div class="dagilim"><div class="row" style="justify-content:space-between"><span>${esc(p.ad)} <span class="muted small">×${p.n}</span></span><b class="num">${para(p.t)}</b></div><div class="dbar"><i style="width:${(p.t / (d.satis || 1)) * 100}%"></i></div></div>`).join('') : '<div class="empty">Bu dönemde paket satışı yok</div>'}
      ${d.yontemDagilim.length ? `<h3 style="margin:18px 0 8px">Ödeme yöntemleri</h3>${bar(d.yontemDagilim, 'yontem')}` : ''}
      ${d.giderDagilim.length ? `<h3 style="margin:18px 0 8px">Gider kalemleri</h3>${bar(d.giderDagilim, 'kategori')}` : ''}</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-head"><h2>Bakiyesi olan danışanlar</h2><span class="badge ${d.borclular.length ? 'kirmizi' : ''}">${para(d.alacak)}</span></div>
      <div class="list" style="margin-top:8px" id="f-borc">${d.borclular.map(c => `<div class="item">
        <a class="avatar" href="#/danisan/${c.id}/odeme">${esc(initials(c.ad_soyad))}</a>
        <a class="grow" href="#/danisan/${c.id}/odeme" style="color:inherit"><div class="t">${esc(c.ad_soyad)}</div><div class="s">${esc(c.paket || '')}${c.son_odeme ? ` · son ödeme ${fmtDate(c.son_odeme)}` : ' · henüz ödeme yok'}</div></a>
        <b class="num up">${para(c.bakiye)}</b>
        <button class="btn sm soft" data-tahsil="${c.id}">Tahsilat</button></div>`).join('') || '<div class="empty">Açık alacak yok 👍</div>'}</div></div>
    <div class="card"><div class="card-head"><h2>Faturası kesilmemiş dönemler</h2><span class="badge ${d.faturasiz.length ? 'sari' : ''}">${d.faturasiz.length}</span></div>
      <div class="muted small" style="padding:4px 20px 0">Diyet dönemi için faturayı kestikten sonra işaretleyin</div>
      <div class="list" style="margin-top:4px" id="f-fat">${d.faturasiz.map(p => `<div class="item">
        <div class="grow"><div class="t">${esc(p.ad_soyad)}</div><div class="s">${esc(p.ad)} · ${fmtDate(p.baslangic)}${p.odenen < p.tutar ? ` · <span class="up">${para(p.tutar - p.odenen)} ödenmedi</span>` : ''}</div></div>
        <b class="num">${para(p.tutar)}</b><button class="btn sm" data-fcp="${p.id}">Fatura kesildi</button></div>`).join('') || '<div class="empty">Tüm dönemlerin faturası kesilmiş 👍</div>'}</div></div>
  </div>`;
  const fg = $('#f-grafik'), fCiz = () => { if (document.body.contains(fg)) fg.innerHTML = finChart(d.aylar, grafikGenislik(fg)); };
  fCiz(); grafikIzle(fg, fCiz);
  $('#f-borc').onclick = async e => { const b = e.target.closest('[data-tahsil]'); if (!b) return; const c = await api('/clients/' + b.dataset.tahsil); paymentModal(c, null, refresh); };
  $('#f-fat').onclick = e => { const b = e.target.closest('[data-fcp]'); if (b) faturaModal(d.faturasiz.find(x => x.id == b.dataset.fcp), refresh); };
}

// Diyet dönemi (danışan paketi) faturası
function faturaModal(cp, onDone) {
  const kesik = !!cp.fatura_kesildi;
  const m = modal({ title: 'Dönem faturası',
    body: `<div class="muted small" style="margin-bottom:12px"><b style="color:var(--metin)">${esc(cp.ad_soyad || '')}</b> · ${esc(cp.ad)} · ${fmtDate(cp.baslangic)}${cp.bitis ? ' – ' + fmtDate(cp.bitis) : ''} · <b style="color:var(--metin)">${tl(cp.tutar)}</b></div>
      <div class="seg" id="fk" style="margin-bottom:14px"><button type="button" data-v="1" class="${kesik ? '' : 'on'}">Fatura kesildi</button><button type="button" data-v="0" class="${kesik ? 'on' : ''}">Kesilmedi</button></div>
      <div class="fg" id="fk-f"><label class="f">Fatura no (isteğe bağlı)<input class="i" id="fn" value="${esc(cp.fatura_no || '')}" placeholder="Örn. GIB2026000000123"></label>
      <label class="f">Fatura tarihi<input class="i" type="date" id="ft" value="${esc(cp.fatura_tarihi || todayIso())}"></label></div>`,
    foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="fok">Kaydet</button>` });
  let v = kesik ? 0 : 1;
  const sync = () => $('#fk-f', m.el).classList.toggle('hidden', !v);
  $('#fk', m.el).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; v = Number(b.dataset.v); $$('#fk button', m.el).forEach(x => x.classList.toggle('on', x === b)); sync(); };
  sync();
  $('#fok', m.el).onclick = async () => {
    try { await api(`/client-packages/${cp.id}/fatura`, { method: 'PATCH', body: { fatura_kesildi: !!v, fatura_no: $('#fn', m.el).value, fatura_tarihi: $('#ft', m.el).value } }); m.close(); toast(v ? 'Fatura kesildi olarak işaretlendi' : 'Fatura kesilmedi olarak işaretlendi'); onDone(); } catch (e) { onErr(e); }
  };
}
const faturaRozet = cp => cp.fatura_kesildi
  ? `<button class="badge yesil fbtn" data-fcp="${cp.id}" title="${esc(cp.fatura_no || 'Fatura kesildi')}">Fatura ✓${cp.fatura_no ? ' ' + esc(cp.fatura_no) : ''}</button>`
  : `<button class="badge sari fbtn" data-fcp="${cp.id}">Fatura kesilmedi</button>`;

// Paket satışları: dönem başlangıcına göre; ödeme ve fatura durumu
function renderSatislar(el, rows, refresh) {
  const aktifler = rows.filter(r => r.durum !== 'iptal');
  const top = aktifler.reduce((a, r) => a + r.tutar, 0), od = aktifler.reduce((a, r) => a + r.odenen, 0);
  const fk = aktifler.filter(r => r.fatura_kesildi).reduce((a, r) => a + r.tutar, 0);
  el.innerHTML = `
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="k">Satılan paket</div><div class="v">${aktifler.length}</div></div>
    <div class="card stat"><div class="k">Satış tutarı</div><div class="v num">${para(top)}</div></div>
    <div class="card stat"><div class="k">Tahsil edilen</div><div class="v num down">${para(od)}</div><div class="d ${top - od > 0.009 ? 'up' : 'muted'}">${top - od > 0.009 ? `${para(top - od)} bekliyor` : 'Tamamı peşin'}</div></div>
    <div class="card stat"><div class="k">Faturası kesilen</div><div class="v num">${para(fk)}</div><div class="d ${top - fk > 0.009 ? 'sari-t' : 'muted'}">${top - fk > 0.009 ? `${para(top - fk)} kesilmedi` : 'Hepsi kesildi'}</div></div>
  </div>
  <div class="card">${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Danışan</th><th>Paket</th><th>Dönem</th><th class="n">Tutar</th><th>Ödeme</th><th>Fatura</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="${r.durum === 'iptal' ? 'iptal-satir' : ''}"><td><a href="#/danisan/${r.client_id}/odeme"><b>${esc(r.ad_soyad)}</b></a></td>
      <td>${esc(r.ad)}${r.indirim ? `<div class="small muted">${para(r.indirim)} indirim</div>` : ''}${r.durum === 'iptal' ? ' <span class="badge kirmizi">İptal</span>' : ''}</td>
      <td style="white-space:nowrap">${fmtDate(r.baslangic)}<div class="small muted">${r.bitis ? fmtDate(r.bitis) : 'süresiz'}</div></td>
      <td class="n"><b>${para(r.tutar)}</b></td>
      <td>${!r.tutar ? '<span class="badge">Ücretsiz</span>' : r.odenen >= r.tutar - 0.009 ? `<span class="badge yesil">Ödendi</span><div class="small muted">${r.odeme_tarihi ? fmtDate(r.odeme_tarihi) : ''}</div>` : `<span class="badge kirmizi">${para(r.tutar - r.odenen)} bekliyor</span>`}</td>
      <td>${faturaRozet(r)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="3"><b>Toplam</b></td><td class="n"><b>${para(top)}</b></td><td colspan="2"></td></tr></tfoot></table></div>` : '<div class="empty">Bu dönemde başlayan paket yok</div>'}</div>`;
  el.onclick = e => { const b = e.target.closest('[data-fcp]'); if (b) faturaModal(rows.find(r => r.id == b.dataset.fcp), refresh); };
}

// Son 12 ay tahsilat / gider çubukları. Ekran genişliğine göre çizilir (telefonda ay adları ezilmesin);
// ay adının altında yıl değişen yerde yıl yazar. Tutarlar gizliyken sol eksende rakam yazmaz.
// Finans grafiğinde bir aya gelince / dokununca çıkan kutu (tutarlar gizliyse kutuda da gizli)
function finIpucu(a) {
  const ayNo = Number(a.ay.slice(5)), t = n => S.paraAcik ? tl(n) : PARA_MASKE, net = a.gelir - a.gider;
  return `<div class="ip-t">${AY_AD[ayNo - 1]} ${a.ay.slice(0, 4)}</div>
    <div class="ip-satir"><i style="background:var(--mor)"></i>Tahsilat<b>${t(a.gelir)}</b></div>
    <div class="ip-satir"><i style="background:#D9A15B"></i>Gider<b>${t(a.gider)}</b></div>
    <div class="ip-satir ip-net">Net<b class="${S.paraAcik ? (net < 0 ? 'up' : 'down') : ''}">${S.paraAcik && net < 0 ? '−' + tl(-net) : t(net)}</b></div>
    ${S.paraAcik ? '' : '<div class="ip-not">Tutarları görmek için “Tutarlar” düğmesine basın</div>'}`;
}
function finChart(aylar, genislik = null) {
  const dar = window.innerWidth <= 600;
  const W = genislik || (dar ? 340 : 600), H = Math.round(Math.min(Math.max(W * 0.42, 190), 260)), L = S.paraAcik ? (dar ? 44 : 52) : 10, R = 8, B = 36, T = 12;
  const max = Math.max(1, ...aylar.map(a => Math.max(a.gelir, a.gider)));
  const cw = (W - L - R) / aylar.length, bw = Math.min(14, cw / 2.6);
  const y = v => T + (1 - v / max) * (H - T - B);
  const kisa = n => (n >= 1e6 ? fmtNum(n / 1e6, 1) + ' mn' : n >= 1e3 ? fmtNum(n / 1e3, n >= 1e4 ? 0 : 1) + ' b' : fmtNum(n, 0));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Aylık tahsilat ve gider">
    ${[0.25, 0.5, 0.75, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${y(max * f)}" y2="${y(max * f)}" class="cg"/>${S.paraAcik ? `<text x="${L - 6}" y="${y(max * f) + 4}" text-anchor="end">${kisa(max * f)}</text>` : ''}`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="cg eksen"/>
    ${aylar.map((a, i) => { const cx = L + cw * i + cw / 2, ayNo = Number(a.ay.slice(5)); return `
      <rect x="${cx - bw - 1}" y="${y(a.gelir)}" width="${bw}" height="${Math.max(0, H - B - y(a.gelir))}" rx="3" fill="var(--mor)"/>
      <rect x="${cx + 1}" y="${y(a.gider)}" width="${bw}" height="${Math.max(0, H - B - y(a.gider))}" rx="3" fill="#D9A15B"/>
      <text x="${cx}" y="${H - B + 15}" text-anchor="middle">${AY_AD[ayNo - 1].slice(0, 3)}</text>
      ${i === 0 || ayNo === 1 ? `<text x="${cx}" y="${H - B + 29}" text-anchor="middle" class="yil">${a.ay.slice(0, 4)}</text>` : ''}`; }).join('')}
    ${aylar.map((a, i) => `<rect class="sutun" x="${L + cw * i}" y="${T}" width="${cw}" height="${H - B - T}" data-ip="${esc(finIpucu(a))}"/>`).join('')}
  </svg><div class="muted small" style="margin-top:6px">En yüksek ay: ${para(Math.max(...aylar.map(a => a.gelir)))}</div>`;
}

// ============ RAPORLAR ============
function renderRapor(el, r, tum, refresh) {
  const s = r.simdi, o = r.onceki;
  const yuzde = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : null);
  // iyi: artış iyi mi (tahsilat) / kötü mü (gider)
  const fark = (a, b, artisIyi = true) => {
    if (tum) return '<div class="d muted">&nbsp;</div>';
    const p = yuzde(a, b);
    if (p == null) return `<div class="d muted">${a ? 'Önceki dönemde yoktu' : '—'}</div>`;
    if (Math.abs(p) < 0.5) return '<div class="d muted">Önceki dönemle aynı</div>';
    const iyi = artisIyi ? p > 0 : p < 0;
    return `<div class="d ${iyi ? 'down' : 'up'}">${p > 0 ? '▲' : '▼'} %${fmtNum(Math.abs(p), 0)} <span class="muted">önceki döneme göre</span></div>`;
  };
  const kart = (k, v, d) => `<div class="card stat"><div class="k">${k}</div><div class="v num">${v}</div>${d}</div>`;
  const maxAy = Math.max(1, ...r.aylar.map(a => a.tahsilat));
  const top = r.aylar.reduce((t, a) => ({ tahsilat: t.tahsilat + a.tahsilat, gider: t.gider + a.gider, satisAdet: t.satisAdet + a.satisAdet, yeniDanisan: t.yeniDanisan + a.yeniDanisan }), { tahsilat: 0, gider: 0, satisAdet: 0, yeniDanisan: 0 });
  const ayAdi = ay => `${AY_AD[Number(ay.slice(5)) - 1]} ${ay.slice(0, 4)}`;
  const kaynakMax = Math.max(1, ...r.kaynak.map(k => k.yeni));
  const yenOran = r.yenileme.biten ? Math.round((r.yenileme.yeniledi / r.yenileme.biten) * 100) : null;
  el.innerHTML = `
  ${tum ? '' : `<div class="muted small" style="margin-bottom:10px">Karşılaştırılan önceki dönem: ${fmtDate(o.from)} – ${fmtDate(o.to)}</div>`}
  <div class="grid g3 kiyas" style="margin-bottom:16px">
    ${kart('Tahsilat', para(s.tahsilat), fark(s.tahsilat, o.tahsilat))}
    ${kart('Gider', para(s.gider), fark(s.gider, o.gider, false))}
    ${kart('Net kazanç', para(s.net), fark(s.net, o.net))}
    ${kart('Satılan paket', `${s.satisAdet}<small>adet</small>`, fark(s.satisAdet, o.satisAdet))}
    ${kart('Yeni danışan', `${s.yeniDanisan}<small>kişi</small>`, fark(s.yeniDanisan, o.yeniDanisan))}
    ${kart('Ortalama paket tutarı', para(s.ortPaket), `<div class="d muted">Danışan başına tahsilat: ${para(s.danisanBasi)}</div>`)}
  </div>
  <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Aylık döküm</h2><span class="muted small">Son 12 ay</span></div>
    <div class="tbl-wrap"><table class="tbl rapor-tbl"><thead><tr><th>Ay</th><th class="n">Tahsilat</th><th class="n">Gider</th><th class="n">Net</th><th class="n">Paket</th><th class="n">Yeni danışan</th></tr></thead><tbody>
    ${r.aylar.slice().reverse().map(a => `<tr><td style="white-space:nowrap">${ayAdi(a.ay)}</td>
      <td class="n"><div class="hucre-bar"><i style="width:${(a.tahsilat / maxAy) * 100}%"></i></div><b>${para(a.tahsilat)}</b></td>
      <td class="n">${para(a.gider)}</td><td class="n ${S.paraAcik && a.net < 0 ? 'up' : ''}">${para(a.net)}</td>
      <td class="n">${a.satisAdet || '—'}</td><td class="n">${a.yeniDanisan || '—'}</td></tr>`).join('')}
    </tbody><tfoot><tr><td><b>12 ay toplam</b></td><td class="n"><b>${para(top.tahsilat)}</b></td><td class="n"><b>${para(top.gider)}</b></td><td class="n"><b>${para(top.tahsilat - top.gider)}</b></td><td class="n"><b>${top.satisAdet}</b></td><td class="n"><b>${top.yeniDanisan}</b></td></tr></tfoot></table></div></div>
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Paket bazında</h2><span class="badge">${s.satisAdet} paket</span></div>
      ${r.paketler.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Paket</th><th class="n">Adet</th><th class="n">Tutar</th><th class="n">Ortalama</th><th class="n">İndirim</th></tr></thead><tbody>
      ${r.paketler.map(p => `<tr><td><b>${esc(p.ad)}</b></td><td class="n">${p.n}</td><td class="n">${para(p.t)}</td><td class="n">${para(p.t / p.n)}</td><td class="n">${p.indirim ? para(p.indirim) : '—'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">Bu dönemde paket satışı yok</div>'}</div>
    <div class="card"><div class="card-head"><h2>En çok ödeme yapan danışanlar</h2></div>
      <div class="list" style="margin-top:6px">${r.enCok.map((c, i) => `<a class="item" href="#/danisan/${c.id}/odeme"><div class="avatar">${i + 1}</div>
        <div class="grow"><div class="t">${esc(c.ad_soyad)}</div><div class="s">${c.n} ödeme</div></div><b class="num">${para(c.t)}</b></a>`).join('') || '<div class="empty">Bu dönemde tahsilat yok</div>'}</div></div>
  </div>
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Danışanlar hangi kanaldan ulaştı</h2></div>
      <div class="card-pad">${r.kaynak.some(k => k.yeni || k.t) ? r.kaynak.filter(k => k.yeni || k.t).map(k => `<div class="dagilim"><div class="row" style="justify-content:space-between"><span>${esc(k.ad)} <span class="muted small">· ${k.yeni} yeni danışan</span></span><b class="num">${para(k.t)}</b></div><div class="dbar"><i style="width:${(k.yeni / kaynakMax) * 100}%"></i></div></div>`).join('')
        + '<div class="muted small" style="margin-top:8px">Çubuk: dönemde gelen yeni danışan sayısı · tutar: o kaynaktan gelen danışanların dönemdeki ödemeleri</div>'
        : '<div class="empty">Bu dönemde kayıt yok</div>'}
      ${r.kaynak.some(k => k.ad === 'Belirtilmemiş') ? '<div class="muted small" style="margin-top:6px">"Belirtilmemiş": takip kartında / danışan bilgilerinde hangi kanaldan ulaştığı girilmemiş.</div>' : ''}</div></div>
    <div class="card"><div class="card-head"><h2>Paket yenileme</h2></div>
      <div class="card-pad">
        <div class="yenileme"><div class="yen-oran">${yenOran == null ? '—' : '%' + yenOran}</div>
          <div class="muted small">${r.yenileme.biten ? `Bu dönemde biten ${r.yenileme.biten} paketin ${r.yenileme.yeniledi} tanesinin ardından yeni paket alındı.` : 'Bu dönemde biten paket yok.'}</div></div>
        <h3 style="margin:16px 0 6px">Önümüzdeki 30 günde bitecek paketler</h3>
        <div class="list" id="r-yak">${r.yaklasan.map(p => `<div class="item"><a class="grow" href="#/danisan/${p.client_id}/odeme" style="color:inherit"><div class="t">${esc(p.ad_soyad)}</div><div class="s">${esc(p.ad)} · ${fmtDate(p.bitis)} · ${esc(kalanSure(p.bitis)?.t || '')}</div></a>
          <b class="num">${para(p.tutar)}</b><button class="btn sm soft" data-yen="${p.client_id}">Yenile</button></div>`).join('') || '<div class="empty">30 gün içinde biten paket yok</div>'}</div>
      </div></div>
  </div>
  ${r.yontem.length ? `<div class="card"><div class="card-head"><h2>Ödeme yöntemleri</h2></div><div class="card-pad">${r.yontem.map(y => `<div class="dagilim"><div class="row" style="justify-content:space-between"><span>${esc(y.yontem)} <span class="muted small">· ${y.n} ödeme</span></span><b class="num">${para(y.t)}</b></div><div class="dbar"><i style="width:${(y.t / (s.tahsilat || 1)) * 100}%"></i></div></div>`).join('')}</div></div>` : ''}`;
  $('#r-yak').onclick = async e => { const b = e.target.closest('[data-yen]'); if (!b) return; try { const c = await api('/clients/' + b.dataset.yen); assignPackageModal(c, refresh); } catch (err) { onErr(err); } };
}

function renderTahsilatlar(el, rows, refresh) {
  const top = rows.reduce((a, r) => a + r.tutar, 0);
  el.innerHTML = `<div class="card">${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tarih</th><th>Danışan</th><th>Paket</th><th>Yöntem</th><th>Fatura</th><th class="n">Tutar</th><th></th></tr></thead><tbody>
    ${rows.map(p => `<tr><td style="white-space:nowrap">${fmtDate(p.tarih)}</td><td><a href="#/danisan/${p.client_id}/odeme">${esc(p.ad_soyad)}</a></td><td class="muted">${esc(p.paket_ad || '')}</td>
      <td>${esc(p.yontem)}</td><td>${p.client_package_id ? (p.paket_fatura ? `<span class="badge yesil">Kesildi</span>${p.paket_fatura_no ? `<div class="small muted">${esc(p.paket_fatura_no)}</div>` : ''}` : '<span class="badge sari">Kesilmedi</span>') : '—'}</td>
      <td class="n"><b>${para(p.tutar)}</b></td><td style="white-space:nowrap"><button class="tbtn" data-ep="${p.id}" title="Düzenle">${ic('edit')}</button><button class="tbtn del" data-dp="${p.id}" title="Sil">${ic('trash')}</button></td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="5"><b>Toplam</b></td><td class="n"><b>${para(top)}</b></td><td></td></tr></tfoot></table></div>` : '<div class="empty">Bu dönemde tahsilat yok</div>'}</div>`;
  el.onclick = async e => {
    const ep = e.target.closest('[data-ep]'), dp = e.target.closest('[data-dp]');
    if (ep) { const p = rows.find(x => x.id == ep.dataset.ep); paymentModal({ id: p.client_id, ad_soyad: p.ad_soyad }, p, refresh); }
    if (dp && await confirmBox('Bu tahsilat kaydı silinecek.')) { await api('/payments/' + dp.dataset.dp, { method: 'DELETE' }); toast('Silindi'); refresh(); }
  };
}

function renderGiderler(el, rows, refresh) {
  const top = rows.reduce((a, r) => a + r.tutar, 0);
  el.innerHTML = `<div class="card">${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tarih</th><th>Kalem</th><th>Açıklama</th><th class="n">Tutar</th><th></th></tr></thead><tbody>
    ${rows.map(g => `<tr><td style="white-space:nowrap">${fmtDate(g.tarih)}</td><td>${esc(g.kategori || '')}</td><td class="muted">${esc(g.aciklama || '')}</td><td class="n"><b>${para(g.tutar)}</b></td>
      <td style="white-space:nowrap"><button class="tbtn" data-eg="${g.id}" title="Düzenle">${ic('edit')}</button><button class="tbtn del" data-dg="${g.id}" title="Sil">${ic('trash')}</button></td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="3"><b>Toplam</b></td><td class="n"><b>${para(top)}</b></td><td></td></tr></tfoot></table></div>` : '<div class="empty">Bu dönemde gider yok</div>'}</div>`;
  el.onclick = async e => {
    const eg = e.target.closest('[data-eg]'), dg = e.target.closest('[data-dg]');
    if (eg) expenseModal(rows.find(x => x.id == eg.dataset.eg), refresh);
    if (dg && await confirmBox('Bu gider kaydı silinecek.')) { await api('/expenses/' + dg.dataset.dg, { method: 'DELETE' }); toast('Silindi'); refresh(); }
  };
}

function renderPaketler(el, rows, refresh) {
  const fiyatsiz = rows.filter(p => p.aktif && p.fiyat == null).length;
  el.innerHTML = `
    ${fiyatsiz ? `<div class="warn" style="margin-bottom:14px">${fiyatsiz} paketin fiyatı girilmemiş. Danışana paket atarken fiyatın otomatik gelmesi için düzenleyip fiyat girin.</div>` : ''}
    <div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="muted small">Sattığınız paketleri burada tanımlayın; danışana atarken süre, görüşme sayısı ve fiyat otomatik gelir.</div>
      <button class="btn soft" id="p-yeni">${ic('plus')}Yeni paket</button></div>
    <div class="pgrid">${rows.map(p => `<div class="card pkart ${p.aktif ? '' : 'pasif'}">
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start">
        <div><div class="pkart-ad">${esc(p.ad)}</div>${p.aktif ? '' : '<span class="badge">Satışta değil</span>'}</div>
        <div class="row" style="gap:0;flex-wrap:nowrap"><button class="tbtn" data-ek="${p.id}" title="Düzenle">${ic('edit')}</button><button class="tbtn del" data-dk="${p.id}" title="Sil">${ic('trash')}</button></div></div>
      <div class="pkart-fiyat">${p.fiyat != null ? para(p.fiyat) : '<span class="muted">Fiyat girilmemiş</span>'}</div>
      <div class="row" style="gap:6px"><span class="badge mor">${sureMetin(p.sure_gun)}</span>${p.gorusme_sayisi ? `<span class="badge">${p.gorusme_sayisi} görüşme</span>` : ''}<span class="badge">${p.satis} satış</span></div>
      ${p.aciklama ? `<div class="small muted" style="margin-top:4px">${esc(p.aciklama)}</div>` : ''}
      ${p.icerik ? `<ul class="icerik">${p.icerik.split('\n').filter(x => x.trim()).map(x => `<li>${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : '<div class="small muted">İçerik tanımlanmamış</div>'}
    </div>`).join('') || '<div class="empty">Paket yok</div>'}</div>`;
  $('#p-yeni').onclick = () => packageModal(null, refresh);
  el.onclick = async e => {
    const ek = e.target.closest('[data-ek]'), dk = e.target.closest('[data-dk]');
    if (ek) packageModal(rows.find(p => p.id == ek.dataset.ek), refresh);
    if (dk && await confirmBox('Paket silinecek. Daha önce danışanlara satıldıysa silinmez, "satışta değil" olarak işaretlenir.')) {
      const r = await api('/packages/' + dk.dataset.dk, { method: 'DELETE' }); toast(r.pasif ? 'Paket satıştan kaldırıldı' : 'Paket silindi'); refresh();
    }
  };
}

function packageModal(p, onDone) {
  const SURELER = [['', 'Süresiz (ör. tek görüşme)'], [7, '1 hafta'], [14, '2 hafta'], [30, '1 ay'], [60, '2 ay'], [90, '3 ay'], [180, '6 ay'], [365, '1 yıl']];
  const cur = p?.sure_gun ?? '';
  const inList = SURELER.some(([v]) => String(v) === String(cur));
  const m = modal({
    title: p ? 'Paketi düzenle' : 'Yeni paket', size: 'lg',
    body: `<form id="pf"><div class="fg">
      <label class="f full">Paket adı<input class="i" name="ad" value="${esc(p?.ad || '')}" required placeholder="Örn. 3 Aylık Online Paket"></label>
      <label class="f">Süre<select class="i" name="sure_gun">${SURELER.map(([v, t]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${t}</option>`).join('')}${inList ? '' : `<option value="${cur}" selected>${cur} gün</option>`}</select></label>
      <label class="f">Görüşme sayısı<input class="i" name="gorusme_sayisi" type="number" min="0" inputmode="numeric" value="${esc(p?.gorusme_sayisi ?? '')}"></label>
      <label class="f">Fiyat (₺)<input class="i" name="fiyat" type="number" min="0" step="1" inputmode="decimal" value="${esc(p?.fiyat ?? '')}"></label>
      <label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="aktif" ${p?.aktif === 0 ? '' : 'checked'}> Satışta</label>
      <label class="f full">Kısa açıklama<input class="i" name="aciklama" value="${esc(p?.aciklama || '')}" placeholder="Örn. Kilo verme ve düzenli beslenme için 3 aylık takip"></label>
      <label class="f full">Paket içeriği — her satır bir madde<textarea class="i" name="icerik" rows="6" placeholder="Online ön görüşme&#10;Kişiye özel beslenme listesi&#10;Haftalık kontrol&#10;WhatsApp destek">${esc(p?.icerik || '')}</textarea></label>
    </div></form>`,
    foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="pok">${ic('save')}Kaydet</button>`,
  });
  $('#pok', m.el).onclick = async () => {
    const f = $('#pf', m.el); if (!f.reportValidity()) return;
    const body = Object.fromEntries(new FormData(f)); body.aktif = !!f.elements.aktif.checked;
    try { await api('/packages' + (p ? '/' + p.id : ''), { method: p ? 'PUT' : 'POST', body }); m.close(); toast('Paket kaydedildi'); onDone && onDone(); } catch (e) { onErr(e); }
  };
}

// ============ DANIŞANA PAKET ATAMA ============
async function assignPackageModal(c, onDone, cp) {
  const pkgs = await api('/packages');
  const duzen = !!cp;
  let sel = duzen ? null : pkgs[0] || null;
  // Peşin çalışma: ödeme alındığı gün hizmet başlar
  const baslangicVars = duzen ? cp.baslangic : todayIso();
  const sonAktif = duzen ? null : (c.packages || []).find(x => x.durum === 'aktif' && x.bitis && x.bitis >= todayIso());
  const m = modal({
    title: duzen ? 'Paketi düzenle' : `${esc(c.ad_soyad)} · Paket ata`, size: 'lg',
    body: `<form id="ap">
      ${duzen ? '' : `<div class="muted small" style="font-weight:600;margin-bottom:8px">Paket</div>
      <div class="pick-row" id="ap-p">${pkgs.map((p, i) => `<button type="button" class="pick-item ${i === 0 ? 'on' : ''}" data-id="${p.id}"><div class="t">${esc(p.ad)}</div><div class="small muted">${sureMetin(p.sure_gun)}${p.gorusme_sayisi ? ` · ${p.gorusme_sayisi} görüşme` : ''}</div><div class="pf">${p.fiyat != null ? tl(p.fiyat) : 'Fiyat yok'}</div></button>`).join('')}
        <button type="button" class="pick-item" data-id=""><div class="t">Özel paket</div><div class="small muted">Adı ve fiyatı elle girin</div></button></div>
      <div id="ap-ic" class="ap-icerik"></div>
      ${sonAktif ? `<div class="warn" style="margin-top:10px">Mevcut paket (${esc(sonAktif.ad)}) ${fmtDate(sonAktif.bitis)} tarihinde bitiyor. Yeni paket kaydedilince eskisi "tamamlandı" olur.</div>` : ''}`}
      <div class="fg" style="margin-top:14px">
        <label class="f span2">Paket adı<input class="i" name="ad" value="${esc(cp?.ad || sel?.ad || '')}" required></label>
        <label class="f">${duzen ? 'Başlangıç' : 'Başlangıç (ödeme günü)'}<input class="i" type="date" name="baslangic" value="${esc(baslangicVars)}" required></label>
        <label class="f">Bitiş<input class="i" type="date" name="bitis" value="${esc(cp?.bitis || (sel?.sure_gun ? addDays(baslangicVars, sel.sure_gun) : ''))}"></label>
        <label class="f">Görüşme sayısı<input class="i" type="number" min="0" name="gorusme_sayisi" inputmode="numeric" value="${esc(cp?.gorusme_sayisi ?? sel?.gorusme_sayisi ?? '')}"></label>
        <label class="f">Liste fiyatı (₺)<input class="i" type="number" min="0" step="1" name="liste_fiyati" inputmode="decimal" value="${esc(cp?.liste_fiyati ?? sel?.fiyat ?? '')}"></label>
        <label class="f">İndirim (₺)<input class="i" type="number" min="0" step="1" name="indirim" inputmode="decimal" value="${esc(cp?.indirim || '')}" placeholder="0"></label>
        <label class="f">Danışanın ödeyeceği (₺)<input class="i" type="number" min="0" step="1" name="tutar" inputmode="decimal" value="${esc(cp?.tutar ?? sel?.fiyat ?? '')}" style="font-weight:700"></label>
        ${duzen ? `<label class="f">Durum<select class="i" name="durum">${Object.entries(CP_DURUM).map(([k, [t]]) => `<option value="${k}" ${cp.durum === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}
        <label class="f full">Not<input class="i" name="notlar" value="${esc(cp?.notlar || '')}" placeholder="Örn. arkadaş indirimi, 2 taksit"></label>
      </div>
      ${duzen ? '' : `<div class="odeme-kutu">
        <label class="check"><input type="checkbox" id="ap-ode" checked> Ödeme peşin alındı</label>
        <div class="fg" id="ap-of" style="margin-top:10px">
          <label class="f">Alınan tutar (₺)<input class="i" type="number" min="0" step="1" name="odeme_tutar" inputmode="decimal" value="${esc(sel?.fiyat ?? '')}"></label>
          <label class="f">Yöntem<select class="i" name="odeme_yontem">${opts(YONTEM, 'Havale/EFT')}</select></label>
        </div>
        <div class="muted small" id="ap-od-not" style="margin-top:6px">Ödeme tarihi = başlangıç tarihi. Taksit ya da sonradan ödeme varsa işareti kaldırın; tahsilatı sonra eklersiniz.</div>
      </div>
      <div class="odeme-kutu">
        <label class="check"><input type="checkbox" name="fatura_kesildi" id="ap-fk"> Bu dönem için fatura kesildi</label>
        <div class="fg hidden" id="ap-ff" style="margin-top:10px">
          <label class="f">Fatura no (isteğe bağlı)<input class="i" name="fatura_no"></label>
          <label class="f">Fatura tarihi<input class="i" type="date" name="fatura_tarihi" value="${todayIso()}"></label>
        </div></div>`}
    </form>`,
    foot: `${duzen ? `<button class="btn danger" id="ap-del" style="margin-right:auto">${ic('trash')}</button>` : ''}<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="ap-ok">${ic('save')}Kaydet</button>`,
  });
  const f = $('#ap', m.el), E = f.elements;
  const hesapla = () => { const l = Number(E.liste_fiyati.value) || 0, i = Number(E.indirim.value) || 0; if (E.liste_fiyati.value !== '') E.tutar.value = Math.max(l - i, 0); if (E.odeme_tutar && $('#ap-ode', m.el).checked) E.odeme_tutar.value = E.tutar.value; };
  E.liste_fiyati.oninput = hesapla; E.indirim.oninput = hesapla;
  E.tutar.oninput = () => { if (E.odeme_tutar) E.odeme_tutar.value = E.tutar.value; };
  const bitisGuncelle = () => { if (sel?.sure_gun && E.baslangic.value) E.bitis.value = addDays(E.baslangic.value, sel.sure_gun); };
  E.baslangic.onchange = bitisGuncelle;
  $('#ap-p', m.el) && ($('#ap-p', m.el).onclick = e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    $$('#ap-p .pick-item', m.el).forEach(x => x.classList.toggle('on', x === b));
    sel = pkgs.find(p => p.id == b.dataset.id) || null;
    E.ad.value = sel?.ad || ''; E.gorusme_sayisi.value = sel?.gorusme_sayisi ?? ''; E.liste_fiyati.value = sel?.fiyat ?? ''; E.indirim.value = '';
    E.tutar.value = sel?.fiyat ?? ''; E.bitis.value = sel?.sure_gun ? addDays(E.baslangic.value, sel.sure_gun) : '';
    if (E.odeme_tutar) E.odeme_tutar.value = E.tutar.value;
    icerikGoster();
    if (!sel) E.ad.focus();
  });
  $('#ap-ode', m.el) && ($('#ap-ode', m.el).onchange = e => { $('#ap-of', m.el).classList.toggle('hidden', !e.target.checked); });
  $('#ap-fk', m.el) && ($('#ap-fk', m.el).onchange = e => $('#ap-ff', m.el).classList.toggle('hidden', !e.target.checked));
  const icerikGoster = () => { const el2 = $('#ap-ic', m.el); if (!el2) return; el2.innerHTML = sel?.icerik ? `<div class="muted small" style="font-weight:600;margin:12px 0 6px">Paket içeriği</div><ul class="icerik">${sel.icerik.split('\n').filter(x => x.trim()).map(x => `<li>${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''; };
  icerikGoster();
  $('#ap-ok', m.el).onclick = async () => {
    if (!f.reportValidity()) return;
    const body = Object.fromEntries(new FormData(f));
    body.fatura_kesildi = !!(E.fatura_kesildi && E.fatura_kesildi.checked);
    if (!duzen) { body.package_id = sel?.id || null; body.odeme_tarih = body.baslangic; if (!$('#ap-ode', m.el).checked) body.odeme_tutar = ''; }
    try {
      if (duzen) await api('/client-packages/' + cp.id, { method: 'PUT', body });
      else await api(`/clients/${c.id}/packages`, { method: 'POST', body });
      m.close(); toast(duzen ? 'Paket güncellendi' : 'Paket atandı'); onDone && onDone();
    } catch (e) { onErr(e); }
  };
  $('#ap-del', m.el) && ($('#ap-del', m.el).onclick = async () => {
    m.close();
    if (!(await confirmBox('Paket kaydı silinecek. Yanlışlıkla eklendiyse silin; danışan bıraktıysa durumunu "İptal" yapmanız önerilir. Bağlı tahsilatlar silinmez.'))) return;
    await api('/client-packages/' + cp.id, { method: 'DELETE' }); toast('Silindi'); onDone && onDone();
  });
}

// ============ TAHSİLAT / GİDER ============
async function paymentModal(c, p, onDone) {
  const clients = c ? null : await api('/clients?durum=hepsi');
  const m = modal({
    title: p ? 'Tahsilatı düzenle' : 'Tahsilat ekle',
    body: `<form id="pm"><div class="fg">
      ${c ? `<div class="full"><b>${esc(c.ad_soyad)}</b>${c.finans && c.finans.bakiye > 0 ? ` <span class="badge kirmizi">Bakiye ${tl(c.finans.bakiye)}</span>` : ''}</div>`
        : `<label class="f full">Danışan<select class="i" name="client_id" required><option value="">Seçin…</option>${clients.map(x => `<option value="${x.id}">${esc(x.ad_soyad)}${x.bakiye > 0 ? ` — bakiye ${tl(x.bakiye)}` : ''}</option>`).join('')}</select></label>`}
      <label class="f">Tutar (₺)<input class="i" type="number" min="0" step="0.01" name="tutar" inputmode="decimal" required value="${esc(p?.tutar ?? (c?.finans?.bakiye > 0 ? c.finans.bakiye : ''))}" style="font-weight:700"></label>
      <label class="f">Tarih<input class="i" type="date" name="tarih" value="${esc(p?.tarih || todayIso())}" required></label>
      <label class="f">Yöntem<select class="i" name="yontem">${opts(YONTEM, p?.yontem || 'Havale/EFT')}</select></label>
      ${c && c.packages && c.packages.length && !p ? `<label class="f">Paket<select class="i" name="client_package_id">${c.packages.filter(x => x.durum !== 'iptal').map(x => `<option value="${x.id}">${esc(x.ad)} (${fmtDate(x.baslangic)})</option>`).join('')}</select></label>` : ''}
      <label class="f full">Not<input class="i" name="notlar" value="${esc(p?.notlar || '')}" placeholder="Örn. 2. taksit"></label>
    </div></form>`,
    foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="pmok">${ic('save')}Kaydet</button>`,
  });
  const f = $('#pm', m.el);
  if (!c) f.elements.client_id.onchange = e => { const x = clients.find(k => k.id == e.target.value); if (x && x.bakiye > 0 && !f.elements.tutar.value) f.elements.tutar.value = x.bakiye; };
  $('#pmok', m.el).onclick = async () => {
    if (!f.reportValidity()) return;
    const body = Object.fromEntries(new FormData(f));
    const cid = c ? c.id : body.client_id;
    try {
      if (p) await api('/payments/' + p.id, { method: 'PUT', body });
      else await api(`/clients/${cid}/payments`, { method: 'POST', body });
      m.close(); toast('Tahsilat kaydedildi'); onDone && onDone();
    } catch (e) { onErr(e); }
  };
}

function expenseModal(g, onDone) {
  const m = modal({
    title: g ? 'Gideri düzenle' : 'Gider ekle',
    body: `<form id="gm"><div class="fg">
      <label class="f">Tutar (₺)<input class="i" type="number" min="0" step="0.01" name="tutar" inputmode="decimal" required value="${esc(g?.tutar ?? '')}" style="font-weight:700"></label>
      <label class="f">Tarih<input class="i" type="date" name="tarih" value="${esc(g?.tarih || todayIso())}" required></label>
      <label class="f full">Kalem<select class="i" name="kategori">${opts(GIDER_KAT, g?.kategori || 'Diğer')}</select></label>
      <label class="f full">Açıklama<input class="i" name="aciklama" value="${esc(g?.aciklama || '')}" placeholder="Örn. Instagram reklamı, muhasebe ücreti"></label>
    </div></form>`,
    foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="gok">${ic('save')}Kaydet</button>`,
  });
  $('#gok', m.el).onclick = async () => {
    const f = $('#gm', m.el); if (!f.reportValidity()) return;
    try { await api('/expenses' + (g ? '/' + g.id : ''), { method: g ? 'PUT' : 'POST', body: Object.fromEntries(new FormData(f)) }); m.close(); toast('Gider kaydedildi'); onDone && onDone(); } catch (e) { onErr(e); }
  };
}

// ============ DANIŞAN KARTI: PAKET & ÖDEME ============
function renderClientFinance(el, c, refresh) {
  const aktif = c.packages.find(p => p.durum === 'aktif');
  const F = c.finans;
  const kalanGun = aktif && aktif.bitis ? dayDiff(aktif.bitis) : null;
  const kalan = aktif && aktif.bitis ? kalanSure(aktif.bitis) : null;
  const gunTop = aktif && aktif.bitis ? Math.max(1, dayDiff(aktif.bitis) - dayDiff(aktif.baslangic)) : null;
  const gecen = aktif && gunTop ? Math.min(100, Math.max(0, ((gunTop - Math.max(kalanGun, 0)) / gunTop) * 100)) : 0;
  el.innerHTML = `
  <div class="grid g3" style="margin-bottom:16px">
    <div class="card stat"><div class="k">Toplam paket tutarı</div><div class="v num">${para(F.toplam)}</div><div class="d muted">${c.packages.filter(p => p.durum !== 'iptal').length} paket</div></div>
    <div class="card stat"><div class="k">Ödenen</div><div class="v num down">${para(F.odenen)}</div><div class="d muted">${c.payments.length} ödeme</div></div>
    <div class="card stat"><div class="k">Bakiye</div><div class="v num ${F.bakiye > 0.009 ? 'up' : ''}">${para(Math.max(F.bakiye, 0))}</div><div class="d muted">${F.bakiye > 0.009 ? 'Tahsil edilecek' : F.bakiye < -0.009 ? `${para(-F.bakiye)} fazla ödeme` : 'Borcu yok'}</div></div>
  </div>
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>Güncel paket</h2><button class="btn sm primary" id="cf-ata">${ic('plus')}${aktif ? 'Yenile / yeni paket' : 'Paket ata'}</button></div>
      <div class="card-pad">${aktif ? `
        <div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="pkart-ad">${esc(aktif.ad)}</div>
          <div class="muted small">${fmtDate(aktif.baslangic)} – ${aktif.bitis ? fmtDate(aktif.bitis) : 'süresiz'}</div></div>
          <b class="num" style="font-size:18px">${para(aktif.tutar)}</b></div>
        ${aktif.bitis ? `<div class="ilerleme"><i style="width:${gecen}%"></i></div><div class="row small" style="justify-content:space-between"><span class="muted">%${Math.round(gecen)} tamamlandı</span><b class="${kalanGun < 0 ? 'up' : kalanGun <= 10 ? 'sari-t' : ''}">${kalanGun < 0 ? `${-kalanGun} gün önce bitti` : kalan.t}</b></div>` : ''}
        <div class="row" style="gap:6px;margin-top:12px">${aktif.gorusme_sayisi ? `<span class="badge ${aktif.yapilan_gorusme >= aktif.gorusme_sayisi ? 'sari' : 'mor'}">${aktif.yapilan_gorusme} / ${aktif.gorusme_sayisi} görüşme yapıldı</span>` : ''}
          <span class="badge ${aktif.odenen >= aktif.tutar ? 'yesil' : 'kirmizi'}">${aktif.odenen >= aktif.tutar ? 'Ödendi' : `${para(aktif.tutar - aktif.odenen)} kaldı`}</span>
          ${faturaRozet(aktif)}</div>`
        : '<div class="empty">Aktif paket yok</div>'}</div></div>
    <div class="card"><div class="card-head"><h2>Ödemeler</h2><button class="btn sm soft" id="cf-ode">${ic('plus')}Tahsilat</button></div>
      <div class="list" style="margin-top:8px">${c.payments.map(p => `<div class="item">
        <div class="grow"><div class="t num">${para(p.tutar)}</div><div class="s">${fmtDate(p.tarih)} · ${esc(p.yontem)}${p.paket_ad ? ` · ${esc(p.paket_ad)}` : ''}${p.notlar ? ` · ${esc(p.notlar)}` : ''}</div></div>
        <button class="tbtn" data-ep="${p.id}" title="Düzenle">${ic('edit')}</button><button class="tbtn del" data-dp="${p.id}" title="Sil">${ic('trash')}</button></div>`).join('') || '<div class="empty">Ödeme kaydı yok</div>'}</div></div>
  </div>
  <div class="card"><div class="card-head"><h2>Paket geçmişi</h2></div>
    ${c.packages.length ? `<div class="tbl-wrap"><table class="tbl" style="margin-top:8px"><thead><tr><th>Paket</th><th>Dönem</th><th>Görüşme</th><th class="n">Tutar</th><th class="n">Ödenen</th><th>Fatura</th><th>Durum</th><th></th></tr></thead><tbody>
    ${c.packages.map(p => `<tr><td><b>${esc(p.ad)}</b>${p.indirim ? `<div class="small muted">${para(p.liste_fiyati)} − ${para(p.indirim)} indirim</div>` : ''}${p.notlar ? `<div class="small muted">${esc(p.notlar)}</div>` : ''}</td>
      <td style="white-space:nowrap">${fmtDate(p.baslangic)}<br><span class="muted small">${p.bitis ? fmtDate(p.bitis) : 'süresiz'}</span></td>
      <td>${p.gorusme_sayisi ? `${p.yapilan_gorusme}/${p.gorusme_sayisi}` : p.yapilan_gorusme || '—'}</td>
      <td class="n">${para(p.tutar)}</td><td class="n">${para(p.odenen)}</td>
      <td>${p.durum === 'iptal' ? '—' : faturaRozet(p)}</td>
      <td><span class="badge ${CP_DURUM[p.durum][1]}">${CP_DURUM[p.durum][0]}</span></td>
      <td><button class="tbtn" data-ecp="${p.id}" title="Düzenle">${ic('edit')}</button></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">Henüz paket atanmadı</div>'}</div>`;
  $('#cf-ata').onclick = () => assignPackageModal(c, refresh);
  $('#cf-ode').onclick = () => paymentModal(c, null, refresh);
  el.onclick = async e => {
    const fa = e.target.closest('[data-fcp]'), ep = e.target.closest('[data-ep]'), dp = e.target.closest('[data-dp]'), ecp = e.target.closest('[data-ecp]');
    if (fa) faturaModal({ ...c.packages.find(p => p.id == fa.dataset.fcp), ad_soyad: c.ad_soyad }, refresh);
    if (ep) paymentModal(c, c.payments.find(p => p.id == ep.dataset.ep), refresh);
    if (ecp) assignPackageModal(c, refresh, c.packages.find(p => p.id == ecp.dataset.ecp));
    if (dp && await confirmBox('Bu tahsilat kaydı silinecek.')) { await api('/payments/' + dp.dataset.dp, { method: 'DELETE' }); toast('Silindi'); refresh(); }
  };
}
