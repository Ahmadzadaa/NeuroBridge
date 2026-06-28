# DEMO DATA & CONTENT SEEDING — CURSOR PROMPT

## CONTEXT

The platform currently has the correct data structure (programs, simulations, trainings, badges, exams) but the content is empty/placeholder. We need a realistic, fully-populated demo environment to properly test the system end-to-end before selling to real institutional clients.

This prompt asks you to build a **seed script** that creates one complete demo tenant with realistic content and 100 demo participants with varied progress states.

Do not create placeholder text like "Lorem ipsum" or "Sample content here" — write real, usable training content (in Turkish, with English/Azerbaijani translations where the i18n system requires it).

---

## 1. DEMO TENANT

Create one demo tenant:

- Name: "Demo Teknopark"
- Seat limit: 100
- Plan type: "professional" (or whatever your plan enum uses)
- Status: active
- One Tenant Admin user (email: `admin@demo-teknopark.com`, role: TENANT_ADMIN)
- One Tenant Viewer user (email: `viewer@demo-teknopark.com`, role: TENANT_VIEWER)

---

## 2. DEMO PROGRAM

Create one program under this tenant:

- Name: "Girişimcilik Hızlandırma Programı 2026"
- Type: "Startup Challenge"
- Description: a realistic 2-3 sentence description of an entrepreneurship acceleration program
- Application start/end dates: realistic dates relative to today
- Simulation start/end dates: realistic dates (program currently "in progress" — started ~6 weeks ago, ends in ~6 weeks)
- Participant limit: 100
- Selected simulations (max 4): Idea Development Simulation, Startup Management Simulation, Leadership Simulation, Investor Readiness Simulation
- Selected trainings: Finance Training, Sales & Marketing Training, Pitch Preparation Training, Business Model Training
- Selected AI tools: AI Mentor, AI Evaluation, AI Pitch Coach

---

## 3. TRAINING MODULE CONTENT (REAL CONTENT — NOT PLACEHOLDERS)

For each of the 4 selected trainings, create real structured content:

### Structure per training module:
- `title` (TR/EN/AZ)
- `description` (TR/EN/AZ) — 2-3 sentences
- 4-6 `lessons`, each with:
  - `title`
  - `content` — written as markdown, 200-400 words of real educational content on the topic (not Lorem Ipsum — actually write about the subject)
  - `video_url` — use a real, embeddable, freely-licensed YouTube video URL relevant to the topic (e.g., search for Creative-Commons or official educational channel content on startup finance, pitching, etc. — if uncertain about a specific URL, use a placeholder YouTube ID format `https://www.youtube.com/embed/VIDEO_ID` and add a comment noting it should be replaced with a real vetted link before production)
  - `estimated_minutes`

### Content topics to write (write real content for each):

**1. Finance Training ("Finans Eğitimi")**
- Lesson 1: Temel Finansal Kavramlar (Gelir, Gider, Kâr, Nakit Akışı)
- Lesson 2: Bütçe Planlama ve Yönetimi
- Lesson 3: Birim Ekonomisi (Unit Economics) — CAC, LTV, Burn Rate
- Lesson 4: Nakit Akışı Yönetimi ve Runway Hesaplama
- Lesson 5: Yatırımcılar İçin Finansal Projeksiyonlar

**2. Sales & Marketing Training ("Satış ve Pazarlama Eğitimi")**
- Lesson 1: Hedef Pazar ve Müşteri Segmentasyonu
- Lesson 2: Değer Önerisi (Value Proposition) Oluşturma
- Lesson 3: Dijital Pazarlama Kanalları ve Strateji
- Lesson 4: Satış Hunisi (Sales Funnel) Tasarımı
- Lesson 5: Müşteri Edinme ve Elde Tutma Stratejileri

**3. Pitch Preparation Training ("Pitch Hazırlama Eğitimi")**
- Lesson 1: Etkili Bir Pitch Sunumunun Anatomisi
- Lesson 2: Problem-Çözüm-Pazar Anlatısı Kurma
- Lesson 3: Slayt Tasarımı ve Görsel İletişim
- Lesson 4: Yatırımcı Sorularına Hazırlık (Q&A)
- Lesson 5: Sahne Performansı ve Beden Dili

**4. Business Model Training ("İş Modeli Eğitimi")**
- Lesson 1: Business Model Canvas'a Giriş
- Lesson 2: Gelir Modelleri ve Fiyatlandırma Stratejileri
- Lesson 3: Maliyet Yapısı ve Kaynak Planlaması
- Lesson 4: Ortaklıklar ve Dağıtım Kanalları
- Lesson 5: İş Modelini Doğrulama ve Pivot Stratejileri

Translate all `title` and `description` fields into EN and AZ. Lesson `content` can remain TR-only for this seed (note this as a known limitation — full lesson translation is a future task).

---

## 4. EXAM/QUIZ CONTENT (REAL QUESTIONS — NOT PLACEHOLDERS)

For each of the 4 trainings, create one exam with 8 real multiple-choice questions related to that training's lessons.

### Structure per exam:
- `training_id`
- `title`
- 8 `questions`, each with:
  - `question_text` (TR)
  - 4 `options` (A/B/C/D)
  - `correct_option`
  - `explanation` (1-2 sentences, shown after answering)

Write real, sensible questions testing actual understanding of the lesson content above (e.g., "CAC nedir ve nasıl hesaplanır?", "Bir pitch sunumunda yatırımcının ilk 30 saniyede görmek istediği şey nedir?", etc.) — not generic placeholder questions.

Passing threshold: 70%.

---

## 5. SIMULATION SCENARIO CONTENT (REAL CONTENT — NOT PLACEHOLDERS)

For each of the 4 simulations (Idea Development, Startup Management, Leadership, Investor Readiness), create realistic scenario-based tasks that participants complete to earn badges.

### Structure per simulation:
- `title`, `description` (TR/EN/AZ)
- 4-6 `tasks`/`stages`, each with:
  - `title`
  - `scenario_text` — a realistic 100-200 word scenario/prompt written in Turkish (e.g., for Idea Development: "Şirketiniz için bir problem tanımı yapın: hedef kullanıcı grubunuzun karşılaştığı 3 temel sorunu listeleyin ve her biri için neden bu sorunun çözülmeye değer olduğunu açıklayın.")
  - `submission_type` (text_response, file_upload, multiple_choice — pick what fits)
  - `linked_badge_key` — reference the matching badge from the badge seed (e.g., Idea Development Stage 1 → `problem_explorer` badge)
  - `coin_reward` — matches the badge's coin value

Use the existing badge categories and coin values from the master seed data (Section 11 of the master prompt: idea_development, startup_management, leadership, pitch_investor/investor_readiness — map "Investor Readiness Simulation" tasks to the `pitch_investor` badge category).

Write 4-6 real scenario tasks per simulation (16-24 total), each tied to one badge in that category, in ascending difficulty matching the badge tier (regular badges first, 👑 crown badge last as the capstone task).

---

## 6. 100 DEMO PARTICIPANTS

Generate 100 participant user records with:
- Realistic Turkish/Azerbaijani names (mix of both — this is a demo for a platform serving both markets)
- Email format: `firstname.lastname###@demo.com`
- `language` field: distribute realistically — 60% `tr`, 25% `az`, 15% `en`
- Registration dates: spread across the program's application window
- `last_login`: spread realistically (some very recent, some inactive for weeks — to test "active/inactive" status logic)

### Progress distribution (IMPORTANT — for realistic testing of reports/dashboards):

Distribute the 100 participants into these progress buckets so that report screens (General Report, Training Reports, Test/Exam Reports, Certificate Reports from the master prompt Section 10.3) show meaningful, varied data:

| Bucket | Count | Profile |
| --- | --- | --- |
| Champions | 10 | 100% simulation + training completion, all exams passed >85%, earned most badges including 👑 crown badges, earned all 3 certificate types |
| High performers | 25 | 70-95% completion, most exams passed, several badges earned, 1-2 certificates |
| Mid-progress | 35 | 30-65% completion, mixed exam results (some passed, some failed/needs improvement), a handful of badges, 0-1 certificates |
| Just started | 20 | 5-25% completion, 0-2 exams attempted, 0-1 badges (likely just the Welcome Badge), 0 certificates |
| Inactive/At-risk | 10 | Registered but <10% completion, no exam attempts, `last_login` > 21 days ago, 0 badges beyond Welcome Badge — these should appear as 🔴 Inactive in status fields |

For each participant, generate corresponding records in:
- `user_badges` (matching their bucket — Champions get the 👑 crown badges, others get partial sets)
- `coin_transactions` (sum should match total coins from earned badges)
- `certificates` (Champions: all 3 types; High performers: 1-2; others per table above)
- Exam attempt records (`exam_attempts` or equivalent) with scores matching the bucket profile
- Simulation task submissions with realistic short text responses (write 2-3 sentence sample responses for at least the Champions and High performers buckets — for Mid-progress and below, partial/incomplete submissions are fine)

---

## 7. VERIFICATION

After seeding, the following screens must show realistic, non-empty, varied data:

- Tenant Panel → Reports → General Report: 100 rows with varied completion %, badge counts, certificate status, active/inactive status
- Tenant Panel → Reports → Training Reports: varied completion rates and certificate counts
- Tenant Panel → Reports → Test & Exam Reports: mix of Passed / Needs Improvement / Failed results
- Tenant Panel → Reports → Certificate Reports: varied certificate counts (0 to 3 per participant)
- Tenant Panel → KPI dashboard: aggregate numbers (total participants = 100, completion %, badges awarded, certificates earned) should reflect the bucket distribution above and look like real numbers, not round/fake numbers
- Participant Panel (log in as a few sample participants from different buckets): dashboard shows correct progress, badges, coins, available lessons with real content, exams with real questions, simulation tasks with real scenario text

---

## 8. DELIVERABLES

1. A seed script (e.g., `prisma/seed-demo.ts` or equivalent) that can be run with a single command and is idempotent (running it twice should not create duplicates — either check for existing demo tenant and skip, or provide a `--reset` flag that clears demo data first)
2. All training/exam/simulation content as structured seed data (JSON or TS objects) — written content as specified in Sections 3-5
3. A short `DEMO_DATA.md` documenting: how to run the seed, the demo admin login credentials, the 5 progress buckets and how many participants are in each, and a note that lesson video URLs are placeholders pending real vetted links
4. Confirm no existing production/real tenant data is affected — this seed should only ever run against a demo/staging tenant, clearly namespaced (e.g., tenant slug `demo-teknopark`)

---

## NOTES

- Do not invent fake company names, badge categories, or coin values that conflict with the master badge list (Section 11 of CURSOR_MASTER_PROMPT_ALL_IN_ONE.md) — reuse those exact badges/categories/coin values.
- Keep all written educational content original (do not copy text from external websites/books).
- If any part of this seed reveals a missing field or table in the current schema (e.g., no `exam_attempts` table, no `lessons` table), add the necessary Prisma models/migrations first, then seed.
