'use strict';
/* Danışan takip & diyet listesi uygulaması — tek sayfa, bağımlılıksız */

// ============ yardımcılar ============
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayDiff = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(todayIso() + 'T12:00:00')) / 864e5);
const fmtDate = iso => { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${Number(d)} ${AYLAR[Number(m) - 1]} ${y}`; };
const fmtNum = (n, dig = 1) => (n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('tr-TR', { maximumFractionDigits: dig }));
const initials = name => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toLocaleUpperCase('tr')).join('');
const age = iso => { if (!iso) return null; const b = new Date(iso), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const bmi = (kg, cm) => (kg && cm ? kg / ((cm / 100) ** 2) : null);
const bmiLabel = v => (v == null ? '' : v < 18.5 ? 'Zayıf' : v < 25 ? 'Normal' : v < 30 ? 'Fazla kilolu' : v < 35 ? 'Obez (1)' : v < 40 ? 'Obez (2)' : 'Obez (3)');
const waPhone = t => { let d = String(t || '').replace(/\D/g, ''); if (!d) return null; if (d.startsWith('0')) d = d.slice(1); if (d.length === 10) d = '90' + d; return d; };
// Yerel mod: veri cihazda (public/yerel/yerel.js), sunucu yok
const YEREL = !!window.Yerel;
const debounce = (fn, ms) => { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; f.cancel = () => clearTimeout(t); return f; };

function relDay(iso) {
  if (!iso) return '';
  const n = dayDiff(iso);
  if (n === 0) return 'Bugün';
  if (n === 1) return 'Yarın';
  if (n === -1) return 'Dün';
  return n > 0 ? `${n} gün sonra` : `${-n} gün gecikti`;
}
function kontrolBadge(iso) {
  if (!iso) return '';
  const n = dayDiff(iso);
  const cls = n < 0 ? 'kirmizi' : n === 0 ? 'mor' : n <= 7 ? 'sari' : '';
  return `<span class="badge ${cls}" title="Sonraki kontrol: ${fmtDate(iso)}">${n < 0 || n <= 1 ? relDay(iso) : fmtDate(iso)}</span>`;
}

async function api(path, opts = {}) {
  const o = { method: opts.method || 'GET', headers: {} };
  if (opts.body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
  const r = await fetch('/api' + path, o);
  if (r.status === 401 && !path.startsWith('/auth')) { renderLogin(); throw new Error('Oturum kapandı'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'İstek başarısız');
  return j;
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
const onErr = e => { console.error(e); toast(e.message || 'Bir hata oluştu'); };

// ============ ikonlar ============
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .8 3.2 2.5 3.5 5.2"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  lib: '<path d="M4 19V5M9 19V5M14 19l-1.5-14M17 19l3.5-13.5"/>',
  wa: '<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 20.5 11.6z"/><path d="M9 8.5c0 3.6 2.9 6.5 6.5 6.5l1.2-1.6-2-1-1 .8a4.6 4.6 0 0 1-2.9-2.9l.8-1-1-2z"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8.5a5.5 5.5 0 0 1 8 0l-2.5 3h-3z"/>',
  save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8M7 21v-7h10v7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3.5" y="8" width="17" height="11.5" rx="2.5"/><path d="M16 13.8h1.5"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  sparkle: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
};
const ic = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${I[n]}</svg>`;

// ============ durum ============
const S = { brand: {}, route: null, editor: null };

// ============ giriş ============
async function boot() {
  if (YEREL) {
    try { await Yerel.hazir; } catch (e) { return renderYerelHata(e); }
    if (await Yerel.bosMu()) return renderIceAktar();
    // Yerel modda /api/… indirme linkleri (CSV, yedek) de cihazdaki veriden üretilir
    addEventListener('yerel:yenilendi', async () => {
      if (!$('#main') || S.editor || $('.modal-bg') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const y = window.scrollY;
      try { S.brand = (await api('/auth')).marka || {}; } catch { /* */ }
      await route();
      window.scrollTo(0, y);
    });
    document.addEventListener('click', e => {
      const a = e.target.closest('a[download][href^="/api/"]');
      if (!a) return;
      e.preventDefault();
      yerelIndir(a.getAttribute('href')).catch(onErr);
    });
  }
  const a = await fetch('/api/auth').then(r => r.json());
  S.brand = a.marka || {};
  if (!a.girisli) return renderLogin(!a.kurulu);
  renderShell();
  route();
}

// ---------- yerel mod: ilk açılış, hata, indirme ----------
function renderYerelHata(e) {
  $('#app').innerHTML = `<div class="login"><div class="card">
    <img src="logo-koyu.png" alt="" class="login-logo">
    <p style="margin:14px 0 0">${esc(e.message || 'Uygulama açılamadı.')}</p>
    <button class="btn primary" style="margin-top:16px" id="yh-tekrar">Tekrar dene</button></div></div>`;
  $('#yh-tekrar').onclick = () => location.reload();
}
function renderIceAktar() {
  $('#app').innerHTML = `<div class="login"><div class="card">
    <img src="logo-koyu.png" alt="Danışanlarım" class="login-logo">
    <div class="muted small eyebrow" style="margin-top:4px">Bu cihazda henüz veri yok</div>
    <p style="margin:14px 0 4px">Mevcut verilerinizi aktarmak için yedek dosyasını (<b>.db</b>) seçin.</p>
    <label class="btn primary" style="margin-top:12px">${ic('save')}Yedek dosyası seç<input type="file" id="ia-f" accept=".db,application/octet-stream,application/x-sqlite3" hidden></label>
    <div class="err" id="ia-err"></div>
    ${EsitlemeArayuz.bagla()}
    <button class="btn ghost sm" id="ia-bos" style="margin-top:14px">Boş başla</button>
  </div></div>`;
  EsitlemeArayuz.baglaSonra();
  $('#ia-f').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { await Yerel.icerAktar(f); location.reload(); } catch (err) { $('#ia-err').textContent = err.message; }
  };
  $('#ia-bos').onclick = async () => { await api('/settings', { method: 'PUT', body: { brand: {} } }); await Yerel.kaydet(); location.reload(); };
}
async function yerelIndir(href) {
  const r = await Yerel.istek('GET', href);
  if (r.statusCode >= 400) throw new Error(JSON.parse(r.body || '{}').error || 'İndirilemedi');
  const ad = /filename="([^"]+)"/.exec(r.headers['content-disposition'] || '')?.[1] || 'dosya';
  indirBlob(new Blob([r.body], { type: r.headers['content-type'] || 'application/octet-stream' }), ad);
}
function indirBlob(blob, ad) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function renderLogin(ilkKurulum) {
  if (ilkKurulum === undefined) ilkKurulum = false;
  $('#app').innerHTML = `
  <div class="login"><div class="card">
    <img src="logo-koyu.png" alt="${esc(S.brand.unvan || 'Diyetisyen')}" class="login-logo">
    <div class="muted small eyebrow" style="margin-top:4px">${ilkKurulum ? 'Hoş geldiniz! Uygulamaya giriş şifrenizi belirleyin.' : 'Danışan takip paneli'}</div>
    <form id="lf">
      <label class="f">${ilkKurulum ? 'Yeni şifre' : 'Şifre'}<input class="i" type="password" name="sifre" autocomplete="${ilkKurulum ? 'new-password' : 'current-password'}" required minlength="${ilkKurulum ? 6 : 1}" autofocus></label>
      ${ilkKurulum ? '<label class="f">Şifre (tekrar)<input class="i" type="password" name="sifre2" autocomplete="new-password" required></label>' : ''}
      <div class="err" id="lerr"></div>
      <button class="btn primary" type="submit">${ilkKurulum ? 'Şifreyi kaydet ve başla' : 'Giriş yap'}</button>
    </form>
  </div></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (ilkKurulum && f.get('sifre') !== f.get('sifre2')) return ($('#lerr').textContent = 'Şifreler aynı değil.');
    try {
      await api(ilkKurulum ? '/auth/kurulum' : '/auth/giris', { method: 'POST', body: { sifre: f.get('sifre') } });
      renderShell(); route();
    } catch (err) { $('#lerr').textContent = err.message; }
  };
}

// ============ iskelet ============
const NAV = [
  ['#/', 'home', 'Özet'],
  ['#/takvim', 'cal', 'Takvim'],
  ['#/danisanlar', 'users', 'Danışanlar'],
  ['#/finans', 'wallet', 'Finans'],
  ['#/sablonlar', 'file', 'Şablonlar'],
  ['#/kutuphane', 'book', 'Kütüphane'],
  ['#/ayarlar', 'gear', 'Ayarlar'],
];
function renderShell() {
  $('#app').innerHTML = `
  <div class="shell">
    <aside class="side">
      <div class="brand"><img src="logo-koyu.png" alt="${esc(S.brand.unvan || 'Diyetisyen')}"><span class="eyebrow">Danışan takip</span></div>
      <nav class="nav">${NAV.map(([h, i, t]) => `<a href="${h}" data-nav="${h}">${ic(i)}${t}</a>`).join('')}</nav>
      <div class="spacer"></div>
      ${YEREL ? EsitlemeArayuz.kabuk() : `<nav class="nav"><a href="#" id="logout">${ic('logout')}Çıkış</a></nav>`}
    </aside>
    <main class="main" id="main"></main>
    <nav class="tabbar">${NAV.map(([h, i, t]) => `<a href="${h}" data-nav="${h}"${h === '#/sablonlar' ? ' class="tb-sablon"' : ''}>${ic(i)}${t}</a>`).join('')}
      ${YEREL ? `<div class="es-mobil">${EsitlemeArayuz.kabuk()}</div>` : ''}</nav>
  </div>`;
  if (YEREL) EsitlemeArayuz.kabukSonra();
  if (!YEREL) $('#logout').onclick = async e => { e.preventDefault(); await api('/auth/cikis', { method: 'POST' }); renderLogin(false); };
}

// ============ yönlendirme ============
window.addEventListener('hashchange', () => route());
async function route() {
  if (!$('#main')) return;
  if (S.editor) { await S.editor.flush(); S.editor = null; }
  const h = location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  const top = '#/' + (parts[0] === 'danisan' ? 'danisanlar' : parts[0] === 'liste' ? 'danisanlar' : parts[0] === 'sablon' ? 'sablonlar' : parts[0] === 'paketler' ? 'finans' : parts[0] === 'basvurular' ? 'danisanlar' : (parts[0] || ''));
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === top));
  const main = $('#main');
  main.classList.remove('wide');
  main.onclick = null;   // sayfaya özel tıklama işleyicisi bir sonraki sayfaya taşınmasın
  window.scrollTo(0, 0);
  try {
    if (!parts.length) return await viewDashboard(main);
    switch (parts[0]) {
      case 'takvim': return await viewCalendar(main, parts[1], parts[2]);
      case 'finans': return await viewFinance(main, parts[1], parts[2]);
      case 'basvurular': return await viewBasvurular(main);
      case 'paketler': return await viewFinance(main, 'paketler', parts[1]);
      case 'danisanlar': return await viewClients(main);
      case 'danisan':
        if (parts[1] === 'yeni') return await viewClientForm(main, null);
        if (parts[2] === 'duzenle') return await viewClientForm(main, parts[1]);
        return await viewClient(main, parts[1], parts[2] || 'ozet');
      case 'liste': return await viewEditor(main, 'liste', parts[1]);
      case 'sablonlar': return await viewTemplates(main);
      case 'sablon': return await viewEditor(main, 'sablon', parts[1]);
      case 'kutuphane': return await viewLibrary(main, parts[1] || 'ogun');
      case 'ayarlar': return await viewSettings(main);
      default: location.hash = '#/';
    }
  } catch (e) {
    if (e.message !== 'Oturum kapandı') main.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

// ============ modal ============
function modal({ title, body, foot = '', size = '' }) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true">
    <div class="modal-h"><h2>${title}</h2><button class="btn icon sm ghost" data-close aria-label="Kapat">${ic('x')}</button></div>
    <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
  document.body.appendChild(bg);
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  $$('[data-close]', bg).forEach(b => (b.onclick = close));
  const first = $('input:not([type=hidden]), textarea, select', bg);
  if (first && window.innerWidth > 820) setTimeout(() => first.focus(), 30);
  return { el: bg, close };
}
function confirmBox(msg, okText = 'Sil') {
  return new Promise(res => {
    const m = modal({ title: 'Emin misiniz?', body: `<p style="margin:0">${msg}</p>`, foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="okb" style="background:var(--kirmizi);border-color:var(--kirmizi)">${okText}</button>` });
    let done = false;
    $('#okb', m.el).onclick = () => { done = true; m.close(); res(true); };
    const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) res(false); } });
    obs.observe(document.body, { childList: true });
  });
}

// ============ ÖZET ============
async function viewDashboard(main) {
  const d = await api('/dashboard');
  const saat = new Date().getHours();
  const selam = saat < 6 ? 'İyi geceler' : saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
  const ad = (S.brand.unvan || '').replace(/^dyt\.?\s*/i, '').split(' ')[0];
  const cl = (rows, fn, bos) => rows.length ? rows.map(fn).join('') : `<div class="empty">${bos}</div>`;
  const kisi = (c, sag) => `<a class="item" href="#/danisan/${c.id}"><div class="avatar">${esc(initials(c.ad_soyad))}</div>
      <div class="grow"><div class="t">${esc(c.ad_soyad)}</div><div class="s">${esc(c.paket || c.gorusme_tipi || '')}${c.son_kilo ? ` · ${fmtNum(c.son_kilo)} kg` : ''}</div></div>${sag}</a>`;

  main.innerHTML = `
  <div class="page-head">
    <div><h1>${selam}${ad ? ', ' + esc(ad) : ''}</h1><div class="sub">${fmtDate(d.bugun)} · ${d.bugunRandevu.length ? `Bugün ${d.bugunRandevu.length} randevunuz var` : 'Bugün randevu yok'}</div></div>
    <div class="row"><a class="btn primary" href="#/danisan/yeni">${ic('plus')}Yeni danışan</a></div>
  </div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card stat"><div class="k">Aktif danışan</div><div class="v">${d.aktif}</div></div>
    <a class="card stat" href="#/finans"><div class="k">Bu ay tahsilat</div><div class="v num">${tl(d.buAyTahsilat)}</div><div class="d muted">${d.buAyYeni} yeni danışan</div></a>
    <a class="card stat" href="#/finans"><div class="k">Açık alacak</div><div class="v num ${d.alacak > 0 ? 'up' : ''}">${tl(d.alacak)}</div><div class="d muted">${d.buAyListe} liste hazırlandı</div></a>
    <div class="card stat"><div class="k">Aktiflerin verdiği toplam</div><div class="v">${fmtNum(d.toplamVerilen)}<small>kg</small></div></div>
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-head"><h2>Bugünkü randevular</h2><a class="btn sm ghost" href="#/takvim">${ic('cal')}Takvim</a></div>
      <div class="list" style="margin-top:8px" data-appts>${cl(d.bugunRandevu, a => randevuSatiri(a, false), 'Bugün randevu yok')}</div></div>
    <div class="card"><div class="card-head"><h2>Önümüzdeki 7 gün</h2><span class="badge">${d.haftaRandevu.length}</span></div>
      <div class="list" style="margin-top:8px" data-appts>${cl(d.haftaRandevu, a => randevuSatiri(a, true), 'Bu hafta başka randevu yok')}</div></div>
    <div class="card"><div class="card-head"><h2>Sonucu girilmemiş</h2><span class="badge ${d.geciken.length ? 'kirmizi' : ''}">${d.geciken.length}</span></div>
      <div class="muted small" style="padding:4px 20px 0">Geçmiş randevular: geldi mi, gelmedi mi işaretleyin</div>
      <div class="list" style="margin-top:4px" data-appts>${cl(d.geciken, a => randevuSatiri(a, true), 'Hepsi işlenmiş 👍')}</div></div>
    <div class="card"><div class="card-head"><h2>Randevusu olmayanlar</h2><span class="badge ${d.randevusuz.length ? 'sari' : ''}">${d.randevusuz.length}</span></div>
      <div class="muted small" style="padding:4px 20px 0">Aktif ama ileri tarihli randevusu olmayan danışanlar</div>
      <div class="list" style="margin-top:4px">${cl(d.randevusuz, c => kisi(c, `<button class="btn sm soft" data-rv="${c.id}">Randevu ver</button>`), 'Herkesin randevusu var')}</div></div>
    <div class="card"><div class="card-head"><h2>Paketi bitmek üzere</h2></div>
      <div class="list" style="margin-top:8px">${cl(d.paketBitiyor, c => kisi(c, `<span class="badge sari">${relDay(c.paket_bitis).replace('sonra', 'kaldı')}</span><button class="btn sm soft" data-yenile="${c.id}">Yenile</button>`), '10 gün içinde biten paket yok')}</div></div>
  </div>
  <div class="card" style="margin-top:16px"><div class="card-head"><h2>Son düzenlenen listeler</h2></div>
    <div class="list" style="margin-top:8px">${cl(d.sonListeler, l => `<a class="item" href="#/liste/${l.id}"><div class="avatar" style="background:var(--seftali-acik);color:#3F6A22">${ic('file', 'width="20" height="20"')}</div>
      <div class="grow"><div class="t">${esc(l.ad_soyad)}</div><div class="s">${esc(l.baslik || 'Diyet listesi')} · ${fmtDate(l.tarih)}</div></div></a>`, 'Henüz liste yok')}</div></div>`;
  const allAppts = [...d.bugunRandevu, ...d.haftaRandevu, ...d.geciken];
  main.onclick = e => {
    const yn = e.target.closest('[data-yenile]');
    if (yn) { e.preventDefault(); return api('/clients/' + yn.dataset.yenile).then(c => assignPackageModal(c, () => viewDashboard(main))).catch(onErr); }
    const rv = e.target.closest('[data-rv]');
    if (rv) { e.preventDefault(); const c = d.randevusuz.find(x => x.id == rv.dataset.rv); return apptModal({ client_id: c.id, tarih: addDays(todayIso(), 1), saat: '10:00' }, () => viewDashboard(main)); }
    const ap = e.target.closest('[data-appt]');
    if (ap && !e.target.closest('a')) apptModal(allAppts.find(a => a.id == ap.dataset.appt), () => viewDashboard(main));
  };
}

function randevuSatiri(a, tarihli, isimsiz) {
  return `<div class="item appt" data-appt="${a.id}" style="cursor:pointer">
    <div class="appt-time"><b>${a.saat}</b><span>${tarihli ? fmtDate(a.tarih).replace(/ \d{4}$/, '') : endOf(a)}</span></div>
    <div class="appt-bar ${evClass(a)}"></div>
    <div class="grow">${isimsiz ? '' : `<div class="t">${esc(a.ad_soyad)}</div>`}<div class="s">${esc([tarihli && dayDiff(a.tarih) >= 0 && dayDiff(a.tarih) <= 1 ? relDay(a.tarih) : null, a.tur, a.kanal].filter(Boolean).join(' · '))}</div></div>
    ${a.durum !== 'planli' ? `<span class="badge ${DURUM[a.durum][1]}">${DURUM[a.durum][0]}</span>` : ''}
    ${!isimsiz && a.durum === 'planli' && dayDiff(a.tarih) >= 0 && waReminder(a) ? `<a class="tbtn" href="${esc(waReminder(a))}" target="_blank" rel="noopener" title="WhatsApp ile hatırlat">${ic('wa')}</a>` : ''}
  </div>`;
}

// ============ DANIŞANLAR ============
async function viewClients(main) {
  const st = viewClients.st || (viewClients.st = { q: '', durum: 'aktif' });
  main.innerHTML = `
  <div class="page-head"><div><h1>Danışanlar</h1></div><div class="row"><a class="btn" href="#/basvurular">${ic('file')}Form başvuruları</a><a class="btn primary" href="#/danisan/yeni">${ic('plus')}Yeni danışan</a></div></div>
  <div id="bv-bildirim"></div>
  <div class="row" style="margin-bottom:14px">
    <div class="search grow" style="min-width:200px">${ic('search')}<input class="i" id="q" type="search" placeholder="İsim veya telefon ara" value="${esc(st.q)}"></div>
    <div class="seg" id="seg">${[['aktif', 'Aktif'], ['pasif', 'Pasif'], ['hepsi', 'Tümü']].map(([k, t]) => `<button data-k="${k}" class="${st.durum === k ? 'on' : ''}">${t}</button>`).join('')}</div>
  </div>
  <div class="card"><div class="list" id="cl"><div class="empty">Yükleniyor…</div></div></div>`;
  const load = async () => {
    const rows = await api(`/clients?q=${encodeURIComponent(st.q)}&durum=${st.durum}`);
    $('#cl').innerHTML = rows.length ? rows.map(c => {
      const deg = c.son_kilo && c.baslangic_kilo ? c.son_kilo - c.baslangic_kilo : null;
      return `<a class="item" href="#/danisan/${c.id}"><div class="avatar">${esc(initials(c.ad_soyad))}</div>
        <div class="grow"><div class="t">${esc(c.ad_soyad)} ${c.durum === 'pasif' ? '<span class="badge">Pasif</span>' : ''}</div>
        <div class="s">${[c.paket, c.son_kilo ? `${fmtNum(c.son_kilo)} kg` : null, deg ? `<span class="${deg < 0 ? 'down' : 'up'}">${deg > 0 ? '+' : ''}${fmtNum(deg)} kg</span>` : null, `${c.liste_sayisi} liste`].filter(Boolean).join(' · ')}</div></div>
        ${c.bakiye > 0.009 ? `<span class="badge kirmizi" title="Açık bakiye">${tl(c.bakiye)}</span>` : ''}
        ${c.durum === 'aktif' ? kontrolBadge(c.sonraki_kontrol) : ''}</a>`;
    }).join('') : `<div class="empty">${st.q ? 'Eşleşen danışan yok' : 'Henüz danışan eklenmemiş'}</div>`;
  };
  api('/google-form?kontrol=1').then(g => { if (g.yeni) $('#bv-bildirim').innerHTML = `<a class="card card-pad bv-banner" href="#/basvurular">${ic('file')}<span><b>${g.yeni} yeni takip kartı</b> Google Form'dan geldi — onaylamak için dokunun</span></a>`; }).catch(() => {});
  $('#q').oninput = debounce(e => { st.q = e.target.value; load().catch(onErr); }, 200);
  $('#seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.durum = b.dataset.k; $$('#seg button').forEach(x => x.classList.toggle('on', x === b)); load().catch(onErr); };
  await load();
}

// ---------- danışan formu ----------
async function viewClientForm(main, id) {
  const c = id ? await api('/clients/' + id) : { durum: 'aktif', gorusme_tipi: 'Online' };
  const pkgs = id ? [] : await api('/packages');
  const inp = (k, label, type = 'text', cls = '', extra = '') => `<label class="f ${cls}">${label}<input class="i" name="${k}" type="${type}" value="${esc(c[k] ?? '')}" ${extra}></label>`;
  const ta = (k, label, ph = '') => `<label class="f full">${label}<textarea class="i" name="${k}" rows="2" placeholder="${esc(ph)}">${esc(c[k] ?? '')}</textarea></label>`;
  const sel = (k, label, opts) => `<label class="f">${label}<select class="i" name="${k}">${opts.map(o => `<option ${String(c[k] ?? '') === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  main.innerHTML = `
  <a class="back" href="${id ? '#/danisan/' + id : '#/danisanlar'}">${ic('back')}${id ? esc(c.ad_soyad) : 'Danışanlar'}</a>
  <div class="page-head"><h1>${id ? 'Bilgileri düzenle' : 'Yeni danışan'}</h1></div>
  <form id="cf" class="card" autocomplete="off">
    <div class="kart-bas"><b>Diyetisyen Hasta Takip Kartı</b><span class="muted small">Kağıt formdaki bölümlerle aynı sırada</span></div>
    <div class="fs"><h3>Kimlik ve iletişim</h3><div class="fg">
      ${inp('ad_soyad', 'Ad soyad *', 'text', 'span2', 'required')}
      ${inp('telefon', 'Telefon', 'tel', '', 'placeholder="5xx xxx xx xx"')}
      ${inp('tc_kimlik', 'TC kimlik no', 'text', '', 'inputmode="numeric" maxlength="11" pattern="[1-9][0-9]{10}" title="11 haneli TC kimlik numarası"')}
      <label class="f">Doğum tarihi <span class="muted" id="cf-yas" style="font-weight:500">${age(c.dogum_tarihi) != null ? `(${age(c.dogum_tarihi)} yaş)` : ''}</span><input class="i" name="dogum_tarihi" type="date" value="${esc(c.dogum_tarihi ?? '')}"></label>
      ${sel('cinsiyet', 'Cinsiyet', ['', 'Kadın', 'Erkek'])}
      ${inp('meslek', 'Meslek')}
      ${inp('sehir', 'Şehir')}
      ${inp('ilce', 'İlçe')}
      ${c.adres ? `<label class="f full">Adres (eski kayıt — yeni kartlarda yok, silebilirsiniz)<textarea class="i" name="adres" rows="2" style="min-height:56px">${esc(c.adres)}</textarea></label>` : ''}
    </div></div>
    <div class="fs"><h3>Ölçü ve hedef</h3><div class="fg">
      ${inp('baslangic_kilo', 'Kilo (kg)', 'number', '', 'step="0.1" inputmode="decimal"' + (id ? '' : ' placeholder="İlk ölçüm olarak da kaydedilir"'))}
      ${inp('boy_cm', 'Boy (cm)', 'number', '', 'step="0.1" inputmode="decimal"')}
      ${inp('hedef_kilo', 'Hedeflenen kilo (kg)', 'number', '', 'step="0.1" inputmode="decimal"')}
      ${inp('hedef', 'Hedef / amaç', 'text', '', 'placeholder="Kilo verme, kas kazanımı, gebelik…"')}
    </div></div>
    ${renderAnamnezForm(c)}
    <div class="fs"><h3>${id ? 'Takip' : 'Paket ve takip'}</h3><div class="fg">
      ${id ? '' : `<label class="f span2">Paket<select class="i" name="package_id" id="cf-pk"><option value="">Şimdilik paket yok</option>${pkgs.map(p => `<option value="${p.id}" data-fiyat="${p.fiyat ?? ''}">${esc(p.ad)}${p.fiyat != null ? ` — ${tl(p.fiyat)}` : ''}</option>`).join('')}</select></label>
      <label class="f">Paket başlangıç<input class="i" type="date" name="pk_baslangic" value="${todayIso()}"></label>
      <label class="f">Alınan ödeme (₺)<input class="i" type="number" min="0" step="1" name="pk_odeme" inputmode="decimal" placeholder="Ödeme alınmadıysa boş"></label>`}
      ${sel('gorusme_tipi', 'Görüşme tipi', ['Online', 'Yüz yüze', 'Karma'])}
      ${sel('durum', 'Durum', ['aktif', 'pasif'])}
    </div>${id ? `<div class="muted small" style="margin-top:10px">Paket, ödeme ve fatura bilgileri danışan kartındaki <a href="#/danisan/${id}/odeme">Paket & ödeme</a> sekmesinden yönetilir.</div>` : ''}</div>
    <div class="fs"><h3>Özel notlar</h3><div class="fg">${ta('notlar', 'Yalnızca sizin göreceğiniz notlar', 'Karta yazılmayan kişisel notlar')}</div></div>
    <div class="modal-f" style="justify-content:space-between">
      <div>${id ? `<button type="button" class="btn danger" id="delc">${ic('trash')}Danışanı sil</button>` : ''}</div>
      <div class="row"><a class="btn" href="${id ? '#/danisan/' + id : '#/danisanlar'}">Vazgeç</a><button class="btn primary" type="submit">${ic('save')}Kaydet</button></div>
    </div>
  </form>`;
  bindAnamnezForm($('#cf'));
  $('[name=dogum_tarihi]').onchange = e => { const y = age(e.target.value); $('#cf-yas').textContent = y != null ? `(${y} yaş)` : ''; };
  $('#cf-pk') && ($('#cf-pk').onchange = e => { const f = e.target.selectedOptions[0]?.dataset.fiyat; $('[name=pk_odeme]').value = f || ''; });
  $('#cf').onsubmit = async e => {
    e.preventDefault();
    const body = stripAnamnez(Object.fromEntries(new FormData(e.target)));
    body.anamnez = collectAnamnez(e.target);
    try {
      if (id) { await api('/clients/' + id, { method: 'PUT', body }); toast('Kaydedildi'); location.hash = '#/danisan/' + id + '/bilgiler'; }
      else {
        const { package_id, pk_baslangic, pk_odeme } = body;
        delete body.package_id; delete body.pk_baslangic; delete body.pk_odeme;
        const r = await api('/clients', { method: 'POST', body });
        if (package_id) await api(`/clients/${r.id}/packages`, { method: 'POST', body: { package_id, baslangic: pk_baslangic, odeme_tutar: pk_odeme, odeme_tarih: pk_baslangic } });
        toast('Danışan eklendi'); location.hash = '#/danisan/' + r.id;
      }
    } catch (err) { onErr(err); }
  };
  if (id) $('#delc').onclick = async () => {
    if (!(await confirmBox(`<b>${esc(c.ad_soyad)}</b> ve tüm ölçüm/liste kayıtları kalıcı olarak silinecek. Sadece pasife almak isterseniz "Durum" alanını kullanın.`))) return;
    await api('/clients/' + id, { method: 'DELETE' }); toast('Danışan silindi'); location.hash = '#/danisanlar';
  };
}

// ---------- danışan detayı ----------
async function viewClient(main, id, tab) {
  const c = await api('/clients/' + id);
  const visitsAsc = [...c.visits].reverse();
  const ilk = visitsAsc.find(v => v.kilo != null)?.kilo ?? c.baslangic_kilo;
  const son = c.son_kilo ?? c.baslangic_kilo;
  const degisim = ilk != null && son != null ? son - ilk : null;
  const b = bmi(son, c.boy_cm);
  const wa = waPhone(c.telefon);
  const nextAppt = [...c.appointments].reverse().find(a => a.durum === 'planli' && a.tarih >= todayIso());
  const apptLocked = { id: c.id, ad_soyad: c.ad_soyad };
  const TABS = [['ozet', 'Genel bakış'], ['kontroller', `Kontroller (${c.visits.length})`], ['listeler', `Diyet listeleri (${c.lists.length})`], ['odeme', 'Paket & ödeme'], ['bilgiler', 'Bilgiler']];

  main.innerHTML = `
  <a class="back" href="#/danisanlar">${ic('back')}Danışanlar</a>
  <div class="page-head" style="margin-bottom:0">
    <div class="client-head"><div class="avatar lg">${esc(initials(c.ad_soyad))}</div>
      <div><h1>${esc(c.ad_soyad)}</h1><div class="meta">
        ${c.durum === 'pasif' ? '<span class="badge">Pasif</span>' : '<span class="badge yesil">Aktif</span>'}
        ${c.paket ? `<span class="badge mor">${esc(c.paket)}</span>` : ''}
        ${c.finans.bakiye > 0.009 ? `<a class="badge kirmizi" href="#/danisan/${c.id}/odeme">Bakiye ${tl(c.finans.bakiye)}</a>` : ''}
        ${age(c.dogum_tarihi) != null ? `<span class="badge">${age(c.dogum_tarihi)} yaş</span>` : ''}
        ${nextAppt ? `<span class="badge">${ic('cal', 'width="12" height="12"')} ${fmtDate(nextAppt.tarih)} ${nextAppt.saat}</span>` : ''}
      </div></div></div>
    <div class="row">
      ${wa ? `<a class="btn icon" href="https://wa.me/${wa}" target="_blank" rel="noopener" title="WhatsApp">${ic('wa')}</a>` : ''}
      <button class="btn" id="formgonder" title="Hasta Takip Kartı formunu WhatsApp ile gönder">${ic('file')}Kart formu</button>
      <button class="btn" id="addr">${ic('cal')}Randevu</button>
      <button class="btn" id="addv">${ic('scale')}Kontrol ekle</button>
      <button class="btn primary" id="newl">${ic('plus')}Yeni liste</button>
    </div>
  </div>
  <div class="tabs" id="tabs">${TABS.map(([k, t]) => `<button data-k="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>
  <div id="tabc"></div>`;

  $('#tabs').onclick = e => { const bt = e.target.closest('button'); if (bt) history.replaceState(null, '', `#/danisan/${id}/${bt.dataset.k}`), renderTab(bt.dataset.k); };
  $('#addv').onclick = () => visitModal(c);
  $('#formgonder').onclick = () => formLinkiPaylas(c.ad_soyad, c.telefon).catch(onErr);
  $('#addr').onclick = () => apptModal({ client_id: c.id, tarih: addDays(todayIso(), 1), saat: nextAppt?.saat || '10:00', kanal: c.gorusme_tipi === 'Yüz yüze' ? 'Yüz yüze' : 'Online' }, () => viewClient(main, id, tab), apptLocked);
  $('#newl').onclick = () => newListModal(c);

  function renderTab(k) {
    $$('#tabs button').forEach(x => x.classList.toggle('on', x.dataset.k === k));
    const el = $('#tabc');
    if (k === 'ozet') {
      const kalan = son != null && c.hedef_kilo ? son - c.hedef_kilo : null;
      el.innerHTML = `
      <div class="grid g4" style="margin-bottom:16px">
        <div class="card stat"><div class="k">Güncel kilo</div><div class="v">${fmtNum(son)}<small>kg</small></div><div class="d muted">Başlangıç ${fmtNum(ilk)} kg</div></div>
        <div class="card stat"><div class="k">Toplam değişim</div><div class="v ${degisim < 0 ? 'down' : degisim > 0 ? 'up' : ''}">${degisim != null ? (degisim > 0 ? '+' : '') + fmtNum(degisim) : '—'}<small>kg</small></div><div class="d muted">${visitsAsc.length} ölçüm</div></div>
        <div class="card stat"><div class="k">Hedefe kalan</div><div class="v">${kalan != null ? fmtNum(Math.max(kalan, 0)) : '—'}<small>kg</small></div><div class="d muted">Hedef ${fmtNum(c.hedef_kilo)} kg</div></div>
        <div class="card stat"><div class="k">Beden kitle indeksi</div><div class="v">${b ? fmtNum(b) : '—'}</div><div class="d muted">${bmiLabel(b) || (c.boy_cm ? '' : 'Boy girilmemiş')}</div></div>
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-head"><h2>Kilo seyri</h2></div><div class="card-pad">${weightChart(visitsAsc, c.hedef_kilo)}</div></div>
        <div class="card"><div class="card-head"><h2>Sağlık özeti</h2><a class="btn sm ghost" href="#/danisan/${id}/duzenle">${ic('edit')}Düzenle</a></div>
          <div class="card-pad"><dl class="info-list">
          ${[['Hedef', c.hedef], ...anamnezOzet(c), ['Özel not', c.notlar]]
            .filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') || '<dd class="muted" style="grid-column:1/-1">Takip kartı henüz doldurulmamış.</dd>'}
          </dl></div></div>
      </div>
      <div class="card" style="margin-top:16px"><div class="card-head"><h2>Randevular</h2><button class="btn sm soft" id="addr2">${ic('plus')}Randevu</button></div>
        <div class="list" style="margin-top:8px" id="c-appts">${(() => {
          const up = [...c.appointments].reverse().filter(a => a.tarih >= todayIso() && a.durum === 'planli');
          const past = c.appointments.filter(a => !(a.tarih >= todayIso() && a.durum === 'planli')).slice(0, 3);
          return up.concat(past).map(a => randevuSatiri(a, true, true)).join('') || '<div class="empty">Randevu yok</div>';
        })()}</div></div>
      ${c.visits[0]?.notlar ? `<div class="card card-pad" style="margin-top:16px"><div class="muted small">Son görüşme notu · ${fmtDate(c.visits[0].tarih)}</div><div style="margin-top:4px;white-space:pre-wrap">${esc(c.visits[0].notlar)}</div></div>` : ''}`;
      $('#addr2').onclick = () => $('#addr').click();
      $('#c-appts').onclick = e => { const ap = e.target.closest('[data-appt]'); if (ap) apptModal({ ...c.appointments.find(a => a.id == ap.dataset.appt), ad_soyad: c.ad_soyad, telefon: c.telefon }, () => viewClient(main, id, 'ozet'), apptLocked); };
    } else if (k === 'kontroller') {
      const cols = [['kilo', 'Kilo'], ['bel', 'Bel'], ['kalca', 'Kalça'], ['gogus', 'Göğüs'], ['kol', 'Kol'], ['bacak', 'Bacak'], ['yag_orani', 'Yağ %'], ['kas_kutlesi', 'Kas'], ['su_orani', 'Su %']]
        .filter(([f]) => c.visits.some(v => v[f] != null));
      el.innerHTML = `<div class="card">${c.visits.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tarih</th>${cols.map(([, t]) => `<th class="n">${t}</th>`).join('')}<th>Not</th><th></th></tr></thead><tbody>
        ${c.visits.map((v, i) => {
          const prev = c.visits[i + 1];
          return `<tr><td style="white-space:nowrap">${fmtDate(v.tarih)}</td>${cols.map(([f]) => {
            const dd = prev && v[f] != null && prev[f] != null ? v[f] - prev[f] : null;
            return `<td class="n">${fmtNum(v[f])}${f === 'kilo' && dd ? `<div class="small ${dd < 0 ? 'down' : 'up'}">${dd > 0 ? '+' : ''}${fmtNum(dd)}</div>` : ''}</td>`;
          }).join('')}<td style="min-width:180px;white-space:pre-wrap">${esc(v.notlar || '')}</td>
          <td style="white-space:nowrap"><button class="tbtn" data-ev="${v.id}" title="Düzenle">${ic('edit')}</button><button class="tbtn del" data-dv="${v.id}" title="Sil">${ic('trash')}</button></td></tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty">Henüz kontrol kaydı yok.<br><br><button class="btn soft" id="addv2">${ic('plus')}İlk kontrolü ekle</button></div>`}</div>`;
      $('#addv2') && ($('#addv2').onclick = () => visitModal(c));
      el.onclick = async e => {
        const ed = e.target.closest('[data-ev]'), dl = e.target.closest('[data-dv]');
        if (ed) visitModal(c, c.visits.find(v => v.id == ed.dataset.ev));
        if (dl && await confirmBox('Bu kontrol kaydı silinecek.')) { await api('/visits/' + dl.dataset.dv, { method: 'DELETE' }); toast('Silindi'); viewClient(main, id, 'kontroller'); }
      };
    } else if (k === 'listeler') {
      el.innerHTML = `<div class="card"><div class="list">${c.lists.length ? c.lists.map(l => `
        <div class="item"><a class="avatar" href="#/liste/${l.id}" style="background:var(--seftali-acik);color:#3F6A22">${ic('file', 'width="20" height="20"')}</a>
          <a class="grow" href="#/liste/${l.id}" style="color:inherit"><div class="t">${esc(l.baslik || 'Diyet listesi')}</div><div class="s">${fmtDate(l.tarih)}${l.kilo ? ` · ${fmtNum(l.kilo)} kg` : ''}</div></a>
          <div class="row" style="gap:2px">
            <button class="btn sm soft" data-pdfy="${l.id}">${ic('pdf')}<span>PDF</span></button>
            <button class="tbtn" data-share="${l.id}" title="Paylaş">${ic('share')}</button>
            <button class="tbtn" data-dup="${l.id}" title="Bu listeden yeni liste">${ic('copy')}</button>
            <button class="tbtn del" data-del="${l.id}" title="Sil">${ic('trash')}</button>
          </div></div>`).join('') : `<div class="empty">Bu danışana henüz liste hazırlanmadı.<br><br><button class="btn primary" id="newl2">${ic('plus')}Liste hazırla</button></div>`}</div></div>`;
      $('#newl2') && ($('#newl2').onclick = () => newListModal(c));
      el.onclick = async e => {
        const t = e.target.closest('[data-pdfy],[data-share],[data-dup],[data-del]');
        if (!t) return;
        const lid = t.dataset.pdfy || t.dataset.share || t.dataset.dup || t.dataset.del;
        const l = c.lists.find(x => x.id == lid);
        if (t.dataset.pdfy) openPdf(lid);
        if (t.dataset.share) sharePdf(lid, pdfName(c.ad_soyad, l.tarih));
        if (t.dataset.dup) newListModal(c, lid);
        if (t.dataset.del && await confirmBox('Bu diyet listesi silinecek.')) { await api('/lists/' + lid, { method: 'DELETE' }); toast('Liste silindi'); viewClient(main, id, 'listeler'); }
      };
    } else if (k === 'odeme') {
      renderClientFinance(el, c, () => viewClient(main, id, 'odeme'));
    } else if (k === 'bilgiler') {
      const kim = [['Telefon', c.telefon], ['TC kimlik no', c.tc_kimlik], ['Doğum tarihi', c.dogum_tarihi && `${fmtDate(c.dogum_tarihi)} (${age(c.dogum_tarihi)} yaş)`],
        ['Cinsiyet', c.cinsiyet], ['Meslek', c.meslek], ['Şehir', c.sehir], ['İlçe', c.ilce], ['Adres (eski)', c.adres]];
      const olcu = [['Kilo (ilk)', c.baslangic_kilo && fmtNum(c.baslangic_kilo) + ' kg'], ['Boy', c.boy_cm && c.boy_cm + ' cm'], ['Hedeflenen kilo', c.hedef_kilo && fmtNum(c.hedef_kilo) + ' kg'],
        ['Hedef', c.hedef], ['Görüşme tipi', c.gorusme_tipi], ['Paket', c.paket], ['Kayıt tarihi', fmtDate(c.created_at)]];
      const dl2 = r => r.filter(([, v]) => v).map(([k2, v]) => `<dt>${k2}</dt><dd>${esc(v)}</dd>`).join('');
      el.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="muted small">Diyetisyen Hasta Takip Kartı</div>
          <a class="btn sm soft" href="#/danisan/${id}/duzenle">${ic('edit')}Kartı düzenle</a></div>
        <div class="grid g2" style="margin-bottom:16px">
          <div class="card"><div class="card-head"><h2>Kimlik ve iletişim</h2></div><div class="card-pad"><dl class="info-list">${dl2(kim)}</dl></div></div>
          <div class="card"><div class="card-head"><h2>Ölçü, hedef ve paket</h2></div><div class="card-pad"><dl class="info-list">${dl2(olcu)}</dl></div></div>
        </div>
        ${renderAnamnezView(c)}`;
    }
  }
  renderTab(tab);
}

function weightChart(visits, hedef) {
  const pts = visits.filter(v => v.kilo != null);
  if (pts.length < 2) return `<div class="empty">Grafik için en az 2 ölçüm gerekli.</div>`;
  const W = 560, H = 230, L = 40, R = 14, T = 14, B = 28;
  const ys = pts.map(p => p.kilo).concat(hedef ? [hedef] : []);
  let min = Math.floor(Math.min(...ys) - 1), max = Math.ceil(Math.max(...ys) + 1);
  const t0 = new Date(pts[0].tarih).getTime(), t1 = new Date(pts[pts.length - 1].tarih).getTime() || t0 + 1;
  const x = t => L + ((new Date(t).getTime() - t0) / Math.max(t1 - t0, 1)) * (W - L - R);
  const y = v => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const step = Math.max(1, Math.ceil((max - min) / 4));
  let grid = '';
  for (let v = min; v <= max; v += step) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#E7F1DC"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.tarih).toFixed(1)},${y(p.kilo).toFixed(1)}`).join(' ');
  const area = `${path} L${x(pts[pts.length - 1].tarih).toFixed(1)},${H - B} L${x(pts[0].tarih).toFixed(1)},${H - B} Z`;
  const lbls = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]].filter((p, i, a) => a.indexOf(p) === i)
    .map((p, i, a) => `<text x="${x(p.tarih)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle'}">${fmtDate(p.tarih).replace(/ \d{4}$/, '')}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Kilo grafiği">
    <defs><linearGradient id="gA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4F7F2A" stop-opacity=".18"/><stop offset="1" stop-color="#4F7F2A" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    ${hedef ? `<line x1="${L}" x2="${W - R}" y1="${y(hedef)}" y2="${y(hedef)}" stroke="#B08A5B" stroke-dasharray="5 5" stroke-width="1.5"/><text x="${W - R}" y="${y(hedef) - 6}" text-anchor="end" style="fill:#8C6A3F">Hedef ${fmtNum(hedef)}</text>` : ''}
    <path d="${area}" fill="url(#gA)"/>
    <path d="${path}" fill="none" stroke="#4F7F2A" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    ${pts.map(p => `<circle cx="${x(p.tarih)}" cy="${y(p.kilo)}" r="3.5" fill="#fff" stroke="#4F7F2A" stroke-width="2" vector-effect="non-scaling-stroke"><title>${fmtDate(p.tarih)}: ${fmtNum(p.kilo)} kg</title></circle>`).join('')}
    ${lbls}</svg>`;
}

function visitModal(c, v) {
  const hasNext = [...(c.appointments || [])].reverse().find(a => a.durum === 'planli' && a.tarih > todayIso());
  const lastSaat = (c.appointments || [])[0]?.saat || '10:00';
  const val = k => esc(v?.[k] ?? '');
  const n = (k, l) => `<label class="f">${l}<input class="i" name="${k}" type="number" step="0.1" inputmode="decimal" value="${val(k)}"></label>`;
  const m = modal({
    title: v ? 'Kontrolü düzenle' : 'Yeni kontrol',
    body: `<form id="vf"><div class="fg" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">
      <label class="f span2">Tarih<input class="i" name="tarih" type="date" value="${v ? val('tarih') : todayIso()}" required></label>
      ${n('kilo', 'Kilo (kg)')}${n('bel', 'Bel (cm)')}${n('kalca', 'Kalça (cm)')}${n('gogus', 'Göğüs (cm)')}${n('kol', 'Kol (cm)')}${n('bacak', 'Bacak (cm)')}
      ${n('yag_orani', 'Yağ oranı (%)')}${n('kas_kutlesi', 'Kas kütlesi (kg)')}${n('su_orani', 'Su oranı (%)')}
      <label class="f full">Görüşme notu<textarea class="i" name="notlar" rows="3" placeholder="Nasıl geçti, zorlandığı noktalar, değişiklikler…">${val('notlar')}</textarea></label>
      ${v || hasNext ? (hasNext && !v ? `<div class="full muted small">Sonraki randevu: <b>${fmtDate(hasNext.tarih)} ${hasNext.saat}</b></div>` : '') : `<div class="full"><label class="check" style="margin-bottom:8px"><input type="checkbox" id="v-rnd" checked> Sonraki kontrol randevusunu da oluştur</label>
        <div class="row" id="v-rnd-f"><input class="i" name="r_tarih" type="date" style="flex:1;min-width:140px" value="${addDays(todayIso(), 14)}"><input class="i" name="r_saat" type="time" step="300" style="width:120px" value="${esc(lastSaat)}">
        ${[7, 14, 21, 30].map(d => `<button type="button" class="btn sm" data-add="${d}">+${d} gün</button>`).join('')}</div></div>`}
    </div></form>`,
    foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="vs">${ic('save')}Kaydet</button>`,
  });
  $$('[data-add]', m.el).forEach(bt => (bt.onclick = () => ($('[name=r_tarih]', m.el).value = addDays(todayIso(), Number(bt.dataset.add)))));
  $('#v-rnd', m.el) && ($('#v-rnd', m.el).onchange = e => $('#v-rnd-f', m.el).classList.toggle('hidden', !e.target.checked));
  $('#vs', m.el).onclick = async () => {
    const f = $('#vf', m.el);
    if (!f.reportValidity()) return;
    const body = Object.fromEntries(new FormData(f));
    try {
      const { r_tarih, r_saat } = body; delete body.r_tarih; delete body.r_saat;
      if (v) await api('/visits/' + v.id, { method: 'PUT', body });
      else {
        await api(`/clients/${c.id}/visits`, { method: 'POST', body });
        if ($('#v-rnd', m.el)?.checked && r_tarih && r_saat) {
          await api('/appointments', { method: 'POST', body: { client_id: c.id, tarih: r_tarih, saat: r_saat, sure_dk: 30, tur: 'Kontrol', kanal: c.gorusme_tipi === 'Yüz yüze' ? 'Yüz yüze' : 'Online' } });
        }
      }
      m.close(); toast('Kontrol kaydedildi');
      location.hash === `#/danisan/${c.id}/kontroller` ? route() : (location.hash = `#/danisan/${c.id}/kontroller`);
    } catch (e) { onErr(e); }
  };
}

async function newListModal(c, fromListId) {
  const templates = await api('/templates');
  const last = c.lists[0];
  const opts = [];
  if (fromListId) {
    const l = c.lists.find(x => x.id == fromListId);
    opts.push({ k: 'liste', id: fromListId, t: 'Seçilen listeyi kopyala', s: `${l.baslik || 'Diyet listesi'} · ${fmtDate(l.tarih)}` });
  } else if (last) opts.push({ k: 'liste', id: last.id, t: 'Son listesinden devam et', s: `${last.baslik || 'Diyet listesi'} · ${fmtDate(last.tarih)} — kopyalanır, üzerinde değişiklik yaparsınız` });
  templates.forEach(t => opts.push({ k: 'sablon', id: t.id, t: t.ad, s: t.aciklama || 'Şablon' }));
  opts.push({ k: 'bos', id: 0, t: 'Boş liste', s: 'Standart öğün saatleriyle boş başlar' });
  const m = modal({
    title: 'Yeni diyet listesi', size: 'lg',
    body: `<div class="fg" style="margin-bottom:16px">
        <label class="f">Tarih<input class="i" id="nl-t" type="date" value="${todayIso()}"></label>
        <label class="f">Kilo (kg)<input class="i" id="nl-k" type="number" step="0.1" inputmode="decimal" value="${esc(c.son_kilo ?? '')}"></label>
        <label class="f span2">Liste adı (isteğe bağlı)<input class="i" id="nl-b" placeholder="Örn. 2. hafta, Ramazan listesi…"></label></div>
      <div class="muted small" style="margin-bottom:8px;font-weight:600">Nereden başlansın?</div>
      <div class="pick" id="nl-p">${opts.map((o, i) => `<button type="button" class="pick-item ${i === 0 ? 'on' : ''}" data-i="${i}"><div class="t">${esc(o.t)}</div><div class="small muted">${esc(o.s)}</div></button>`).join('')}</div>`,
    foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="nl-ok">Oluştur ve düzenle</button>`,
  });
  let sel = 0;
  $('#nl-p', m.el).onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; sel = Number(b.dataset.i); $$('.pick-item', m.el).forEach(x => x.classList.toggle('on', x === b)); };
  $('#nl-p', m.el).ondblclick = () => $('#nl-ok', m.el).click();
  $('#nl-ok', m.el).onclick = async () => {
    const o = opts[sel];
    try {
      const r = await api(`/clients/${c.id}/lists`, { method: 'POST', body: { kaynak: o.k, sablonId: o.id, listeId: o.id, tarih: $('#nl-t', m.el).value, kilo: $('#nl-k', m.el).value, baslik: $('#nl-b', m.el).value } });
      m.close(); location.hash = '#/liste/' + r.id;
    } catch (e) { onErr(e); }
  };
}

// ============ PDF / paylaş ============
const pdfName = (ad, tarih) => `Beslenme Programı - ${ad} - ${tarih}.pdf`;
const pdfUrl = id => `/api/lists/${id}/pdf?t=${Date.now()}`;
function openPdf(id) {
  if (YEREL) return yerelPdfAc(id).catch(onErr);
  window.open(pdfUrl(id), '_blank');
}
// Yerel: PDF cihazda hazırlanır (birkaç saniye), sonra açılır / paylaşılır / indirilir
async function yerelPdfAc(id) {
  toast('PDF hazırlanıyor…');
  const r = await fetch(pdfUrl(id));
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'PDF oluşturulamadı');
  const l = await api('/lists/' + id);
  const ad = pdfName(l.client?.ad_soyad || 'Danışan', l.tarih);
  const file = new File([await r.blob()], ad, { type: 'application/pdf' });
  const url = URL.createObjectURL(file);
  const paylas = navigator.canShare && navigator.canShare({ files: [file] });
  const m = modal({ title: 'PDF hazır', body: `<p style="margin:0">${esc(ad)}</p>`,
    foot: `<a class="btn" href="${url}" download="${esc(ad)}">İndir</a>${paylas ? `<button class="btn" id="pp-sh">${ic('share')}Paylaş</button>` : ''}<a class="btn primary" href="${url}" target="_blank" rel="noopener">${ic('eye')}Aç</a>` });
  if (paylas) $('#pp-sh', m.el).onclick = async () => { try { await navigator.share({ files: [file], title: ad }); } catch { /* vazgeçildi */ } };
}
async function sharePdf(id, name) {
  toast('PDF hazırlanıyor…');
  let file;
  try {
    const r = await fetch(pdfUrl(id));
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'PDF oluşturulamadı');
    file = new File([await r.blob()], name, { type: 'application/pdf' });
  } catch (e) { return onErr(e); }
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const doShare = async () => {
    try { await navigator.share({ files: [file], title: name }); }
    catch (e) { if (e.name === 'NotAllowedError') return false; if (e.name !== 'AbortError') download(); }
    return true;
  };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    if (await doShare() === false) {
      // Safari, dosya indirildikten sonra ikinci bir dokunuş ister
      const m = modal({ title: 'PDF hazır', body: `<p style="margin:0">${esc(name)}</p>`, foot: `<button class="btn" id="dl">İndir</button><button class="btn primary" id="sh">${ic('share')}Paylaş</button>` });
      $('#sh', m.el).onclick = async () => { m.close(); await doShare(); };
      $('#dl', m.el).onclick = () => { m.close(); download(); };
    }
  } else download();
}

// ============ LİSTE / ŞABLON EDİTÖRÜ ============
const ETIKETLER = ['KALKINCA', 'SABAH', 'KAHVALTI', 'ARA', 'ÖĞLE', 'AKŞAM', 'GECE', 'SAHUR', 'İFTAR'];
async function viewEditor(main, mode, id) {
  const isList = mode === 'liste';
  const obj = isList ? await api('/lists/' + id) : await api('/templates/' + id);
  const blocks = await api('/blocks');
  const ed = { mode, id, obj, data: obj.data, dirty: false, saving: null, preview: isList && window.innerWidth >= 1300 };
  ed.data.sections ||= []; ed.data.notes ||= []; ed.data.recipes ||= [];
  main.classList.add('wide');

  const save = async () => {
    if (!ed.dirty) return;
    ed.dirty = false; setState('Kaydediliyor…');
    const body = isList
      ? { baslik: $('#e-baslik').value, tarih: $('#e-tarih').value, kilo: $('#e-kilo').value, data: ed.data }
      : { ad: $('#e-ad').value || obj.ad, aciklama: $('#e-acik').value, data: ed.data };
    ed.saving = api(`/${isList ? 'lists' : 'templates'}/${id}`, { method: 'PUT', body });
    try { await ed.saving; setState('Kaydedildi ✓'); if (ed.preview) refreshPreview(); }
    catch (e) { ed.dirty = true; setState('Kaydedilemedi!', true); onErr(e); }
    finally { ed.saving = null; }
  };
  const autosave = debounce(save, 1200);
  const change = () => { ed.dirty = true; setState('Değişiklikler kaydedilecek…', true); autosave(); };
  ed.flush = async () => { autosave.cancel(); if (ed.saving) await ed.saving.catch(() => {}); await save(); };
  S.editor = ed;
  const setState = (t, dirty) => { const s = $('#e-state'); if (s) { s.textContent = t; s.classList.toggle('dirty', !!dirty); } };
  const refreshPreview = async () => {
    const f = $('#e-prev'); if (!f) return;
    const u = `/api/lists/${id}/html?t=${Date.now()}`;
    if (!YEREL) { f.src = u; return; }
    // Yerel: önizleme cihazda üretilir, çerçeveye doğrudan yazılır (kaydırma yeri korunur)
    const y = f.contentWindow?.scrollY || 0;
    try { f.srcdoc = await (await fetch(u)).text(); f.onload = () => f.contentWindow.scrollTo(0, y); } catch (e) { onErr(e); }
  };

  const brand = S.brand;
  main.innerHTML = `<div id="ed-root">
  <div class="ed-bar">
    <a class="btn icon sm ghost" href="${isList ? `#/danisan/${obj.client_id}/listeler` : '#/sablonlar'}" aria-label="Geri">${ic('back')}</a>
    <div class="grow"><div class="ttl">${isList ? esc(obj.client.ad_soyad) : 'Şablon düzenleme'}</div><div class="save-state" id="e-state">Otomatik kaydedilir</div></div>
    ${isList ? `
      <button class="btn sm" id="e-tpl" title="Şablon olarak kaydet">${ic('save')}<span>Şablon yap</span></button>
      <button class="btn sm" id="e-pv">${ic('eye')}<span>Önizleme</span></button>
      <button class="btn sm" id="e-share">${ic('share')}<span>Paylaş</span></button>
      <button class="btn sm primary" id="e-pdfy">${ic('pdf')}<span>PDF</span></button>` : `<button class="btn sm danger" id="e-delt">${ic('trash')}<span>Şablonu sil</span></button>`}
  </div>
  <div class="ed-wrap ${ed.preview ? 'with-preview' : ''}" id="e-wrap">
    <div>
      <div class="card fs" style="margin-bottom:18px"><div class="fg">
        ${isList ? `
          <label class="f">Tarih<input class="i" id="e-tarih" type="date" value="${esc(obj.tarih)}"></label>
          <label class="f">Kilo (kg)<input class="i" id="e-kilo" type="number" step="0.1" inputmode="decimal" value="${esc(obj.kilo ?? '')}"></label>
          <label class="f span2">Liste adı (PDF'te görünmez)<input class="i" id="e-baslik" value="${esc(obj.baslik ?? '')}" placeholder="Örn. 3. hafta"></label>` : `
          <label class="f span2">Şablon adı<input class="i" id="e-ad" value="${esc(obj.ad)}"></label>
          <label class="f span2">Açıklama<input class="i" id="e-acik" value="${esc(obj.aciklama ?? '')}"></label>`}
      </div></div>
      <div id="e-secs"></div>
      <div class="row" style="margin-bottom:22px"><button class="btn soft" id="e-addsec">${ic('plus')}Yeni program bölümü</button><span class="muted small">Örn. hafta içi / hafta sonu / şehir dışı</span></div>

      <div class="card" style="margin-bottom:18px">
        <div class="fs"><h3>Kapanış</h3><div class="fg">
          <label class="f">Motivasyon sözü<input class="i" data-foot="motto" value="${esc(ed.data.motto ?? '')}" placeholder="${esc(brand.motto || '')}"></label>
          <label class="f">İmza<input class="i" data-foot="imza" value="${esc(ed.data.imza ?? '')}" placeholder="${esc(brand.imza || '')}"></label>
        </div><div class="muted small" style="margin-top:6px">Boş bırakırsanız Ayarlar'daki varsayılan kullanılır.</div></div>
        <div class="fs"><h3>Önemli notlar</h3><div id="e-notes"></div>
          <div class="row"><button class="btn sm" id="e-addnote">${ic('plus')}Not ekle</button><button class="btn sm" id="e-libnote">${ic('book')}Kütüphaneden</button></div></div>
        <div class="fs"><h3>Tarifler</h3><div id="e-recs"></div>
          <div class="row"><button class="btn sm" id="e-addrec">${ic('plus')}Tarif ekle</button><button class="btn sm" id="e-librec">${ic('book')}Kütüphaneden</button></div></div>
        <div class="fs"><h3>Ek açıklama</h3><textarea class="i" data-foot="ekNot" rows="3" placeholder="Listenin sonuna eklenecek serbest metin (isteğe bağlı)">${esc(ed.data.ekNot || '')}</textarea></div>
      </div>
    </div>
    <div class="preview">${isList ? `      <iframe id="e-prev" title="PDF önizleme" ${YEREL ? '' : `src="${ed.preview ? `/api/lists/${id}/html` : 'about:blank'}"`}></iframe>` : ''}</div>
  </div>
  <datalist id="etiketler">${ETIKETLER.map(e => `<option>${e}</option>`).join('')}</datalist></div>`;
  const root = $('#ed-root');
  if (YEREL && ed.preview) refreshPreview();

  const autosize = t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; };

  function renderSecs() {
    $('#e-secs').innerHTML = ed.data.sections.map((s, si) => `
      <div class="card sec">
        <div class="sec-head">
          <input data-s="${si}" data-f="title" value="${esc(s.title)}" placeholder="BÖLÜM BAŞLIĞI (örn. SAĞLIKLI BESLENME PROGRAMI)">
          <button class="tbtn" data-act="sup" data-s="${si}" title="Yukarı" ${si === 0 ? 'disabled' : ''}>${ic('up')}</button>
          <button class="tbtn" data-act="sdown" data-s="${si}" title="Aşağı" ${si === ed.data.sections.length - 1 ? 'disabled' : ''}>${ic('down')}</button>
          <button class="tbtn" data-act="sdup" data-s="${si}" title="Bölümü kopyala">${ic('copy')}</button>
          <button class="tbtn del" data-act="sdel" data-s="${si}" title="Bölümü sil">${ic('trash')}</button>
        </div>
        ${s.rows.map((r, ri) => `
          <div class="meal">
            <div class="lbl">
              <input data-s="${si}" data-r="${ri}" data-f="label" value="${esc(r.label)}" list="etiketler" placeholder="ÖĞÜN" autocapitalize="characters">
              <input data-s="${si}" data-r="${ri}" data-f="time" value="${esc(r.time)}" placeholder="Saat" inputmode="decimal">
              <div class="tools">
                <button class="tbtn" data-act="rup" data-s="${si}" data-r="${ri}" title="Yukarı">${ic('up')}</button>
                <button class="tbtn" data-act="rdown" data-s="${si}" data-r="${ri}" title="Aşağı">${ic('down')}</button>
                <button class="tbtn" data-act="rdup" data-s="${si}" data-r="${ri}" title="Satırı kopyala">${ic('copy')}</button>
                <button class="tbtn del" data-act="rdel" data-s="${si}" data-r="${ri}" title="Satırı sil">${ic('trash')}</button>
              </div>
            </div>
            <div class="body">
              <textarea data-s="${si}" data-r="${ri}" data-f="content" rows="3" placeholder="Öğün içeriği… (her seçenek yeni satırda)">${esc(r.content)}</textarea>
              ${(r.links || []).length ? `<div class="lchips">${r.links.map((l, li) => `<span class="lchip">${ic('link')}<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title || l.url)}</a><button class="tbtn del" data-act="ldel" data-s="${si}" data-r="${ri}" data-l="${li}" title="Linki kaldır">${ic('x')}</button></span>`).join('')}</div>` : ''}
              <div class="row"><button class="btn sm ghost" data-act="link" data-s="${si}" data-r="${ri}">${ic('link')}Tarif linki</button><button class="btn sm ghost" data-act="lib" data-s="${si}" data-r="${ri}">${ic('book')}Hazır metin ekle</button></div>
            </div>
          </div>`).join('')}
        <div class="sec-foot"><button class="btn sm" data-act="radd" data-s="${si}">${ic('plus')}Öğün ekle</button></div>
      </div>`).join('') || '<div class="card empty" style="margin-bottom:18px">Henüz bölüm yok.</div>';
    requestAnimationFrame(() => $$('#e-secs textarea').forEach(autosize));
  }
  function renderNotes() {
    $('#e-notes').innerHTML = ed.data.notes.map((n, i) => `<div class="note-row"><input class="i" data-note="${i}" value="${esc(n)}"><button class="tbtn del" data-ndel="${i}" title="Sil">${ic('trash')}</button></div>`).join('')
      || '<div class="muted small" style="margin-bottom:10px">Not yok.</div>';
  }
  function renderRecs() {
    $('#e-recs').innerHTML = ed.data.recipes.map((r, i) => `<div style="margin-bottom:12px"><div class="note-row"><input class="i" data-rec="${i}" data-rf="title" value="${esc(r.title)}" placeholder="Tarif adı" style="font-weight:600"><button class="tbtn del" data-rdel="${i}" title="Sil">${ic('trash')}</button></div>
      <div class="note-row" style="margin-top:8px">${ic('link', 'width="18" height="18" style="color:var(--silik);flex:none"')}<input class="i" data-rec="${i}" data-rf="url" value="${esc(r.url || '')}" placeholder="Tarif linki (Instagram, YouTube, blog…) — PDF'te tıklanabilir + QR" inputmode="url"></div>
      <textarea class="i" data-rec="${i}" data-rf="body" rows="4" placeholder="Malzemeler / yapılışı (isteğe bağlı)" style="margin-top:8px">${esc(r.body)}</textarea></div>`).join('') || '<div class="muted small" style="margin-bottom:10px">Tarif yok.</div>';
  }
  renderSecs(); renderNotes(); renderRecs();

  // --- giriş olayları (yeniden çizim yapmadan) ---
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.f) {
      const s = ed.data.sections[t.dataset.s];
      if (t.dataset.r !== undefined) s.rows[t.dataset.r][t.dataset.f] = t.value; else s[t.dataset.f] = t.value;
      if (t.tagName === 'TEXTAREA') autosize(t);
    } else if (t.dataset.note !== undefined) ed.data.notes[t.dataset.note] = t.value;
    else if (t.dataset.rec !== undefined) ed.data.recipes[t.dataset.rec][t.dataset.rf] = t.value;
    else if (t.dataset.foot) { if (t.value.trim()) ed.data[t.dataset.foot] = t.value; else delete ed.data[t.dataset.foot]; }
    else if (!['e-tarih', 'e-kilo', 'e-baslik', 'e-ad', 'e-acik'].includes(t.id)) return;
    change();
  });

  // --- düğmeler ---
  root.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    const secs = ed.data.sections, si = Number(b.dataset.s), ri = Number(b.dataset.r);
    const mv = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
    switch (b.dataset.act) {
      case 'sup': mv(secs, si, -1); break;
      case 'sdown': mv(secs, si, 1); break;
      case 'sdup': secs.splice(si + 1, 0, structuredClone(secs[si])); break;
      case 'sdel': if (!(await confirmBox(`"${esc(secs[si].title || 'Bölüm')}" bölümü ve içindeki tüm öğünler silinecek.`))) return; secs.splice(si, 1); break;
      case 'rup': mv(secs[si].rows, ri, -1); break;
      case 'rdown': mv(secs[si].rows, ri, 1); break;
      case 'rdup': secs[si].rows.splice(ri + 1, 0, { ...secs[si].rows[ri] }); break;
      case 'rdel': if (secs[si].rows[ri].content.trim() && !(await confirmBox('Bu öğün satırı silinecek.'))) return; secs[si].rows.splice(ri, 1); break;
      case 'radd': secs[si].rows.push({ label: 'ARA', time: '', content: '', links: [] }); break;
      case 'ldel': secs[si].rows[ri].links.splice(Number(b.dataset.l), 1); break;
      case 'link': return linkModal(blocks, l => { (secs[si].rows[ri].links ||= []).push(l); renderSecs(); change(); });
      case 'lib': return pickBlock(blocks, 'ogun', secs[si].rows[ri].label, txt => {
        const r = secs[si].rows[ri];
        r.content = r.content.trim() ? r.content.replace(/\s+$/, '') + '\n\n' + txt : txt;
        renderSecs(); change();
      });
      default: return;
    }
    renderSecs(); change();
  });

  $('#e-addsec').onclick = () => { ed.data.sections.push({ title: 'SAĞLIKLI BESLENME PROGRAMI', rows: [{ label: 'SABAH', time: '', content: '' }] }); renderSecs(); change(); };
  $('#e-addnote').onclick = () => { ed.data.notes.push(''); renderNotes(); change(); $$('#e-notes input').pop()?.focus(); };
  $('#e-libnote').onclick = () => pickBlock(blocks, 'not', null, txt => { ed.data.notes.push(txt); renderNotes(); change(); });
  $('#e-addrec').onclick = () => { ed.data.recipes.push({ title: '', body: '', url: '' }); renderRecs(); change(); };
  $('#e-librec').onclick = () => pickBlock(blocks, 'tarif', null, (txt, bl) => { ed.data.recipes.push({ title: bl.baslik, body: txt, url: bl.url || '' }); renderRecs(); change(); });
  $('#e-notes').onclick = e => { const d = e.target.closest('[data-ndel]'); if (d) { ed.data.notes.splice(d.dataset.ndel, 1); renderNotes(); change(); } };
  $('#e-recs').onclick = e => { const d = e.target.closest('[data-rdel]'); if (d) { ed.data.recipes.splice(d.dataset.rdel, 1); renderRecs(); change(); } };

  if (isList) {
    const fname = () => pdfName(obj.client.ad_soyad, $('#e-tarih').value);
    $('#e-pdfy').onclick = async () => {
      const w = window.open('about:blank', '_blank');   // iOS açılır pencere engeline takılmamak için hemen aç
      await ed.flush();
      const url = pdfUrl(id);
      if (w) w.location.href = url; else location.href = url;
    };
    $('#e-share').onclick = async () => { await ed.flush(); sharePdf(id, fname()); };
    $('#e-pv').onclick = async () => {
      ed.preview = !ed.preview;
      $('#e-wrap').classList.toggle('with-preview', ed.preview);
      if (ed.preview) { await ed.flush(); refreshPreview(); if (window.innerWidth < 1100) $('#e-prev').scrollIntoView({ behavior: 'smooth' }); }
    };
    $('#e-tpl').onclick = () => {
      const m = modal({ title: 'Şablon olarak kaydet', body: `<label class="f">Şablon adı<input class="i" id="tp-ad" value="${esc(obj.baslik || '')}" placeholder="Örn. İnsülin direnci – başlangıç"></label>
        <p class="muted small">Bu listenin öğünleri, notları ve tarifleri şablon olarak saklanır; başka danışanlara tek dokunuşla uygulayabilirsiniz.</p>`,
        foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="tp-ok">Kaydet</button>` });
      $('#tp-ok', m.el).onclick = async () => {
        try { await ed.flush(); await api(`/lists/${id}/sablon`, { method: 'POST', body: { ad: $('#tp-ad', m.el).value } }); m.close(); toast('Şablon kaydedildi'); } catch (e2) { onErr(e2); }
      };
    };
  } else {
    $('#e-delt').onclick = async () => {
      if (!(await confirmBox('Bu şablon silinecek. Daha önce bu şablondan oluşturulan listeler etkilenmez.'))) return;
      autosave.cancel(); ed.dirty = false;
      await api('/templates/' + id, { method: 'DELETE' }); S.editor = null; toast('Şablon silindi'); location.hash = '#/sablonlar';
    };
  }
}

window.addEventListener('beforeunload', e => { if (S.editor?.dirty) { S.editor.flush(); e.preventDefault(); } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && S.editor?.dirty) S.editor.flush(); });

function pickBlock(blocks, tur, kategori, onPick) {
  const list = blocks.filter(b => b.tur === tur);
  const kat = (kategori || '').toLocaleUpperCase('tr');
  const sira = tur === 'tarif' ? TARIF_KAT : tur === 'not' ? NOT_KAT : ETIKETLER;
  const varOlan = new Set(list.flatMap(katlar));
  const cats = sira.filter(k => varOlan.has(k)).concat([...varOlan].filter(k => !sira.includes(k) && !mevsimMi(k)));
  let filt = tur === 'ogun' && cats.includes(kat) ? kat : '', mev = '';
  const m = modal({
    title: tur === 'ogun' ? 'Hazır öğün metni' : tur === 'tarif' ? 'Tarif ekle' : 'Not ekle', size: 'lg',
    body: `<div class="row" style="margin-bottom:12px"><div class="search grow">${ic('search')}<input class="i" id="pb-q" type="search" placeholder="Ara"></div>
</div>
      ${cats.length ? `<div class="chips-row" id="pb-c"><button data-c="" class="${filt ? '' : 'on'}">Tümü</button>${cats.map(c => `<button data-c="${esc(c)}" class="${filt === c ? 'on' : ''}">${esc(katAd(c))}</button>`).join('')}</div>` : ''}
      ${mevsimChips(list, '', 'pb-m')}
      <div class="pick" id="pb-l"></div>
      <div class="muted small" style="margin-top:12px">Kütüphaneyi <a href="#/kutuphane/${tur}">Kütüphane</a> sayfasından düzenleyebilirsiniz.</div>`,
  });
  const draw = () => {
    const q = $('#pb-q', m.el).value.toLocaleLowerCase('tr');
    const rows = list.filter(b => (!filt || katlar(b).includes(filt)) && mevsimUyar(b, mev) && (!q || (b.baslik + ' ' + b.icerik).toLocaleLowerCase('tr').includes(q)));
    $('#pb-l', m.el).innerHTML = rows.map(b => `<button class="pick-item ${tur === 'tarif' ? 'with-kapak' : ''}" data-id="${b.id}">${tur === 'tarif' ? kapak(b, 'mini') : ''}<div class="grow"><div class="t">${esc(b.baslik)} ${katRozet(b)}</div><pre>${esc(b.icerik)}</pre></div></button>`).join('') || '<div class="empty">Kayıt yok</div>';
  };
  draw();
  $('#pb-q', m.el).oninput = draw;
  tekSecimBagla($('#pb-m', m.el), k => { mev = k; draw(); });
  $('#pb-c', m.el) && ($('#pb-c', m.el).onclick = e => { const b = e.target.closest('button'); if (!b) return; filt = b.dataset.c; $$('#pb-c button', m.el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#pb-l', m.el).onclick = e => { const b = e.target.closest('[data-id]'); if (!b) return; const bl = list.find(x => x.id == b.dataset.id); m.close(); onPick(bl.icerik, bl); };
  $$('a', m.el).forEach(a => a.addEventListener('click', () => m.close()));
}

// Docs'taki listelerden derlenen hazır içerik (eklenmemiş olanlar varsa kart gösterir)
async function paketKarti(main, yenile) {
  let o; try { o = await api('/icerik-paketi'); } catch { return; }
  if (!o.toplam) return;
  const parca = [o.sablon && `${o.sablon} şablon`, o.ogun && `${o.ogun} öğün metni`, o.tarif && `${o.tarif} tarif / bilgi listesi`, o.not && `${o.not} not`].filter(Boolean).join(', ');
  const k = document.createElement('div');
  k.className = 'card card-pad';
  k.style.cssText = 'display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:16px;border:1px dashed var(--ana,#4F7F2A)';
  k.innerHTML = `<div class="grow" style="min-width:220px"><b>Google Docs listelerinizden hazır içerik</b><div class="small muted">Daha önce hazırladığınız diyet listelerinden derlendi: ${esc(parca)}. Aynı başlıkla olanlar eklenmez, eklenenleri sonra düzenleyip silebilirsiniz.</div></div>
    <button class="btn primary" id="pk-ekle">${ic('plus')}Ekle</button>`;
  main.querySelector('.page-head').after(k);
  $('#pk-ekle', k).onclick = async () => {
    try { const r = await api('/icerik-paketi', { method: 'POST' }); toast(`${r.toplam} kayıt eklendi`); yenile(); } catch (e) { onErr(e); }
  };
}

// ============ ŞABLONLAR ============
async function viewTemplates(main) {
  const rows = await api('/templates');
  main.innerHTML = `
  <div class="page-head"><div><h1>Şablonlar</h1><div class="sub">Sık kullandığınız listeleri şablon olarak saklayın; yeni liste hazırlarken tek dokunuşla başlayın.</div></div>
    <button class="btn primary" id="nt">${ic('plus')}Yeni şablon</button></div>
  <div class="card"><div class="list">${rows.length ? rows.map(t => `<a class="item" href="#/sablon/${t.id}">
    <div class="avatar" style="background:var(--seftali-acik);color:#3F6A22">${ic('file', 'width="20" height="20"')}</div>
    <div class="grow"><div class="t">${esc(t.ad)}</div><div class="s">${esc(t.aciklama || '')}${t.aciklama ? ' · ' : ''}Güncelleme ${fmtDate(t.updated_at)}</div></div>${ic('edit', 'width="18" height="18" style="color:var(--silik)"')}</a>`).join('') : '<div class="empty">Şablon yok</div>'}</div></div>
  <p class="muted small" style="margin-top:14px">İpucu: Bir danışana hazırladığınız listeyi, liste ekranındaki <b>Şablon yap</b> düğmesiyle de şablona dönüştürebilirsiniz.</p>`;
  paketKarti(main, () => viewTemplates(main));
  $('#nt').onclick = () => {
    const m = modal({ title: 'Yeni şablon', body: `<label class="f">Şablon adı<input class="i" id="nt-ad" placeholder="Örn. Vejetaryen – 1600 kcal"></label>`, foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="nt-ok">Oluştur</button>` });
    $('#nt-ok', m.el).onclick = async () => { try { const r = await api('/templates', { method: 'POST', body: { ad: $('#nt-ad', m.el).value } }); m.close(); location.hash = '#/sablon/' + r.id; } catch (e) { onErr(e); } };
  };
}

// ============ KÜTÜPHANE ============
async function viewLibrary(main, tur) {
  const all = await api('/blocks');
  const TURLER = [['ogun', 'Öğün metinleri'], ['tarif', 'Tarifler'], ['not', 'Notlar']];
  const rows = all.filter(b => b.tur === tur);
  main.innerHTML = `
  <div class="page-head"><div><h1>Kütüphane</h1><div class="sub">Listelere tek dokunuşla eklenebilen hazır öğün seçenekleri, tarifler ve notlar.</div></div>
    <div class="row"><a class="btn" href="#/sablonlar">${ic('file')}Şablonlar</a><button class="btn primary" id="nb">${ic('plus')}Yeni kayıt</button></div></div>
  <div class="tabs">${TURLER.map(([k, t]) => `<button data-k="${k}" class="${tur === k ? 'on' : ''}" onclick="location.hash='#/kutuphane/${k}'">${t} (${all.filter(b => b.tur === k).length})</button>`).join('')}</div>
  <div id="tg"></div>`;
  const edit = b => {
    const m = modal({
      title: b ? 'Kaydı düzenle' : 'Yeni kayıt',
      body: `<div class="fg"><label class="f">Tür<select class="i" id="b-tur">${TURLER.map(([k, t]) => `<option value="${k}" ${(b?.tur || tur) === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <div class="f full" id="b-kat-o">Öğün (birden fazla seçilebilir)${katSecici('b-kat', ETIKETLER, (b?.tur || tur) !== 'tarif' ? b?.kategori : '', MEVSIM)}</div>
        <div class="f full" id="b-kat-t">Kategori (birden fazla seçilebilir)${katSecici('b-katt', TARIF_KAT, (b?.tur || tur) === 'tarif' ? (b?.kategori ?? TARIF_KAT[0]) : '', MEVSIM)}</div>
        <div class="f full" id="b-kat-n">Not kategorisi (birden fazla seçilebilir)${katSecici('b-katn', NOT_KAT, (b?.tur || tur) === 'not' ? b?.kategori : '')}</div>
        <div class="f full" id="b-mev-o"><span id="b-mev-ad"></span>${katSecici('b-mev', MEVSIM, katlar(b || {}).filter(mevsimMi).join(','))}</div>
        <label class="f full">Başlık<input class="i" id="b-bas" value="${esc(b?.baslik || '')}"></label>
        <label class="f full">Tarif linki (isteğe bağlı)<input class="i" id="b-url" inputmode="url" value="${esc(b?.url || '')}" placeholder="instagram.com/reel/…"></label>
        <label class="f full">İçerik<textarea class="i" id="b-ic" rows="9">${esc(b?.icerik || '')}</textarea></label></div>`,
      foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="b-ok">Kaydet</button>`,
    });
    katSeciciBagla($('#b-kat', m.el)); katSeciciBagla($('#b-katt', m.el)); katSeciciBagla($('#b-mev', m.el), () => $('#b-tur', m.el).value === 'tarif'); katSeciciBagla($('#b-katn', m.el));
    const katToggle = () => { const t = $('#b-tur', m.el).value; $('#b-kat-o', m.el).classList.toggle('hidden', t !== 'ogun'); $('#b-kat-t', m.el).classList.toggle('hidden', t !== 'tarif'); $('#b-mev-o', m.el).classList.toggle('hidden', t === 'not'); $('#b-kat-n', m.el).classList.toggle('hidden', t !== 'not');
      $('#b-mev-ad', m.el).textContent = t === 'tarif' ? 'Mevsim (her tarif yaz ya da kış; seçilmezse içeriğe göre atanır)' : 'Mevsim (isteğe bağlı — ikisi de seçilmezse her mevsim)';
      if (t === 'tarif') { const on = $$('#b-mev button.on', m.el); on.slice(1).forEach(x => x.classList.remove('on')); } };
    $('#b-tur', m.el).onchange = katToggle; katToggle();
    $('#b-ok', m.el).onclick = async () => {
      const t = $('#b-tur', m.el).value;
      const body = { tur: t, kategori: t === 'not' ? katSeciciDeger($('#b-katn', m.el)) || null : [katSeciciDeger($(t === 'tarif' ? '#b-katt' : '#b-kat', m.el)), katSeciciDeger($('#b-mev', m.el))].filter(Boolean).join(',') || null, baslik: $('#b-bas', m.el).value, icerik: $('#b-ic', m.el).value, url: $('#b-url', m.el).value };
      try { await api('/blocks' + (b ? '/' + b.id : ''), { method: b ? 'PUT' : 'POST', body }); m.close(); toast('Kaydedildi'); viewLibrary(main, body.tur); history.replaceState(null, '', '#/kutuphane/' + body.tur); } catch (e) { onErr(e); }
    };
  };
  $('#nb').onclick = () => edit(null);
  const sil = async id => { if (await confirmBox('Bu kayıt kütüphaneden silinecek. Mevcut listeler etkilenmez.')) { await api('/blocks/' + id, { method: 'DELETE' }); toast('Silindi'); viewLibrary(main, tur); } };
  if (tur === 'tarif') {
    renderTarifGrid($('#tg'), rows, { onEdit: edit, onDelete: sil });
    // Önizlemesi hazırlanan kapaklar gelsin diye kısa süre sonra bir kez yenile
    if (rows.some(b => b.url && !b.onizleme)) setTimeout(() => { if (location.hash.startsWith('#/kutuphane/tarif')) viewLibrary(main, tur); }, 8000);
  } else renderMetinGrid($('#tg'), rows, tur, { onEdit: edit, onDelete: sil });
  paketKarti(main, () => viewLibrary(main, tur));
}

// Kütüphane > Öğün metinleri / Notlar: arama + öğün filtresi (tariflerdeki gibi)
function renderMetinGrid(el, list, tur, { onEdit, onDelete }) {
  const st = (renderMetinGrid.st ||= {})[tur] ||= { k: '', q: '', m: '' };
  const filtreli = true;
  const draw = () => {
    const q = st.q.toLocaleLowerCase('tr');
    const rows = list.filter(b => katUyar(b, st.k) && mevsimUyar(b, st.m) && (!q || (b.baslik + ' ' + b.icerik).toLocaleLowerCase('tr').includes(q)));
    $('#mg-l', el).innerHTML = rows.map(b => `<div class="card card-pad" style="display:flex;flex-direction:column;gap:8px">
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><div><b>${esc(b.baslik)}</b> <span class="row" style="gap:4px;display:inline-flex;flex-wrap:wrap">${katRozet(b)}</span></div>
      <div class="row" style="gap:0;flex-wrap:nowrap"><button class="tbtn" data-eb="${b.id}" title="Düzenle">${ic('edit')}</button><button class="tbtn del" data-db="${b.id}" title="Sil">${ic('trash')}</button></div></div>
      <div class="small muted" style="white-space:pre-wrap;max-height:160px;overflow:auto">${esc(b.icerik)}</div></div>`).join('') || '<div class="card empty" style="grid-column:1/-1">Kayıt yok</div>';
  };
  el.innerHTML = `<div class="row" style="margin-bottom:12px"><div class="search grow" style="min-width:200px">${ic('search')}<input class="i" id="mg-q" type="search" placeholder="${tur === 'ogun' ? 'Öğün metni ara (ör. yulaf, kefir, köfte)' : 'Not ara (ör. su, spor, balık)'}" value="${esc(st.q)}"></div></div>
    ${tur === 'ogun' ? katChips(list, st.k, 'mg-c', ETIKETLER) + mevsimChips(list, st.m, 'mg-m') : katChips(list, st.k, 'mg-c', NOT_KAT)}
    <div class="grid g2" id="mg-l"></div>`;
  draw();
  $('#mg-q', el).oninput = e => { st.q = e.target.value; draw(); };
  tekSecimBagla($('#mg-c', el), k => { st.k = k; draw(); });
  tekSecimBagla($('#mg-m', el), k => { st.m = k; draw(); });
  $('#mg-l', el).onclick = e => {
    const ed = e.target.closest('[data-eb]'), dl = e.target.closest('[data-db]');
    if (ed) onEdit(list.find(b => b.id == ed.dataset.eb));
    if (dl) onDelete(dl.dataset.db);
  };
}

// ============ AYARLAR ============
async function viewSettings(main) {
  const s = await api('/settings');
  const b = s.brand;
  const inp = (k, l, ph = '') => `<label class="f">${l}<input class="i" name="${k}" value="${esc(b[k] ?? '')}" placeholder="${esc(ph)}"></label>`;
  main.innerHTML = `
  <div class="page-head"><h1>Ayarlar</h1></div>
  <form id="sf" class="card" style="margin-bottom:16px">
    <div class="fs"><h3>Kimlik ve PDF görünümü</h3><div class="fg">
      ${inp('unvan', 'Unvan / ad', 'Dyt. Hande Bozdoğan')}
      ${inp('imza', 'PDF imzası', 'DYT. HANDE BOZDOĞAN')}
      <label class="f span2">Varsayılan motivasyon sözü<input class="i" name="motto" value="${esc(b.motto ?? '')}"></label>
      ${inp('instagram', 'Instagram', '@kullaniciadi')}
      ${inp('telefon', 'Telefon')}
      ${inp('email', 'E-posta')}
      ${inp('web', 'Web sitesi')}
      <label class="f">Ana renk<div class="row"><input type="color" class="color-in" name="renkAna" value="${esc(b.renkAna || '#4F7F2A')}"></div></label>
      <label class="f">Öğün hücresi rengi<div class="row"><input type="color" class="color-in" name="renkHucre" value="${esc(b.renkHucre || '#CFE6B5')}"></div></label>
      <label class="f span2">Logo (üst bilgide kullanılır)<div class="row">${b.logo ? `<img class="logo-prev" src="${esc(b.logo)}" alt="">` : ''}<input type="file" id="logo" accept="image/*">${b.logo ? '<button type="button" class="btn sm" id="logo-del">Kaldır</button>' : ''}</div></label>
    </div></div>
    <div class="fs"><h3>Yeni listelere eklenecek varsayılan notlar</h3>
      <textarea class="i" name="defaultNotes" rows="4" placeholder="Her satır bir not">${esc((s.defaultNotes || []).join('\n'))}</textarea></div>
    <div class="modal-f"><button class="btn primary" type="submit">${ic('save')}Kaydet</button></div>
  </form>
  <div class="grid g2">
    ${YEREL ? '' : `<form id="pf" class="card"><div class="fs"><h3>Şifre değiştir</h3><div class="fg" style="grid-template-columns:1fr">
      <label class="f">Mevcut şifre<input class="i" type="password" name="eski" autocomplete="current-password" required></label>
      <label class="f">Yeni şifre<input class="i" type="password" name="yeni" autocomplete="new-password" minlength="6" required></label>
      <div><button class="btn" type="submit">Şifreyi güncelle</button></div></div></div></form>`}
    ${googleFormAyarKarti()}
    <div class="card"><div class="fs"><h3>Paketler ve fiyatlar</h3>
      <p class="muted small" style="margin-top:0">Sattığınız diyet paketlerini, içeriklerini ve ücretlerini tanımlayın. Danışana paket atarken buradan seçilir.</p>
      <a class="btn" href="#/finans/paketler">${ic('wallet')}Paketleri düzenle</a></div></div>
    ${YEREL ? EsitlemeArayuz.takvimKart() : `<div class="card"><div class="fs"><h3>iPhone / Mac takvimine ekle</h3>
      <p class="muted small" style="margin-top:0">Randevular telefonunuzun Takvim uygulamasında da görünsün. Abonelik linkini açın ve "Abone ol" deyin; yeni randevular otomatik gelir. (Uygulama internete açıldığında çalışır.)</p>
      <div class="row"><button class="btn" id="ics">${ic('cal')}Abonelik linki</button><button class="btn ghost sm" id="ics-new">Linki yenile</button></div>
      <div id="ics-out" class="small" style="margin-top:10px;word-break:break-all"></div></div></div>`}
    ${YEREL ? EsitlemeArayuz.kart() : ''}
    <div class="card"><div class="fs"><h3>Yedekleme</h3>
      <p class="muted small" style="margin-top:0">Tüm danışan, ölçüm, liste ve şablon kayıtlarını tek bir dosya olarak indirir. Ayda bir indirip saklamanızı öneririz.</p>
      ${YEREL ? `<div class="row"><button class="btn" id="y-indir">${ic('save')}Yedek indir</button>
        <label class="btn ghost">Yedekten geri yükle<input type="file" id="y-yukle" accept=".db,application/octet-stream,application/x-sqlite3" hidden></label></div>`
    : `<a class="btn" href="/api/yedek" download>${ic('save')}Yedek indir</a>
      <div style="margin-top:22px"><button class="btn danger" id="out">${ic('logout')}Çıkış yap</button></div>`}</div></div>
  </div>`;
  let logo = b.logo || null;
  $('#logo').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    logo = await resizeImage(f, 480); toast('Logo seçildi — Kaydet\'e basın');
  };
  $('#logo-del') && ($('#logo-del').onclick = () => { logo = null; $('.logo-prev')?.remove(); toast('Logo kaldırılacak — Kaydet\'e basın'); });
  $('#sf').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const brand = {};
    ['unvan', 'imza', 'motto', 'instagram', 'telefon', 'email', 'web', 'renkAna', 'renkHucre'].forEach(k => (brand[k] = f.get(k)));
    brand.logo = logo;
    try {
      await api('/settings', { method: 'PUT', body: { brand, defaultNotes: String(f.get('defaultNotes')).split('\n') } });
      S.brand = { ...S.brand, ...brand }; toast('Ayarlar kaydedildi');
    } catch (err) { onErr(err); }
  };
  if (YEREL) {
    EsitlemeArayuz.kartBagla();
    EsitlemeArayuz.takvimBagla();
    $('#y-indir').onclick = async () => {
      try { indirBlob(new Blob([await Yerel.disaAktar()], { type: 'application/x-sqlite3' }), `danisanlarim-yedek-${todayIso()}.db`); } catch (err) { onErr(err); }
    };
    $('#y-yukle').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!(await confirmBox('Bu cihazdaki tüm veriler seçtiğiniz yedekle değiştirilecek.', 'Geri yükle'))) { e.target.value = ''; return; }
      try { await Yerel.icerAktar(f); location.reload(); } catch (err) { onErr(err); }
    };
  } else $('#pf').onsubmit = async e => {
    e.preventDefault();
    try { await api('/auth/sifre', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); toast('Şifre güncellendi'); } catch (err) { onErr(err); }
  };
  if (!YEREL) $('#out').onclick = async () => { await api('/auth/cikis', { method: 'POST' }); renderLogin(false); };
  bindGoogleFormAyar().catch(onErr);
  const showIcs = async yenile => {
    if (yenile && !(await confirmBox('Eski link çalışmaz hale gelir; takvim aboneliğini yeni linkle tekrar kurmanız gerekir.', 'Yenile'))) return;
    const r = await api('/takvim-linki' + (yenile ? '?yenile=1' : ''));
    const url = `${location.host}${r.yol}`;
    $('#ics-out').innerHTML = `<a href="webcal://${esc(url)}">webcal://${esc(url)}</a><div class="muted" style="margin-top:6px">Bu link randevu bilgilerinizi içerir, kimseyle paylaşmayın.</div>`;
  };
  if (!YEREL) {
    $('#ics').onclick = () => showIcs(false).catch(onErr);
    $('#ics-new').onclick = () => showIcs(true).catch(onErr);
  }
}

function resizeImage(file, max) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/png'));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

boot().catch(onErr);
