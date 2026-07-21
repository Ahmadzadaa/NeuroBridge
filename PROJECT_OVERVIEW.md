# BizSim — Layihə Tam Baxışı (A–Z)

> Bu sənəd BizSim platformasının **vizyonunu, məqsədini, biznes modelini və texniki
> memarlığını** başdan-sona təsvir edir. Məqsəd: bu sənədi AI-a verib real,
> mərhələli **inkişaf xəritəsi (roadmap)** çıxarmaqdır.
>
> Sənəd layihənin **hazırkı faktiki vəziyyətini** əks etdirir — nə tikilib, nə
> yarımçıqdır, nə çatmır — hamısı dürüst qeyd olunub. Uydurma yoxdur.
>
> Son yenilənmə: 2026-07-21 · Branch: `feature/ui-polish`

---

## 1. Bir cümlə ilə nədir?

**BizSim** — universitetlər, texnoparklar, akseleratorlar və innovasiya mərkəzləri
üçün **çox-kirayəçili (multi-tenant) B2B SaaS** platformasıdır. Sahibkarlıq
təhsilini simulyasiya, video təlim, imtahan, gamifikasiya, AI dəstəyi və
**T3KYS-üslublu hakaton/jüri sistemi** ilə tam rəqəmsallaşdırır.

---

## 2. Vizyon və Məqsəd

### Vizyon
Sahibkarlıq təhsilini "slayd göstərmək"dən çıxarıb **ölçülə bilən, interaktiv,
oyunlaşdırılmış təcrübəyə** çevirmək. Bir təşkilat proqram açır, iştirakçılar
real ssenarilər üzərində qərar verir, biliklərini imtahanla təsdiqləyir, hakaton
keçirir — və bütün nəticələr rəqəmlə ölçülür.

### Həll etdiyi problem
- Texnoparklar/universitetlər sahibkarlıq proqramlarını **Excel + email + fiziki
  jüri kağızları** ilə idarə edir → dağınıq, ölçülməz, təkrar-emal olunmayan.
- İştirakçının irəliləyişini, hansı bacarığı nə qədər inkişaf etdirdiyini
  izləmək mümkün olmur.
- Hakaton qiymətləndirməsi subyektiv və şəffaf deyil (kim, hansı meyara, neçə
  bal verdi — məlum olmur).

### Kimə satılır (hədəf müştəri)
Texnoparklar, universitet sahibkarlıq mərkəzləri, akseleratorlar, dövlət
innovasiya agentlikləri, KOB inkişaf təşkilatları — hər biri **öz brendi altında,
öz iştirakçıları ilə** platformadan istifadə edir.

---

## 3. Biznes Modeli (KRİTİK — sistemin əsas məntiqi)

Platforma **seat (oturacaq) lisenziyası** üzərində qurulub. İş axını belədir:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. PLATFORMA SAHİBİ (Super Admin = biz)                             │
│    • Teknoparkla danışıq aparır, satış edir                         │
│    • Ona 100 nəfərlik (seat) hesab açır                             │
│    • Admin girişini EMAIL ilə təhvil verir                          │
│    • BUNDAN SONRA tenant məzmununa QARIŞMIR                         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ hesab + şifrə (email ilə)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. TENANT ADMİN (Teknoparkın öz admini)                            │
│    • İlk girişdə 2FA quraşdırır, şifrəni dəyişir                    │
│    • Proqram yaradır (təlim / hakaton / startup challenge)          │
│    • QR kod / dəvət linki ilə iştirakçıları qeydiyyata dəvət edir   │
│    • Jüri üzvlərini ÖZÜ təyin edir                                  │
│    • Hakaton meyarlarını təyin edir, nəticələri açıqlayır           │
└──────────────────────────┬──────────────────────────────────────────┘
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ 3. İŞTİRAKÇI             │  │ 4. JÜRİ                  │
│  • QR/link ilə qeydiyyat │  │  • Layihələrə baxır      │
│  • Təlim izləyir         │  │  • PDF oxuyur            │
│  • İmtahan verir         │  │  • Meyar üzrə bal verir  │
│  • Hakatonda komanda     │  │  • Şərh yazır            │
│  • PDF layihə yükləyir   │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

**Ən mühüm prinsip:** Super Admin **yalnız hesab açıb təhvil verir**. Proqram,
hakaton, jüri, təlim — bunların hamısı **tenantın öz səlahiyyətindədir**. Bu
ayrılıq RBAC ilə kodda təmin olunub və testlə qorunur (super admin tenant
məzmununa müdaxilə edə bilmir).

### Gəlir modeli (mövcud sabitlər)
Seat paketləri kodda təyin olunub (`src/lib/constants.ts`):
| Paket | Oturacaq | Qiymət/oturacaq |
|-------|----------|-----------------|
| Starter | 50 | $29 |
| Growth | 100 | $25 |
| Enterprise | 250 | $22 |

Plan tipləri: `starter`, `professional`, `enterprise`.

---

## 4. Rollar və Səlahiyyət Matrisi (RBAC)

Sistemdə **5 rol** var. Səlahiyyətlər `src/lib/auth/permissions.ts`-də mərkəzləşib.

| Rol | Panel | Nə edir |
|-----|-------|---------|
| **SUPER_ADMIN** | `/super-admin` | Tenant açır/dayandırır, billing, audit, sistem sağlamlığı, ümumi baxış (yalnız oxuma). **Tenant məzmununa qarışmır.** |
| **TENANT_ADMIN** | `/tenant` | Proqram, iştirakçı, hakaton, jüri, hesabatlar — tam idarəetmə |
| **TENANT_VIEWER** | `/tenant` | Yalnız oxuma (hesabat, iştirakçı siyahısı) |
| **PARTICIPANT** | `/participant` | Təlim, imtahan, simulyasiya, hakaton, sertifikat, liderlik |
| **JURY** | `/jury` | Hakaton layihələrinə baxıb qiymətləndirmə |

### Səlahiyyət ayrılığının koddakı təminatı
Super Admin-dən **çıxarılıb**: `program:write`, `program:delete`,
`participant:write`, `training:submit`, `hackathon:manage/submit/score`, `ai:use`.
Bu, `permissions.test.ts`-də test ilə qorunur — kimsə gələcəkdə geri əlavə etsə,
test uğursuz olur.

---

## 5. Funksional İmkanlar (Nə Tikilib — hamısı işlək)

### 5.1. Kimlik və Təhlükəsizlik
- **NextAuth.js v5** ilə giriş (JWT sessiya, 8 saat TTL)
- **2FA (TOTP)** — admin rolları üçün məcburi, recovery kodları ilə (AES-256-GCM
  şifrəli sirlər)
- Hesab bloklanması (uğursuz giriş cəhdlərinə görə)
- Self-service profil: ad/telefon/dil dəyişmə + cari şifrə yoxlaması ilə şifrə dəyişmə
- Rate limiting (login, registration, AI, webhook)

### 5.2. Tenant İdarəetməsi (Super Admin)
- Real datalı tenant siyahısı (status, seat istifadəsi, plan, istifadəçi/proqram sayı)
- **Tenant provisioning dialoqu:** təşkilat + admin hesabı bir kliklə → email ilə
  giriş məlumatları göndərilir → birdəfəlik şifrə göstərilir
- Tenant dayandır/aktivləşdir, seat limitini dəyişmə (istifadədən aşağı düşməyə qarşı qorunub)

### 5.3. Proqram və Qeydiyyat (Tenant Admin)
- Proqram növləri: `entrepreneurship_training`, `business_idea_development`,
  `startup_challenge`, `hackathon`, `competition`, `innovation_program`, `other`
- Proqrama simulyasiya, təlim, AI alət seçimi əlavə etmə
- **QR kod ilə dəvət:** hər proqram üçün QR (kopyala/PNG endir) → apply linkinə aparır
- Apply-token axını ilə iştirakçı qeydiyyatı (`/apply/[token]`)
- Atomik seat lisenziyalaşdırma (`SELECT FOR UPDATE` ilə race condition-a qarşı)

### 5.4. Təlim Modulu (İştirakçı) — TAM İŞLƏK
- Data-driven təlim siyahısı (dərs sayı, dəqiqə, irəliləyiş %, imtahan statusu)
- Təlim detalı: **YouTube video pleyer**, dərs playlisti, "tamamla və növbəti" axını
- Per-dərs tamamlama izləməsi (`LessonProgress` modeli), irəliləyiş barları
- Real təhsil videoları (TED çıxışları) demo datada

### 5.5. İmtahan Sistemi (İştirakçı) — TAM İŞLƏK
- İntro → sual-sual keçid (nöqtə naviqasiyası) → nəticə ekranı
- **Server-tərəf qiymətləndirmə** (düzgün cavablar heç vaxt brauzerə göndərilmir)
- Ən yaxşı nəticə saxlanılır, ilk keçiddə +50 coin, keçəndə konfetti
- Nəticədə hər sual üçün: sənin cavabın / düzgün cavab / izahat

### 5.6. Hakaton / Jüri Sistemi (T3KYS-üslubu) — TAM İŞLƏK
**İştirakçı tərəfi:**
- Komanda yarat/qoşul (max 5 nəfər)
- Layihə PDF yüklə (10MB limit, PDF magic-byte yoxlaması, versiyalama)
- Canlı sıralamaya bax

**Jüri tərəfi:**
- Gözləyən/tamamlanmış layihələr paneli
- PDF-i səhifədə oxu (icazəli fayl servisi)
- Hər meyar üçün slider ilə bal + şərh

**Tenant Admin tərəfi:**
- Meyar redaktoru (maksimum bal + çəki)
- Jüri təyinatı (email ilə — mövcud iştirakçını jüriyə çevirir və ya yeni hesab yaradır)
- Canlı sıralama (çəkili orta ilə, meyar-meyar breakdown)

**Nəticələrin açıqlanma anı (reveal):**
- Tarix planla / dərhal açıqla / gizlət
- İştirakçılar açıqlanana qədər **canlı geri sayım** görür (konfetti ilə açılır)
- Açıqlanmadan sonra komandalar **anonim jüri rəyini** (meyar üzrə bal + şərh) görür
- Açıqlama anında hər komanda üzvünə **email** göndərilir (yer + bal)

### 5.7. Gamifikasiya
- Coin sistemi (`CoinTransaction`), rozet (`Badge`/`UserBadge`), liderlik cədvəli
- Simulyasiya tapşırıqları rozetlə/coin ilə əlaqəli

### 5.8. Sertifikatlar
- 3 tip: İştirak / Uğur / Proqram Tamamlama
- Sertifikat xidməti (issuance), tenant tərəfindən toggle olunan

### 5.9. Email Bildirişləri
- Provider abstraksiyası: **AWS SES** (production) / **console** (dev — HTML fayllar
  `uploads/dev-emails/`-ə yazılır)
- Bağlı axınlar: tenant hesabı yaradılması, jüri hesabı, iştirakçı qeydiyyatı,
  nəticələrin açıqlanması
- Brendli HTML şablonlar

### 5.10. Ödəniş və Billing
- 3 provider inteqrasiyası: **Stripe, Payriff, Iyzico**
- Webhook imza yoxlaması, idempotentlik (`WebhookEvent`), refund yolu

### 5.11. Audit və Monitorinq
- Mərkəzi audit jurnalı (login, ödəniş, ixrac, rol dəyişikliyi, tenant əməliyyatı, 2FA)
- Sentry + CloudWatch inteqrasiyası, health/readiness endpointləri

---

## 6. Texniki Memarlıq (A–Z)

### 6.1. Texnologiya Steki
| Qat | Texnologiya |
|-----|-------------|
| Framework | **Next.js 16** (App Router, Turbopack), React 19 |
| Dil | TypeScript |
| Stil | Tailwind CSS v4 + shadcn/ui + Base UI |
| i18n | next-intl (AZ / TR / EN) |
| Auth | NextAuth.js v5 (JWT) |
| ORM / DB | **Prisma** + PostgreSQL (prod) / SQLite (lokal dev) |
| Animasiya | Framer Motion |
| Qrafiklər | Recharts |
| State | TanStack Query + Zustand |
| Cache / Rate limit | Upstash Redis (+ memory fallback) |
| Ödəniş | Stripe / Payriff / Iyzico SDK |
| Email | AWS SES v2 SDK |
| 2FA | otplib, QR kod |
| Monitorinq | Sentry + AWS CloudWatch |
| Test | Vitest (unit/integration) + Playwright (E2E) |

> ⚠️ Qeyd: Bu Next.js versiyası breaking change-lərə malikdir. `middleware.ts`
> köhnəlib → `src/proxy.ts` konvensiyası istifadə olunur.

### 6.2. Qovluq Strukturu
```
src/
├── app/
│   ├── [locale]/          # i18n route-lar (az/tr/en)
│   │   ├── super-admin/   # Platforma sahibi paneli
│   │   ├── tenant/        # Tenant admin paneli
│   │   ├── participant/   # İştirakçı paneli
│   │   ├── jury/          # Jüri paneli
│   │   ├── apply/[token]/ # Açıq qeydiyyat səhifəsi
│   │   ├── login/
│   │   └── settings/      # 2FA/təhlükəsizlik
│   └── api/               # 40 API route (aşağıda)
├── components/
│   ├── ui/                # shadcn primitivləri (~30 komponent)
│   ├── layout/            # Sidebar, mobil nav, dashboard layout
│   └── hackathon/         # Sıralama cədvəli
├── lib/                   # Biznes məntiqi (aşağıda)
├── i18n/                  # Routing, request konfiqurasiyası
├── auth.ts                # NextAuth konfiqurasiyası
└── proxy.ts               # i18n proxy (köhnə middleware)
```

### 6.3. Verilənlər Bazası Modeli (29 model)
**Əsas qruplar:**

- **Kirayəçi:** `Tenant`, `TenantSettings`
- **İstifadəçi:** `User`, `UserRecoveryCode`
- **Proqram:** `Program`, `ProgramSimulation`, `ProgramTraining`, `ProgramAiTool`, `Participant`
- **Simulyasiya:** `Simulation`, `SimulationTask`
- **Təlim:** `Training`, `Lesson`, `LessonProgress`, `Exam`, `Question`, `ExamAttempt`
- **Hakaton:** `HackathonTeam`, `TeamMember`, `ProjectSubmission`, `JuryCriterion`, `JuryScore`
- **Gamifikasiya:** `Badge`, `UserBadge`, `CoinTransaction`, `Certificate`
- **Ödəniş:** `Payment`, `WebhookEvent`
- **Audit:** `AuditLog`

**Diqqətəlayiq dizayn qərarları:**
- Trilingual sahələr (`titleTr/titleEn/titleAz`) — `localized()` helper ilə həll olunur
- `Program.resultsRevealAt` — hakaton nəticə açıqlanma gate-i
- `Program.applicationToken` — QR/apply linki üçün unikal token
- Multi-tenant izolyasiya: `tenantId` hər əsas modeldə, PostgreSQL RLS ilə (prod)

### 6.4. API Route-lar (40 endpoint)
```
Auth:        /auth/[...nextauth], /auth/2fa/{setup,enable,disable}
Tenant:      /tenants, /tenants/[id], /tenant/settings
Proqram:     /programs, /programs/[id]/participants, /participants, /registration
Apply:       /apply/[token]
Təlim:       /lessons/[id]/complete, /exams/[id]/attempt
Hakaton:     /hackathon/teams, /hackathon/teams/[id]/{join,submission}
             /hackathon/submissions/[id]/{file,scores}
             /hackathon/criteria, /hackathon/juries, /hackathon/reveal
Profil:      /profile, /profile/password
Sertifikat:  /certificates, /certificates/issue
Billing:     /billing/checkout, /billing/payments
Webhook:     /webhooks/{stripe,payriff,iyzico}
AI:          /ai/chat
Hesabat:     /reports/export, /jobs/[id], /jobs/[id]/download
Metrics:     /metrics/business, /audit
Health:      /health, /health/ready
```

### 6.5. Biznes Məntiqi Xidmətləri (`src/lib/`)
Hər domen ayrıca xidmət + testlə:
- `auth/` — permissions matrisi, credentials, session, authorize
- `seats/` — seat lisenziyalaşdırma, qeydiyyat (atomik)
- `hackathon/` — sıralama hesablaması (`ranking.ts`), reveal gate (`reveal.ts`)
- `email/` — provider abstraksiyası + şablonlar
- `payment/` — 3 provider + webhook processor + registry
- `certificates/`, `participants/`, `programs/`, `tenant/`
- `queue/` — Redis-əsaslı background job (report ixracı)
- `cache/`, `redis/`, `security/` (rate-limit, 2FA), `audit/`, `monitoring/`
- `validation/schemas.ts` — bütün API üçün Zod sxemləri

### 6.6. Təhlükəsizlik Təminatları
- RBAC hər API route-da (`withAuthorizedHandler` + permission matrisi)
- PostgreSQL RLS (tenant izolyasiyası)
- Zod validasiya + XSS-safe string refinement bütün input-larda
- Webhook imza yoxlaması
- PDF yükləmədə magic-byte yoxlaması, path traversal qorunması
- İcazəli fayl servisi (jüri PDF-lərinə yalnız komanda üzvləri + jüri + admin çıxışı)
- Sirlər AWS Secrets Manager-də (imicdə/git-də deyil)

### 6.7. İnfrastruktur və Deployment
- **Docker** (Next.js standalone + ayrıca worker imici)
- **Terraform** (`infra/terraform/`): VPC, RDS, ECS Fargate, ALB, CloudFront, S3,
  Secrets Manager, ECR, IAM — staging + production ayrı state
- **GitHub Actions**: CI (test + lint + build), staging CD, production CD (OIDC ilə)
- Health check-lər, rolling deployment, migration task

---

## 7. Çoxdillilik (i18n)
- 3 dil: **Azərbaycan (AZ), Türk (TR), İngilis (EN)**
- Bütün UI mətnləri `messages/{az,tr,en}.json`-da
- DB məzmunu trilingual sahələrlə
- İstifadəçi dil seçimi profildə saxlanılır, dəyişəndə interfeys dərhal keçir

---

## 8. Hazırkı Vəziyyət — Nə Var, Nə Çatmır

### ✅ Tam işlək (production-ready səviyyədə)
- Kimlik/2FA/rol sistemi (5 rol)
- Tenant provisioning (email ilə təhvil)
- Təlim + video + imtahan (server-tərəf qiymətləndirmə)
- Hakaton/jüri (PDF, meyar, sıralama, reveal, jüri rəyi)
- QR dəvət, apply qeydiyyatı
- Email bildirişləri (SES + dev provider)
- Gamifikasiya, sertifikat, audit
- Ödəniş providerləri (kod səviyyəsində)
- Docker + Terraform + CI/CD (yazılıb)
- 126 unit + integration test, ~90% core coverage, production build təmiz

### ⚠️ Yarımçıq / Mock / Çatışmayan
- **Super-admin panellərinin bir hissəsi hələ mock data** ilə: `billing`, `content`,
  `support`, `system` səhifələri (yalnız `tenants` real datalıdır)
- **Simulyasiya modulu** — data modeli var (`Simulation`, `SimulationTask`), amma
  interaktiv oynanış UI-si tam deyil (imtahan/təlim səviyyəsində deyil)
- **AI alətləri** — `/ai/chat` endpointi var, amma 7 AI alətinin (mentor, jüri,
  qiymətləndirmə, pitch coach və s.) real inteqrasiyası tam deyil
- **PDF sertifikat generasiyası** — sertifikat data var, PDF/S3 pipeline yoxdur
- **GDPR/KVKK** — data ixrac/silmə (DSAR) endpointləri yoxdur
- **Deployment əməliyyatı** — Terraform yazılıb amma `apply` edilməyib, secrets
  doldurulmayıb, DNS yönləndirilməyib
- **AWS WAF** — konfiqurasiya olunmayıb
- **Real ödəniş** — providerlər kodda var, canlı açar/test edilməyib
- **Email şablonları** — yalnız AZ dilində (TR/EN lokalizasiyası yoxdur)

### 🔒 Xarici asılılıqlar (kod xaricində)
- Üçüncü tərəf pentest
- Hüquqi baxış (GDPR/KVKK DPA)
- SOC 2 / ISO 27001

---

## 9. Demo Data və Giriş
```bash
npm run db:seed-demo        # tenant, proqram, təlim, imtahan
npm run db:seed-hackathon   # hakaton, komandalar, jüri, PDF nümunələri
```
| Rol | Email | Şifrə |
|-----|-------|-------|
| Super Admin | admin@bizsim.com | Admin123! |
| Tenant Admin | admin@demo-teknopark.com | Demo123! |
| İştirakçı | ahmet.yilmaz0@demo.com | Demo123! |
| Jüri | jury@demo-teknopark.com | Demo123! |

---

## 10. Roadmap Üçün Açıq Suallar (AI-a istiqamət)

Bu sənədi roadmap üçün istifadə edərkən aşağıdakı istiqamətlər prioritet namizədidir:

1. **Simulyasiya oynanışını tamamlamaq** — ən böyük funksional boşluq; data modeli
   hazır, interaktiv qərar-vermə UI-si lazımdır.
2. **AI alətlərini gerçək inteqrasiya etmək** — 7 AI aləti (Claude API ilə) real
   işə salmaq (mentor, jüri assistenti, pitch coach və s.).
3. **Super-admin mock panellərini realdan bağlamaq** — billing, content, support,
   system səhifələri.
4. **Deployment-i canlıya çıxarmaq** — Terraform apply, secrets, DNS, WAF, monitoring.
5. **PDF sertifikat generasiyası** — S3 pipeline.
6. **GDPR/KVKK compliance** — DSAR endpointləri.
7. **Email lokalizasiyası** — TR/EN şablonlar, tenant-ın dilinə görə.
8. **Mobil təcrübə və PWA** — hazırda responsive, amma native-bənzər deyil.
9. **Analitika/hesabat dərinləşdirmə** — tenant üçün irəliləyiş dashboardları.
10. **Real ödəniş axınını canlı test** — 3 providerlə.

---

## 11. Xülasə (Bir Paraqraf)

BizSim — texnoparklar üçün çox-kirayəçili sahibkarlıq təhsil platformasıdır.
Platforma sahibi (biz) tenant hesabı açıb təhvil verir; tenant admini isə tam
müstəqil şəkildə proqram, hakaton və jüri idarə edir. Əsas funksiyalar — video
təlim, server-tərəf imtahan, T3KYS-üslublu hakaton (PDF layihə + meyarlı jüri
qiymətləndirmə + nəticə açıqlanma anı), QR qeydiyyat, gamifikasiya və email
bildirişləri — **tam işlək və brauzerdə test edilmişdir**. Texniki təməl (Next.js
16, Prisma, RBAC, 2FA, Docker, Terraform, CI/CD, 126 test) production səviyyəsindədir.
Əsas boşluqlar: simulyasiya oynanışı, AI alətlərinin real inteqrasiyası, bəzi
super-admin panellərinin mock olması və deployment əməliyyatının hələ icra
olunmaması.
