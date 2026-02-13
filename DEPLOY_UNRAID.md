# Unraid Üzerinde En Kolay Kurulum Yöntemi (GitHub ile)

Bu yöntemle kodları direkt GitHub'dan çekeceğiz. Güncelleme yapmak istediğinizde tek komutla yeni kodları alabileceksiniz.

## Kurulum Yöntemi: Unraid Docker Compose (Stack)

En temiz ve yönetilebilir yöntem, Unraid'in **Docker Compose Manager** eklentisini kullanmaktır. Bu sayede uygulamanızı bir "Stack" olarak görür ve yönetirsiniz.

### Adım 1: Eklentiyi Kurun
1.  Unraid'de **Apps** sekmesine gidin.
2.  **"Docker Compose Manager"** eklentisini aratıp yükleyin.

### Adım 2: Stack Oluşturun
1.  Unraid **Docker** sekmesine gelin.
2.  En altta **"Compose"** bölümünü göreceksiniz.
3.  **"ADD NEW STACK"** butonuna tıklayın.
4.  İsim olarak `ermakRaporlama` yazın ve **CREATE STACK** deyin.

### Adım 3: Kodları İndirin
1.  Oluşturduğunuz `ermakRaporlama` stack'inin yanındaki **Terminal İkonuna** ( >_ ) tıklayın. (Bu işlem o klasörde terminal açar).
2.  Açılan terminale şu komutu yapıştırın (kodları indirir):
    # 1. Doğru klasöre gidin
    cd /mnt/user/appdata/ermakRaporlama

    # 2. Güncelleme / İndirme Komutları (Hata alırsanız önemsemeyin, sırayla yapıştırın):
    git init
    git remote remove origin
    git remote add origin https://github.com/barisbulutdemir/ermakRaporlama.git
    git fetch origin
    git reset --hard origin/main
    ```
    *(Bu komutlar mevcut dosyalarınızı güncel GitHub versiyonuyla eşitler).*

### Adım 4: Stack Ayarlarını Yapıştırın (Önemli!)

Unraid, Stack dosyalarını USB bellekte (/boot) tutar. Ancak bizim kodlarımız diskte (/mnt/user/appdata).
Bu yüzden Stack ayarlarında **Tam Yol (Absolute Path)** kullanmalıyız.

1.  Stack ismine (`ermakRaporlama`) tıklayın, ardından **"EDIT STACK"** butonuna basın.
2.  `Compose File` kutusundaki her şeyi silin ve aşağıdakini yapıştırın:

    ```yaml
    version: '3.8'

    services:
      ermak-rapor-app:
        # Kodların olduğu klasör (Diskteki yer):
        build: /mnt/user/appdata/ermakRaporlama
        container_name: ermak-rapor-app
        restart: unless-stopped
        ports:
          - "3000:3000"
        environment:
          - NODE_ENV=production
          - DATABASE_URL=file:/app/prisma/dev.db
          # Şifrenizi buraya yazın:
          - AUTH_SECRET=BURAYA_OPENSSL_ILE_URETTIGINIZ_SIFREYI_YAZIN
        volumes:
          # Veritabanı ve Uploads klasörleri de diskte tutulmalı:
          - /mnt/user/appdata/ermakRaporlama/prisma:/app/prisma
          - /mnt/user/appdata/ermakRaporlama/public/uploads:/app/public/uploads
    ```

3.  `AUTH_SECRET` kısmını değiştirmeyi unutmayın!
4.  **"SAVE CHANGES"** butonuna basın.
5.  Son olarak **"COMPOSE UP"** butonuna tıklayın.

Docker, `/mnt/user/appdata/ermakRaporlama` klasöründeki kodları kullanarak imajı oluşturacak ve USB belleğinizi doldurmadan çalışacaktır.

---

## Güncelleme Nasıl Yapılır?

Kodlarda değişiklik yaptığınızda Unraid üzerindeki sürümü güncellemek için:

1.  Unraid **Docker** sekmesinde `ermakRaporlama` stack'inin yanındaki **Terminal** ikonuna tıklayın.
2.  Şunu yazın: `git pull`
3.  Terminali kapatın.
4.  Stack üzerindeki **"COMPOSE UP"** butonuna tekrar basın. (Otomatik olarak yeni versiyonu build edip başlatır).
5.  *Eğer veritabanı değişikliği varsa:* Terminalde `docker-compose exec ermak-rapor-app npx prisma migrate deploy` komutunu çalıştırın.

## Önemli Notlar

*   **Veritabanı:** Verileriniz (`prisma` klasörü) ve Resimler (`uploads` klasörü) bu klasörün içinde güvende kalır. Güncelleme yapsanız bile silinmez.
*   **Gizli Anahtar (Auth Secret):** `docker-compose.yml` dosyasındaki `AUTH_SECRET` değerini değiştirmeniz önerilir. Rastgele bir değer oluşturmak için terminalde şu komutu çalıştırabilirsiniz:
    ```bash
    openssl rand -base64 32
    ```
*   **Port:** Eğer 3000 portu doluysa `docker-compose.yml` dosyasını açıp değiştirebilirsiniz (`nano docker-compose.yml`).

