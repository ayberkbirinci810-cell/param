# Param

Kredi kartı ekstrelerini okuyup paranın nereye gittiğini gösteren kişisel web uygulaması. iPhone'da ana ekrana eklenip uygulama gibi kullanılır.

- Ziraat Bankkart PDF ekstresini veya kopyalanmış ekstre metnini okur
- Harcamaları otomatik kategorilere ayırır, düzelttiğin kategorileri öğrenir
- Aylık gelir / harcama / kalan, "dışarıda yemek" sayacı, devam eden taksitler
- Her yüklemede bankanın kendi toplamıyla karşılaştırır
- **Veriler sadece telefonda saklanır**, hiçbir sunucuya gönderilmez. Bu repoda hiçbir kişisel veri yok.

## GitHub Pages'e koyma

1. github.com'da **New repository** → isim: `param` → **Public** → Create.
2. **Add file → Upload files** → bu klasördeki her şeyi (`vendor` klasörü dahil) sürükle bırak → **Commit changes**.
3. **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main**, klasör **/(root)** → Save.
4. 1-2 dakika sonra adres hazır: `https://KULLANICI-ADIN.github.io/param/`

## iPhone'a ekleme

1. Adresi **Safari**'de aç.
2. Paylaş butonu → **Ana Ekrana Ekle** → Ekle.
3. Ana ekrandaki **Param** ikonundan aç ve ekstreyi orada yükle.

> Not: Ana ekran uygulamasının verisi Safari'den ayrıdır. Ekstreleri her zaman ana ekrandaki ikondan açıp yükle. Ayda bir **Ayarlar → Yedeği dışa aktar** ile yedek al.

## Güncelleme

Dosyaları GitHub'da değiştirdikten sonra `sw.js` içindeki `VERSION` değerini artır (ör. `param-v2`). Uygulama bir sonraki açılışta yeni sürümü alır.
