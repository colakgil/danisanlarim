'use strict';
/* Eşitlemenin ekrandaki parçaları: durum göstergesi, Ayarlar kartı, yeni cihaz bağlama.
   app.js'teki yardımcıları ($, ic, esc, toast, onErr, api, zamanMetin…) çağrı anında kullanır. */
window.EsitlemeArayuz = (function () {
  const ETIKET = {
    kapali: ['Eşitleme kapalı', 'gri'], calisiyor: ['Eşitleniyor…', 'mor'], tamam: ['Eşitlendi', 'yesil'],
    cevrimdisi: ['Çevrimdışı · bu cihazda kayıtlı', 'sari'], hata: ['Eşitleme hatası', 'kirmizi'],
  };
  const saat = iso => (iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '');

  function gosterge(d) {
    const [t, renk] = ETIKET[d.ad] || ETIKET.kapali;
    const ek = d.ad === 'tamam' && d.zaman ? ` · ${saat(d.zaman)}` : d.bekleyen && d.ad !== 'calisiyor' ? ` · ${d.bekleyen} bekleyen` : '';
    const title = d.hata ? d.hata : d.ad === 'cevrimdisi' ? 'İnternet gelince değişiklikler kendiliğinden gönderilir' : '';
    return `<span class="es-nokta ${renk}"></span><span class="es-metin">${esc(t + ek)}</span>${title ? `<span class="sr">${esc(title)}</span>` : ''}`;
  }
  function guncelle(d) {
    document.querySelectorAll('[data-es-durum]').forEach(el => {
      el.innerHTML = gosterge(d);
      el.title = d.hata || '';
      el.dataset.ad = d.ad;
    });
    const k = document.getElementById('es-kart-durum');
    if (k) k.innerHTML = kartDurum(d);
  }
  function kartDurum(d) {
    const [t] = ETIKET[d.ad] || ETIKET.kapali;
    return `<b>${esc(t)}</b>${d.zaman ? ` · son eşitleme ${saat(d.zaman)}` : ''}${d.bekleyen ? ` · ${d.bekleyen} değişiklik gönderilmeyi bekliyor` : ''}${d.hata ? `<div style="color:var(--kirmizi)">${esc(d.hata)}</div>` : ''}`;
  }
  addEventListener('esitleme', e => guncelle(e.detail));

  // Kenar çubuğu / mobil üst köşe
  function kabuk() {
    return `<button class="es-durum" data-es-durum type="button" onclick="EsitlemeArayuz.dokun()" title="Şimdi eşitle"></button>`;
  }
  function kabukSonra() { guncelle(Esitleme.durum()); }
  // Göstergeye dokununca: eşitle ve durumu yaz (telefonda gösterge yalnızca renkli nokta)
  function dokun() {
    const d = Esitleme.durum();
    const [t] = ETIKET[d.ad] || ETIKET.kapali;
    toast(d.hata ? `${t}: ${d.hata}` : d.ad === 'tamam' && d.zaman ? `${t} · ${saat(d.zaman)}` : t);
    Esitleme.esitle();
  }

  // Ayarlar kartı
  function kart() {
    return `<div class="card"><div class="fs"><h3>Cihazlar arası eşitleme</h3>
      <p class="muted small" style="margin-top:0">Veriler bu cihazda saklanır ve Google Drive'ınız üzerinden Mac, iPad ve iPhone arasında kendiliğinden eşitlenir.
        Drive'da her gün bir yedek de alınır. Bağlantı, Google Form bağlantısıyla aynı web uygulamasını kullanır.</p>
      <div id="es-kart-durum" class="small" style="margin-bottom:10px"></div>
      <div class="row"><button class="btn" id="es-simdi" type="button">${ic('share')}Şimdi eşitle</button>
        <button class="btn ghost" id="es-kod" type="button">${ic('plus')}Yeni cihaz bağla</button></div>
      <div id="es-kod-alan" hidden style="margin-top:12px">
        <p class="small" style="margin:0 0 6px">Yeni cihazda uygulamayı açın → <b>Diğer cihazımdan bağlan</b> → bu kodu yapıştırın.
          <b style="color:var(--kirmizi)">Kod gizli anahtar içerir</b>; yalnızca kendinize gönderin (ör. kendi WhatsApp'ınıza), işiniz bitince silin.</p>
        <textarea class="i" id="es-kod-metin" rows="3" readonly style="font:12px ui-monospace,monospace;word-break:break-all"></textarea>
        <div class="row" style="margin-top:6px"><button class="btn sm" id="es-kopyala" type="button">${ic('copy')}Kopyala</button></div>
      </div></div></div>`;
  }
  async function kartBagla() {
    guncelle(Esitleme.durum());
    const s = document.getElementById('es-simdi');
    if (!s) return;
    s.onclick = () => Esitleme.esitle();
    document.getElementById('es-kod').onclick = async () => {
      const kod = await Esitleme.kod();
      if (!kod) return toast('Önce Google Form bağlantısını kurun');
      document.getElementById('es-kod-alan').hidden = false;
      document.getElementById('es-kod-metin').value = kod;
    };
    document.getElementById('es-kopyala').onclick = async () => {
      const t = document.getElementById('es-kod-metin');
      try { await navigator.clipboard.writeText(t.value); toast('Kod kopyalandı'); } catch { t.select(); document.execCommand('copy'); toast('Kod kopyalandı'); }
    };
  }

  // Boş cihaz ekranındaki "diğer cihazımdan bağlan"
  function bagla() {
    return `<details class="es-bagla" ${location.hash.includes('baglan=') ? 'open' : ''}><summary>Diğer cihazımdan bağlan</summary>
      <p class="small muted" style="margin:8px 0 6px">Verileriniz başka bir cihazda (ör. Mac) varsa: orada <b>Ayarlar → Cihazlar arası eşitleme → Yeni cihaz bağla</b>
        ile çıkan kodu buraya yapıştırın.</p>
      <textarea class="i" id="es-bagla-kod" rows="3" placeholder="DNS1.…" style="font:12px ui-monospace,monospace"></textarea>
      <button class="btn primary" id="es-bagla-btn" type="button" style="margin-top:8px">Bağlan ve verileri getir</button>
      <div class="err" id="es-bagla-hata"></div></details>`;
  }
  function baglaSonra() {
    const alan = document.getElementById('es-bagla-kod');
    if (!alan) return;
    const m = /baglan=([^&]+)/.exec(location.hash);
    if (m) alan.value = decodeURIComponent(m[1]);
    document.getElementById('es-bagla-btn').onclick = async () => {
      const btn = document.getElementById('es-bagla-btn');
      btn.disabled = true; btn.textContent = 'Bağlanılıyor…';
      document.getElementById('es-bagla-hata').textContent = '';
      try {
        await Esitleme.baglan(alan.value.trim());
        history.replaceState(null, '', location.pathname);
        location.reload();
      } catch (e) {
        document.getElementById('es-bagla-hata').textContent = e.message;
        btn.disabled = false; btn.textContent = 'Bağlan ve verileri getir';
      }
    };
  }

  // Google Takvim kartı
  function takvimKart() {
    return `<div class="card"><div class="fs"><h3>Google Takvim</h3>
      <p class="muted small" style="margin-top:0">Randevular Google hesabınızdaki <b>Danışan randevuları</b> takvimine kendiliğinden yazılır
        (son 60 gün ve gelecek 1 yıl). iPhone/Mac'te görmek için: Ayarlar → Takvim → Hesaplar'da Google hesabınız ekli olmalı;
        takvim görünmezse <a href="https://calendar.google.com/calendar/syncselect" target="_blank" rel="noopener">bu sayfada</a> işaretleyin.</p>
      <div id="tk-durum" class="small" style="margin-bottom:10px"></div>
      <button class="btn" id="tk-gonder" type="button">${ic('cal')}Şimdi gönder</button></div></div>`;
  }
  function takvimYaz(d) {
    const el = document.getElementById('tk-durum'); if (!el) return;
    const t = { kapali: 'Bağlantı yok (Google Form bağlantısını kurun)', calisiyor: 'Gönderiliyor…', tamam: 'Güncel', bekliyor: 'Bekliyor',
      cevrimdisi: 'Çevrimdışı — internet gelince gönderilecek', hata: 'Gönderilemedi' }[d.ad] || d.ad;
    el.innerHTML = `<b>${esc(t)}</b>${d.zaman ? ` · son gönderim ${saat(d.zaman)}` : ''}${d.ad === 'tamam' ? ` · ${d.adet} randevu` : ''}${d.hata ? `<div style="color:var(--kirmizi)">${esc(d.hata)}</div>` : ''}`;
  }
  addEventListener('takvim', e => takvimYaz(e.detail));
  function takvimBagla() {
    const b = document.getElementById('tk-gonder'); if (!b) return;
    takvimYaz(TakvimEsitleme.durum());
    b.onclick = () => TakvimEsitleme.gonder();
  }

  return { kabuk, kabukSonra, dokun, kart, kartBagla, bagla, baglaSonra, takvimKart, takvimBagla };
})();
