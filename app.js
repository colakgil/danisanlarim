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
// WhatsApp sohbet adresi (mesaj yazılı): bilgisayarda WhatsApp Web, telefonda uygulama. wa.me yönlendirmesi emojiyi bozduğu için kullanılmaz.
const waLink = (tel, text) => `https://${matchMedia('(pointer: coarse)').matches ? 'api' : 'web'}.whatsapp.com/send?${tel ? `phone=${tel}&` : ''}text=${encodeURIComponent(text)}`;
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
  tutamak: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  tasi: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3.5" y="8" width="17" height="11.5" rx="2.5"/><path d="M16 13.8h1.5"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  sparkle: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
};
const ic = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${I[n]}</svg>`;

// ============ durum ============
// paraAcik: tutarlar görünsün mü (her açılışta ve başka bölüme geçince gizlenir — uygulamayı birine gösterirken kazanç görünmesin)
const S = { brand: {}, route: null, editor: null, paraAcik: false, paraBolum: null, araVurgu: null };

// ---------- tutar gizleme: "––––" görünür, dokununca o tutar açılır; göz düğmesi hepsini açar/kapatır ----------
const PARA_MASKE = '– – – –';
function para(n, dig = 0) {
  const v = tl(n, dig);
  if (S.paraAcik || v === '—') return v;
  return `<span class="para-gizli" role="button" tabindex="0" title="Tutarları görmek için dokunun">${PARA_MASKE}</span>`;
}
const paraGoz = () => `<button class="btn sm ${S.paraAcik ? 'soft' : ''}" data-para-goz title="${S.paraAcik ? 'Tutarları gizle' : 'Tutarları göster'}" aria-label="${S.paraAcik ? 'Tutarları gizle' : 'Tutarları göster'}">${ic(S.paraAcik ? 'eye' : 'eyeOff')}<span>${S.paraAcik ? 'Gizle' : 'Tutarlar'}</span></button>`;
function paraTiklama(e) {
  // Gizli tutarlardan birine dokunmak = göz düğmesi: ekrandaki TÜM tutarlar açılır (Hande: tek tuşla hepsi)
  const g = e.target.closest('.para-gizli');
  const b = g || e.target.closest('[data-para-goz]');
  if (b) {
    e.preventDefault(); e.stopPropagation();
    S.paraAcik = g ? true : !S.paraAcik;
    const y = window.scrollY;
    route(true).then(() => window.scrollTo(0, y));
  }
}
document.addEventListener('click', paraTiklama, true);
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('para-gizli')) paraTiklama(e); }, true);

// ---------- paket: kaç hafta kaldı ----------
function kalanSure(bitis) {
  if (!bitis) return null;
  const d = dayDiff(bitis);
  if (d < 0) return { t: 'Paket bitti', cls: 'kirmizi', d };
  if (d === 0) return { t: 'Bugün bitiyor', cls: 'sari', d };
  const h = Math.floor(d / 7), g = d % 7;
  return { t: `${h ? `${h} hafta${g ? ` ${g} gün` : ''}` : `${g} gün`} kaldı`, cls: d <= 10 ? 'sari' : '', d };
}
const kalanRozet = bitis => { const k = kalanSure(bitis); return k ? `<span class="badge ${k.cls}" title="Paket bitişi: ${fmtDate(bitis)}">${ic('clock', 'width="12" height="12"')} ${k.t}</span>` : ''; };

// ---------- danışan hakkında önemli not (sayfanın en üstünde) ----------
const ONEMLI_HAZIR = ['Emziren anne', 'Hamile', 'Tüp bebek tedavisi', 'İnsülin direnci', 'Diyabet', 'Hashimoto / tiroid', 'PCOS', 'Çölyak', 'Laktoz intoleransı', 'Vejetaryen', 'Gastrit / reflü', 'Sporcu'];
const NEREDEN = ['Instagram', 'Arkadaş / tanıdık tavsiyesi', 'Google araması', 'Doktor/sağlık personeli yönlendirmesi'];
function onemliModal(c, onDone) {
  const m = modal({ title: 'Önemli not', body: `<p class="muted small" style="margin-top:0">${esc(c.ad_soyad)} — danışan sayfasının ve diyet listesi ekranının en üstünde görünür.</p>
      <textarea class="i" id="on-t" rows="4" placeholder="Ör. Emziren anne (4 aylık bebek), insülin direnci, tüp bebek tedavisi sürüyor">${esc(c.onemli || '')}</textarea>
      <div class="muted small" style="margin:12px 0 6px;font-weight:600">Hızlı ekle</div>
      <div class="chips-row sarar" id="on-h">${ONEMLI_HAZIR.map(h => `<button type="button" data-h="${esc(h)}">${ic('plus', 'width="13" height="13"')} ${esc(h)}</button>`).join('')}</div>`,
    foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="on-ok">${ic('save')}Kaydet</button>` });
  const t = $('#on-t', m.el);
  $('#on-h', m.el).onclick = e => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    if (!t.value.toLocaleLowerCase('tr').includes(b.dataset.h.toLocaleLowerCase('tr'))) t.value = t.value.replace(/\s+$/, '') + (t.value.trim() ? '\n' : '') + b.dataset.h;
  };
  $('#on-ok', m.el).onclick = async () => {
    try { await api('/clients/' + c.id, { method: 'PUT', body: { onemli: t.value } }); m.close(); toast('Kaydedildi'); onDone && onDone(); } catch (e) { onErr(e); }
  };
}
const onemliKutu = c => `<div class="onemli ${c.onemli ? '' : 'bos'}" id="onemli" role="button" tabindex="0">
    ${c.onemli ? `${ic('alert')}<div class="grow">${esc(c.onemli)}</div>` : `${ic('plus')}<div class="grow">Önemli not ekle <span class="muted">— ör. emziren anne, tüp bebek tedavisi, insülin direnci</span></div>`}
    ${c.onemli ? `<span class="tbtn" aria-hidden="true">${ic('edit')}</span>` : ''}</div>`;

// Arama: Türkçe harf duyarsız (core/yardim.js'teki katla ile aynı)
const KATLA = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
const katla = s => [...String(s ?? '')].map(ch => { const k = ch.toLocaleLowerCase('tr'); return k.length === ch.length ? (KATLA[k] || k) : ch; }).join('');
// Metindeki aranan kelimeleri <mark> ile işaretler (HTML güvenli)
function vurgula(metin, q) {
  const m = String(metin ?? ''), km = katla(m);
  const kel = katla(q).split(/\s+/).filter(k => k.length >= 2);
  const isaret = new Array(m.length).fill(false);
  for (const k of kel) for (let i = km.indexOf(k); i >= 0; i = km.indexOf(k, i + 1)) for (let j = i; j < i + k.length; j++) isaret[j] = true;
  let out = '', ac = false;
  for (let i = 0; i < m.length; i++) {
    if (isaret[i] !== ac) { out += isaret[i] ? '<mark>' : '</mark>'; ac = isaret[i]; }
    out += esc(m[i]);
  }
  return out + (ac ? '</mark>' : '');
}

// ============ kullanıcı adı + şifre (yerel uygulama) ============
// Tek kullanıcı. Şifre ve kurtarma kodu cihazda PBKDF2 ile özetlenir, yalnızca özet saklanır (settings.giris, Drive ile eşitlenir).
// Bir cihazda giriş yapılınca o cihaz 30 gün hatırlanır (localStorage); şifre değişince hatırlama geçersiz olur.
// Not: veri şifrelenmez (kullanıcı kararı) — bu ekran uygulamanın başkası tarafından açılmasını engeller.
const GIRIS_GUN = 30, GIRIS_TUR = 210000, HATIRLA = 'hd-giris';
const b64 = u8 => btoa(String.fromCharCode(...u8));
const rastgele = n => crypto.getRandomValues(new Uint8Array(n));
async function ozetle(metin, tuz, tur = GIRIS_TUR) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(metin), 'PBKDF2', false, ['deriveBits']);
  const bit = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(atob(tuz), c => c.charCodeAt(0)), iterations: tur }, k, 256);
  return b64(new Uint8Array(bit));
}
const kAdiAyni = (a, b) => String(a || '').trim().toLocaleLowerCase('tr') === String(b || '').trim().toLocaleLowerCase('tr');
const KOD_HARF = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // karışan harfler (0/O, 1/I/L) yok
const kurtarmaKoduUret = () => [...rastgele(12)].map(x => KOD_HARF[x % KOD_HARF.length]).join('').match(/.{4}/g).join('-');
const kodTemiz = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const sifreDogru = async (g, sifre) => (await ozetle(sifre, g.tuz, g.tur)) === g.ozet;
const kodDogru = async (g, kod) => (await ozetle(kodTemiz(kod), g.kTuz, g.tur)) === g.kOzet;
async function girisKaydet(kullanici, sifre, kod) {
  const tuz = b64(rastgele(16)), kTuz = b64(rastgele(16));
  const g = { kullanici: kullanici.trim(), tuz, ozet: await ozetle(sifre, tuz), kTuz, kOzet: await ozetle(kodTemiz(kod), kTuz), tur: GIRIS_TUR };
  await api('/giris', { method: 'PUT', body: g });
  cihazHatirla(g);
  return g;
}
const cihazHatirla = g => localStorage.setItem(HATIRLA, JSON.stringify({ bitis: Date.now() + GIRIS_GUN * 864e5, imza: g.ozet.slice(0, 16) }));
function cihazHatirliMi(g) {
  try { const h = JSON.parse(localStorage.getItem(HATIRLA) || 'null'); return !!h && h.bitis > Date.now() && h.imza === g.ozet.slice(0, 16); } catch { return false; }
}
const cikisYap = () => { localStorage.removeItem(HATIRLA); location.replace(location.pathname); };
// Otomatik testler (puppeteer, yalnızca localhost) giriş ekranına takılmasın; ?giris eklenirse giriş yine sorulur
const testGirissiz = () => navigator.webdriver && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]giris/.test(location.search);
const sifreKural = (s, s2) => s.length < 6 ? 'Şifre en az 6 karakter olmalı.' : s !== s2 ? 'Şifreler aynı değil.' : '';
const girisKart = ic2 => `<div class="login"><div class="card giris-kart"><img src="logo-koyu.png" alt="${esc(S.brand.unvan || 'Diyetisyen')}" class="login-logo">${ic2}</div></div>`;
const sifreAlan = (ad, etiket, ac = 'current-password', extra = '') => `<label class="f">${etiket}<div class="sifre-kutu"><input class="i" type="password" name="${ad}" autocomplete="${ac}" required ${extra}>
  <button type="button" class="sifre-goster" tabindex="-1" aria-label="Şifreyi göster">${ic('eye')}</button></div></label>`;
document.addEventListener('click', e => {
  const b = e.target.closest('.sifre-goster'); if (!b) return;
  const i = b.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password';
});

function renderGirisKur(sonra) {
  $('#app').innerHTML = girisKart(`
    <div class="muted small eyebrow" style="margin-top:4px">Giriş bilgilerinizi oluşturun</div>
    <p class="small" style="margin:10px 0 2px">Uygulama bundan sonra bu kullanıcı adı ve şifreyle açılacak. Tüm cihazlarınızda aynı olur.</p>
    <form id="gk">
      <label class="f">Kullanıcı adı<input class="i" name="kullanici" autocomplete="username" required maxlength="60" autocapitalize="none"></label>
      ${sifreAlan('sifre', 'Şifre <span class="muted small">(en az 6 karakter)</span>', 'new-password', 'minlength="6"')}
      ${sifreAlan('sifre2', 'Şifre (tekrar)', 'new-password')}
      <div class="err" id="gk-err"></div>
      <button class="btn primary" type="submit">Kaydet ve devam et</button>
    </form>`);
  $('#gk').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), hata = sifreKural(f.get('sifre'), f.get('sifre2'));
    if (hata) return ($('#gk-err').textContent = hata);
    e.submitter && (e.submitter.disabled = true);
    try { const kod = kurtarmaKoduUret(); await girisKaydet(f.get('kullanici'), f.get('sifre'), kod); renderKurtarmaKodu(kod, sonra); }
    catch (err) { $('#gk-err').textContent = err.message; e.submitter && (e.submitter.disabled = false); }
  };
}
function renderKurtarmaKodu(kod, sonra) {
  $('#app').innerHTML = girisKart(`
    <div class="muted small eyebrow" style="margin-top:4px">Kurtarma kodunuz</div>
    <p class="small" style="margin:10px 0">Şifrenizi unutursanız <b>yalnızca bu kodla</b> yeni şifre koyabilirsiniz. Bir kağıda yazın ya da ekran görüntüsünü alıp saklayın. Kod bir daha gösterilmez.</p>
    <div class="kurtarma-kod" id="kk">${esc(kod)}</div>
    <button class="btn sm" type="button" id="kk-kopya">${ic('copy')}Kopyala</button>
    <label class="check" style="margin:16px 0 6px;justify-content:center"><input type="checkbox" id="kk-ok"> Kodu bir yere kaydettim</label>
    <button class="btn primary" id="kk-devam" disabled>Devam et</button>`);
  $('#kk-kopya').onclick = () => navigator.clipboard?.writeText(kod).then(() => toast('Kod kopyalandı'), () => {});
  $('#kk-ok').onchange = e => { $('#kk-devam').disabled = !e.target.checked; };
  $('#kk-devam').onclick = sonra;
}
function renderGirisEkrani(g, sonra) {
  let hata = 0, bekle = 0;
  $('#app').innerHTML = girisKart(`
    <div class="muted small eyebrow" style="margin-top:4px">Danışan takip paneli</div>
    <form id="gf">
      <label class="f">Kullanıcı adı<input class="i" name="kullanici" autocomplete="username" required autocapitalize="none" autofocus></label>
      ${sifreAlan('sifre', 'Şifre')}
      <label class="check" style="margin:2px 0 4px"><input type="checkbox" name="hatirla" checked> Bu cihazda ${GIRIS_GUN} gün açık kalsın</label>
      <div class="err" id="gf-err"></div>
      <button class="btn primary" type="submit">Giriş yap</button>
    </form>
    <button class="btn ghost sm" id="gf-unut" style="margin-top:10px">Şifremi unuttum</button>`);
  $('#gf').onsubmit = async e => {
    e.preventDefault();
    if (Date.now() < bekle) return ($('#gf-err').textContent = `Çok fazla hatalı deneme. ${Math.ceil((bekle - Date.now()) / 1000)} saniye sonra tekrar deneyin.`);
    const f = new FormData(e.target);
    e.submitter && (e.submitter.disabled = true);
    const ok = kAdiAyni(f.get('kullanici'), g.kullanici) & await sifreDogru(g, f.get('sifre'));
    e.submitter && (e.submitter.disabled = false);
    if (!ok) {
      if (++hata >= 5) { bekle = Date.now() + 30e3; hata = 0; }
      $('#gf-err').textContent = 'Kullanıcı adı veya şifre hatalı.'; return;
    }
    if (f.get('hatirla')) cihazHatirla(g); else localStorage.removeItem(HATIRLA);
    S.oturumAcik = true;
    sonra();
  };
  $('#gf-unut').onclick = () => renderSifreUnuttum(g, sonra);
}
function renderSifreUnuttum(g, sonra) {
  $('#app').innerHTML = girisKart(`
    <div class="muted small eyebrow" style="margin-top:4px">Şifremi unuttum</div>
    <p class="small" style="margin:10px 0 2px">Giriş bilgilerini oluştururken verilen <b>kurtarma kodunu</b> yazın ve yeni şifrenizi belirleyin.</p>
    <form id="su">
      <label class="f">Kurtarma kodu<input class="i kod-in" name="kod" required autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX"></label>
      <label class="f">Kullanıcı adı<input class="i" name="kullanici" required maxlength="60" autocapitalize="none" autocomplete="username"></label>
      ${sifreAlan('sifre', 'Yeni şifre', 'new-password', 'minlength="6"')}
      ${sifreAlan('sifre2', 'Yeni şifre (tekrar)', 'new-password')}
      <div class="err" id="su-err"></div>
      <button class="btn primary" type="submit">Yeni şifreyi kaydet</button>
    </form>
    <button class="btn ghost sm" id="su-geri" style="margin-top:10px">Girişe dön</button>`);
  $('#su-geri').onclick = () => renderGirisEkrani(g, sonra);
  $('#su').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), hata = sifreKural(f.get('sifre'), f.get('sifre2'));
    if (hata) return ($('#su-err').textContent = hata);
    if (!(await kodDogru(g, f.get('kod')))) return ($('#su-err').textContent = 'Kurtarma kodu hatalı.');
    const kod = kurtarmaKoduUret();
    try { await girisKaydet(f.get('kullanici'), f.get('sifre'), kod); S.oturumAcik = true; renderKurtarmaKodu(kod, sonra); }
    catch (err) { $('#su-err').textContent = err.message; }
  };
}

// Ayarlar → Giriş ve güvenlik
async function girisAyarBagla() {
  let g = await api('/giris');
  $('#ga-kad').textContent = g.kurulu ? g.kullanici : 'henüz belirlenmedi';
  $('#ga-cikis').onclick = async () => { if (await confirmBox('Bu cihazda çıkış yapılacak. Tekrar açmak için kullanıcı adı ve şifre gerekecek.', 'Çıkış yap')) cikisYap(); };
  const pencere = (baslik, govde, isle) => {
    const m = modal({ title: baslik, body: `<form id="gp">${govde}<div class="err" id="gp-err"></div></form>`,
      foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" form="gp" type="submit">Kaydet</button>` });
    $('#gp', m.el).onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (g.kurulu && !(await sifreDogru(g, f.get('mevcut')))) return ($('#gp-err', m.el).textContent = 'Mevcut şifre hatalı.');
      try { const kod = kurtarmaKoduUret(); const msj = await isle(f, kod); if (msj) return ($('#gp-err', m.el).textContent = msj); m.close(); kodGoster(kod); g = await api('/giris'); $('#ga-kad').textContent = g.kullanici; }
      catch (err) { $('#gp-err', m.el).textContent = err.message; }
    };
  };
  const mevcut = () => g.kurulu ? sifreAlan('mevcut', 'Mevcut şifre') : '';
  // Kayıttan sonra yeni kurtarma kodu her zaman gösterilir (eski kod geçersiz olur)
  const kodGoster = kod => modal({ title: 'Yeni kurtarma kodunuz', body: `<p class="small" style="margin-top:0">Eski kurtarma kodu artık geçersiz. Bu kodu kaydedin; şifrenizi unutursanız yalnızca bununla yeni şifre koyabilirsiniz.</p>
    <div class="kurtarma-kod">${esc(kod)}</div>`, foot: `<button class="btn" id="kg-kopya">${ic('copy')}Kopyala</button><button class="btn primary" data-close>Kaydettim</button>` })
    .el.querySelector('#kg-kopya').onclick = () => navigator.clipboard?.writeText(kod).then(() => toast('Kod kopyalandı'), () => {});
  $('#ga-sifre').onclick = () => pencere('Kullanıcı adı / şifre değiştir', `${mevcut()}
      <label class="f">Kullanıcı adı<input class="i" name="kullanici" required maxlength="60" autocapitalize="none" autocomplete="username" value="${esc(g.kullanici || '')}"></label>
      ${sifreAlan('sifre', 'Yeni şifre <span class="muted small">(en az 6 karakter)</span>', 'new-password', 'minlength="6"')}${sifreAlan('sifre2', 'Yeni şifre (tekrar)', 'new-password')}`,
    async (f, kod) => sifreKural(f.get('sifre'), f.get('sifre2')) || (await girisKaydet(f.get('kullanici'), f.get('sifre'), kod), ''));
  $('#ga-kod').onclick = () => g.kurulu ? pencere('Yeni kurtarma kodu', `<p class="small" style="margin-top:0">Yeni kod oluşturulunca eskisi geçersiz olur.</p>${mevcut()}`,
    async (f, kod) => (await girisKaydet(g.kullanici, f.get('mevcut'), kod), '')) : toast('Önce kullanıcı adı ve şifre belirleyin');
}

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
  const basla = () => { renderShell(); route(); };
  if (YEREL && !testGirissiz()) {
    const g = await api('/giris');
    if (!g.kurulu) return renderGirisKur(basla);
    if (!cihazHatirliMi(g)) return renderGirisEkrani(g, basla);
  }
  basla();
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
  ['#/ara', 'search', 'Ara'],
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
    <nav class="tabbar">${NAV.filter(([h]) => h !== '#/ara').map(([h, i, t]) => `<a href="${h}" data-nav="${h}"${h === '#/sablonlar' ? ' class="tb-sablon"' : ''}>${ic(i)}${t}</a>`).join('')}
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
  // Tutarlar başka bölüme geçince yeniden gizlenir
  if (top !== S.paraBolum) { S.paraAcik = false; S.paraBolum = top; }
  const main = $('#main');
  main.classList.remove('wide');
  main.onclick = null;   // sayfaya özel tıklama işleyicisi bir sonraki sayfaya taşınmasın
  window.scrollTo(0, 0);
  try {
    if (!parts.length) return await viewDashboard(main);
    switch (parts[0]) {
      case 'takvim': return await viewCalendar(main, parts[1], parts[2]);
      case 'ara': return await viewSearch(main, h.slice(5));
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
  <form class="search ara-kutu" id="d-ara" role="search">${ic('search')}<input class="i" name="q" type="search" enterkeyhint="search" placeholder="Her yerde ara: danışan, diyet listesi, tarif, hazır metin…" autocomplete="off"></form>
  <!-- Özet'te finansal bilgi yok (Hande: ekranı danışana gösterirken para görünmesin) — tutarlar yalnızca Finans'ta -->
  <div class="grid g4" style="margin-bottom:16px">
    <a class="card stat" href="#/danisanlar"><div class="k">Aktif danışan</div><div class="v">${d.aktif}</div></a>
    <div class="card stat"><div class="k">Bu ay yeni danışan</div><div class="v">${d.buAyYeni}</div></div>
    <div class="card stat"><div class="k">Bu ay hazırlanan liste</div><div class="v">${d.buAyListe}</div></div>
    <div class="card stat"><div class="k">Aktiflerin verdiği toplam</div><div class="v">${fmtNum(d.toplamVerilen)}<small>kg</small></div></div>
  </div>
  <div class="card ${d.paketBitiyor.length ? 'bitiyor' : ''}" style="margin-bottom:16px"><div class="card-head"><h2>Paketi bitmek üzere</h2><span class="badge ${d.paketBitiyor.length ? 'sari' : ''}">${d.paketBitiyor.length}</span></div>
    <div class="muted small" style="padding:4px 20px 0">Paketi önümüzdeki 10 gün içinde bitecek danışanlar</div>
    <div class="list" style="margin-top:4px">${cl(d.paketBitiyor, c => kisi(c, `${kalanRozet(c.paket_bitis)}<button class="btn sm soft" data-yenile="${c.id}">Yenile</button>`), '10 gün içinde biten paket yok')}</div></div>
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
  </div>
  <div class="card" style="margin-top:16px"><div class="card-head"><h2>Son düzenlenen listeler</h2></div>
    <div class="list" style="margin-top:8px">${cl(d.sonListeler, l => `<a class="item" href="#/liste/${l.id}"><div class="avatar" style="background:var(--seftali-acik);color:#3F6A22">${ic('file', 'width="20" height="20"')}</div>
      <div class="grow"><div class="t">${esc(l.ad_soyad)}</div><div class="s">${esc(l.baslik || 'Diyet listesi')} · ${fmtDate(l.tarih)}</div></div></a>`, 'Henüz liste yok')}</div></div>`;
  $('#d-ara').onsubmit = e => { e.preventDefault(); const q = e.target.q.value.trim(); location.hash = '#/ara/' + encodeURIComponent(q); };
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

// ============ ARA: tüm uygulamada kelime arama ============
async function viewSearch(main, q0) {
  let q = ''; try { q = decodeURIComponent(q0 || ''); } catch { q = q0 || ''; }
  main.innerHTML = `
  <div class="page-head"><div><h1>Ara</h1><div class="sub">Danışanlar, diyet listeleri, şablonlar, tarifler, hazır öğün metinleri ve notlar</div></div></div>
  <div class="search ara-kutu" role="search">${ic('search')}<input class="i" id="ara-q" type="search" enterkeyhint="search" placeholder="Aranacak kelime (ör. yulaf, kefir, insülin)" value="${esc(q)}" autocomplete="off"></div>
  <div id="ara-s"></div>`;
  const inp = $('#ara-q');
  const ciz = aramaBagla(inp, $('#ara-s'), { sayfa: true });
  await ciz();
  if (!q && window.innerWidth > 820) inp.focus();
}
// Arama kutusu + sonuçlar: Ara sayfası ve arama penceresi ortak kullanır
function aramaBagla(inp, out, { sayfa = false, kapat = null } = {}) {
  const GRUPLAR = [
    ['danisanlar', 'Danışanlar', r => ({ href: `#/danisan/${r.id}`, t: r.ad_soyad + (r.durum === 'pasif' ? ' (pasif)' : ''), ikon: 'users' })],
    ['listeler', 'Diyet listeleri', r => ({ href: `#/liste/${r.id}`, t: `${r.ad_soyad} · ${r.baslik || 'Diyet listesi'}`, ek: fmtDate(r.tarih), ikon: 'file', liste: true })],
    ['sablonlar', 'Şablonlar', r => ({ href: `#/sablon/${r.id}`, t: r.ad, ikon: 'file', liste: true })],
    ['tarifler', 'Tarifler', r => ({ href: '#/kutuphane/tarif', t: r.baslik, ikon: 'book', kut: 'tarif' })],
    ['ogunler', 'Hazır öğün metinleri', r => ({ href: '#/kutuphane/ogun', t: r.baslik, ek: katAd ? (r.kategori || '').split(',').filter(Boolean).map(katAd).join(', ') : '', ikon: 'book', kut: 'ogun' })],
    ['notlar', 'Notlar', r => ({ href: '#/kutuphane/not', t: r.baslik, ikon: 'book', kut: 'not' })],
  ];
  let son = null;
  const ciz = async () => {
    const v = inp.value.trim();
    if (sayfa) history.replaceState(null, '', '#/ara/' + encodeURIComponent(v));
    if (katla(v).replace(/\s/g, '').length < 2) { out.innerHTML = '<div class="empty">Aramak için en az 2 harf yazın.</div>'; return; }
    const r = await api('/ara?q=' + encodeURIComponent(v));
    if (inp.value.trim() !== v) return;   // bu arada yazmaya devam edildi
    son = r;
    const toplam = GRUPLAR.reduce((a, [k]) => a + r[k].length, 0);
    out.innerHTML = toplam ? `<div class="muted small" style="margin:-4px 0 12px">${toplam} sonuç</div>` + GRUPLAR.filter(([k]) => r[k].length).map(([k, ad, f]) => `
      <div class="card" style="margin-bottom:14px"><div class="card-head"><h2>${ad}</h2><span class="badge">${r[k].length}${r[k].length >= 40 ? '+' : ''}</span></div>
        <div class="list" style="margin-top:6px">${r[k].map((x, i) => { const o = f(x); return `<a class="item ara-sonuc" href="${o.href}" data-g="${k}" data-i="${i}">
          <div class="avatar" style="background:var(--seftali-acik);color:#3F6A22">${ic(o.ikon, 'width="19" height="19"')}</div>
          <div class="grow" style="min-width:0"><div class="t">${vurgula(o.t, v)}${o.ek ? ` <span class="muted small">· ${esc(o.ek)}</span>` : ''}</div>
            ${x.alinti ? `<div class="s ara-alinti">${x.alan && x.alan !== 'Ad' && x.alan !== 'Başlık' ? `<b>${esc(x.alan)}:</b> ` : ''}${vurgula(x.alinti, v)}</div>` : ''}</div></a>`; }).join('')}</div></div>`).join('')
      : `<div class="empty">"${esc(v)}" için sonuç bulunamadı.</div>`;
  };
  out.onclick = e => {
    const a = e.target.closest('.ara-sonuc'); if (!a || !son) return;
    const k = a.dataset.g, x = son[k][a.dataset.i], o = GRUPLAR.find(g => g[0] === k)[2](x);
    if (o.liste) S.araVurgu = inp.value.trim();
    // Kütüphanede o kaydı göstermek için arama kutusu kaydın başlığıyla doldurulur
    if (o.kut === 'tarif') { (renderTarifGrid.st ||= { k: '', q: '', m: '' }); Object.assign(renderTarifGrid.st, { k: '', m: '', q: x.baslik }); }
    else if (o.kut) { const st = ((renderMetinGrid.st ||= {})[o.kut] ||= { k: '', q: '', m: '' }); Object.assign(st, { k: '', m: '', q: x.baslik }); }
    if (kapat) kapat();
  };
  inp.oninput = debounce(() => ciz().catch(onErr), 250);
  inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } };
  return ciz;
}

// Liste/şablon düzenleyicide yan arama paneli: sayfadan çıkmadan arar, bulunanı tek dokunuşla listeye yazar.
// Masaüstü/tablet: sağda sabit panel (liste yanında görünmeye devam eder); telefon: alttan açılan, küçültülebilen panel.
function yanAramaPaneli(root, o) {
  const p = document.createElement('aside');
  p.className = 'yan-panel'; p.hidden = true; p.setAttribute('aria-label', 'Ara ve ekle');
  p.innerHTML = `<div class="yp-bas"><b class="grow">${ic('search', 'width="17" height="17"')} Ara ve listeye ekle</b>
      <button class="btn icon sm ghost yp-kucult" data-yp-kucult aria-label="Küçült" title="Küçült">${ic('down')}</button>
      <button class="btn icon sm ghost" data-yp-kapat aria-label="Kapat" title="Kapat">${ic('x')}</button></div>
    <div class="yp-ic">
      <div class="yp-hedef" id="yp-hedef"></div>
      <div class="search">${ic('search')}<input class="i" id="yp-q" type="search" enterkeyhint="search" placeholder="Tarif, hazır metin, eski liste… (ör. yulaf)" autocomplete="off"></div>
      <div class="yp-sonuc" id="yp-s"></div>
    </div>`;
  root.appendChild(p);
  const inp = $('#yp-q', p), out = $('#yp-s', p);
  const blokBul = id => o.blocks.find(b => b.id == id);
  let ogeler = [], son = null;
  const oge = x => (ogeler.push(x), ogeler.length - 1);
  const metinKutu = (t, q) => `<pre class="yp-metin" title="Tamamını görmek için dokunun">${q ? vurgula(t, q) : esc(t)}</pre>`;
  const dug = (tur, k, etiket, ana) => `<button class="btn sm ${ana ? 'primary' : ''}" data-yp="${tur}" data-k="${k}">${etiket}</button>`;
  const blokHtml = (b, q) => {
    const k = oge(b), tarif = b.tur === 'tarif', not = b.tur === 'not';
    return `<div class="yp-oge"><div class="yp-t">${q ? vurgula(b.baslik, q) : esc(b.baslik)}</div>${b.icerik ? metinKutu(b.icerik, q) : ''}
      <div class="yp-dug">${not ? dug('not', k, `${ic('plus')}Notlara ekle`, true) + dug('ogun', k, 'Öğüne yaz') : dug('ogun', k, `${ic('plus')}Öğüne yaz`, true)}
        ${tarif ? dug('tarif', k, 'Tarifler bölümüne') : ''}${tarif && b.url ? dug('link', k, `${ic('link')}Öğüne link`) : ''}</div></div>`;
  };
  const hedefAd = () => { const h = o.hedef(); return h ? [h.ogun, h.saat].filter(Boolean).join(' ') : ''; };
  const hedefYaz = () => {
    const h = o.hedef();
    const bl = o.ogunler(), cok = bl.length > 1;
    const secenek = bl.map(b => { const op = b.satirlar.map(r => `<option value="${r.si}:${r.ri}" ${h && h.si === r.si && h.ri === r.ri ? 'selected' : ''}>${esc(r.ad)}</option>`).join(''); return cok ? `<optgroup label="${esc(b.bolum)}">${op}</optgroup>` : op; }).join('');
    $('#yp-hedef', p).innerHTML = `<label class="yp-hedef-sec"><span>Eklenecek öğün</span><select class="i" id="yp-ogun">${h ? '' : '<option value="" selected>Öğün seçin…</option>'}${secenek}</select></label>
      <div class="muted small">${h ? '“Öğüne yaz” bu öğüne, imlecin bulunduğu satırın altına (imleç yoksa sona) ekler. Listede bir öğüne dokunarak da seçebilirsiniz.' : 'Öğünü buradan seçin ya da listede o öğünün yazı alanına dokunun.'}</div>`;
    $('#yp-ogun', p).onchange = e => { const [si, ri] = e.target.value.split(':').map(Number); if (e.target.value) o.hedefSec(si, ri); };
    if (!inp.value.trim()) ciz().catch(onErr);   // boşken seçili öğünün hazır metinleri gösterilir
  };
  const ciz = async () => {
    const v = inp.value.trim();
    ogeler = [];
    if (katla(v).replace(/\s/g, '').length < 2) {
      const h = o.hedef(), kat = h ? h.ogun.toLocaleUpperCase('tr') : '';
      const hazir = kat ? o.blocks.filter(b => b.tur === 'ogun' && katlar(b).includes(kat)) : [];
      out.innerHTML = hazir.length
        ? `<div class="yp-grup">${esc(hedefAd())} için hazır metinler <span class="badge">${hazir.length}</span></div>${hazir.map(b => blokHtml(b, '')).join('')}`
        : '<div class="empty">Aramak için en az 2 harf yazın.<br><span class="small">Tarifler, hazır öğün metinleri, notlar ve eski diyet listeleri aranır.</span></div>';
      return;
    }
    const r = await api('/ara?q=' + encodeURIComponent(v));
    if (inp.value.trim() !== v) return;
    son = r;
    const bl = (dizi, tur) => dizi.map(x => blokHtml(blokBul(x.id) || { ...x, tur, icerik: '' }, v)).join('');
    const kayit = (dizi, tur) => dizi.map((x, i) => `<div class="yp-oge"><div class="yp-t">${vurgula(tur === 'liste' ? `${x.ad_soyad} · ${x.baslik || 'Diyet listesi'}` : x.ad, v)}${x.tarih ? ` <span class="muted small">· ${esc(fmtDate(x.tarih))}</span>` : ''}</div>
        ${x.alinti ? `<div class="yp-alinti">${x.alan && !['Ad', 'Başlık', 'Danışan', 'Liste adı', 'Şablon adı'].includes(x.alan) ? `<b>${esc(x.alan)}:</b> ` : ''}${vurgula(x.alinti, v)}</div>` : ''}
        <div class="yp-dug"><button class="btn sm" data-yp-ac="${tur}" data-i="${i}">${ic('down')}Öğünlerini göster</button></div><div class="yp-alt"></div></div>`).join('');
    const G = [['ogunler', 'Hazır öğün metinleri', x => bl(x, 'ogun')], ['tarifler', 'Tarifler', x => bl(x, 'tarif')], ['notlar', 'Notlar', x => bl(x, 'not')],
      ['listeler', 'Eski diyet listeleri', x => kayit(x, 'liste')], ['sablonlar', 'Şablonlar', x => kayit(x, 'sablon')]].filter(([k]) => r[k].length);
    out.innerHTML = G.length ? G.map(([k, ad, f]) => `<div class="yp-grup">${ad} <span class="badge">${r[k].length}${r[k].length >= 40 ? '+' : ''}</span></div>${f(r[k])}`).join('')
      : `<div class="empty">"${esc(v)}" için sonuç bulunamadı.</div>`;
  };
  // Eski liste / şablonun öğünleri: aranan kelimenin geçtiği öğünler (yoksa hepsi), her biri tek dokunuşla eklenebilir
  const ogunleriAc = async (b) => {
    const alt = b.closest('.yp-oge').querySelector('.yp-alt');
    if (alt.innerHTML) { alt.innerHTML = ''; b.innerHTML = `${ic('down')}Öğünlerini göster`; return; }
    const x = son[b.dataset.ypAc === 'liste' ? 'listeler' : 'sablonlar'][b.dataset.i];
    const d = (await api(`/${b.dataset.ypAc === 'liste' ? 'lists' : 'templates'}/${x.id}`)).data || {};
    const kel = katla(inp.value.trim()).split(/\s+/).filter(k => k.length >= 2);
    const satirlar = (d.sections || []).flatMap(s => (s.rows || []).filter(r => (r.content || '').trim()).map(r => ({ ...r, bolum: s.title })));
    const uyan = satirlar.filter(r => kel.every(k => katla(r.content + ' ' + r.label).includes(k)));
    const goster = uyan.length ? uyan : satirlar;
    alt.innerHTML = goster.map(r => { const k = oge({ icerik: r.content }); return `<div class="yp-ogun"><div class="small"><b>${esc([r.label, r.time].filter(Boolean).join(' ') || 'Öğün')}</b>${r.bolum && (d.sections || []).length > 1 ? ` <span class="muted">· ${esc(r.bolum)}</span>` : ''}</div>
      ${metinKutu(r.content, inp.value.trim())}<div class="yp-dug">${dug('ogun', k, `${ic('plus')}Öğüne yaz`, true)}</div></div>`; }).join('') || '<div class="muted small">Bu listede yazılı öğün yok.</div>';
    b.innerHTML = `${ic('up')}Gizle`;
  };
  p.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-yp-kapat]')) return kapat();
    if (t.closest('[data-yp-kucult]')) return kucult(!p.classList.contains('kucuk'));
    if (t.closest('.yp-bas') && p.classList.contains('kucuk')) { if (document.activeElement?.closest('#ed-root') && !document.activeElement.closest('.yan-panel')) document.activeElement.blur(); return kucult(false); }
    const pre = t.closest('.yp-metin'); if (pre) return pre.classList.toggle('acik');
    const ac = t.closest('[data-yp-ac]'); if (ac) return ogunleriAc(ac).catch(onErr);
    const b = t.closest('[data-yp]'); if (!b) return;
    const x = ogeler[b.dataset.k];
    switch (b.dataset.yp) {
      case 'ogun': o.ogunaYaz(x.icerik); break;
      case 'tarif': o.tarifeEkle({ title: x.baslik, body: x.icerik, url: x.url || '' }); break;
      case 'not': o.notaEkle(x.icerik); break;
      case 'link': o.linkYaz({ title: x.baslik, url: x.url }); break;
    }
  });
  inp.oninput = debounce(() => ciz().catch(onErr), 250);
  inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } if (e.key === 'Escape') kapat(); };
  const ac = () => {
    p.hidden = false; root.classList.add('yp-acik');
    hedefYaz();
    if (window.innerWidth > 820) setTimeout(() => inp.focus(), 50);   // telefonda klavye kendiliğinden açılmasın (önce öğün seçilebilsin)
  };
  const kapat = () => { p.hidden = true; p.classList.remove('kucuk'); root.classList.remove('yp-acik', 'yp-kucuk'); $$('.meal.hedef', root).forEach(m => m.classList.remove('hedef')); };
  const kucult = k => { p.classList.toggle('kucuk', k); root.classList.toggle('yp-kucuk', k); $('[data-yp-kucult]', p).innerHTML = ic(k ? 'up' : 'down'); };
  root.addEventListener('focusin', e => { if (!p.hidden && window.innerWidth <= 820 && e.target.matches('#e-secs textarea, #e-secs input, .fs input, .fs textarea, #e-ad, #e-acik, #e-baslik')) kucult(true); });
  return { ac, kapat, degistir: () => (p.hidden ? ac() : kapat()), hedefYaz: () => { if (!p.hidden) hedefYaz(); } };
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
        <div class="s">${[c.paket, c.son_kilo ? `${fmtNum(c.son_kilo)} kg` : null, deg ? `<span class="${deg < 0 ? 'down' : 'up'}">${deg > 0 ? '+' : ''}${fmtNum(deg)} kg</span>` : null, `${c.liste_sayisi} liste`].filter(Boolean).join(' · ')}</div>
        ${c.onemli ? `<div class="onemli-mini">${ic('alert', 'width="13" height="13"')}<span>${esc(c.onemli.replace(/\s*\n\s*/g, ' · '))}</span></div>` : ''}</div>
        <div class="rozetler">${c.durum === 'aktif' && c.paket_bitis ? kalanRozet(c.paket_bitis) : ''}
        ${c.bakiye > 0.009 ? `<span class="badge kirmizi" title="Açık bakiye">${para(c.bakiye)}</span>` : ''}
        ${c.durum === 'aktif' ? kontrolBadge(c.sonraki_kontrol) : ''}</div></a>`;
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
    <div class="fs"><h3>Önemli not</h3>
      <textarea class="i" name="onemli" id="cf-onemli" rows="2" placeholder="Danışan sayfasının en üstünde görünür — ör. emziren anne, tüp bebek tedavisi, insülin direnci">${esc(c.onemli ?? '')}</textarea>
      <div class="chips-row sarar" id="cf-onemli-h" style="margin:8px 0 0">${ONEMLI_HAZIR.map(h => `<button type="button" data-h="${esc(h)}">${ic('plus', 'width="13" height="13"')} ${esc(h)}</button>`).join('')}</div></div>
    <div class="fs"><h3>Kimlik ve iletişim</h3><div class="fg">
      ${inp('ad_soyad', 'Ad soyad *', 'text', 'span2', 'required')}
      ${inp('telefon', 'Telefon', 'tel', '', 'placeholder="5xx xxx xx xx"')}
      ${inp('tc_kimlik', 'TC kimlik no', 'text', '', 'inputmode="numeric" maxlength="11" pattern="[1-9][0-9]{10}" title="11 haneli TC kimlik numarası"')}
      <label class="f">Doğum tarihi <span class="muted" id="cf-yas" style="font-weight:500">${age(c.dogum_tarihi) != null ? `(${age(c.dogum_tarihi)} yaş)` : ''}</span><input class="i" name="dogum_tarihi" type="date" value="${esc(c.dogum_tarihi ?? '')}"></label>
      ${sel('cinsiyet', 'Cinsiyet', ['', 'Kadın', 'Erkek'])}
      ${inp('meslek', 'Meslek')}
      ${inp('sehir', 'Şehir')}
      ${inp('ilce', 'İlçe')}
      <label class="f">Hangi kanaldan ulaştı<select class="i" id="cf-nr"><option value=""></option>${NEREDEN.map(n => `<option ${c.nereden === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}<option value="Diğer" ${c.nereden && !NEREDEN.includes(c.nereden) ? 'selected' : ''}>Diğer…</option></select></label>
      <label class="f ${c.nereden && !NEREDEN.includes(c.nereden) ? '' : 'hidden'}" id="cf-nr-dl">Kanal (diğer)<input class="i" id="cf-nr-d" value="${esc(c.nereden && !NEREDEN.includes(c.nereden) ? c.nereden : '')}" placeholder="Ör. YouTube, eski danışan"></label>
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
  $('#cf-nr').onchange = e => { $('#cf-nr-dl').classList.toggle('hidden', e.target.value !== 'Diğer'); if (e.target.value === 'Diğer') $('#cf-nr-d').focus(); };
  $('#cf-onemli-h').onclick = e => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    const t = $('#cf-onemli');
    if (!t.value.toLocaleLowerCase('tr').includes(b.dataset.h.toLocaleLowerCase('tr'))) t.value = t.value.replace(/\s+$/, '') + (t.value.trim() ? '\n' : '') + b.dataset.h;
  };
  $('[name=dogum_tarihi]').onchange = e => { const y = age(e.target.value); $('#cf-yas').textContent = y != null ? `(${y} yaş)` : ''; };
  $('#cf-pk') && ($('#cf-pk').onchange = e => { const f = e.target.selectedOptions[0]?.dataset.fiyat; $('[name=pk_odeme]').value = f || ''; });
  $('#cf').onsubmit = async e => {
    e.preventDefault();
    const body = stripAnamnez(Object.fromEntries(new FormData(e.target)));
    body.anamnez = collectAnamnez(e.target);
    body.nereden = $('#cf-nr').value === 'Diğer' ? $('#cf-nr-d').value.trim() || 'Diğer' : $('#cf-nr').value;
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
    if (!(await confirmBox(`<b>${esc(c.ad_soyad)}</b> ölçüm, liste ve randevularıyla birlikte silinecek ve listelerden kalkacak. Gerekirse Ayarlar → Silinenler'den geri getirebilirsiniz.`))) return;
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
        ${c.durum === 'aktif' && c.paket_bitis ? kalanRozet(c.paket_bitis) : ''}
        ${c.finans.bakiye > 0.009 ? `<a class="badge kirmizi" href="#/danisan/${c.id}/odeme">Bakiye ${para(c.finans.bakiye)}</a>` : ''}
        ${age(c.dogum_tarihi) != null ? `<span class="badge">${age(c.dogum_tarihi)} yaş</span>` : ''}
        ${nextAppt ? `<span class="badge">${ic('cal', 'width="12" height="12"')} ${fmtDate(nextAppt.tarih)} ${nextAppt.saat}</span>` : ''}
      </div></div></div>
    <div class="row">
      <button class="btn" id="wagonder" title="Diyet listesi ve sonraki görüşme tarihini WhatsApp'tan gönder">${ic('wa')}WhatsApp</button>
      <button class="btn" id="formgonder" title="Hasta Takip Kartı formunu WhatsApp ile gönder">${ic('file')}Kart formu</button>
      <button class="btn" id="addr">${ic('cal')}Randevu</button>
      <button class="btn" id="addv">${ic('scale')}Kontrol ekle</button>
      <button class="btn primary" id="newl">${ic('plus')}Yeni liste</button>
    </div>
  </div>
  ${onemliKutu(c)}
  <div class="tabs" id="tabs">${TABS.map(([k, t]) => `<button data-k="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>
  <div id="tabc"></div>`;

  $('#tabs').onclick = e => { const bt = e.target.closest('button'); if (bt) history.replaceState(null, '', `#/danisan/${id}/${bt.dataset.k}`), renderTab(bt.dataset.k); };
  $('#addv').onclick = () => visitModal(c);
  $('#wagonder').onclick = () => waGonder(c);
  $('#formgonder').onclick = () => formLinkiPaylas(c.ad_soyad, c.telefon).catch(onErr);
  $('#addr').onclick = () => apptModal({ client_id: c.id, tarih: addDays(todayIso(), 1), saat: nextAppt?.saat || '10:00', kanal: c.gorusme_tipi === 'Yüz yüze' ? 'Yüz yüze' : 'Online' }, () => viewClient(main, id, tab), apptLocked);
  $('#newl').onclick = () => newListModal(c);
  $('#onemli').onclick = () => onemliModal(c, () => viewClient(main, id, tab));
  $('#onemli').onkeydown = e => { if (e.key === 'Enter') onemliModal(c, () => viewClient(main, id, tab)); };

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
        <div class="card"><div class="card-head"><h2 id="olcu-bas">Kilo seyri</h2></div>
          ${olcuSecenek(visitsAsc).length > 1 ? `<div class="chips-row sarar kucuk" id="olcu-sec" style="padding:8px 20px 0;margin:0">${olcuSecenek(visitsAsc).map(([f, t], i) => `<button type="button" data-o="${f}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>` : ''}
          <div class="card-pad" id="olcu-g">${olcuGrafik(visitsAsc, 'kilo', c.hedef_kilo)}</div></div>
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
      let olcu = 'kilo';
      const olcuCiz = () => { const g = $('#olcu-g'); if (g) g.innerHTML = olcuGrafik(visitsAsc, olcu, olcu === 'kilo' ? c.hedef_kilo : null, grafikGenislik(g)); };
      olcuCiz();
      grafikIzle($('#olcu-g'), olcuCiz);
      $('#olcu-sec') && ($('#olcu-sec').onclick = e => {
        const b = e.target.closest('[data-o]'); if (!b) return;
        $$('#olcu-sec button').forEach(x => x.classList.toggle('on', x === b));
        olcu = b.dataset.o;
        $('#olcu-bas').textContent = olcu === 'kilo' ? 'Kilo seyri' : `${b.textContent} seyri`;
        olcuCiz();
      });
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
            <button class="tbtn" data-wa="${l.id}" title="WhatsApp'tan gönder">${ic('wa')}</button>
            <button class="tbtn" data-share="${l.id}" title="Paylaş">${ic('share')}</button>
            <button class="tbtn" data-dup="${l.id}" title="Bu listeden yeni liste">${ic('copy')}</button>
            <button class="tbtn del" data-del="${l.id}" title="Sil">${ic('trash')}</button>
          </div></div>`).join('') : `<div class="empty">Bu danışana henüz liste hazırlanmadı.<br><br><button class="btn primary" id="newl2">${ic('plus')}Liste hazırla</button></div>`}</div></div>`;
      $('#newl2') && ($('#newl2').onclick = () => newListModal(c));
      el.onclick = async e => {
        const t = e.target.closest('[data-pdfy],[data-wa],[data-share],[data-dup],[data-del]');
        if (!t) return;
        const lid = t.dataset.pdfy || t.dataset.wa || t.dataset.share || t.dataset.dup || t.dataset.del;
        const l = c.lists.find(x => x.id == lid);
        if (t.dataset.pdfy) openPdf(lid);
        if (t.dataset.wa) waGonder(c, lid);
        if (t.dataset.share) sharePdf(lid, pdfName(c.ad_soyad, l.tarih));
        if (t.dataset.dup) newListModal(c, lid);
        if (t.dataset.del && await confirmBox('Bu diyet listesi silinecek. Gerekirse Ayarlar → Silinenler\'den geri getirebilirsiniz.')) { await api('/lists/' + lid, { method: 'DELETE' }); toast('Liste silindi'); viewClient(main, id, 'listeler'); }
      };
    } else if (k === 'odeme') {
      renderClientFinance(el, c, () => viewClient(main, id, 'odeme'));
    } else if (k === 'bilgiler') {
      const kim = [['Telefon', c.telefon], ['TC kimlik no', c.tc_kimlik], ['Doğum tarihi', c.dogum_tarihi && `${fmtDate(c.dogum_tarihi)} (${age(c.dogum_tarihi)} yaş)`],
        ['Cinsiyet', c.cinsiyet], ['Meslek', c.meslek], ['Şehir', c.sehir], ['İlçe', c.ilce], ['Adres (eski)', c.adres], ['Hangi kanaldan ulaştı', c.nereden]];
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

// ---------- ölçüm grafiği (kilo, bel, kalça…) ----------
// Yazılar bozulmasın diye grafik ekran genişliğine göre çizilir (eskiden esneyen SVG'de ay/tarih yazıları ezilip kayboluyordu).
// Alt eksen: dönem uzunsa her ayın başı (Eki, Kas… yıl değişiyorsa yılla), kısaysa ölçüm günleri; sol eksen: yuvarlak değerler.
const OLCULER = [['kilo', 'Kilo', 'kg'], ['bel', 'Bel', 'cm'], ['kalca', 'Kalça', 'cm'], ['gogus', 'Göğüs', 'cm'], ['kol', 'Kol', 'cm'], ['bacak', 'Bacak', 'cm'],
  ['yag_orani', 'Yağ', '%'], ['kas_kutlesi', 'Kas', 'kg'], ['su_orani', 'Su', '%']];
const olcuSecenek = visits => OLCULER.filter(([f]) => new Set(visits.filter(v => v[f] != null).map(v => v.tarih)).size >= 2);
const grafikDar = () => window.innerWidth <= 600;
// Kart genişliği değişince (döndürme, pencere boyutu) grafiği yeniden çiz
function grafikIzle(el, ciz) {
  if (!el || !window.ResizeObserver) return;
  let w = el.clientWidth, t;
  new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) < 8) return; w = el.clientWidth; clearTimeout(t); t = setTimeout(ciz, 120); }).observe(el);
}
// Grafiğin çizileceği gerçek genişlik (px): yazılar ekranda 12px kalsın diye viewBox bu genişlikte kurulur
const grafikGenislik = el => {
  let w = el && el.clientWidth;
  if (w) { const s = getComputedStyle(el); w -= parseFloat(s.paddingLeft) + parseFloat(s.paddingRight); }
  return Math.round(Math.min(Math.max(w || (grafikDar() ? 340 : 600), 280), 900));
};
function olcuGrafik(visits, alan = 'kilo', hedef = null, genislik = null) {
  const [, ad, birim] = OLCULER.find(o => o[0] === alan) || OLCULER[0];
  const gun = new Map();   // aynı gün birden çok ölçüm → sonuncusu
  for (const v of visits) if (v[alan] != null) gun.set(v.tarih, Number(v[alan]));
  const pts = [...gun].map(([tarih, val]) => ({ tarih, val, t: dObj(tarih).getTime() })).sort((a, b) => a.t - b.t);
  if (pts.length < 2) return `<div class="empty">Grafik için en az 2 farklı günde ${ad.toLocaleLowerCase('tr')} ölçümü gerekli.</div>`;
  const dar = grafikDar();
  const W = genislik || (dar ? 340 : 600), H = Math.round(Math.min(Math.max(W * 0.48, 200), 280)), L = 40, R = 18, T = 26, B = 36;
  const ys = pts.map(p => p.val).concat(hedef != null && hedef !== '' ? [Number(hedef)] : []);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const ham = Math.max(hi - lo, 1) / 4, us = 10 ** Math.floor(Math.log10(ham));
  const adim = [1, 2, 2.5, 5, 10].map(k => k * us).find(k => k >= ham);
  lo = Math.floor((lo - adim * 0.3) / adim) * adim; hi = Math.ceil((hi + adim * 0.3) / adim) * adim;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = t => L + ((t - t0) / Math.max(t1 - t0, 1)) * (W - L - R);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const yuvarla = n => Math.round(n * 10) / 10;
  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += adim) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="cg"/><text x="${L - 7}" y="${y(v) + 4}" text-anchor="end">${fmtNum(yuvarla(v))}</text>`;
  // Alt eksen etiketleri
  const gunSayisi = (t1 - t0) / 864e5;
  const et = [];
  if (gunSayisi > 45) {
    const yilDegisir = new Date(t0).getFullYear() !== new Date(t1).getFullYear();
    const kac = Math.max(1, Math.ceil(gunSayisi / 30.4 / Math.max(3, Math.floor((W - L - R) / 62))));   // çok uzun dönemde 2-3 ayda bir
    const d = new Date(t0); d.setDate(1); d.setHours(12, 0, 0, 0); d.setMonth(d.getMonth() + 1);
    for (let i = 0; d.getTime() <= t1; i++, d.setMonth(d.getMonth() + 1)) {
      if (i % kac) continue;
      et.push({ t: d.getTime(), m: AYLAR[d.getMonth()] + (yilDegisir && (d.getMonth() === 0 || !et.length) ? ` ${d.getFullYear()}` : ''), cizgi: true });
    }
  } else pts.forEach(p => et.push({ t: p.t, m: fmtDate(p.tarih).replace(/ \d{4}$/, '') }));
  const enAz = 54;
  let sonX = -1e9;
  const xEt = et.filter(e => { const px = x(e.t); if (px - sonX < enAz) return false; sonX = px; return true; }).map(e => {
    const px = x(e.t), anc = px < L + 22 ? 'start' : px > W - R - 22 ? 'end' : 'middle';
    return `${e.cizgi ? `<line x1="${px}" x2="${px}" y1="${T - 8}" y2="${H - B}" class="cg ay"/>` : ''}<text x="${px}" y="${H - B + 19}" text-anchor="${anc}">${esc(e.m)}</text>`;
  }).join('');
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.val).toFixed(1)}`).join(' ');
  const area = `${path} L${x(t1).toFixed(1)},${H - B} L${x(t0).toFixed(1)},${H - B} Z`;
  // Değer yazıları: az noktada her biri, çok noktada ilk / en düşük / en yüksek / son
  const az = pts.length <= Math.floor((W - L - R) / 42);
  const vmin = Math.min(...pts.map(p => p.val)), vmax = Math.max(...pts.map(p => p.val));
  const yazili = pts.filter((p, i) => az || i === 0 || i === pts.length - 1 || p.val === vmin || p.val === vmax);
  const hd = hedef != null && hedef !== '' ? Number(hedef) : null;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ad)} grafiği">
    <defs><linearGradient id="gA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4F7F2A" stop-opacity=".18"/><stop offset="1" stop-color="#4F7F2A" stop-opacity="0"/></linearGradient></defs>
    ${g}${xEt}
    <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="cg eksen"/>
    ${hd != null ? `<line x1="${L}" x2="${W - R}" y1="${y(hd)}" y2="${y(hd)}" stroke="#B08A5B" stroke-dasharray="5 5" stroke-width="1.5"/><text x="${W - R}" y="${y(hd) - 6}" text-anchor="end" style="fill:#8C6A3F">Hedef ${fmtNum(hd)}</text>` : ''}
    <path d="${area}" fill="url(#gA)"/>
    <path d="${path}" fill="none" stroke="#4F7F2A" stroke-width="2.5" stroke-linejoin="round"/>
    ${pts.map((p, i) => `<g class="nokta" data-tarih="${p.tarih}" data-deger="${fmtNum(p.val)} ${esc(birim)}"${i ? ` data-fark="${yuvarla(p.val - pts[i - 1].val)}"` : ''} data-birim="${esc(birim)}">
      <circle cx="${x(p.t)}" cy="${y(p.val)}" r="14" class="hit"/><circle cx="${x(p.t)}" cy="${y(p.val)}" r="4" class="n"/></g>`).join('')}
    ${yazili.map(p => `<text x="${x(p.t)}" y="${y(p.val) - 10}" text-anchor="${x(p.t) < L + 16 ? 'start' : x(p.t) > W - R - 16 ? 'end' : 'middle'}" class="deger">${fmtNum(p.val)}</text>`).join('')}
  </svg><div class="muted small grafik-alt"><span>${fmtDate(pts[0].tarih)} – ${fmtDate(pts[pts.length - 1].tarih)}</span><span>${pts.length} ölçüm · ${birim}</span></div>`;
}

// Grafik noktası ipucu: fareyle üzerine gelince ya da dokununca tarih + gün + değer + bir önceki ölçüme göre fark
// Finans grafiği gibi diğer grafikler içeriği hazır HTML olarak data-ip'de verir (değerler çizilirken esc'lenir)
const IPUCU_SEC = '.chart .nokta, .chart [data-ip]';
function grafikIpucu(e) {
  const n = e.target.closest && e.target.closest(IPUCU_SEC);
  let ip = document.getElementById('grafik-ip');
  document.querySelectorAll('.chart .on').forEach(x => x !== n && x.classList.remove('on'));
  if (!n) { if (ip && e.type !== 'pointerout') ip.hidden = true; return; }
  if (!ip) { ip = document.createElement('div'); ip.id = 'grafik-ip'; ip.className = 'grafik-ip'; document.body.appendChild(ip); }
  const d = n.dataset;
  if (d.ip != null) ip.innerHTML = d.ip;
  else {
    const gunAd = dObj(d.tarih).toLocaleDateString('tr-TR', { weekday: 'long' }), f = d.fark != null ? Number(d.fark) : null;
    ip.innerHTML = `<div class="ip-t">${fmtDate(d.tarih)} · ${gunAd}</div><b>${esc(d.deger)}</b>${f != null
      ? ` <span class="${f < 0 ? 'down' : f > 0 ? 'up' : 'muted'}">${f > 0 ? '+' : f < 0 ? '−' : '±'}${fmtNum(Math.abs(f))} ${esc(d.birim)}</span>` : ' <span class="muted">ilk ölçüm</span>'}`;
  }
  n.classList.add('on');
  ip.hidden = false;
  const r = (n.querySelector('.n') || n).getBoundingClientRect(), w = ip.offsetWidth, h = ip.offsetHeight;
  const cx = r.left + r.width / 2;
  ip.style.left = Math.round(Math.min(Math.max(cx - w / 2, 8), innerWidth - w - 8)) + 'px';
  ip.style.top = Math.round(r.top - h - 10 < 8 ? r.bottom + 10 : r.top - h - 10) + 'px';
}
document.addEventListener('pointerover', grafikIpucu);
document.addEventListener('pointerdown', grafikIpucu);
document.addEventListener('pointerout', e => {
  if (e.pointerType !== 'mouse' || !e.target.closest || !e.target.closest(IPUCU_SEC)) return;
  if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(IPUCU_SEC) === e.target.closest(IPUCU_SEC)) return;
  const ip = document.getElementById('grafik-ip'); if (ip) ip.hidden = true;
  e.target.closest(IPUCU_SEC).classList.remove('on');
});
addEventListener('scroll', () => { const ip = document.getElementById('grafik-ip'); if (ip) ip.hidden = true; }, { passive: true, capture: true });
addEventListener('hashchange', () => { const ip = document.getElementById('grafik-ip'); if (ip) ip.hidden = true; });

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
  if (!fromListId) opts.push({ k: 'veri', id: 0, t: 'Eski listeden aktar', s: 'Google Dokümanlar\'daki ya da Word\'deki listeyi yapıştırın — yeni tasarıma çevrilir' });
  templates.forEach(t => opts.push({ k: 'sablon', id: t.id, t: t.ad, s: t.aciklama || 'Şablon' }));
  opts.push({ k: 'bos', id: 0, t: 'Boş liste', s: 'Standart öğün saatleriyle boş başlar' });
  const m = modal({
    title: 'Yeni diyet listesi', size: 'lg',
    body: `<div class="fg" style="margin-bottom:16px">
        <label class="f">Tarih<input class="i" id="nl-t" type="date" value="${todayIso()}"></label>
        <label class="f">Kilo (kg)<input class="i" id="nl-k" type="number" step="0.1" inputmode="decimal" value="${esc(c.son_kilo ?? '')}"></label>
        <label class="f span2">Liste adı (isteğe bağlı)<input class="i" id="nl-b" placeholder="Örn. 2. hafta, Ramazan listesi…"></label></div>
      <div class="muted small" style="margin-bottom:8px;font-weight:600">Nereden başlansın?</div>
      <div class="pick" id="nl-p">${opts.map((o, i) => `<button type="button" class="pick-item ${i === 0 ? 'on' : ''}" data-i="${i}"><div class="t">${esc(o.t)}</div><div class="small muted">${esc(o.s)}</div></button>`).join('')}</div>
      <div id="nl-aktar" class="aktar hidden">
        <div class="aktar-kutu" id="nl-yap" contenteditable="true" role="textbox" aria-label="Eski listeyi buraya yapıştırın"></div>
        <div class="row" style="margin-top:8px;gap:8px;align-items:center">
          <label class="btn sm">${ic('file')}Word dosyası seç<input type="file" id="nl-dosya" accept=".docx,.txt,.html,.htm" hidden></label>
          <span class="muted small">Google Dokümanlar: listeyi açın → tümünü seçin (⌘A) → kopyalayın (⌘C) → kutuya yapıştırın (⌘V).</span>
        </div>
        <div id="nl-ozet" class="aktar-ozet"></div>
      </div>`,
    foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="nl-ok">Oluştur ve düzenle</button>`,
  });
  let sel = 0;
  const aktarGoster = (kaydir = false) => {
    const ac = opts[sel].k === 'veri';
    $('#nl-aktar', m.el).classList.toggle('hidden', !ac);
    // Şablon çoksa kutu aşağıda kalır: görünür alana getir
    if (ac && kaydir) { $('#nl-aktar', m.el).scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#nl-yap', m.el).focus({ preventScroll: true }); }
  };
  $('#nl-p', m.el).onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; sel = Number(b.dataset.i); $$('.pick-item', m.el).forEach(x => x.classList.toggle('on', x === b)); aktarGoster(true); };
  $('#nl-p', m.el).ondblclick = () => $('#nl-ok', m.el).click();

  // ---- eski listeden aktar: yapıştır ya da Word dosyası → ayrıştır → özet ----
  let aktarilan = null;
  const ozetYaz = async kaynak => {
    const $o = $('#nl-ozet', m.el);
    try {
      const r = await EskiListe.oku(kaynak, { unvan: S.brand.unvan || '' });
      const ogun = r.data.sections.reduce((t, s) => t + s.rows.length, 0);
      if (!ogun) { aktarilan = null; $o.innerHTML = '<b style="color:var(--kirmizi)">Öğün tablosu bulunamadı.</b> Listenin tamamını kopyaladığınızdan emin olun.'; return; }
      aktarilan = r;
      if (r.tarih) $('#nl-t', m.el).value = r.tarih;
      if (r.kilo) $('#nl-k', m.el).value = r.kilo;
      $o.innerHTML = `<b style="color:var(--yesil, #3F6A22)">✓ Okundu:</b> ${r.data.sections.length} bölüm · ${ogun} öğün · ${r.data.notes.length} not${r.data.recipes.length ? ` · ${r.data.recipes.length} tarif` : ''}${r.data.ekNot ? ' · ek bilgi notu' : ''}${r.tarih ? ` · tarih ${fmtDate(r.tarih)}` : ''}${r.kilo ? ` · ${fmtNum(r.kilo)} kg` : ''}
        <ul>${r.data.sections.map(s => `<li><b>${esc(s.title)}</b>: ${s.rows.map(x => esc([x.label, x.time].filter(Boolean).join(' '))).join(', ')}</li>`).join('')}</ul>
        <span class="muted">Oluşturunca liste açılır; gerekirse düzeltin.</span>`;
    } catch (e) { aktarilan = null; $o.innerHTML = `<b style="color:var(--kirmizi)">${esc(e.message)}</b>`; }
  };
  $('#nl-yap', m.el).addEventListener('paste', e => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html'), metin = e.clipboardData.getData('text/plain');
    $('#nl-yap', m.el).textContent = '✓ Yapıştırıldı';
    ozetYaz({ html, metin });
  });
  $('#nl-dosya', m.el).onchange = e => { const f = e.target.files[0]; if (f) { $('#nl-yap', m.el).textContent = '✓ ' + f.name; ozetYaz({ dosya: f }); } };
  aktarGoster();

  $('#nl-ok', m.el).onclick = async () => {
    const o = opts[sel];
    if (o.k === 'veri' && !aktarilan) return toast('Önce eski listeyi kutuya yapıştırın ya da Word dosyasını seçin');
    try {
      const r = await api(`/clients/${c.id}/lists`, { method: 'POST', body: { kaynak: o.k, sablonId: o.id, listeId: o.id, tarih: $('#nl-t', m.el).value, kilo: $('#nl-k', m.el).value, baslik: $('#nl-b', m.el).value, data: o.k === 'veri' ? aktarilan.data : undefined } });
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

// ============ WhatsApp'tan gönder: diyet listesi (PDF) + sonraki görüşme tarihi ============
// PDF ile mesaj paylaşım menüsünden birlikte gider (Mac/iPhone/iPad; Mac'te WhatsApp uygulaması gerekir) — WhatsApp Web'e
// dışarıdan dosya eklenemiyor. PDF pencere açılınca hazırlanır: paylaşım menüsü dokunuşun hemen ardından açılmalı (Safari kuralı).
// Tarih saatsiz yazılır (saatler değişebiliyor). Mesaj şablonu Ayarlar → WhatsApp mesajı.
const tarihGunlu = iso => { const d = dObj(iso); return `${d.getDate()} ${AY_U[d.getMonth()]} ${GUN_U[wIdx(iso)]}`; };
// sablon: { acilis, liste, tarih, kapanis } — {ad}, {tarih}, {unvan} yerine konur; liste/tarih satırı yalnızca gerekince
function waMesaj(sablon, ad, listeVar, tarih) {
  const doldur = t => String(t || '').replace(/\{ad\}/g, (ad || '').split(' ')[0]).replace(/\{tarih\}/g, tarih ? tarihGunlu(tarih) : '')
    .replace(/\{unvan\}/g, S.brand.unvan || '').trim();
  const satir = [doldur(sablon.acilis)];
  if (listeVar) satir.push(doldur(sablon.liste));
  if (tarih) satir.push(doldur(sablon.tarih));
  satir.push('', doldur(sablon.kapanis));
  return satir.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
async function pdfDosyasi(id, ad) {
  const r = await fetch(pdfUrl(id));
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'PDF oluşturulamadı');
  return new File([await r.blob()], ad, { type: 'application/pdf' });
}
// Metni panoya eşzamanlı kopyalar (dokunuş anında; paylaşım menüsünü engellemez)
function panoyaKopyala(metin) {
  const t = document.createElement('textarea');
  t.value = metin; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.append(t); t.select();
  try { document.execCommand('copy'); } catch { /* */ }
  t.remove();
}
// c: { id, ad_soyad, telefon }; listeId: gönderilecek liste (yoksa yalnızca tarih)
async function waGonder(c, listeId = null) {
  const [d, ayar] = await Promise.all([api('/clients/' + c.id), api('/settings')]);
  const sonraki = [...d.appointments].reverse().find(a => a.durum === 'planli' && a.tarih >= todayIso());
  const listeler = d.lists;
  let lid = listeId ?? listeler[0]?.id ?? null;
  const tel = waPhone(d.telefon);
  const paylasVar = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] }));
  const m = modal({ title: 'WhatsApp\'tan gönder', body: `
    <p class="muted small" style="margin-top:0">${esc(d.ad_soyad)}${tel ? ` · ${esc(d.telefon)}` : ' · <b style="color:var(--kirmizi)">telefon kayıtlı değil</b>'}</p>
    <div class="fg" style="grid-template-columns:1fr">
      <label class="f">Diyet listesi<select class="i" id="wg-l"><option value="">Liste gönderme (yalnızca mesaj)</option>${listeler.map(l => `<option value="${l.id}" ${l.id == lid ? 'selected' : ''}>${esc(l.baslik || 'Diyet listesi')} · ${fmtDate(l.tarih)}</option>`).join('')}</select></label>
      <label class="f">Sonraki görüşme tarihi <span class="muted small">(saat yazılmaz; boşsa mesajda olmaz)</span><input class="i" type="date" id="wg-t" value="${esc(sonraki?.tarih || '')}"></label>
      <div class="f"><span>Mesaj</span>${emojiAlan('wg-m', 6)}</div>
    </div>
    <p class="muted small" id="wg-ipucu" style="margin-bottom:0"></p>`,
  foot: `<button class="btn" data-close>Vazgeç</button><a class="btn" id="wg-mesaj" target="_blank" rel="noopener">${ic('wa')}Yalnızca mesaj</a><button class="btn hidden" id="wg-indir">${ic('wa')}PDF indir + WhatsApp Web</button><button class="btn primary" id="wg-gonder">${ic('share')}<span>Gönder</span></button>` });
  emojiBagla(m.el);
  const $l = $('#wg-l', m.el), $t = $('#wg-t', m.el), $m = $('#wg-m', m.el), $g = $('#wg-gonder', m.el), $a = $('#wg-mesaj', m.el);
  let elle = false;
  // "Yalnızca mesaj" gerçek bir link: Safari web uygulamasında açılır pencere engeline takılmaz
  const linkYaz = () => { $a.href = waLink(tel, $m.value); };
  const yaz = () => { if (!elle) $m.value = waMesaj(ayar.waSablon, d.ad_soyad, !!lid, $t.value); linkYaz(); };
  $m.addEventListener('input', () => { elle = true; linkYaz(); });
  $a.onclick = () => setTimeout(() => m.close(), 300);

  // PDF arka planda hazırlanır; hazır olunca "Gönder" tek dokunuşla paylaşım menüsünü açar
  let dosya = null, hazirlanan = null;
  const durum = () => {
    const ip = $('#wg-ipucu', m.el);
    if (!lid) { $g.disabled = !paylasVar; $g.querySelector('span').textContent = 'Gönder'; }
    else if (!dosya) { $g.disabled = true; $g.querySelector('span').textContent = 'PDF hazırlanıyor…'; }
    else { $g.disabled = false; $g.querySelector('span').textContent = paylasVar ? 'Gönder (PDF + mesaj)' : 'PDF indir + WhatsApp Web'; }
    // Paylaşım menüsünde WhatsApp çıkmazsa (Mac) her zaman çalışan yol: PDF iner + WhatsApp Web açılır
    $('#wg-indir', m.el).classList.toggle('hidden', !(paylasVar && dosya && !matchMedia('(pointer: coarse)').matches));
    ip.innerHTML = paylasVar
      ? 'Paylaşım menüsünde <b>WhatsApp</b>\'ı ve kişiyi seçin; PDF ve mesaj birlikte gider. Mesaj panoya da kopyalanır — görünmezse yapıştırın.'
        + (matchMedia('(pointer: coarse)').matches ? '' : ' Menüde WhatsApp yoksa <b>PDF indir + WhatsApp Web</b>: sohbet açılır, inen PDF\'i Safari\'nin indirilenler okundan sohbete sürükleyin.')
      : 'Bu tarayıcı dosya paylaşımını desteklemiyor: PDF indirilir, WhatsApp Web açılır; PDF\'i sohbete sürükleyin.';
  };
  const hazirla = () => {
    dosya = null; durum();
    if (!lid) return;
    const benim = lid, ad = pdfName(d.ad_soyad, listeler.find(l => l.id == lid)?.tarih || todayIso());
    hazirlanan = benim;
    pdfDosyasi(benim, ad).then(f => { if (hazirlanan === benim) { dosya = f; durum(); } })
      .catch(e => { if (hazirlanan === benim) { $g.querySelector('span').textContent = 'PDF hazırlanamadı'; onErr(e); } });
  };
  $l.onchange = () => { lid = $l.value || null; yaz(); hazirla(); };
  $t.onchange = yaz;
  yaz(); hazirla();

  // Eşzamanlı: önce pencere, sonra indirme (araya bekleme girmez → engellenmez)
  const indirWeb = () => {
    window.open(waLink(tel, $m.value), '_blank', 'noopener');
    if (dosya) indirBlob(dosya, dosya.name);
    m.close(); toast(dosya ? 'PDF indirildi — WhatsApp Web\'de sohbete sürükleyin' : 'WhatsApp açıldı');
  };
  $('#wg-indir', m.el).onclick = indirWeb;
  $g.onclick = async () => {
    const metin = $m.value;
    if (!paylasVar) return indirWeb();
    panoyaKopyala(metin);
    const veri = dosya ? { files: [dosya], text: metin } : { text: metin };
    try { await navigator.share(veri); m.close(); toast('Gönderildi'); }
    catch (e) {
      if (e.name === 'AbortError') return;
      if (e.name === 'NotAllowedError') return toast('Tekrar "Gönder"e dokunun');
      onErr(e);
    }
  };
}

// ---------- emoji: mesaj kutularına seçerek ekleme ----------
const EMOJILER = '🌿 🍃 🌱 🥗 🍎 🍓 🥑 🥦 🥕 🍋 🫐 🥛 💧 🍵 ☕ 🏃‍♀️ 💪 🧘‍♀️ 🚶‍♀️ ⚖️ 📅 🗓️ ⏰ 📄 ✅ ✨ 🌸 🌼 ☀️ 🌙 😊 🥰 😍 🤗 🙏 👏 👍 🎉 💚 🤍 ❤️ 🫶 💫 ⭐ 🔥 📌'.split(' ');
function emojiAlan(id, rows = 3, deger = '', ad = '') {
  return `<div class="emoji-alan"><textarea class="i" id="${id}" ${ad ? `name="${ad}"` : ''} rows="${rows}">${esc(deger)}</textarea>
    <button type="button" class="btn sm ghost emoji-ac" data-emoji-for="${id}" title="Emoji ekle" aria-label="Emoji ekle">😊</button>
    <div class="emoji-pano hidden" data-emoji-pano="${id}">${EMOJILER.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div></div>`;
}
function emojiBagla(kok) {
  $$('.emoji-alan', kok).forEach(al => {
    const ta = $('textarea', al), pano = $('.emoji-pano', al);
    let imlec = null;
    const kaydet = () => { imlec = [ta.selectionStart, ta.selectionEnd]; };
    ['keyup', 'click', 'input', 'blur'].forEach(o => ta.addEventListener(o, kaydet));
    $('.emoji-ac', al).onclick = () => pano.classList.toggle('hidden');
    pano.onclick = e => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      const [a, z] = imlec || [ta.value.length, ta.value.length];
      ta.value = ta.value.slice(0, a) + b.dataset.e + ta.value.slice(z);
      const yeni = a + b.dataset.e.length;
      imlec = [yeni, yeni];
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      if (window.innerWidth > 820) { ta.focus(); ta.setSelectionRange(yeni, yeni); }
    };
  });
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
  const change = (yazi = false) => {
    ed.dirty = true; setState('Değişiklikler kaydedilecek…', true); autosave();
    // Geri al: yazı yazarken kısa duraklamalarda, silme/taşıma gibi işlemlerde hemen kayıt
    if (yazi) { yaziGecmis(); const g = $('#e-geri'); if (g) g.disabled = false; } else kayitGecmis();
  };

  // ---- geri al / yinele (liste verisinin önceki hâlleri; ⌘Z / Ctrl+Z, ⌘⇧Z / Ctrl+Y) ----
  const G = { geri: [], ileri: [], son: JSON.stringify(ed.data) };
  const gecmisDugme = () => { const a = $('#e-geri'), b = $('#e-ileri'); if (a) a.disabled = !G.geri.length; if (b) b.disabled = !G.ileri.length; };
  function kayitGecmis() {
    yaziGecmis.cancel();
    const s = JSON.stringify(ed.data);
    if (s === G.son) return gecmisDugme();
    G.geri.push(G.son); if (G.geri.length > 200) G.geri.shift();
    G.ileri = []; G.son = s; gecmisDugme();
  }
  const yaziGecmis = debounce(() => kayitGecmis(), 700);
  const gecmisUygula = yon => {
    kayitGecmis();   // yazılıp henüz kaydedilmemiş harfler de bir adım sayılır
    const kaynak = yon < 0 ? G.geri : G.ileri, hedef = yon < 0 ? G.ileri : G.geri;
    if (!kaynak.length) return toast(yon < 0 ? 'Geri alınacak bir şey yok' : 'Yinelenecek bir şey yok');
    hedef.push(G.son); G.son = kaynak.pop();
    ed.data = JSON.parse(G.son); ed.imlec = null;
    renderSecs(); renderNotes(); renderRecs();
    $$('[data-foot]').forEach(i => { i.value = ed.data[i.dataset.foot] ?? ''; });
    gecmisDugme();
    ed.dirty = true; setState('Değişiklikler kaydedilecek…', true); autosave();
    toast(yon < 0 ? 'Geri alındı' : 'Yinelendi');
  };
  const tusGecmis = e => {
    if (S.editor !== ed || !document.body.contains($('#ed-root'))) return document.removeEventListener('keydown', tusGecmis);
    if (!(e.ctrlKey || e.metaKey) || e.altKey || $('.modal-bg')) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); gecmisUygula(-1); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); gecmisUygula(1); }
  };
  document.addEventListener('keydown', tusGecmis);
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
    <button class="btn sm" id="e-ara" title="Ara ve listeye ekle: tarif, hazır metin, eski liste…" aria-label="Ara">${ic('search')}<span>Ara</span></button>
    ${isList ? `
      <button class="btn sm" id="e-tpl" title="Şablon olarak kaydet">${ic('save')}<span>Şablon yap</span></button>
      <button class="btn sm" id="e-pv">${ic('eye')}<span>Önizleme</span></button>
      <button class="btn sm" id="e-wa">${ic('wa')}<span>WhatsApp</span></button>
      <button class="btn sm" id="e-share">${ic('share')}<span>Paylaş</span></button>
      <button class="btn sm primary" id="e-pdfy">${ic('pdf')}<span>PDF</span></button>` : `<button class="btn sm danger" id="e-delt">${ic('trash')}<span>Şablonu sil</span></button>`}
  </div>
  <div class="ed-wrap ${ed.preview ? 'with-preview' : ''}" id="e-wrap">
    <div>
      ${isList && obj.client.onemli ? `<div class="onemli kucuk">${ic('alert')}<div class="grow">${esc(obj.client.onemli)}</div></div>` : ''}
      <div class="card fs" style="margin-bottom:18px"><div class="fg">
        ${isList ? `
          <label class="f">Tarih<input class="i" id="e-tarih" type="date" value="${esc(obj.tarih)}"></label>
          <label class="f">Kilo (kg)<input class="i" id="e-kilo" type="number" step="0.1" inputmode="decimal" value="${esc(obj.kilo ?? '')}"></label>
          <label class="f span2">Liste adı (PDF'te görünmez)<input class="i" id="e-baslik" value="${esc(obj.baslik ?? '')}" placeholder="Örn. 3. hafta"></label>` : `
          <label class="f span2">Şablon adı<input class="i" id="e-ad" value="${esc(obj.ad)}"></label>
          <label class="f span2">Açıklama<input class="i" id="e-acik" value="${esc(obj.aciklama ?? '')}"></label>`}
      </div></div>
      <div class="ed-gecmis" id="e-gecmis"><span class="ed-gecmis-ad">Diyet yazıları</span>
        <button class="btn sm" id="e-geri" title="Geri al (⌘Z / Ctrl+Z)" aria-label="Geri al" disabled>${ic('undo')}<span>Geri al</span></button>
        <button class="btn sm" id="e-ileri" title="Yinele (⌘⇧Z / Ctrl+Y)" aria-label="Yinele" disabled>${ic('redo')}<span>Yinele</span></button></div>
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
  let hedefGoster = () => {};   // yan panel açıkken eklenecek öğünü işaretler (aşağıda kurulur)

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
              <textarea data-s="${si}" data-r="${ri}" data-f="content" rows="3" placeholder="Öğün içeriği… (her seçenek yeni satırda)">${esc(ogunGoster(r.content))}</textarea>
              ${linkKutulari(r, si, ri)}
              <div class="row"><button class="btn sm ghost" data-act="link" data-s="${si}" data-r="${ri}" title="Link, imlecin bulunduğu satırın hemen altına eklenir">${ic('link')}Tarif linki</button><button class="btn sm ghost" data-act="lib" data-s="${si}" data-r="${ri}">${ic('book')}Hazır metin ekle</button></div>
            </div>
          </div>`).join('')}
        <div class="sec-foot"><button class="btn sm" data-act="radd" data-s="${si}">${ic('plus')}Öğün ekle</button></div>
      </div>`).join('') || '<div class="card empty" style="margin-bottom:18px">Henüz bölüm yok.</div>';
    requestAnimationFrame(() => $$('#e-secs textarea').forEach(autosize));
    hedefGoster();
  }
  // Öğündeki tarif linkleri: sürükleyip başka öğüne bırakılır; oklarla öğün yazısındaki yeri değişir; "Taşı" ile öğün seçilir
  function linkKutulari(r, si, ri) {
    const satir = linkSatirlari(r.content), eski = r.links || [];
    if (!satir.length && !eski.length) return '';
    const d = `data-s="${si}" data-r="${ri}"`;
    const tut = '<span class="tutamak" title="Sürükleyip başka öğüne bırakın" aria-hidden="true">' + ic('tutamak') + '</span>';
    return `<div class="lchips"><span class="lchips-ad">Tarif linkleri</span>${satir.map(l => `<span class="lchip tasinir" data-tur="link" ${d} data-li="${l.i}">${tut}${ic('link')}<a href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.url)}" draggable="false">${esc(l.title)}</a>
        <button class="tbtn" data-act="lyuk" ${d} data-li="${l.i}" title="Yazıda bir satır yukarı" ${linkYeri(r.content, l.i, -1) == null ? 'disabled' : ''}>${ic('up')}</button>
        <button class="tbtn" data-act="lasa" ${d} data-li="${l.i}" title="Yazıda bir satır aşağı" ${linkYeri(r.content, l.i, 1) == null ? 'disabled' : ''}>${ic('down')}</button>
        <button class="tbtn" data-act="ltasi" ${d} data-li="${l.i}" title="Başka öğüne taşı">${ic('tasi')}</button>
        <button class="tbtn del" data-act="lsil" ${d} data-li="${l.i}" title="Linki kaldır">${ic('x')}</button></span>`).join('')}${eski.map((l, li) => `<span class="lchip tasinir" data-tur="link" ${d} data-l="${li}">${tut}${ic('link')}<a href="${esc(l.url)}" target="_blank" rel="noopener" draggable="false">${esc(l.title || l.url)}</a>
        <button class="tbtn" data-act="ltasi" ${d} data-l="${li}" title="Başka öğüne taşı">${ic('tasi')}</button>
        <button class="tbtn del" data-act="ldel" ${d} data-l="${li}" title="Linki kaldır">${ic('x')}</button></span>`).join('')}</div>`;
  }
  // Linki bir öğünden alır (metindeki satırı ya da eski kutucuğu siler), satır metnini döndürür
  function linkAl(si, ri, li, l) {
    const r = ed.data.sections[si].rows[ri];
    if (l != null) { const x = r.links.splice(l, 1)[0]; return `🔗 ${(x.title || 'Tarifi izle').trim()} ${x.url}`; }
    const sat = r.content.split('\n'), t = sat.splice(li, 1)[0].trim();
    r.content = sat.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\s+$/g, '');
    return t;
  }
  // Linki başka yere taşır. satir: hedef öğün yazısında "bu satırın önüne" (satır no); null → sona.
  // Satır başlığıyla birlikte taşınır ("🔗 Başlık https://…").
  function linkTasi(kaynak, si2, ri2, satir = null) {
    const { si, ri, li, l } = kaynak;
    const h = ed.data.sections[si2].rows[ri2];
    if (si === si2 && ri === ri2 && l == null) {
      if (satir == null) satir = h.content.split('\n').length;
      if (satir === li || satir === li + 1) return;   // yeri değişmiyor
      const sat = h.content.split('\n'), t = sat.splice(li, 1)[0];
      sat.splice(satir > li ? satir - 1 : satir, 0, t);
      h.content = sat.join('\n');
    } else {
      const t = linkAl(si, ri, li, l), c = h.content || '';
      if (satir == null || !c.trim()) h.content = c.replace(/\s+$/, '') + (c.trim() ? '\n' : '') + t;
      else { const sat = c.split('\n'); sat.splice(Math.min(satir, sat.length), 0, t); h.content = sat.join('\n'); }
    }
    ed.imlec = null; renderSecs(); change();
    const m = $(`#e-secs textarea[data-s="${si2}"][data-r="${ri2}"]`)?.closest('.meal');
    if (m) { m.classList.add('birakildi'); setTimeout(() => m.classList.remove('birakildi'), 1400); }
    toast(si === si2 && ri === ri2 ? 'Linkin yeri değişti' : `Link ${h.label || 'öğün'} öğününe taşındı`);
  }
  // "Taşı" penceresi: önce öğün, sonra o öğünün satırları arasından yer seçilir (telefonda sürüklemeden kolay)
  function linkTasiSec(kaynak) {
    const secs = ed.data.sections;
    const yerler = (si, ri) => {
      const sat = (secs[si].rows[ri].content || '').split('\n'), ayni = si === kaynak.si && ri === kaynak.ri && kaynak.l == null;
      const dug = (k, t) => (ayni && (k === kaynak.li || k === kaynak.li + 1)) ? '' : `<button class="tasi-yer" data-si="${si}" data-ri="${ri}" data-k="${k}">${ic('plus')}${t}</button>`;
      if (!sat.join('').trim()) return dug(0, 'Buraya ekle');
      let out = dug(0, 'En üste');
      sat.forEach((t, i) => {
        if (!t.trim()) return;
        const bu = ayni && i === kaynak.li;
        out += `<div class="tasi-satir ${bu ? 'bu' : ''}">${bu ? '<b>(taşınan link)</b> ' : ''}${esc(t)}</div>` + dug(i + 1, i === sat.length - 1 || !sat.slice(i + 1).join('').trim() ? 'En alta' : 'Buraya');
      });
      return out;
    };
    const m = modal({ title: 'Linki nereye taşıyalım?', size: 'lg', body: `<p class="muted small" style="margin:0 0 10px">Öğünü seçin, sonra yazıdaki yerini “Buraya” ile seçin.</p>` + secs.map((s, si) => `${secs.length > 1 ? `<div class="yp-grup">${esc(s.title || `Bölüm ${si + 1}`)}</div>` : ''}${s.rows.map((r, ri) =>
      `<div class="tasi-ogun ${si === kaynak.si && ri === kaynak.ri ? 'acik' : ''}"><button class="tasi-ogun-b" data-ac="${si}:${ri}">${ic('down')}<b>${esc([r.label, r.time].filter(Boolean).join(' ') || 'Öğün')}</b>${si === kaynak.si && ri === kaynak.ri ? ' <span class="muted small">(şu an burada)</span>' : ''}</button><div class="tasi-yerler">${yerler(si, ri)}</div></div>`).join('')}`).join('') });
    m.el.addEventListener('click', e => {
      const ac = e.target.closest('[data-ac]'); if (ac) return ac.parentElement.classList.toggle('acik');
      const b = e.target.closest('.tasi-yer'); if (!b) return;
      m.close(); kayitGecmis(); linkTasi(kaynak, Number(b.dataset.si), Number(b.dataset.ri), Number(b.dataset.k));
    });
  }
  const tutamak = '<span class="tutamak" title="Sürükleyerek sırasını değiştirin" aria-hidden="true">' + ic('tutamak') + '</span>';
  const sirala = (dizi, i, ad) => `<button class="tbtn" data-${ad}mv="-1" data-i="${i}" title="Yukarı" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button><button class="tbtn" data-${ad}mv="1" data-i="${i}" title="Aşağı" ${i === dizi.length - 1 ? 'disabled' : ''}>${ic('down')}</button>`;
  function renderNotes() {
    $('#e-notes').innerHTML = ed.data.notes.map((n, i) => `<div class="note-row tasinir" data-tur="not" data-i="${i}">${tutamak}<input class="i" data-note="${i}" value="${esc(n)}">${sirala(ed.data.notes, i, 'n')}<button class="tbtn del" data-ndel="${i}" title="Sil">${ic('trash')}</button></div>`).join('')
      || '<div class="muted small" style="margin-bottom:10px">Not yok.</div>';
  }
  function renderRecs() {
    $('#e-recs').innerHTML = ed.data.recipes.map((r, i) => `<div class="rec-kutu tasinir" data-tur="tarif" data-i="${i}"><div class="note-row">${tutamak}<input class="i" data-rec="${i}" data-rf="title" value="${esc(r.title)}" placeholder="Tarif adı" style="font-weight:600">${sirala(ed.data.recipes, i, 'r')}<button class="tbtn del" data-rdel="${i}" title="Sil">${ic('trash')}</button></div>
      <div class="note-row" style="margin-top:8px">${ic('link', 'width="18" height="18" style="color:var(--silik);flex:none"')}<input class="i" data-rec="${i}" data-rf="url" value="${esc(r.url || '')}" placeholder="Tarif linki (Instagram, YouTube, blog…) — PDF'te tıklanabilir + QR" inputmode="url"></div>
      <textarea class="i" data-rec="${i}" data-rf="body" rows="4" placeholder="Malzemeler / yapılışı (isteğe bağlı)" style="margin-top:8px">${esc(r.body)}</textarea></div>`).join('') || '<div class="muted small" style="margin-bottom:10px">Tarif yok.</div>';
  }
  renderSecs(); renderNotes(); renderRecs();

  // --- giriş olayları (yeniden çizim yapmadan) ---
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.f) {
      const s = ed.data.sections[t.dataset.s];
      if (t.dataset.f === 'content') s.rows[t.dataset.r].content = ogunGeriCevir(t.value, s.rows[t.dataset.r].content);
      else if (t.dataset.r !== undefined) s.rows[t.dataset.r][t.dataset.f] = t.value; else s[t.dataset.f] = t.value;
      if (t.tagName === 'TEXTAREA') autosize(t);
    } else if (t.dataset.note !== undefined) ed.data.notes[t.dataset.note] = t.value;
    else if (t.dataset.rec !== undefined) ed.data.recipes[t.dataset.rec][t.dataset.rf] = t.value;
    else if (t.dataset.foot) { if (t.value.trim()) ed.data[t.dataset.foot] = t.value; else delete ed.data[t.dataset.foot]; }
    else if (!['e-tarih', 'e-kilo', 'e-baslik', 'e-ad', 'e-acik'].includes(t.id)) return;
    change(true);
  });
  // Öğün metninde imlecin yeri: "Tarif linki" o satırın altına eklenir
  const imlecKaydet = e => {
    const t = e.target;
    if (t.tagName === 'TEXTAREA' && t.dataset.f === 'content') {
      const once = ed.imlec;
      ed.imlec = { si: Number(t.dataset.s), ri: Number(t.dataset.r), pos: t.selectionEnd };
      if (!once || once.si !== ed.imlec.si || once.ri !== ed.imlec.ri) hedefGoster();
    }
  };
  ['keyup', 'click', 'input', 'select', 'focusin'].forEach(o => root.addEventListener(o, imlecKaydet));
  // Herhangi bir düğmeye basmadan önce yazılanlar ayrı bir geri alma adımı olsun
  root.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('#e-geri, #e-ileri')) kayitGecmis(); }, true);
  // Geri al / Yinele çubuğu kaydırınca üst çubuğun hemen altında dursun: üst çubuğun yüksekliği CSS değişkenine
  const edBar = $('.ed-bar', root);
  const barYuk = () => root.style.setProperty('--edbar', edBar.offsetHeight + 'px');
  barYuk(); if (window.ResizeObserver) new ResizeObserver(barYuk).observe(edBar);
  // Yan arama paneli: sayfadan çıkmadan ara, bulunanı seçili öğüne / tariflere / notlara yaz
  function ogunaYaz(txt) {
    const h = ed.imlec, r = h && ed.data.sections[h.si]?.rows[h.ri];
    if (!r) { toast('Önce eklenecek öğünü seçin'); $('#yp-ogun')?.focus(); return false; }
    kayitGecmis();
    const c = r.content || '', t = String(txt || '').replace(/^\s+|\s+$/g, '');
    let pos;
    if (!c.trim()) { r.content = t; pos = ogunGoster(t).length; }
    else {   // imlecin bulunduğu satırın altına (imleç yoksa sona)
      const k = imlecSatiri(c, h.pos), sat = c.split('\n');
      sat.splice(k + 1, 0, t); r.content = sat.join('\n');
      pos = ogunGoster(sat.slice(0, k + 2).join('\n')).length;
    }
    ed.imlec = { si: h.si, ri: h.ri, pos };
    renderSecs(); change();
    const ta = $(`#e-secs textarea[data-s="${h.si}"][data-r="${h.ri}"]`);
    if (ta) { ta.classList.add('ara-bulundu'); setTimeout(() => ta.classList.remove('ara-bulundu'), 1600); ta.closest('.meal').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    toast(`${r.label || 'Öğün'} öğününe eklendi`);
    return true;
  }
  const yp = yanAramaPaneli(root, {
    blocks,
    hedef: () => { const h = ed.imlec, s = h && ed.data.sections[h.si], r = s?.rows[h.ri]; return r ? { si: h.si, ri: h.ri, ogun: r.label || 'Öğün', saat: r.time, bolum: ed.data.sections.length > 1 ? s.title : '' } : null; },
    ogunler: () => ed.data.sections.map((s, si) => ({ bolum: s.title || `Bölüm ${si + 1}`, satirlar: s.rows.map((r, ri) => ({ si, ri, ad: [r.label, r.time].filter(Boolean).join(' ') || 'Öğün' })) })),
    hedefSec: (si, ri) => { const r = ed.data.sections[si]?.rows[ri]; if (!r) return; ed.imlec = { si, ri, pos: (r.content || '').length }; hedefGoster(); },
    ogunaYaz,
    tarifeEkle: t => { kayitGecmis(); ed.data.recipes.push(t); renderRecs(); change(); toast('Tarifler bölümüne eklendi (listenin sonunda)'); },
    notaEkle: t => { kayitGecmis(); ed.data.notes.push(t); renderNotes(); change(); toast('Önemli notlara eklendi'); },
    linkYaz: l => ogunaYaz(`🔗 ${(l.title || 'Tarifi izle').trim()} ${l.url}`),
  });
  hedefGoster = () => {
    $$('#e-secs .meal.hedef').forEach(m => m.classList.remove('hedef'));
    const h = ed.imlec, ta = h && $(`#e-secs textarea[data-s="${h.si}"][data-r="${h.ri}"]`);
    if (ta && root.classList.contains('yp-acik')) ta.closest('.meal').classList.add('hedef');
    yp.hedefYaz();
  };
  $('#e-ara').onclick = () => { yp.degistir(); hedefGoster(); };
  $('#e-geri').onclick = () => gecmisUygula(-1);
  $('#e-ileri').onclick = () => gecmisUygula(1);

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
      case 'lsil': linkAl(si, ri, Number(b.dataset.li)); break;
      case 'lyuk': case 'lasa': {
        const r = secs[si].rows[ri], li = Number(b.dataset.li), j = linkYeri(r.content, li, b.dataset.act === 'lyuk' ? -1 : 1);
        if (j == null) return;
        const sat = r.content.split('\n'), t = sat.splice(li, 1)[0]; sat.splice(j, 0, t); r.content = sat.join('\n');
        ed.imlec = null; renderSecs(); change();
        $(`#e-secs [data-act="${b.dataset.act}"][data-s="${si}"][data-r="${ri}"][data-li="${j}"]`)?.focus();
        return;
      }
      case 'ltasi': return linkTasiSec({ si, ri, li: b.dataset.li != null ? Number(b.dataset.li) : null, l: b.dataset.l != null ? Number(b.dataset.l) : null });
      case 'link': return linkModal(blocks, l => {
        // Link öğün metnine satır olarak girer: imleç bu öğündeyse o satırın altına, değilse metnin sonuna.
        // PDF'te tam o yerde tıklanabilir tarif düğmesi olur ("🔗 Başlık https://…").
        const r = secs[si].rows[ri], c = r.content || '';
        const satir = `🔗 ${(l.title || 'Tarifi izle').trim()} ${l.url}`;
        const im = ed.imlec && ed.imlec.si === si && ed.imlec.ri === ri ? ed.imlec.pos : null;
        if (im == null || !c.trim()) r.content = c.replace(/\s+$/, '') + (c.trim() ? '\n' : '') + satir;
        else { const sat = c.split('\n'); sat.splice(imlecSatiri(c, im) + 1, 0, satir); r.content = sat.join('\n'); }
        ed.imlec = null; renderSecs(); change();
      }, 'Link, öğün metninde imlecin bulunduğu satırın hemen altına eklenir (PDF\'te tam orada görünür). İmleç yoksa metnin sonuna eklenir.');
      case 'lib': return pickBlock(blocks, 'ogun', secs[si].rows[ri].label, txt => {
        const r = secs[si].rows[ri];
        r.content = r.content.trim() ? r.content.replace(/\s+$/, '') + '\n\n' + txt : txt;
        renderSecs(); change();
      });
      default: return;
    }
    ed.imlec = null;
    renderSecs(); change();
  });

  // Sürükle-bırak (fare ve dokunmatik): tutamaktan tutulur. Link → başka öğüne; not/tarif → kendi listesinde yeni yere.
  surukleBirak(root, (kaynak, hedef) => {
    kayitGecmis();
    if (kaynak.dataset.tur === 'link') {
      const ta = $('textarea[data-f="content"]', hedef.meal);
      linkTasi({ si: Number(kaynak.dataset.s), ri: Number(kaynak.dataset.r), li: kaynak.dataset.li != null ? Number(kaynak.dataset.li) : null, l: kaynak.dataset.l != null ? Number(kaynak.dataset.l) : null }, Number(ta.dataset.s), Number(ta.dataset.r), hedef.satir);
    } else {
      const dizi = kaynak.dataset.tur === 'not' ? ed.data.notes : ed.data.recipes;
      const i = Number(kaynak.dataset.i), j = hedef.sira;
      if (j === i || j === i + 1) return;
      dizi.splice(j > i ? j - 1 : j, 0, dizi.splice(i, 1)[0]);
      (kaynak.dataset.tur === 'not' ? renderNotes : renderRecs)(); change();
    }
  });

  $('#e-addsec').onclick = () => { ed.data.sections.push({ title: 'SAĞLIKLI BESLENME PROGRAMI', rows: [{ label: 'SABAH', time: '', content: '' }] }); renderSecs(); change(); };
  $('#e-addnote').onclick = () => { ed.data.notes.push(''); renderNotes(); change(); $$('#e-notes input').pop()?.focus(); };
  $('#e-libnote').onclick = () => pickBlock(blocks, 'not', null, txt => { ed.data.notes.push(txt); renderNotes(); change(); });
  $('#e-addrec').onclick = () => { ed.data.recipes.push({ title: '', body: '', url: '' }); renderRecs(); change(); };
  $('#e-librec').onclick = () => pickBlock(blocks, 'tarif', null, (txt, bl) => { ed.data.recipes.push({ title: bl.baslik, body: txt, url: bl.url || '' }); renderRecs(); change(); });
  $('#e-notes').onclick = e => { { const d = e.target.closest('[data-nmv]'); if (d) { const i = Number(d.dataset.i), j = i + Number(d.dataset.nmv); if (j < 0 || j >= ed.data.notes.length) return; [ed.data.notes[i], ed.data.notes[j]] = [ed.data.notes[j], ed.data.notes[i]]; renderNotes(); change(); return; } } const d = e.target.closest('[data-ndel]'); if (d) { ed.data.notes.splice(d.dataset.ndel, 1); renderNotes(); change(); } };
  $('#e-recs').onclick = e => { { const d = e.target.closest('[data-rmv]'); if (d) { const i = Number(d.dataset.i), j = i + Number(d.dataset.rmv); if (j < 0 || j >= ed.data.recipes.length) return; [ed.data.recipes[i], ed.data.recipes[j]] = [ed.data.recipes[j], ed.data.recipes[i]]; renderRecs(); change(); return; } } const d = e.target.closest('[data-rdel]'); if (d) { ed.data.recipes.splice(d.dataset.rdel, 1); renderRecs(); change(); } };

  if (isList) {
    const fname = () => pdfName(obj.client.ad_soyad, $('#e-tarih').value);
    $('#e-pdfy').onclick = async () => {
      // Yerel: sunucu yok, /api/…/pdf adresi yeni pencerede açılamaz → PDF cihazda hazırlanır (danışan sayfasındaki gibi)
      if (YEREL) { await ed.flush(); return yerelPdfAc(id).catch(onErr); }
      const w = window.open('about:blank', '_blank');   // iOS açılır pencere engeline takılmamak için hemen aç
      await ed.flush();
      const url = pdfUrl(id);
      if (w) w.location.href = url; else location.href = url;
    };
    $('#e-wa').onclick = async () => { await ed.flush(); waGonder(obj.client, id); };
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
      if (!(await confirmBox('Bu şablon silinecek. Daha önce bu şablondan oluşturulan listeler etkilenmez. Gerekirse Ayarlar → Silinenler\'den geri getirebilirsiniz.'))) return;
      autosave.cancel(); ed.dirty = false;
      await api('/templates/' + id, { method: 'DELETE' }); S.editor = null; toast('Şablon silindi'); location.hash = '#/sablonlar';
    };
  }
  // Aramadan gelindiyse: aranan kelimenin geçtiği ilk alana git ve işaretle
  if (S.araVurgu) {
    const kel = katla(S.araVurgu).split(/\s+/).filter(k => k.length >= 2)[0];
    S.araVurgu = null;
    requestAnimationFrame(() => {
      const el = kel && $$('#ed-root textarea, #ed-root input:not([type=date])').find(i => katla(i.value).includes(kel));
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.classList.add('ara-bulundu'); setTimeout(() => el.classList.remove('ara-bulundu'), 3000);
      if (window.innerWidth > 820) { const i = katla(el.value).indexOf(kel); el.focus({ preventScroll: true }); el.setSelectionRange(i, i + kel.length); }
    });
  }
}

window.addEventListener('beforeunload', e => { if (S.editor?.dirty) { S.editor.flush(); e.preventDefault(); } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && S.editor?.dirty) S.editor.flush(); });

// Öğün metnindeki tarif linki satırları (PDF ile aynı kural: "🔗 Başlık https://…" ya da yalnızca link)
const LINK_SATIRI_ED = /^(?:🔗\s*)?(.*?)[\s:|–—-]*(https?:\/\/\S+)$/u;
function linkSatirlari(c) {
  return String(c || '').split('\n').map((t, i) => { const m = t.trim().match(LINK_SATIRI_ED); return m ? { i, title: m[1].trim() || m[2], url: m[2] } : null; }).filter(Boolean);
}
// Yazı alanında link satırı yalnızca başlığıyla görünür ("🔗 Chia puding"); adres saklı kalır, PDF'te düğme olur.
// Başlıksız (yalnızca adres) satır olduğu gibi görünür.
function ogunGoster(c) {
  return String(c || '').split('\n').map(t => { const m = t.trim().match(LINK_SATIRI_ED); return m && m[1].trim() ? `🔗 ${m[1].trim()}` : t; }).join('\n');
}
// Yazı alanındaki metni saklanan biçime çevirir: adressiz "🔗 Başlık" satırlarına önceki metindeki adresler geri konur
// (önce aynı başlıklı link, yoksa sıradaki kullanılmamış link — başlık değiştirilse de adres kaybolmaz)
function ogunGeriCevir(yazi, eski) {
  const linkler = linkSatirlari(eski).filter(l => l.title !== l.url).map(l => ({ ...l, kul: false }));
  const sat = String(yazi).split('\n'), bekleyen = [];
  const out = sat.map((t, i) => {
    const m = t.trim().match(/^🔗\s*(.*)$/u);
    if (!m || /https?:\/\//.test(t)) return t;
    const l = linkler.find(x => !x.kul && x.title === m[1].trim());
    if (l) { l.kul = true; return `🔗 ${m[1].trim()} ${l.url}`; }
    bekleyen.push(i); return t;
  });
  for (const i of bekleyen) { const l = linkler.find(x => !x.kul); if (!l) break; l.kul = true; out[i] = `🔗 ${sat[i].trim().replace(/^🔗\s*/u, '').trim() || l.title} ${l.url}`; }
  return out.join('\n');
}
// Yazı alanındaki imleç konumunun satır numarası (satırlar saklanan metinle birebir aynı sırada)
function imlecSatiri(c, pos) {
  const g = ogunGoster(c);
  return g.slice(0, Math.min(pos ?? g.length, g.length)).split('\n').length - 1;
}
// Link satırının bir satır yukarı/aşağı gideceği yer (boş satırlar atlanır); gidemiyorsa null
function linkYeri(c, li, yon) {
  const sat = String(c || '').split('\n');
  for (let j = li + yon; j >= 0 && j < sat.length; j += yon) if (sat[j].trim()) return j;
  return null;
}
// Textarea'daki her mantıksal satırın ekrandaki üst/alt konumu (kaydırma ve satır kaydırmaları dahil; gizli ayna ile ölçülür)
function satirKonumlari(ta) {
  const cs = getComputedStyle(ta), r = ta.getBoundingClientRect(), m = document.createElement('div');
  for (const p of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'tabSize', 'textIndent']) m.style[p] = cs[p];
  Object.assign(m.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', borderStyle: 'solid', pointerEvents: 'none' });
  m.innerHTML = ta.value.split('\n').map(t => `<div>${esc(t) || '&#8203;'}</div>`).join('');
  document.body.appendChild(m);
  const out = [...m.children].map(c => { const b = c.getBoundingClientRect(); return { top: b.top - ta.scrollTop, bottom: b.bottom - ta.scrollTop }; });
  m.remove();
  return { satirlar: out, sol: r.left + parseFloat(cs.paddingLeft), en: r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
}
// Tutamaktan sürükle-bırak (Pointer Events: fare + dokunmatik). .tasinir öğe tutamağından tutulur;
// link → bırakılan öğüne ({meal}); not/tarif → aynı listede araya ({sira}). Ekran kenarına gelince sayfa kayar.
function surukleBirak(kok, birak) {
  let s = null;
  const temizle = () => { $$('.birak-hedef, .birak-ust, .birak-alt', kok).forEach(q => q.classList.remove('birak-hedef', 'birak-ust', 'birak-alt')); s?.isaret?.remove(); };
  const bitir = () => { if (!s) return; cancelAnimationFrame(s.kay); s.hayalet?.remove(); s.oge.classList.remove('surukleniyor'); temizle(); document.body.classList.remove('surukleme'); s = null; };
  const hedefBul = (x, y) => {
    s.hayalet.style.display = 'none'; const el = document.elementFromPoint(x, y); s.hayalet.style.display = '';
    temizle(); s.hedef = null;
    if (!el) return;
    if (s.tur === 'link') {
      const m = el.closest('#e-secs .meal'); if (!m) return;
      m.classList.add('birak-hedef'); s.hedef = { meal: m, satir: null };
      // Öğün yazısının üzerindeyse: hangi iki satırın arasına bırakılacağı çizgiyle gösterilir
      const ta = $('textarea[data-f="content"]', m), tr = ta.getBoundingClientRect();
      if (ta.value.trim() && y >= tr.top - 6 && y <= tr.bottom + 6) {
        const { satirlar, sol, en } = satirKonumlari(ta);
        let k = satirlar.findIndex(q => y < (q.top + q.bottom) / 2); if (k < 0) k = satirlar.length;
        s.hedef.satir = k;
        const cy = k < satirlar.length ? satirlar[k].top : satirlar[satirlar.length - 1].bottom;
        s.isaret ||= Object.assign(document.createElement('div'), { className: 'satir-isaret' });
        if (!s.isaret.isConnected) document.body.appendChild(s.isaret);
        Object.assign(s.isaret.style, { left: sol + 'px', top: cy - 1.5 + 'px', width: en + 'px' });
      }
      return;
    }
    const kap = s.oge.parentElement;
    if (!kap.contains(el)) return;
    const kardes = [...kap.children].filter(c => c.dataset.tur === s.tur);
    let sira = kardes.length;
    for (let k = 0; k < kardes.length; k++) { const r = kardes[k].getBoundingClientRect(); if (y < r.top + r.height / 2) { sira = k; break; } }
    s.hedef = { sira };
    if (sira < kardes.length) kardes[sira].classList.add('birak-ust'); else kardes[kardes.length - 1]?.classList.add('birak-alt');
  };
  kok.addEventListener('pointerdown', e => {
    const t = e.target.closest('.tutamak') || (e.pointerType === 'mouse' && !e.target.closest('button') && e.target.closest('.lchip.tasinir'));
    if (!t || e.button > 0) return;
    const oge = t.closest('.tasinir'); if (!oge || !kok.contains(oge)) return;
    if (!e.target.closest('a')) e.preventDefault();
    s = { oge, tur: oge.dataset.tur, x0: e.clientX, y0: e.clientY, basladi: false, id: e.pointerId, y: e.clientY };
    try { t.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  kok.addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.id) return;
    if (!s.basladi) {
      if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) < 6) return;
      s.basladi = true; document.body.classList.add('surukleme'); s.oge.classList.add('surukleniyor');
      const r = s.oge.getBoundingClientRect();
      s.hayalet = s.oge.cloneNode(true); s.hayalet.classList.add('surukle-hayalet'); s.hayalet.style.width = Math.min(r.width, 420) + 'px';
      s.dx = Math.min(e.clientX - r.left, 40); s.dy = e.clientY - r.top;
      document.body.appendChild(s.hayalet);
      const kay = () => { if (!s) return; if (s.y < 130) scrollBy(0, -12); else if (s.y > innerHeight - 70) scrollBy(0, 12); s.kay = requestAnimationFrame(kay); };
      s.kay = requestAnimationFrame(kay);
    }
    s.y = e.clientY;
    s.hayalet.style.transform = `translate(${e.clientX - s.dx}px, ${e.clientY - s.dy}px)`;
    hedefBul(e.clientX, e.clientY);
  });
  kok.addEventListener('pointerup', e => {
    if (!s || e.pointerId !== s.id) return;
    const { basladi, hedef, oge } = s;
    bitir();
    if (basladi) { const engel = ev => { ev.preventDefault(); ev.stopPropagation(); }; kok.addEventListener('click', engel, { capture: true, once: true }); setTimeout(() => kok.removeEventListener('click', engel, { capture: true }), 50); }
    if (basladi && hedef) birak(oge, hedef);
  });
  kok.addEventListener('pointercancel', () => bitir());
  kok.addEventListener('dragstart', e => { if (e.target.closest?.('.tasinir')) e.preventDefault(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') bitir(); });
}

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
// PDF kapak yazılarının varsayılanları (core/pdf-modern.js ile aynı)
const PDF_YAZI = { ust: 'Online beslenme danışmanlığı', baslik: 'Kişisel Beslenme\nProgramın', icin: '{ad} için hazırlandı', unutma: 'Unutma' };
async function viewSettings(main) {
  const s = await api('/settings');
  const b = s.brand;
  const py = { ...PDF_YAZI, ...(b.pdfYazi || {}) };
  const ws = s.waSablon || {};
  const inp = (k, l, ph = '') => `<label class="f">${l}<input class="i" name="${k}" value="${esc(b[k] ?? '')}" placeholder="${esc(ph)}"></label>`;
  main.innerHTML = `
  <div class="page-head"><h1>Ayarlar</h1></div>
  ${YEREL ? `<div class="card fs" style="margin-bottom:16px" id="giris-ayar"><h3>Giriş ve güvenlik</h3>
    <p class="muted small" style="margin-top:0">Kullanıcı adı: <b id="ga-kad">…</b> · Bu cihaz giriş yapıldıktan sonra ${GIRIS_GUN} gün açık kalır.</p>
    <div class="row" style="flex-wrap:wrap;gap:8px">
      <button class="btn sm" id="ga-sifre">${ic('edit')}Kullanıcı adı / şifre değiştir</button>
      <button class="btn sm" id="ga-kod">${ic('save')}Yeni kurtarma kodu</button>
      <button class="btn sm danger" id="ga-cikis">${ic('back')}Bu cihazda çıkış yap</button>
    </div></div>` : ''}
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
    <div class="fs"><h3>PDF yazıları</h3>
      <p class="muted small" style="margin-top:0">Tüm PDF'lerin kapağında görünür. <b>{ad}</b> yerine danışanın adı yazılır. Boş bırakılan üst/alt satır PDF'te çıkmaz.</p>
      <div class="fg">
      <label class="f span2">Üst satır<input class="i" name="py_ust" value="${esc(py.ust)}" placeholder="${esc(PDF_YAZI.ust)}"></label>
      <label class="f span2">Büyük başlık <span class="muted small">(Enter ile alt satıra geçer)</span><textarea class="i" name="py_baslik" rows="2" placeholder="${esc(PDF_YAZI.baslik)}">${esc(py.baslik)}</textarea></label>
      <label class="f span2">Başlık altı<input class="i" name="py_icin" value="${esc(py.icin)}" placeholder="${esc(PDF_YAZI.icin)}"></label>
      <label class="f">Notlar kutusunun başlığı<input class="i" name="py_unutma" value="${esc(py.unutma)}" placeholder="${esc(PDF_YAZI.unutma)}"></label>
      <label class="f">PDF düzeni<select class="i" name="pdfDuzen">
        <option value="uzun" ${b.pdfDuzen !== 'a4' ? 'selected' : ''}>Tek uzun sayfa (önizlemedeki gibi)</option>
        <option value="a4" ${b.pdfDuzen === 'a4' ? 'selected' : ''}>A4 sayfalar (yazdırmak için)</option></select></label>
      </div></div>
    <div class="fs"><h3>WhatsApp mesajı</h3>
      <p class="muted small" style="margin-top:0">Danışana liste ve görüşme tarihi gönderirken hazır gelen mesaj. <b>{ad}</b> = danışanın adı, <b>{tarih}</b> = sonraki görüşme günü (saatsiz), <b>{unvan}</b> = unvanınız. Liste satırı yalnızca liste gönderilirken, tarih satırı yalnızca tarih seçiliyken eklenir.</p>
      <div class="fg">
      <div class="f span2"><span>Selamlama</span>${emojiAlan('wa_acilis', 2, ws.acilis, 'wa_acilis')}</div>
      <div class="f span2"><span>Liste gönderilirken</span>${emojiAlan('wa_liste', 2, ws.liste, 'wa_liste')}</div>
      <div class="f span2"><span>Sonraki görüşme</span>${emojiAlan('wa_tarih', 2, ws.tarih, 'wa_tarih')}</div>
      <div class="f span2"><span>Kapanış</span>${emojiAlan('wa_kapanis', 2, ws.kapanis, 'wa_kapanis')}</div>
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
    ${YEREL ? EsitlemeArayuz.takvimKart(s.takvimHatirlatma) : `<div class="card"><div class="fs"><h3>iPhone / Mac takvimine ekle</h3>
      <p class="muted small" style="margin-top:0">Randevular telefonunuzun Takvim uygulamasında da görünsün. Abonelik linkini açın ve "Abone ol" deyin; yeni randevular otomatik gelir. (Uygulama internete açıldığında çalışır.)</p>
      <div class="row"><button class="btn" id="ics">${ic('cal')}Abonelik linki</button><button class="btn ghost sm" id="ics-new">Linki yenile</button></div>
      <div id="ics-out" class="small" style="margin-top:10px;word-break:break-all"></div></div></div>`}
    ${YEREL ? EsitlemeArayuz.kart() : ''}
    <div class="card"><div class="fs"><h3>Silinenler</h3>
      <p class="muted small" style="margin-top:0">Silinen danışan, liste, randevu ve şablonlar burada saklanır; uygulamada görünmezler. Geri getirilen kayıt eski yerine döner.</p>
      <div id="sil-liste"><span class="muted small">Yükleniyor…</span></div></div></div>
    <div class="card"><div class="fs"><h3>Yedekleme</h3>
      <p class="muted small" style="margin-top:0">Tüm danışan, ölçüm, liste ve şablon kayıtlarını tek bir dosya olarak indirir. Ayda bir indirip saklamanızı öneririz.</p>
      ${YEREL ? `<div class="row"><button class="btn" id="y-indir">${ic('save')}Yedek indir</button>
        <label class="btn ghost">Yedekten geri yükle<input type="file" id="y-yukle" accept=".db,application/octet-stream,application/x-sqlite3" hidden></label></div>`
    : `<a class="btn" href="/api/yedek" download>${ic('save')}Yedek indir</a>
      <div style="margin-top:22px"><button class="btn danger" id="out">${ic('logout')}Çıkış yap</button></div>`}</div></div>
  </div>`;
  let logo = b.logo || null;
  emojiBagla($('#sf'));
  if (YEREL) girisAyarBagla();
  $('#logo').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    logo = await resizeImage(f, 480); toast('Logo seçildi — Kaydet\'e basın');
  };
  $('#logo-del') && ($('#logo-del').onclick = () => { logo = null; $('.logo-prev')?.remove(); toast('Logo kaldırılacak — Kaydet\'e basın'); });
  $('#sf').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const brand = {};
    ['unvan', 'imza', 'motto', 'instagram', 'telefon', 'email', 'web', 'renkAna', 'renkHucre', 'pdfDuzen'].forEach(k => (brand[k] = f.get(k)));
    brand.logo = logo;
    brand.pdfYazi = Object.fromEntries(Object.keys(PDF_YAZI).map(k => [k, String(f.get('py_' + k) ?? '').replace(/\r/g, '')]));
    try {
      const waSablon = Object.fromEntries(['acilis', 'liste', 'tarih', 'kapanis'].map(k => [k, String(f.get('wa_' + k) ?? '').replace(/\r/g, '')]));
      await api('/settings', { method: 'PUT', body: { brand, defaultNotes: String(f.get('defaultNotes')).split('\n'), waSablon } });
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
  silinenleriGoster();
}

// Ayarlar → Silinenler: geri getir
const SIL_YOL = { clients: 'clients', diet_lists: 'lists', appointments: 'appointments', templates: 'templates' };
async function silinenleriGoster() {
  const el = $('#sil-liste'); if (!el) return;
  let rows;
  try { rows = await api('/silinenler'); } catch (e) { el.innerHTML = `<span class="muted small">${esc(e.message)}</span>`; return; }
  const [ara, setAra] = [el.dataset.ara || '', v => { el.dataset.ara = v; }];
  if (!rows.length) { el.innerHTML = '<span class="muted small">Silinen kayıt yok.</span>'; return; }
  const q = ara.toLocaleLowerCase('tr');
  const gor = rows.filter(r => !q || `${r.baslik} ${r.aciklama} ${r.tur_ad}`.toLocaleLowerCase('tr').includes(q));
  el.innerHTML = `${rows.length > 6 ? `<input class="i" id="sil-ara" placeholder="Ara…" value="${esc(ara)}" style="margin-bottom:10px">` : ''}
    <div class="sil-l">${gor.map(r => `<div class="sil-r"><div><b>${esc(r.baslik || '—')}</b>
      <div class="muted small">${esc(r.tur_ad)}${r.aciklama ? ' · ' + esc(r.aciklama) : ''} · silindi ${esc(fmtDate(r.silindi_at))}</div></div>
      <button class="btn sm" data-geri="${esc(r.tur)}:${r.kayit_id}">Geri getir</button></div>`).join('') || '<span class="muted small">Eşleşen yok.</span>'}</div>`;
  const a = $('#sil-ara', el);
  if (a) a.oninput = () => { setAra(a.value); const p = a.selectionStart; silinenleriGoster().then(() => { const b = $('#sil-ara'); b?.focus(); b?.setSelectionRange(p, p); }); };
  el.onclick = async e => {
    const b = e.target.closest('[data-geri]'); if (!b) return;
    const [tur, id] = b.dataset.geri.split(':');
    try {
      b.disabled = true;
      await api(`/${SIL_YOL[tur]}/${id}/geri`, { method: 'POST' });
      toast('Geri getirildi');
      silinenleriGoster();
    } catch (err) { b.disabled = false; onErr(err); }
  };
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
