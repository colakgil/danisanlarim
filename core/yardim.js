// Çekirdek yardımcılar — Node sunucusunda ve tarayıcıdaki yerel uygulamada aynen çalışır.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.Cekirdek = root.Cekirdek || {}).yardim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const addDays = (iso, n) => {
    const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const num = v => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
  const str = v => (v === undefined || v === null ? null : String(v).trim() || null);
  const httpErr = (status, message) => Object.assign(new Error(message), { status, expose: true });

  // Linkler PDF'e tıklanabilir olarak girer → yalnızca http(s) kabul edilir
  function cleanUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u;
    return /^https?:\/\/[^\s]+$/i.test(u) ? u : '';
  }
  const cleanLinks = arr => (Array.isArray(arr) ? arr : [])
    .map(l => ({ title: String(l.title || '').trim(), url: cleanUrl(l.url) })).filter(l => l.url);

  function normalizeData(d) {
    d = d && typeof d === 'object' ? d : {};
    return {
      sections: (Array.isArray(d.sections) ? d.sections : []).map(s => ({
        title: String(s.title || ''),
        rows: (Array.isArray(s.rows) ? s.rows : []).map(r => ({ label: String(r.label || ''), time: String(r.time || ''), content: String(r.content || ''), links: cleanLinks(r.links) })),
      })),
      notes: (Array.isArray(d.notes) ? d.notes : []).map(String),
      recipes: (Array.isArray(d.recipes) ? d.recipes : []).map(r => ({ title: String(r.title || ''), body: String(r.body || ''), url: cleanUrl(r.url) })),
      motto: d.motto === undefined || d.motto === null ? undefined : String(d.motto),
      imza: d.imza === undefined || d.imza === null ? undefined : String(d.imza),
      ekNot: String(d.ekNot || ''),
    };
  }

  // Ayar tablosu (JSON değerler)
  function ayarlar(db) {
    function getSetting(key, def = null) {
      const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
      if (!r) return def;
      try { return JSON.parse(r.value); } catch { return r.value; }
    }
    function setSetting(key, value) {
      db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run(key, JSON.stringify(value));
    }
    return { getSetting, setSetting };
  }

  // TC kimlik no: 11 hane, ilk hane 0 değil, 10. ve 11. haneler kontrol hanesi
  function tcGecerli(v) {
    const t = String(v || '');
    if (!/^[1-9]\d{10}$/.test(t)) return false;
    const d = [...t].map(Number);
    const tek = d[0] + d[2] + d[4] + d[6] + d[8], cift = d[1] + d[3] + d[5] + d[7];
    return ((tek * 7 - cift) % 10 + 10) % 10 === d[9] && d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
  }
  const tcTemiz = v => { const t = String(v ?? '').replace(/\D/g, ''); return t || null; };

  return { today, addDays, num, str, httpErr, cleanUrl, cleanLinks, normalizeData, ayarlar, tcGecerli, tcTemiz };
});
