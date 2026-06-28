# Demo Data Seeding Documentation

## Overview

This document explains how to run the demo data seed script for the entrepreneurship simulation platform. The demo data creates a complete, realistic tenant with 100 participants, training content, exams, and simulation scenarios for testing and demonstration purposes.

## Running the Seed Script

### Initial Seed

To populate the database with demo data for the first time:

```bash
npm run seed-demo
```

Or directly with ts-node:

```bash
npx ts-node prisma/seed-demo.ts
```

### Reset and Reseed

To clear existing demo data and reseed from scratch:

```bash
npx ts-node prisma/seed-demo.ts --reset
```

The `--reset` flag will:
- Delete all demo tenant data
- Delete all demo users
- Delete all training content, exams, and simulation tasks
- Recreate everything from scratch

## Demo Tenant Details

### Tenant Information

- **Name**: Demo Teknopark
- **ID**: `demo-teknopark` (fixed namespace — safe to reset without affecting other tenants)
- **Status**: ACTIVE
- **Seat Limit**: 100
- **Plan Type**: professional
- **Email**: admin@demo-teknopark.com
- **Website**: https://demo-teknopark.com

### Demo Users

#### Tenant Admin
- **Email**: admin@demo-teknopark.com
- **Password**: Demo123!
- **Role**: TENANT_ADMIN
- **Language**: tr

#### Tenant Viewer
- **Email**: viewer@demo-teknopark.com
- **Password**: Demo123!
- **Role**: TENANT_VIEWER
- **Language**: tr

#### Participants
- **Email Format**: firstname.lastname#@demo.com (e.g., ahmet.yilmaz0@demo.com)
- **Password**: Demo123!
- **Role**: PARTICIPANT
- **Languages**: 60% tr, 25% az, 15% en

## Demo Program

### Program Details

- **Name**: Girişimcilik Hızlandırma Programı 2026
- **Type**: Startup Challenge
- **Application Period**: 60 days ago to 30 days ago
- **Simulation Period**: Started 6 weeks ago, ends in 6 weeks
- **Participant Limit**: 100

### Selected Simulations

1. Idea Development Simulation
2. Startup Management Simulation
3. Leadership Simulation
4. Investor Readiness Simulation

### Selected Trainings

1. Finance Training (Finans Eğitimi)
2. Sales & Marketing Training (Satış ve Pazarlama Eğitimi)
3. Pitch Preparation Training (Pitch Hazırlama Eğitimi)
4. Business Model Training (İş Modeli Eğitimi)

### Selected AI Tools

1. AI Mentor
2. AI Evaluation
3. AI Pitch Coach

## Training Content

Each training includes 4-5 lessons with real educational content in Turkish (with English and Azerbaijani translations for titles/descriptions).

### Finance Training
- Lesson 1: Temel Finansal Kavramlar (Basic Financial Concepts)
- Lesson 2: Bütçe Planlama ve Yönetimi (Budget Planning and Management)
- Lesson 3: Birim Ekonomisi (Unit Economics)
- Lesson 4: Nakit Akışı Yönetimi ve Runway Hesaplama (Cash Flow Management and Runway Calculation)
- Lesson 5: Yatırımcılar İçin Finansal Projeksiyonlar (Financial Projections for Investors)

### Sales & Marketing Training
- Lesson 1: Hedef Pazar ve Müşteri Segmentasyonu (Target Market and Customer Segmentation)
- Lesson 2: Değer Önerisi Oluşturma (Creating Value Proposition)
- Lesson 3: Dijital Pazarlama Kanalları ve Strateji (Digital Marketing Channels and Strategy)
- Lesson 4: Satış Hunisi Tasarımı (Sales Funnel Design)
- Lesson 5: Müşteri Edinme ve Elde Tutma Stratejileri (Customer Acquisition and Retention Strategies)

### Pitch Preparation Training
- Lesson 1: Etkili Bir Pitch Sunumunun Anatomisi (Anatomy of an Effective Pitch Presentation)
- Lesson 2: Problem-Çözüm-Pazar Anlatısı Kurma (Building Problem-Solution-Market Narrative)
- Lesson 3: Slayt Tasarımı ve Görsel İletişim (Slide Design and Visual Communication)
- Lesson 4: Yatırımcı Sorularına Hazırlık (Preparing for Investor Questions)
- Lesson 5: Sahne Performansı ve Beden Dili (Stage Performance and Body Language)

### Business Model Training
- Lesson 1: Business Model Canvas'a Giriş (Introduction to Business Model Canvas)
- Lesson 2: Gelir Modelleri ve Fiyatlandırma Stratejileri (Revenue Models and Pricing Strategies)
- Lesson 3: Maliyet Yapısı ve Kaynak Planlaması (Cost Structure and Resource Planning)
- Lesson 4: Ortaklıklar ve Dağıtım Kanalları (Partnerships and Distribution Channels)
- Lesson 5: İş Modelini Doğrulama ve Pivot Stratejileri (Business Model Validation and Pivot Strategies)

**Note**: Lesson content is in Turkish only. Full lesson translation is a future task.

## Exam Content

Each training has an exam with 8 real multiple-choice questions related to the lesson content.

- **Passing Threshold**: 70%
- **Questions per Exam**: 8
- **Total Questions**: 32

Questions test actual understanding of the lesson topics (e.g., CAC calculation, LTV/CAC ratio, pricing strategies, etc.).

## Simulation Tasks

Each simulation has 4-6 scenario-based tasks tied to badges from the master badge list.

### Idea Development Simulation (6 tasks)
1. Problem Tanımı → problem_explorer badge (50 coins)
2. Fikir Oluşturma → idea_generator badge (75 coins)
3. Çözüm Tasarımı → solution_designer badge (100 coins)
4. Müşteri Analizi → customer_explorer badge (125 coins)
5. Pazar Araştırması → market_researcher badge (150 coins)
6. İnovasyon Stratejisi → innovation_architect badge (300 coins)

### Startup Management Simulation (6 tasks)
1. İş Modeli Canvas → business_model_designer badge (75 coins)
2. MVP Geliştirme Planı → mvp_developer badge (100 coins)
3. İlk Müşteri Kazanımı → first_customer_winner badge (125 coins)
4. Operasyonel Planlama → operations_expert badge (150 coins)
5. Stratejik Planlama → strategy_master badge (175 coins)
6. Startup Mimarlığı → startup_architect badge (350 coins)

### Leadership Simulation (6 tasks)
1. Takım Kuruluşu → team_founder badge (75 coins)
2. Görev Koordinasyonu → task_coordinator badge (100 coins)
3. Liderlik Tarzı → team_leader badge (125 coins)
4. Kriz Yönetimi → crisis_manager badge (150 coins)
5. Stratejik Liderlik → strategic_leader badge (200 coins)
6. İlham Veren Liderlik → inspiring_leader badge (400 coins)

### Investor Readiness Simulation (6 tasks)
1. Pitch Hazırlığı → pitch_preparer badge (75 coins)
2. Slayt Tasarımı → presentation_designer badge (100 coins)
3. Sahne Performansı → took_the_stage badge (125 coins)
4. Yatırımcı Sorularına Hazırlık → persuasion_expert badge (150 coins)
5. Yatırımcı İlişkileri → investor_favorite badge (200 coins)
6. Yatırıma Hazır Girişimci → investment_ready_entrepreneur badge (400 coins)

**Total Simulation Tasks**: 24

## Participant Progress Distribution

The 100 demo participants are distributed across 5 progress buckets to create realistic, varied data for testing reports and dashboards.

### Champions (10 participants)
- **Completion**: 100% simulation + training completion
- **Exams**: All passed with scores >85%
- **Badges**: All badges including 👑 crown badges
- **Certificates**: All 3 types (participation, achievement, completion)
- **Last Login**: Very recent (0-3 days ago)
- **Status**: 🟢 Active

### High Performers (25 participants)
- **Completion**: 70-95% completion
- **Exams**: Most passed, scores 70-95%
- **Badges**: Most badges, some crown badges
- **Certificates**: 1-2 certificates
- **Last Login**: Recent (0-7 days ago)
- **Status**: 🟢 Active

### Mid-Progress (35 participants)
- **Completion**: 30-65% completion
- **Exams**: Mixed results (some passed, some failed/needs improvement)
- **Badges**: Handful of badges
- **Certificates**: 0-1 certificates
- **Last Login**: Moderate activity (0-14 days ago)
- **Status**: 🟢 Active

### Just Started (20 participants)
- **Completion**: 5-25% completion
- **Exams**: 0-2 exams attempted
- **Badges**: 0-1 badges (likely just Welcome Badge)
- **Certificates**: 0 certificates
- **Last Login**: Recent (0-10 days ago)
- **Status**: 🟢 Active

### Inactive/At-Risk (10 participants)
- **Completion**: <10% completion
- **Exams**: No exam attempts
- **Badges**: Only Welcome Badge
- **Certificates**: 0 certificates
- **Last Login**: >21 days ago (21-51 days ago)
- **Status**: 🔴 Inactive

## Verification

After seeding, verify the following screens show realistic, non-empty data:

### Tenant Panel Reports
- **General Report**: 100 rows with varied completion %, badge counts, certificate status, active/inactive status
- **Training Reports**: Varied completion rates and certificate counts
- **Test & Exam Reports**: Mix of Passed / Needs Improvement / Failed results
- **Certificate Reports**: Varied certificate counts (0 to 3 per participant)
- **KPI Dashboard**: Aggregate numbers reflecting the bucket distribution above

### Participant Panel
Log in as sample participants from different buckets to verify:
- Dashboard shows correct progress, badges, coins
- Available lessons with real content
- Exams with real questions
- Simulation tasks with real scenario text

## Important Notes

### Video URLs
Lesson video URLs are placeholders using the format `https://www.youtube.com/embed/dQw4w9WgXcQ`. These should be replaced with real, vetted educational video links before production deployment.

### Data Isolation
This seed script only affects the demo tenant named "Demo Teknopark". It does not modify any existing production or real tenant data. The demo tenant is clearly namespaced for safe testing.

### Idempotency
Running the seed script without the `--reset` flag will check for existing demo tenant and skip if found. Use `--reset` to clear and reseed.

### Badge Categories
The seed uses the exact badge categories and coin values from the master seed data (Section 11 of CURSOR_MASTER_PROMPT_ALL_IN_ONE.md). No fake company names, badge categories, or coin values are invented.

## Troubleshooting

### "Demo tenant already exists" Error
If you see this error, use the `--reset` flag to clear existing demo data:
```bash
npx ts-node prisma/seed-demo.ts --reset
```

### Database Connection Errors
Ensure your `.env` file has the correct `DATABASE_URL` configured and the database is accessible.

### Prisma Client Errors
If you encounter Prisma Client errors, regenerate the client:
```bash
npx prisma generate
```

## Summary

The demo data seed creates a comprehensive, realistic testing environment with:
- 1 demo tenant with 2 admin users
- 1 demo program with 4 simulations, 4 trainings, and 3 AI tools
- 4 trainings with 20 lessons (real educational content)
- 4 exams with 32 questions (real questions)
- 4 simulations with 24 tasks (real scenarios)
- 100 participants with varied progress states across 5 buckets
- Badges, certificates, exam attempts, and coin transactions matching the progress distribution

This data enables thorough testing of all platform features, reports, and user flows before deploying to production with real clients.
