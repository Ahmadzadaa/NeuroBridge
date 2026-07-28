import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_TENANT_ID = "demo-teknopark";
const DEMO_TENANT_NAME = "Demo Teknopark";
const DEMO_TRAINING_KEYS = [
  "finance_training",
  "sales_marketing_training",
  "pitch_preparation_training",
  "business_model_training",
];

async function deleteDemoData() {
  const demoTenants = await prisma.tenant.findMany({
    where: { name: DEMO_TENANT_NAME },
    select: { id: true, programs: { select: { id: true } } },
  });

  if (demoTenants.length === 0) {
    return;
  }

  const tenantIds = demoTenants.map((t) => t.id);
  const programIds = demoTenants.flatMap((t) => t.programs.map((p) => p.id));

  const demoUsers = await prisma.user.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);

  if (demoUserIds.length > 0) {
    await prisma.coinTransaction.deleteMany({ where: { userId: { in: demoUserIds } } });
    await prisma.examAttempt.deleteMany({ where: { userId: { in: demoUserIds } } });
    await prisma.userBadge.deleteMany({ where: { userId: { in: demoUserIds } } });
    await prisma.certificate.deleteMany({ where: { userId: { in: demoUserIds } } });
  }

  // Remove orphaned demo participant accounts from previous runs
  const orphanDemoUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@demo.com" } },
    select: { id: true },
  });
  const orphanDemoUserIds = orphanDemoUsers.map((u) => u.id);
  if (orphanDemoUserIds.length > 0) {
    await prisma.coinTransaction.deleteMany({ where: { userId: { in: orphanDemoUserIds } } });
    await prisma.examAttempt.deleteMany({ where: { userId: { in: orphanDemoUserIds } } });
    await prisma.userBadge.deleteMany({ where: { userId: { in: orphanDemoUserIds } } });
    await prisma.certificate.deleteMany({ where: { userId: { in: orphanDemoUserIds } } });
    await prisma.participant.deleteMany({ where: { userId: { in: orphanDemoUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: orphanDemoUserIds } } });
  }

  if (programIds.length > 0) {
    await prisma.participant.deleteMany({ where: { programId: { in: programIds } } });
    await prisma.programAiTool.deleteMany({ where: { programId: { in: programIds } } });
    await prisma.programTraining.deleteMany({ where: { programId: { in: programIds } } });
    await prisma.programSimulation.deleteMany({ where: { programId: { in: programIds } } });
    await prisma.program.deleteMany({ where: { id: { in: programIds } } });
  }

  // Billing rows reference the tenant, so they go first.
  await prisma.paymentTransaction.deleteMany({
    where: { invoice: { tenantId: { in: tenantIds } } },
  });
  await prisma.seatChangeLog.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.invoice.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.subscription.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.paymentMethod.deleteMany({ where: { tenantId: { in: tenantIds } } });

  await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });

  const demoTrainings = await prisma.training.findMany({
    where: { key: { in: DEMO_TRAINING_KEYS } },
    select: { id: true },
  });
  const trainingIds = demoTrainings.map((t) => t.id);

  if (trainingIds.length > 0) {
    const exams = await prisma.exam.findMany({
      where: { trainingId: { in: trainingIds } },
      select: { id: true },
    });
    const examIds = exams.map((e) => e.id);
    if (examIds.length > 0) {
      await prisma.question.deleteMany({ where: { examId: { in: examIds } } });
      await prisma.examAttempt.deleteMany({ where: { examId: { in: examIds } } });
      await prisma.exam.deleteMany({ where: { id: { in: examIds } } });
    }
    await prisma.lesson.deleteMany({ where: { trainingId: { in: trainingIds } } });
    await prisma.training.deleteMany({ where: { id: { in: trainingIds } } });
  }

  await prisma.simulationTask.deleteMany({});
}

function badgeCoinTotal(badges: { coinValue: number }[]) {
  return badges.reduce((sum, badge) => sum + badge.coinValue, 0);
}

// Training content data
const trainingContent = {
  finance: {
    key: "finance_training",
    titleTr: "Finans Eğitimi",
    titleEn: "Finance Training",
    titleAz: "Maliyyə Təhsili",
    descriptionTr: "Girişimciler için temel finansal kavramlar, bütçe planlama, birim ekonomisi ve nakit akışı yönetimi üzerine kapsamlı eğitim.",
    descriptionEn: "Comprehensive training on basic financial concepts, budget planning, unit economics, and cash flow management for entrepreneurs.",
    descriptionAz: "Sahibkarlar üçün əsas maliyyə konsepsiyaları, büdcə planlaşdırma, vahid iqtisadiyyat və pul axını idarəetməsi üzrə tam təhsil.",
    category: "finance",
    lessons: [
      {
        titleTr: "Temel Finansal Kavramlar",
        titleEn: "Basic Financial Concepts",
        titleAz: "Əsas Maliyyə Konsepsiyaları",
        content: `# Temel Finansal Kavramlar

Girişimcilik dünyasında finansal okuryazarlık, başarının temel taşıdır. Bu derste, her girişimcinin bilmesi gereken temel finansal terimleri ve bunların işletmenize nasıl uygulanacağını öğreneceksiniz.

## Gelir (Revenue)

Gelir, işletmenizin ürün veya hizmetlerinden elde ettiği toplam para miktarıdır. Gelir hesaplamasında sadece nakit akışını değil, henüz tahsil edilmemiş faturaları da dikkate almalısınız. Düzenli gelir akışı, işletmenizin sürdürülebilirliği için kritik öneme sahiptir.

## Gider (Expenses)

Giderler, işletmenizi faaliyette tutmak için harcadığınız tüm maliyetlerdir. Bunlar sabit giderler (kira, maaşlar) ve değişken giderler (hammadde, pazarlama) olarak ikiye ayrılır. Giderleri doğru takip etmek, karlılığınızı anlamak için hayati önem taşır.

## Kâr (Profit)

Kâr, gelirinizin giderlerinizden çıkarılmasıyla elde edilen net tutardır. Brüt kâr, sadece doğrudan üretim maliyetlerini düşürerek hesaplanırken, net kâr tüm operasyonel giderleri de içerir. Sağlıklı bir girişim, zaman içinde artan bir kâr marjı hedefler.

## Nakit Akışı (Cash Flow)

Nakit akışı, belirli bir dönemde işletmenize giren ve çıkan nakit miktarıdır. Karlı bir işletmenin nakit akışı sorunu yaşayabileceğini unutmayın. Müşterilerden alacaklarınızı zamanında tahsil etmek ve tedarikçilere ödemelerinizi planlamak, nakit akışı yönetiminin temelidir.

Bu temel kavramları anlamak, işletmenizin finansal sağlığını değerlendirmenize ve geleceğe yönelik daha iyi kararlar almanıza olanak tanır.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 15
      },
      {
        titleTr: "Bütçe Planlama ve Yönetimi",
        titleEn: "Budget Planning and Management",
        titleAz: "Büdcə Planlaşdırma və İdarəetmə",
        content: `# Bütçe Planlama ve Yönetimi

Etkili bütçe planlama, girişimcinin en güçlü yönetim araçlarından biridir. Bu derste, gerçekçi bütçeler oluşturmayı ve bunları işletmeniz için nasıl kullanacağınızı öğreneceksiniz.

## Bütçe Oluşturma Süreci

Bütçe oluşturmak, geçmiş verilere dayalı tahminler yapmayı ve gelecek hedeflerinizi belirlemeyi içerir. Başlangıçta, gelir tahminlerinizi mümkün olduğunca gerçekçi tutun ve en kötü senaryoyu da dikkate alın. Düzenli olarak bütçenizi gerçek performansla karşılaştırın ve gerekirse ayarlamalar yapın.

## Sabit ve Değişken Giderler

Bütçenizde sabit giderleri (kira, sigorta, sabit maaşlar) ve değişken giderleri (satış komisyonları, pazarlama, hammadde) ayrı ayrı takip edin. Bu ayrım, maliyet yapınızı anlamak ve tasarruf fırsatlarını belirlemek için önemlidir.

## Acil Durum Fonu

Her bütçede beklenmedik durumlar için bir acil durum fonu ayırın. Genellikle 3-6 aylık operasyonel giderinizi karşılayacak bir rezerv, işletmenizi finansal şoklara karşı korur. Bu fon, yatırımcılara da finansal disiplininizi gösterir.

## Düzenli Gözden Geçirme

Bütçenizi ayda en az bir kez, tercihen haftalık olarak gözden geçirin. Sapmaları analiz edin ve nedenlerini anlayın. Bu alışkanlık, finansal sürprizleri azaltır ve proaktif kararlar almanızı sağlar.

İyi bir bütçe yönetimi, işletmenizin kontrolünü elinizde tutmanıza ve büyüme fırsatlarını yakalamanıza yardımcı olur.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Birim Ekonomisi (Unit Economics)",
        titleEn: "Unit Economics",
        titleAz: "Vahid İqtisadiyyat",
        content: `# Birim Ekonomisi (Unit Economics)

Birim ekonomisi, işletmenizin temel karlılık birimini anlamak için kritik bir araçtır. Bu derste, CAC, LTV ve Burn Rate gibi önemli metrikleri öğreneceksiniz.

## Müşteri Edinme Maliyeti (CAC)

CAC, yeni bir müşteri kazanmak için harcadığınız toplam maliyettir. Pazarlama harcamalarınızı ve satış ekiplerinizin maliyetlerini yeni kazanılan müşteri sayısına bölerek hesaplanır. CAC'iniz, müşteriden elde ettiğiniz yaşam boyu değerinden (LTV) düşük olmalıdır.

## Müşteri Yaşam Boyu Değeri (LTV)

LTV, bir müşterinin işletmenizle ilişkisi boyunca size getireceği toplam gelir tahminidir. Ortalama satış tutarını, satın alma sıklığını ile müşteri ömrüyle çarparak hesaplanır. LTV/CAC oranı 3:1 veya daha yüksek olması, sağlıklı bir iş modeli olduğunu gösterir.

## Burn Rate

Burn rate, işletmenizin aylık nakit tüketim hızını ifade eder. Bu, mevcut nakit rezervlerinizin ne kadar süre yeteceğini (runway) hesaplamanızı sağlar. Yatırımcılar, burn rate'inizi ve runway'inizi yakından takip eder.

## Birim Ekonomisi Analizi

Her ürün veya hizmet için birim ekonomisini ayrı ayrı analiz edin. Hangi ürünler en karlı? Hangi müşteri segmentleri en yüksek LTV'ye sahip? Bu analiz, kaynaklarınızı nereye odaklayacağınızı belirler.

Sağlıklı birim ekonomisi, sürdürülebilir büyüme için temel şarttır. Yatırımcılar, ölçeklenebilir bir iş modeli için bu metriklerin güçlü olmasını bekler.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 25
      },
      {
        titleTr: "Nakit Akışı Yönetimi ve Runway Hesaplama",
        titleEn: "Cash Flow Management and Runway Calculation",
        titleAz: "Pul Axını İdarəetmə və Runway Hesablama",
        content: `# Nakit Akışı Yönetimi ve Runway Hesaplama

Nakit akışı yönetimi, girişimcilerin en kritik finansal becerisidir. Bu derste, nakit akışını optimize etmeyi ve runway'inizi hesaplamayı öğreneceksiniz.

## Nakit Akışı İzleme

Nakit akışınızı düzenli olarak izlemek, finansal sürprizlerden kaçınmanızı sağlar. Giren nakitleri (satışlar, yatırımlar) ve çıkan nakitleri (giderler, ödemeler) ayrı ayrı takip edin. Nakit akış tablonuz, gelecekteki nakit ihtiyaçlarınızı tahmin etmenize yardımcı olur.

## Runway Hesaplama

Runway, mevcut nakit rezervlerinizin işletmenizi ne kadar süre idare edeceğini gösterir. Mevcut nakitinizi aylık burn rate'e bölerek hesaplanır. Örneğin, 600.000 TL nakit ve 100.000 TL aylık burn rate ile 6 aylık runway'iniz olur.

## Nakit Akışı Optimizasyonu

Nakit akışını optimize etmek için müşterilerden alacakları hızlı tahsil edin, tedarikçilerle daha uzun ödeme vadeleri görüşün ve envanteri minimize edin. Faturalandırma süreçlerinizi hızlandırmak, nakit akışınızı önemli ölçüde iyileştirir.

## Finansman Zamanlaması

Runway'iniz 6 ayın altına düşmeden önce finansman sürecini başlatın. Yatırım süreçleri genellikle 3-6 ay sürer, bu yüzden erken harekete geçmek kritik önem taşır. Nakit krizi yaşamak yerine, proaktif bir yaklaşım benimseyin.

İyi nakit akışı yönetimi, işletmenizi finansal stresten korur ve büyüme fırsatlarını yakalamanıza olanak tanır.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Yatırımcılar İçin Finansal Projeksiyonlar",
        titleEn: "Financial Projections for Investors",
        titleAz: "İnvestorlar Üçün Maliyyə Proyeksiyaları",
        content: `# Yatırımcılar İçin Finansal Projeksiyonlar

Yatırımcılar, finansal projeksiyonlarınızı işletmenizin potansiyelini anlamak için kullanır. Bu derste, gerçekçi ve ikna edici finansal projeksiyonlar hazırlamayı öğreneceksiniz.

## Projeksiyonların Temeli

Finansal projeksiyonlarınız, gerçek verilere dayalı olmalıdır. Geçmiş performansınız, pazar büyüklüğü ve rekabet analizi, projeksiyonlarınızın temelini oluşturur. Aşırı iyimser tahminler, yatırımcıların güvenini zedeleyebilir.

## Gelir Projeksiyonları

Gelir projeksiyonlarınızı, müşteri edinme hızını, ortalama satış tutarını ve müşteri tutma oranını kullanarak hazırlayın. Farklı senaryolar (iyi, beklenen, kötü) sunarak, risk yönetimi yeteneğinizi gösterin.

## Gider Projeksiyonları

Gider projeksiyonlarınızda personel, pazarlama, teknoloji ve operasyonel maliyetleri detaylı şekilde tahmin edin. Büyüme ile birlikte maliyetlerinizin nasıl artacağını açıklayın. Ölçek ekonomileri (economies of scale) potansiyelinizi vurgulayın.

## Karlılık ve Nakit Akışı

Yatırımcılar, ne zaman karlı olacağınızı ve nakit akışınızın ne zaman pozitife döneceğini görmek ister. Bu noktaları (break-even) açıkça belirtin ve bunlara ulaşmak için gereken yatırımı gösterin.

## Düzenli Güncelleme

Projeksiyonlarınızı düzenli olarak gerçek performansla karşılaştırın ve gerekirse güncelleyin. Bu şeffaflık, yatırımcılarla güven ilişkinizi güçlendirir.

İyi hazırlanmış finansal projeksiyonlar, işletmenizin büyüme potansiyelini ikna edici bir şekilde gösterir.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 25
      }
    ]
  },
  sales_marketing: {
    key: "sales_marketing_training",
    titleTr: "Satış ve Pazarlama Eğitimi",
    titleEn: "Sales & Marketing Training",
    titleAz: "Satış və Marketinq Təhsili",
    descriptionTr: "Hedef pazar analizi, değer önerisi oluşturma, dijital pazarlama stratejileri ve müşteri edinme teknikleri üzerine kapsamlı eğitim.",
    descriptionEn: "Comprehensive training on target market analysis, value proposition creation, digital marketing strategies, and customer acquisition techniques.",
    descriptionAz: "Hədəf bazar analizi, dəyər təklifi yaradılması, rəqəmsal marketinq strategiyaları və müştəri qazanma texnikaları üzrə tam təhsil.",
    category: "sales_marketing",
    lessons: [
      {
        titleTr: "Hedef Pazar ve Müşteri Segmentasyonu",
        titleEn: "Target Market and Customer Segmentation",
        titleAz: "Hədəf Bazar və Müştəri Seqmentasiyası",
        content: `# Hedef Pazar ve Müşteri Segmentasyonu

Başarılı bir pazarlama stratejisi, doğru hedef pazarı tanımlamakla başlar. Bu derste, hedef pazarınızı belirlemeyi ve müşterilerinizi segmentlere ayırmayı öğreneceksiniz.

## Hedef Pazar Tanımlama

Hedef pazarınız, ürün veya hizmetinizin en çok değer yaratacağı müşteri grubudur. Demografik özellikler (yaş, gelir, konum), psikografik özellikler (ilgi alanları, yaşam tarzı) ve davranışsal özellikler (satın alma alışkanlıkları) kullanarak hedef pazarınızı tanımlayın.

## Müşteri Segmentasyonu

Müşterilerinizi benzer özelliklere göre segmentlere ayırın. B2C işletmeler için demografik segmentler (yaş grupları, gelir düzeyleri), B2B işletmeler için sektör, şirket büyüklüğü ve satın alma davranışı segmentleri kullanın. Her segment için özel değer önerileri geliştirin.

## Segment Önceliklendirme

Tüm segmentler eşit değildir. Her segmentin büyüklüğünü, büyüme potansiyelini, karlılığını ve rekabet durumunu analiz edin. En değerli segmentlere kaynaklarınızı odaklayın. Pareto prensibine göre, %20'nizden %80 gelir gelebilir.

## Segmentasyon Araçları

Müşteri verilerinizi analiz etmek için CRM sistemleri, web analitiği ve anketler kullanın. A/B testleri ile farklı segmentlere yönelik mesajların etkisini ölçün. Veriye dayalı segmentasyon, pazarlama ROI'nizi önemli ölçüde artırır.

Doğru hedef pazar ve segmentasyon, pazarlama bütçenizi verimli kullanmanızı sağlar.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Değer Önerisi (Value Proposition) Oluşturma",
        titleEn: "Creating Value Proposition",
        titleAz: "Dəyər Təklifi Yaratmaq",
        content: `# Değer Önerisi (Value Proposition) Oluşturma

Güçlü bir değer önerisi, işletmenizi rakiplerinizden ayırır. Bu derste, ikna edici bir değer önerisi oluşturmayı öğreneceksiniz.

## Değer Önerisi Nedir?

Değer önerisi, müşterilerinize sunduğunuz benzersiz değeri açıklayan net bir ifadedir. Müşterinizin sorununu nasıl çözdüğünüz, onlara ne kazandırdığınız ve neden sizi seçmeleri gerektiğini özetler. İyi bir değer önerisi, müşterinin "Neden bunu almalıyım?" sorusuna cevap verir.

## Müşteri Sorununu Anlama

Güçlü bir değer önerisi oluşturmak için önce müşterinizin derin sorunlarını anlayın. Müşteri görüşmeleri, anketler ve pazar araştırması ile gerçek sorunları belirleyin. Yüzeydeki sorunlar yerine, kök nedenleri hedefleyin.

## Benzersizlik Faktörleri

Rakiplerinizden farkınızı belirleyin. Ürün özellikleri, fiyat, servis kalitesi, marka veya iş modeli olabilir. Farkınızı müşterinin dilinden ifade edin. Teknik özellikler yerine, müşteriye sağladığı faydaya odaklanın.

## Değer Önerisi Şablonu

"X müşterisi için, Y sorununu çözen, Z rakiplerinden farklılaşan, W faydası sağlayan ürün/hizmet." Şablonunu kullanarak değer önerinizi netleştirin. Test edin ve müşteri geri bildirimlerine göre iyileştirin.

Güçlü bir değer önerisi, pazarlama mesajlarınızın temelini oluşturur.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 15
      },
      {
        titleTr: "Dijital Pazarlama Kanalları ve Strateji",
        titleEn: "Digital Marketing Channels and Strategy",
        titleAz: "Rəqəmsal Marketinq Kanalları və Strategiya",
        content: `# Dijital Pazarlama Kanalları ve Strateji

Dijital pazarlama, hedef kitlenize ulaşmanın en etkili yollarından biridir. Bu derste, farklı dijital kanalları ve entegre bir strateji oluşturmayı öğreneceksiniz.

## Dijital Pazarlama Kanalları

SEO (Arama Motoru Optimizasyonu), organik trafik için uzun vadeli bir stratejidir. SEM (Arama Motoru Pazarlaması), hızlı sonuçlar için ücretli reklamlar kullanır. Sosyal medya, marka bilinirliği ve etkileşim için idealdir. E-posta pazarlaması, mevcut müşterilerle ilişkiyi güçlendirir.

## İçerik Pazarlaması

Değerli içerik oluşturmak, otoritenizi artırır ve organik trafik çeker. Blog yazıları, videolar, infografikler ve e-kitaplar, hedef kitlenizin sorunlarına çözüm sunar. İçeriğinizi, müşteri yolculuğunun farklı aşamalarına göre özelleştirin.

## Sosyal Medya Stratejisi

Hangi sosyal medya platformlarının hedef kitlenizde popüler olduğunu belirleyin. B2B işletmeler için LinkedIn, B2C için Instagram ve TikTok daha etkili olabilir. Düzenli yayın, etkileşim ve topluluk oluşturma, sosyal medya başarısının anahtarıdır.

## Performans Ölçümü

Her kanalın performansını ölçün. CAC (Müşteri Edinme Maliyeti), ROAS (Reklam Harcamasının Getirisi), dönüşüm oranları ve müşteri yaşam boyu değeri gibi metrikleri takip edin. Verilere dayalı kararlar, pazarlama ROI'nizi optimize eder.

Entegre bir dijital pazarlama stratejisi, farklı kanalların sinerjisinden yararlanır.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 25
      },
      {
        titleTr: "Satış Hunisi (Sales Funnel) Tasarımı",
        titleEn: "Sales Funnel Design",
        titleAz: "Satış Qırtacı Dizaynı",
        content: `# Satış Hunisi (Sales Funnel) Tasarımı

Satış hunisi, potansiyel müşterilerin satın alma yolculuğunu temsil eder. Bu derste, etkili bir satış hunisi tasarlamayı ve optimize etmeyi öğreneceksiniz.

## Satış Hunisi Aşamaları

Farkındalık aşamasında, potansiyel müşteriler sorununu fark eder. İlgi aşamasında, çözüm araştırır. Düşünme aşamasında, seçenekleri karşılaştırır. Eylem aşamasında, satın alma kararı verir. Her aşama için farklı içerik ve mesajlar hazırlayın.

## Huni Girişini Genişletme

Farkındalık aşamasında trafiği artırmak için SEO, içerik pazarlaması, sosyal medya ve ücretli reklamlar kullanın. Lead magnet'ler (e-kitap, webiner, deneme sürümü) ile iletişim bilgilerini toplayın. Huni girişini genişletmek, daha fazla fırsat yaratır.

## Dönüşüm Optimizasyonu

Her aşamada dönüşüm oranlarını optimize edin. Landing page'lerinizi A/B testleri ile iyileştirin. Net CTA (Çağrı) butonları kullanın. Formları basitleştirin. Düşünme aşamasında, sosyal kanıt (referanslar, incelemeler) sunarak güven oluşturun.

## Huni Sızıntılarını Düzeltme

Huninin her aşamasında müşteri kaybını (drop-off) analiz edin. Hangi aşamada en çok kayıp yaşıyorsunuz? Nedenleri belirleyin ve düzeltin. E-posta otomasyonları ile soğuk lead'leri ısıtın. Retargeting ile düşünen müşterilere tekrar ulaşın.

Etkili bir satış hunisi, potansiyel müşterileri sistematik olarak müşteriye dönüştürür.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Müşteri Edinme ve Elde Tutma Stratejileri",
        titleEn: "Customer Acquisition and Retention Strategies",
        titleAz: "Müştəri Qazanma və Saxlama Strategiyaları",
        content: `# Müşteri Edinme ve Elde Tutma Stratejileri

Müşteri edinme ve elde tutma, sürdürülebilir büyüme için kritik öneme sahiptir. Bu derste, yeni müşteriler kazanmayı ve mevcut müşterileri tutmayı öğreneceksiniz.

## Müşteri Edinme Stratejileri

İçerik pazarlaması, SEO ve sosyal medya, organik müşteri edinme için etkili yöntemlerdir. Ücretli reklamlar, hızlı sonuçlar için kullanılır. Referral programları, mevcut müşterilerinizi yeni müşteriler getirmeye teşvik eder. Partnerlikler, yeni kitlelere ulaşmanızı sağlar.

## Müşteri Edinme Maliyeti (CAC) Optimizasyonu

CAC'inizi düşürmek için dönüşüm oranlarını artırın. Landing page'leri optimize edin, net mesajlar kullanın ve hedefleme iyileştirin. Müşteri yaşam boyu değeri (LTV) yüksek segmentlere odaklanın. Organik kanallara yatırım yaparak uzun vadeli maliyetleri düşürün.

## Müşteri Tutma Stratejileri

Müşteri memnuniyeti, elde tutmanın temelidir. Ürün kalitesi, müşteri desteği ve kullanıcı deneyimi üzerinde çalışın. Sadakat programları, müşterileri tekrar satın almaya teşvik eder. Düzenli iletişim, ilişkiyi güçlendirir.

## Churn Rate (Müşteri Kayıp Oranı) Azaltma

Churn nedenlerini analiz edin. Müşteri çıkış anketleri yapın. Erken uyarı sinyallerini belirleyin (aktivite düşüşü, destek talepleri). Proaktif olarak sorunları çözün. Churn'i azaltmak, LTV'yi artırır ve CAC'i düşürür.

Müşteri edinme ve tutma dengesi, sağlıklı büyüme için kritiktir.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 25
      }
    ]
  },
  pitch: {
    key: "pitch_preparation_training",
    titleTr: "Pitch Hazırlama Eğitimi",
    titleEn: "Pitch Preparation Training",
    titleAz: "Pitch Hazırlığı Təhsili",
    descriptionTr: "Etkili pitch sunumları, yatırımcı sunumu tasarımı, soru-cevap hazırlığı ve sahne performansı üzerine kapsamlı eğitim.",
    descriptionEn: "Comprehensive training on effective pitch presentations, investor slide design, Q&A preparation, and stage performance.",
    descriptionAz: "Effektiv pitch təqdimatları, investor slayd dizaynı, sual-cavab hazırlığı və səhnə performansı üzrə tam təhsil.",
    category: "pitch_investor",
    lessons: [
      {
        titleTr: "Etkili Bir Pitch Sunumunun Anatomisi",
        titleEn: "Anatomy of an Effective Pitch Presentation",
        titleAz: "Effektiv Pitch Təqdimatının Anatomiyası",
        content: `# Etkili Bir Pitch Sunumunun Anatomisi

Başarılı bir pitch sunumu, yatırımcıyı ikna etmek ve yatırım almak için kritik öneme sahiptir. Bu derste, etkili bir pitch'in temel bileşenlerini öğreneceksiniz.

## Pitch'in Temel Bileşenleri

Güçlü bir pitch, problem, çözüm, pazar, iş modeli, rekabet, ekip ve finansal talep bölümlerini içerir. Her bölüm, yatırımcının kritik sorularına cevap vermelidir. Pitch'iniz, hikaye anlatımı akışında olmalı ve mantıksal bir bütünlük sunmalıdır.

## Açılış (Hook)

İlk 30 saniye, yatırımcının dikkatini çekmek için kritiktir. Şok edici bir istatistik, güçlü bir soru veya ilgi çekici bir hikaye ile başlayın. Açılış, yatırımcının "Devam etmemi istiyorlar" hissetmesini sağlamalıdır.

## Problem ve Çözüm

Problem bölümünde, müşterinizin gerçek ve acil sorununu açıklayın. Pazar büyüklüğünü ve sorunun ciddiyetini gösterin. Çözüm bölümünde, ürün/hizmetinizin bu sorunu nasıl çözdüğünü netleştirin. Benzersiz değerinizi vurgulayın.

## Pazar ve İş Modeli

Pazar fırsatını, TAM (Total Addressable Market), SAM (Serviceable Addressable Market) ve SOM (Serviceable Obtainable Market) ile gösterin. İş modelinizi, gelir akışlarını ve karlılık potansiyelini açıklayın. Ölçeklenebilirliğinizi vurgulayın.

Etkili bir pitch, yatırımcının güvenini kazanır ve yatırım fırsatını ikna edici bir şekilde sunar.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Problem-Çözüm-Pazar Anlatısı Kurma",
        titleEn: "Building Problem-Solution-Market Narrative",
        titleAz: "Problem-Həll-Bazar Narrativi Qurmaq",
        content: `# Problem-Çözüm-Pazar Anlatısı Kurma

Güçlü bir anlatı, pitch'inizin etkisini önemli ölçüde artırır. Bu derste, ikna edici bir problem-çözüm-pazar hikayesi oluşturmayı öğreneceksiniz.

## Problem Hikayesi

Problem bölümünde, müşterinizin acısını gerçekten hissettirin. Gerçek müşteri hikayeleri, anketler ve veriler kullanın. "Şu anda X müşterileri, Y sorununu yaşıyor ve bu onlara Z maliyetine neden oluyor" formatında net bir ifade kullanın. Problemin büyüklüğünü ve aciliyetini gösterin.

## Çözüm Hikayesi

Çözümünüzü, müşterinin dilinden anlatın. Teknik özellikler yerine, müşteriye sağladığı faydaya odaklanın. "Ürünümüz, müşterinin X sorununu Y şekilde çözer ve Z faydası sağlar" formatında açıklayın. Önceki çözümlerin eksikliklerini ve sizin benzersizliğinizi vurgulayın.

## Pazar Fırsatı Hikayesi

Pazar fırsatını, büyüme potansiyeli ve trendlerle anlatın. "Pazar şu anda X büyüklüğünde ve Y büyüme oranı ile Z'ye ulaşacak" şeklinde ifade edin. Neden şimdi doğru zaman olduğunu açıklayın. Pazarın büyüklüğü, yatırımın potansiyel getirisini gösterir.

## Hikaye Akışı

Problem-çözüm-pazar anlatısını, mantıksal bir akışla birleştirin. Her bölüm bir öncekine bağlanmalıdır. Yatırımcının "Bu mantıklı, devam et" demesini sağlayın. Hikaye anlatımı, yatırımcının pitch'inizi hatırlamasını kolaylaştırır.

Güçlü bir anlatı, pitch'inizi sıradan bir sunumdan ikna edici bir hikayeye dönüştürür.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 15
      },
      {
        titleTr: "Slayt Tasarımı ve Görsel İletişim",
        titleEn: "Slide Design and Visual Communication",
        titleAz: "Slayd Dizaynı və Visual İletişim",
        content: `# Slayt Tasarımı ve Görsel İletişim

Görsel tasarım, pitch'inizin etkisini önemli ölçüde artırır. Bu derste, etkili slayt tasarımı ve görsel iletişim ilkelerini öğreneceksiniz.

## Slayt Tasarım İlkeleri

Her slayt, tek bir ana fikir odaklı olmalıdır. Metni minimumda tutun, görselleri kullanın. "Less is more" ilkesini uygulayın. Okunabilir fontlar, yeterli boşluk ve tutarlı renk paleti kullanın. Yatırımcı, slaydı okumak değil, sunumu dinlemek istiyor.

## Görsel Hiyerarşi

Görsel hiyerarşi, yatırımcının dikkatini yönlendirir. Başlık, alt başlık ve destekleyici metin boyutlarını farklılaştırın. Önemli noktaları vurgulamak için renk veya kalınlık kullanın. Görseller, metni desteklemeli ve karmaşık kavramları basitleştirmeli.

## Veri Görselleştirme

Verileri, grafikler ve diyagramlar ile görselleştirin. Karmaşık tablolar yerine, basit ve anlaşılır grafikler kullanın. Trendleri göstermek için çizgi grafikler, karşılaştırmalar için sütun grafikler tercih edin. Veri görselleştirmesi, yatırımcının veriyi hızlıca anlamasını sağlar.

## Marka Tutarlılığı

Slaytlarınız, markanızın kimliğini yansıtmalıdır. Logo, renkler ve fontlar tutarlı olmalıdır. Profesyonel ve güven veren bir tasarım, yatırımcının güvenini artırır. Amatör tasarımlar, işletmenizin ciddiyetini zedeleyebilir.

Etkili görsel iletişim, pitch'inizin anlaşılmasını ve hatırlanmasını kolaylaştırır.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Yatırımcı Sorularına Hazırlık (Q&A)",
        titleEn: "Preparing for Investor Questions (Q&A)",
        titleAz: "İnvestor Suallarına Hazırlıq (Q&A)",
        content: `# Yatırımcı Sorularına Hazırlık (Q&A)

Yatırımcı soruları, pitch'inizin en kritik bölümüdür. Bu derste, yaygın yatırımcı sorularına hazırlanmayı ve etkili cevaplar vermeyi öğreneceksiniz.

## Yaygın Yatırımcı Soruları

Yatırımcılar genellikle şu soruları sorar: "Pazar büyüklüğünü nasıl kanıtlıyorsunuz?", "Rakiplerinizden farkınız nedir?", "Gelir modeliniz nedir?", "Ekibiniz neden bu işi başaracak?", "Ne kadar yatırım istiyorsunuz ve ne için kullanacaksınız?". Bu sorulara önceden hazırlanın.

## Soruları Anlama

Yatırımcının sorusunun arkasındaki endişeyi anlamaya çalışın. "Neden bu soruyu soruyorlar?" diye düşünün. Bu, daha derin ve ikna edici cevaplar vermenizi sağlar. Soruyu yeniden ifade ederek anladığınızı gösterin.

## Cevap Verme Stratejisi

Net ve kısa cevaplar verin. Veri ve örneklerle destekleyin. Emin olmadığınız konularda "Bunu araştırıp size döneceğim" deyin. Yalan veya abartılı cevaplardan kaçının. Dürüstlük, yatırımcılarla güven ilişkisinin temelidir.

## Zor Sorulara Yaklaşım

Zor soruları savunmacı değil, yapıcı bir yaklaşımla karşılayın. "Harika bir soru, bunu düşündüğümüz için teşekkürler" diyerek başlayın. Sorunun arkasındaki endişeyi anladığınızı gösterin ve çözümünüzü açıklayın. Bilmediğiniz bir soru için dürüstçe itiraf edin.

İyi bir Q&A hazırlığı, yatırımcının güvenini kazanır ve yatırım şansınızı artırır.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Sahne Performansı ve Beden Dili",
        titleEn: "Stage Performance and Body Language",
        titleAz: "Səhnə Performansı və Bədən Dili",
        content: `# Sahne Performansı ve Beden Dili

Sahne performansı, pitch'inizin etkisini önemli ölçüde artırır. Bu derste, etkili sahne performansı ve beden dili kullanmayı öğreneceksiniz.

## Hazırlık ve Pratik

Pitch'inizi en az 10-20 kez pratik yapın. Ayna önünde, arkadaşlarınızla veya kameraya kaydederek pratik yapın. Zamanlayıcı kullanarak sürenizi kontrol edin. Pratik, doğal ve kendinden emin bir performans için kritiktir.

## Ses ve Konuşma Hızı

Ses tonunuzu değiştirerek ilgiyi canlı tutun. Önemli noktalarda sesinizi yükseltin veya alçaltın. Konuşma hızınızı kontrol edin - çok hızlı konuşmak anlaşılmayı zorlaştırır. Nefes almayı unutmayın ve ara verin.

## Beden Dili

Göz teması kurun, tüm odada dağılmış bir şekilde. Duruşunuz dik ve kendinden emin olmalıdır. Ellerinizi açık ve jestleri doğal kullanın. Elleri cepte veya kolları kavuşturarak durmaktan kaçının. Gülümsemeyi unutmayın.

## Sahne Kullanımı

Sahneyi etkin kullanın. Statik durmak yerine, hafif hareketlerle enerji katın. Slaytlara bakmak yerine, yatırımcılara odaklanın. Not kartları kullanıyorsanız, sadece kısa hatırlatıcılar olarak kullanın.

Etkili sahne performansı, yatırımcının ilgisini canlı tutar ve pitch'inizi ikna edici hale getirir.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 15
      }
    ]
  },
  business_model: {
    key: "business_model_training",
    titleTr: "İş Modeli Eğitimi",
    titleEn: "Business Model Training",
    titleAz: "Biznes Modeli Təhsili",
    descriptionTr: "Business Model Canvas, gelir modelleri, maliyet yapısı, ortaklıklar ve iş modeli doğrulama üzerine kapsamlı eğitim.",
    descriptionEn: "Comprehensive training on Business Model Canvas, revenue models, cost structure, partnerships, and business model validation.",
    descriptionAz: "Business Model Canvas, gəlir modelləri, xərc strukturu, tərəfdaşlıqlar və biznes modeli təsdiqləmə üzrə tam təhsil.",
    category: "startup_management",
    lessons: [
      {
        titleTr: "Business Model Canvas'a Giriş",
        titleEn: "Introduction to Business Model Canvas",
        titleAz: "Business Model Canvas-a Giriş",
        content: `# Business Model Canvas'a Giriş

Business Model Canvas, iş modelinizi görsel ve yapılandırılmış bir şekilde tanımlamanızı sağlayan güçlü bir araçtır. Bu derste, Canvas'ın 9 yapı taşını ve bunları nasıl kullanacağınızı öğreneceksiniz.

## Canvas'ın 9 Yapı Taşı

Business Model Canvas, 9 yapı taşından oluşur: Değer Önerisi, Müşteri Segmentleri, Kanallar, Müşteri İlişkileri, Gelir Akışları, Temel Kaynaklar, Temel Faaliyetler, Temel Ortaklıklar ve Maliyet Yapısı. Her yapı taşı, iş modelinizin farklı bir yönünü temsil eder.

## Değer Önerisi ve Müşteri Segmentleri

Değer Önerisi, müşterilerinize sunduğunuz benzersiz değeri tanımlar. Müşteri Segmentleri, hedeflediğiniz farklı müşteri gruplarını belirler. Her segment için özel değer önerileri geliştirin. Bu ikili, iş modelinizin temelini oluşturur.

## Kanallar ve Müşteri İlişkileri

Kanallar, ürün/hizmetinizi müşterilere ulaştırmanın yollarıdır (doğrudan satış, e-ticaret, distribütörler). Müşteri İlişkileri, müşterilerle kurduğunuz bağın türünü belirler (kişisel, otomatik, topluluk). Her segment için en etkili kanal ve ilişki türünü seçin.

## Gelir Akışları ve Maliyet Yapısı

Gelir Akışları, işletmenizin nasıl para kazandığını tanımlar (satış, abonelik, lisans). Maliyet Yapısı, işletmenizi faaliyette tutmak için gereken maliyetleri gösterir (sabit maliyetler, değişken maliyetler). Karlılık için gelir akışlarının maliyet yapısından büyük olması gerekir.

Business Model Canvas, iş modelinizi hızlıca görselleştirmenizi ve iyileştirmenizi sağlar.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 25
      },
      {
        titleTr: "Gelir Modelleri ve Fiyatlandırma Stratejileri",
        titleEn: "Revenue Models and Pricing Strategies",
        titleAz: "Gəlir Modelləri və Qiymətləndirmə Strategiyaları",
        content: `# Gelir Modelleri ve Fiyatlandırma Stratejileri

Doğru gelir modeli ve fiyatlandırma stratejisi, işletmenizin sürdürülebilirliği için kritiktir. Bu derste, farklı gelir modellerini ve fiyatlandırma yaklaşımlarını öğreneceksiniz.

## Gelir Modelleri

Tek seferlik satış, ürün başına gelir sağlar. Abonelik modeli, düzenli ve öngörülebilir gelir akışı yaratır. Freemium modeli, temel özellikleri ücretsiz sunarken premium özellikler için ücret alır. Lisanslama, fikri mülkiyetinizi kullanım hakkı için ücretlendirir. Her modelin avantajları ve dezavantajları vardır.

## Fiyatlandırma Stratejileri

Maliyet tabanlı fiyatlandırma, maliyetinize kar marjı ekler. Değer tabanlı fiyatlandırma, müşteriye sağladığınız değere göre fiyat belirler. Rakip tabanlı fiyatlandırma, piyasa ortalamasını kullanır. Dinamik fiyatlandırma, talebe ve koşullara göre fiyatı değiştirir.

## Fiyatlandırma Psikolojisi

Fiyatlandırma, sadece matematiksel bir hesap değil, psikolojik bir karar sürecidir. 9.99 TL, 10 TL'den daha ucuz algılanır. Premium fiyatlandırma, kalite algısını artırır. Paketleme, müşterinin daha yüksek paketi seçmesini teşvik edebilir.

## Fiyat Testleri

Fiyatlandırmanızı A/B testleri ile test edin. Farklı fiyat noktalarını deneyin ve dönüşüm oranlarını ölçün. Müşteri geri bildirimlerini toplayın. Fiyatlandırma, statik değil, dinamik bir süreçtir. Pazar koşullarına göre ayarlayın.

Doğru gelir modeli ve fiyatlandırma, karlılığınızı ve rekabet avantajınızı belirler.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Maliyet Yapısı ve Kaynak Planlaması",
        titleEn: "Cost Structure and Resource Planning",
        titleAz: "Xərc Strukturu və Resurs Planlaşdırma",
        content: `# Maliyet Yapısı ve Kaynak Planlaması

Etkili maliyet yönetimi, işletmenizin karlılığını artırır. Bu derste, maliyet yapısını analiz etmeyi ve kaynakları verimli planlamayı öğreneceksiniz.

## Sabit ve Değişken Maliyetler

Sabit maliyetler (kira, maaşlar, sigorta), üretim hacminden bağımsızdır. Değişken maliyetler (hammadde, kargo, komisyon), üretim hacmiyle artar. Bu ayrım, ölçek ekonomisini anlamak için kritiktir. Sabit maliyetlerin yüksek olduğu işletmelerde, yüksek hacim karlılığı artırır.

## Maliyet Yapısı Analizi

Maliyet yapınızı detaylı olarak analiz edin. Her maliyet kaleminin ne kadar olduğunu, ne için harcandığını ve optimize edilebilir olup olmadığını belirleyin. Pareto analizi ile en büyük maliyet kalemlerine odaklanın. %20 maliyet kalemi %80 toplam maliyeti oluşturabilir.

## Kaynak Planlaması

İnsan kaynakları, teknoloji, tesis ve finansman gibi kaynaklarınızı planlayın. Her kaynağın ne zaman ve ne kadar ihtiyaç duyulduğunu belirleyin. Kaynak darboğazlarını önceden tespit edin ve çözüm yollarını araştırın. Kaynak planlaması, büyüme stratejinizin temelidir.

## Maliyet Optimizasyonu

Maliyetleri optimize etmek için otomasyon, dış kaynak kullanımı (outsourcing) ve tedarikçi anlaşmalarını değerlendirin. Envanteri minimize edin, verimsiz süreçleri ortadan kaldırın. Maliyet düşürme, kaliteyi veya müşteri deneyimini zedelememelidir.

Etkili maliyet yönetimi, karlılığınızı artırır ve rekabet avantajı sağlar.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "Ortaklıklar ve Dağıtım Kanalları",
        titleEn: "Partnerships and Distribution Channels",
        titleAz: "Tərəfdaşlıqlar və Distribyusiya Kanalları",
        content: `# Ortaklıklar ve Dağıtım Kanalları

Stratejik ortaklıklar ve etkili dağıtım kanalları, işletmenizin büyümesini hızlandırır. Bu derste, doğru ortaklıkları kurmayı ve kanalları seçmeyi öğreneceksiniz.

## Ortaklık Türleri

Stratejik ortaklıklar, karşılıklı fayda sağlayan uzun vadeli ilişkilerdir. Dağıtım ortaklıkları, ürününüzü pazara ulaştırmanıza yardımcı olur. Teknoloji ortaklıkları, ürün entegrasyonlarını kolaylaştırır. Pazarlama ortaklıkları, marka bilinirliğini artırır. Her türün farklı faydaları vardır.

## Ortaklık Seçimi

Doğru ortak, hedef kitlenize ulaşmanıza yardımcı olur, değer katar ve güvenilir bir markadır. Ortakın müşteri tabanı, itibarı ve kapasitesini değerlendirin. Karşılıklı fayda (win-win) sağlayan ilişkiler sürdürülebilir olur. Ortaklık anlaşmasını net ve açık bir şekilde hazırlayın.

## Dağıtım Kanalları

Doğrudan satış, en yüksek kar marjı sağlar ancak operasyonel yük gerektirir. E-ticaret, küresel erişim sağlar ve 7/24 satış imkanı sunar. Distribütörler, yerel pazar bilgisi ve dağıtım ağı sağlar. Perakende, marka görünürlüğünü artırır. Her kanalın avantajları ve maliyetleri vardır.

## Çok Kanallı Strateji

Birden fazla kanal kullanarak müşterilere farklı yollardan ulaşın. Kanallar arasında tutarlı bir müşteri deneyimi sağlayın. Her kanalın performansını ölçün ve optimize edin. Çok kanallı yaklaşım, müşteri edinme fırsatlarını artırır ve riskleri dağıtır.

Stratejik ortaklıklar ve doğru kanallar, büyümenizi hızlandırır.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 20
      },
      {
        titleTr: "İş Modelini Doğrulama ve Pivot Stratejileri",
        titleEn: "Business Model Validation and Pivot Strategies",
        titleAz: "Biznes Modelini Təsdiqləmə və Pivot Strategiyaları",
        content: `# İş Modelini Doğrulama ve Pivot Stratejileri

İş modelinizi doğrulamak ve gerektiğinde pivot yapmak, girişimciliğin kritik becerileridir. Bu derste, iş modelinizi test etmeyi ve pivot stratejilerini öğreneceksiniz.

## İş Modeli Doğrulama

İş modelinizi doğrulamak için müşteri görüşmeleri, prototip testleri ve pilot lansmanlar yapın. Varsayımlarınızı test edin - gerçek müşterilerden geri bildirim alın. MVP (Minimum Viable Product) ile temel değer önerisini hızlıca test edin. Veriye dayalı kararlar alın.

## Doğrulama Metrikleri

Dönüşüm oranları, müşteri edinme maliyeti (CAC), müşteri yaşam boyu değeri (LTV) ve churn rate gibi metrikleri takip edin. Bu metrikler, iş modelinizin çalışıp çalışmadığını gösterir. Hedeflerinizi belirleyin ve ilerlemeyi düzenli olarak ölçün.

## Pivot Belirtileri

Düşük dönüşüm oranları, yüksek churn rate, sürekli nakit akışı sorunları ve müşteri geri bildirimlerinde tutarsızlık, pivot sinyali olabilir. Rakiplerinizin hızlı büyümesi veya pazar koşullarının değişmesi de gerektirebilir. Bu belirtileri dikkatle izleyin.

## Pivot Stratejileri

Pivot, iş modelinin temel bir yönünü değiştirmektir. Müşteri segmenti, değer önerisi, gelir modeli veya dağıtım kanalı değişikliği olabilir. Pivot kararını veri ve müşteri geri bildirimlerine dayandırın. Pivot, başarısızlık değil, öğrenme ve adaptasyon sürecidir.

İş modeli doğrulama ve pivot, sürdürülebilir büyüme için kritiktir.`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        estimatedMinutes: 25
      }
    ]
  }
};

// Exam questions data
const examQuestions = {
  finance: [
    {
      questionText: "Gelir (Revenue) kavramı aşağıdakilerden hangisini ifade eder?",
      optionA: "İşletmenin harcadığı toplam maliyet",
      optionB: "Ürün veya hizmetlerden elde edilen toplam para",
      optionC: "Nakit rezervlerin toplamı",
      optionD: "Borçların toplamı",
      correctOption: "B",
      explanation: "Gelir, işletmenin ürün veya hizmetlerinden elde ettiği toplam para miktarını ifade eder."
    },
    {
      questionText: "Brüt kâr ile net kâr arasındaki temel fark nedir?",
      optionA: "Brüt kâr vergileri içerir, net kâr içermez",
      optionB: "Net kâr sadece doğrudan üretim maliyetlerini içerir",
      optionC: "Brüt kâr sadece doğrudan üretim maliyetlerini içerir, net kâr tüm operasyonel giderleri de içerir",
      optionD: "Aralarında fark yoktur",
      correctOption: "C",
      explanation: "Brüt kâr sadece doğrudan üretim maliyetlerini düşürerek hesaplanırken, net kâr tüm operasyonel giderleri de içerir."
    },
    {
      questionText: "CAC (Müşteri Edinme Maliyeti) nasıl hesaplanır?",
      optionA: "Toplam gelir / Müşteri sayısı",
      optionB: "Pazarlama harcamaları / Yeni müşteri sayısı",
      optionC: "Toplam giderler / Müşteri sayısı",
      optionD: "Satış maliyetleri / Toplam müşteri sayısı",
      correctOption: "B",
      explanation: "CAC, pazarlama ve satış harcamalarının yeni kazanılan müşteri sayısına bölünmesiyle hesaplanır."
    },
    {
      questionText: "LTV/CAC oranı ne olmalıdır?",
      optionA: "1:1",
      optionB: "2:1",
      optionC: "3:1 veya daha yüksek",
      optionD: "5:1 veya daha düşük",
      correctOption: "C",
      explanation: "Sağlıklı bir iş modeli için LTV/CAC oranı 3:1 veya daha yüksek olmalıdır."
    },
    {
      questionText: "Burn rate nedir?",
      optionA: "Yıllık kar artışı hızı",
      optionB: "Aylık nakit tüketim hızı",
      optionC: "Müşteri kayıp oranı",
      optionD: "Üretim hızı",
      correctOption: "B",
      explanation: "Burn rate, işletmenizin aylık nakit tüketim hızını ifade eder."
    },
    {
      questionText: "Runway nasıl hesaplanır?",
      optionA: "Aylık gelir / Burn rate",
      optionB: "Mevcut nakit / Burn rate",
      optionC: "Toplam giderler / Nakit",
      optionD: "Yatırım tutarı / Aylık kar",
      correctOption: "B",
      explanation: "Runway, mevcut nakit rezervlerinin aylık burn rate'e bölünmesiyle hesaplanır."
    },
    {
      questionText: "Finansal projeksiyonlarda hangi senaryolar sunulmalıdır?",
      optionA: "Sadece en iyi senaryo",
      optionB: "Sadece beklenen senaryo",
      optionC: "İyi, beklenen ve kötü senaryolar",
      optionD: "Sadece kötü senaryo",
      correctOption: "C",
      explanation: "Yatırımcılara farklı senaryolar (iyi, beklenen, kötü) sunarak risk yönetimi yeteneği gösterilir."
    },
    {
      questionText: "Karlı bir işletmenin nakit akışı sorunu yaşayabilir mi?",
      optionA: "Hayır, asla",
      optionB: "Evet, alacakların tahsilat gecikmesi nedeniyle",
      optionC: "Sadece iflas durumunda",
      optionD: "Evet, ancak bu çok nadirdir",
      correctOption: "B",
      explanation: "Karlı bir işletme, müşterilerden alacakların zamanında tahsil edilememesi nedeniyle nakit akışı sorunu yaşayabilir."
    }
  ],
  sales_marketing: [
    {
      questionText: "Hedef pazar tanımlamak için hangi özellikler kullanılır?",
      optionA: "Sadece demografik özellikler",
      optionB: "Demografik, psikografik ve davranışsal özellikler",
      optionC: "Sadece psikografik özellikler",
      optionD: "Sadece coğrafi özellikler",
      correctOption: "B",
      explanation: "Hedef pazar tanımlamak için demografik, psikografik ve davranışsal özelliklerin kombinasyonu kullanılır."
    },
    {
      questionText: "Pareto prensibine göre, gelirin çoğu genellikle hangi müşteri segmentinden gelir?",
      optionA: "%80 müşteriden",
      optionB: "%20 müşteriden",
      optionC: "%50 müşteriden",
      optionD: "%10 müşteriden",
      correctOption: "B",
      explanation: "Pareto prensibine göre, %20 müşteriden %80 gelir gelebilir."
    },
    {
      questionText: "Değer önerisi (Value Proposition) nedir?",
      optionA: "Ürünün fiyatı",
      optionB: "Müşteriye sağlanan benzersiz değerin açıklaması",
      optionC: "Pazarlama bütçesi",
      optionD: "Rakip analizi",
      correctOption: "B",
      explanation: "Değer önerisi, müşteriye sağlanan benzersiz değeri açıklayan net bir ifadedir."
    },
    {
      questionText: "SEO'nun açılımı nedir?",
      optionA: "Search Engine Optimization",
      optionB: "Social Engagement Optimization",
      optionC: "Sales Effectiveness Optimization",
      optionD: "Service Experience Optimization",
      correctOption: "A",
      explanation: "SEO, Search Engine Optimization (Arama Motoru Optimizasyonu) anlamına gelir."
    },
    {
      questionText: "Satış hunisinin (Sales Funnel) ilk aşaması nedir?",
      optionA: "Eylem",
      optionB: "Düşünme",
      optionC: "Farkındalık",
      optionD: "İlgi",
      correctOption: "C",
      explanation: "Satış hunisinin ilk aşaması farkındalık aşamasıdır."
    },
    {
      questionText: "Lead magnet nedir?",
      optionA: "Ücretsiz bir ürün",
      optionB: "İletişim bilgilerini toplamak için sunulan değerli içerik",
      optionC: "Bir reklam kampanyası",
      optionD: "Müşteri hizmetleri",
      correctOption: "B",
      explanation: "Lead magnet, iletişim bilgilerini toplamak için sunulan değerli içeriktir (e-kitap, webiner vb.)."
    },
    {
      questionText: "Churn rate nedir?",
      optionA: "Yeni müşteri edinme hızı",
      optionB: "Müşteri kayıp oranı",
      optionC: "Satış artışı",
      optionD: "Pazarlama ROI'si",
      correctOption: "B",
      explanation: "Churn rate, belirli bir dönemde müşteri kayıp oranını ifade eder."
    },
    {
      questionText: "ROAS nedir?",
      optionA: "Return on Advertising Spend",
      optionB: "Rate of Annual Sales",
      optionC: "Revenue on Asset Sales",
      optionD: "Return on Annual Subscription",
      correctOption: "A",
      explanation: "ROAS, Return on Advertising Spend (Reklam Harcamasının Getirisi) anlamına gelir."
    }
  ],
  pitch: [
    {
      questionText: "Pitch'in ilk 30 saniyesi ne kadar önemlidir?",
      optionA: "Çok önemli, yatırımcının dikkatini çekmek için kritik",
      optionB: "Önemli değil, son kısımlar daha önemlidir",
      optionC: "Sadece teknik detaylar önemlidir",
      optionD: "Sadece finansal projeksiyonlar önemlidir",
      correctOption: "A",
      explanation: "Pitch'in ilk 30 saniyesi, yatırımcının dikkatini çekmek için kritik öneme sahiptir."
    },
    {
      questionText: "TAM, SAM ve SOM neyi ifade eder?",
      optionA: "Üç farklı gelir modeli",
      optionB: "Pazar büyüklüğünün farklı seviyeleri",
      optionC: "Üç farklı müşteri segmenti",
      optionD: "Üç farklı rakip analizi",
      correctOption: "B",
      explanation: "TAM (Total Addressable Market), SAM (Serviceable Addressable Market) ve SOM (Serviceable Obtainable Market), pazar büyüklüğünün farklı seviyelerini ifade eder."
    },
    {
      questionText: "Pitch slaytlarında hangi ilke uygulanmalıdır?",
      optionA: "Her slayda mümkün olduğunca çok bilgi",
      optionB: "Less is more - az ve öz",
      optionC: "Sadece teknik detaylar",
      optionD: "Sadece finansal veriler",
      correctOption: "B",
      explanation: "Pitch slaytlarında 'Less is more' ilkesi uygulanmalı, az ve öz bilgi sunulmalıdır."
    },
    {
      questionText: "Yatırımcıların en çok sorduğu sorulardan biri hangisidir?",
      optionA: "Ofisiniz nerede?",
      optionB: "Rakiplerinizden farkınız nedir?",
      optionC: "Hangi renkleri kullanıyorsunuz?",
      optionD: "Kaç çalışanınız var?",
      correctOption: "B",
      explanation: "Yatırımcılar genellikle 'Rakiplerinizden farkınız nedir?' sorusunu sorar."
    },
    {
      questionText: "Zor bir yatırımcı sorusuna nasıl cevap verilmelidir?",
      optionA: "Savunmacı bir şekilde",
      optionB: "Yapıcı ve dürüst bir şekilde",
      optionC: "Cevap vermemek",
      optionD: "Abartılı bir şekilde",
      correctOption: "B",
      explanation: "Zor sorulara yapıcı ve dürüst bir şekilde cevap verilmelidir."
    },
    {
      questionText: "Pitch performansında göz teması neden önemlidir?",
      optionA: "Güven ve bağ kurmak için",
      optionB: "Sadece alışkanlık olduğu için",
      optionC: "Zaman geçirmek için",
      optionD: "Gereksizdir",
      correctOption: "A",
      explanation: "Göz teması, yatırımcıyla güven ve bağ kurmak için önemlidir."
    },
    {
      questionText: "Pitch süresi genellikle ne kadar olmalıdır?",
      optionA: "5 dakika",
      optionB: "10-20 dakika",
      optionC: "1 saat",
      optionD: "2 saat",
      correctOption: "B",
      explanation: "Pitch süresi genellikle 10-20 dakika arasında olmalıdır."
    },
    {
      questionText: "Pitch'te problem bölümü neyi açıklamalıdır?",
      optionA: "Sadece teknik detayları",
      optionB: "Müşterinin gerçek ve acil sorununu",
      optionC: "Sadece finansal projeksiyonları",
      optionD: "Sadece ekip bilgilerini",
      correctOption: "B",
      explanation: "Problem bölümü, müşterinin gerçek ve acil sorununu açıklamalıdır."
    }
  ],
  business_model: [
    {
      questionText: "Business Model Canvas kaç yapı taşından oluşur?",
      optionA: "5",
      optionB: "7",
      optionC: "9",
      optionD: "12",
      correctOption: "C",
      explanation: "Business Model Canvas 9 yapı taşından oluşur."
    },
    {
      questionText: "Freemium gelir modeli nedir?",
      optionA: "Sadece ücretli ürün satışı",
      optionB: "Temel özellikler ücretsiz, premium özellikler ücretli",
      optionC: "Sadece abonelik modeli",
      optionD: "Sadece lisanslama modeli",
      correctOption: "B",
      explanation: "Freemium modeli, temel özellikleri ücretsiz sunarken premium özellikler için ücret alır."
    },
    {
      questionText: "Sabit maliyetler ile değişken maliyetler arasındaki fark nedir?",
      optionA: "Sabit maliyetler üretim hacmiyle artar",
      optionB: "Değişken maliyetler üretim hacminden bağımsızdır",
      optionC: "Sabit maliyetler üretim hacminden bağımsızdır",
      optionD: "Aralarında fark yoktur",
      correctOption: "C",
      explanation: "Sabit maliyetler üretim hacminden bağımsızken, değişken maliyetler üretim hacmiyle artar."
    },
    {
      questionText: "Pareto analizi maliyet yönetiminde neyi gösterir?",
      optionA: "Tüm maliyetler eşittir",
      optionB: "%20 maliyet kalemi %80 toplam maliyeti oluşturabilir",
      optionC: "Sadece sabit maliyetler önemlidir",
      optionD: "Sadece değişken maliyetler önemlidir",
      correctOption: "B",
      explanation: "Pareto analizi, %20 maliyet kaleminin %80 toplam maliyeti oluşturabileceğini gösterir."
    },
    {
      questionText: "MVP (Minimum Viable Product) nedir?",
      optionA: "En pahalı ürün versiyonu",
      optionB: "Temel değer önerisini test etmek için minimum ürün",
      optionC: "Son ürün versiyonu",
      optionD: "Piyasada olmayan bir ürün",
      correctOption: "B",
      explanation: "MVP, temel değer önerisini hızlıca test etmek için minimum işlevselliğe sahip üründür."
    },
    {
      questionText: "Pivot nedir?",
      optionA: "İşletmenin kapatılması",
      optionB: "İş modelinin temel bir yönünün değiştirilmesi",
      optionC: "Yeni bir çalışan işe almak",
      optionD: "Fiyat artışı",
      correctOption: "B",
      explanation: "Pivot, iş modelinin temel bir yönünü (müşteri segmenti, değer önerisi vb.) değiştirmektir."
    },
    {
      questionText: "Dağıtım kanalları arasında hangisi en yüksek kar marjını sağlar?",
      optionA: "Distribütörler",
      optionB: "Perakende",
      optionC: "Doğrudan satış",
      optionD: "E-ticaret",
      correctOption: "C",
      explanation: "Doğrudan satış, aracıları ortadan kaldırdığı için en yüksek kar marjını sağlar."
    },
    {
      questionText: "İş modeli doğrulama için hangi yöntem kullanılır?",
      optionA: "Sadece varsayımlara dayanarak",
      optionB: "Müşteri görüşmeleri ve prototip testleri",
      optionC: "Sadece rakip analizi",
      optionD: "Sadece internet araştırması",
      correctOption: "B",
      explanation: "İş modeli doğrulama için müşteri görüşmeleri, prototip testleri ve pilot lansmanlar kullanılır."
    }
  ]
};

// Simulation task content
const simulationTasks = {
  idea_development: [
    {
      titleTr: "Problem Tanımı",
      titleEn: "Problem Definition",
      titleAz: "Problem Tərifi",
      scenarioText: "Şirketiniz için bir problem tanımı yapın: hedef kullanıcı grubunuzun karşılaştığı 3 temel sorunu listeleyin ve her biri için neden bu sorunun çözülmeye değer olduğunu açıklayın. Problemin büyüklüğünü ve aciliyetini vurgulayın. Müşteri görüşmelerinden veya pazar araştırmasından elde ettiğiniz verileri kullanarak problemin gerçekliğini destekleyin.",
      submissionType: "text_response",
      linkedBadgeKey: "problem_explorer",
      coinReward: 50
    },
    {
      titleTr: "Fikir Oluşturma",
      titleEn: "Idea Generation",
      titleAz: "Fikir Yaratma",
      scenarioText: "Tanımladığınız problemler için en az 5 farklı çözüm fikri üretin. Her fikri kısa bir paragraf açıklayın. Fikirleriniz yaratıcı olsun ancak pratik uygulanabilirliği de göz önünde bulundurun. Fikirler arasında hangisinin en yenilikçi ve hangisinin en kolay uygulanabilir olduğunu değerlendirin.",
      submissionType: "text_response",
      linkedBadgeKey: "idea_generator",
      coinReward: 75
    },
    {
      titleTr: "Çözüm Tasarımı",
      titleEn: "Solution Design",
      titleAz: "Həll Dizaynı",
      scenarioText: "Seçtiğiniz en güçlü fikri detaylı bir çözüm tasarımına dönüştürün. Çözümün temel özelliklerini, kullanıcı arayüzünü ve teknik mimariyi (basit bir şekilde) açıklayın. Çözümün kullanıcıya nasıl değer katacağını ve problemin nasıl çözeceğini detaylandırın. Gerekirse basit bir wireframe veya mockup hazırlayın.",
      submissionType: "file_upload",
      linkedBadgeKey: "solution_designer",
      coinReward: 100
    },
    {
      titleTr: "Müşteri Analizi",
      titleEn: "Customer Analysis",
      titleAz: "Müştəri Analizi",
      scenarioText: "Hedef müşteri segmentinizi derinlemesine analiz edin. Demografik özellikler, psikografik özellikler, davranışsal özellikler ve acı noktaları (pain points) belirleyin. İdeal müşteri profilini (persona) oluşturun. Müşterinizin şu anda problemi nasıl çözdüğünü ve çözümün yetersizliklerini açıklayın.",
      submissionType: "text_response",
      linkedBadgeKey: "customer_explorer",
      coinReward: 125
    },
    {
      titleTr: "Pazar Araştırması",
      titleEn: "Market Research",
      titleAz: "Bazar Araşdırması",
      scenarioText: "Pazarınızın büyüklüğünü araştırın. TAM (Total Addressable Market), SAM (Serviceable Addressable Market) ve SOM (Serviceable Obtainable Market) değerlerini tahmin edin. Pazar trendlerini, büyüme potansiyelini ve rekabet durumunu analiz edin. Rakiplerinizi belirleyin ve güçlü/zayıf yönlerini karşılaştırın.",
      submissionType: "text_response",
      linkedBadgeKey: "market_researcher",
      coinReward: 150
    },
    {
      titleTr: "İnovasyon Stratejisi",
      titleEn: "Innovation Strategy",
      titleAz: "İnnovasiya Strategiyası",
      scenarioText: "Çözümünüzün yenilikçi yönlerini ve sürdürülebilir rekabet avantajını (sustainable competitive advantage) belirleyin. Teknolojik, iş modeli veya pazar yenilikleri nelerdir? İnovasyonunuzu korumak için hangi stratejileri kullanacaksınız (patent, ticari sır, marka vb.)? Gelecekteki gelişme potansiyelini açıklayın.",
      submissionType: "text_response",
      linkedBadgeKey: "innovation_architect",
      coinReward: 300
    }
  ],
  startup_management: [
    {
      titleTr: "İş Modeli Canvas",
      titleEn: "Business Model Canvas",
      titleAz: "Biznes Modeli Canvas",
      scenarioText: "Girişiminiz için tam bir Business Model Canvas hazırlayın. 9 yapı taşını (Değer Önerisi, Müşteri Segmentleri, Kanallar, Müşteri İlişkileri, Gelir Akışları, Temel Kaynaklar, Temel Faaliyetler, Temel Ortaklıklar, Maliyet Yapısı) detaylı doldurun. Her yapı taşı için kısa açıklamalar ekleyin ve birbirleriyle olan ilişkileri gösterin.",
      submissionType: "file_upload",
      linkedBadgeKey: "business_model_designer",
      coinReward: 75
    },
    {
      titleTr: "MVP Geliştirme Planı",
      titleEn: "MVP Development Plan",
      titleAz: "MVP İnkişaf Planı",
      scenarioText: "Minimum Viable Product (MVP) için bir geliştirme planı hazırlayın. MVP'nin temel özelliklerini belirleyin ve önceliklendirin (MoSCoW yöntemini kullanabilirsiniz). Geliştirme sürecini aşamalara bölün, her aşama için tahmini süre ve kaynak gereksinimlerini belirtin. MVP'nin nasıl test edileceğini ve kullanıcı geri bildirimlerinin nasıl toplanacağını açıklayın.",
      submissionType: "text_response",
      linkedBadgeKey: "mvp_developer",
      coinReward: 100
    },
    {
      titleTr: "İlk Müşteri Kazanımı",
      titleEn: "First Customer Acquisition",
      titleAz: "İlk Müştəri Qazanımı",
      scenarioText: "İlk 10 müşterinizi kazanmak için bir strateji geliştirin. Hedef kitlenizi netleştirin, onlara nasıl ulaşacağınızı (kanallar) belirleyin. İlk müşterileri ikna etmek için özel teklifler veya programlar düşünebilirsiniz. Müşteri edinme maliyetini (CAC) tahmin edin ve ilk satış sürecini adım adım planlayın.",
      submissionType: "text_response",
      linkedBadgeKey: "first_customer_winner",
      coinReward: 125
    },
    {
      titleTr: "Operasyonel Planlama",
      titleEn: "Operational Planning",
      titleAz: "Əməliyyat Planlaşdırma",
      scenarioText: "Girişiminizin operasyonel süreçlerini planlayın. Günlük, haftalık ve aylık operasyonel faaliyetleri listeleyin. Hangi süreçler otomatize edilebilir, hangileri manuel yapılacak? Ekip yapısını ve rolleri belirleyin. Operasyonel KPI'ları (Key Performance Indicators) tanımlayın ve ölçüm yöntemlerini açıklayın.",
      submissionType: "text_response",
      linkedBadgeKey: "operations_expert",
      coinReward: 150
    },
    {
      titleTr: "Stratejik Planlama",
      titleEn: "Strategic Planning",
      titleAz: "Strategik Planlaşdırma",
      scenarioText: "Girişiminiz için 1-3-5 yıllık stratejik plan hazırlayın. Kısa, orta ve uzun vadeli hedefleri belirleyin. Her hedef için ölçülebilir KPI'lar tanımlayın. Büyüme stratejilerini (organik büyüme, satın alma, ortaklık vb.) açıklayın. Riskleri belirleyin ve risk azaltma stratejileri geliştirin.",
      submissionType: "text_response",
      linkedBadgeKey: "strategy_master",
      coinReward: 175
    },
    {
      titleTr: "Startup Mimarlığı",
      titleEn: "Startup Architecture",
      titleAz: "Startup Memarlığı",
      scenarioText: "Girişiminizin tamamını kapsayan bir mimari plan hazırlayın. İş modeli, ürün, operasyon, pazarlama, satış ve finansman fonksiyonlarının birbirleriyle nasıl entegre olduğunu gösterin. Ölçeklenebilirlik için hangi altyapı ve sistemlere ihtiyacınız var? Gelecekteki büyüme senaryolarına göre mimarinin nasıl evrileceğini açıklayın.",
      submissionType: "text_response",
      linkedBadgeKey: "startup_architect",
      coinReward: 350
    }
  ],
  leadership: [
    {
      titleTr: "Takım Kuruluşu",
      titleEn: "Team Foundation",
      titleAz: "Komanda Quruluşu",
      scenarioText: "Girişiminiz için ideal takım yapısını tasarlayın. Hangi roller kritik (teknik, pazarlama, satış, operasyon vb.)? Her rol için gerekli yetkinlikleri ve nitelikleri belirleyin. Co-founder vs. çalışan dengesini nasıl kuracaksınız? Takım kültürünü ve değerlerini tanımlayın. Early stage'de kaç kişiye ihtiyacınız var ve neden?",
      submissionType: "text_response",
      linkedBadgeKey: "team_founder",
      coinReward: 75
    },
    {
      titleTr: "Görev Koordinasyonu",
      titleEn: "Task Coordination",
      titleAz: "Tapşırıq Koordinasiyası",
      scenarioText: "Takım içinde görev dağılımı ve koordinasyon için bir sistem tasarlayın. Hangi proje yönetim aracını kullanacaksınız (Trello, Asana, Jira vb.)? Görevlerin nasıl atanacağını, takip edileceğini ve tamamlanacağını açıklayın. Haftalık/daily stand-up toplantılarının yapısını belirleyin. Görev önceliklendirme yöntemini (RICE, MoSCoW vb.) seçin ve uygulayın.",
      submissionType: "text_response",
      linkedBadgeKey: "task_coordinator",
      coinReward: 100
    },
    {
      titleTr: "Liderlik Tarzı",
      titleEn: "Leadership Style",
      titleAz: "Liderlik Üslubu",
      scenarioText: "Kendi liderlik tarzınızı belirleyin ve açıklayın. Otokratik, demokratik, dönüşümcü veya hizmetkar liderlik gibi farklı yaklaşımlardan hangisi size uygun? Neden? Takım motivasyonunu nasıl artırırsınız? Çatışma çözme ve geri bildirim verme süreçlerinizi nasıl yönetirsiniz? Liderlik tarzınızın farklı durumlarda (kriz, büyüme, rutin) nasıl adapte olacağını açıklayın.",
      submissionType: "text_response",
      linkedBadgeKey: "team_leader",
      coinReward: 125
    },
    {
      titleTr: "Kriz Yönetimi",
      titleEn: "Crisis Management",
      titleAz: "Böhran İdarəetməsi",
      scenarioText: "Girişiminizin karşılaşabileceği potansiyel kriz senaryolarını belirleyin (nakit krizi, ana müşteri kaybı, teknik arıza, hukuki sorun vb.). Her kriz için bir kriz yönetim planı hazırlayın. Kriz anında hangi adımları atacaksınız? İletişim stratejiniz ne olacak (takım, yatırımcılar, müşteriler)? Kriz sonrası öğrenme ve iyileştirme sürecini nasıl yöneteceksiniz?",
      submissionType: "text_response",
      linkedBadgeKey: "crisis_manager",
      coinReward: 150
    },
    {
      titleTr: "Stratejik Liderlik",
      titleEn: "Strategic Leadership",
      titleAz: "Strategik Liderlik",
      scenarioText: "Girişiminizin uzun vadeli vizyonunu ve stratejisini belirleyin. Vizyonunuz nedir ve bunu takıma nasıl ileteceksiniz? Stratejik kararları nasıl alacaksınız (veriye dayalı, danışmanlık, oylama)? Rakiplerinizden öne geçmek için hangi stratejik hamleleri yapacaksınız? Lider olarak stratejik odaklanmayı nasıl koruyacaksınız (operasyonel detaylardan kaçınarak)?",
      submissionType: "text_response",
      linkedBadgeKey: "strategic_leader",
      coinReward: 200
    },
    {
      titleTr: "İlham Veren Liderlik",
      titleEn: "Inspiring Leadership",
      titleAz: "İlhamverici Liderlik",
      scenarioText: "Takımınızı ilham vermek ve motive etmek için bir liderlik stratejisi geliştirin. Vizyonunuzu etkileyici bir hikaye olarak anlatın. Takım üyelerinin kişisel hedefleriyle girişimin hedeflerini nasıl uyumlaştırırsınız? Başarıları nasıl kutlarsınız ve başarısızlıklardan nasıl öğrenirsiniz? Lider olarak takım kültürünü ve değerlerini nasıl şekillendirirsiniz? İlham verici liderlik örneklerinden (Steve Jobs, Elon Musk vb.) öğrendiklerinizi paylaşın.",
      submissionType: "text_response",
      linkedBadgeKey: "inspiring_leader",
      coinReward: 400
    }
  ],
  investor_readiness: [
    {
      titleTr: "Pitch Hazırlığı",
      titleEn: "Pitch Preparation",
      titleAz: "Pitch Hazırlığı",
      scenarioText: "Yatırımcılar için 10-15 dakikalık bir pitch sunumu hazırlayın. Sunumunuz problem, çözüm, pazar, iş modeli, rekabet, ekip ve finansal talep bölümlerini içermelidir. Her slayt için kısa açıklamalar ekleyin. Pitch'inizi birkaç kez pratik yapın ve süreyi kontrol edin. Yatırımcının 'Neden şimdi?' ve 'Neden siz?' sorularına cevap verdiğinizden emin olun.",
      submissionType: "file_upload",
      linkedBadgeKey: "pitch_preparer",
      coinReward: 75
    },
    {
      titleTr: "Slayt Tasarımı",
      titleEn: "Slide Design",
      titleAz: "Slayd Dizaynı",
      scenarioText: "Pitch sunumunuz için profesyonel ve etkili slaytlar tasarlayın. Her slayt tek bir ana fikir odaklı olmalıdır. Metni minimumda tutun, görselleri kullanın. Okunabilir fontlar, yeterli boşluk ve tutarlı renk paleti kullanın. Verileri grafiklerle görselleştirin. Markanızın kimliğini yansıtan tutarlı bir tasarım kullanın. Slaytlarınızı yatırımcının gözünden inceleyin ve iyileştirin.",
      submissionType: "file_upload",
      linkedBadgeKey: "presentation_designer",
      coinReward: 100
    },
    {
      titleTr: "Sahne Performansı",
      titleEn: "Stage Performance",
      titleAz: "Səhnə Performansı",
      scenarioText: "Pitch'inizi sahnede sunmak için bir performans planı hazırlayın. Ses tonunuzu, konuşma hızınızı ve beden dilinizi nasıl kullanacaksınız? Göz teması kurmayı, sahneyi kullanmayı ve jestleri nasıl yöneteceksiniz? Pitch'inizi en az 10 kez pratik yapın (ayna önünde, arkadaşlarınızla veya kameraya kaydederek). Potansiyel sorunları (teknik arıza, zor sorular vb.) önceden düşünün ve çözüm yollarını belirleyin.",
      submissionType: "text_response",
      linkedBadgeKey: "took_the_stage",
      coinReward: 125
    },
    {
      titleTr: "Yatırımcı Sorularına Hazırlık",
      titleEn: "Investor Q&A Preparation",
      titleAz: "İnvestor Suallarına Hazırlıq",
      scenarioText: "Yatırımcıların sorması muhtemel 20 soruyu listeleyin ve her birine kısa ama ikna edici cevaplar hazırlayın. Sorular şunları içermelidir: pazar büyüklüğü, rekabet avantajı, gelir modeli, ekip, finansal projeksiyonlar, riskler ve exit stratejisi. Cevaplarınızı veri ve örneklerle destekleyin. Emin olmadığınız konularda dürüstçe itiraf etme stratejisini geliştirin.",
      submissionType: "text_response",
      linkedBadgeKey: "persuasion_expert",
      coinReward: 150
    },
    {
      titleTr: "Yatırımcı İlişkileri",
      titleEn: "Investor Relations",
      titleAz: "İnvestor Əlaqələri",
      scenarioText: "Yatırımcılarla uzun vadeli ilişki kurmak için bir strateji geliştirin. Yatırımcıları nasıl bulacaksınız (network, etkinlikler, warm intro)? İlk toplantıdan sonra nasıl takip edeceksiniz? Yatırımcıya düzenli olarak hangi güncellemeleri göndereceksiniz (monthly update, quarterly report)? Yatırımcı board toplantılarını nasıl yöneteceksiniz? Yatırımcıların beklentilerini nasıl yöneteceksiniz?",
      submissionType: "text_response",
      linkedBadgeKey: "investor_favorite",
      coinReward: 200
    },
    {
      titleTr: "Yatırıma Hazır Girişimci",
      titleEn: "Investment-Ready Entrepreneur",
      titleAz: "İnvestisiyaya Hazır Sahibkar",
      scenarioText: "Girişiminizin yatırım hazırlığını kapsamlı bir şekilde değerlendirin. İş modeli, ürün, pazar fit (product-market fit), ekip, finansal projeksiyonlar ve hukuki yapınız yatırım için hazır mı? Due diligence sürecine hazır mısınız (dokümantasyon, veri odası)? Yatırım tutarını ve kullanım alanlarını netleştirin. Yatırım sonrası roadmap'i hazırlayın. Yatırımcıya sunacağınız term sheet'in temel maddelerini anlayın.",
      submissionType: "text_response",
      linkedBadgeKey: "investment_ready_entrepreneur",
      coinReward: 400
    }
  ]
};

// Turkish and Azerbaijani names for demo participants
const turkishNames = [
  "Ahmet Yilmaz", "Ayse Kaya", "Mehmet Demir", "Fatma Ozkan", "Mustafa Celik",
  "Zeynep Arslan", "Ali Yildiz", "Elif Sahin", "Huseyin Koc", "Emine Aksoy",
  "Ibrahim Kurt", "Hatice Yilmaz", "Can Erkin", "Selin Dogan", "Burak Ozturk",
  "Seda Aydin", "Onur Kilic", "Busra Polat", "Emre Yavuz", "Deniz Sener",
  "Tolga Avci", "Ceren Koc", "Serkan Demir", "Ebru Korkmaz", "Baris Yildirim",
  "Pinar Tekin", "Murat Uysal", "Gamze Ozdemir", "Kemal Sen", "Derya Cetin",
  "Volkan Arslan", "Nurcan Yilmaz", "Ugur Batur", "Sibel Kaya", "Erkan Demir",
  "Gulsah Aktas", "Oğuz Yildiz", "Merve Koc", "Yusuf Celik", "Sebnem Arslan",
  "Cemal Sahin", "Aylin Ozkan", "Halit Koc", "Gozde Aksoy", "Bekir Kurt",
  "Rabia Yilmaz", "Savas Erkin", "Nihan Dogan", "Turgay Ozturk", "Banu Aydin"
];

const azerbaijaniNames = [
  "Aliyev Tofiq", "Mammadova Leyla", "Huseynov Elcin", "Quliyeva Nigar", "Rzayev Vuqar",
  "Abdullayeva Gulnar", "Ismaylov Samir", "Ahmadova Aysel", "Alizada Reshad", "Kazimova Zarife",
  "Mammadov Emin", "Hasanova Gulnare", "Nabiyev Nizami", "Valiyeva Sherqiyye", "Safarov Ramin",
  "Tahirova Sevinc", "Qadirov Cavid", "Huseynova Gulscene", "Babayev Tural", "Melikova Nermin",
  "Rahimov Elshan", "Aliyeva Gulnar", "Yusifov Namiq", "Qadimova Aygun", "Samadov Vusal"
];

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to calculate days ago
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  const reset = process.argv.includes("--reset");
  
  if (reset) {
    console.log("🔄 Reset mode: Deleting demo data...");
    await deleteDemoData();
    console.log("✅ Demo data deleted.");
  }

  console.log("🌱 Seeding demo data...");

  // Check if demo tenant already exists
  const existingTenant = await prisma.tenant.findFirst({
    where: { name: DEMO_TENANT_NAME },
  });

  if (existingTenant && !reset) {
    console.log("⚠️  Demo tenant already exists. Use --reset flag to clear and reseed.");
    return;
  }

  const passwordHash = await bcrypt.hash("Demo123!", 12);

  // Create demo tenant
  console.log("📋 Creating demo tenant...");
  const tenant = await prisma.tenant.create({
    data: {
      id: DEMO_TENANT_ID,
      name: DEMO_TENANT_NAME,
      status: "ACTIVE",
      seatLimit: 100,
      seatsUsed: 0,
      planType: "professional",
      email: "admin@demo-teknopark.com",
      website: "https://demo-teknopark.com",
      phone: "+90 555 555 1234",
      address: "Teknopark Caddesi No: 123, İstanbul, Türkiye",
    },
  });

  await prisma.tenantSettings.create({
    data: {
      tenantId: tenant.id,
      participationCertificate: true,
      achievementCertificate: true,
      completionCertificate: true,
      sendInvitationEmail: true,
      programStartReminder: true,
      programEndReminder: true,
      certificateNotification: true,
      weeklyProgressNotification: true
    }
  });

  // Create tenant admin
  console.log("👤 Creating tenant admin...");
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@demo-teknopark.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "TENANT_ADMIN",
      language: "tr",
      coinBalance: 0
    }
  });

  // Create tenant viewer
  console.log("👤 Creating tenant viewer...");
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "viewer@demo-teknopark.com",
      passwordHash,
      firstName: "Viewer",
      lastName: "User",
      role: "TENANT_VIEWER",
      language: "tr",
      coinBalance: 0
    }
  });

  // Billing: a plan and an active subscription matching the tenant's seats,
  // so the billing screens have something real to show.
  console.log("💳 Creating billing plan and subscription...");
  const plan = await prisma.plan.upsert({
    where: { id: "plan-standard" },
    update: {},
    create: {
      id: "plan-standard",
      name: "Standard",
      pricePerSeatMonthly: 2500, // 25.00 TRY per seat, in kuruş
      currency: "TRY",
      minSeats: 10,
      trialDays: 0,
      isActive: true,
    },
  });

  const billingPeriodStart = new Date();
  const billingPeriodEnd = new Date(billingPeriodStart);
  billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      status: "ACTIVE",
      seats: 100,
      pricePerSeatMonthly: 2500,
      currency: "TRY",
      currentPeriodStart: billingPeriodStart,
      currentPeriodEnd: billingPeriodEnd,
    },
  });

  // Create teacher
  console.log("👩‍🏫 Creating teacher...");
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "teacher@demo-teknopark.com",
      passwordHash,
      firstName: "Teacher",
      lastName: "User",
      role: "TEACHER",
      language: "tr",
      coinBalance: 0
    }
  });

  // Create demo program
  console.log("📚 Creating demo program...");
  const today = new Date();
  const sixWeeksAgo = daysAgo(42);
  const sixWeeksFromNow = new Date();
  sixWeeksFromNow.setDate(today.getDate() + 42);

  const applicationStart = daysAgo(60);
  const applicationEnd = daysAgo(30);

  const program = await prisma.program.create({
    data: {
      tenantId: tenant.id,
      name: "Girişimcilik Hızlandırma Programı 2026",
      description: "Girişimcilerin iş fikirlerini geliştirmeleri, yatırımcı hazırlıklarını tamamlamaları ve startuplarını kurmaları için kapsamlı bir hızlandırma programı. Program, simülasyonlar, eğitimler ve AI destekli mentorluk içerir.",
      type: "Startup Challenge",
      applicationStart,
      applicationEnd,
      simulationStart: sixWeeksAgo,
      simulationEnd: sixWeeksFromNow,
      participantLimit: 100,
      applicationToken: "demo-program-2026-token"
    }
  });

  // Add simulations to program
  console.log("🎮 Adding simulations to program...");
  const simulations = await prisma.simulation.findMany();
  const selectedSimulations = simulations.filter(s => 
    ["idea_development", "startup_management", "leadership", "investor_readiness"].includes(s.key)
  );

  for (const sim of selectedSimulations) {
    await prisma.programSimulation.create({
      data: {
        programId: program.id,
        simulationType: sim.key
      }
    });
  }

  // Add trainings to program
  console.log("📖 Adding trainings to program...");
  for (const trainingKey of DEMO_TRAINING_KEYS) {
    await prisma.programTraining.create({
      data: {
        programId: program.id,
        trainingType: trainingKey
      }
    });
  }

  // Add AI tools to program
  console.log("🤖 Adding AI tools to program...");
  const aiTools = ["AI Mentor", "AI Evaluation", "AI Pitch Coach"];
  for (const aiTool of aiTools) {
    await prisma.programAiTool.create({
      data: {
        programId: program.id,
        aiTool
      }
    });
  }

  // Create training content
  console.log("📝 Creating training content...");
  for (const [key, training] of Object.entries(trainingContent)) {
    const createdTraining = await prisma.training.create({
      data: {
        key: training.key,
        titleTr: training.titleTr,
        titleEn: training.titleEn,
        titleAz: training.titleAz,
        descriptionTr: training.descriptionTr,
        descriptionEn: training.descriptionEn,
        descriptionAz: training.descriptionAz,
        category: training.category
      }
    });

    // Create lessons
    for (let i = 0; i < training.lessons.length; i++) {
      await prisma.lesson.create({
        data: {
          trainingId: createdTraining.id,
          title: training.lessons[i].titleTr,
          titleTr: training.lessons[i].titleTr,
          titleEn: training.lessons[i].titleEn,
          titleAz: training.lessons[i].titleAz,
          content: training.lessons[i].content,
          videoUrl: training.lessons[i].videoUrl,
          estimatedMinutes: training.lessons[i].estimatedMinutes,
          order: i + 1
        }
      });
    }

    // Create exam
    const questions = examQuestions[key as keyof typeof examQuestions];
    if (questions) {
      const exam = await prisma.exam.create({
        data: {
          trainingId: createdTraining.id,
          title: training.titleTr + " Sınavı",
          titleTr: training.titleTr + " Sınavı",
          titleEn: training.titleEn + " Exam",
          titleAz: training.titleAz + " İmtahanı",
          passingThreshold: 70
        }
      });

      // Create questions
      for (let i = 0; i < questions.length; i++) {
        await prisma.question.create({
          data: {
            examId: exam.id,
            questionText: questions[i].questionText,
            optionA: questions[i].optionA,
            optionB: questions[i].optionB,
            optionC: questions[i].optionC,
            optionD: questions[i].optionD,
            correctOption: questions[i].correctOption,
            explanation: questions[i].explanation,
            order: i + 1
          }
        });
      }
    }
  }

  // Create simulation tasks
  console.log("🎯 Creating simulation tasks...");
  for (const [simKey, tasks] of Object.entries(simulationTasks)) {
    const simulation = await prisma.simulation.findUnique({
      where: { key: simKey }
    });

    if (simulation) {
      for (let i = 0; i < tasks.length; i++) {
        await prisma.simulationTask.create({
          data: {
            simulationId: simulation.id,
            title: tasks[i].titleTr,
            titleTr: tasks[i].titleTr,
            titleEn: tasks[i].titleEn,
            titleAz: tasks[i].titleAz,
            scenarioText: tasks[i].scenarioText,
            submissionType: tasks[i].submissionType,
            linkedBadgeKey: tasks[i].linkedBadgeKey,
            coinReward: tasks[i].coinReward,
            order: i + 1
          }
        });
      }
    }
  }

  // Get all badges for participant progress
  const allBadges = await prisma.badge.findMany();
  const allBadgeCoinTotal = badgeCoinTotal(allBadges);

  // Create 100 demo participants with varied progress
  console.log("👥 Creating 100 demo participants...");
  
  const progressBuckets = {
    champions: 10,
    highPerformers: 25,
    midProgress: 35,
    justStarted: 20,
    inactive: 10
  };

  let participantCount = 0;
  
  // Champions (100% completion, all badges, all certificates)
  for (let i = 0; i < progressBuckets.champions; i++) {
    const name = turkishNames[i % turkishNames.length];
    const firstName = name.split(" ")[0];
    const lastName = name.split(" ")[1];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.com`;
    const language = i < 6 ? "tr" : (i < 8 ? "az" : "en");
    
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName,
        lastName,
        role: "PARTICIPANT",
        language,
        coinBalance: allBadgeCoinTotal,
      }
    });

    await prisma.participant.create({
      data: {
        programId: program.id,
        userId: user.id,
        status: "ACTIVE",
        registrationDate: randomDate(applicationStart, applicationEnd),
        lastLogin: daysAgo(Math.floor(Math.random() * 3))
      }
    });

    // Give all badges
    for (const badge of allBadges) {
      await prisma.userBadge.create({
        data: {
          userId: user.id,
          badgeId: badge.id
        }
      });
    }

    // Create coin transactions
    await prisma.coinTransaction.create({
      data: {
        userId: user.id,
        amount: allBadgeCoinTotal,
        reason: "Badge rewards"
      }
    });

    // Give all certificates
    await prisma.certificate.createMany({
      data: [
        { userId: user.id, type: "participation" },
        { userId: user.id, type: "achievement" },
        { userId: user.id, type: "completion" }
      ]
    });

    // Pass all exams with high scores
    const exams = await prisma.exam.findMany();
    for (const exam of exams) {
      const score = 85 + Math.floor(Math.random() * 15); // 85-100
      await prisma.examAttempt.create({
        data: {
          examId: exam.id,
          userId: user.id,
          score,
          passed: true,
          completedAt: daysAgo(Math.floor(Math.random() * 20))
        }
      });
    }

    participantCount++;
  }

  // High performers (70-95% completion, most badges, 1-2 certificates)
  for (let i = 0; i < progressBuckets.highPerformers; i++) {
    const idx = progressBuckets.champions + i;
    const name = idx < turkishNames.length ? turkishNames[idx] : azerbaijaniNames[(idx - turkishNames.length) % azerbaijaniNames.length];
    const firstName = name.split(" ")[0];
    const lastName = name.split(" ")[1];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.com`;
    const language = i < 15 ? "tr" : (i < 20 ? "az" : "en");
    
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName,
        lastName,
        role: "PARTICIPANT",
        language,
        coinBalance: 0,
      }
    });

    await prisma.participant.create({
      data: {
        programId: program.id,
        userId: user.id,
        status: "ACTIVE",
        registrationDate: randomDate(applicationStart, applicationEnd),
        lastLogin: daysAgo(Math.floor(Math.random() * 7))
      }
    });

    // Give most badges (skip some crown badges)
    const badgesToGive = allBadges.filter(b => b.tier !== "crown" || Math.random() > 0.5);
    let totalCoins = 0;
    for (const badge of badgesToGive) {
      await prisma.userBadge.create({
        data: {
          userId: user.id,
          badgeId: badge.id
        }
      });
      totalCoins += badge.coinValue;
    }

    await prisma.coinTransaction.create({
      data: {
        userId: user.id,
        amount: totalCoins,
        reason: "Badge rewards"
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { coinBalance: totalCoins },
    });

    // Give 1-2 certificates
    const certTypes = ["participation", "achievement", "completion"];
    const numCerts = 1 + Math.floor(Math.random() * 2);
    for (let j = 0; j < numCerts; j++) {
      await prisma.certificate.create({
        data: {
          userId: user.id,
          type: certTypes[j]
        }
      });
    }

    // Pass most exams
    const exams = await prisma.exam.findMany();
    for (const exam of exams) {
      if (Math.random() > 0.2) {
        const score = 70 + Math.floor(Math.random() * 25); // 70-95
        await prisma.examAttempt.create({
          data: {
            examId: exam.id,
            userId: user.id,
            score,
            passed: true,
            completedAt: daysAgo(Math.floor(Math.random() * 30))
          }
        });
      }
    }

    participantCount++;
  }

  // Mid progress (30-65% completion, mixed exam results, some badges)
  for (let i = 0; i < progressBuckets.midProgress; i++) {
    const idx = progressBuckets.champions + progressBuckets.highPerformers + i;
    const name = idx < turkishNames.length ? turkishNames[idx] : azerbaijaniNames[(idx - turkishNames.length) % azerbaijaniNames.length];
    const firstName = name.split(" ")[0];
    const lastName = name.split(" ")[1];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.com`;
    const language = i < 20 ? "tr" : (i < 28 ? "az" : "en");
    
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName,
        lastName,
        role: "PARTICIPANT",
        language,
        coinBalance: 0,
      }
    });

    await prisma.participant.create({
      data: {
        programId: program.id,
        userId: user.id,
        status: "ACTIVE",
        registrationDate: randomDate(applicationStart, applicationEnd),
        lastLogin: daysAgo(Math.floor(Math.random() * 14))
      }
    });

    // Give some badges
    const badgesToGive = allBadges.filter(() => Math.random() > 0.7);
    let totalCoins = 0;
    for (const badge of badgesToGive) {
      await prisma.userBadge.create({
        data: {
          userId: user.id,
          badgeId: badge.id
        }
      });
      totalCoins += badge.coinValue;
    }

    await prisma.coinTransaction.create({
      data: {
        userId: user.id,
        amount: totalCoins,
        reason: "Badge rewards"
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { coinBalance: totalCoins },
    });

    // Maybe give 1 certificate
    if (Math.random() > 0.7) {
      await prisma.certificate.create({
        data: {
          userId: user.id,
          type: "participation"
        }
      });
    }

    // Mixed exam results
    const exams = await prisma.exam.findMany();
    for (const exam of exams) {
      const rand = Math.random();
      if (rand > 0.4) {
        const score = rand > 0.7 ? 60 + Math.floor(Math.random() * 20) : 40 + Math.floor(Math.random() * 20);
        await prisma.examAttempt.create({
          data: {
            examId: exam.id,
            userId: user.id,
            score,
            passed: score >= 70,
            completedAt: daysAgo(Math.floor(Math.random() * 40))
          }
        });
      }
    }

    participantCount++;
  }

  // Just started (5-25% completion, 0-2 exams, 0-1 badges)
  for (let i = 0; i < progressBuckets.justStarted; i++) {
    const idx = progressBuckets.champions + progressBuckets.highPerformers + progressBuckets.midProgress + i;
    const name = idx < turkishNames.length ? turkishNames[idx] : azerbaijaniNames[(idx - turkishNames.length) % azerbaijaniNames.length];
    const firstName = name.split(" ")[0];
    const lastName = name.split(" ")[1];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.com`;
    const language = i < 12 ? "tr" : (i < 17 ? "az" : "en");
    
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName,
        lastName,
        role: "PARTICIPANT",
        language,
        coinBalance: 0,
      }
    });

    await prisma.participant.create({
      data: {
        programId: program.id,
        userId: user.id,
        status: "ACTIVE",
        registrationDate: randomDate(applicationStart, applicationEnd),
        lastLogin: daysAgo(Math.floor(Math.random() * 10))
      }
    });

    // Give welcome badge
    let totalCoins = 0;
    const welcomeBadge = allBadges.find(b => b.key === "welcome_badge");
    if (welcomeBadge) {
      await prisma.userBadge.create({
        data: {
          userId: user.id,
          badgeId: welcomeBadge.id
        }
      });
      totalCoins += welcomeBadge.coinValue;
    }

    // Maybe 1 more badge
    if (Math.random() > 0.8) {
      const randomBadge = allBadges[Math.floor(Math.random() * allBadges.length)];
      await prisma.userBadge.create({
        data: {
          userId: user.id,
          badgeId: randomBadge.id
        }
      });
      totalCoins += randomBadge.coinValue;
    }

    await prisma.coinTransaction.create({
      data: {
        userId: user.id,
        amount: totalCoins,
        reason: "Badge rewards"
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { coinBalance: totalCoins },
    });

    // 0-2 exams attempted
    const exams = await prisma.exam.findMany();
    const numExams = Math.floor(Math.random() * 3);
    for (let j = 0; j < numExams; j++) {
      const score = 50 + Math.floor(Math.random() * 30);
      await prisma.examAttempt.create({
        data: {
          examId: exams[j].id,
          userId: user.id,
          score,
          passed: score >= 70,
          completedAt: daysAgo(Math.floor(Math.random() * 5))
        }
      });
    }

    participantCount++;
  }

  // Inactive/At-risk (<10% completion, no exams, last_login > 21 days ago)
  for (let i = 0; i < progressBuckets.inactive; i++) {
    const idx = progressBuckets.champions + progressBuckets.highPerformers + progressBuckets.midProgress + progressBuckets.justStarted + i;
    const name = idx < turkishNames.length ? turkishNames[idx] : azerbaijaniNames[(idx - turkishNames.length) % azerbaijaniNames.length];
    const firstName = name.split(" ")[0];
    const lastName = name.split(" ")[1];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.com`;
    const language = i < 6 ? "tr" : (i < 8 ? "az" : "en");
    
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName,
        lastName,
        role: "PARTICIPANT",
        language,
        coinBalance: 0,
      }
    });

    await prisma.participant.create({
      data: {
        programId: program.id,
        userId: user.id,
        status: "ACTIVE",
        registrationDate: randomDate(applicationStart, applicationEnd),
        lastLogin: daysAgo(21 + Math.floor(Math.random() * 30)) // 21-51 days ago
      }
    });

    // Only welcome badge
    const welcomeBadge = allBadges.find(b => b.key === "welcome_badge");
    if (welcomeBadge) {
      await prisma.userBadge.create({
        data: {
          userId: user.id,
          badgeId: welcomeBadge.id
        }
      });
    }

    const welcomeCoinValue = welcomeBadge?.coinValue ?? 100;
    await prisma.coinTransaction.create({
      data: {
        userId: user.id,
        amount: welcomeCoinValue,
        reason: "Welcome badge"
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { coinBalance: welcomeCoinValue },
    });

    participantCount++;
  }

  // Update tenant seats used
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { seatsUsed: participantCount }
  });

  console.log(`✅ Demo data seeded successfully!`);
  console.log(`📊 Summary:`);
  console.log(`   - Tenant: Demo Teknopark`);
  console.log(`   - Program: Girişimcilik Hızlandırma Programı 2026`);
  console.log(`   - Participants: ${participantCount}`);
  console.log(`   - Trainings: 4`);
  console.log(`   - Lessons: 20`);
  console.log(`   - Exams: 4`);
  console.log(`   - Questions: 32`);
  console.log(`   - Simulation Tasks: 24`);
  console.log(`\n🔐 Login credentials:`);
  console.log(`   - Tenant Admin: admin@demo-teknopark.com / Demo123!`);
  console.log(`   - Tenant Viewer: viewer@demo-teknopark.com / Demo123!`);
  console.log(`   - Participant format: firstname.lastname#@demo.com / Demo123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
