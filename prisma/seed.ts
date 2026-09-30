import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDemoAssessments } from "./seed-assessments";
import { seedIdeaDevelopmentTraining } from "./seed-training";

const prisma = new PrismaClient();

const badges = [
  // Idea Development
  { key: "welcome_badge", nameTr: "Hoş geldin Rozeti", nameEn: "Welcome Badge", nameAz: "Xoş gəlmisiniz Nişanı", icon: "👋", coinValue: 100, category: "idea_development", tier: "regular" },
  { key: "problem_explorer", nameTr: "Problem Kaşifi", nameEn: "Problem Explorer", nameAz: "Problem Araşdırıcısı", icon: "🔍", coinValue: 50, category: "idea_development", tier: "regular" },
  { key: "idea_generator", nameTr: "Fikir Üreticisi", nameEn: "Idea Generator", nameAz: "Fikir Yaradıcısı", icon: "💡", coinValue: 75, category: "idea_development", tier: "regular" },
  { key: "solution_designer", nameTr: "Çözüm Tasarımcısı", nameEn: "Solution Designer", nameAz: "Həll Dizayneri", icon: "🛠", coinValue: 100, category: "idea_development", tier: "regular" },
  { key: "customer_explorer", nameTr: "Müşteri Kaşifi", nameEn: "Customer Explorer", nameAz: "Müştəri Araşdırıcısı", icon: "🎯", coinValue: 125, category: "idea_development", tier: "regular" },
  { key: "market_researcher", nameTr: "Pazar Araştırmacısı", nameEn: "Market Researcher", nameAz: "Bazar Araşdırıcısı", icon: "📊", coinValue: 150, category: "idea_development", tier: "regular" },
  { key: "innovation_architect", nameTr: "İnovasyon Mimarı", nameEn: "Innovation Architect", nameAz: "İnnovasiya Memarı", icon: "👑", coinValue: 300, category: "idea_development", tier: "crown" },
  // Startup Management
  { key: "business_model_designer", nameTr: "İş Modeli Tasarımcısı", nameEn: "Business Model Designer", nameAz: "Biznes Modeli Dizayneri", icon: "📋", coinValue: 75, category: "startup_management", tier: "regular" },
  { key: "mvp_developer", nameTr: "MVP Geliştiricisi", nameEn: "MVP Developer", nameAz: "MVP İnkişaf etdiricisi", icon: "🛠", coinValue: 100, category: "startup_management", tier: "regular" },
  { key: "first_customer_winner", nameTr: "İlk Müşteri Kazanan", nameEn: "First Customer Winner", nameAz: "İlk Müştəri Qazanan", icon: "🤝", coinValue: 125, category: "startup_management", tier: "regular" },
  { key: "operations_expert", nameTr: "Operasyon Uzmanı", nameEn: "Operations Expert", nameAz: "Əməliyyat Mütəxəssisi", icon: "⚙️", coinValue: 150, category: "startup_management", tier: "regular" },
  { key: "strategy_master", nameTr: "Strateji Ustası", nameEn: "Strategy Master", nameAz: "Strategiya Ustası", icon: "♟️", coinValue: 175, category: "startup_management", tier: "regular" },
  { key: "startup_architect", nameTr: "Startup Mimarı", nameEn: "Startup Architect", nameAz: "Startup Memarı", icon: "👑", coinValue: 350, category: "startup_management", tier: "crown" },
  // Finance
  { key: "budget_planner", nameTr: "Bütçe Planlayıcısı", nameEn: "Budget Planner", nameAz: "Büdcə Planlayıcısı", icon: "💵", coinValue: 50, category: "finance", tier: "regular" },
  { key: "revenue_expert", nameTr: "Gelir Uzmanı", nameEn: "Revenue Expert", nameAz: "Gəlir Mütəxəssisi", icon: "📈", coinValue: 100, category: "finance", tier: "regular" },
  { key: "cash_flow_manager", nameTr: "Nakit Akışı Yöneticisi", nameEn: "Cash Flow Manager", nameAz: "Pul Axını Meneceri", icon: "💸", coinValue: 125, category: "finance", tier: "regular" },
  { key: "profitability_expert", nameTr: "Karlılık Uzmanı", nameEn: "Profitability Expert", nameAz: "Rentabellik Mütəxəssisi", icon: "💰", coinValue: 150, category: "finance", tier: "regular" },
  { key: "finance_strategist", nameTr: "Finans Stratejisti", nameEn: "Finance Strategist", nameAz: "Maliyyə Strategi", icon: "📊", coinValue: 175, category: "finance", tier: "regular" },
  { key: "finance_master", nameTr: "Finans Ustası", nameEn: "Finance Master", nameAz: "Maliyyə Ustası", icon: "👑", coinValue: 350, category: "finance", tier: "crown" },
  // Sales & Marketing
  { key: "target_audience_hunter", nameTr: "Hedef Kitle Avcısı", nameEn: "Target Audience Hunter", nameAz: "Hədəf Auditoriya Ovçusu", icon: "🎯", coinValue: 50, category: "sales_marketing", tier: "regular" },
  { key: "campaign_designer", nameTr: "Kampanya Tasarımcısı", nameEn: "Campaign Designer", nameAz: "Kampaniya Dizayneri", icon: "📢", coinValue: 100, category: "sales_marketing", tier: "regular" },
  { key: "first_sale_badge", nameTr: "İlk Satış Rozeti", nameEn: "First Sale Badge", nameAz: "İlk Satış Nişanı", icon: "🤝", coinValue: 125, category: "sales_marketing", tier: "regular" },
  { key: "customer_acquisition_expert", nameTr: "Müşteri Kazanım Uzmanı", nameEn: "Customer Acquisition Expert", nameAz: "Müştəri Qazanım Mütəxəssisi", icon: "👥", coinValue: 150, category: "sales_marketing", tier: "regular" },
  { key: "growth_expert", nameTr: "Büyüme Uzmanı", nameEn: "Growth Expert", nameAz: "Böyümə Mütəxəssisi", icon: "📈", coinValue: 175, category: "sales_marketing", tier: "regular" },
  { key: "marketing_master", nameTr: "Pazarlama Ustası", nameEn: "Marketing Master", nameAz: "Marketinq Ustası", icon: "👑", coinValue: 350, category: "sales_marketing", tier: "crown" },
  // Pitch & Investor
  { key: "pitch_preparer", nameTr: "Pitch Hazırlayıcısı", nameEn: "Pitch Preparer", nameAz: "Pitch Hazırlayan", icon: "📑", coinValue: 75, category: "pitch_investor", tier: "regular" },
  { key: "presentation_designer", nameTr: "Sunum Tasarımcısı", nameEn: "Presentation Designer", nameAz: "Təqdimat Dizayneri", icon: "🎨", coinValue: 100, category: "pitch_investor", tier: "regular" },
  { key: "took_the_stage", nameTr: "Sahneye Çıktı", nameEn: "Took the Stage", nameAz: "Səhnəyə Çıxdı", icon: "🎤", coinValue: 125, category: "pitch_investor", tier: "regular" },
  { key: "persuasion_expert", nameTr: "İkna Uzmanı", nameEn: "Persuasion Expert", nameAz: "İnandırma Mütəxəssisi", icon: "💬", coinValue: 150, category: "pitch_investor", tier: "regular" },
  { key: "investor_favorite", nameTr: "Yatırımcı Favorisi", nameEn: "Investor Favorite", nameAz: "İnvestor Favoriti", icon: "⭐", coinValue: 200, category: "pitch_investor", tier: "regular" },
  { key: "investment_ready_entrepreneur", nameTr: "Yatırıma Hazır Girişimci", nameEn: "Investment-Ready Entrepreneur", nameAz: "İnvestisiyaya Hazır Sahibkar", icon: "👑", coinValue: 400, category: "pitch_investor", tier: "crown" },
  // Leadership
  { key: "team_founder", nameTr: "Takım Kurucusu", nameEn: "Team Founder", nameAz: "Komanda Qurucusu", icon: "👤", coinValue: 75, category: "leadership", tier: "regular" },
  { key: "task_coordinator", nameTr: "Görev Koordinatörü", nameEn: "Task Coordinator", nameAz: "Tapşırıq Koordinatoru", icon: "📌", coinValue: 100, category: "leadership", tier: "regular" },
  { key: "team_leader", nameTr: "Takım Lideri", nameEn: "Team Leader", nameAz: "Komanda Lideri", icon: "👥", coinValue: 125, category: "leadership", tier: "regular" },
  { key: "crisis_manager", nameTr: "Kriz Yöneticisi", nameEn: "Crisis Manager", nameAz: "Böhran Meneceri", icon: "🛡", coinValue: 150, category: "leadership", tier: "regular" },
  { key: "strategic_leader", nameTr: "Stratejik Lider", nameEn: "Strategic Leader", nameAz: "Strategik Lider", icon: "♟️", coinValue: 200, category: "leadership", tier: "regular" },
  { key: "inspiring_leader", nameTr: "İlham Veren Lider", nameEn: "Inspiring Leader", nameAz: "İlhamverici Lider", icon: "👑", coinValue: 400, category: "leadership", tier: "crown" },
  // Founder Psychology
  { key: "self_awareness_explorer", nameTr: "Öz Farkındalık Kâşifi", nameEn: "Self-Awareness Explorer", nameAz: "Özünü Tanıma Araşdırıcısı", icon: "🧠", coinValue: 50, category: "founder_psychology", tier: "regular" },
  { key: "resilience_builder", nameTr: "Dayanıklılık Geliştiricisi", nameEn: "Resilience Builder", nameAz: "Dayanıqlılıq İnkişaf etdiricisi", icon: "💪", coinValue: 100, category: "founder_psychology", tier: "regular" },
  { key: "change_traveler", nameTr: "Değişim Yolcusu", nameEn: "Change Traveler", nameAz: "Dəyişiklik Səyyahı", icon: "🔄", coinValue: 125, category: "founder_psychology", tier: "regular" },
  { key: "decision_maker", nameTr: "Karar Verici", nameEn: "Decision Maker", nameAz: "Qərar Verən", icon: "⚖️", coinValue: 150, category: "founder_psychology", tier: "regular" },
  { key: "strong_founder", nameTr: "Güçlü Kurucu", nameEn: "Strong Founder", nameAz: "Güclü Qurucu", icon: "🔥", coinValue: 200, category: "founder_psychology", tier: "regular" },
  { key: "mental_resilience_master", nameTr: "Zihinsel Dayanıklılık Ustası", nameEn: "Mental Resilience Master", nameAz: "Zehni Dayanıqlılıq Ustası", icon: "👑", coinValue: 400, category: "founder_psychology", tier: "crown" },
  // Globalization
  { key: "market_explorer", nameTr: "Pazar Kaşifi", nameEn: "Market Explorer", nameAz: "Bazar Araşdırıcısı", icon: "🗺️", coinValue: 75, category: "globalization", tier: "regular" },
  { key: "export_initiator", nameTr: "İhracat Başlatıcısı", nameEn: "Export Initiator", nameAz: "İxrac Başladan", icon: "🚢", coinValue: 100, category: "globalization", tier: "regular" },
  { key: "global_customer_hunter", nameTr: "Global Müşteri Avcısı", nameEn: "Global Customer Hunter", nameAz: "Qlobal Müştəri Ovçusu", icon: "🌎", coinValue: 150, category: "globalization", tier: "regular" },
  { key: "international_growth_expert", nameTr: "Uluslararası Büyüme Uzmanı", nameEn: "International Growth Expert", nameAz: "Beynəlxalq Böyümə Mütəxəssisi", icon: "📈", coinValue: 200, category: "globalization", tier: "regular" },
  { key: "global_strategist", nameTr: "Küresel Stratejist", nameEn: "Global Strategist", nameAz: "Qlobal Strateg", icon: "🌐", coinValue: 250, category: "globalization", tier: "regular" },
  { key: "global_entrepreneur", nameTr: "Küresel Girişimci", nameEn: "Global Entrepreneur", nameAz: "Qlobal Sahibkar", icon: "👑", coinValue: 500, category: "globalization", tier: "crown" },
  // Special Achievement
  { key: "top_10_champion", nameTr: "İlk 10 Şampiyonu", nameEn: "Top 10 Champion", nameAz: "İlk 10 Çempionu", icon: "🥇", coinValue: 500, category: "special_achievement", tier: "regular" },
  { key: "fastest_finisher", nameTr: "En Hızlı Tamamlayan", nameEn: "Fastest Finisher", nameAz: "Ən Sürətli Bitirən", icon: "⚡", coinValue: 500, category: "special_achievement", tier: "regular" },
  { key: "coin_millionaire", nameTr: "Coin Milyoneri", nameEn: "Coin Millionaire", nameAz: "Coin Milyoneri", icon: "💎", coinValue: 1000, category: "special_achievement", tier: "regular" },
  { key: "jury_champion", nameTr: "Jüri Şampiyonu", nameEn: "Jury Champion", nameAz: "Jüri Çempionu", icon: "🏆", coinValue: 750, category: "special_achievement", tier: "regular" },
  { key: "mentor_favorite_1", nameTr: "Mentor Favorisi", nameEn: "Mentor's Favorite", nameAz: "Mentorun Favoriti", icon: "🌟", coinValue: 500, category: "special_achievement", tier: "regular" },
  { key: "innovation_star", nameTr: "İnovasyon Yıldızı", nameEn: "Innovation Star", nameAz: "İnnovasiya Ulduzu", icon: "🚀", coinValue: 750, category: "special_achievement", tier: "regular" },
  { key: "investors_choice", nameTr: "Yatırımcıların Seçimi", nameEn: "Investors' Choice", nameAz: "İnvestorların Seçimi", icon: "💰", coinValue: 1000, category: "special_achievement", tier: "regular" },
  { key: "lifelong_learner", nameTr: "Yaşam Boyu Öğrenen", nameEn: "Lifelong Learner", nameAz: "Həyat Boyu Öyrənən", icon: "🎓", coinValue: 500, category: "special_achievement", tier: "regular" },
  { key: "expertise_traveler", nameTr: "Uzmanlık Yolcusu", nameEn: "Expertise Traveler", nameAz: "Ekspertiza Səyyahı", icon: "🎓", coinValue: 300, category: "special_achievement", tier: "regular" },
  { key: "growth_traveler", nameTr: "Gelişim Yolcusu", nameEn: "Growth Traveler", nameAz: "İnkişaf Səyyahı", icon: "🌱", coinValue: 250, category: "special_achievement", tier: "regular" },
  { key: "community_ambassador", nameTr: "Topluluk Elçisi", nameEn: "Community Ambassador", nameAz: "İcma Səfiri", icon: "🤝", coinValue: 250, category: "special_achievement", tier: "regular" },
  { key: "mentor_favorite_2", nameTr: "Mentorun Favorisi", nameEn: "Mentor's Pick", nameAz: "Mentorun Seçimi", icon: "🧠", coinValue: 500, category: "special_achievement", tier: "regular" },
];

const simulations = [
  { key: "idea_development", nameTr: "Fikir Geliştirme Simülasyonu", nameEn: "Idea Development Simulation", nameAz: "Fikir İnkişaf Simulyasiyası", category: "idea_development" },
  { key: "startup_management", nameTr: "Startup Yönetimi Simülasyonu", nameEn: "Startup Management Simulation", nameAz: "Startup İdarəetmə Simulyasiyası", category: "startup_management" },
  { key: "leadership", nameTr: "Liderlik Simülasyonu", nameEn: "Leadership Simulation", nameAz: "Liderlik Simulyasiyası", category: "leadership" },
  { key: "investor_readiness", nameTr: "Yatırımcı Hazırlığı Simülasyonu", nameEn: "Investor Readiness Simulation", nameAz: "İnvestor Hazırlığı Simulyasiyası", category: "investor_readiness" },
];

async function main() {
  console.log("Seeding badges...");
  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: badge,
      create: badge,
    });
  }

  console.log("Seeding simulations...");
  for (const sim of simulations) {
    await prisma.simulation.upsert({
      where: { key: sim.key },
      update: sim,
      create: sim,
    });
  }

  // Production: the super admin password comes from SEED_ADMIN_PASSWORD, and a
  // re-run never resets existing accounts or prices edited in the admin panel.
  const isProduction = process.env.NODE_ENV === "production";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (isProduction ? "" : "Admin123!");
  const adminExists = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  if (isProduction && !adminExists && adminPassword.length < 12) {
    throw new Error("Set SEED_ADMIN_PASSWORD (at least 12 characters) to seed a production database");
  }
  const passwordHash = await bcrypt.hash(adminPassword || "unused-existing-admin", 12);

  async function resetDemoUser2FA(userId: string) {
    await prisma.userRecoveryCode.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async function upsertDemoUser(data: {
    email: string;
    tenantId: string | null;
    firstName: string;
    lastName: string;
    role: string;
    language: string;
  }) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, tenantId: data.tenantId },
    });

    if (existing && isProduction) return existing;
    if (existing) {
      await resetDemoUser2FA(existing.id);
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          language: data.language,
        },
      });
    }

    return prisma.user.create({
      data: {
        ...data,
        passwordHash,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }

  console.log("Seeding super admin...");
  await upsertDemoUser({
    email: "admin@bizsim.com",
    tenantId: null,
    firstName: "Super",
    lastName: "Admin",
    role: "SUPER_ADMIN",
    language: "tr",
  });

  // Service pricing (kuruş per participant). Tiers are replaced on every run
  // so editing this table and re-seeding is enough to change demo prices.
  const services: { code: string; name: string; tiers: [number, number | null, number][] }[] = [
    { code: "HACKATHON", name: "Hackathon", tiers: [[1, 50, 1000], [51, 100, 800], [101, null, 600]] },
    { code: "TEACHERS", name: "Teacher-Student Panel", tiers: [[1, 50, 1500], [51, 100, 1200], [101, null, 1000]] },
    { code: "SIMULATIONS", name: "Business Simulations", tiers: [[1, 50, 2000], [51, 100, 1700], [101, null, 1400]] },
    { code: "TRAININGS", name: "Trainings", tiers: [[1, 50, 800], [51, 100, 650], [101, null, 500]] },
    { code: "AI_TOOLS", name: "AI Mentor", tiers: [[1, 50, 1200], [51, 100, 1000], [101, null, 800]] },
  ];
  for (const s of services) {
    if (isProduction && (await prisma.service.findUnique({ where: { code: s.code } }))) continue;
    const service = await prisma.service.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: { code: s.code, name: s.name },
    });
    await prisma.servicePriceTier.deleteMany({ where: { serviceId: service.id } });
    await prisma.servicePriceTier.createMany({
      data: s.tiers.map(([minParticipants, maxParticipants, pricePerParticipant]) => ({
        serviceId: service.id,
        minParticipants,
        maxParticipants,
        pricePerParticipant,
      })),
    });
  }

  await seedDemoAssessments(prisma);
  await seedIdeaDevelopmentTraining(prisma);

  console.log("Seed completed!");
  console.log("Run `npm run db:seed-demo` to populate the full demo tenant and 100 participants.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
