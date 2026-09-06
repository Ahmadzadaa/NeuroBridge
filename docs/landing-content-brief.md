# Marketinq saytı — məzmun brifi

> ## ⚠️ VƏZİYYƏT: məzmun DOLDURULUB (demo versiyası)
>
> Bütün 206 token üç dildə real mətnlə əvəz edilib. Sayt indi işlək demo kimi
> baxıla bilər. Aşağıdakı bölmələr **hansı mətnin harada olduğunu** göstərir —
> dəyişmək istədiyiniz yeri tapmaq üçün.
>
> **Nəzərdən keçirilməli 3 şey (mən uydurmadım, siz təsdiqləməlisiniz):**
>
> | Nə | Niyə |
> |---|---|
> | **Qiymətlər: 25 / 45 / 75 ₺** (iştirakçı/ay) | Rəqib araşdırması aparılmayıb. Bu rəqəmlər sizin mövcud seed-inizdəki 25 ₺ bazasından pilləli struktura salınıb — **kommersiya qərarı sizindir**. Dəyişmək: `prisma/seed-plans.ts`, sonra `npm run db:seed-plans` |
> | **Sosial sübut bölməsi** | Uydurma müştəri adı və uydurma şəxsə aid rəy yazmadım — dərc olunsa saxta zəmanət olardı. Hazırda «Nümunə Texnoparkı» tipli açıq nümunə etiketləri var, sitatın altında isə «nümunə mətn, real müştəri rəyi ilə əvəz edilməlidir» yazılıb. **Real müştəri icazəsi olmadan dərc etməyin.** |
> | **/privacy və /terms** | Real quruluşlu **qaralama** mətn yazıldı, amma hüquqşünas baxışından keçməyib. Səhifədə sarı «QARALAMA» xəbərdarlığı görünür — hüquqi təsdiqdən sonra onu `LegalDocument` çağırışından `draftNotice` propunu çıxarmaqla gizlədin. |

## Necə doldurulur

Bütün mətn tərcümə fayllarındadır:

```
messages/az.json  →  "marketing" bloku      ← əsas dil
messages/en.json  →  "marketing" bloku      ← ikinci dil
messages/tr.json  →  "marketing" bloku      ← CI üç dilin hamısını tələb edir
```

Mətni dəyişmək üçün `messages/<dil>.json` faylında `marketing` blokunu redaktə edin. Boş token qalmayıb — yoxlamaq üçün: `grep -c "[[" messages/az.json` → `0`.

> **Niyə `[[...]]`, `{{...}}` yox:** next-intl ICU MessageFormat işlədir və orada `{` xüsusi simvoldur — `{{HERO_HEADLINE}}` parse olunmur, səhifədə mətn yerinə açar yolu (`marketing.home.hero.headline`) çıxır. Kvadrat mötərizələrin ICU-da mənası yoxdur, ona görə olduğu kimi keçir.

**Hər dildə 206 token var.** Tokeni tapmaq üçün:

```bash
grep -n "HERO_HEADLINE" messages/az.json
```

Doldurduqdan sonra yoxlayın:

```bash
npm run check:i18n && npm run build
```

> **Diqqət:** `[[...]]` yazısı ilə qalan sahə saytda göründüyü kimi qalır — bu qəsdəndir, boş buraxılmış yer nəzərdən qaçmasın deyə.

Naviqasiya, düymə mətnləri, forma etiketləri və cədvəl başlıqları **artıq üç dildə yazılıb** — onlara toxunmaq lazım deyil.

---

## Qalan işlər (mətndən başqa)

| İş | Niyə |
|---|---|
| **`plans` cədvəlinə 3 plan əlavə edin** | Qiymət səhifəsi planları DB-dən oxuyur (hardcode yoxdur). Hazırda yalnız bir plan var: `Standard` (25,00 ₺/iştirakçı, min. 10). Üç kart görünməsi üçün billing modulunda daha iki plan yaradılmalıdır. |
| **Hər plan üçün `[[PLAN_<AD>_*]]` blokları** | Yeni plan əlavə edəndə `messages/*.json` → `marketing.pricing.plans.<slug>` bloku da lazımdır. `slug` = plan adının kiçik hərfli, alt-xətli forması (`Pro Plus` → `pro_plus`). Blok yoxdursa səhifə `plans.default` bloklarına düşür — sınmır. |
| **Ekran görüntüləri** | 13 yer var (aşağıda). Hazırda ölçüsü qorunmuş kəsik-xətli çərçivələrdir, ona görə şəkil sonradan qoyulanda tərtibat sürüşmür. |
| **OG şəkli** | `public/og/default.svg` müvəqqəti placeholder-dir. Bəzi sosial şəbəkələr SVG göstərmir — kampaniyadan əvvəl **1200×630 PNG** ilə əvəz edin. |
| **`LEADS_NOTIFICATION_EMAIL`** | Demo tələbləri bu ünvana gedir. Təyin edilməsə `EMAIL_FROM`-a düşür. |
| **Hüquqi mətnlər** | `/privacy` və `/terms` skeletdir və səhifədə **sarı «QARALAMA» xəbərdarlığı** göstərir. Mətn hüquqşünasdan gəlməlidir. |

---

## 1. Ana səhifə (`/`)

### Hero — problem, sonra həll

| Token | Nə lazımdır | Tövsiyə |
|---|---|---|
| `[[HERO_EYEBROW]]` | Kiçik üst etiket | 2–4 söz, məs. hədəf sektor |
| `[[HERO_HEADLINE]]` | Əsas başlıq | 6–10 söz. Məhsulu yox, **nəticəni** deyin |
| `[[HERO_PROBLEM]]` | Müştərinin ağrısı | 1 cümlə, 10–15 söz |
| `[[HERO_SOLUTION]]` | Sizin cavabınız | 1–2 cümlə, 25–35 söz |
| `[[HERO_REASSURANCE]]` | Riski azaldan qeyd | Məs. quraşdırma müddəti, öhdəlik yoxdur |
| `[[HERO_SCREENSHOT_CAPTION]]` | Şəkil təsviri | **Bu həm də `alt` mətnidir** — ekranda nə görünür |

### Sosial sübut zolağı

| Token | Nə lazımdır |
|---|---|
| `[[PROOF_TITLE]]` | Zolağın başlığı, məs. «Bizə güvənənlər» |
| `[[PROOF_LOGO_1..4]]` | 4 müştəri adı. **Logolar əlavə olunana qədər mətn kimi görünür** |
| `[[PROOF_QUOTE]]` | Sitat, 20–30 söz |
| `[[PROOF_ATTRIBUTION]]` | Ad, vəzifə, təşkilat |

> Real müştəri yoxdursa: bu bölməni boş saxlamayın — pilot təşkilatların adını və ya rəqəmləri (məs. iştirakçı sayı) yazın.

### 4 əsas funksiya bloku

Hər biri üçün üç token: `[[HOME_FEATURE_<N>_TITLE]]`, `[[HOME_FEATURE_<N>_BODY]]`, `[[HOME_FEATURE_<N>_SCREENSHOT_CAPTION]]` (N = 1…4).

Bölmə başlığı: `[[HOME_FEATURES_EYEBROW]]`, `[[HOME_FEATURES_TITLE]]`, `[[HOME_FEATURES_DESCRIPTION]]`.

Tövsiyə: başlıq 3–5 söz, mətn 20–30 söz.

### Necə işləyir (3 addım)

`[[STEPS_TITLE]]`, `[[STEPS_DESCRIPTION]]`, sonra `[[STEP_1..3_TITLE]]` və `[[STEP_1..3_BODY]]`.

Addımlar satış axınına uyğun olmalıdır: **hesab açılır → proqram qurulur → iştirakçılar dəvət olunur**.

### Qiymət önizləməsi

`[[PRICING_PREVIEW_TITLE]]`, `[[PRICING_PREVIEW_DESCRIPTION]]`, `[[PRICING_PREVIEW_CTA]]`.

Qiymət rəqəmləri **avtomatik DB-dən gəlir** — burada rəqəm yazmayın.

### Yekun CTA

`[[HOME_CTA_TITLE]]`, `[[HOME_CTA_BODY]]`, `[[HOME_CTA_BULLET_1..3]]` (hər biri 2–4 söz).

---

## 2. Funksiyalar (`/features`)

Bölmə başlığı: `[[FEATURES_EYEBROW]]`, `[[FEATURES_TITLE]]`, `[[FEATURES_DESCRIPTION]]`.

Altı modul var və **hər biri platformada real mövcuddur** — mövcud olmayan funksiya vəd etməmək üçün siyahı koda bağlanıb:

| Modul | Token prefiksi | Platformada nə var |
|---|---|---|
| Təlimlər | `FEATURE_TRAININGS_*` | Video dərslər, playlist, per-dərs irəliləyiş |
| İmtahanlar | `FEATURE_EXAMS_*` | Server-tərəf qiymətləndirmə, izahlı nəticə |
| Simulyasiyalar | `FEATURE_SIMULATIONS_*` | Data-driven ssenarilər, müəllim qiymətləndirməsi |
| Hakaton / jüri | `FEATURE_HACKATHON_*` | Komanda, PDF, meyarlı bal, nəticə açıqlanması |
| Sertifikatlar | `FEATURE_CERTIFICATES_*` | PDF generasiya, seriya nömrəsi, doğrulama kodu |
| Analitika | `FEATURE_ANALYTICS_*` | Tenant dashboard, kurs breakdown, CSV ixrac |

Hər modul üçün beş token: `_EYEBROW`, `_TITLE`, `_BODY` (30–45 söz), `_BULLET_1..3` (hər biri 5–8 söz), `_SCREENSHOT_CAPTION`.

---

## 3. Qiymətlər (`/pricing`)

`[[PRICING_TITLE]]`, `[[PRICING_SUBTITLE]]`.

### Plan kartları

Qiymət, minimum iştirakçı sayı və sınaq müddəti **DB-dən gəlir**. Sizdən lazım olan yalnız marketinq mətnidir:

- `[[PLAN_STANDARD_TAGLINE]]` — kimə uyğundur, 5–10 söz
- `[[PLAN_STANDARD_BULLET_1..4]]` — hər biri 3–6 söz
- `[[PLAN_DEFAULT_*]]` — mətn bloku olmayan yeni planlar üçün ehtiyat variant

Ortadakı kart avtomatik «Ən çox seçilən» kimi işarələnir.

### Müqayisə cədvəli

Sətir adları: `[[COMPARISON_ROW_*]]` (9 sətir — yuxarıdakı 6 modul + `AI_TOOLS`, `SSO`, `SUPPORT`).

Plan üzrə dəyərlər: `[[COMPARISON_STANDARD_*]]`. **Xüsusi dəyərlər:**

| Yazsanız | Nə görünür |
|---|---|
| `yes` | ✓ yaşıl işarə |
| `no` | — boz tire |
| başqa mətn | mətn olduğu kimi (məs. «5 ssenari», «Limitsiz») |

### FAQ

`[[FAQ_1..5_QUESTION]]` və `[[FAQ_1..5_ANSWER]]`. Tövsiyə olunan suallar: seat nədir və necə sayılır · ödəniş dövrü · orta ilində plan dəyişmək · data harada saxlanılır · müqavilə/faktura şərtləri.

### Yekun CTA

`[[PRICING_CTA_TITLE]]`, `[[PRICING_CTA_BODY]]`.

---

## 4. Əlaqə (`/contact`)

`[[CONTACT_TITLE]]`, `[[CONTACT_DESCRIPTION]]`.

Yan paneldəki üç zəmanət:

| Token | Nə lazımdır |
|---|---|
| `[[CONTACT_RESPONSE_TITLE]]` / `_BODY` | Nə vaxt cavab verirsiniz (məs. «1 iş günü») |
| `[[CONTACT_PRIVACY_TITLE]]` / `_BODY` | Datanın necə istifadə olunduğu |
| `[[CONTACT_NO_SPAM_TITLE]]` / `_BODY` | Spam göndərilməyəcəyi |

Digərləri: `[[CONTACT_SUCCESS_BODY]]` (göndərildikdən sonrakı mətn), `[[CONTACT_CONSENT]]` (**forma altındakı KVKK/GDPR razılıq mətni — hüquqşünasla razılaşdırılmalıdır**).

Forma sahələrinin etiketləri artıq tərcümə olunub.

---

## 5. Hüquqi səhifələr (`/privacy`, `/terms`)

Hər ikisi **skeletdir** və səhifədə sarı «QARALAMA» xəbərdarlığı göstərir. Xəbərdarlıq mətni artıq üç dildə yazılıb — hüquqi mətn hazır olanda `marketing.privacy.draftNotice` və `marketing.terms.draftNotice` açarlarını silmək yox, **boş sətrə çevirmək** kifayət deyil; xəbərdarlığı gizlətmək üçün `LegalDocument` çağırışından `draftNotice` proplarını çıxarın.

Hər bölmə üçün iki token: `_HEADING` və `_BODY`.

**Məxfilik (12 bölmə):** `CONTROLLER`, `DATA_COLLECTED`, `PURPOSES`, `LEGAL_BASIS`, `SHARING`, `TRANSFERS`, `RETENTION`, `SECURITY`, `RIGHTS`, `COOKIES`, `CHANGES`, `CONTACT`

**Şərtlər (12 bölmə):** `ACCEPTANCE`, `SERVICE`, `ACCOUNTS`, `SEATS`, `ACCEPTABLE_USE`, `CONTENT`, `AVAILABILITY`, `FEES`, `TERMINATION`, `LIABILITY`, `GOVERNING_LAW`, `CONTACT`

Ayrıca: `[[LAST_UPDATED_DATE]]` — hər iki səhifədə tarix.

> Bölmə mətnində abzas ayırmaq üçün `\n` işlədin — səhifə sətir keçidlərini saxlayır.

---

## 6. SEO mətnləri

Hər səhifə üçün ayrı başlıq və təsvir, **hər dildə fərqli** (ona görə token adının sonunda dil kodu var):

```
[[SEO_HOME_TITLE_AZ]]        [[SEO_HOME_DESCRIPTION_AZ]]
[[SEO_FEATURES_TITLE_AZ]]    [[SEO_FEATURES_DESCRIPTION_AZ]]
[[SEO_PRICING_TITLE_AZ]]     [[SEO_PRICING_DESCRIPTION_AZ]]
[[SEO_CONTACT_TITLE_AZ]]     [[SEO_CONTACT_DESCRIPTION_AZ]]
[[SEO_PRIVACY_TITLE_AZ]]     [[SEO_PRIVACY_DESCRIPTION_AZ]]
[[SEO_TERMS_TITLE_AZ]]       [[SEO_TERMS_DESCRIPTION_AZ]]
```

`_EN` və `_TR` variantları da eynidir.

**Hədd:** başlıq ≤ 60 simvol, təsvir 140–160 simvol. Bu mətnlər `<title>`, meta description, OpenGraph və Twitter kartlarında **eyni anda** istifadə olunur.

Ayrıca: `[[FOOTER_TAGLINE]]` — footer-də şirkət təsviri, 10–15 söz.

---

## 7. Ekran görüntüsü yerləri (13 ədəd)

| Səhifə | Yer | Nisbət |
|---|---|---|
| Ana | Hero | 16:10 |
| Ana | 4 funksiya bloku | 16:9 |
| Funksiyalar | 6 modul bloku | 16:10 |

Hər birinin təsviri həm də **`alt` mətni kimi işlədilir**, ona görə «Ekran görüntüsü» yazmayın — ekranda **nə göründüyünü** yazın (məs. «Tenant analitika paneli: kurs üzrə tamamlanma cədvəli»).

Şəkillər `public/` altına qoyulmalı və `ScreenshotPlaceholder` komponenti `next/image` ilə əvəz olunmalıdır — [sections.tsx](../src/components/marketing/sections.tsx) faylında bir yerdə.

---

## Yekun sayım

| Bölmə | Token |
|---|---|
| Ana səhifə | 44 |
| Funksiyalar | 47 |
| Qiymətlər | 42 |
| Əlaqə | 10 |
| Məxfilik | 25 |
| Şərtlər | 25 |
| SEO | 12 |
| Footer | 1 |
| **Cəmi (hər dil)** | **206** |

Sayımı özünüz yoxlamaq üçün:

```bash
node -e "const m=require('./messages/az.json').marketing;let n=0;(function w(x){typeof x==='string'?(/^\{\{[A-Z0-9_]+\}\}$/.test(x)&&n++):Object.values(x).forEach(w)})(m);console.log(n)"
```
