# Harita Avcısı

Türkiye şehirleri ve plaka kodları için 10 soruluk, mobil uyumlu bir eşleştirme oyunu.

## Yerelde çalıştırma

```bash
npm install
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışır.

## Supabase ve Google oturumu

MVP oyun, yapılandırma yapılmadan anonim olarak oynanabilir. Google ile oturum açma ve skor kaydı için:

1. Supabase projesi oluşturun.
2. SQL Editor'de [`supabase/schema.sql`](./supabase/schema.sql) dosyasını çalıştırın.
3. Supabase Authentication sağlayıcılarında Google'ı etkinleştirin; Google Cloud OAuth istemcinizde Supabase'in callback URL'sini yetkili yönlendirme adresi olarak ekleyin.
4. `.env.example` dosyasını `.env.local` olarak kopyalayın ve proje URL'si ile Publishable Key değerlerini girin.
5. Supabase Authentication URL Configuration ekranına yerel adresinizi ve Vercel alan adınızı ekleyin.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

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
