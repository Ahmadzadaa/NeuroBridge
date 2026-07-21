/**
 * Seeds the "TexnoStart: Startupını Böyüt" scenario onto the
 * startup_management simulation — 8 rounds × 3 choices, AZ content —
 * plus two demo student runs (one graded) so the teacher panel has data.
 * Idempotent: re-running resets the scenario and demo runs.
 *
 *   npx tsx prisma/seed-simulation.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const START_CASH = 5000;
const TARGET_CASH = 20000;
const START_SATISFACTION = 50;
const START_REPUTATION = 50;

interface ChoiceDef {
  label: string;
  detail: string;
  cash: number;
  sat: number;
  rep: number;
  variance: number;
  feedback: string;
}

interface RoundDef {
  title: string;
  context: string;
  choices: ChoiceDef[];
}

const ROUNDS: RoundDef[] = [
  {
    title: "İdeya doğrulaması",
    context:
      "Komandanız B2B SaaS ideyası üzərində işləyir: kiçik şirkətlər üçün avtomatlaşdırılmış mühasibat köməkçisi. MVP tikməzdən əvvəl bazarın bu problemi həqiqətən yaşadığını yoxlamaq lazımdır. Vaxt və pul məhduddur — necə doğrulayırsınız?",
    choices: [
      {
        label: "50 potensial müştəri ilə üz-üzə müsahibə apar",
        detail: "Yavaş və bahalıdır, amma dərin anlayış verir",
        cash: -500, sat: 10, rep: 5, variance: 0,
        feedback:
          "Müsahibələr qızıl dəyərində məlumat verdi: müştərilər problemi başqa cür adlandırır və ən çox hesabat hissəsindən əziyyət çəkirlər. Məhsul istiqamətiniz dəqiqləşdi.",
      },
      {
        label: "Onlayn sorğu göndər",
        detail: "Ucuz və sürətli, amma səthi cavablar",
        cash: -100, sat: 3, rep: 0, variance: 100,
        feedback:
          "Sorğuya 200 cavab gəldi, amma cavablar səthidir — problemi təsdiqlədiniz, dərinliyi yox. Bəzi fərziyyələr hələ də yoxlanılmamış qalır.",
      },
      {
        label: "Doğrulamanı ötür, birbaşa MVP tik",
        detail: "Ən sürətli yol, amma kor uçuş riski",
        cash: 0, sat: -5, rep: -5, variance: 200,
        feedback:
          "Vaxt qazandınız, amma ilk demo görüşlərində müştərilərin gözləntiləri təxmininizdən fərqli çıxdı. İndi geri dönüb düzəltmək daha baha başa gələcək.",
      },
    ],
  },
  {
    title: "MVP strategiyası",
    context:
      "Doğrulama mərhələsi arxada qaldı. İndi ilk işlək versiyanı tikmək lazımdır. İnvestorunuz yoxdur, kapital sınırlıdır və rəqib şirkət də oxşar istiqamətdə işləyir. MVP-ni necə tikirsiniz?",
    choices: [
      {
        label: "3 həftəyə minimal MVP çıxar",
        detail: "Yalnız əsas funksiya — sürətli bazar testi",
        cash: -1000, sat: 5, rep: 5, variance: 300,
        feedback:
          "MVP 3 həftəyə hazır oldu. Kobud görünsə də, əsas dəyəri göstərir və ilk istifadəçilər real rəy verməyə başladı.",
      },
      {
        label: "3 aya tam funksiyalı məhsul tik",
        detail: "Güclü ilk təəssürat, amma böyük xərc və gecikmə",
        cash: -2500, sat: 10, rep: 5, variance: 500,
        feedback:
          "Məhsul dolğun alındı və istifadəçilər keyfiyyəti tərifləyir. Amma 3 ay ərzində rəqib artıq ilk müştərilərini yığdı — bazara gec girdiniz.",
      },
      {
        label: "No-code alətlərlə prototip yığ",
        detail: "Ən ucuz, amma texniki borc yaradır",
        cash: -300, sat: 0, rep: -3, variance: 200,
        feedback:
          "Prototip işləyir, amma yüklənmə problemləri var və bəzi müştərilər 'oyuncaq kimi görünür' dedi. Tezliklə yenidən yazmalı olacaqsınız.",
      },
    ],
  },
  {
    title: "İlk müştərilər",
    context:
      "MVP hazırdır. İndi ilk real müştəriləri qazanmaq vaxtıdır. Pipeline-da 12 maraqlı şirkət var. Onlara hansı təkliflə gedirsiniz?",
    choices: [
      {
        label: "5 şirkətə pulsuz pilot təklif et",
        detail: "Gəlir yoxdur, amma rəy və referans qazanırsan",
        cash: -400, sat: 15, rep: 10, variance: 0,
        feedback:
          "Pilot şirkətlər məhsulu hər gün istifadə edir və detallı rəy verir. İkisi ödənişli müqaviləyə keçməyə hazır olduğunu bildirdi — referanslarınız yarandı.",
      },
      {
        label: "Erkən quş endirimi ilə sat",
        detail: "Orta gəlir + öhdəlikli müştərilər",
        cash: 1500, sat: 5, rep: 3, variance: 400,
        feedback:
          "6 şirkət endirimli illik paket aldı. Kassaya pul gəldi və müştərilər ödəniş etdiyi üçün məhsulu ciddi istifadə edir.",
      },
      {
        label: "Tam qiymətlə satmağa çalış",
        detail: "Yüksək marja, amma erkən mərhələdə çətin satış",
        cash: 800, sat: -5, rep: 0, variance: 800,
        feedback:
          "Yalnız 2 şirkət tam qiymətə razı oldu. Digərləri 'məhsul hələ sübut olunmayıb' deyib getdi — bəziləri rəqibə üz tutdu.",
      },
    ],
  },
  {
    title: "Komanda böyüməsi",
    context:
      "İş artır və üç nəfərlik komanda çatışmır. Satış görüşləri texniki işləri yeyir, dəstək sualları gecikir. Kadr qərarınız nədir?",
    choices: [
      {
        label: "Təcrübəli B2B satışçı işə al",
        detail: "Bahalıdır, amma satış prosesini professionallaşdırır",
        cash: -1500, sat: 5, rep: 8, variance: 500,
        feedback:
          "Yeni satışçı ilk ayında pipeline-ı üç dəfə böyütdü və görüşlərin keyfiyyəti nəzərəçarpacaq dərəcədə artdı.",
      },
      {
        label: "Universitetdən təcrübəçilər götür",
        detail: "Ucuz əmək, amma öyrətmə vaxtı tələb edir",
        cash: -400, sat: 0, rep: 0, variance: 200,
        feedback:
          "Təcrübəçilər dəstək və test işlərini boşaltdı. Öyrətməyə vaxt getdi, amma komandada enerji artdı.",
      },
      {
        label: "Heç kimi işə alma, özünüz çatdırın",
        detail: "Pul qənaəti, amma tükənmə riski",
        cash: 0, sat: -5, rep: -3, variance: 0,
        feedback:
          "İki həftə 80 saatlıq iş rejimindən sonra dəstək cavab müddətləri uzandı və bir müştəri narazılığını açıq bildirdi.",
      },
    ],
  },
  {
    title: "Marketinq kanalı",
    context:
      "Məhsul stabilləşib, indi böyümə kanalı seçmək lazımdır. Büdcə hələ də məhduddur və hər kanalın öz riski var. Hara investisiya edirsiniz?",
    choices: [
      {
        label: "Hədəflənmiş rəqəmsal reklam",
        detail: "Ölçülə bilən nəticə, orta risk",
        cash: 1200, sat: 5, rep: 5, variance: 600,
        feedback:
          "Reklam kampaniyası müsbət ROI verdi: hər xərclənən manata iki manat gəlir. Kanal işləyir və genişləndirilə bilər.",
      },
      {
        label: "Sənaye konfransında stend",
        detail: "Bahalıdır, amma güclü brend görünürlüğü",
        cash: -800, sat: 3, rep: 12, variance: 300,
        feedback:
          "Stend diqqət çəkdi: 40 keyfiyyətli əlaqə, iki potensial korporativ müştəri və bir media müsahibəsi qazandınız.",
      },
      {
        label: "Viral sosial media kampaniyası",
        detail: "Ucuz, amma nəticə tamamilə qeyri-müəyyən",
        cash: 300, sat: 3, rep: 8, variance: 1000,
        feedback:
          "Kampaniya videolarından biri gözlənilmədən yayıldı — minlərlə baxış və xeyli qeydiyyat gətirdi, amma çoxu hədəf seqmentdən deyildi.",
      },
    ],
  },
  {
    title: "Müştəri böhranı",
    context:
      "Ən böyük müştəriniz kritik xəta tapdı: ay sonu hesabatları səhv rəqəm göstərir. Müqaviləni ləğv etməklə hədələyir və sosial mediada yazmağa hazırlaşır. Reaksiyanız?",
    choices: [
      {
        label: "Komandanı səfərbər et, kompensasiya təklif et",
        detail: "Baha başa gəlir, amma etimadı bərpa edir",
        cash: -700, sat: 15, rep: 10, variance: 0,
        feedback:
          "Xəta 36 saata düzəldi, müştəriyə 2 aylıq pulsuz istifadə verdiniz. Müştəri o qədər təsirləndi ki, LinkedIn-də təşəkkür yazısı paylaşdı.",
      },
      {
        label: "Standart dəstək prosesi ilə həll et",
        detail: "Balanslı yanaşma, orta sürət",
        cash: -200, sat: 2, rep: 0, variance: 200,
        feedback:
          "Xəta bir həftəyə düzəldi. Müştəri qaldı, amma münasibət soyudu — yenilənmə vaxtı endirim istəyəcəyi hiss olunur.",
      },
      {
        label: "Problemi kiçilt, yeni satışlara fokuslan",
        detail: "Qısa müddətdə pul, uzun müddətdə reputasiya riski",
        cash: 500, sat: -15, rep: -10, variance: 400,
        feedback:
          "Müştəri müqaviləni ləğv etdi və narazılığını iki sənaye qrupunda paylaşdı. Yeni satışlar bunu hiss etdi — üç görüş ləğv olundu.",
      },
    ],
  },
  {
    title: "İnvestor masası",
    context:
      "Metriklər böyüməni göstərir və iki investisiya təklifi masadadır. Bir tanınmış fond ədalətli şərtlərlə seed raund təklif edir; bir mələk investor isə daha çox pulu pis şərtlərlə verir. Üçüncü yol — heç birini götürməmək.",
    choices: [
      {
        label: "Tanınmış fonddan seed raund götür",
        detail: "Böyük kapital + fondun şəbəkəsi, ədalətli pay",
        cash: 8000, sat: 0, rep: 5, variance: 1000,
        feedback:
          "Raund bağlandı! Fondun adı qapılar açır: iki korporativ müştəri artıq görüş istəyib. Yeni resurslarla böyümə planı realdır.",
      },
      {
        label: "Bootstrap davam et",
        detail: "Tam nəzarət, amma yavaş böyümə",
        cash: 1000, sat: 5, rep: 3, variance: 500,
        feedback:
          "Payınızı qorudunuz və gəlirlə böyüməyə davam edirsiniz. Böyümə yavaşdır, amma şirkət tam sizin nəzarətinizdədir.",
      },
      {
        label: "Mələk investorun tez pulunu götür",
        detail: "Sürətli pul, amma ağır şərtlər və müdaxilə hüququ",
        cash: 5000, sat: -3, rep: -8, variance: 0,
        feedback:
          "Pul hesabdadır, amma şərtlər ağırdır: investor veto hüququ aldı və gələcək raundlarda payınız ciddi azalacaq. Sənayedə bu sövdələşmə mənfi qarşılandı.",
      },
    ],
  },
  {
    title: "Böyümə strategiyası",
    context:
      "Son qərar: şirkətin növbəti ili hansı istiqamətdə keçəcək? Bu seçim yekun nəticənizi müəyyən edəcək.",
    choices: [
      {
        label: "Regional bazara genişlən",
        detail: "Böyük potensial, əməliyyat mürəkkəbliyi",
        cash: 4000, sat: 5, rep: 8, variance: 1500,
        feedback:
          "Qonşu bazara giriş uğurlu oldu: ilk ayda 15 yeni korporativ müştəri. Şirkətiniz artıq regional oyunçu sayılır. Simulyasiya tamamlandı!",
      },
      {
        label: "Mövcud müştərilərə fokuslan, məhsulu dərinləşdir",
        detail: "Sabit gəlir, yüksək loyallıq",
        cash: 2500, sat: 12, rep: 5, variance: 500,
        feedback:
          "Müştəri itkisi sıfıra düşdü və mövcud müştərilər əlavə modullar almağa başladı. Sağlam, dayanıqlı biznes qurdunuz. Simulyasiya tamamlandı!",
      },
      {
        label: "Aqressiv endirimlə bazar payı qap",
        detail: "Sürətli artım, marja və brend riski",
        cash: 1500, sat: 8, rep: -5, variance: 1200,
        feedback:
          "Müştəri sayı sıçradı, amma marja əridi və 'ucuz alternativ' imici yarandı. Böyüdünüz, amma mövqeyiniz kövrəkdir. Simulyasiya tamamlandı!",
      },
    ],
  },
];

/** Demo run: pattern = choice index per round (0-based). */
const DEMO_RUNS = [
  {
    email: "ayse.kaya1@demo.com",
    pattern: [0, 0, 1, 0, 1, 0, 0, 0],
    grade: { grade: 18, maxGrade: 20, comment: "Doğrulama və böhran idarəetməsi nümunəvi idi. Marketinq seçimində risk hesablaması bir az zəif idi — dərsdə müzakirə edərik." },
  },
  {
    email: "mehmet.demir2@demo.com",
    pattern: [2, 2, 2, 2, 2, 2, 2, 2],
    grade: null,
  },
];

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

async function main() {
  const simulation = await prisma.simulation.findUnique({
    where: { key: "startup_management" },
  });
  if (!simulation) {
    console.error("startup_management simulation not found — run db:seed-demo first.");
    process.exit(1);
  }

  console.log("🎮 Building 'TexnoStart' scenario...");
  await prisma.simulation.update({
    where: { id: simulation.id },
    data: {
      startCash: START_CASH,
      targetCash: TARGET_CASH,
      description:
        "TexnoStart — B2B SaaS startupını 8 raundda sıfırdan regional oyunçuya çevir. Hər qərarın kapitala, müştəri məmnuniyyətinə və reputasiyaya təsiri var.",
    },
  });

  await prisma.simulationRun.deleteMany({ where: { simulationId: simulation.id } });
  await prisma.simulationRound.deleteMany({ where: { simulationId: simulation.id } });

  const roundRecords = [];
  for (const [i, round] of ROUNDS.entries()) {
    roundRecords.push(
      await prisma.simulationRound.create({
        data: {
          simulationId: simulation.id,
          order: i + 1,
          title: round.title,
          context: round.context,
          choices: {
            create: round.choices.map((choice, j) => ({
              label: choice.label,
              detail: choice.detail,
              cashDelta: choice.cash,
              satisfactionDelta: choice.sat,
              reputationDelta: choice.rep,
              variance: choice.variance,
              feedback: choice.feedback,
              order: j,
            })),
          },
        },
        include: { choices: { orderBy: { order: "asc" } } },
      })
    );
  }

  // ── Demo student runs ─────────────────────────────────────────
  console.log("👩‍🎓 Creating demo student runs...");
  for (const demo of DEMO_RUNS) {
    const user = await prisma.user.findFirst({
      where: { email: demo.email },
      select: { id: true },
    });
    if (!user) continue;

    let cash = START_CASH;
    let sat = START_SATISFACTION;
    let rep = START_REPUTATION;

    const run = await prisma.simulationRun.create({
      data: {
        simulationId: simulation.id,
        userId: user.id,
        cash,
        satisfaction: sat,
        reputation: rep,
      },
    });

    for (const [i, round] of roundRecords.entries()) {
      const choice = round.choices[demo.pattern[i]];
      const noise =
        choice.variance > 0
          ? Math.round((Math.random() * 2 - 1) * choice.variance)
          : 0;
      cash += choice.cashDelta + noise;
      sat = clamp(sat + choice.satisfactionDelta);
      rep = clamp(rep + choice.reputationDelta);

      await prisma.simulationDecision.create({
        data: {
          runId: run.id,
          roundId: round.id,
          choiceId: choice.id,
          cashAfter: cash,
          satisfactionAfter: sat,
          reputationAfter: rep,
        },
      });
    }

    const cashScore = clamp(Math.round((cash / TARGET_CASH) * 100));
    const score = Math.round(cashScore * 0.4 + sat * 0.3 + rep * 0.3);

    await prisma.simulationRun.update({
      where: { id: run.id },
      data: {
        cash,
        satisfaction: sat,
        reputation: rep,
        currentRound: ROUNDS.length,
        status: "COMPLETED",
        score,
        completedAt: new Date(),
        ...(demo.grade
          ? {
              teacherGrade: demo.grade.grade,
              teacherMaxGrade: demo.grade.maxGrade,
              teacherComment: demo.grade.comment,
              gradedAt: new Date(),
            }
          : {}),
      },
    });

    console.log(`   ${demo.email}: score ${score} (₼${cash}, ${sat}%, ${rep}%)`);
  }

  console.log("\n✅ Simulation scenario ready!");
  console.log(`   ${ROUNDS.length} rounds × 3 choices on 'startup_management'`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
