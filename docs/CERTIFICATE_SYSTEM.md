# Sertifikat Sistemi — Dizayn Sənədi

> Status: **P1 + P2 icra olunub** · 23.08.2026
> Əsas: `src/lib/certificates/`, `prisma/schema.prisma`, 3 nümunə dizayn

---

## 1. Bugünkü vəziyyət — kodda nə var, nə qırıqdır

Mövcud kod: `Certificate` modeli, `certificate-service.ts`, iki API route (`GET /api/certificates`, `POST /api/certificates/issue`), iştirakçı paneli səhifəsi, `TenantSettings`-də üç açıq/bağlı açarı.

```prisma
model Certificate {
  id       String   @id @default(cuid())
  userId   String
  type     String            // PARTICIPATION | ACHIEVEMENT | COMPLETION
  issuedAt DateTime @default(now())
  pdfUrl   String?           // ← həmişə null
}
```

**Dörd real qüsur:**

| # | Qüsur | Nəticə |
|---|---|---|
| 1 | `tenantId` sahəsi **yoxdur** | Bu model multi-tenant izolyasiyadan kənardadır. Digər bütün əsas modellərdə `tenantId` var və RLS onları qoruyur — sertifikat qorunmur. |
| 2 | Təkrar yoxlaması `userId + type` üzrədir, **proqramdan asılı deyil** | Bir iştirakçı iki proqramda iştirak edirsə, ikinci proqram üçün İştirak sertifikatı **heç vaxt verilə bilmir** — `CertificateAlreadyIssuedError` atılır. Bu, çox proqramlı tenant üçün bloklayıcıdır. |
| 3 | `pdfUrl` heç vaxt doldurulmur | Sertifikat yalnız bazadakı sətirdir. İştirakçının əlinə heç nə çatmır. |
| 4 | Seriya nömrəsi, doğrulama kodu, ləğvetmə yoxdur | Sertifikat yoxlanıla bilmir. İşəgötürən üçün dəyəri sıfırdır. |

Əlavə olaraq `TenantSettings`-də artıq **hazır yerlər var** və istifadə olunmur: `signatureUrl`, `certificateTemplate`, `authorizedContact`. Bu sahələr məhz bu iş üçün qoyulub.

---

## 2. Nümunə dizaynlardan çıxan tələblər

Üç sertifikat — Başarı, Proje Katılım, Eğitim — fərqli görünür, amma **eyni skeleti** paylaşır:

| Element | Başarı (qızılı guilloche) | Proje Katılım (lacivert/qızılı) | Eğitim (qəhvəyi, möhürlü) |
|---|---|---|---|
| Format | A4 landşaft | A4 landşaft | A4 landşaft |
| Fon | Krem + qızılı ikiqat naxışlı çərçivə, mərkəzdə guilloche su nişanı | Ağ mərmər + sol tərəfdə lacivert diaqonal + qızılı zolaqlar | Krem + dalğalı tekstura + qəhvəyi çərçivə, künc bəzəkləri |
| Başlıq | Serif, iri, boşluqlu | Serif, iki sətir, lacivert | **Blackletter/gotik** |
| Alt etiket | "ÜSTÜN BAŞARI ÖDÜLÜ" | "Sevgili öğrencimiz," | "Belge Sahibi" |
| **Ad** | Qızılı **əl yazısı** | Qızılı **böyük hərflər** + xətt | Qara **əl yazısı**, çox iri |
| Mətn | 3 abzas, adı **3 dəfə** təkrarlayır | 1 abzas | 1 abzas + **tarix aralığı** + kurs adı dırnaqda |
| Möhür | Rozet + lent (mərkəz alt) | Qızılı dairəvi lent (sağ üst) | **Qırmızı mum möhür** (mərkəz alt) |
| İmza | 2 blok: ad qalın, altında rol | 2 blok: qızılı xətt + ad + rol | 2 blok: rol qalın, altında ad + **əl imzası şəkli** |
| Loqo | yox | yox | var (mərkəz üst, dairəvi) |
| Tarix | yox | yox | mətn içində |
| **Seriya / QR** | **yox** | **yox** | **yox** |

### Bundan çıxan altı texniki tələb

1. **Şablon = statik fon + yerləşdirilə bilən mətn blokları.** Bəzək işi heç vaxt kodla çəkilməməlidir — Canva-dan ixrac olunmuş fon üzərinə yalnız dəyişən mətn yazılır.
2. **Mətn şablon sətridir, sabit etiket deyil.** `"Bu sertifika, {proqram} adlı etkinlikte gösterdiği üstün başarı nedeniyle {ad}'ye sunulmuştur."`
3. **Şəkilçi problemi.** Nümunələrdə birbaşa görünür: *Melike Gemici'**ye***, *Bünyamin Salihoğlu'**nu***. Ad dəyişəndə şəkilçi də dəyişməlidir (ahəng qanunu + son hərf). Ya şəkilçi helper-i yazılmalı, ya da mətn şəkilçisiz qurulmalıdır (`"— {ad} —"` üslubunda). **Tövsiyə: şəkilçisiz mətn.** Helper yazmaq üç dildə səhv riski daşıyır.
4. **Ad avtomatik ölçülənməlidir.** "Ali Əliyev" ilə "Bünyamin Salihoğlu" eyni qutuda eyni ölçüdə yerləşmir. Blok üçün maksimum en verilib, şrift ölçüsü ona sığana qədər azaldılmalıdır.
5. **Mətn sətir sayı dəyişir** → altındakı imza bloku ilə toqquşmamalıdır. Ya blok sabit yüksəklikdə mərkəzlənir, ya da axın-əsaslı yerləşdirmə lazımdır.
6. **Yeni əlavə olunmalı elementlər:** seriya nömrəsi (kiçik, altda) və **QR kod** (doğrulama linki). Nümunələrdə yoxdur — bizim əlavəmiz olacaq və məhz bu, sertifikatı «gözəl şəkil»dən **sənədə** çevirir.

---

## 3. Şrift yoxlaması — ölçülmüş nəticə

Azərbaycan **Ə / ə** hərfi (U+018F / U+0259) dekorativ şriftlərin çoxunda **yoxdur**. Namizəd şriftlər yoxlanıldı:

| Şrift | AZ + TR örtüyü | İstifadə |
|---|---|---|
| **Great Vibes** | ✅ tam | əl yazısı ad — tövsiyə |
| **Alex Brush** | ✅ tam | əl yazısı ad |
| **Allura** | ✅ tam | əl yazısı ad |
| **Pinyon Script** | ✅ tam | əl yazısı ad |
| **Dancing Script** | ✅ tam | əl yazısı (daha müasir) |
| **Playfair Display** | ✅ tam | başlıq / ad (böyük hərf) |
| **Cormorant Garamond** | ✅ tam | başlıq |
| **EB Garamond** | ✅ tam | mətn |
| **Lora** | ✅ tam | mətn |
| **Spectral** | ✅ tam | mətn |
| **Noto Serif** | ✅ tam | ehtiyat / hər şey |
| Tangerine | ❌ `Ə ə Ğ ğ İ Ş ş` yoxdur | **istifadə etmə** |
| Parisienne | ❌ `Ə ə` yoxdur | **istifadə etmə** |
| Marcellus | ❌ `Ə ə` yoxdur | **istifadə etmə** |
| Cinzel | ❌ `Ə ə` yoxdur | **istifadə etmə** |
| Italianno | ❌ `Ə ə` yoxdur | **istifadə etmə** |
| Pirata One (blackletter) | ❌ `Ə` yoxdur | **istifadə etmə** |

**Vacib nəticə:** «Eğitim Sertifikası» dizaynındakı gotik başlıq və «Proje Katılım»dakı Cinzel/Marcellus tipli başlıq azərbaycanca **sınacaq**. Amma bu problem deyil — **başlıqlar fonun bir hissəsidir**, kodla yazılmır. Yalnız dəyişən sahələr (ad, proqram, tarix, seriya) embed olunan şriftlə yazılır və onların hamısı üçün təhlükəsiz siyahı var.

Yeganə şərt: başlıq dilə görə dəyişməlidirsə, hər dil üçün ayrıca fon faylı lazımdır (`achievement_az.pdf`, `achievement_tr.pdf`, `achievement_en.pdf`).

---

## 4. PDF generasiyası — üç yanaşma

| | A · pdf-lib + Canva fonu | B · Headless Chromium (HTML→PDF) | C · @react-pdf/renderer |
|---|---|---|---|
| Dizayn dəqiqliyi | **Piksel-dəqiq** (fon Canva-dan gəlir) | Yaxşı, amma bəzək yenidən qurulmalı | Zəif, mürəkkəb layout dəstəklənmir |
| Docker imici | +2 MB | **+300 MB** (Chromium) | +5 MB |
| Sürət | ~50–100 ms | ~1–3 s | ~200 ms |
| Yaddaş | cüzi | render başına 150–300 MB | az |
| Şrift idarəsi | `@pdf-lib/fontkit` ilə TTF embed | brauzer həll edir | manual |
| Şablonu kim dəyişə bilər | **Dizayner Canva-da** | Developer HTML-də | Developer |
| ECS Fargate uyğunluğu | əla | ağır, soyuq start problemi | əla |

**Tövsiyə: A.**

Səbəb sadədir — dizaynlar **artıq Canva-da mövcuddur**. Onları HTML-də yenidən qurmaq həm vaxt itkisidir, həm də hər dizayn dəyişikliyində developer tələb edir. Canva-dan boş fon (dəyişən mətnlər silinmiş) PDF kimi ixrac olunur, `pdf-lib` onu `embedPdf` ilə fon kimi götürür və üstünə yalnız ad, proqram, tarix, seriya və QR yazılır.

Bonus: bu yanaşma tenanta **öz sertifikat fonunu yükləmək** imkanı verir — satışda güclü arqument, çünki hər universitet öz blankını istəyir.

`B` variantı ehtiyatda qalsın: hansısa tenant data-ağır, cədvəlli sertifikat istəsə (məsələn arxa üzündə modul-modul bal cədvəli), o zaman HTML render daha uyğundur.

### Axın

```
Sertifikat verilir (manual / avtomatik qayda)
   ↓
Certificate sətri yaranır (seriya + doğrulama kodu ilə)
   ↓
Növbəyə CERTIFICATE_RENDER işi qoyulur   ← mövcud Redis queue
   ↓
Worker: fon PDF-i yüklə → şrift embed et → mətnləri yaz → QR çək
   ↓
Fayl saxlanılır + sha256 hash bazaya yazılır
   ↓
pdfUrl doldurulur → iştirakçıya email gedir
```

Render növbədə olmalıdır, sinxron deyil: 200 nəfərlik kohorta toplu sertifikat verəndə HTTP sorğusu gözləməməlidir.

---

## 5. Təklif olunan data modeli

```prisma
model Certificate {
  id             String    @id @default(cuid())
  tenantId       String    @map("tenant_id")          // ← YENİ: izolyasiya
  userId         String    @map("user_id")
  programId      String?   @map("program_id")         // ← YENİ
  trainingId     String?   @map("training_id")        // ← YENİ: təlim sertifikatı
  type           String                                // PARTICIPATION | ACHIEVEMENT | COMPLETION
  templateId     String?   @map("template_id")

  serialNumber   String    @unique @map("serial_number")  // BIZ-2026-DTP-000417
  verifyCode     String    @unique @map("verify_code")    // 10 simvol, təsadüfi

  recipientName  String    @map("recipient_name")     // ← anlıq surət
  title          String                                // ← anlıq surət (proqram adı)
  locale         String    @default("az")
  score          Int?                                  // ACHIEVEMENT üçün

  issuedAt       DateTime  @default(now()) @map("issued_at")
  expiresAt      DateTime? @map("expires_at")
  revokedAt      DateTime? @map("revoked_at")
  revokedReason  String?   @map("revoked_reason")

  pdfPath        String?   @map("pdf_path")
  pdfHash        String?   @map("pdf_hash")           // sha256
  issuedByUserId String?   @map("issued_by_user_id")
  metadata       Json?

  @@unique([userId, type, programId, trainingId])     // ← 2-ci qüsuru həll edir
  @@index([tenantId, issuedAt])
  @@index([verifyCode])
}

model CertificateTemplate {
  id             String   @id @default(cuid())
  tenantId       String?  @map("tenant_id")           // null = platforma şablonu
  name           String
  type           String
  locale         String   @default("az")
  isDefault      Boolean  @default(false)
  backgroundPath String   @map("background_path")     // Canva ixracı (PDF)
  blocks         Json                                  // mətn bloklarının tərifi
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### Niyə ad və başlıq «anlıq surət» kimi saxlanılır

Sertifikat verilmiş sənəddir. İstifadəçi sabah adını dəyişsə və ya proqramın adı redaktə olunsa, **verilmiş sertifikat dəyişməməlidir**. Ona görə `recipientName` və `title` verilmə anında kopyalanır — `user.name`-ə join edilmir.

### Şablon blokları

```json
{
  "blocks": [
    { "key": "recipientName", "x": 148.5, "y": 92, "w": 200, "align": "center",
      "font": "GreatVibes", "size": 44, "minSize": 24, "color": "#B8860B", "fit": "shrink" },
    { "key": "body", "x": 148.5, "y": 118, "w": 220, "align": "center",
      "font": "EBGaramond", "size": 12.5, "lineHeight": 1.5, "color": "#3F3A34",
      "template": "Bu sertifikat {program} proqramı çərçivəsində göstərdiyi nəticəyə görə təqdim olunur." },
    { "key": "serial", "x": 20, "y": 196, "align": "left",
      "font": "NotoSerif", "size": 7, "color": "#9A8F80" },
    { "key": "qr", "type": "qr", "x": 262, "y": 176, "size": 22 }
  ]
}
```

Koordinatlar **mm-lə**, A4 landşaft üçün (297 × 210). Canva-da da mm ilə işləmək olur — dizayner koordinatı birbaşa oxuya bilir.

---

## 6. Doğrulama — sistemin ən dəyərli hissəsi

Açıq (girişsiz) səhifə: `/{locale}/verify/{code}`

Göstərir: alıcının adı, sertifikat tipi, proqram, verən təşkilat, verilmə tarixi, **status** (etibarlı / ləğv olunub / vaxtı keçib). PDF-dəki QR birbaşa bura aparır.

Bu, sertifikatı iddiadan **sənədə** çevirən yeganə şeydir. İşəgötürən telefonla QR-ı oxuyub 2 saniyəyə yoxlaya bilir.

**Təhlükəsizlik qeydləri:**

- Axtarış `verifyCode` üzrə olmalıdır, `serialNumber` üzrə **yox** — seriya ardıcıldır, ardıcıl nömrə ilə bütün sertifikatları sadalamaq olar.
- `verifyCode` təsadüfi 10 simvol (crypto-random, oxşar simvollar çıxarılıb: 0/O, 1/l/I).
- Rate limit məcburidir (Upstash artıq var) — brute-force sadalamaya qarşı.
- Səhifə **minimal** data göstərməlidir: email, telefon, bal detalları **yox**. Yalnız «bu adam bu sertifikatı aldı».

---

## 7. Avtomatik verilmə qaydaları

Manual verilmə artıq var. Əlavə olunmalı:

| Tip | Avtomatik şərt | Tətik nöqtəsi |
|---|---|---|
| **PARTICIPATION** | Proqrama qeydiyyat təsdiqlənəndə və ya proqram bitəndə | `Participant` yaradılması / proqram bitmə tarixi |
| **COMPLETION** | Təyin olunmuş bütün təlimlər 100% + bütün imtahanlar keçilib | `LessonProgress` / `ExamAttempt` yazılanda yoxla |
| **ACHIEVEMENT** | İmtahan ortalaması ≥ X, və ya hakaton sıralamasında ilk N | Imtahan təhvilində / `resultsRevealAt` açılanda |

Qaydalar proqram səviyyəsində konfiqurasiya olunmalıdır (`Program` modelinə `certificateRules Json?`), çünki hər tenant fərqli hədd istəyir.

**Toplu verilmə:** admin proqram seçir → şərtə uyğun gələnlərin siyahısını görür → təsdiqləyir → növbəyə N iş qoyulur. 200 nəfər üçün bir kliklə.

---

## 8. İcazələr

`permissions.ts`-ə əlavə olunacaq:

```ts
| "certificate:issue"     // TENANT_ADMIN
| "certificate:revoke"    // TENANT_ADMIN
| "certificate:template"  // TENANT_ADMIN
```

`certificate:read` artıq var. **SUPER_ADMIN bu üçünü almamalıdır** — mövcud memarlıq prinsipi ilə ardıcıl olaraq platforma sahibi tenantın sertifikatını verə/ləğv edə bilməz. Bu, `permissions.test.ts`-ə test kimi yazılmalıdır.

---

## 9. Fayl saxlama

Hazırda fayllar lokal diskdə (`uploads/submissions/`). Sertifikatlar üçün eyni nümunə işləyəcək (`uploads/certificates/{tenantId}/{certId}.pdf`) — **amma bu, ECS-də səhvdir**: konteyner yenilənəndə fayllar itir.

Tövsiyə: **saxlama abstraksiyası** yazılsın (email provider-də edildiyi kimi) — `LocalStorageProvider` və `S3StorageProvider`. Lokal dev diskdə, production S3-də. Terraform-da S3 bucket-i onsuz da var.

Bu abstraksiya hakaton PDF-lərinə də lazımdır, yəni iş iki modula fayda verir.

---

## 10. Mərhələlər

| Mərhələ | Nə edilir | Təxmini |
|---|---|---|
| **P1 · Bünövrə** | Schema miqrasiyası, `tenantId`, seriya generatoru (atomik), `verifyCode`, təkrar qüsurunun düzəldilməsi, açıq doğrulama səhifəsi, rate limit, icazələr + testlər | 1–2 gün |
| **P2 · PDF** | `pdf-lib` + `fontkit`, şrift embed, Canva fonlarının hazırlanması, blok renderi, avtomatik ölçüləmə, QR, sha256, saxlama abstraksiyası, növbə işi | 2–3 gün |
| **P3 · Avtomatlaşma** | Qayda mühərriki, tətiklər, toplu verilmə UI-si, email şablonu (AZ/TR/EN) | 2 gün |
| **P4 · Şablon idarəsi** | Tenant öz fonunu yükləyir, blok koordinat redaktoru, çoxdilli variantlar, önizləmə | 3–5 gün |

P1 + P2 = işlək, yoxlanıla bilən sertifikat. P3 və P4 rahatlıq və satış üçündür.

---

## 11. Qərar tələb edən suallar

1. **Fon faylları.** Canva-dakı üç dizaynı dəyişən mətnlər silinmiş halda PDF (A4 landşaft) kimi ixrac edə bilərsənmi? Bu, P2-nin girişidir.
2. **QR və seriya.** Nümunələrdə yoxdur. Əlavə edirikmi? (Mənim mövqeyim: bəli — bu olmadan sertifikat sadəcə şəkildir.)
3. **Dil.** Başlıq mətnləri fonun içindədirsə, hər şablon üçün 3 dil variantı lazımdır. Yoxsa yalnız bir dillə başlayaq?
4. **İmza.** İmza şəkilləri (`signatureUrl` sahəsi hazırdır) hər tenant üçün yüklənəcək, yoxsa yalnız ad + rol mətn kimi yazılacaq?
5. **Sıra.** P1-dən başlayaq (doğrulama, seriya, qüsur düzəlişi — PDF-siz), yoxsa birbaşa P2 ilə görünən nəticə çıxaraq?


---

## 12. İcra vəziyyəti — 23.08.2026

Sertifikat artıq fayl deyil, **qeyddir**: bazada saxlanılır, iştirakçının hesabına bağlanır və oradan endirilir.

### Nə quruldu

| Fayl | Rolu |
|---|---|
| `prisma/schema.prisma` | Genişlənmiş `Certificate` + `CertificateSequence` |
| `src/lib/certificates/serial.ts` | Seriya nömrəsi (atomik sayğac) + doğrulama kodu |
| `src/lib/certificates/storage.ts` | PDF saxlama, sha256, path-traversal qorunması |
| `src/lib/certificates/issue-service.ts` | Tək və toplu verilmə |
| `src/lib/certificates/certificate-service.ts` | Oxuma (istifadəçi və tenant üzrə) |
| `POST /api/certificates/issue` | Bir nəfərə |
| `POST /api/certificates/issue-bulk` | 300 nəfərə qədər |
| `GET /api/certificates/[id]/file` | İcazəli endirmə |

### Qərarlar və səbəbləri

**Qeydlər tranzaksiyada, PDF-lər sonra.** Bir səhifənin renderi ~300 ms çəkir; 30 nəfər üçün tranzaksiyanı açıq saxlamaq tenantın bütün digər yazma əməliyyatlarını bloklayardı.

**Təkrar verilmə xəta deyil, `already`-dir.** Admin gec qoşulan iki nəfəri əlavə edib toplu verilməni yenidən işlədəndə nə xəta almalı, nə də dublikat yaranmalıdır.

**Ad sorğudan deyil, bazadan götürülür.** Əks halda sənədi istənilən ada yazdırmaq olardı.

**Seriya `increment` ilə bazada artırılır.** İki paralel toplu verilmə eyni nömrəni ala bilməz.

**Doğrulama `verifyCode` ilədir, `serialNumber` ilə yox.** Seriya ardıcıldır — onunla bütün sertifikatları sadalamaq olardı.

**Super admin fayla çıxa bilmir.** Sertifikat tenant məzmunudur; memarlıq prinsipi ilə ardıcıldır.

### Miqrasiya (bir dəfəlik)

```bash
npx prisma db push --accept-data-loss
npx prisma generate
npm run typecheck
npm test
```

`--accept-data-loss` **yalnız `certificates` cədvəlini** yenidən qurur: köhnə sətirlərdə `serial_number`, `verify_code`, `tenant_id` yoxdur və onlar məcburidir. Dev bazasındakı seed sertifikatları itəcək, `npm run db:seed` bərpa edir. Digər cədvəllərə toxunulmur.

### Hələ qalan

- **Fayllar lokal diskdədir.** ECS-də konteyner yenilənəndə itir — `storage.ts` bir modulda saxlanılıb ki, S3-ə keçid tək fayla toxunsun.
- **Doğrulama səhifəsi yoxdur.** `verifyCode` bazada yaranır, amma açıq `/verify/[code]` səhifəsi hələ qurulmayıb.
- **Email bildirişi yoxdur.** Sertifikat veriləndə iştirakçıya xəbər getmir.
- **Ləğvetmə UI-si yoxdur.** `revokedAt` model və endirmə route-unda işlənir (410 qaytarır), amma admin ekranı yoxdur.
