# Unraid Üzerinde En Kolay Kurulum Yöntemi (GitHub ile)

Bu yöntemle kodları direkt GitHub'dan çekeceğiz. Güncelleme yapmak istediğinizde tek komutla yeni kodları alabileceksiniz.

## Adım 1: Hazırlık

1.  **Apps (Uygulamalar) Sekmesi:** Unraid menüsündeki "Apps" sekmesine gidin, **"Docker Compose Manager"** diye aratın ve yükleyin. (Bu eklenti `docker-compose` komutunun çalışmasını sağlar).
2.  **GitHub Deposu:** Projenizi GitHub'a yüklediğinizden emin olun.
3.  **Unraid Terminali:** Unraid arayüzünde sağ üstteki **>_** simgesine tıklayın.

## Adım 2: İlk Kurulum

Aşağıdaki komutları sırasıyla terminale yapıştırın:

1.  **Klasöre Git:**
    ```bash
    cd /mnt/user/appdata
    ```

2.  **Projeyi İndir (Clone):**
    *(Aşağıdaki adresi kendi GitHub kullanıcı adınızla değiştirin, şimdilik:)*
    ```bash
    git clone https://github.com/barisbulutdemir/ermakRaporlama.git
    cd ermakRaporlama
    ```

3.  **Başlat:**
    ```bash
    docker-compose up -d --build
    ```

Bu kadar! Uygulamanız `http://UNRAID_IP_ADRESI:3000` adresinde çalışacaktır.
*(İlk kurulum birkaç dakika sürebilir, docker imajı hazırlanıyor.)*

---

## Adım 3: Güncelleme Nasıl Yapılır?

Bilgisayarınızda değişiklik yapıp GitHub'a gönderdikten sonra, Unraid terminalinde şunları yapın:

1.  Klasöre girin:
    ```bash
    cd /mnt/user/appdata/ermakRaporlama
    ```
2.  Kodları çekin:
    ```bash
    git pull
    ```
3.  Yeniden oluşturun (build):
    ```bash
    docker-compose up -d --build
    ```
4.  Veritabanını Güncelleyin (Önemli!):
    ```bash
    docker-compose exec ermak-rapor-app npx prisma migrate deploy
    ```

## Önemli Notlar

*   **Veritabanı:** Verileriniz (`prisma` klasörü) ve Resimler (`uploads` klasörü) bu klasörün içinde güvende kalır. Güncelleme yapsanız bile silinmez.
*   **Gizli Anahtar (Auth Secret):** `docker-compose.yml` dosyasındaki `AUTH_SECRET` değerini değiştirmeniz önerilir. Rastgele bir değer oluşturmak için terminalde şu komutu çalıştırabilirsiniz:
    ```bash
    openssl rand -base64 32
    ```
*   **Port:** Eğer 3000 portu doluysa `docker-compose.yml` dosyasını açıp değiştirebilirsiniz (`nano docker-compose.yml`).

