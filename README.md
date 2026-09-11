# Harita Avcısı

Türkiye illeri ve dünya ülkeleri için 10 soruluk, süre sınırlı harita bulma oyunu. Soru olarak gelen il ya da ülkeyi harita üzerinde bulmanız isteniyor; tur sonunda skorunuz kaydediliyor ve canlı sıralamada görünüyor.

- **İki mod:** Türkiye il haritası (81 il) ve dünya haritası (58 ülke)
- **Tur başına 10 soru, toplam 120 saniye;** her cevaptan sonra 3 saniye doğru cevap gösterilir
- **Sıralama:** önce puan, eşitlikte süre, sonra en uzun doğru serisi
- **Yatay mobil düzen:** dikey modda kullanıcıdan cihazı çevirmesi istenir
- **Giriş:** Google ile oturum ya da isim girerek misafir oturumu

## Yerelde çalıştırma

```bash
npm install
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışır.

## Proje yapısı

```
app/
  page.tsx            Oyun durumu ve ekranlar arası akış
  layout.tsx          Kök düzen ve viewport ayarları
  globals.css         Tailwind + harita SVG'si için stiller
  components/         Sunum bileşenleri (SignInCard, GameMap, Leaderboard, ...)
lib/
  game.ts             Ortak tipler, sabitler ve yardımcılar
  hooks/              usePlayer, useMapMarkup, useLeaderboard
  turkish-plates.ts   81 il + plaka kodu
  world-countries.ts  58 ülke + ISO kodu
  shuffle.ts          Fisher-Yates karıştırma
  supabase.ts         Supabase istemcisi (env yoksa null döner)
public/maps/          turkey.svg, world.svg
supabase/schema.sql   Tablo, RLS politikaları, leaderboard view'i, realtime
```

### Haritalar

Haritalar `public/maps/` altında yerel olarak tutulur; çalışma zamanında dış bir CDN'e istek yapılmaz.

| Dosya | Kaynak | Lisans |
| --- | --- | --- |
| `turkey.svg` | [dnomak/svg-turkiye-haritasi](https://github.com/dnomak/svg-turkiye-haritasi) | MIT |
| `world.svg` | [flekschas/simple-world-map](https://github.com/flekschas/simple-world-map) | CC BY-SA 3.0 |

Tıklanabilir alanlar Türkiye haritasında `data-plakakodu`, dünya haritasında ISO 3166-1 alpha-2 `id` değeri üzerinden eşleştirilir.

## Supabase ve oturum açma

1. Supabase projesi oluşturun.
2. SQL Editor'de [`supabase/schema.sql`](./supabase/schema.sql) dosyasını çalıştırın. Dosya idempotent'tir, şema değiştiğinde tekrar çalıştırabilirsiniz.
3. Authentication > Providers altında **Google** ve **Anonymous sign-ins** sağlayıcılarını etkinleştirin. Google Cloud OAuth istemcinizde Supabase'in callback URL'sini yetkili yönlendirme adresi olarak ekleyin.
4. `.env.example` dosyasını `.env.local` olarak kopyalayın ve proje URL'si ile Publishable Key değerlerini girin.
5. Authentication > URL Configuration ekranına yerel adresinizi ve Vercel alan adınızı ekleyin.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### Veri modeli

Sonuçlar `game_results` tablosuna yazılır; RLS politikaları herkesin sıralamayı okumasına ama yalnızca kendi sonucunu yazmasına izin verir. Sıralama, oyuncu ve mod başına en iyi sonucu döndüren `leaderboard` view'inden okunur ve `supabase_realtime` publication'ı sayesinde yeni sonuçlar anında yansır.

## Vercel ile yayınlama

1. Bu klasörü yeni bir GitHub deposuna gönderin.
2. Depoyu Vercel'e içe aktarın.
3. Vercel Project Settings > Environment Variables altında iki `NEXT_PUBLIC_SUPABASE_*` değişkenini ekleyin.
4. Deploy edin ve yayınlanan alan adını Supabase Authentication URL Configuration'a ekleyin.

## Kontroller

```bash
npm run lint
npm run build
```
