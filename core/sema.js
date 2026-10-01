// Veritabanı şeması + sürüm geçişleri — Node ve tarayıcıda aynı.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./yardim'), require('./icerik-paketi'));
  else (root.Cekirdek = root.Cekirdek || {}).sema = factory(root.Cekirdek.yardim, root.Cekirdek.icerikPaketi);
})(typeof self !== 'undefined' ? self : this, function (Y, Paket) {
  'use strict';

  const TABLOLAR = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad_soyad TEXT NOT NULL,
  telefon TEXT, email TEXT,
  dogum_tarihi TEXT, cinsiyet TEXT, meslek TEXT, sehir TEXT,
  boy_cm REAL, baslangic_kilo REAL, hedef_kilo REAL,
  hedef TEXT,
  hastaliklar TEXT, ilaclar TEXT, alerjiler TEXT, sevmedikleri TEXT,
  aliskanliklar TEXT, notlar TEXT,
  paket TEXT, paket_baslangic TEXT, paket_bitis TEXT, ucret REAL,
  gorusme_tipi TEXT DEFAULT 'Online',
  sonraki_kontrol TEXT,
  durum TEXT DEFAULT 'aktif',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tarih TEXT NOT NULL,
  kilo REAL, bel REAL, kalca REAL, gogus REAL, kol REAL, bacak REAL,
  yag_orani REAL, kas_kutlesi REAL, su_orani REAL,
  notlar TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS diet_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  baslik TEXT,
  tarih TEXT NOT NULL,
  kilo REAL,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad TEXT NOT NULL,
  aciklama TEXT,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- Hazır metin kütüphanesi: öğün seçenekleri, tarifler, notlar
CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tur TEXT NOT NULL DEFAULT 'ogun',   -- ogun | tarif | not
  kategori TEXT,                      -- ARA, SABAH, ÖĞLE, AKŞAM ...
  baslik TEXT NOT NULL,
  icerik TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- Randevular (takvim)
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tarih TEXT NOT NULL,               -- YYYY-MM-DD
  saat TEXT NOT NULL,                -- HH:MM
  sure_dk INTEGER DEFAULT 45,
  tur TEXT DEFAULT 'Kontrol',        -- İlk görüşme | Kontrol | Ölçüm | Diğer
  kanal TEXT DEFAULT 'Online',       -- Online | Yüz yüze
  durum TEXT DEFAULT 'planli',       -- planli | tamamlandi | gelmedi | iptal
  notlar TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS ix_appt_date ON appointments(tarih, saat);

CREATE INDEX IF NOT EXISTS ix_visits_client ON visits(client_id, tarih);
CREATE INDEX IF NOT EXISTS ix_lists_client ON diet_lists(client_id, tarih);

-- Finans: paketler, danışan paketleri, tahsilatlar, giderler
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad TEXT NOT NULL,
  sure_gun INTEGER,                 -- paket süresi (gün); boşsa süresiz (ör. tek görüşme)
  gorusme_sayisi INTEGER,
  fiyat REAL,
  aciklama TEXT,
  aktif INTEGER DEFAULT 1,
  sira INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS client_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  ad TEXT NOT NULL,
  baslangic TEXT NOT NULL,
  bitis TEXT,
  gorusme_sayisi INTEGER,
  liste_fiyati REAL,
  indirim REAL DEFAULT 0,
  tutar REAL NOT NULL DEFAULT 0,    -- danışanın ödeyeceği net tutar
  durum TEXT DEFAULT 'aktif',       -- aktif | tamamlandi | iptal
  notlar TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_package_id INTEGER REFERENCES client_packages(id) ON DELETE SET NULL,
  tarih TEXT NOT NULL,
  tutar REAL NOT NULL,
  yontem TEXT DEFAULT 'Havale/EFT',
  fatura_kesildi INTEGER DEFAULT 0,
  fatura_no TEXT,
  notlar TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarih TEXT NOT NULL,
  kategori TEXT,
  tutar REAL NOT NULL,
  aciklama TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS ix_cp_client ON client_packages(client_id, baslangic);
CREATE INDEX IF NOT EXISTS ix_pay_date ON payments(tarih);
CREATE INDEX IF NOT EXISTS ix_pay_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS ix_exp_date ON expenses(tarih);

-- Google Form (Hasta Takip Kartı) başvuruları
CREATE TABLE IF NOT EXISTS form_basvurulari (
  id TEXT PRIMARY KEY,               -- Google Form cevap kimliği
  zaman INTEGER NOT NULL,            -- gönderim zamanı (ms)
  ad_soyad TEXT,
  telefon TEXT,
  veri TEXT,                         -- ham cevaplar (JSON); silinince boşaltılır
  durum TEXT DEFAULT 'yeni',         -- yeni | aktarildi | silindi
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- Tarif linklerinin kapak görselleri
CREATE TABLE IF NOT EXISTS link_previews (
  url TEXT PRIMARY KEY,
  gorsel TEXT,             -- /gorsel/<dosya>.jpg
  video INTEGER DEFAULT 0,
  baslik TEXT,
  durum TEXT,              -- ok | hata
  fetched_at TEXT DEFAULT (datetime('now','localtime'))
);

-- Kapak görsellerinin kendisi (veritabanıyla birlikte eşitlenir; internet olmadan da görünür)
CREATE TABLE IF NOT EXISTS gorseller (
  ad TEXT PRIMARY KEY,     -- <sha1(url)[:16]>.jpg  (link_previews.gorsel = /gorsel/<ad>)
  tur TEXT,
  veri BLOB NOT NULL
);
`;

  function kur(db) {
    db.exec(TABLOLAR);
    // Sonradan eklenen sütunlar (mevcut veritabanlarını da günceller)
    const addColumn = (table, col, def) => {
      if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    };
    addColumn('blocks', 'url', 'TEXT');
    addColumn('clients', 'adres', 'TEXT');      // artık formda/kartta yok (ilçe kullanılıyor); eski kayıtlarda duruyor
    addColumn('clients', 'ilce', 'TEXT');
    addColumn('clients', 'tc_kimlik', 'TEXT');
    addColumn('clients', 'anamnez', 'TEXT');   // Hasta takip kartı (JSON)
    addColumn('packages', 'icerik', 'TEXT');   // paket içeriği
    // Fatura, diyet dönemi (paket) bazında tutulur
    addColumn('client_packages', 'fatura_kesildi', 'INTEGER DEFAULT 0');
    addColumn('client_packages', 'fatura_no', 'TEXT');
    addColumn('client_packages', 'fatura_tarihi', 'TEXT');

    const { getSetting, setSetting } = Y.ayarlar(db);
    if (!getSetting('faturaPaketBazli')) {
      // Daha önce tahsilat üzerinde işaretlenen faturaları ilgili pakete taşı
      db.exec(`UPDATE client_packages SET fatura_kesildi = 1,
          fatura_no = COALESCE(fatura_no, (SELECT fatura_no FROM payments p WHERE p.client_package_id = client_packages.id AND p.fatura_no IS NOT NULL LIMIT 1))
        WHERE EXISTS (SELECT 1 FROM payments p WHERE p.client_package_id = client_packages.id AND p.fatura_kesildi = 1)`);
      setSetting('faturaPaketBazli', true);
    }
    // Not kategorileri gelmeden önce eklenen notlar (yalnızca kategorisi boş olanlar doldurulur)
    if (!getSetting('eskiNotKategori')) {
      const up = db.prepare("UPDATE blocks SET kategori=? WHERE tur='not' AND kategori IS NULL AND baslik=?");
      [['SU', 'Su'], ['ÇAY & KAHVE', 'Yeşil çay'], ['PORSİYON', 'Porsiyon: 1 küçük boy elma'], ['PORSİYON', 'Porsiyon: çağla'],
        ['ÇAY & KAHVE,PORSİYON', 'Kahve ve ara öğün'], ['ÇAY & KAHVE', 'Kafein']].forEach(([k, b]) => up.run(k, b));
      setSetting('eskiNotKategori', true);
    }
    // Yaz/kış ataması: uygulamada zaten olan öğün metinleri ve tarifler (mevsimi boşsa)
    if (!getSetting('mevsimAtama1')) { Paket.mevsimAta(db); setSetting('mevsimAtama1', true); }
    // Her tarif tam olarak bir mevsimde (yaz ya da kış)
    if (!getSetting('tarifTekMevsim')) { Paket.tarifMevsimDuzelt(db); setSetting('tarifTekMevsim', true); }
  }

  return { kur };
});
