'use strict';
/* Google Form'dan gelen Hasta Takip Kartı başvuruları. app.js ve anamnez.js yardımcılarını kullanır. */

const zamanMetin = ms => { const d = new Date(ms); return `${fmtDate(d.toISOString().slice(0, 10))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

async function formLinkiPaylas(ad, tel) {
  const g = await api('/google-form');
  if (!g.link) return toast('Önce Ayarlar\'dan Google Form bağlantısını kurun');
  const mesaj = `Merhaba${ad ? ' ' + ad.split(' ')[0] : ''}, görüşmemizden önce bu formu doldurabilir misin? 10 dakika sürüyor 🌿\n${g.link}`;
  const w = waPhone(tel);
  if (w) return window.open(`https://wa.me/${w}?text=${encodeURIComponent(mesaj)}`, '_blank');
  try { await navigator.clipboard.writeText(mesaj); toast('Mesaj ve form linki kopyalandı'); } catch { prompt('Form linki:', g.link); }
}

async function viewBasvurular(main) {
  const [g, rows] = await Promise.all([api('/google-form'), api('/basvurular')]);
  const yeni = rows.filter(r => r.durum === 'yeni'), eski = rows.filter(r => r.durum !== 'yeni');
  main.innerHTML = `
  <a class="back" href="#/danisanlar">${ic('back')}Danışanlar</a>
  <div class="page-head"><div><h1>Form başvuruları</h1>
    <div class="sub">Google Form ile doldurulan Hasta Takip Kartları · ${g.sonKontrol ? `son kontrol ${zamanMetin(Date.parse(g.sonKontrol))}` : 'henüz kontrol edilmedi'}</div></div>
    <div class="row">${g.link ? `<button class="btn" id="bv-link">${ic('share')}Form linkini gönder</button>` : ''}
      <button class="btn primary" id="bv-kontrol" ${g.url && g.anahtarVar ? '' : 'disabled'}>${ic('down')}Yenileri getir</button></div></div>
  ${!g.url || !g.anahtarVar ? `<div class="warn" style="margin-bottom:16px">Google Form bağlantısı kurulmamış. <a href="#/ayarlar">Ayarlar → Google Form bağlantısı</a> bölümünden kurun.</div>` : ''}
  ${g.hata ? `<div class="warn" style="margin-bottom:16px;background:var(--kirmizi-acik);color:var(--kirmizi)">Son otomatik kontrol başarısız: ${esc(g.hata)}</div>` : ''}
  <div class="card" style="margin-bottom:16px"><div class="card-head"><h2>Onay bekleyen</h2><span class="badge ${yeni.length ? 'mor' : ''}">${yeni.length}</span></div>
    <div class="list" style="margin-top:8px" id="bv-yeni">${yeni.map(r => `<div class="item bv">
      <div class="avatar">${esc(initials(r.ad_soyad || '?'))}</div>
      <div class="grow"><div class="t">${esc(r.ad_soyad || 'İsimsiz')}</div>
        <div class="s">${esc(r.telefon || 'telefon yok')} · ${zamanMetin(r.zaman)}${r.kvkk === false ? ' · <span class="up">açık rıza yok</span>' : ''}</div>
        ${r.eslesen ? `<div class="s" style="color:var(--mor-koyu)">Bu telefon kayıtlı danışanla eşleşiyor: <b>${esc(r.eslesen.ad_soyad)}</b></div>` : ''}</div>
      <div class="row" style="gap:6px">
        <button class="btn sm" data-on="${esc(r.id)}">${ic('eye')}Önizle</button>
        ${r.eslesen ? `<button class="btn sm soft" data-mevcut="${esc(r.id)}" data-cid="${r.eslesen.id}">Kartına işle</button>` : ''}
        <button class="btn sm primary" data-yeni="${esc(r.id)}">${ic('plus')}Yeni danışan</button>
        <button class="tbtn del" data-sil="${esc(r.id)}" title="Sil">${ic('trash')}</button></div></div>`).join('') || '<div class="empty">Onay bekleyen başvuru yok</div>'}</div></div>
  ${eski.length ? `<div class="card"><div class="card-head"><h2>Aktarılanlar</h2></div><div class="list" style="margin-top:8px">${eski.map(r => `<div class="item">
      <div class="grow"><div class="t">${esc(r.ad_soyad || '—')}</div><div class="s">${zamanMetin(r.zaman)}</div></div>
      ${r.client_id ? `<a class="btn sm" href="#/danisan/${r.client_id}/bilgiler">${esc(r.danisan || 'Danışan')}</a>` : ''}</div>`).join('')}</div></div>` : ''}
  <p class="muted small" style="margin-top:14px">Not: Uygulamada sildiğiniz başvuru Google Form'da durmaya devam eder. Aktarılan cevapları Google Form → Yanıtlar bölümünden silmeniz önerilir.</p>`;

  $('#bv-link') && ($('#bv-link').onclick = () => formLinkiPaylas());
  $('#bv-kontrol').onclick = async e => {
    e.target.disabled = true;
    try { const r = await api('/basvurular/kontrol', { method: 'POST', body: {} }); toast(r.yeni ? `${r.yeni} yeni başvuru geldi` : 'Yeni başvuru yok'); viewBasvurular(main); }
    catch (err) { onErr(err); e.target.disabled = false; }
  };
  const bul = id => rows.find(r => r.id === id);
  const aktar = async (id, cid) => {
    try { const r = await api(`/basvurular/${encodeURIComponent(id)}/aktar`, { method: 'POST', body: { client_id: cid || null } }); toast(cid ? 'Danışan kartına işlendi' : 'Yeni danışan oluşturuldu'); location.hash = `#/danisan/${r.client_id}/bilgiler`; }
    catch (err) { onErr(err); }
  };
  $('#bv-yeni').onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.on) basvuruOnizle(bul(b.dataset.on), aktar);
    if (b.dataset.yeni) aktar(b.dataset.yeni);
    if (b.dataset.mevcut && await confirmBox(`Formdaki bilgiler <b>${esc(bul(b.dataset.mevcut).eslesen.ad_soyad)}</b> adlı danışanın takip kartına yazılacak; formda dolu gelen alanlar mevcut bilgilerin yerine geçer.`, 'İşle')) aktar(b.dataset.mevcut, b.dataset.cid);
    if (b.dataset.sil && await confirmBox('Başvuru uygulamadan silinecek (içeriği de silinir). Google Form\'daki cevap ayrıca silinmelidir.')) { await api('/basvurular/' + encodeURIComponent(b.dataset.sil), { method: 'DELETE' }); toast('Silindi'); viewBasvurular(main); }
  };
}

function basvuruOnizle(r, aktar) {
  const { k, a } = r.onizleme;
  const c = { ...k, anamnez: a };
  const kim = [['Telefon', k.telefon], ['Doğum tarihi', k.dogum_tarihi && `${fmtDate(k.dogum_tarihi)} (${age(k.dogum_tarihi)} yaş)`], ['Cinsiyet', k.cinsiyet], ['TC kimlik no', k.tc_kimlik], ['Meslek', k.meslek], ['Şehir', k.sehir], ['İlçe', k.ilce], ['Adres', k.adres],
    ['Kilo', k.baslangic_kilo && fmtNum(k.baslangic_kilo) + ' kg'], ['Boy', k.boy_cm && k.boy_cm + ' cm'], ['Hedeflenen kilo', k.hedef_kilo && fmtNum(k.hedef_kilo) + ' kg'], ['Hedef', k.hedef]];
  const m = modal({
    title: esc(k.ad_soyad || 'Başvuru'), size: 'xl',
    body: `<div class="card card-pad" style="margin-bottom:16px"><dl class="info-list">${kim.filter(([, v]) => v).map(([l, v]) => `<dt>${l}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <div class="small ${r.kvkk ? 'muted' : 'up'}" style="margin-top:10px">${r.kvkk ? '✓ Açık rıza onaylandı' : 'Açık rıza işaretlenmemiş'} · Gönderim ${zamanMetin(r.zaman)}</div></div>
      ${renderAnamnezView(c)}`,
    foot: `<button class="btn" data-close>Kapat</button>${r.eslesen ? `<button class="btn soft" id="po-m">Kartına işle (${esc(r.eslesen.ad_soyad)})</button>` : ''}<button class="btn primary" id="po-y">${ic('plus')}Yeni danışan olarak ekle</button>`,
  });
  $('#po-y', m.el).onclick = () => { m.close(); aktar(r.id); };
  $('#po-m', m.el) && ($('#po-m', m.el).onclick = () => { m.close(); aktar(r.id, r.eslesen.id); });
}

// Ayarlar kartı
function googleFormAyarKarti() {
  return `<div class="card"><div class="fs"><h3>Google Form bağlantısı</h3>
    <p class="muted small" style="margin-top:0">Hasta Takip Kartı'nı danışanlar Google Form ile doldurur; cevaplar dakikada bir buraya "Form başvuruları" olarak düşer.
      Kurulum adımları: proje klasöründeki <b>google/KURULUM.md</b>.</p>
    <form id="gf" class="fg" style="grid-template-columns:1fr">
      <label class="f">Web uygulaması adresi<input class="i" name="url" placeholder="https://script.google.com/macros/s/…/exec" inputmode="url"></label>
      <label class="f">Gizli anahtar<input class="i" name="anahtar" type="password" autocomplete="off" placeholder="Kurulumda günlükte yazan anahtar"></label>
      <div class="row"><button class="btn" type="submit">${ic('save')}Kaydet ve bağlantıyı dene</button><a class="btn ghost" href="#/basvurular">Başvurular</a></div>
      <div id="gf-durum" class="small"></div>
    </form></div></div>`;
}
async function bindGoogleFormAyar() {
  const f = $('#gf'); if (!f) return;
  const g = await api('/google-form');
  f.elements.url.value = g.url || '';
  if (g.anahtarVar) f.elements.anahtar.placeholder = '•••••••• (kayıtlı; değiştirmek için yeniden girin)';
  const durum = (t, ok) => { $('#gf-durum').innerHTML = t; $('#gf-durum').style.color = ok ? 'var(--yesil)' : ok === false ? 'var(--kirmizi)' : ''; };
  if (g.url && g.anahtarVar) durum(`Bağlı${g.link ? ` · <a href="${esc(g.link)}" target="_blank" rel="noopener">form linki</a>` : ''}${g.hata ? ` · son hata: ${esc(g.hata)}` : ''}`, !g.hata);
  f.onsubmit = async e => {
    e.preventDefault(); durum('Bağlanılıyor…');
    try {
      const r = await api('/google-form', { method: 'PUT', body: { url: f.elements.url.value, anahtar: f.elements.anahtar.value } });
      f.elements.anahtar.value = '';
      if (window.Esitleme) Esitleme.yenidenOku();   // eşitleme aynı web uygulamasını kullanır
      durum(r.ok && r.cevapSayisi != null ? `✓ Bağlantı çalışıyor · formda ${r.cevapSayisi} cevap var` : "Kaydedildi", true);
    } catch (err) { durum(esc(err.message), false); }
  };
}
