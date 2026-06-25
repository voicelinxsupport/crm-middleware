# Bicom PBXware ↔ Salesforce CRM Middleware

Node.js/TypeScript ile yazılmış, Bicom PBXware'i Salesforce'a bağlayan middleware.

## Kurulum

### 1. Gereksinimler
- Node.js 18+
- npm

### 2. Bağımlılıkları yükle
```bash
npm install
```

### 3. .env dosyasını oluştur
```bash
cp .env.example .env
```
`.env` dosyasını düzenle ve şu alanları doldur:

| Değişken | Açıklama |
|----------|----------|
| `JWT_SECRET` | Rastgele uzun string — `openssl rand -hex 32` ile üret |
| `SALESFORCE_CLIENT_ID` | Salesforce Connected App Consumer Key |
| `SALESFORCE_CLIENT_SECRET` | Salesforce Connected App Consumer Secret |
| `SALESFORCE_DOMAIN` | Salesforce org domain (örn: `mycompany.my.salesforce.com`) |
| `SALESFORCE_CALLBACK_URL` | Bu middleware'in public URL'i + `/salesforce/user/callback/code` |

### 4. Salesforce Connected App oluştur
1. Salesforce → Setup → App Manager → New Connected App
2. **Enable OAuth Settings** → işaretle
3. **Callback URL**: `https://senin-domain.com/salesforce/user/callback/code`
4. **Scopes**: `openid`, `email`, `refresh_token`, `offline_access`, `api` ekle
5. Kaydet — Consumer Key ve Secret'ı `.env`'e kopyala

### 5. Middleware'i başlat (geliştirme)
```bash
npm run dev
```

### 6. PBXware için client oluştur
```bash
npx tsx src/cli/manage-clients.ts create "PBXware Sunucum"
```
Ekrana çıkan **Client ID** ve **API Key** değerlerini PBXware'e gir.

## PBXware Konfigürasyonu

PBXware → Integrations → Custom CRM → New Integration:
- **Middleware URL**: `https://senin-domain.com/salesforce/user`
- **Client ID**: (CLI'dan aldığın)
- **API Key**: (CLI'dan aldığın)

## Deploy

### Railway / Render / Fly.io
Bu servisler ücretsiz tier sunuyor. `npm run build && npm start` komutu çalıştırır.

### Gerekli portlar
Middleware varsayılan olarak **3000** portunda çalışır. PBXware dışarıdan erişebilmeli.

## Proje Yapısı

```
src/
├── index.ts              ← Ana uygulama, route'ları mount eder
├── db/
│   └── database.ts       ← SQLite veritabanı (client'lar + OAuth token'ları)
├── middleware/
│   └── auth.ts           ← JWT doğrulama, Basic Auth parse
├── routes/
│   ├── token.ts          ← GET /api/v1/token (JWT al)
│   ├── config.ts         ← Entegrasyon konfigürasyonu
│   ├── auth.ts           ← OAuth akışı ve callback
│   ├── search.ts         ← Arama endpoint'i
│   └── objects.ts        ← CRUD endpoint'leri
├── services/
│   └── salesforce.ts     ← Salesforce API ile konuşan servis
└── cli/
    └── manage-clients.ts ← Client yönetim aracı
```

## Geliştirme Notları

- Tüm veriler `middleware.db` SQLite dosyasında saklanır
- Her PBXware instance'ı için ayrı client oluştur
- Her dahili hat (extension) kendi Salesforce OAuth'unu yapmalı
- Token'lar otomatik yenilenir (refresh token kullanılarak)
