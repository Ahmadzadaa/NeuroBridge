# BizSim — Business Plan

**Multi-tenant SaaS for entrepreneurship programs.** Training → exams → simulation → hackathon judging → certification, in one white-label platform.

| | |
|---|---|
| **Stage** | Working product, pre-revenue. 29 data models, 40 API routes, 126 tests (~90% core coverage), clean production build. |
| **Raise** | **Seed — $750K** (range $500K–$1M) |
| **Runway** | 24 months to ~$330K ARR and Series A readiness |
| **Beachhead** | Turkey (113 technoparks, 208 universities) + Azerbaijan (51 HEIs, IDDA) → EU/Gulf/Central Asia |
| **Model** | Per-seat annual licence, $22–$29/seat + platform fee. Blended ACV $7K → $14K |

---

## 1. Executive Summary

**What it is.** BizSim digitises the full lifecycle of an entrepreneurship program. An institution licenses seats, runs its own programs under its own brand, and BizSim never touches its content — enforced in code by a 5-role RBAC matrix and PostgreSQL row-level security.

**Why now.**

- Institutions buying today assemble 3–4 tools: an LMS (Moodle/Canvas), a per-student simulation ($30–$50/student), a judging tool (Award Force $3,250–$6,500/yr), and a spreadsheet. Nothing joins them.
- Funding is flowing to exactly this buyer: **EIT HEI Initiative — €70M call for 2026–2028**, up to €2M per project, explicitly for "entrepreneurship training and startup support" in HEIs. Horizon Europe's European Innovation Ecosystems cluster adds **€65.1M for 2026–27**.
- Turkey's technopark base grew to **113 zones, 12,188 resident companies, 125,124 employees** — a dense, funded, underserved buyer set 2 hours from Baku.

**Traction to date.** Product, not revenue. Working end-to-end: video training with per-lesson progress, server-side graded exams, hackathon/jury system (team formation, PDF submission, weighted criteria, live leaderboard, scheduled results reveal with email), QR-code participant onboarding, gamification, certificates, audit logging, 2FA, Stripe/Payriff/Iyzico integrations, Docker + Terraform + CI/CD.

**What the money buys.** Convert a built product into a sold product: 6 → 35 paying institutions, close the three functional gaps (simulation gameplay, AI tooling, live deployment), and prove per-seat economics at $9K ACV with a 13-month CAC payback.

**Key figures (base case):**

| | 2026* | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|---|
| Institutions | 7 | 35 | 100 | 215 | 374 |
| ARR | $49K | $327K | $1.10M | $2.69M | $5.28M |
| Revenue | $7K | $188K | $719K | $1.91M | $4.00M |
| EBITDA | -$105K | -$497K | -$553K | -$222K | **+$773K** |
| FTE | 6.5 | 13 | 22 | 34 | 47 |

\* 2026 is a Q4 stub year from seed close. Cumulative burn through 2027 = **$602K**, inside the $750K raise. Series A (~$3M) targeted H1 2028 to fund the 2028–29 scale-up.

---

## 2. Problem & Solution

### The problem, by buyer

| Buyer | What they run today | What breaks |
|---|---|---|
| **Technopark / incubator** | Excel + email + printed jury sheets | No participant history, no defensible scoring, impact reports rebuilt by hand each cycle |
| **University e-ship centre** | Campus LMS (no competition layer) + a bought simulation + an event microsite | Three logins, three gradebooks, nothing rolls up into one record |
| **Accelerator** | Application tool (F6S/YouNoodle) + Google Forms for judging | Judging starts at submission — the platform knows nothing about what the cohort learned |
| **Government innovation agency** | Bespoke build per program | Cost per program never amortises; no cross-program comparison |

**The sharp pain — hackathon judging.** It is subjective and unauditable: who scored what, against which criterion, at what weight, is not recorded. Institutions defend results they cannot reconstruct. This is why judging is sold as its own product category — and why it is the wedge.

### The solution

One platform, one participant record, one gradebook:

| Layer | What BizSim does | Status |
|---|---|---|
| **Onboard** | QR code / apply-token registration; atomic seat licensing (`SELECT FOR UPDATE`, no overselling) | ✅ Live |
| **Teach** | Video courses, per-lesson progress tracking, playlists | ✅ Live |
| **Test** | Server-side graded exams — correct answers never reach the browser; best-attempt scoring | ✅ Live |
| **Simulate** | Decision-based business simulations with tasks tied to coins/badges | ⚠️ Data model built, gameplay UI incomplete |
| **Compete** | Teams (max 5), PDF submission (10MB, magic-byte validated, versioned), weighted jury criteria, live leaderboard, scheduled reveal with countdown + email | ✅ Live |
| **Coach** | 7 AI tools (mentor, pitch coach, jury assistant, evaluation) | ⚠️ Endpoint built, integrations incomplete |
| **Certify** | Participation / achievement / completion certificates | ⚠️ Issuance live, PDF pipeline missing |
| **Prove** | Central audit log, business metrics, report export queue | ✅ Live |

**The architectural bet — hard multi-tenancy.** Every institution runs under its own brand with `tenantId` isolation on every core model plus PostgreSQL RLS. The platform owner provisions the account and hands over the keys; program, jury and hackathon control sit entirely with the tenant. Permissions removed from the super-admin role are locked by a failing test if anyone re-adds them. This is what lets one codebase serve a university, a technopark and a ministry without forking.

---

## 3. Market Size

### Bottom-up TAM

| Layer | Build | Value |
|---|---|---|
| **TAM** | 264M tertiary students worldwide (UNESCO, 2025); ~20% in business/administration/entrepreneurship-adjacent programs = ~53M seats × $25/seat + ~22,700 institutions × ~$4K platform fee | **≈ $1.4B / yr** |
| **SAM** | EU + UK + Turkey + Caucasus + Central Asia + Gulf: ~4,200 HEIs and ~700 parks/incubators/agencies; ~9M addressable seats. EN/TR/AZ UI already ships | **≈ $240M / yr** |
| **SOM** | 374 institutions by 2030 at $14.1K blended ACV | **$5.3M ARR = 2.2% of SAM** |

**Beachhead (immediate, verified):** Turkey — 113 technoparks (94 active) and 208 universities with 6.3M students; Azerbaijan — 51 HEIs, IDDA with 750+ startups supported. **372 institutions × $12K = $4.5M** addressable without leaving the region.

### Top-down cross-check

| Adjacent market | 2025/26 size | CAGR | Source |
|---|---|---|---|
| Higher-education LMS | $35.8B (2025) | 21.6% | MarketsandMarkets |
| Simulation learning | $29.2B (2026) | 16.4% | The Business Research Company |
| Game-based learning | $6.2B (2025) | 23.4% | MarketsandMarkets |
| Hackathon management software | $1.37B (2026) | 12.6% | Business Research Insights |

TAM at $1.4B is ~2% of these pools combined — the estimate is conservative by construction.

**Headwind to state plainly:** EdTech venture funding hit **$1.8B in 2024, the lowest since 2014** (HolonIQ). The market is being funded on unit economics, not narrative. That shapes the plan below.

---

## 4. Monetization Model

### Pricing

Current in-product tiers are seat-only ($29 / $25 / $22 by volume). **Recommended change: platform fee + seats.** A pure seat price of $22–$29 is *below* what institutions already pay for a single simulation licence ($30–$50/student at Interpretive and HBP) — the platform is underpriced, and a seat-only model gives no floor when a cohort is small.

| Plan | Target buyer | Seats incl. | Platform fee | Seat overage | **ACV** |
|---|---|---|---|---|---|
| **Starter** | University e-ship centre, single program | 100 | $2,100 | $29 | **$5,000** |
| **Growth** | Technopark, accelerator, faculty-wide | 250 | $5,750 | $25 | **$12,000** |
| **Enterprise** | Gov agency, multi-campus system | 1,000 | $13,000 | $22 | **$35,000** |

Add-ons: white-label domain, SSO, AI tool pack, custom simulation authoring, hosted hackathon operations.

### Revenue streams

| Stream | 2027 mix | Notes |
|---|---|---|
| Seat licences (annual, prepaid) | ~54% | Scales with cohort size; the expansion lever |
| Platform fees | ~41% | Revenue floor independent of cohort size — this is what fixes the underpricing |
| Services (onboarding, custom sim, hackathon ops) | ~5% | Deliberately capped — keeps gross margin ≥85% |

At 35 institutions the mix is $177K seats + $135K platform fees. Platform fees are what make a 40-seat pilot worth selling.

### Unit economics

| | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|
| Blended ACV | $9,375 | $11,038 | $12,548 | $14,140 |
| CAC | $9,000 | $8,000 | $7,200 | $6,500 |
| CAC payback | 13.6 mo | 10.2 mo | 8.1 mo | 6.5 mo |
| LTV (4-yr, 85% GM) | $31.9K | $37.5K | $42.7K | $48.1K |
| **LTV:CAC** | **3.5x** | **4.7x** | **5.9x** | **7.4x** |

Benchmarks for context: education-industry CAC averages $1,143 blended but govtech carries a **2.5–4.0× multiplier** and higher-ed sales cycles run **9–18 months** (12–24 for system-level RFPs). Vertical SaaS median NRR is **118%**; the model assumes **112%** net expansion — deliberately below benchmark.

**Churn assumptions:** Starter 18%, Growth 10%, Enterprise 5%. Higher than typical vertical SaaS, because a single-program university buyer can lapse when a champion leaves.

**Why CAC falls:** first 20 logos are founder-led and expensive. From 2028 the motion shifts to partner-led — technopark associations, EIT HEI consortia, and ministry frameworks sell one-to-many.

---

## 5. Competitive Edge

### The landscape splits four ways — and nothing spans it

| Category | Examples | Price | What they can't do |
|---|---|---|---|
| **Business simulations** | Capsim, Cesim, Interpretive, Simformer, HBP | $11.50–$85/student | No video courses, no jury scoring of submitted work, no tenancy |
| **Hackathon/judging** | Devpost, Award Force, YouNoodle, TAIKAI, ScoreJudge | $999–$6,500/yr per program; free tiers exist | Start at submission. No idea what the participant learned. Not per-seat |
| **Accelerator ops** | F6S, AcceleratorApp, Startup Space, Optimy | ~$200+/mo to $50/user/mo | CRM and workflow. No exams, no simulations, no gamification |
| **Institutional LMS** | Moodle, Canvas, Blackboard, 360Learning | $2.24–$96/user/yr | No multi-judge weighted panels, no team formation, no simulation engine, single-tenant per institution |

### Verified white space

Public research across 30+ vendors found **no single product** that combines video course progress + server-side graded exams + a simulation engine + weighted-criteria jury scoring + a coin/badge economy, under white-label multi-tenancy, sold per seat to universities, technoparks and government agencies.

Closest partial overlaps and their gaps:

- **HackerEarth** — hackathons + assessments + learning paths, but recruiter-owned, code-scored, no jury panels for business plans, no institutional tenancy.
- **Simformer** — simulations + inter-university championships, but competition means sim ranking, not human jury scoring of submissions; no video delivery.
- **AcceleratorApp** — program ops + a light LMS, but no simulations, no jury scoring, no gamification, priced per org.
- **Award Force** — the best jury mechanics on the market, and nothing else. Zero learners.

### The five defensible advantages

1. **One participant record across the whole journey.** A jury score sits next to the exam result and the lessons completed. No competitor owns both sides of that boundary — the sim vendors export to the LMS via LTI, the judging vendors never see the learning.
2. **Auditable judging.** Weighted criteria, per-judge attribution, permissioned PDF access, scheduled reveal, anonymous feedback returned to teams. This survives a contested result; a spreadsheet does not.
3. **Multi-tenancy enforced in code, not policy.** `tenantId` on every core model, PostgreSQL RLS, RBAC matrix with permission removals locked by tests. Sells to a ministry that must guarantee institutional separation.
4. **Buyer-set coverage.** Sim vendors sell to business-school faculty; hackathon tools to corporate devrel; accelerator software to VCs. One product across universities + technoparks + accelerators + agencies is a distribution advantage, not a feature list.
5. **Language and region.** EN/TR/AZ trilingual UI at the data-model level. No competitor found ships Turkish and Azerbaijani together — and no all-in-one regional competitor was found at all.

**Honest counter-argument:** every individual module is commoditised. Jury scoring is free at ScoreJudge, LMS is free at Moodle, simulations start at $20/student. The moat is not any one module — it is integration, tenancy and the switching cost of a multi-year participant record. That moat has to be built through customer count, not code.

---

## 6. Roadmap

### Product — closing the gaps

| Quarter | Milestone | Why it matters commercially |
|---|---|---|
| **Q4 2026** | Live deployment: Terraform apply, secrets, DNS, WAF, monitoring. Payment providers tested with live keys. Email templates localised TR/EN. | Cannot sell what is not deployed. Blocks every paid contract. |
| **Q1 2027** | **Simulation gameplay UI** — interactive decision loop on the existing `Simulation`/`SimulationTask` model. | The single largest functional gap; the module competitors charge $30–$50/student for. |
| **Q1 2027** | Super-admin panels off mock data (billing, content, support, system). | Required before any reseller or agency runs its own tenants. |
| **Q2 2027** | **AI tool pack live** — mentor, pitch coach, jury assistant, auto-evaluation on the existing `/ai/chat` endpoint. | Highest-margin add-on; the main 2027 pricing uplift. |
| **Q2 2027** | PDF certificate generation + S3 pipeline. | Blocks accreditation-sensitive buyers. |
| **Q3 2027** | GDPR/KVKK: DSAR export and deletion endpoints. | Hard gate for EU institutions and any public tender. |
| **Q4 2027** | Analytics: tenant impact dashboards, cohort cohort-over-cohort comparison, exportable program reports. | The artefact a technopark shows its ministry. Renewal driver. |
| **2028** | Public API + LTI 1.3, so BizSim plugs into Canvas/Moodle instead of fighting them. | Removes the "we already have an LMS" objection outright. |
| **2028–29** | Simulation authoring for tenants; marketplace for shared program templates. | Network effect and the first non-linear moat. |

### Commercial milestones

| Period | Target | Motion |
|---|---|---|
| **Q4 2026** | 5–7 paying institutions, $49K ARR | Founder-led. Turkey technoparks + Azerbaijan HEIs. Paid pilots, not free ones. |
| **2027** | 35 institutions, $327K ARR | First 2 sales hires. Apply to EIT HEI Initiative and Horizon EIE calls as a consortium technology partner. |
| **H1 2028** | Series A (~$3M) | Raised on: NRR >110%, CAC payback <12 mo, 100-institution pipeline. |
| **2028** | 100 institutions, $1.1M ARR | Partner-led: technopark associations, ministry frameworks, EU consortium projects. |
| **2029** | 215 institutions, $2.69M ARR | EU + Gulf expansion. Enterprise/agency tier becomes the ACV driver. |
| **2030** | 374 institutions, $5.28M ARR, **EBITDA positive** | Self-funding. |

### Use of funds — $750K over 24 months

| Allocation | % | $ | Buys |
|---|---|---|---|
| Engineering & product | 45% | $337K | 5 FTE: simulation gameplay, AI pack, LTI, certificates, DSAR |
| Sales & partnerships | 24% | $180K | 2 FTE + travel; technopark/EU consortium channel |
| Marketing & program ops | 12% | $90K | Content, conferences, pilot delivery |
| Infrastructure & compliance | 9% | $68K | AWS, pentest, KVKK/GDPR legal, SOC 2 readiness |
| G&A & buffer | 10% | $75K | Entity, accounting, contingency |

### Key risks

| Risk | Mitigation |
|---|---|
| **Long public-sector sales cycles (9–24 mo)** consume runway before revenue | Lead with paid pilots at department budget level (<$25K, below RFP threshold) rather than campus-wide deals |
| **EdTech funding at a decade low** — Series A may not be there in 2028 | Model holds 2027 burn at $497K; the 2028 plan is throttleable to reach breakeven on seed + revenue if the round slips |
| **Modules are individually commoditised** | Compete on integration and the participant record, never on any single feature. Ship LTI so the LMS is a channel, not a rival |
| **Concentration in Turkey/Azerbaijan** | EN-first product from day one; EU consortium funding is the planned second geography, not an afterthought |
| **Founder-dependent sales** | First two 2027 hires are commercial, not engineering. CAC is modelled to rise before it falls — the plan pays for that learning |
| **Three modules still incomplete** | All three are on the funded roadmap with data models already in place; none requires architectural change |

---

### Sources

Market sizing: [UNESCO — 264M higher education students](https://www.unesco.org/en/articles/record-number-higher-education-students-highlights-global-need-recognition-qualifications) · [MarketsandMarkets — Higher Education LMS](https://www.marketsandmarkets.com/Market-Reports/higher-education-learning-management-system-market-119166670.html) · [The Business Research Company — Simulation Learning](https://www.thebusinessresearchcompany.com/report/simulation-learning-global-market-report) · [MarketsandMarkets — Game-based Learning](https://www.marketsandmarkets.com/Market-Reports/game-based-learning-market-146337112.html) · [Business Research Insights — Hackathon Management Software](https://www.businessresearchinsights.com/market-reports/hackathon-management-software-market-124877) · [IAU/UNESCO WHED](https://whed.net/Home2.html) · [IASP](https://www.iasp.ws/about-us/about-iasp) · [InBIA](https://www.inbia.org/) · [HolonIQ — 2025 Global Education Outlook](https://www.holoniq.com/notes/2025-global-education-outlook)

Beachhead: [YÖK Higher Education Statistics 2025-26](https://veriyonetim.yok.gov.tr/documentFiles/17768717381.B%C3%BClten20252026.pdf) · [ASO technopark analysis, April 2026](https://www.baskentgazete.com.tr/aso-turkiyedeki-teknoloji-gelistirme-bolgelerini-analiz-etti) · [Azerbaijan Ministry of Science and Education](https://edu.gov.az/az/qisa-xulase/22236-1) · [IDDA](https://idda.az/en)

Funding environment: [EIT — €70M HEI call](https://www.eit.europa.eu/news-events/news/eit-launches-eu70-million-call-boost-stem-innovation-and-strengthen-university) · [European Innovation Ecosystems WP 2026-27](https://ec.europa.eu/info/funding-tenders/opportunities/docs/2021-2027/horizon/wp-call/2026-2027/wp-10-european-innovation-ecosystems_horizon-2026-2027_en.pdf)

Competitors & pricing: [Harvard Business Publishing price list](https://help.hbsp.harvard.edu/hc/en-us/articles/20690693122963-Harvard-Business-Publishing-Education-Price-Changes) · [Interpretive Simulations](https://www.interpretive.com/) · [Simformer](https://simformer.com/for-education/) · [Award Force pricing](https://www.awardforce.com/pricing) · [YouNoodle pricing](https://www.younoodle.com/pricing) · [AcceleratorApp LMS](https://www.acceleratorapp.co/en/lms/) · [Moodle pricing](https://raccoongang.com/blog/moodle-pricing/) · [360Learning pricing](https://www.capterra.com/p/230567/360Learning/pricing/) · [ScoreJudge](https://scorejudge.com/judging-software-for-hackathons/)

Benchmarks: [First Page Sage — CAC by industry](https://firstpagesage.com/reports/average-customer-acquisition-cost-cac-by-industry-b2b-edition-fc/) · [Unbuilt Lab — SaaS CAC benchmarks](https://unbuiltlab.com/learn/benchmarks/saas-cac-benchmarks) · [Optifai — NRR benchmarks](https://optif.ai/learn/questions/b2b-saas-net-revenue-retention-benchmark/) · [GrowthSpree — EdTech GTM 2026](https://www.growthspreeofficial.com/blogs/edtech-saas-marketing-k12-higher-ed-corporate-2026)
