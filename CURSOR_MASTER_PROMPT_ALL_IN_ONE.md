# ENTREPRENEURSHIP SIMULATION PLATFORM — COMPREHENSIVE DEVELOPMENT PROMPT (ALL-IN-ONE)

This document is the master prompt for building this project from the ground up (or restructuring the existing codebase) inside Cursor (AI-assisted code editor). It contains the full architecture/design specification AND the complete reference content (badge lists, report structures) inline — no external files needed. Read every section carefully and implement it step by step, module by module. After completing each module, test it before moving to the next.

---

## 1. PROJECT OVERVIEW

This platform is a simulation-based learning and assessment platform designed to digitally manage entrepreneurship, innovation, leadership, and investment-readiness processes. It combines educational content, simulation scenarios, AI-powered support tools, gamification mechanics (coins, badges, certificates), and comprehensive reporting modules into a single system.

The platform will be sold under a B2B SaaS model to technoparks, universities, incubation centers, accelerator programs, government institutions, and private-sector innovation programs, **licensed based on the number of seats (participants)**.

---

## 2. THREE-TIER PANEL ARCHITECTURE (ROLE-BASED)

The system has 3 main roles and panels. Each role can only access data within its own scope (RBAC – Role Based Access Control).

### 2.1. SUPER ADMIN PANEL (Platform Owner — Us)
This panel belongs to the company that owns the platform. It manages all tenant organizations.

Features:
- **Tenant Management**: Create, activate/deactivate, and delete organization (technopark) accounts
- **License & Billing Management**: Track each tenant's purchased seat count, package type (e.g., 50 / 100 / 250-seat packages), payment status, and invoice history
- **Dynamic Pricing**: Define price per seat, package discounts, and promotional codes
- **Global Platform Statistics**: Total number of tenants, total active users, total revenue, growth charts (monthly/yearly)
- **Tenant-Level Usage Reports**: High-level summary of each tenant's participant activity
- **Global Content Management**: Centrally manage simulation modules, training content, AI prompt templates, and badge/coin definitions — updates automatically propagate to all tenants
- **Support Ticket Management**: View and respond to support requests from tenants
- **System Health**: Server status, error logs, usage limits (top-level monitoring integration)
- **Audit Log**: Track who performed which action, when, and in which tenant (security auditing)

### 2.2. TENANT PANEL (Technopark / University / Incubation Center Administrator)
This panel belongs to the administrator of the organization that purchased the platform.

Features:
- **Onboarding / Purchase Flow**: When a tenant first registers, they select a package (e.g., "50-seat package") and complete payment (credit card / bank transfer / invoice)
- **Seat Management**: Display total purchased seats, used seats, and remaining seats. When the limit is reached, an "Upgrade Seats" button allows purchasing additional capacity, increasing the participant count
- **Program Creation**: Program name, description, project type, date ranges, participant limit
- **Simulation & Training Module Selection**: Up to 4 simulations + multiple trainings + AI tool selection
- **Application Link Generation & Sharing**: Automatic link generation, email/social media sharing
- **Participant Management**: View applicants, active/inactive status, Excel export
- **Reporting**: General Report, Training Reports, Test/Exam Reports, Certificate Reports
- **User & Permission Management**: Define "Admin" and "Viewer" roles within the organization
- **Certificate Settings**: Customize organization logo, authorized signature, certificate template
- **Notification Settings**: Email notifications, reminders
- **Billing & Payment History**: Tenant's own payment records

### 2.3. PARTICIPANT / STARTUP PANEL (Student, Entrepreneur)
This panel belongs to the participant (student/entrepreneur) enrolled in a program.

Features:
- **Personal Dashboard**: Progress overview, summary of earned coins/badges/certificates, upcoming tasks
- **Simulation Modules**:
  - Idea Development Simulation
  - Startup Management Simulation
  - Leadership Simulation
  - Investor Readiness Simulation
  - Sub-modules / tracks: Finance, Sales & Marketing, Pitch & Investor, Founder Psychology, Globalization (see full badge list in Section 11)
- **Training Modules**: View assigned trainings, complete them, take tests/exams
- **AI Support Tools**: AI Mentor, AI Jury, AI Evaluation, AI Analysis, AI Pitch Coach, AI Finance Advisor — chat/recommendation interface
- **Gamification**: Coin balance, earned/earnable badges (full list in Section 11 — displayed with emoji + name + coin value), leaderboard
- **My Certificates**: View/download earned certificates (PDF)
- **Profile & Settings**: Personal information, password change, language selection, notification preferences

---

## 3. USER FLOW SUMMARY (CRITICAL — BUSINESS MODEL)

1. The Super Admin (us) creates a new tenant account, or the tenant self-registers and selects a package.
2. The tenant administrator purchases, for example, a "50-seat package" → payment is processed → the tenant account is activated with 50 seats.
3. The tenant administrator creates a program, generates an application link, and sends it to students/entrepreneurs via email.
4. Participants click the link and register (each registration consumes 1 seat).
5. When all 50 seats are used, the system automatically rejects new applications and notifies the tenant administrator: "Your seat limit has been reached. Would you like to upgrade?" with a "Buy More Seats" CTA.
6. The tenant makes an additional payment to increase the seat count (e.g., 50 → 100), and the system updates it automatically.
7. These transactions and revenue are visible to the Super Admin in real time.

**This flow requires payment integration (Stripe or iyzico — iyzico/Payriff recommended for the Turkey/Azerbaijan market) to be directly linked to the seat-counter logic via webhooks.**

---

## 4. DESIGN GUIDELINES (CRITICAL)

### 4.1. Overall Design Language — "Apple Feel"
- Clean, light backgrounds (white / very light gray, e.g., #F5F6FA) with soft shadows, large border-radius (16-24px), and generous whitespace
- Typography: Inter, SF Pro-style, or modern sans-serif fonts such as Satoshi/Geist — clear hierarchy between headings, subheadings, and body text
- Color palette: Neutral background + one primary brand color (e.g., indigo/blue or green) + an accent color (gold/yellow tones for coins/badges)
- **Glassmorphism** elements: Cards with subtle blur + transparency effects (especially in modals and top bars)
- **Subtle 3D / Depth effects**: Cards lift smoothly on hover (translateY + growing shadow), buttons have micro-interactions (slight scale-down on press), badge icons rendered in a 3D/isometric illustration style (not flat)
- Animations: Page transitions and animated counters (e.g., coin increases) and smooth progress-bar fills using Framer Motion
- Dark mode support is required — auto-detect system preference + manual toggle
- **Eye comfort**: Avoid pure black/white high contrast; use tonal transitions (off-white / soft dark); use light gray separators between rows in long reports

### 4.2. Reference Designs
The following two Figma templates should be used as visual/component-structure inspiration (for layout and component patterns only — to be rebuilt with our own branding, without copying any IP/branding):
- https://www.figma.com/community/file/1048559673287861086/dashboard
- https://www.figma.com/community/file/1098131983383434513/horizon-ui-trendiest-open-source-admin-template-dashboard

Elements to draw from these templates: sidebar + topbar layout, card-based stat widgets, chart styles (Horizon UI's gradient cards and soft chart colors), table designs.

### 4.3. Responsive Design (MANDATORY)
Separate optimized layouts for three screen sizes:
- **Desktop (≥1280px)**: Fixed, collapsible left sidebar + top bar + main content grid (3-4 column card layout)
- **Tablet (768-1279px)**: Sidebar automatically collapses to icon-only or becomes an overlay menu; card grid drops to 2 columns
- **Mobile (≤767px)**: Sidebar fully hidden, replaced by a bottom navigation bar (Apple-style tab bar); cards in single column; tables either scroll horizontally or convert to stacked card views

All components must be built using Tailwind CSS breakpoints (`sm`, `md`, `lg`, `xl`). Test at 375px (iPhone SE), 768px (iPad), 1440px (laptop), and 1920px (desktop) to ensure flawless rendering.

### 4.4. Accessibility
- Comply with WCAG AA contrast ratios
- Visible focus state on all interactive elements
- Full keyboard navigation support

---

## 5. MULTI-LANGUAGE SUPPORT (i18n) — CRITICAL

The system will initially support **3 languages**:
- 🇹🇷 Turkish (default)
- 🇬🇧 English
- 🇦🇿 Azerbaijani (Latin script)

Requirements:
- Use `next-intl` or `react-i18next` (next-intl recommended for Next.js)
- No hardcoded text — all UI strings stored as key-value pairs in `/locales/tr.json`, `/locales/en.json`, `/locales/az.json`
- Store the user's language preference in the database (`language` field on the user record); the UI loads in that language automatically on login
- No RTL support needed — all three languages are left-to-right — but date formats (day/month/year) and currency (₼ AZN, ₺ TRY, € EUR/USD) must be locale-aware
- Content data such as badge names, simulation names, and training module names must also be multilingual (use `name_tr`, `name_en`, `name_az` columns, or a separate `translations` table)
- A language switcher (flag icon dropdown) should appear in the top bar of every page and switch languages instantly client-side, without a page reload

---

## 6. TECHNICAL ARCHITECTURE RECOMMENDATION

### 6.1. Frontend
- **Framework**: Next.js 14+ (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui component library (clean, customizable, well-suited to the Apple-style design)
- **Animation**: Framer Motion
- **Charts**: Recharts or Tremor (for dashboard chart widgets)
- **State Management**: Zustand or React Query (TanStack Query required for server state)
- **Forms**: React Hook Form + Zod (validation)
- **i18n**: next-intl

### 6.2. Backend
- **API**: Next.js API Routes, or a separate NestJS/Express service depending on scaling needs (Next.js API routes + Prisma are sufficient initially; can be split into microservices later)
- **Database**: PostgreSQL (ideal for multi-tenant architecture — tenant isolation via Row Level Security)
- **ORM**: Prisma
- **Authentication**: NextAuth.js or Clerk/Auth0 (role-based access — Super Admin / Tenant Admin / Participant roles stored in JWT)
- **File Storage**: AWS S3 (certificate PDFs, organization logos, profile images)
- **PDF Generation**: `react-pdf` or `puppeteer` for HTML-to-PDF certificate generation
- **Email**: Resend or AWS SES (application notifications, reminders)
- **Payments**: Stripe (international) + Payriff/iyzico (for local cards in Azerbaijan/Turkey) — seat purchase and upgrade flows must update the seat counter automatically via webhooks
- **AI Integration**: Anthropic Claude API (for AI Mentor, AI Jury, AI Evaluation, AI Pitch Coach, AI Finance Advisor modules) — each AI tool should have its own system prompt

### 6.3. Multi-Tenant Architecture
- **Single database, tenant isolation via a `tenant_id` column** (cost-effective for initial stage) — every table includes a `tenant_id` foreign key
- Enforce PostgreSQL Row Level Security (RLS) policies so each tenant can only access its own data
- The Super Admin role uses a special policy that bypasses RLS to access all tenants

### 6.4. Hosting / Infrastructure
- **Hosting**: AWS (Amplify or ECS/Fargate + RDS PostgreSQL), region: `eu-north-1` (Stockholm) — suitable for low latency across Europe, Turkey, and Azerbaijan
- **CDN**: CloudFront
- **CI/CD**: GitHub Actions → AWS deployment
- **Monitoring**: AWS CloudWatch + Sentry (error tracking)

---

## 7. SECURITY REQUIREMENTS (MANDATORY)

1. **Authentication & Authorization**
   - JWT-based session management with refresh-token rotation
   - Role-Based Access Control (RBAC): Super Admin / Tenant Admin / Tenant Viewer / Participant
   - Every API endpoint enforces role checks via middleware

2. **Data Isolation**
   - Prevent cross-tenant data leakage: every query filtered by `tenant_id`, with PostgreSQL RLS as a second layer of defense

3. **Password & Account Security**
   - Passwords hashed with bcrypt/argon2
   - Two-Factor Authentication (2FA) — mandatory for Super Admin and Tenant Admin roles
   - Account lockout after 5 failed login attempts

4. **API Security**
   - Rate limiting (especially on login and application-form endpoints)
   - Strict CORS policies
   - Input validation via Zod — protection against SQL injection and XSS
   - HTTPS enforced (HSTS header)

5. **Payment Security**
   - Card data never stored in our own database — use Stripe/Payriff tokenization
   - PCI-DSS compliance handled via the payment provider

6. **Logging & Auditing**
   - All critical actions (tenant creation, seat changes, payments, role changes) recorded in an audit log table
   - GDPR/KVKK compliance: support for user data deletion requests ("right to be forgotten")

7. **Backups**
   - Daily automated PostgreSQL backups with point-in-time recovery

---

## 8. DATABASE SCHEMA (DRAFT — CORE TABLES)

```
tenants (id, name, logo_url, status, seat_limit, seats_used, plan_type, created_at)
users (id, tenant_id [nullable for super admin], email, password_hash, role, language, created_at)
programs (id, tenant_id, name, description, type, start_date, end_date, participant_limit, created_at)
program_simulations (program_id, simulation_type)  -- max 4 per program
program_trainings (program_id, training_type)
participants (id, program_id, user_id, status, registration_date, last_login)
simulations (id, key, name_tr, name_en, name_az, category)
badges (id, key, name_tr, name_en, name_az, icon, coin_value, category, tier)
user_badges (user_id, badge_id, earned_at)
certificates (id, user_id, type, issued_at, pdf_url)
coin_transactions (id, user_id, amount, reason, created_at)
payments (id, tenant_id, amount, currency, seat_count, status, provider, created_at)
audit_logs (id, user_id, tenant_id, action, details, created_at)
```

---

## 9. IMPLEMENTATION PRIORITY ORDER (Follow this sequence in Cursor)

1. Project scaffold: Next.js + TypeScript + Tailwind + shadcn/ui setup, folder structure, i18n infrastructure (3 languages)
2. Auth system + role-based routing (separate layouts for the 3 panels: `/super-admin`, `/tenant`, `/participant`)
3. Database schema (Prisma) + multi-tenant RLS setup
4. Super Admin Panel: Tenant management, license/billing screens, global statistics dashboard
5. Tenant Panel: Onboarding/package purchase flow (payment integration), program creation, application link, participant list, reporting screens (use exact table structures from Section 10 below)
6. Participant Panel: Dashboard, simulation modules, training modules, badge/coin system (use exact badge list from Section 11 below), certificates
7. AI support tools integration (Claude API)
8. Notification system (email)
9. Responsive fine-tuning + dark mode + animations (Framer Motion)
10. Security hardening (rate limiting, 2FA, audit log) + testing + deployment (AWS)

---

## 10. REFERENCE CONTENT — PLATFORM SPECIFICATION (FULL DETAIL)

This section contains the exact, complete specification content from the original project documentation. Use this as the source of truth for screen layouts, form fields, and table structures in the Tenant Panel.

### 10.1. Program Creation Screen

**Program Information**

➕ New Program / Create Program

| Field | Description |
| --- | --- |
| Program Name | Entered manually. |
| Program Description | Describes the purpose and scope of the program. |
| Project Type | Selected from a dropdown list. |
| Application Start Date | Date applications open. |
| Application End Date | Date applications close. |
| Participant Limit | Once this limit is reached, the system stops accepting new applications. |

**Project Types**
- Entrepreneurship Training
- Business Idea Development Program
- Startup Challenge
- Hackathon
- Competition
- Innovation Program
- Other

**Gamification & Program Calendar**

| Field | Description |
| --- | --- |
| Simulation Start Date | Date the program begins |
| Simulation End Date | Date the program ends |

**Simulation Modules** — Up to 4 simulations may be selected per program:
- ☐ Idea Development Simulation
- ☐ Startup Management Simulation
- ☐ Leadership Simulation
- ☐ Investor Readiness Simulation

**Training Modules** — Multiple trainings may be selected:
- ☐ Finance Training
- ☐ Sales & Marketing Training
- ☐ Team Management Training
- ☐ Pitch Preparation Training
- ☐ Leadership Training
- ☐ Innovation Tools Training
- ☐ Business Model Training
- ☐ Customer Validation Training
- ☐ AI Tools Training

**AI Support Tools** — Multiple AI tools may be selected:
- ☐ AI Mentor
- ☐ AI Jury
- ☐ AI Evaluation
- ☐ AI Analysis
- ☐ AI Reporting
- ☐ AI Pitch Coach
- ☐ AI Finance Advisor

**Application Link Generation**

After entering program information, the system automatically generates an application link:
- 🔗 Generate Link
- 📋 Copy Link
- 📧 Share via Email
- 📱 Share on Social Media

Organizations use this link to invite participants to the program.

### 10.2. Applications Screen

**Program List — Sample Report Format**

| Program Name | Type | Participants | Active | Inactive | Start | End | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Startup Challenge 2027 | Startup Challenge | 150 | 120 | 30 | 01.01.2027 | 01.04.2027 | 👁️ ✏️ 📥 |
| Hackathon 2027 | Hackathon | 80 | 75 | 5 | 15.02.2027 | 20.02.2027 | 👁️ ✏️ 📥 |
| Entrepreneurship Training | Training | 250 | 190 | 60 | 01.03.2027 | 01.06.2027 | 👁️ ✏️ 📥 |

**Action Icons**
- 👁️ View Program
- ✏️ Edit Program
- 📥 Export to Excel

**Program Participant List**

| Full Name | Email | Phone | Registration Date | Last Login Date | Status |
| --- | --- | --- | --- | --- | --- |
| Ahmet Yılmaz | ahmet@email.com | +90 xxx xxx xx xx | 01.06.2027 | 10.06.2027 | 🟢 Active |
| Ayşe Kaya | ayse@email.com | +90 xxx xxx xx xx | 05.06.2027 | 28.05.2027 | 🟡 Active |
| Mehmet Demir | mehmet@email.com | +90 xxx xxx xx xx | 01.05.2027 | 01.04.2027 | 🔴 Inactive |

📤 Export to Excel

Program administrators can update the program name and dates.

### 10.3. Reports Screen

Organizations first select the program they want to view a report for.

**Program Selection**: 🔽 Select Program

**General KPI Indicators**

| Total Participants | Simulation Completion | Training Completion | Average Test Score | Badges Awarded | Certificates Earned |
| --- | --- | --- | --- | --- | --- |
| 150 | 72% | 68% | 82 / 100 | 425 | 78 |

**Report Types**
- 📈 General Report
- 🎓 Training Reports
- 📝 Test & Exam Reports
- 📜 Certificate Reports
- 📤 Export to Excel
- 📄 Export to PDF
- 🔍 Filter

When a report type is selected, the corresponding table is displayed.

**General Report**

| Full Name | Email | Phone | Simulation Completion (%) | Training Completion (%) | Badges Earned | Simulation Completion Certificate Status | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ahmet Yılmaz | ahmet@email.com | +90 xxx xxx xx xx | 100% | 85% | 12 | ✅ Earned | 🟢 Active |
| Ayşe Kaya | ayse@email.com | +90 xxx xxx xx xx | 75% | 60% | 8 | ❌ Not Earned | 🟢 Active |
| Mehmet Demir | mehmet@email.com | +90 xxx xxx xx xx | 20% | 10% | 2 | ❌ Not Earned | 🔴 Inactive |

**Training Reports**

| Full Name | Email | Assigned Trainings | Completed Trainings | Completion Rate | Trainings Taken | Certificate Status | Total Certificates Earned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ahmet Yılmaz | ahmet@email.com | 8 | 8 | 100% | Finance, Sales, Leadership, Business Model | ✅ Earned | — |
| Ayşe Kaya | ayse@email.com | 8 | 5 | 63% | Finance, Sales, Pitch, AI Tools | ❌ Not Earned | 1 |
| Mehmet Demir | mehmet@email.com | 8 | 1 | 13% | Finance | ❌ Not Earned | 2 |

**Test & Exam Reports**

| Full Name | Email | Training Module | Number of Exams | Completed Exams | Average Score | Highest Score | Result | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ahmet Yılmaz | ahmet@email.com | Finance, Sales, Leadership | 8 | 8 | 89 | 96 | ✅ Passed | 🟢 Active |
| Ayşe Kaya | ayse@email.com | Finance, Business Model | 8 | 6 | 72 | 85 | ⚠️ Needs Improvement | 🟢 Active |
| Mehmet Demir | mehmet@email.com | Finance | 8 | 2 | 48 | 55 | ❌ Failed | 🔴 Inactive |

**Certificate Report (Per User)**

| Full Name | Email | Certificates Earned | Total Certificates | Last Certificate Date | Actions |
| --- | --- | --- | --- | --- | --- |
| Ahmet Yılmaz | ahmet@email.com | 📜 Participation Certificate, 🏆 Achievement Certificate, 🎓 Program Completion Certificate | 3 | 15.06.2027 | 👁️ |
| Ayşe Kaya | ayse@email.com | 📜 Participation Certificate | 1 | 20.06.2027 | 👁️ |
| Mehmet Demir | mehmet@email.com | ❌ No Certificate | 0 | - | 👁️ |

> NOTE: The sample rows above (Ahmet Yılmaz, Ayşe Kaya, Mehmet Demir, etc.) are illustrative only — do NOT seed these as real data. Use them only for UI mockups/testing.

### 10.4. Settings Screen

**Organization Information**

| Field |
| --- |
| Organization Name |
| Organization Logo |
| Website |
| Authorized Contact Person |
| Phone |
| Email |
| Address |

💾 Save

**User Management**

➕ Add User / ➖ Remove User

| Full Name | Email | Permission | Status / Actions |
| --- | --- | --- | --- |

**Permission Types**

**Admin (Yönetici)**
- Can create programs.
- Can edit programs.
- Can view participants.
- Can view reports.
- Can download reports.
- Can manage system settings.

**Viewer (İzleyici)**
- Can view programs.
- Can view participants.
- Can view reports.
- Can download reports.
- Cannot make changes to the system.

**Certificate Settings**

Organization Certificate Definitions:
- Organization Logo
- Authorized Signature
- Certificate Template

Certificate Types:
- ☑ Participation Certificate
- ☑ Achievement Certificate
- ☑ Program Completion Certificate

👁️ Preview  /  💾 Save

**Notification Settings**
- ☑ Send Invitation Email
- ☑ Program Start Reminder
- ☑ Program End Reminder
- ☑ Send Certificate Notification
- ☑ Weekly Progress Notification

💾 Save

**Security Settings**
- Change Password
- Two-Factor Authentication
- Session Timeout

💾 Save

### 10.5. Core Simulation Modules (4 Main Tracks)

1. Idea Development Simulation
2. Startup Management Simulation
3. Leadership Simulation
4. Investor Readiness Simulation

Each simulation consists of independent sub-modules and can be selected during program creation.

> NOTE: Section 11 below lists additional simulation categories (Finance, Sales & Marketing, Pitch & Investor, Founder Psychology, Globalization) with their own badge sets. These appear to function as sub-tracks/modules within or alongside the 4 core simulations — reconcile this during data modeling (likely: the 4 core simulations are the top-level selectable modules in Program Creation, while all 8 badge categories in Section 11 represent the full set of activity tracks a participant can progress through across those simulations).

### 10.6. Training Modules (Full List)
- Finance Training
- Sales & Marketing Training
- Team Management Training
- Pitch Preparation Training
- Leadership Training
- Innovation Tools Training
- Business Model Training
- Customer Validation Training
- AI Tools Training

### 10.7. AI Support Tools (Full List)
- AI Mentor
- AI Jury
- AI Evaluation
- AI Analysis
- AI Reporting
- AI Pitch Coach
- AI Finance Advisor

These tools are used to strengthen the participant experience and provide personalized feedback.

### 10.8. Gamification System Components
- Coin System
- Badge System (full list in Section 11)
- Certificates
- Achievement Levels
- Leaderboards

Participants earn coins and badges as they complete trainings, simulations, and tests.

---

## 11. REFERENCE CONTENT — FULL BADGE LIST (SEED DATA)

This section contains the **complete, exact badge list** with coin values. Seed the `badges` table with this data exactly as written, then translate each `name` into EN and AZ for the `name_tr` / `name_en` / `name_az` columns.

### 11.1. Idea Development Simulation (`category = idea_development`)

| Badge (TR original) | Coin Value |
| --- | --- |
| Hoş geldin Rozeti (Welcome Badge) | 100 |
| 🔍 Problem Kaşifi (Problem Explorer) | 50 |
| 💡 Fikir Üreticisi (Idea Generator) | 75 |
| 🛠 Çözüm Tasarımcısı (Solution Designer) | 100 |
| 🎯 Müşteri Kaşifi (Customer Explorer) | 125 |
| 📊 Pazar Araştırmacısı (Market Researcher) | 150 |
| 👑 İnovasyon Mimarı (Innovation Architect) | 300 |

> The "Welcome Badge" is awarded automatically on first login/registration, regardless of which simulation the participant is enrolled in — implement as a global onboarding trigger, not tied solely to this category.

### 11.2. Startup Management Simulation (`category = startup_management`)

| Badge (TR original) | Coin Value |
| --- | --- |
| 📋 İş Modeli Tasarımcısı (Business Model Designer) | 75 |
| 🛠 MVP Geliştiricisi (MVP Developer) | 100 |
| 🤝 İlk Müşteri Kazanan (First Customer Winner) | 125 |
| ⚙️ Operasyon Uzmanı (Operations Expert) | 150 |
| ♟️ Strateji Ustası (Strategy Master) | 175 |
| 👑 Startup Mimarı (Startup Architect) | 350 |

### 11.3. Finance Simulation (`category = finance`)

| Badge (TR original) | Coin Value |
| --- | --- |
| 💵 Bütçe Planlayıcısı (Budget Planner) | 50 |
| 📈 Gelir Uzmanı (Revenue Expert) | 100 |
| 💸 Nakit Akışı Yöneticisi (Cash Flow Manager) | 125 |
| 💰 Karlılık Uzmanı (Profitability Expert) | 150 |
| 📊 Finans Stratejisti (Finance Strategist) | 175 |
| 👑 Finans Ustası (Finance Master) | 350 |

### 11.4. Sales & Marketing Simulation (`category = sales_marketing`)

| Badge (TR original) | Coin Value |
| --- | --- |
| 🎯 Hedef Kitle Avcısı (Target Audience Hunter) | 50 |
| 📢 Kampanya Tasarımcısı (Campaign Designer) | 100 |
| 🤝 İlk Satış Rozeti (First Sale Badge) | 125 |
| 👥 Müşteri Kazanım Uzmanı (Customer Acquisition Expert) | 150 |
| 📈 Büyüme Uzmanı (Growth Expert) | 175 |
| 👑 Pazarlama Ustası (Marketing Master) | 350 |

### 11.5. Pitch & Investor Simulation (`category = pitch_investor`)

| Badge (TR original) | Coin Value |
| --- | --- |
| 📑 Pitch Hazırlayıcısı (Pitch Preparer) | 75 |
| 🎨 Sunum Tasarımcısı (Presentation Designer) | 100 |
| 🎤 Sahneye Çıktı (Took the Stage) | 125 |
| 💬 İkna Uzmanı (Persuasion Expert) | 150 |
| ⭐ Yatırımcı Favorisi (Investor Favorite) | 200 |
| 👑 Yatırıma Hazır Girişimci (Investment-Ready Entrepreneur) | 400 |

### 11.6. Leadership Simulation (`category = leadership`)

| Badge (TR original) | Coin Value |
| --- | --- |
| 👤 Takım Kurucusu (Team Founder) | 75 |
| 📌 Görev Koordinatörü (Task Coordinator) | 100 |
| 👥 Takım Lideri (Team Leader) | 125 |
| 🛡 Kriz Yöneticisi (Crisis Manager) | 150 |
| ♟️ Stratejik Lider (Strategic Leader) | 200 |
| 👑 İlham Veren Lider (Inspiring Leader) | 400 |

### 11.7. Founder Psychology Simulation (`category = founder_psychology`)

| Badge (TR original) | Coin Value |
| --- | --- |
| 🧠 Öz Farkındalık Kâşifi (Self-Awareness Explorer) | 50 |
| 💪 Dayanıklılık Geliştiricisi (Resilience Builder) | 100 |
| 🔄 Değişim Yolcusu (Change Traveler) | 125 |
| ⚖️ Karar Verici (Decision Maker) | 150 |
| 🔥 Güçlü Kurucu (Strong Founder) | 200 |
| 👑 Zihinsel Dayanıklılık Ustası (Mental Resilience Master) | 400 |

### 11.8. Globalization Simulation (`category = globalization`)

| Badge (TR original) | Coin Value |
| --- | --- |
| 🗺️ Pazar Kaşifi (Market Explorer) | 75 |
| 🚢 İhracat Başlatıcısı (Export Initiator) | 100 |
| 🌎 Global Müşteri Avcısı (Global Customer Hunter) | 150 |
| 📈 Uluslararası Büyüme Uzmanı (International Growth Expert) | 200 |
| 🌐 Küresel Stratejist (Global Strategist) | 250 |
| 👑 Küresel Girişimci (Global Entrepreneur) | 500 |

### 11.9. Special Achievement Badges (`category = special_achievement`)

These are cross-cutting badges, not tied to a single simulation category.

| Badge (TR original) | Coin Value |
| --- | --- |
| 🥇 İlk 10 Şampiyonu (Top 10 Champion) | 500 |
| ⚡ En Hızlı Tamamlayan (Fastest Finisher) | 500 |
| 💎 Coin Milyoneri (Coin Millionaire) | 1000 |
| 🏆 Jüri Şampiyonu (Jury Champion) | 750 |
| 🌟 Mentor Favorisi (Mentor's Favorite) | 500 |
| 🚀 İnovasyon Yıldızı (Innovation Star) | 750 |
| 💰 Yatırımcıların Seçimi (Investors' Choice) | 1000 |
| 🎓 Yaşam Boyu Öğrenen (Lifelong Learner) | 500 |
| 🎓 Uzmanlık Yolcusu (Expertise Traveler) | 300 |
| 🌱 Gelişim Yolcusu (Growth Traveler) | 250 |
| 🤝 Topluluk Elçisi (Community Ambassador) | 250 |
| 🧠 Mentorun Favorisi (Mentor's Pick) | 500 |

> NOTE: "🌟 Mentor Favorisi" and "🧠 Mentorun Favorisi" both translate to nearly identical English meanings ("Mentor's Favorite" / "Mentor's Pick") — these appear to be two distinct badges in the original source. Keep them as two separate badge records with distinct `key` values (e.g., `mentor_favorite_1`, `mentor_favorite_2`), but flag this to the product owner to confirm whether one is a duplicate/typo or whether they are intentionally distinct (e.g., different tiers or different criteria).

### 11.10. Badge Data Model Requirements
Each badge record needs:
- `key` (unique slug)
- `name_tr`, `name_en`, `name_az`
- `icon` (emoji for MVP; replace with custom 3D/isometric illustration assets in later phase per Section 4.1 design guidelines)
- `coin_value`
- `category` (one of: `idea_development`, `startup_management`, `finance`, `sales_marketing`, `pitch_investor`, `leadership`, `founder_psychology`, `globalization`, `special_achievement`)
- `tier` (e.g., `regular` vs `crown` — the 👑 badges are the top-tier "mastery" badge for each category)

---

## 12. ADDITIONAL NOTES

- "Permission Types" (Admin/Viewer) should be implemented as sub-role management within the Tenant Panel.
- All labels, table headers, and statuses (Active/Inactive, Earned/Not Earned, Passed/Failed, etc.) must be translated into TR/EN/AZ for the i18n system — English versions are already provided in Section 10 above as a translation baseline.
- Code must be written modularly and extensibly for future phase features (e.g., adding a new simulation type or badge should only require a database insert, not a code change).

---

**START**: Following the implementation order in Section 9, begin by setting up the project scaffold and i18n infrastructure. After completing each step, provide a summary before moving on to the next.
