'use strict';
/* Takvim & randevular — app.js'teki yardımcıları kullanır ($, api, modal, ic, esc, fmtDate, addDays, todayIso…) */

const GUN_K = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const GUN_U = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const AY_U = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DURUM = { planli: ['Planlı', 'mor'], tamamlandi: ['Tamamlandı', 'yesil'], gelmedi: ['Gelmedi', 'kirmizi'], iptal: ['İptal', ''] };
const TURLER = ['İlk görüşme', 'Kontrol', 'Ölçüm', 'Diğer'];
const HOUR_PX = 64;

const dObj = iso => new Date(iso + 'T12:00:00');
const wIdx = iso => (dObj(iso).getDay() + 6) % 7;                 // Pazartesi = 0
const weekStart = iso => addDays(iso, -wIdx(iso));
const monthStart = iso => iso.slice(0, 8) + '01';
const toMin = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const fromMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const endOf = a => fromMin(toMin(a.saat) + (a.sure_dk || 45));
const dayTitle = iso => { const d = dObj(iso); return `${d.getDate()} ${AY_U[d.getMonth()]} ${GUN_U[wIdx(iso)]}`; };
const isMobile = () => window.innerWidth <= 820;

function relDayLong(iso) {
  const n = dayDiff(iso);
  if (n === 0) return 'bugün';
  if (n === 1) return 'yarın';
  const d = dObj(iso);
  return `${d.getDate()} ${AY_U[d.getMonth()]} ${GUN_U[wIdx(iso)]}`;
}

function waReminder(a) {
  const tel = waPhone(a.telefon);
  if (!tel) return null;
  const ad = (a.ad_soyad || '').split(' ')[0];
  const msg = `Merhaba ${ad}, ${relDayLong(a.tarih)} saat ${a.saat}'te ${a.kanal === 'Online' ? 'online ' : ''}görüşmemiz var. Görüşmek üzere 🌿\n${S.brand.unvan || ''}`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

// ---------- takvim sayfası ----------
async function viewCalendar(main, mode, date) {
  mode = mode || (isMobile() ? 'ajanda' : 'hafta');
  if (mode === 'hafta' && isMobile()) mode = 'ajanda';
  date = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : todayIso();
  const go = (m, d) => { location.hash = `#/takvim/${m}/${d}`; };

  let from, to, title, step;
  if (mode === 'ay') {
    const ms = monthStart(date);
    from = weekStart(ms); to = addDays(from, 41);
    const d = dObj(ms); title = `${AY_U[d.getMonth()]} ${d.getFullYear()}`;
    step = n => { const x = dObj(ms); x.setMonth(x.getMonth() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-01`; };
  } else {
    from = weekStart(date); to = addDays(from, 6);
    const a = dObj(from), b = dObj(to);
    title = mode === 'ajanda' ? dayTitle(date)
      : a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${AY_U[b.getMonth()]} ${b.getFullYear()}`
      : `${a.getDate()} ${AY_U[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${AY_U[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
    step = n => addDays(date, n * 7);
  }
  const appts = await api(`/appointments?from=${from}&to=${to}`);
  const byDay = {};
  appts.forEach(a => (byDay[a.tarih] ||= []).push(a));
  const refresh = () => viewCalendar(main, mode, date);

  const modes = isMobile() ? [['ajanda', 'Gün'], ['ay', 'Ay']] : [['hafta', 'Hafta'], ['ay', 'Ay'], ['ajanda', 'Gün']];
  main.innerHTML = `
  <div class="page-head" style="margin-bottom:14px">
    <div><h1>Takvim</h1><div class="sub">${esc(title)}</div></div>
    <div class="row">
      <div class="seg" id="c-mode">${modes.map(([k, t]) => `<button data-m="${k}" class="${mode === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <button class="btn primary" id="c-new">${ic('plus')}<span>Randevu</span></button>
    </div>
  </div>
  <div class="row" style="margin-bottom:14px">
    <button class="btn icon sm" id="c-prev" aria-label="Önceki">${ic('back')}</button>
    <button class="btn sm" id="c-today">Bugün</button>
    <button class="btn icon sm" id="c-next" aria-label="Sonraki">${ic('back', 'style="transform:rotate(180deg)"')}</button>
    <span class="muted small" style="margin-left:6px">${appts.filter(a => a.durum !== 'iptal').length} randevu</span>
  </div>
  <div id="c-body"></div>`;

  $('#c-mode').onclick = e => { const b = e.target.closest('[data-m]'); if (b) go(b.dataset.m, date); };
  $('#c-today').onclick = () => go(mode, todayIso());
  $('#c-prev').onclick = () => go(mode, mode === 'ajanda' && isMobile() ? addDays(date, -7) : step(-1));
  $('#c-next').onclick = () => go(mode, mode === 'ajanda' && isMobile() ? addDays(date, 7) : step(1));
  $('#c-new').onclick = () => apptModal({ tarih: mode === 'ay' ? todayIso() : date, saat: '10:00' }, refresh);

  const body = $('#c-body');
  if (mode === 'hafta') renderWeek(body, from, byDay, refresh);
  else if (mode === 'ay') renderMonth(body, date, from, byDay, d => go(isMobile() ? 'ajanda' : 'ajanda', d), refresh);
  else renderAgenda(body, date, from, byDay, d => go('ajanda', d), refresh);
}

function evClass(a) { return `ev-${a.durum}${a.kanal === 'Yüz yüze' ? ' ev-yuz' : ''}`; }

// Çakışan randevuları yan yana şeritlere yerleştir
function layoutDay(list) {
  const evs = list.filter(a => a.durum !== 'iptal').map(a => ({ a, s: toMin(a.saat), e: toMin(a.saat) + (a.sure_dk || 45) }))
    .concat(list.filter(a => a.durum === 'iptal').map(a => ({ a, s: toMin(a.saat), e: toMin(a.saat) + (a.sure_dk || 45) })))
    .sort((x, y) => x.s - y.s || y.e - x.e);
  let cluster = [], lanes = [], clusterEnd = -1;
  const close = () => { cluster.forEach(ev => (ev.n = lanes.length)); cluster = []; lanes = []; };
  for (const ev of evs) {
    if (ev.s >= clusterEnd) { close(); clusterEnd = -1; }
    let li = lanes.findIndex(end => end <= ev.s);
    if (li < 0) { li = lanes.length; lanes.push(0); }
    lanes[li] = ev.e; ev.lane = li; cluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.e);
  }
  close();
  return evs;
}

function renderWeek(el, from, byDay, refresh) {
  const days = [...Array(7)].map((_, i) => addDays(from, i));
  const all = days.flatMap(d => byDay[d] || []);
  const startH = Math.min(8, ...all.map(a => Math.floor(toMin(a.saat) / 60)));
  const endH = Math.max(21, ...all.map(a => Math.ceil(toMin(endOf(a)) / 60)));
  const H = (endH - startH) * HOUR_PX;
  const t = todayIso();
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  el.innerHTML = `<div class="card cal">
    <div class="cal-head"><div></div>${days.map((d, i) => `<button class="cal-dh ${d === t ? 'today' : ''}" data-day="${d}"><span>${GUN_K[i]}</span><b>${dObj(d).getDate()}</b></button>`).join('')}</div>
    <div class="cal-scroll" id="cal-scroll"><div class="cal-grid" style="height:${H}px">
      <div class="cal-times">${[...Array(endH - startH)].map((_, i) => `<div style="top:${i * HOUR_PX}px">${String(startH + i).padStart(2, '0')}:00</div>`).join('')}</div>
      ${days.map(d => `<div class="cal-col ${d === t ? 'today' : ''}" data-day="${d}" style="background-size:100% ${HOUR_PX}px">
        ${layoutDay(byDay[d] || []).map(ev => {
          const top = ((ev.s - startH * 60) / 60) * HOUR_PX, h = Math.max(((ev.e - ev.s) / 60) * HOUR_PX - 2, 20);
          return `<div class="cal-ev ${evClass(ev.a)}" data-id="${ev.a.id}" style="top:${top}px;height:${h}px;left:calc(${(ev.lane / ev.n) * 100}% + 2px);width:calc(${100 / ev.n}% - 4px)" title="${esc(ev.a.ad_soyad)} · ${ev.a.saat}–${endOf(ev.a)}">
            ${h < 42 ? `<b>${ev.a.saat} ${esc(ev.a.ad_soyad)}</b>` : `<b>${esc(ev.a.ad_soyad)}</b><span>${ev.a.saat}–${endOf(ev.a)} · ${esc(ev.a.tur || '')}</span>`}</div>`;
        }).join('')}
        ${d === t && nowMin >= startH * 60 && nowMin <= endH * 60 ? `<div class="cal-now" style="top:${((nowMin - startH * 60) / 60) * HOUR_PX}px"></div>` : ''}
      </div>`).join('')}
    </div></div></div>
    <p class="muted small" style="margin-top:10px">Boş bir saate tıklayarak randevu oluşturabilirsiniz.</p>`;
  const sc = $('#cal-scroll');
  sc.scrollTop = Math.max(0, ((all.length ? Math.min(...all.map(a => toMin(a.saat))) : 9 * 60) / 60 - startH - 0.5) * HOUR_PX);
  el.onclick = e => {
    const ev = e.target.closest('.cal-ev');
    if (ev) return apptModal(all.find(a => a.id == ev.dataset.id), refresh);
    const dh = e.target.closest('.cal-dh');
    if (dh) return (location.hash = `#/takvim/ajanda/${dh.dataset.day}`);
    const col = e.target.closest('.cal-col');
    if (col) {
      const y = e.clientY - col.getBoundingClientRect().top;
      const m = Math.round((startH * 60 + (y / HOUR_PX) * 60) / 15) * 15;
      apptModal({ tarih: col.dataset.day, saat: fromMin(Math.min(Math.max(m, 0), 23 * 60 + 45)) }, refresh);
    }
  };
}

function renderMonth(el, date, from, byDay, openDay, refresh) {
  const t = todayIso(), mon = date.slice(0, 7);
  const days = [...Array(42)].map((_, i) => addDays(from, i));
  el.innerHTML = `<div class="card cal-month">
    ${GUN_K.map(g => `<div class="cm-h">${g}</div>`).join('')}
    ${days.map(d => {
      const list = (byDay[d] || []).filter(a => a.durum !== 'iptal');
      return `<div class="cm-d ${d.slice(0, 7) !== mon ? 'out' : ''} ${d === t ? 'today' : ''}" data-day="${d}">
        <div class="cm-n">${dObj(d).getDate()}</div>
        <div class="cm-evs">${list.slice(0, 3).map(a => `<div class="cm-ev ${evClass(a)}" data-id="${a.id}"><span>${a.saat}</span> ${esc(a.ad_soyad.split(' ')[0])}</div>`).join('')}
        ${list.length > 3 ? `<div class="cm-more">+${list.length - 3} daha</div>` : ''}</div>
        ${list.length ? `<div class="cm-dot">${list.length}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  const all = Object.values(byDay).flat();
  el.onclick = e => {
    const ev = e.target.closest('.cm-ev');
    if (ev && !isMobile()) return apptModal(all.find(a => a.id == ev.dataset.id), refresh);
    const d = e.target.closest('.cm-d');
    if (d) openDay(d.dataset.day);
  };
}

function renderAgenda(el, date, from, byDay, openDay, refresh) {
  const t = todayIso();
  const days = [...Array(7)].map((_, i) => addDays(from, i));
  const list = byDay[date] || [];
  el.innerHTML = `
    <div class="strip">${days.map((d, i) => {
      const n = (byDay[d] || []).filter(a => a.durum !== 'iptal').length;
      return `<button class="strip-d ${d === date ? 'on' : ''} ${d === t ? 'today' : ''}" data-day="${d}"><span>${GUN_K[i]}</span><b>${dObj(d).getDate()}</b><i>${n ? '•'.repeat(Math.min(n, 3)) : ''}</i></button>`;
    }).join('')}</div>
    <div class="card"><div class="list">${list.length ? list.map(a => `
      <div class="item appt ${a.durum === 'iptal' ? 'cancel' : ''}" data-id="${a.id}">
        <div class="appt-time"><b>${a.saat}</b><span>${endOf(a)}</span></div>
        <div class="appt-bar ${evClass(a)}"></div>
        <div class="grow"><div class="t">${esc(a.ad_soyad)}</div><div class="s">${esc([a.tur, a.kanal, `${a.sure_dk} dk`].filter(Boolean).join(' · '))}</div>
          ${a.notlar ? `<div class="s" style="white-space:normal">${esc(a.notlar)}</div>` : ''}</div>
        ${a.durum !== 'planli' ? `<span class="badge ${DURUM[a.durum][1]}">${DURUM[a.durum][0]}</span>` : ''}
      </div>`).join('') : `<div class="empty">${dayTitle(date)} için randevu yok.<br><br><button class="btn soft" id="ag-new">${ic('plus')}Randevu ekle</button></div>`}</div></div>`;
  $('#ag-new') && ($('#ag-new').onclick = () => apptModal({ tarih: date, saat: '10:00' }, refresh));
  el.onclick = e => {
    const s = e.target.closest('.strip-d');
    if (s) return openDay(s.dataset.day);
    const it = e.target.closest('.appt');
    if (it) apptModal(list.find(a => a.id == it.dataset.id), refresh);
  };
}

// ---------- randevu penceresi (yeni / düzenle) ----------
async function apptModal(a, onDone, lockedClient) {
  const isNew = !a.id;
  const clients = lockedClient ? [lockedClient] : await api('/clients?durum=aktif');
  if (!isNew && !clients.some(c => c.id === a.client_id)) clients.unshift({ id: a.client_id, ad_soyad: a.ad_soyad });
  const v = { sure_dk: 45, tur: 'Kontrol', kanal: 'Online', ...a };
  const opt = (arr, cur) => arr.map(x => { const [val, txt] = Array.isArray(x) ? x : [x, x]; return `<option ${String(cur) === String(val) ? 'selected' : ''} value="${esc(val)}">${esc(txt)}</option>`; }).join('');
  const m = modal({
    title: isNew ? 'Yeni randevu' : 'Randevu',
    body: `<form id="ap"><div class="fg" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
      <label class="f full">Danışan
        ${clients.length ? `<select class="i" name="client_id" required ${lockedClient ? 'disabled' : ''}>${isNew && !v.client_id ? '<option value="">Seçin…</option>' : ''}${clients.map(c => `<option value="${c.id}" ${c.id == v.client_id ? 'selected' : ''}>${esc(c.ad_soyad)}</option>`).join('')}</select>`
          : '<div class="muted small">Önce bir danışan ekleyin.</div>'}</label>
      <label class="f">Tarih<input class="i" type="date" name="tarih" value="${esc(v.tarih || todayIso())}" required></label>
      <label class="f">Saat<input class="i" type="time" name="saat" step="300" value="${esc(v.saat || '10:00')}" required></label>
      <label class="f">Süre<select class="i" name="sure_dk">${opt([[15, '15 dk'], [30, '30 dk'], [45, '45 dk'], [60, '1 saat'], [90, '1,5 saat']], v.sure_dk)}</select></label>
      <label class="f">Görüşme<select class="i" name="tur">${opt(TURLER, v.tur)}</select></label>
      <label class="f">Kanal<select class="i" name="kanal">${opt(['Online', 'Yüz yüze'], v.kanal)}</select></label>
      ${isNew ? `<label class="f">Tekrarla<select class="i" name="tekrar_gun">${opt([[0, 'Tekrar yok'], [7, 'Her hafta'], [14, '2 haftada bir'], [21, '3 haftada bir'], [28, '4 haftada bir']], 0)}</select></label>
        <label class="f hidden" id="ap-adet-l">Kaç randevu<input class="i" type="number" name="tekrar_adet" min="2" max="26" value="6" inputmode="numeric"></label>` : ''}
      <label class="f full">Not<textarea class="i" name="notlar" rows="2" placeholder="Görüşmeyle ilgili not (isteğe bağlı)">${esc(v.notlar || '')}</textarea></label>
      ${isNew ? '' : `<div class="full"><div class="muted small" style="font-weight:600;margin-bottom:6px">Durum</div>
        <div class="seg" id="ap-durum">${Object.entries(DURUM).map(([k, [t]]) => `<button type="button" data-d="${k}" class="${v.durum === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>`}
      <div class="full warn hidden" id="ap-warn"></div>
    </div></form>`,
    foot: `${isNew ? '' : `<button class="btn danger" id="ap-del" style="margin-right:auto">${ic('trash')}</button>`}
      ${!isNew && waReminder(v) ? `<a class="btn" href="${esc(waReminder(v))}" target="_blank" rel="noopener">${ic('wa')}<span>Hatırlat</span></a>` : ''}
      ${!isNew && !lockedClient ? `<a class="btn" href="#/danisan/${v.client_id}" data-close>Danışan</a>` : ''}
      <button class="btn primary" id="ap-ok">${ic('save')}Kaydet</button>`,
  });
  const f = $('#ap', m.el);
  let durum = v.durum || 'planli';
  $('#ap-durum', m.el) && ($('#ap-durum', m.el).onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; durum = b.dataset.d; $$('#ap-durum button', m.el).forEach(x => x.classList.toggle('on', x === b)); });
  const tg = f.elements.tekrar_gun;
  if (tg) tg.onchange = () => $('#ap-adet-l', m.el).classList.toggle('hidden', tg.value === '0');

  // Aynı saatte başka randevu var mı?
  const checkConflict = debounce(async () => {
    const d = f.elements.tarih.value, s = f.elements.saat.value;
    if (!d || !s) return;
    const e = toMin(s) + Number(f.elements.sure_dk.value);
    const list = await api(`/appointments?from=${d}&to=${d}`).catch(() => []);
    const hit = list.filter(x => x.id !== v.id && x.durum !== 'iptal' && toMin(x.saat) < e && toMin(x.saat) + (x.sure_dk || 45) > toMin(s));
    const w = $('#ap-warn', m.el);
    w.classList.toggle('hidden', !hit.length);
    w.textContent = hit.length ? `Dikkat: bu saatte ${hit.map(x => `${x.ad_soyad} (${x.saat})`).join(', ')} ile çakışıyor.` : '';
  }, 250);
  ['tarih', 'saat', 'sure_dk'].forEach(n => f.elements[n].addEventListener('change', checkConflict));
  checkConflict();

  $('#ap-ok', m.el).onclick = async () => {
    if (!f.reportValidity()) return;
    const body = Object.fromEntries(new FormData(f));
    if (lockedClient) body.client_id = lockedClient.id;
    if (!isNew) body.durum = durum;
    try {
      if (isNew) {
        const r = await api('/appointments', { method: 'POST', body });
        toast(r.ids.length > 1 ? `${r.ids.length} randevu oluşturuldu` : 'Randevu oluşturuldu');
      } else { await api('/appointments/' + v.id, { method: 'PUT', body }); toast('Randevu güncellendi'); }
      m.close(); onDone && onDone();
    } catch (e) { onErr(e); }
  };
  $('#ap-del', m.el) && ($('#ap-del', m.el).onclick = async () => {
    m.close();
    if (!(await confirmBox('Bu randevu silinecek. Danışan gelmediyse ya da iptal ettiyse silmek yerine durumunu işaretleyebilirsiniz.'))) return;
    await api('/appointments/' + v.id, { method: 'DELETE' }); toast('Randevu silindi'); onDone && onDone();
  });
}
