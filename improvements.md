# Kurumsal Boşluk Analizi & İyileştirme Planı

## 1. Yönetici Özeti
Mevcut sistem sağlam bir **MVP+ (Minimum Uygulanabilir Ürün Artı)** niteliğindedir. Bir Web3 Stake & Sadakat platformunun temel ilkelerini (zincir içi senkronizasyon, puan takibi ve çok katmanlı referanslar) doğru bir şekilde uygulamaktadır.

Ancak, üst düzey kurumsal platformlarla (örn. Galxe, Layer3, Lido) rekabet edebilmek için **Altyapı Ölçeklenebilirliği** (Önbellekleme), **Varlık Sahipliği** (NFT'ler) ve **Derin Oyunlaştırma** (Harcanabilir Puanlar) konularında eksiklikleri vardır.

| Özellik | Mevcut Uygulama | Kurumsal Standart | Boşluk (Gap) |
| :--- | :--- | :--- | :--- |
| **Veri Senk.** | Olay anında doğrudan DB yazma | Kuyruk tabanlı İndeksleme (BullMQ/Kafka) | Yüksek (Yüksek yükte veri kaybı riski) |
| **Sadakat** | DB tabanlı Puanlar & Seviyeler | Ruhbağı Token (SBT) / NFT Rozetleri | Orta (Zincir içi kanıt eksikliği) |
| **Referanslar** | Çok Katmanlı (Ağırlıklı) | Çok Katmanlı + Komisyon Bölüşümü | Düşük (Mevcut mantık güçlü) |
| **Ölçeklenebilirlik** | Doğrudan SQL Sorguları | Redis Önbellekleme + Okuma Replikaları | Yüksek (10k+ kullanıcıda API yavaşlar) |
| **Güvenlik** | Temel Parametreler | Hız Sınırlama (Rate Limit), IP İtibarı, WAF | Orta |

---

## 2. Stratejik İyileştirmeler

### 2.1 Teknik Altyapı (Ölçeklenme İçin Kritik)
*   **Redis Önbellekleme (Caching) Uygula**:
    *   *Sorun*: `GET /api/missions` uç noktası her sayfa yüklemesinde 5 ayrı DB sorgusu (Görevler, Seriler, Puanlar, Refler, Profil) çalıştırıyor.
    *   *Çözüm*: Toplulaştırmayı 60-300 saniye boyunca önbelleğe al. Sadece belirli kullanıcı eylemlerinde (örn. `Talep Etme`) önbelleği temizle.
*   **Kuyruk Tabanlı İndeksleme**:
    *   *Sorun*: `sync` rotası, Puanları ve Referansları kullanıcı beklerken *satır içi (inline)* işliyor.
    *   *Çözüm*: Hesaplama mantığını bir arka plan işçisine (worker) (örn. Inngest veya BullMQ) devret. API anında "Alındı" yanıtı dönmelidir.

### 2.2 Oyunlaştırma & Ekonomi (Katılım)
*   **"Harcanabilir" Puanlar (Mağaza Sistemi)**:
    *   *Boşluk*: Şu anda puanlar sadece birikiyor.
    *   *Özellik*: Kullanıcıların puanlarını şunlar için "yakmasına" (burn) izin ver:
        -   **Geçici Getiri Artışları** (örn. 24 saat için 1.5x -> 1.6x).
        -   **Çekiliş Biletleri** (Haftalık piyango).
*   **Zincir İçi Seviyeler (NFT Entegrasyonu)**:
    *   *Boşluk*: Seviyeler (Scout, Legend) sadece PostgreSQL veritabanında mevcut.
    *   *Özellik*: Bir kullanıcı "Legend" statüsüne ulaştığında bir **Ruhbağı Tokenı (SBT)** bas (Mint). Bu, "Rozet Değeri" sağlar ve diğer dApp'lerin kullanıcının statüsünü tanımasına olanak tanır.

### 2.3 Güvenlik & Uyumluluk
*   **API Hız Sınırlama (Rate Limiting)**:
    *   *Boşluk*: Bir botun `verify` uç noktasını spamlamasını engelleyen görünür bir ara katman yazılımı (middleware) yok.
    *   *Düzeltme*: `@upstash/ratelimit` veya katı Next.js middleware kuralları uygula (örn. doğrulama için 10 istek/dakika).
*   **İmza Doğrulaması**:
    *   *Boşluk*: Doğrulama `viem.isAddress`'e dayanıyor.
    *   *Düzeltme*: Hassas işlemler (ödül talep etme veya profil ayarlarını değiştirme gibi) için adresin sahipliğini kanıtlamak adına **kriptografik imza** (SIWE - Sign In With Ethereum) zorunlu tut.

### 2.4 Kullanıcı Deneyimi (UX)
*   **Getiri Tahmin Hesaplayıcısı**:
    *   *Fikir*: Bir kaydırıcı ekle: "Eğer [1000] ZUG'u [30 Gün] boyunca stake edersem, [X] Puan ve [Y] Getiri kazanacağım."
*   **Sosyal Grafik**:
    *   *Fikir*: "Hangi arkadaşlarımın stake ettiğini gör." *Takip ettiğin kişilere* göre göreceli bir liderlik tablosu göstermek için Twitter grafiğini kullan.

---

## 3. Uygulama Yol Haritasası

### 1. Aşama: Güçlendirme (Hafta 1-2)
- [ ] `@upstash/ratelimit` kurulumu.
- [ ] `sync` mantığını `Inngest` (Sunucusuz Kuyruk) üzerine taşıma.
- [ ] Liderlik Tablosu için `Redis` önbellekleme ekleme.

### 2. Aşama: Oyunlaştırma (Hafta 3-4)
- [ ] "Puan Mağazası" arayüzünü oluşturma.
- [ ] `user_items` tablosu (Envanter) oluşturma.
- [ ] Getiri Artış mantığını uygulama.

### 3. Aşama: Web3 Native (Hafta 5-6)
- [ ] Seviyeler için SBT (Ruhbağı Token) kontratını dağıtma (Deploy).
- [ ] Profil güncellemeleri için SIWE (Ethereum ile Giriş Yap) ekleme.



Bridge Assets	500 PTS	BridgingCompleted Event	High Value. Incentivizes moving TVL to ZUG.
Deploy Contract	1000 PTS	ContractDeployment (RPC)	Devs are King. Attracts builders, not just farmers.
Mint an NFT	100 PTS	Transfer Event (721/1155)	Tests network throughput and NFT standards.
DEX Swap	10 PTS / Swap	Swap Event (Uniswap V2/V3)	Generates organic transaction volume (Stress Test).

