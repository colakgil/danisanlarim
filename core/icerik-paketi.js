// Hazır içerik paketi — Dyt. Hande Bozdoğan'ın Google Dokümanlar'daki 78 diyet listesinden (Ekim 2026) derlendi:
// farklı gün düzenleri → şablonlar; sık kullanılan öğün metinleri, notlar ve tarifler → kütüphane.
// Danışan adı/tarih/kilo içermez. "Ekle" ile yalnızca uygulamada aynı başlıkla olmayanlar eklenir.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.Cekirdek = root.Cekirdek || {}).icerikPaketi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const r = (label, time, content) => ({ label, time, content });
  const t = s => s.replace(/^\n/, '').replace(/\n\s+$/, '');

  // ---------- öğün metinleri (şablonlarda ve kütüphanede ortak) ----------
  const KAHVALTI = t(`
Kalkınca: 1 büyük bardak su

Açık çay veya kiraz sapı çayı (şekersiz)
1 adet haşlanmış yumurta veya 1 adet yumurtayla yapılmış menemen veya omlet
1 dilim peynir veya 1 tatlı kaşığı labne
5 adet zeytin veya 2 tam ceviz veya 1/2 avokado
Bol yeşillik ve domates-salatalık (limonlu)
1 ince dilim esmer ekmek
`);
  const KAHVALTI_SECENEKLI = t(`
Kalkınca: 1 büyük bardak su

Açık çay veya kiraz sapı çayı (şekersiz)
1 adet haşlanmış yumurta veya 1 adet yumurtayla yapılmış menemen veya omlet
1 dilim peynir veya 1 tatlı kaşığı labne
5 adet zeytin veya 2 tam ceviz veya 1/2 avokado
Bol yeşillik ve domates-salatalık (limonlu)
1 ince dilim esmer ekmek

Veya
Açık çay
Yulaf tost (1 adet yumurta + 3 yemek kaşığı yulaf ezmesi + 1 yemek kaşığı yoğurt + baharatlar + içine ince dilim kaşar peyniri)
Bol yeşillik (limonlu)

Veya
Açık çay veya kiraz sapı çayı (şekersiz)
Tuzlu pankek
5 adet zeytin
Mevsim yeşillikleri (limonlu)

Veya
4 yemek kaşığı yoğurt
2 yemek kaşığı granola
1 küçük muz veya 5 adet çilek
2 tam ceviz
Tarçın (isteğe bağlı)
`);
  const KAHVALTI_2YUMURTA = t(`
Kalkınca: 1 büyük bardak su

Açık çay veya yeşil çay
2 adet haşlanmış yumurta veya 2 adet yumurtayla yapılmış menemen veya omlet (1 çay kaşığı zeytinyağı)
1 dilim peynir
5 adet zeytin veya yarım avokado veya 2 tam ceviz
Bol mevsim yeşillikleri (limonlu)
1 ince dilim esmer ekmek
`);
  const KAHVE_TATLI = t(`
Sade türk kahvesi (isteğe bağlı)
+
1 kare bitter çikolata veya
1 adet hurma topu veya
1 hurma içine 1 çiğ badem veya
1 gün kurusu içine yarım ceviz
`);
  const SUT_MEYVE_KURUYEMIS = t(`
4 yemek kaşığı yoğurt veya 1 su bardağı kefir
+
1 küçük elma veya 1 küçük muz veya 1 orta boy incir veya 1 avuç üzüm veya 1 küçük şeftali veya 1 halka ananas
+
6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz
+
Tarçın (isteğe bağlı)
`);
  const ARA_SECENEKLI = t(`
1 adet karabuğday patlağı + 1 tatlı kaşığı fıstık ezmesi + yarım muz

Veya
4 yemek kaşığı yoğurt + 2 yemek kaşığı granola + 1 küçük muz

Veya
1 su bardağı kefir + 1 küçük muz + 2 tam ceviz

Veya
3-4 dilim karpuz + 1 dilim peynir

Veya
1 küçük portakal + 4 tam ceviz
`);
  const AKSAM_TABAK = t(`
1 kepçe çorba veya 3 yemek kaşığı pilav veya 3 yemek kaşığı makarna veya 1 küçük patates veya 1 ince dilim esmer ekmek (biri seçilmeli)
+
1 el kadar balık veya 1 avuç kadar tavuk veya 4 adet köfte veya 6 yemek kaşığı kıymalı sebze yemeği veya 6 yemek kaşığı kurubaklagil yemeği (bunlardan biri seçilmeli)
+
4 yemek kaşığı yoğurt veya 1 bardak ayran veya 1 kase cacık (her gün mutlaka olmalı)
+
Bol salata (limonlu) (1 tatlı kaşığı zeytinyağı)
`);
  const AKSAM_TABAK_TARIFLI = t(`
1 kepçe çorba veya 3 yemek kaşığı pilav veya 3 yemek kaşığı makarna veya 1 ince dilim esmer ekmek (sadece biri seçilmeli)
+
1 el kadar balık veya 1 avuç kadar tavuk veya 4 adet köfte veya 6 yemek kaşığı sebze yemeği veya 6 yemek kaşığı kurubaklagil yemeği (sadece biri seçilmeli) (sebze yemekleri çatalla yenilmeli, suyu tabakta kalmalı)
+
4 yemek kaşığı yoğurt veya 1 bardak ayran (biri seçilmeli)
+
Salata (limonlu) (1 tatlı kaşığı zeytinyağı)

Haftanın 3 günü aşağıdaki tarifleri yaparsanız daha iyi sonuçlar alabiliriz
Çıtır nohutlu kabak tarator > 1 gün
Fırında sebze (kabak, havuç, patlıcan, biber) (1 yemek kaşığı zeytinyağı) + 4 yemek kaşığı yoğurt > 1 gün
Soslu tavuklu salata > 1 gün
(Bu günlerde ekstra karbonhidrat grubu olmayacak, sadece yazılanlar yenilmeli)
`);
  const OGLE_TABAK = t(`
1 kepçe çorba veya 3 yemek kaşığı pilav veya 1 küçük patates veya 3 yemek kaşığı makarna (biri seçilmeli)
+
1 el kadar balık veya 1 avuç kadar tavuk veya 4 adet köfte veya 6 kaşık kıymalı sebze yemeği veya 6 yemek kaşığı kurubaklagil yemeği (biri seçilmeli)
+
4 kaşık yoğurt veya 1 bardak ayran veya 1 kase cacık (biri seçilmeli)
+
Bol salata (limonlu) (yağsız)
`);
  const OGLE_HAFIF = t(`
Mücver (tarifin yarısı) + 1 bardak ayran

Veya
Ton balıklı salata

Veya
Fırında sebze (kabak, biber, havuç) + 4 yemek kaşığı yoğurt

Veya
4 yemek kaşığı çıtır nohutlu kabak tarator

Veya
Yeşil mercimek salatası + 1 su bardağı kefir

Veya
Tavuklu salata + 1 bardak ayran
`);
  const OGLE_DISARIDA = t(`
Tavuklu salata + 1 bardak ayran

Veya
1 adet lahmacun + salata + 1 bardak ayran

Veya
1 porsiyon adana + salata + 1 bardak ayran

Veya
Izgara köfte + salata + 1 bardak ayran

Veya
1 kase etli çorba + salata
`);
  const GECE_BITKI = t(`
Papatya veya melisa çayı veya sade maden suyu veya detoks çayı (isteğe bağlı)
`);
  const GECE_MEYVE = t(`
Bitki çayı veya sade maden suyu (isteğe bağlı)

1 avuç üzüm + 2 tam ceviz

Veya
1 küçük mandalina + 6 çiğ badem

Veya
1 küçük muz + 6 çiğ fındık

Veya
1 dilim sağlıklı brownie

Veya
Nohut cips (paketin yarısı)
`);
  const GECE_TATLI = t(`
Bitki çayı veya detoks çayı veya sade maden suyu (isteğe bağlı)
1 kare bitter çikolata veya
1 adet hurma içine 1 çiğ badem veya
1 gün kurusu içine 1 tam ceviz veya
1 adet kokotop veya
1 adet fit dondurma
`);
  const SAHUR = t(`
Açık çay
2 adet haşlanmış yumurta veya 2 yumurtayla omlet veya menemen
1 ince dilim beyaz peynir
5 adet tuzsuz zeytin veya 1 tatlı kaşığı fıstık ezmesi veya 1/2 avokado
Domates + salatalık veya bol yeşillik
1 ince dilim esmer ekmek veya 2 yemek kaşığı yulaf ezmesi (omlet içine)
1 adet gün kurusu içine yarım ceviz
`);
  const IFTAR = t(`
1 büyük bardak su + 1 adet hurma
1 kepçe çorba
(10 dk mola)
1 avuç kadar tavuk veya 4 adet köfte veya 6 kaşık kıymalı sebze yemeği veya 6 yemek kaşığı kurubaklagil yemeği (biri seçilmeli)
3 yemek kaşığı pilav veya 1 küçük patates veya 3 yemek kaşığı makarna veya 1 avuç içi kadar pide (biri seçilmeli)
4 kaşık yoğurt veya 1 bardak ayran veya 1 kase cacık (biri seçilmeli)
Bol salata (limonlu) (1 tatlı kaşığı zeytinyağı)
`);
  const IFTAR_ARA = t(`
Sade türk kahvesi veya yeşil çay veya papatya çayı
1 kase incir uyutması veya
1 adet karabuğday patlağı + 1 tatlı kaşığı fıstık ezmesi + yarım muz veya
2 adet hurma içine biraz fıstık ezmesi + 2 çiğ badem veya
1 orta boy kivi + 6 çiğ fındık veya
1 küçük portakal + 2 tam ceviz veya
1 küçük kase güllaç (haftada 1 kez)
`);
  const NOBET_GECE_1 = t(`
1 avuç üzüm + 15 çiğ badem

Veya
1 küçük yeşil elma + 15 çiğ fındık

Veya
2 adet karabuğday patlağı + 2 tatlı kaşığı fıstık ezmesi + yarım muz

Veya
1 küçük muz + 2 tatlı kaşığı fıstık ezmesi + 2 tatlı kaşığı granola
`);
  const NOBET_GECE_2 = t(`
1 adet karabuğday patlağı

Veya
1 su bardağı patlamış mısır

Veya
3 adet grissini

Veya
1 kahve fincanı leblebi
`);
  const MUSLI = '4 yemek kaşığı yoğurt + 3 yemek kaşığı müsli + 1 küçük muz\n(Yoğurt yerine 1 su bardağı süt de kullanılabilir)';
  const AKSAM_BUYUK = t(`
2 kepçe çorba veya 6 yemek kaşığı pilav veya 2 küçük patates veya 6 yemek kaşığı makarna veya 2 ince dilim esmer ekmek (biri seçilmeli)
+
1 el kadar balık veya 1 avuç kadar tavuk veya 4 adet köfte veya 6 kaşık kıymalı sebze yemeği veya 6 yemek kaşığı kurubaklagil yemeği (biri seçilmeli)
+
4 kaşık yoğurt veya 1 bardak ayran veya 1 kase cacık (biri seçilmeli)
+
Bol salata (limonlu) (yağsız)
`);
  const SUTLU_KAHVE_ARA = t(`
Sütlü kahve + 1 küçük muz + 15 çiğ badem

Veya
Sütlü kahve + 1 adet nektarin + 15 çiğ fındık

Veya
Sütlü kahve + 2 adet karabuğday patlağı + 2 tatlı kaşığı fıstık ezmesi + yarım muz

Veya
Sütlü kahve + 1 adet meyve bar
`);
  const GECEDEN_KALMA = t(`
Geceden kalma yulaf (karıştırılıp 1 gece önceden buzdolabında bekletilecek)
2 yemek kaşığı yulaf ezmesi
1 tatlı kaşığı chia tohumu
1 çay kaşığı bal
1 küçük çay bardağı süt
1 çay kaşığı kakao veya tarçın
Üzerine: yarım muz veya yarım elma + 1 tatlı kaşığı fıstık ezmesi

Veya
4 yemek kaşığı yoğurt + 2 yemek kaşığı granola + 1 küçük muz
`);
  const SPOR_ONCESI = t(`
1 küçük muz + 2 tam ceviz

Veya
1 su bardağı kefir + 1 küçük elma

Veya
Yarım protein bar
`);
  const AKSAM_SPOR = t(`
1 el kadar balık veya 1 avuç kadar tavuk veya 4 adet köfte
+
2 yemek kaşığı basmati pirinç pilavı veya 1 küçük patates
+
4 yemek kaşığı yoğurt veya 1 bardak ayran (biri seçilmeli)
+
Salata (limonlu) (1 çay kaşığı zeytinyağı) (elma sirkesi)
`);
  const HAFTALIK_AKSAM = t(`
Fırında 2 adet tavuk but + karnabahar-havuç + 4 yemek kaşığı yoğurt > cuma
150 g balık + 1 ince dilim esmer ekmek + bol salata > cumartesi
120 g biftek + 3 yemek kaşığı patates püresi + 1 bardak ayran + salata > pazar
6 yemek kaşığı etli kuru fasulye + 4 yemek kaşığı pirinç pilavı + 4 yemek kaşığı yoğurt + salata > pazartesi
3 adet köfte + 5 yemek kaşığı ıspanak yemeği + 4 yemek kaşığı yoğurt + salata > salı
Çıtır tavuk bowl (150 g tavuk) + 1 bardak ayran > çarşamba
120 g et sote + 4 yemek kaşığı bulgur pilavı + 1 bardak ayran + salata > perşembe
`);
  const TATIL_AKSAM = t(`
1 el kadar balık + bol salata > 1 gün
4 yemek kaşığı çıtır nohutlu semizotu salatası > 1 gün
Yeşil mercimekli salata (4 yemek kaşığı yeşil mercimek) > 1 gün
1 büyük kase kabak çorbası + 2 adet köfte + salata > 1 gün
Soslu tavuklu salata (100 g tavuk + 3 yemek kaşığı yoğurt) > 1 gün
Diğer günler: ızgara et-tavuk-balık + salata + 4 yemek kaşığı yoğurt
`);
  const TATIL_ARA = t(`
2 dilim karpuz + 1 dilim peynir

Veya
1 ay dilim kavun

Veya
1 çay bardağı kefir + yarım şeftali

Veya
3/4 su bardağı kefir + 1 adet kayısı
`);

  // ---------- notlar ----------
  const N = {
    su25: 'GÜNDE EN AZ 2.5 LİTRE SU İÇİLMELİ!',
    su3: 'GÜNDE EN AZ 3 LİTRE SU İÇİLMELİ!',
    su2: 'GÜNDE EN AZ 2 LİTRE SU İÇİLMELİ!',
    yesilCay: 'GÜN İÇİNDE MUTLAKA 1 KUPA YEŞİL ÇAY İÇİLMELİ!',
    spor3: 'HAFTADA 3 GÜN 30 DK SPOR YAPILMALI!',
    yuruyus: 'HAFTADA 2 GÜN 45 DK TEMPOLU YÜRÜYÜŞ YAPALIM!',
    detoksBitki: 'DETOKS ÇAYI İÇTİĞİMİZ GÜN BİTKİ ÇAYI İÇMEYELİM',
    protein: 'Akşam yemeklerinde mutlaka protein grubu olmasına dikkat edelim',
    balik: 'Haftada 1 kez balık yemeye çalışalım',
    sadeceBunlar: 'Tarif günlerinde ekstra karbonhidrat grubu olmayacak, sadece yazılanlar yenilmeli',
    ogleEt: 'Öğle yemeğinde et-tavuk olan günlerde akşam sebze veya baklagil yemeği yiyebiliriz',
  };
  const RAMAZAN = [
    'Mutlaka sahur yapmaya çalışın, çünkü çok uzun süreli açlık metabolizmanızı yavaşlatabilir.',
    'Sahurda yumurta, peynir ve esmer ekmek yemek sizi daha uzun süre tok tutacaktır.',
    'İftarda çorbadan sonra 5-10 dk bekleyin; bu, sofradan tok kalkmanıza ve midenin hazmetmesine yardımcı olur.',
    'İftar sonrası ara öğünü en az 2 saat sonra tüketin.',
    'İftar sonrası en az 1.5-2 litre su içmeye gayret edin. Bir anda tüm suyu içmeyin, bardak bardak aralıklarla için.',
    'İftardan 1.5-2 saat sonra yürüyüş veya spor yapabilirsiniz.',
    'İftar sonrası yeşil çay, sade maden suyu, şekersiz açık çay veya sade türk kahvesi içebilirsiniz.',
  ];

  // ---------- tarifler ve bilgi listeleri ----------
  const DETOKS_CAYI = t(`
1-2 adet hibiskus
5-10 adet kiraz sapı
1 nohut kadar taze zencefil
1/2 adet kabuk tarçın
1 adet karanfil
Tüm malzemeleri 500 ml kaynamış suda 10 dk bekletin, süzün, tüm gün içebilirsiniz.
(3 GÜN YAPALIM)
`);
  const MUCVER = t(`
Malzemeler
2 orta boy kabak
1 büyük boy havuç
1 küçük boy kuru soğan
1 diş sarımsak
1 tutam maydanoz, 1 tutam dereotu
1 yumurta
2 yemek kaşığı zeytinyağı
1 çay kaşığı karbonat
2 çay kaşığı sirke (karbonatı aktifleştirmek için)
3 yemek kaşığı un (tam buğday, siyez, çavdar vb.)
Baharatlar (tuz, toz biber, karabiber, pul biber vb.)

Yapılışı
Kabağı ve havucu bir kaba rendeleyip suyunu sıkıyoruz. Soğanı küp küp doğrayıp ekliyoruz. Yeşillikleri küçük küçük doğruyor, sarımsağı rendeliyoruz. Tüm malzemeleri karıştırıp yağlı kâğıt serili borcama yayıyoruz. Önceden ısıtılmış 180 derece fırında üzeri kızarana kadar pişiriyoruz.
`);
  const ALISVERIS = t(`
Süt ürünleri: yoğurt, kefir, süt, beyaz peynir, lor peyniri / sürülebilir lor, probiyotik yoğurt
Protein: tavuk göğsü, hindi, balık (somon, levrek; konserve ton balığı kontrollü), yumurta, kuru baklagiller (yeşil/kırmızı mercimek, nohut, kuru fasulye, barbunya, börülce, maş fasulyesi, bezelye, bakla)
Karbonhidrat: yulaf ezmesi, bulgur, tam buğday makarna, tam buğday ekmeği, basmati pirinç, karabuğday / kinoa
Yağ: çiğ badem, çiğ fındık, ceviz, zeytinyağı, avokado
Ara öğün (temiz içerikli): bitter çikolata (%70 ve üzeri), ilave şekersiz granola, gün kurusu / hurma / kuru incir, karabuğday patlağı, kuruyemiş bar, hurma topları, protein bar, şekersiz fıstık ezmesi, şekersiz kakaolu fındık kreması
Meyve (kış): elma, armut, portakal, mandalina, muz, ananas, nar, kivi, cennet hurması, ayva, greyfurt
Sebze (kış): brokoli, ıspanak, pırasa, lahana, pazı, karnabahar, kereviz, turp, pancar, havuç, salata yeşillikleri
Ekstra: baharatlar (karabiber, pul biber, kimyon, zerdeçal), limon, elma sirkesi, sarımsak, bitki çayı
İçecek: sade maden suyu, şekersiz cool lime, %100 meyve suyu
`);
  const KILO_KORUMA = t(`
Diyetinizi uygularken uyguladığınız beslenme biçimi, aslında yaşamınız boyunca uygulamanız gereken bir beslenme şeklidir. Aşağıdaki genel kurallar hayatınızda var olmaya devam etmelidir.
• Beslenmeniz yine üç ana, üç ara öğün şeklinde, düzenli ve vaktinde olmalıdır.
• Her gün düzenli yürümeye diyet programınız sonlansa bile devam etmelisiniz.
• Gün içerisinde en az 2 litre su içmeye dikkat etmelisiniz.
• Yemeklerinizi yavaş yiyip iyi çiğnemelisiniz.
• Hareketli bir yaşam biçimini tercih etmelisiniz.

Diyet programınızdaki yiyecek miktarlarını şu ölçülerde artırınız:
Ekmek grubu: 3 değişim · Et grubu: 5 değişim · Meyve grubu: 3 değişim · Süt-yoğurt: 2 değişim · Yağ grubu: 2 değişim · Sebze-salata: aynı miktarlar

Diyet süresince yasak olan yiyecekleri isterseniz şu sıklıkta tüketebilirsiniz:
Haftada iki kez: 1 yemek kaşığı bal, reçel veya pekmez; 1 su bardağı meşrubat
Haftada bir kez: 1 küçük kase karışık kuruyemiş; 90 g bitter çikolata; 1 kase sütlü tatlı veya 3 top dondurma
Ayda iki kez: 1 porsiyon hamur işi (börek, poğaça vb.)
Ayda bir kez: 1 porsiyon karışık kızartma; 1 porsiyon şerbetli hamur tatlısı (baklava, kadayıf vb.)
`);
  const HAMILELIK = t(`
SIK SIK TÜKETİLMESİ GEREKEN BESİNLER
• Yumurta
• Avokado
• Süt, peynir, ayran, kefir, yoğurt
• Balık (somon, uskumru, hamsi, sardalya, istavrit)
• Kurubaklagiller
• Yağlı tohumlular (badem, ceviz, fındık)
• Muz, nar, orman meyveleri
• Zerdeçal, sarımsak

TÜKETİLMEMESİ GEREKEN BESİNLER
• Az pişmiş yumurta, et veya balık
• Dışarıdan açık süt veya peynir
• Sakatatlar (böbrek, ciğer vb.)
• Yüksek cıva içeren balıklar (ton, kılıç, köpekbalığı vb.)
• Alkol, sigara
• Gazlı içecekler
• Bitki çayları
• İyi yıkanmamış sebze ve meyve
• Sucuk, salam, sosis
• Çok fazla maydanoz, dereotu, tere
• Çok fazla kafein

DİKKAT ETMEMİZ GEREKENLER
• Tercih edebileceğimiz balıklar: hamsi, mezgit, somon, alabalık (tatlı su) cıvadan fakirdir.
• Günde en fazla 2 çay bardağı açık çay ve 1 fincan kahve içilmeli.
• Dışarıdan yemek yememeye özen gösterelim.
• Kızartmalardan, fazla baharattan uzak duralım.
`);
  const EMZIRME = t(`
Dikkatli tüketilmesi gereken besinler
• Kafeinli içecekler
• Enerji içecekleri
• Aşırı baharatlı besinler
• Çok yağlı ve kızartılmış besinler
• Yüksek şekerli işlenmiş besinler
• Baklagiller (suda bekletilip bebeğin gaz durumuna göre yenebilir)
• Lahana, karnabahar, brokoli, soğan vb. (suda bekletilip bebeğin gaz durumuna göre yenebilir)

Sık sık tüketilmesi gereken besinler
• Yumurta
• Yulaf ezmesi
• Yoğurt, süt
• Badem, ceviz, fındık
• Rezene ve anason
• Ispanak, pazı
• Kuru kayısı, kuru incir, hurma
`);
  const GASTRIT = t(`
• Yemekleri az az ve sık sık tüketin.
• Yemekleri çok sıcak veya çok soğuk yemeyin.
• Yemekleri çok iyi çiğneyin, yavaş yiyin.
• Aşırı alkol alımından kaçınılmalıdır.
• Çay, kahve gibi kafeini yüksek ve kola, gazoz gibi asidi yüksek içeceklerden kaçınılmalıdır.
• Baharat ve çeşnilerden uzak durulmalıdır.

Gastrite iyi gelen besinler: yulaf, havuç, elma, beyaz et, balık, yoğurt, kefir, hindistan cevizi yağı, taze sebze ve meyveler

Tüketilmesi önerilmeyenler: alkol; hazır çorba ve paketli gıdalar; hazır meyve suları, kolalı içecekler, limonata; yağda kızartılmış, kavrulmuş besinler; kurubaklagiller, bulgur, yarma; baharatlar ve çeşni vericiler; ekşi yoğurtlar; ekşi, kabuklu ve kumlu meyveler; yağlı peynirler, kuyruk yağı, margarin; sarımsak, mayonez, domates; acı biber; çikolata, kahve, çay; asitli içecekler
`);
  const TIROID = t(`
Dikkatli tüketilmesi gereken guatrojenik besinler
• Karnabahar, brokoli
• Lahana (özellikle beyaz ve kırmızı lahana), Brüksel lahanası, kara lahana
• Şalgam, turp
• Soya ve soya ürünleri (soya sütü, tofu, soya fasulyesi)
• Tatlı patates, mısır

Sık sık tüketilmesi gereken besinler
• Brezilya cevizi
• Yumurta
• Yulaf ezmesi
• Tavuk, balık ve hindi eti
• Bezelye, ıspanak
• Ay çekirdeği, fındık ve ceviz gibi yağlı tohumlar
• Mantarlar
• Sardalya ve ton balığı
`);
  const LIPODEM = t(`
1. Şeker ve şekerli gıdalar: toz/küp şeker; reçel, bal, pekmez; tatlılar (baklava, kek, kurabiye, pasta); çikolata ve şekerlemeler; şekerli/katkılı dondurmalar
2. Rafine karbonhidratlar: beyaz ekmek, beyaz pirinç, beyaz undan makarna, hamur işleri (poğaça, börek, simit, çörek), cips, kraker, gofret
3. Paketli ve işlenmiş gıdalar: hazır çorba ve soslar, konserveler, salam-sosis-sucuk-jambon, hazır kahvaltılık gevrekler, ketçap, mayonez, hazır salata sosları
4. Aşırı tuz: fazla tuzlu turşular, çok tuzlu salamura zeytin, cips ve tuzlu kuruyemiş, bulyon, tuzlu peynirler
5. Süt ürünleri (bazı kişilerde iltihap tetikleyebilir): tam yağlı süt, krema, kaymak, aşırı (özellikle işlenmiş) peynir, ilave şekerli/aromalı yoğurtlar. Herkes için yasak değildir; gözlemleyerek karar verilmelidir.
6. Asitli ve şekerli içecekler: kola, gazoz, meyveli soda, hazır meyve suyu, enerji içecekleri, tatlandırılmış buzlu çay, şekerli kahveler
7. Glutene dikkat (bazı bireylerde): buğday, arpa, çavdar içeren ürünler. Denenebilecekler: karabuğday, kinoa, glutensiz etiketli yulaf
8. Kafein: günde 1-2 fincan kahve sınır; fazlası ödemi artırabilir
`);
  const SIK_TUKET = t(`
• Somon
• Avokado
• Yumurta
• Ispanak
• Yaban mersini
• Nar
• Ceviz
• Kabak çekirdeği
• Yeşil mercimek
• Soğuk sıkım zeytinyağı
• Brokoli
`);
  const PORSIYON_MEYVE = t(`
12 adet dut veya
1 adet incir veya
1 küçük şeftali veya
4 adet mor erik veya
2-3 dilim karpuz veya
1 ay dilim kavun veya
1 avuç üzüm veya
15 adet böğürtlen veya
14 adet kiraz veya
4 adet küçük kayısı veya
1 adet küçük elma veya
1 adet küçük muz veya
10 adet küçük çilek veya
1 küçük portakal veya
1 büyük mandalina veya
1 kase nar veya
1/3 orta boy ayva
`);
  const PORSIYON_KURUYEMIS = t(`
6 çiğ badem veya
6 çiğ fındık veya
2 tam ceviz veya
6 çiğ kaju veya
10 adet antep fıstığı veya
10 adet tuzsuz yer fıstığı
`);

  const TARIFLER = [
    // İçecek
    ['İÇECEK', 'Detoks çayı (ahududulu)', DETOKS_CAYI.replace('1 adet karanfil', '1 adet karanfil\n3-4 adet ahududu veya böğürtlen').replace('içebilirsiniz.', 'soğutup buz ekleyerek gün içinde içebilirsiniz.')],
    ['İÇECEK', 'Elmalı detoks çayı', '2 orta boy kabuklu yeşil elma\n1/2 limon (kabuklu)\n1 nohut kadar zencefil (varsa)\n1 adet kabuk tarçın\n1/4 demet maydanoz\n1 çay kaşığı ucu karabiber (çok az koyun, yoksa acı olur)\nÜzerine 1 litre su ekleyip kaynatıyoruz. Süzüp tüm gün boyunca içebiliriz. (3 gün)'],
    ['İÇECEK', 'Ayvalı detoks çayı', '1 orta boy kabuklu ayva\n2 limon (kabuklu)\n1 nohut kadar zencefil (varsa)\n1 adet kabuk tarçın\n1 avuç maydanoz\n1 çay kaşığı ucu karabiber (çok az koyun, yoksa acı olur)\nÜzerine 750 ml su ekleyip kaynatıyoruz. Süzüp tüm gün boyunca içebiliriz. (3 gün)'],
    ['İÇECEK', 'Ananaslı detoks çayı', '1 bütün ananasın kabuklarının yarısı\n1/2 kabuk tarçın\n5 adet karanfil\n1 nohut kadar zencefil\n500 ml suda kaynatılıp süzülüp içilir. (2 gün)'],
    ['İÇECEK', 'Çilekli smoothie', '1 su bardağı süt\n2 yemek kaşığı yulaf ezmesi\n8 adet çilek\nYarım muz\n1 çay kaşığı bal\n1 tatlı kaşığı chia tohumu\nTüm malzemeler robotta çekilir.'],
    ['İÇECEK', 'Kırmızı smoothie', '1 su bardağı kefir\n2 yemek kaşığı kırmızı meyve\n1 tatlı kaşığı chia tohumu\nYarım muz\nTüm malzemeleri robotta çekip buzla tüketebilirsiniz.'],
    ['İÇECEK', 'Yeşil smoothie', '1 adet salatalık\n1 adet küçük yeşil elma\n5-6 dal ıspanak veya 1 avuç maydanoz\nYarım limon suyu\n1 nohut kadar taze zencefil\n1 bardak su\nTüm malzemeler robotta çekilir.'],
    ['İÇECEK', 'Ödem atımına destek smoothie', '1 adet salatalık\n1 adet küçük yeşil elma\nYarım limon suyu\n1 nohut kadar taze zencefil\n1 kupa demlenmiş, soğumuş yeşil çay\nTüm malzemeler robotta çekilir.'],
    ['İÇECEK', 'Kahveli smoothie', 'Yarım su bardağı soğuk filtre kahve\nYarım su bardağı süt\nYarım muz\n1 yemek kaşığı yulaf\n1 tatlı kaşığı şekersiz fıstık ezmesi\nKakao\nTüm malzemeleri robotta çekip buzla tüketebilirsiniz.'],
    ['İÇECEK', 'Yulaf smoothie', '1 su bardağı süt\n2 yemek kaşığı yulaf ezmesi\n1 küçük olgun muz\n1 çay kaşığı bal\n1 çay kaşığından az tarçın veya kakao\n2 tam ceviz\nTüm malzemeler robotta çekilir.'],
    ['İÇECEK', 'Orman meyveli smoothie', '1 su bardağı kefir\n2 yemek kaşığı yulaf ezmesi\n2 yemek kaşığı orman meyvesi\nYarım muz\n1 çay kaşığı bal\n1 tatlı kaşığı chia tohumu\nTüm malzemeler robotta çekilir.'],
    ['İÇECEK', 'Ananas smoothie', '1 su bardağı kefir\n1 halka dilim ananas\n1 avuç nane\n1/2 muz\n2 dilim limon\nTüm malzemeler robotta çekilir.'],
    ['İÇECEK', 'Kefirli smoothie (böğürtlen / çilek / muz)', 'Böğürtlenli: 1 su bardağı kefir + 2 yemek kaşığı böğürtlen + 1 tatlı kaşığı bal\nÇilekli: 1 su bardağı kefir + 10 adet çilek + 1 tatlı kaşığı bal\nMuzlu: 1 su bardağı kefir + 1 küçük olgun muz + 1 tatlı kaşığı fıstık ezmesi\nDutlu: 1 su bardağı kefir + 2 yemek kaşığı dut + 1 tatlı kaşığı bal\n(Robotta çekilecek)'],
    ['İÇECEK', 'Hurmalı smoothie', '3/4 su bardağı kefir\n2 adet hurma\n1 yemek kaşığı yulaf ezmesi\n1/2 adet muz\nTarçın (isteğe bağlı)\nTüm malzemeler robotta çekilir.'],
    // Sabah
    ['SABAH', 'Geceden kalma yulaf (3 çeşit)', 'Ortak malzemeler: 2 yemek kaşığı yulaf ezmesi + 1 tatlı kaşığı chia tohumu + 1 çay kaşığı bal + 1 küçük çay bardağı süt\n\n1) 1 çay kaşığı kakao — üzerine yarım muz veya 1 halka ananas veya 3 adet çilek veya 1 yemek kaşığı orman meyvesi\n2) 1 tatlı kaşığı hindistan cevizi tozu — üzerine eritilmiş 2 kare bitter çikolata\n3) 1 çay kaşığı tarçın — üzerine yarım elma + 1 tatlı kaşığı fıstık ezmesi\n\nTüm malzemeler karıştırılıp 1 gece önceden buzdolabında bekletilir.'],
    ['SABAH', 'Havuçlu kek tadında yulaf lapası', '3/4 su bardağı süt\n3 yemek kaşığı yulaf ezmesi\n1 tatlı kaşığı kuru üzüm\n1 çay kaşığı bal (piştikten sonra)\nYarım çay kaşığı tarçın\n1 adet havuç (rendelenmiş)\n2 tam ceviz'],
    ['SABAH', 'Tiramisu tadında yulaf lapası', '3/4 su bardağı süt\n2 yemek kaşığı yulaf ezmesi\n1 tatlı kaşığı kahve\n1 yemek kaşığı labne\n1 tatlı kaşığı bal\nKakao\n1 küçük muz'],
    ['SABAH', 'Muzlu çikolatalı yulaf lapası', '3/4 su bardağı süt\n2 yemek kaşığı yulaf ezmesi\nTarçın\nYarım orta boy muz\n1 yemek kaşığı quark veya 1 tatlı kaşığı fıstık ezmesi\n2 kare çikolata'],
    ['SABAH', 'Snickers tadında yulaf lapası', '3/4 su bardağı süt\n2 yemek kaşığı yulaf ezmesi\n1 yemek kaşığı fıstık ezmesi\n1 çay kaşığı kakao\n1 çay kaşığı bal\n10 adet fıstık\n(1 gece önceden dolapta bekletip sabah tüketebilirsin)'],
    ['SABAH', 'Yulaf tost', '1 adet yumurta\n3 yemek kaşığı yulaf ezmesi\n1 yemek kaşığı yoğurt\nBaharatlar\nİçine ince dilim kaşar peyniri\nTavada iki yüzü pişirilir.'],
    ['SABAH', 'Avokado tarif', 'Yarım avokado\n1 tatlı kaşığı labne\nLimon\nTuz\nBaharatlar (isteğe bağlı)\nEkmeğin üstüne sürüp üzerine çırpılmış yumurta koyabilirsiniz.'],
    ['SABAH', 'Tuzlu pankek (glutensiz)', 'Malzemeler (2 kişilik):\n2 adet yumurta\n3 yemek kaşığı glutensiz un (kinoa, nohut, karabuğday veya badem unu)\n2 yemek kaşığı tuzsuz lor peyniri veya az tuzlu keçi/koyun peyniri\n1 yemek kaşığı zeytinyağı\n1 yemek kaşığı ince kıyılmış dereotu + maydanoz\n1 çay kaşığı kabartma tozu\nKarabiber, pul biber, kekik (tuz eklemeyin)\nÜzeri için: avokado dilimleri, domates veya salatalık\n\nYapılışı: Yumurta ve unu çırpın. Lor peyniri, zeytinyağı ve yeşillikleri ekleyip karıştırın. Yapışmaz tavayı çok az yağlayıp küçük porsiyonlar halinde önlü arkalı pişirin.'],
    ['SABAH', 'Quark kasesi', '1 paket quark\nYarım çay bardağı kefir\n1 küçük şeftali\n1 yemek kaşığı chia tohumu\nVanilin'],
    // Öğle / akşam
    ['AKŞAM', 'Havuçlu fırın mücver', MUCVER],
    ['ÖĞLE', 'Ton balıklı makarnalı salata', '75 g ton balığı (yağını süzelim)\n3 yemek kaşığı makarna\n1 yemek kaşığı mısır\nKıvırcık\nTaze soğan\nKornişon turşu\n\nSosu: 4 yemek kaşığı yoğurt (suyu iyice süzülmüş) + 1 yemek kaşığı mayonez + 1 tatlı kaşığı hardal\n\nYeşillikleri doğrayıp makarnayı haşlıyoruz, tüm malzemeleri bir kasede karıştırıyoruz. Sosu ayrı karıştırıp en son üzerine ekliyoruz.'],
    ['ÖĞLE', 'Diyet makarna salatası', '5 yemek kaşığı haşlanmış yeşil mercimek\n3 yemek kaşığı tam buğday makarna\n4 yemek kaşığı yoğurt\n2 yemek kaşığı mısır\n1 adet kırmızı biber\n1 adet salatalık turşusu\n2-3 adet zeytin\nBir tutam maydanoz, bir tutam dereotu\nÜzeri için: nane, pul biber, kekik'],
    ['AKŞAM', 'Kabak çorbası', '3 adet yeşil kabak\n1 orta boy beyaz soğan\n1 yemek kaşığı zeytinyağı\nYarım demet maydanoz\nYarım demet dereotu\n3-4 diş sarımsak\nBaharatlar (pul biber, karabiber, tuz vb.)\nAldığı kadar su\nİçerken üzerine limon sıkmayı unutmayın, afiyet olsun :)'],
    ['AKŞAM', 'Yoğurtlu kabak çorbası', '2 adet kabak\n4 kaşık yoğurt\n1 tatlı kaşığı zeytinyağı\n1 diş sarımsak\n3 bardak su (kıvamına göre)\n1 avuç dereotu\nTuz, nane, pul biber, karabiber\nKabakları soteleyip kalan malzemeleri ekleyerek kaynayana kadar pişiriyoruz.'],
    ['AKŞAM', 'Detoks çorbası (brokolili)', '1 demet brokoli\n1 adet havuç\n1 adet soğan\n1 çay bardağı süt\nSu (brokolileri geçene kadar)\n1 yemek kaşığı zeytinyağı\nTuz, karabiber\n\nKüp doğranmış soğan ve havucu yağda kavuruyoruz. Brokoliyi ekleyip biraz daha kavuruyoruz. Süt ve suyu ekleyip kaynatıyoruz, baharatları ekliyoruz. Yumuşayınca blenderdan geçiriyoruz. Yerken üzerine limon sıkabiliriz.'],
    ['AKŞAM', 'Detoks çorbası (sebzeli)', '1 yemek kaşığı zeytinyağı\n1 orta boy beyaz soğan\n1-2 diş sarımsak\n1 küçük boy havuç\n2 adet yeşil kabak\n2 avuç ıspanak (yerine brokoli olabilir)\n1 orta boy domates (rendelenmiş)\n1 çay kaşığı kurutulmuş fesleğen\n1/2 çay kaşığı kurutulmuş kekik\n1/2 çay kaşığı pul biber\n1 çay kaşığı ucu kimyon, zencefil, karabiber\n1 silme çay kaşığı zerdeçal\nTuz\nAldığı kadar su ile sebze çorbası gibi yapılıyor. İçerken üzerine limon sıkmayı unutmayın :)'],
    ['AKŞAM', 'Yoğurtlu baklagil çorbası', '1 yemek kaşığı yeşil mercimek\n1 yemek kaşığı kırmızı mercimek\n1 yemek kaşığı bulgur\n1 yemek kaşığı buğday\n5 su bardağı sıcak su\nTuz\n\nTerbiyesi: 3 yemek kaşığı yoğurt + 1 yumurta sarısı + 1 yemek kaşığı un + tuz\nSosu: 1 küçük kuru soğan, 1 yemek kaşığı tereyağı, 1 yemek kaşığı zeytinyağı, 1 tatlı kaşığı kuru nane, 1 çay kaşığı pul biber, karabiber, kimyon\n\nBakliyatları yumuşayana kadar pişirin. Terbiyeyi çorbadan 1-2 kepçe ile ılıştırıp ekleyin, kısık ateşte 3-4 dk kaynatın. Soğanı yağda soteleyip baharatlarla çorbaya ekleyin.'],
    ['ÖĞLE', 'Yoğurtlu tavuklu salata', '1 avuç kadar haşlanmış tavuk göğsü\n4 kaşık yoğurt\n1 yemek kaşığı mısır (isteğe bağlı)\n1 diş sarımsak\nİstediğiniz yeşillikler\nSalatalık\nTuz, pul biber'],
    ['ÖĞLE', 'Yeşil mercimekli semizotu salatası', 'Semizotu (istediğin kadar)\n1 adet salatalık\n4-5 yemek kaşığı haşlanmış yeşil mercimek (veya başka kurubaklagil)\n4 kaşık yoğurt\n1 tatlı kaşığı zeytinyağı\nSarımsak, tuz, pul biber\nMercimekleri 10 dk pişiriyoruz. Semizotunu doğruyoruz, diğer malzemeleri ekleyip karıştırıyoruz.'],
    ['ÖĞLE', 'Yeşil mercimek salatası', '4 yemek kaşığı haşlanmış yeşil mercimek\n1 küçük havuç\n1 yemek kaşığı mısır\nYarım kapya biber\n2 adet küçük kornişon turşu\nYeşillikler\n1 tatlı kaşığı zeytinyağı\n1 tatlı kaşığı nar ekşisi\nLimon, baharatlar\nYanına 1 su bardağı kefir veya 1 bardak ayran.'],
    ['ÖĞLE', 'Kurubaklagil salatası', '4 yemek kaşığı haşlanmış kurubaklagil (nohut, yeşil mercimek, meksika fasulyesi, barbunya vb.)\n1 adet kapya biber\n1/4 demet dereotu\n1/4 demet maydanoz\n2 yemek kaşığı lor peyniri veya 2 dilim peynir\n1/4 adet limon\n1 tatlı kaşığı zeytinyağı\nKurubaklagili, ince doğranmış biberi ve yeşillikleri geniş bir kaba alıp lor peynirini ekleyin. Zeytinyağı ve limonu karıştırıp salatayla harmanlayın.'],
    ['ÖĞLE', 'Tok tutan salata', '4 yemek kaşığı nohut\n1 adet kabak\n1 adet kapya biber\n1 adet havuç\n1 yemek kaşığı zeytinyağı\n+ 4 yemek kaşığı yoğurt (sosu gibi yapabilirsiniz)'],
    ['ÖĞLE', 'Rokalı çilekli salata', 'Roka (istediğiniz kadar)\n3 dilim tulum peyniri veya beyaz peynir\n10 adet küçük çilek\n2 tam ceviz\n1 tatlı kaşığı zeytinyağı\n1 tatlı kaşığı nar ekşisi\nLimon, tuz'],
    ['ÖĞLE', 'Kinoalı salata', '1 çay bardağı kinoa\n1 küçük domates\n2 yemek kaşığı mısır\n3 ince dilim peynir\nYarım avokado\nKırmızı soğan\nRoka\n1 tatlı kaşığı zeytinyağı\nTuz'],
    ['ÖĞLE', 'Meyveli salata', 'İstediğiniz yeşillikler\n3 dilim beyaz peynir\n5 adet çilek veya 2 adet kayısı veya 5-6 adet kiraz\n4 tam ceviz\n1 tatlı kaşığı zeytinyağı\n1 tatlı kaşığı nar ekşisi\nLimon, tuz'],
    ['ÖĞLE', 'Ananaslı salata', 'İstediğiniz yeşillikler\n1 adet kapya biber\nMor soğan\nDomates, salatalık\n2 halka dilim ananas\nLimon\n1 tatlı kaşığı zeytinyağı\n1 tatlı kaşığı nar ekşisi\nTuz'],
    ['ÖĞLE', 'Pancar salatası', '1 adet küçük pancar\nDereotu\n1 yemek kaşığı mısır\nSarımsak\nTuz\n1 tatlı kaşığı zeytinyağı\nLimon'],
    ['AKŞAM', 'Kabak tarator', '2 adet kabak\n1 adet havuç\n4 kaşık yoğurt (sarımsaklı, isteğe bağlı)\nBaharat\n2 tam ceviz'],
    ['AKŞAM', 'Somonlu bowl', '100 g somon\n2 yemek kaşığı haşlanmış kinoa\nYarım avokado\nYeşillikler\nLimon, zeytinyağı\n1 tatlı kaşığı çiğ kabak çekirdeği içi'],
    // Atıştırmalık & tatlı
    ['ATIŞTIRMALIK & TATLI', 'Ev yapımı dondurma (2 çeşit)', 'Tüm malzemeler robotta çekilerek yapılır; biri seçilir.\n\n1) 1 küçük donmuş olgun muz + 10 donmuş çilek veya 1 yemek kaşığı yaban mersini + 2 kaşık süzme yoğurt\n2) 1 küçük donmuş olgun muz + 1 tatlı kaşığı kakao + 3 yemek kaşığı süt'],
    ['ATIŞTIRMALIK & TATLI', 'Chia tohumlu kakaolu puding', '2 yemek kaşığı chia tohumu\n1 çay kaşığı bal\n1 yemek kaşığı kakao\nYarım su bardağı kefir veya hindistan cevizi sütü\nÜzerine 2 yemek kaşığı orman meyvesi\n(Chiaları bekletip şişiriyoruz)'],
    ['ATIŞTIRMALIK & TATLI', 'Fit toplar', 'Yarım su bardağı badem unu\n3 kare bitter çikolata (%85)\n1 yemek kaşığı kakao\n1-2 yemek kaşığı hindistan cevizi yağı'],
    ['ATIŞTIRMALIK & TATLI', 'Karabuğday patlağı ve orman meyveli soğuk kase', '1/2 su bardağı karabuğday patlağı\n1/3 su bardağı orman meyvesi\n1 tatlı kaşığı chia tohumu\n1 tatlı kaşığı hindistan cevizi yağı\n2-3 yemek kaşığı şekersiz bitkisel süt\n1 tutam tarçın veya toz vanilya (isteğe bağlı)\n\nChia ile sütü 5-10 dk bekletin, karabuğday patlağını ekleyip karıştırın. Üzerine orman meyvelerini koyup hindistan cevizi yağını gezdirin. 5-10 dk buzdolabında bekletin.'],
    ['ATIŞTIRMALIK & TATLI', 'Cennet hurmalı puding', '1 küçük boy cennet hurması\n4 tam ceviz\n1 tatlı kaşığı kakao\nTüm malzemeler robotta çekilir.'],
    ['SABAH', 'Kabızlık için marmelat', '3 tane kuru incir\n3 tane gün kurusu\n2 tatlı kaşığı keten tohumu\n1 tatlı kaşığı zeytinyağı\nİncir ve gün kurusunu yıkayıp küçük parçalara ayırıyor, 1 çay bardağı sıcak suda bekletiyoruz. Sonra tüm malzemeleri çekip kavanozda saklıyoruz.\n(Kalkınca 1 bardak su + 1 tatlı kaşığı marmelat)'],
    // Bilgi listeleri
    ['BİLGİ & VİDEO', '1 porsiyon meyve', PORSIYON_MEYVE],
    ['BİLGİ & VİDEO', '1 porsiyon kuruyemiş', PORSIYON_KURUYEMIS],
    ['BİLGİ & VİDEO', 'Diyete başlarken alışveriş listesi', ALISVERIS],
    ['BİLGİ & VİDEO', 'Kilo koruma programı', KILO_KORUMA],
    ['BİLGİ & VİDEO', 'Hamilelikte beslenme', HAMILELIK],
    ['BİLGİ & VİDEO', 'Emzirme döneminde beslenme', EMZIRME],
    ['BİLGİ & VİDEO', 'Gastrit için beslenme önerileri', GASTRIT],
    ['BİLGİ & VİDEO', 'Tiroid – guatrojenik besinler', TIROID],
    ['BİLGİ & VİDEO', 'Lipödemde kaçınılması gerekenler', LIPODEM],
    ['BİLGİ & VİDEO', 'Ramazanda beslenme önerileri', RAMAZAN.map(s => '• ' + s).join('\n')],
    ['BİLGİ & VİDEO', 'Sıklıkla tüketilmesi gereken besinler', SIK_TUKET],
  ];
  const tarif = baslik => { const x = TARIFLER.find(a => a[1] === baslik); return { title: x[1].toLocaleUpperCase('tr'), body: x[2] }; };
  const detoks = { title: 'DETOKS ÇAYI', body: DETOKS_CAYI };

  // ---------- şablonlar ----------
  const P = s => `SAĞLIKLI BESLENME PROGRAMI${s ? ' (' + s + ')' : ''}`;
  const SABLONLAR = [
    {
      ad: 'Sağlıklı Beslenme – Klasik 5 öğün', aciklama: 'Docs listelerinde en sık kullanılan düzen (kahvaltı, kahve arası, ikindi, akşam, gece)',
      data: { sections: [{ title: P(), rows: [
        r('SABAH', '09.30', KAHVALTI_SECENEKLI), r('ARA', '13.00', KAHVE_TATLI), r('ARA', '15.30', SUT_MEYVE_KURUYEMIS),
        r('AKŞAM', '19.00', AKSAM_TABAK_TARIFLI), r('GECE', '21.00', GECE_BITKI)] }],
      notes: [N.su25, N.yesilCay, N.spor3], recipes: [detoks] },
    },
    {
      ad: 'Çalışan – Hafta içi (öğle dahil) + Hafta sonu', aciklama: 'İşte öğle yemeği olan 6 öğünlü hafta içi + daha geç başlayan hafta sonu',
      data: { sections: [
        { title: P('HAFTA İÇİ'), rows: [
          r('SABAH', '08.30', KAHVALTI), r('ARA', '10.30', KAHVE_TATLI), r('ÖĞLE', '13.00', OGLE_TABAK + '\n\nVeya (dışarıda)\n' + OGLE_DISARIDA),
          r('ARA', '15.30', SUT_MEYVE_KURUYEMIS), r('AKŞAM', '19.00', AKSAM_TABAK), r('GECE', '21.00', GECE_BITKI)] },
        { title: P('HAFTA SONU'), rows: [
          r('SABAH', '11.00', KAHVALTI_SECENEKLI), r('ARA', '13.00', KAHVE_TATLI), r('ARA', '15.00', ARA_SECENEKLI),
          r('AKŞAM', '18.30', AKSAM_TABAK_TARIFLI), r('GECE', '20.30', GECE_MEYVE)] }],
      notes: [N.su25, N.yesilCay, N.ogleEt], recipes: [detoks] },
    },
    {
      ad: 'Çalışan – İş günü + Spor günü + Hafta sonu', aciklama: 'Spor yapılan iş günlerinde spor öncesi ara öğün ve proteinli akşam',
      data: { sections: [
        { title: P('İŞ'), rows: [
          r('SABAH', '09.30', KAHVALTI_2YUMURTA), r('ARA', '11.00', 'Sade türk kahvesi'), r('ÖĞLE', '13.00', OGLE_HAFIF),
          r('ARA', '15.30', '2-3 dilim karpuz veya 1 küçük şeftali veya 1 küçük muz veya 10 adet kiraz veya 1 küçük nektarin\n\nVeya\n10 çiğ badem veya 10 çiğ fındık veya 3 tam ceviz'),
          r('AKŞAM', '19.00', AKSAM_TABAK_TARIFLI), r('GECE', '21.00', GECE_BITKI)] },
        { title: P('İŞ SPOR OLAN GÜNLER'), rows: [
          r('SABAH', '09.30', KAHVALTI_2YUMURTA), r('ARA', '11.00', 'Sade türk kahvesi'), r('ÖĞLE', '13.00', 'Yeşil mercimek salatası + 1 su bardağı kefir\n(4 yemek kaşığı haşlanmış yeşil mercimek + 1 küçük havuç + 1 yemek kaşığı mısır + yarım kapya biber + 2 adet küçük kornişon turşu + yeşillikler + 1 tatlı kaşığı zeytinyağı + 1 tatlı kaşığı nar ekşisi + limon + baharatlar)'),
          r('ARA', '15.00', '6 çiğ badem veya 6 çiğ fındık'), r('ARA', '18.00', SPOR_ONCESI), r('AKŞAM', '19.30', AKSAM_SPOR)] },
        { title: P('HAFTA SONU'), rows: [
          r('SABAH', '10.30', KAHVALTI_SECENEKLI), r('ARA', '13.00', 'Sade türk kahvesi veya filtre kahve\n+\n1 kare bitter çikolata'),
          r('ARA', '15.00', ARA_SECENEKLI), r('AKŞAM', '18.30', AKSAM_TABAK), r('GECE', '20.30', GECE_BITKI)] }],
      notes: [N.su2, N.yesilCay, N.detoksBitki, 'HAFTADA 3 GÜN 45 DK SPOR YAPILMALI!'], recipes: [] },
    },
    {
      ad: 'Sağlık çalışanı – Mesai + 24 saat nöbet + Boş gün + Nöbet sonrası', aciklama: '4 gün tipi: 08.00-16.00 mesai, 24 saat nöbet, boş gün, nöbet sonrası',
      data: { sections: [
        { title: P('08.00-16.00 MESAİ'), rows: [
          r('SABAH', '', 'Kalkınca: 1 büyük bardak su'), r('ÖĞLE', '12.00', OGLE_TABAK),
          r('ARA', '15.30', '1 adet probiyotik shot veya 1 adet probiyotik yoğurt\n+\n2 adet gün kurusu\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz'),
          r('AKŞAM', '18.00', OGLE_TABAK), r('ARA', '19.30', '1 küçük şeftali veya 1 küçük muz veya 1 küçük incir\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz')] },
        { title: P('24 SAAT NÖBET'), rows: [
          r('SABAH', '', 'Kalkınca: 1 büyük bardak su'), r('ÖĞLE', '12.00', OGLE_TABAK),
          r('ARA', '15.30', '1 adet probiyotik shot veya 1 adet probiyotik yoğurt\n+\n2 adet gün kurusu\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz'),
          r('AKŞAM', '18.00', OGLE_TABAK), r('ARA', '20.30-22.30', '1 kutu kefir\n+\n1 küçük muz veya 2 yemek kaşığı yaban mersini\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz')] },
        { title: P('BOŞ GÜN'), rows: [
          r('SABAH', '', 'Kalkınca: 1 büyük bardak su'), r('KAHVALTI', '12.00', KAHVALTI.replace('Kalkınca: 1 büyük bardak su\n\n', '')),
          r('ARA', '15.00', '4 yemek kaşığı yoğurt + 2 yemek kaşığı granola + 1 küçük muz\n\nVeya\n1 su bardağı kefir + 2 adet grissini + 1 küçük incir'),
          r('AKŞAM', '19.00', OGLE_TABAK), r('GECE', '20.30', '2 adet gün kurusu içine 1 tam ceviz veya\n2 adet hurma içine 2 çiğ badem')] },
        { title: P('NÖBET SONRASI'), rows: [
          r('SABAH', '14.30', KAHVALTI), r('AKŞAM', '18.30', OGLE_TABAK),
          r('ARA', '20.30', '1 adet probiyotik shot veya 1 adet probiyotik yoğurt\n+\n1 yemek kaşığı yaban mersini\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz')] }],
      notes: [N.su25, 'GÜN İÇİNDE 1 KEZ YEŞİL ÇAY İÇİLMELİ'], recipes: [tarif('Sıklıkla tüketilmesi gereken besinler')] },
    },
    {
      ad: 'Vardiyalı – Gece nöbeti (19.00-07.00) + Nöbet sonrası + Gündüz nöbeti', aciklama: 'Gece boyunca 3 saatte bir hafif ara öğün; nöbet sonrası, evde ve gündüz nöbeti günleri',
      data: { sections: [
        { title: P('GECE NÖBETİ 19.00-07.00'), rows: [
          r('AKŞAM', '17.00', 'Kalkınca: 1 bardak su\n\n' + AKSAM_BUYUK), r('ARA', '21.00', MUSLI), r('ARA', '00.00', NOBET_GECE_1), r('ARA', '03.00', NOBET_GECE_2)] },
        { title: P('NÖBET SONRASI'), rows: [
          r('AKŞAM', '19.00', 'Kalkınca: 1 bardak su\n\n' + AKSAM_BUYUK),
          r('ARA', '23.00', '3 adet grissini + 1 küçük muz + 15 çiğ badem\n\nVeya\n1 kahve fincanı leblebi + 1 adet nektarin + 15 çiğ fındık\n\nVeya\n2 adet karabuğday patlağı + 2 tatlı kaşığı fıstık ezmesi + yarım muz + 10 çiğ fındık'),
          r('ARA', '02.00', MUSLI)] },
        { title: P('EV'), rows: [
          r('SABAH', '10.00', 'Kalkınca: 1 bardak su\nSütlü kahve\n+\n2 kare bitter çikolata veya\n2 adet hurma içine 2 çiğ badem veya\n2 adet kayısı içine 1 tam ceviz'),
          r('KAHVALTI', '11.00', KAHVALTI_2YUMURTA.replace('Kalkınca: 1 büyük bardak su\n\n', '') + '\n\nVeya\n' + GECEDEN_KALMA),
          r('ARA', '15.00', SUTLU_KAHVE_ARA), r('AKŞAM', '18.00', AKSAM_BUYUK),
          r('GECE', '21.00', 'Detoks çayı veya sade maden suyu (isteğe bağlı)\n2 adet kuru kayısı içine 2 tam ceviz veya\n1 adet sağlıklı brownie')] },
        { title: P('GÜNDÜZ NÖBETİ 07.00-19.00'), rows: [
          r('SABAH', '07.00', 'Kalkınca: 1 bardak su\nSütlü kahve\n+\n2 kare bitter çikolata veya\n2 adet hurma içine 2 çiğ badem'),
          r('KAHVALTI', '10.00', GECEDEN_KALMA), r('ARA', '15.00', AKSAM_BUYUK), r('AKŞAM', '20.00', NOBET_GECE_1)] }],
      notes: [N.su25, 'GÜN İÇİNDE 1 KEZ YEŞİL ÇAY İÇİLMELİ'], recipes: [] },
    },
    {
      ad: 'Vardiyalı – Gece vardiyası (20.00-08.00) + İzin günü', aciklama: 'Gece yarısı ana öğün, sabaha karşı kahvaltı',
      data: { sections: [
        { title: P('20.00-08.00'), rows: [
          r('AKŞAM', '18.00', 'Kalkınca: 1 büyük bardak su\n\n' + AKSAM_TABAK),
          r('ARA', '22.00', 'Sade türk kahvesi veya papatya çayı veya detoks çayı veya sade maden suyu\n2 adet gün kurusu + 2 tam ceviz veya\n2 kare bitter çikolata veya\n1 adet hurma topu'),
          r('GECE', '00.00', '1 kepçe çorba veya 2 yemek kaşığı pilav veya 2 yemek kaşığı makarna veya 1 ince dilim esmer ekmek (sadece biri seçilmeli)\n+\n1 el kadar balık veya 1 avuç kadar tavuk veya 4 adet köfte veya 6 yemek kaşığı kurubaklagil yemeği veya 6 yemek kaşığı sebze yemeği (bunlardan biri seçilmeli)\n+\n4 kaşık yoğurt veya 1 bardak ayran\n+\nSalata'),
          r('ARA', '03.00', '1 küçük nektarin veya 10 adet küçük boy çilek veya 12 adet kiraz veya 1 küçük muz\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz'),
          r('SABAH', '05.30', KAHVALTI.replace('Kalkınca: 1 büyük bardak su\n\n', ''))] },
        { title: P('İZİN GÜNÜ'), rows: [
          r('SABAH', '12.30', 'Kalkınca: 1 büyük bardak su\n\nYulaflı kefirli smoothie\n\nVeya\n' + KAHVALTI.replace('Kalkınca: 1 büyük bardak su\n\n', '')),
          r('ARA', '13.30', 'Sade türk kahvesi veya papatya çayı veya detoks çayı veya sade maden suyu\n+\n1 kare bitter çikolata'),
          r('ARA', '15.00', '2 adet karabuğday patlağı + 2 tatlı kaşığı fıstık ezmesi + yarım muz'),
          r('AKŞAM', '19.00', AKSAM_TABAK)] }],
      notes: [N.su25, N.yesilCay], recipes: [] },
    },
    {
      ad: 'Oruç (Ramazan) + Bayram', aciklama: 'Sahur, iftar, iftar sonrası ara öğün; bayram günleri için ayrı program ve ramazan önerileri',
      data: { sections: [
        { title: P('ORUÇ'), rows: [r('SAHUR', '', SAHUR), r('İFTAR', '', IFTAR), r('ARA', '21.00', IFTAR_ARA)] },
        { title: P('BAYRAM'), rows: [
          r('SABAH', '11.00', KAHVALTI), r('ARA', '13.00', KAHVE_TATLI + '\n\nVeya\n2 küçük dilim baklava (bayram günü)'),
          r('ARA', '15.00', SUT_MEYVE_KURUYEMIS), r('AKŞAM', '18.30', AKSAM_TABAK), r('GECE', '20.30', GECE_BITKI)] }],
      notes: [N.su25, ...RAMAZAN], recipes: [{ title: 'DETOKS ÇAYI', body: DETOKS_CAYI.replace('tüm gün içebilirsiniz.', 'iftar ile sahur arasında içebilirsiniz.') }] },
    },
    {
      ad: 'Tatil programı', aciklama: 'Geç kahvaltı, hafif öğlen; akşamlar gün gün öneri',
      data: { sections: [{ title: P('TATİL'), rows: [
        r('ARA', '10.00', 'Kalkınca: 1 büyük bardak su\n2 küçük kayısı veya yarım şeftali'),
        r('SABAH', '12.30', KAHVALTI_SECENEKLI.replace('Kalkınca: 1 büyük bardak su\n\n', '')),
        r('ARA', '13.30', 'Sade türk kahvesi'), r('ARA', '15.30', TATIL_ARA), r('AKŞAM', '18.30', TATIL_AKSAM),
        r('GECE', '21.00', 'Sade maden suyu veya detoks çayı veya açık çay (isteğe bağlı)')] }],
      notes: [N.su3, N.yesilCay, N.spor3], recipes: [detoks, tarif('Ananaslı detoks çayı')] },
    },
    {
      ad: 'Normal gün + Spor günleri', aciklama: 'Spor günlerinde öğün saatleri kayar, spor öncesi ara öğün eklenir',
      data: { sections: [
        { title: P(), rows: [
          r('SABAH', '08.30', KAHVALTI), r('ARA', '10.30', KAHVE_TATLI), r('ÖĞLE', '12.30', OGLE_HAFIF),
          r('ARA', '15.30', SUT_MEYVE_KURUYEMIS), r('AKŞAM', '19.00', AKSAM_TABAK), r('GECE', '21.00', GECE_BITKI)] },
        { title: P('SPOR GÜNLERİ'), rows: [
          r('SABAH', '11.00', KAHVALTI), r('ARA', '12.00', 'Sade türk kahvesi'), r('ÖĞLE', '15.30', '(Spor sonrası)\n' + AKSAM_SPOR),
          r('ARA', '17.00', SPOR_ONCESI), r('AKŞAM', '19.00', AKSAM_TABAK), r('GECE', '21.00', GECE_BITKI)] }],
      notes: [N.su25, N.yesilCay, 'Spor günleri akşam et olabilir'], recipes: [] },
    },
    {
      ad: 'Gün gruplarına göre (Pzt-Cuma / Salı-Çarş-Perş / Hafta sonu)', aciklama: 'Aynı hafta içinde farklı düzenler: erken kalkılan günler, hafif öğle günleri ve hafta sonu',
      data: { sections: [
        { title: P('PAZARTESİ-CUMA'), rows: [
          r('SABAH', '07.00', 'Kalkınca: 1 bardak su\n\n2 adet gün kurusu veya yarım elma veya yarım muz veya yarım greyfurt\n+\n10 çiğ badem veya 10 çiğ fındık veya 3 tam ceviz veya 15 adet yer fıstığı'),
          r('ARA', '10.00', GECEDEN_KALMA), r('ÖĞLE', '13.30', KAHVALTI.replace('Kalkınca: 1 büyük bardak su\n\n', '') + '\n\nVeya\n2 yemek kaşığı kıyma + 1 adet yumurta (1 çay kaşığı zeytinyağı)\nDomates-salatalık (limonlu) ve bol yeşillik\n1 ince dilim esmer ekmek'),
          r('AKŞAM', '18.00', AKSAM_TABAK), r('GECE', '21.00', 'Detoks çayı veya sade maden suyu (isteğe bağlı)')] },
        { title: P('SALI-ÇARŞAMBA-PERŞEMBE'), rows: [
          r('SABAH', '07.00', 'Kalkınca: 1 bardak su\n\n2 adet gün kurusu veya yarım elma veya yarım muz veya yarım greyfurt\n+\n10 çiğ badem veya 10 çiğ fındık veya 3 tam ceviz veya 15 adet yer fıstığı'),
          r('ARA', '10.00', GECEDEN_KALMA), r('ÖĞLE', '14.30', '1 dilim tahinli fit kek + sütlü kahve\n\nVeya\n' + OGLE_HAFIF),
          r('AKŞAM', '18.00', AKSAM_TABAK), r('GECE', '21.00', 'Detoks çayı veya sade maden suyu (isteğe bağlı)')] },
        { title: P('HAFTA SONU'), rows: [
          r('SABAH', '10.00', KAHVALTI), r('ARA', '12.00', 'Bitki çayı\n+\n2 kare bitter çikolata veya\n2 adet hurma içine 2 çiğ badem veya\n2 adet gün kurusu içine 1 tam ceviz'),
          r('ARA', '15.00', '1 su bardağı kefir\n+\n1 küçük muz veya 1 küçük elma veya yarım greyfurt\n+\n10 çiğ badem veya 10 çiğ fındık veya 3 tam ceviz veya 15 adet yer fıstığı'),
          r('AKŞAM', '18.00', AKSAM_TABAK + '\n\nHaftada 3 gün aşağıdaki yemekleri yapabilirsen daha iyi sonuç alabiliriz\nYaz salatası (5 yemek kaşığı nohut ile) > 1 gün\n2 yarım kabak sandal + 4 yemek kaşığı yoğurt > 1 gün\nEzilmiş çıtır patatesli salata > 1 gün'),
          r('GECE', '21.00', 'Detoks çayı veya sade maden suyu (isteğe bağlı)')] }],
      notes: [N.su2, 'GÜN İÇİNDE 1 KEZ YEŞİL ÇAY İÇİLMELİ', N.sadeceBunlar], recipes: [detoks, tarif('Çilekli smoothie')] },
    },
    {
      ad: 'Ofis + Ev + Hafta sonu', aciklama: 'Ofiste taşınabilir seçenekler, evde ve hafta sonu klasik düzen',
      data: { sections: [
        { title: P('OFİS'), rows: [
          r('SABAH', '08.00', 'Kalkınca: 1 büyük bardak su\nSade türk kahvesi veya filtre kahve'),
          r('KAHVALTI', '10.00', 'Sandviç:\n1 ince dilim esmer ekmek (çapraz kesip)\n2 dilim peynir\nDomates-salatalık-yeşillik\n2 dilim hindi füme (isteğe bağlı)\n\nVeya\n' + GECEDEN_KALMA),
          r('ARA', '15.00', '1 su bardağı kefir + 1 paket granola bar\n\nVeya\n1 küçük muz + 10 çiğ fındık\n\nVeya\n1 paket meyve bar'),
          r('AKŞAM', '18.30', AKSAM_TABAK), r('GECE', '20.30', GECE_BITKI)] },
        { title: P('EV'), rows: [
          r('SABAH', '08.00', 'Kalkınca: 1 büyük bardak su'), r('KAHVALTI', '09.30', KAHVALTI_SECENEKLI.replace('Kalkınca: 1 büyük bardak su\n\n', '')),
          r('ARA', '15.00', SUT_MEYVE_KURUYEMIS), r('AKŞAM', '18.30', AKSAM_TABAK), r('GECE', '20.30', GECE_BITKI)] },
        { title: P('HAFTA SONU'), rows: [
          r('SABAH', '08.00', 'Kalkınca: 1 büyük bardak su'), r('KAHVALTI', '10.30', KAHVALTI_SECENEKLI.replace('Kalkınca: 1 büyük bardak su\n\n', '')),
          r('ARA', '15.00', ARA_SECENEKLI), r('AKŞAM', '18.30', AKSAM_TABAK_TARIFLI), r('GECE', '20.30', GECE_TATLI)] }],
      notes: [N.su25, N.yesilCay], recipes: [] },
    },
    {
      ad: 'Haftalık akşam menüsü (gün gün)', aciklama: 'Akşam yemeği her gün için ayrı yazılır (> gün); diğer öğünler klasik',
      data: { sections: [{ title: P(), rows: [
        r('SABAH', '08.00', KAHVALTI_SECENEKLI), r('ARA', '10.00', KAHVE_TATLI),
        r('ARA', '12.00-13.00', '4 yemek kaşığı yoğurt + 2 yemek kaşığı yulaf ezmesi + 2 tam ceviz + 1 küçük muz + tarçın\n\nVeya\n' + OGLE_HAFIF),
        r('AKŞAM', '17.00', HAFTALIK_AKSAM),
        r('GECE', '20.30', '1 adet probiyotik yoğurt veya 1 büyük çay bardağı kefir veya 1 büyük çay bardağı süt\n+\n1 adet mandalina veya 1 küçük elma veya 1 avuç üzüm veya 1 küçük incir\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz')] }],
      notes: [N.su3, 'HAFTADA EN AZ 2 GÜN 30 DK SPOR YAPALIM!'], recipes: [] },
    },
    {
      ad: 'Hamilelik dönemi', aciklama: 'Klasik düzen + hamilelikte tüketilecek/kaçınılacak besinler listesi',
      data: { sections: [{ title: P(), rows: [
        r('SABAH', '09.00', KAHVALTI_2YUMURTA), r('ARA', '11.00', '1 küçük muz + 2 tam ceviz\n\nVeya\n1 su bardağı süt + 2 adet gün kurusu'),
        r('ÖĞLE', '13.00', OGLE_TABAK), r('ARA', '15.30', SUT_MEYVE_KURUYEMIS), r('AKŞAM', '19.00', AKSAM_TABAK),
        r('GECE', '21.00', '1 çay bardağı süt veya 4 yemek kaşığı yoğurt\n+\n1 porsiyon meyve')] }],
      notes: [N.su25, 'Günde en fazla 2 çay bardağı açık çay ve 1 fincan kahve içilmeli', 'Bitki çaylarından uzak duralım'], recipes: [tarif('Hamilelikte beslenme')] },
    },
    {
      ad: 'Emzirme dönemi', aciklama: 'Sık öğünlü düzen + emzirme döneminde dikkat edilecek besinler',
      data: { sections: [{ title: P(), rows: [
        r('SABAH', '08.00', KAHVALTI_2YUMURTA.replace('1 ince dilim esmer ekmek', '1 çay kaşığı tahin-pekmez veya reçel\n1 ince dilim esmer ekmek') + '\n\nVeya\nAçık çay veya yeşil çay\nYulaf tost (1 adet yumurta + 3 yemek kaşığı yulaf ezmesi + 1 yemek kaşığı yoğurt + baharatlar + içine ince dilim kaşar peyniri)\n5 adet zeytin veya yarım avokado veya 2 tam ceviz\nBol yeşillik (limonlu)'),
        r('ARA', '10.00', 'Sade türk kahvesi (isteğe bağlı)\n+\n2 hurma içine 4 çiğ badem veya\n2 adet gün kurusu içine 1 tam ceviz veya\n2 adet hurma topu'),
        r('ARA', '12.00-13.00', '4 yemek kaşığı yoğurt\n2 yemek kaşığı yulaf ezmesi\n2 tam ceviz\n1 küçük muz veya 1 küçük incir\nTarçın\n\nVeya\n' + OGLE_HAFIF),
        r('AKŞAM', '17.00', AKSAM_TABAK),
        r('GECE', '20.30', '1 adet probiyotik yoğurt veya 1 büyük çay bardağı kefir veya 1 büyük çay bardağı süt\n+\n1 adet mandalina veya 1 küçük elma veya 1 avuç üzüm veya 1 küçük incir\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz')] }],
      notes: [N.su3, 'HAFTADA EN AZ 2 GÜN 30 DK YÜRÜYÜŞ YAPALIM!'], recipes: [tarif('Emzirme döneminde beslenme'), tarif('Kabızlık için marmelat')] },
    },
  ];

  // ---------- kütüphane: öğün metinleri ----------
  const OGUNLER = [
    ['SABAH', 'Kahvaltı – klasik (1 yumurta + peynir + zeytin)', KAHVALTI],
    ['SABAH', 'Kahvaltı – 2 yumurtalı', KAHVALTI_2YUMURTA],
    ['SABAH', 'Kahvaltı – seçenekli (klasik / yulaf tost / pankek / yoğurt kasesi)', KAHVALTI_SECENEKLI],
    ['SABAH', 'Kahvaltı – avokadolu yumurta', 'Açık çay veya kiraz sapı çayı\n1 adet haşlanmış yumurta veya 1 adet çırpılmış yumurta\nYarım avokado + 1 tatlı kaşığı labne + biraz limon + tuz\nDomates-salatalık (limonlu) ve yeşillik (limonlu)\n1 ince dilim esmer ekmek (ekmeğin üstüne avokado sos, onun üstüne yumurta)'],
    ['SABAH', 'Kahvaltı – sandviç', 'Açık çay veya kiraz sapı çayı\n2 dilim beyaz peynir\n5 adet zeytin veya yarım küçük boy avokado\nBol yeşillik (limonlu) veya domates-salatalık\n2 dilim hindi füme (isteğe bağlı)\n1 ince dilim esmer ekmek (ikiye çapraz bölüp)'],
    ['SABAH', 'Kahvaltı – pankek / poğaça / muffin seçenekleri', 'Açık çay veya kiraz sapı çayı (şekersiz)\nBebek pankek + istediğin bir meyve\n\nVeya\nAçık çay\nBörek pankek\nBol yeşillik (limonlu)\n\nVeya\nAçık çay\n3 adet yulaf poğaça\nBol yeşillik veya domates-salatalık-biber (limonlu)\n\nVeya\nAçık çay\nKahvaltılık muffin (tarifin yarısı)'],
    ['SABAH', 'Kahvaltı – yoğurt / granola kaseleri', '4 yemek kaşığı yoğurt + 2 yemek kaşığı granola + 1 küçük muz veya 5 adet çilek veya 1 yemek kaşığı orman meyvesi\n\nVeya\n1 su bardağı süt + 3 yemek kaşığı granola + 1 küçük muz + 2 tam ceviz\n\nVeya\n4 yemek kaşığı yoğurt + 2 yemek kaşığı granola + 1 tatlı kaşığı chia tohumu + yarım muz\n(Chia yoğurda karıştırılıp en az 15 dk beklenmeli)'],
    ['SABAH', 'Kahvaltı – geceden kalma yulaf / yoğurt', GECEDEN_KALMA],
    ['SABAH', 'Erken kalkış – meyve + kuruyemiş', 'Kalkınca: 1 bardak su\n\n2 adet gün kurusu veya yarım elma veya yarım muz veya yarım greyfurt\n+\n10 çiğ badem veya 10 çiğ fındık veya 3 tam ceviz veya 15 adet yer fıstığı'],
    ['SABAH', 'Kalkınca – sütlü kahve + tatlı', 'Kalkınca: 1 bardak su\nSütlü kahve\n+\n2 kare bitter çikolata veya\n2 adet hurma içine 2 çiğ badem veya\n2 adet kayısı içine 1 tam ceviz'],
    ['ARA', 'Kahve arası – türk kahvesi + bitter/hurma', KAHVE_TATLI],
    ['ARA', 'Süt grubu + meyve + kuruyemiş', SUT_MEYVE_KURUYEMIS],
    ['ARA', 'Probiyotik + meyve + kuruyemiş', '1 adet probiyotik yoğurt veya 1 adet probiyotik shot veya 150 ml kefir\n+\n1 küçük incir veya yarım nektarin veya yarım muz veya 1 halka ananas veya yarım avuç üzüm\n+\n2 tam ceviz veya 6 çiğ badem veya 6 çiğ fındık'],
    ['ARA', 'Ara öğün – seçenekli (patlak / yoğurt / kefir / karpuz)', ARA_SECENEKLI],
    ['ARA', 'Karabuğday patlağı seçenekleri', '1 adet karabuğday patlağı + 1 tatlı kaşığı fıstık ezmesi + yarım muz\n\nVeya\n2 adet karabuğday patlağı + 2 tatlı kaşığı fıstık ezmesi + 2 yemek kaşığı orman meyvesi\n\nVeya\n2 adet karabuğday patlağı + 2 tatlı kaşığı fıstık ezmesi + üzerine biraz nar\n\nVeya\n2 adet karabuğday patlağı + 2 tatlı kaşığı sürülebilir lor + baharatlar\n+\n2 tam ceviz veya 6 çiğ badem veya 6 çiğ fındık'],
    ['ARA', 'Meyve + kuruyemiş (yaz)', '12 adet kiraz veya 12 adet dut veya 1 küçük şeftali veya 4 küçük kayısı veya 7-8 adet küçük boy çilek veya 1 küçük muz veya 1 halka ananas\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz'],
    ['ARA', 'Meyve + kuruyemiş (kış)', '1 küçük mandalina veya 1 orta boy kivi veya 1 küçük elma veya 1/3 ayva veya 1/2 armut veya 1 küçük portakal\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz'],
    ['ARA', 'Yaz ara öğünleri – karpuz / kavun / kiraz / dut', '3-4 dilim karpuz + 1 dilim peynir\n\nVeya\n1 ay dilim kavun + 2 dilim peynir\n\nVeya\n12 adet kiraz + 6 çiğ badem\n\nVeya\n4 küçük kayısı + 6 çiğ fındık\n\nVeya\n12 adet dut + 2 tam ceviz\n\nVeya\n1 küçük nektarin + 6 çiğ badem'],
    ['ARA', 'Kış ara öğünleri – ayva / nar / mandalina / cennet hurması', '1/3 ayva (limonlu) + 3 tam ceviz\n\nVeya\n1 kase nar + 4 tam ceviz\n\nVeya\n2 küçük mandalina + 12 çiğ badem\n\nVeya\n1 küçük portakal + 4 tam ceviz\n\nVeya\n1 küçük cennet hurması + 1 tatlı kaşığı fıstık ezmesi + 1 tam ceviz\n\nVeya\n1 orta boy kivi + 12 çiğ badem'],
    ['ARA', 'Sütlü kahve + atıştırmalık', SUTLU_KAHVE_ARA],
    ['ARA', 'Kefir + grissini + meyve', '1 su bardağı kefir\n2 adet grissini\n1 küçük elma veya 1 orta boy kivi veya 10 adet küçük çilek\n2 tam ceviz'],
    ['ARA', 'Wasa / grissini + peynir', '1 adet wasa + 1 tatlı kaşığı labne + baharatlar + 6 çiğ badem\n\nVeya\n2 adet grissini + 1 dilim peynir + 6 çiğ fındık\n\nVeya\n2 adet wasa + arasına sürülebilir lor veya beyaz peynir + 6 çiğ badem'],
    ['ARA', 'Tatlı krizine – sağlıklı tatlı seçenekleri', 'Yeşil çay veya sade türk kahvesi\n1 kare bitter çikolata veya\n2 adet kokotop veya\n1 dilim sağlıklı brownie veya\n1 adet fit dondurma veya\n1 dilim havuçlu kek veya\n1 top dondurma (haftada 1 kez)'],
    ['ARA', 'Smoothie ara öğün', 'Yulaflı smoothie veya kırmızı smoothie veya kahveli smoothie veya ev yapımı dondurma\n(Tarifler aşağıda)'],
    ['ARA', 'Dışarıdaysan – paketli seçenekler', '1 paket meyve bar veya\n1 paket granola bar (düşük kalorili) veya\n1 paket kuruyemiş bar veya\nYarım protein bar\n+\n1 bardak ayran veya sütlü kahve'],
    ['ARA', 'Spor öncesi ara öğün', SPOR_ONCESI],
    ['ARA', 'Gece vardiyası – hafif ara öğünler', NOBET_GECE_1 + '\n\nVeya\n' + NOBET_GECE_2],
    ['ÖĞLE', 'Öğle – tabak modeli (yağsız salata)', OGLE_TABAK],
    ['ÖĞLE', 'Öğle – hafif seçenekler (mücver / ton balıklı salata / fırın sebze)', OGLE_HAFIF],
    ['ÖĞLE', 'Öğle – kahvaltı tabağı', KAHVALTI.replace('Kalkınca: 1 büyük bardak su\n\n', '') + '\n\nVeya\n2 yemek kaşığı kıyma + 1 adet yumurta (1 çay kaşığı zeytinyağı)\nDomates-salatalık (limonlu) ve bol yeşillik\n1 ince dilim esmer ekmek'],
    ['ÖĞLE', 'Öğle – iş yerinde ana yemek (5 yemek kaşığı)', '1 kepçe çorba veya 3 yemek kaşığı pilav veya yarım roll ekmek\n5 yemek kaşığı ana yemek (çatalla yenilmeli, suyu tabakta kalmalı)\n4 yemek kaşığı yoğurt veya 1 bardak ayran\nSalata (yağsız)\n\nVeya (öğle çorba olduğunda akşam et yemeği olmalı)\n1 kase çorba + salata (yağsız)'],
    ['AKŞAM', 'Akşam – tabak modeli (çorba/pilav + protein + yoğurt + salata)', AKSAM_TABAK],
    ['AKŞAM', 'Akşam – tabak modeli + haftada 3 gün tarif', AKSAM_TABAK_TARIFLI],
    ['AKŞAM', 'Akşam – büyük porsiyon (2 kepçe / 6 kaşık)', AKSAM_BUYUK],
    ['AKŞAM', 'Akşam – karbonhidratsız protein + salata', '1 el kadar balık veya 1 avuç kadar tavuk veya 4 adet köfte\n+\n4 yemek kaşığı yoğurt veya 1 bardak ayran\n+\nBol salata (limonlu) (1 tatlı kaşığı zeytinyağı)'],
    ['AKŞAM', 'Akşam – spor sonrası', AKSAM_SPOR],
    ['AKŞAM', 'Akşam – sebze/baklagil günü', '3 yemek kaşığı pilav veya 3 yemek kaşığı makarna veya 1 küçük patates (sadece biri seçilmeli)\n+\n8 yemek kaşığı sebze yemeği veya 8 yemek kaşığı kurubaklagil yemeği (biri seçilmeli) (yemeğin suyu tabakta kalmalı)\n+\n4 yemek kaşığı yoğurt\n+\nBol salata (limonlu) (1 tatlı kaşığı zeytinyağı)'],
    ['AKŞAM', 'Akşam tarifleri – haftanın günlerine göre', HAFTALIK_AKSAM],
    ['AKŞAM', 'Akşam tarif önerileri (> 1 gün)', 'Çıtır nohutlu kabak tarator > 1 gün\nSoslu tavuklu salata > 1 gün\nYeşil mercimek salatası + 1 bardak ayran > 1 gün\nKabak pizza + 1 bardak ayran > 1 gün\n4 dilim mücver + 1 bardak ayran > 1 gün\nBurger bowl > 1 gün\nDiyet dürüm + 1 bardak ayran > 1 gün\nSınırsız detoks çorbası + 4 yemek kaşığı yoğurt > 1 gün\nFırında sebze (kabak, havuç, biber, patlıcan) + 4 yemek kaşığı yoğurt > 1 gün\n1 el kadar balık + bol salata > 1 gün\n6 yemek kaşığı mercimek mantı + 4 yemek kaşığı yoğurt > 1 gün\nKarnabahar biftek + 4 yemek kaşığı yoğurt > 1 gün\n(Bu günlerde ekstra karbonhidrat grubu olmayacak)'],
    ['AKŞAM', 'Tatil akşamları', TATIL_AKSAM],
    ['AKŞAM', 'Yaz akşamları – sebze ve soğuk yemekler', '1 büyük kase soğuk çorba > 1 gün\nSemizotu salatası + 1 bardak ayran > 1 gün\n6 yemek kaşığı taze fasulye + 4 yemek kaşığı yoğurt > 1 gün\n4 yemek kaşığı yaz türlüsü + 2 yemek kaşığı bulgur pilavı + semizotu salatası > 1 gün\nKarpuzlu yaz salatası > 1 gün\n3 küçük boy biber dolması + 4 yemek kaşığı yoğurt + salata > 1 gün\n1 adet karnıyarık + cacık + 1 ince dilim esmer ekmek > 1 gün\nÇıtır kabak ve patlıcan + 4 yemek kaşığı yoğurt > 1 gün'],
    ['AKŞAM', 'Kış akşamları – sebze yemekleri ve çorbalar', '6 yemek kaşığı pırasa yemeği + 4 yemek kaşığı yoğurt + salata > 1 gün\n6 yemek kaşığı kıymalı kapuska yemeği + 4 yemek kaşığı yoğurt > 1 gün\nBrüksel lahanası + 4 yemek kaşığı yoğurt > 1 gün\nFırında karnabahar-havuç + 4 yemek kaşığı yoğurt > 1 gün\n6 yemek kaşığı ıspanak yemeği + 4 yemek kaşığı yoğurt > 1 gün\nSınırsız brokoli çorbası + 4 yemek kaşığı yoğurt > 1 gün\n6 yemek kaşığı etli kuru fasulye + 4 yemek kaşığı pirinç pilavı + 4 yemek kaşığı yoğurt + salata > 1 gün\n6 yemek kaşığı nohut yemeği + 4 yemek kaşığı yoğurt + salata > 1 gün'],
    ['GECE', 'Gece – bitki çayı (isteğe bağlı)', GECE_BITKI],
    ['GECE', 'Gece – meyve + kuruyemiş seçenekleri', GECE_MEYVE],
    ['GECE', 'Gece – tatlı alternatifleri', GECE_TATLI],
    ['GECE', 'Gece – süt grubu + meyve + kuruyemiş', '1 adet probiyotik yoğurt veya 1 büyük çay bardağı kefir veya 1 büyük çay bardağı süt\n+\n1 adet mandalina veya 1 küçük elma veya 1 avuç üzüm veya 1 küçük şeftali veya 1 küçük incir\n+\n6 çiğ badem veya 6 çiğ fındık veya 2 tam ceviz'],
    ['GECE', 'Gece – spor yaptıysan', 'Papatya veya melisa çayı veya sade maden suyu (isteğe bağlı)\nSpor yaptıysan:\nYarım protein bar veya\n1 çay bardağı proteinli süt veya\n1 su bardağı kefir'],
    ['SAHUR', 'Sahur – yumurtalı kahvaltı', SAHUR],
    ['SAHUR', 'Sahur – yoğurt kasesi', '1 adet haşlanmış yumurta\n4 kaşık yoğurt\n3 yemek kaşığı granola\n1 tatlı kaşığı fıstık ezmesi\n1 küçük muz'],
    ['İFTAR', 'İftar – su + hurma, çorba, 10 dk mola, ana yemek', IFTAR],
    ['ARA', 'İftar sonrası ara öğün (ramazan)', IFTAR_ARA],
  ];

  // ---------- kütüphane: notlar ----------
  const NOTLAR = [
    ['Su – 2 litre', N.su2], ['Su – 3 litre', N.su3],
    ['Yeşil çay (limonlu)', 'GÜN İÇİNDE MUTLAKA 1 KUPA YEŞİL ÇAY (LİMON SIKIP) İÇİLMELİ!'],
    ['Suya tarçın-maydanoz-limon', 'İÇİLEN SUYUN İÇİNE 1 ADET KABUK TARÇIN, BİR TUTAM MAYDANOZ, 2 DİLİM LİMON ATILABİLİR.'],
    ['Spor – haftada 3 gün 30 dk', N.spor3],
    ['Tempolu yürüyüş – haftada 2 gün 45 dk', N.yuruyus],
    ['Leslie / yürüyüş', 'HAFTADA 2 GÜN 30 DK LESLİE VEYA YÜRÜYÜŞ YAPILMALI!'],
    ['Detoks günü bitki çayı yok', 'GÜNDE EN FAZLA 2 KEZ BİTKİ ÇAYI İÇELİM, DETOKS ÇAYI İÇTİĞİMİZ GÜN BİTKİ ÇAYI İÇMEYELİM'],
    ['Türk kahvesi', 'GÜN İÇİNDE 2 KEZ SADE TÜRK KAHVESİ İÇEBİLİRSİN'],
    ['Maden suyu', 'GÜNDE 1 KEZ MADEN SUYU İÇEBİLİRSİN'],
    ['Akşamda protein', N.protein],
    ['Balık', N.balik],
    ['Haftalık protein dağılımı', 'Haftada 1 kez balık, 1 kez kırmızı et, 1 kez tavuk veya hindi, 4 kez etli sebze veya baklagil yemeği'],
    ['Öğle et → akşam sebze', N.ogleEt],
    ['Karbonhidratlı ana yemek', 'Ana yemek karbonhidratlı olursa ekmek-çorba grubunu tüketmeyelim'],
    ['Tarif günleri', N.sadeceBunlar],
    ['Sadece yazılanlar', 'Sadece bunlar yenilmeli, yanında ekstra bir şey olmamalı'],
    ['Çatalla yiyelim', 'Sebze yemeklerini çatalla yiyelim, suyu tabakta kalsın'],
    ['Porsiyon yazmayanlar', 'Miktarı yazmayan yemekleri porsiyonu kadar yiyebiliriz'],
    ['Pilav yerine çorba', 'Pilav yerine 1 kepçe çorba da içebilirsin'],
    ['Yoğurt yerine süt', 'Yoğurt yerine 1 su bardağı süt de kullanabilirsin'],
    ['Süt + meyve + kuruyemiş birlikte', '1 süt grubu, 1 meyve grubu, 1 kuruyemiş grubu seçilmeli ve aynı anda yenilmeli'],
    ['Sütlü kahve bir kez', 'Bu öğünde sütlü kahve içersek akşam içmeyelim'],
    ['Peynir önerisi', 'Peynir olarak önerim keçi ve koyun sütünden olanlar; onun dışında laktozsuz inek peyniri veya lor peyniri olabilir.'],
    ['Dışarıda yemek', 'Dışarıdan yerseniz tavuklu salata veya ızgara köfte tercih edebilirsiniz.'],
    ['Sabah çok yersen', 'Sabah çok yersen bu öğünü atlayabilirsin'],
    ['Meyve tarifleri', 'Genelde meyve yemeye çalışalım, aşağıdaki tariflerden haftada 2 gün tüketebiliriz'],
    ['Motivasyon', 'Pes etme, mucizeler yolda..'],
  ];

  // Mevsim atamaları (başlık → YAZ/KIŞ): paketteki kayıtlar + uygulamada önceden olan tarifler.
  // Paket eklenirken uygulanır; ayrıca sema.js geçişi uygulamadaki mevcut kayıtlara (mevsimi boşsa) ekler.
  const MEVSIMLER = {
    ogun: {
      'Meyve + kuruyemiş (yaz)': 'YAZ', 'Meyve + kuruyemiş (kış)': 'KIŞ', 'Tatil akşamları': 'YAZ',
      'Probiyotik + meyve + kuruyemiş': 'YAZ',
      'Yaz ara öğünleri – karpuz / kavun / kiraz / dut': 'YAZ', 'Kış ara öğünleri – ayva / nar / mandalina / cennet hurması': 'KIŞ',
      'Yaz akşamları – sebze ve soğuk yemekler': 'YAZ', 'Kış akşamları – sebze yemekleri ve çorbalar': 'KIŞ',
    },
    tarif: {
      // paket
      'Ev yapımı dondurma (2 çeşit)': 'YAZ', 'Rokalı çilekli salata': 'YAZ', 'Yeşil mercimekli semizotu salatası': 'YAZ',
      'Çilekli smoothie': 'YAZ', 'Kefirli smoothie (böğürtlen / çilek / muz)': 'YAZ', 'Meyveli salata': 'YAZ', 'Quark kasesi': 'YAZ',
      'Kabak tarator': 'YAZ', 'Tok tutan salata': 'YAZ',
      'Ayvalı detoks çayı': 'KIŞ', 'Elmalı detoks çayı': 'KIŞ', 'Cennet hurmalı puding': 'KIŞ', 'Diyete başlarken alışveriş listesi': 'KIŞ',
      'Detoks çorbası (brokolili)': 'KIŞ', 'Detoks çorbası (sebzeli)': 'KIŞ', 'Yoğurtlu baklagil çorbası': 'KIŞ', 'Pancar salatası': 'KIŞ',
      'Havuçlu kek tadında yulaf lapası': 'KIŞ', 'Tiramisu tadında yulaf lapası': 'KIŞ', 'Muzlu çikolatalı yulaf lapası': 'KIŞ',
      // uygulamada önceden olanlar
      'Karpuzlu limonata': 'YAZ', 'Karpuzlu yaz salatası': 'YAZ', 'Şeftalili yaz salatası': 'YAZ', 'Fırında baharatlı mısır': 'YAZ',
      'Çilekli cevizli smoothie': 'YAZ', 'Çilekli yulaflı atıştırmalık': 'YAZ', 'Çilekli buğday patlağı': 'YAZ', 'Patlıcan pizza': 'YAZ',
      'Çıtır kabaklar (fırında)': 'YAZ', 'Çıtır nohutlu kabak tarator': 'YAZ',
      'Portakallı cheesecake (yulaflı)': 'KIŞ', 'Karnabahar biftek': 'KIŞ', 'Elmalı kek tadında yulaf lapası': 'KIŞ', 'Detoks suyu': 'KIŞ',
      // her mevsime uyanlar (her tarif yaz ya da kış olmalı: içeriğine/dönemine en yakın olana)
      'Kabızlığa iyi gelen kuru meyve ezmesi': 'KIŞ', 'Bebek pankek': 'KIŞ', 'Tuzlu pankek (glutensiz)': 'KIŞ', 'Pratik sahur / kahvaltı tabağı': 'KIŞ',
      'Diyete başlarken market alışverişi (video)': 'KIŞ', '4 malzemeli kokotop': 'KIŞ', '3 malzemeli kahve yanı atıştırmalığı': 'KIŞ',
      'Avokado tarif': 'KIŞ', 'Somonlu bowl': 'KIŞ', 'Kurubaklagil salatası': 'KIŞ', '1 porsiyon kuruyemiş': 'KIŞ',
      'Sıklıkla tüketilmesi gereken besinler': 'KIŞ', 'Gastrit için beslenme önerileri': 'KIŞ',
    },
  };
  // Listede olmayan tarifler için içerikten tahmin (başlıktaki kelimeler daha ağırlıklı); eşitlikte yaz
  const YAZ_K = ['karpuz', 'kavun', 'çilek', 'kiraz', 'dut', 'şeftali', 'kayısı', 'nektarin', 'erik', 'böğürtlen', 'ahududu', 'yaban mersini', 'orman meyve',
    'kırmızı meyve', 'mısır', 'patlıcan', 'kabak', 'semizotu', 'domates', 'salatalık', 'roka', 'nane', 'dondurma', 'donmuş', 'soğuk', 'buz', 'limonata',
    'smoothie', 'salata', 'yaz'];
  const KIS_K = ['ayva', 'nar', 'mandalina', 'portakal', 'cennet hurması', 'kivi', 'greyfurt', 'pırasa', 'lahana', 'karnabahar', 'brokoli', 'ıspanak',
    'çorba', 'lapa', 'sıcak', 'kaynat', 'demle', 'tarçın', 'zencefil', 'karanfil', 'pancar', 'kereviz', 'kuru incir', 'kuru üzüm', 'hurma', 'kakao',
    'fırın', 'kış', 'pişir', 'somon', 'kestane', 'balkabağı'];
  function mevsimTahmin(baslik, icerik) {
    const b = String(baslik || '').toLocaleLowerCase('tr'), t = b + ' ' + String(icerik || '').toLocaleLowerCase('tr');
    const say = (ks, x) => ks.reduce((n, k) => n + (x.includes(k) ? 1 : 0), 0);
    const y = say(YAZ_K, t) + 2 * say(YAZ_K, b), k = say(KIS_K, t) + 2 * say(KIS_K, b);
    return k > y ? 'KIŞ' : 'YAZ';
  }
  const tarifMevsim = (baslik, icerik) => MEVSIMLER.tarif[baslik] || mevsimTahmin(baslik, icerik);
  // Tarifte tam olarak bir mevsim olur: yoksa eklenir, ikisi de varsa tahmin edilene indirilir
  function tekMevsim(kategori, baslik, icerik) {
    let k = String(kategori || '').split(',').map(x => x.trim()).filter(Boolean);
    const m = k.filter(x => x === 'YAZ' || x === 'KIŞ');
    if (m.length !== 1) { const sec = m.length ? tarifMevsim(baslik, icerik) : tarifMevsim(baslik, icerik); k = k.filter(x => x !== 'YAZ' && x !== 'KIŞ').concat(sec); }
    return k.join(',');
  }
  const mevsimEkle = (tur, baslik, kategori, icerik) => {
    if (tur === 'tarif') return tekMevsim(kategori, baslik, icerik);
    const m = (MEVSIMLER[tur] || {})[baslik];
    const k = String(kategori || '').split(',').map(x => x.trim()).filter(Boolean);
    if (m && !k.includes('YAZ') && !k.includes('KIŞ')) k.push(m);
    return k.join(',') || null;
  };
  // Uygulamadaki kayıtlara mevsim ekle (yalnızca hiç mevsimi olmayanlara)
  function mevsimAta(db) {
    const sec = db.prepare('SELECT id, kategori FROM blocks WHERE tur=? AND baslik=?');
    const up = db.prepare('UPDATE blocks SET kategori=? WHERE id=?');
    for (const tur of Object.keys(MEVSIMLER)) for (const baslik of Object.keys(MEVSIMLER[tur]))
      for (const r of sec.all(tur, baslik)) { const k = mevsimEkle(tur, baslik, r.kategori); if (k !== (r.kategori || null)) up.run(k, r.id); }
  }
  // Tüm tarifler: her birinde tam olarak bir mevsim (yaz + kış sayısı = tarif sayısı)
  function tarifMevsimDuzelt(db) {
    const up = db.prepare('UPDATE blocks SET kategori=? WHERE id=?');
    for (const r of db.prepare("SELECT id, baslik, icerik, kategori FROM blocks WHERE tur='tarif'").all()) {
      const k = tekMevsim(r.kategori, r.baslik, r.icerik);
      if (k !== (r.kategori || '')) up.run(k, r.id);
    }
  }

  // Not kategorisi (başlığa göre)
  function notKat(baslik) {
    const b = baslik.toLocaleLowerCase('tr');
    if (/^su|suya|maden/.test(b)) return 'SU';
    if (/çay|kahve/.test(b)) return 'ÇAY & KAHVE';
    if (/spor|yürüyüş|leslie/.test(b)) return 'SPOR';
    if (/porsiyon|yerine|pilav/.test(b)) return 'PORSİYON';
    if (/motivasyon/.test(b)) return 'MOTİVASYON';
    return 'BESLENME KURALI';
  }
  const BLOKLAR = [
    ...OGUNLER.map(([kategori, baslik, icerik]) => ({ tur: 'ogun', kategori: mevsimEkle('ogun', baslik, kategori), baslik, icerik })),
    ...NOTLAR.map(([baslik, icerik]) => ({ tur: 'not', kategori: notKat(baslik), baslik, icerik })),
    ...TARIFLER.map(([kategori, baslik, icerik]) => ({ tur: 'tarif', kategori: mevsimEkle('tarif', baslik, kategori, icerik), baslik, icerik })),
  ];

  const anahtar = s => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

  // Uygulamada aynı başlıkla olmayanlar (şablon: ad; kütüphane: tür + başlık)
  function eksikler(db) {
    const varSablon = new Set(db.prepare('SELECT ad FROM templates').all().map(x => anahtar(x.ad)));
    const varBlok = new Set(db.prepare('SELECT tur, baslik FROM blocks').all().map(x => x.tur + '|' + anahtar(x.baslik)));
    return {
      sablonlar: SABLONLAR.filter(s => !varSablon.has(anahtar(s.ad))),
      bloklar: BLOKLAR.filter(b => !varBlok.has(b.tur + '|' + anahtar(b.baslik))),
    };
  }
  function ozet(e) {
    const say = tur => e.bloklar.filter(b => b.tur === tur).length;
    return { sablon: e.sablonlar.length, ogun: say('ogun'), tarif: say('tarif'), not: say('not'), toplam: e.sablonlar.length + e.bloklar.length };
  }

  return { SABLONLAR, BLOKLAR, eksikler, ozet, mevsimAta, tarifMevsimDuzelt, tekMevsim };
});
