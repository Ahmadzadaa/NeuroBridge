import type { PrismaClient } from "@prisma/client";

/**
 * DEMO baseline assessments, only so the student flow can be exercised end to
 * end. The real instruments (character/creativity and psychological state)
 * have not been written yet; import them over these codes when they arrive.
 * A non-demo assessment with the same code is never overwritten.
 */

type L = { tr: string; en: string; az: string };
type Dim = { code: string; label: L; low: L; mid: L; high: L; items: { text: L; reverse?: boolean }[] };

const j = (l: L) => JSON.stringify(l);

const DEMO: { code: string; kind: "CHARACTER" | "PSYCH"; title: L; description: L; sortOrder: number; dims: Dim[] }[] = [
  {
    code: "CHARACTER_CREATIVITY",
    kind: "CHARACTER",
    sortOrder: 1,
    title: { tr: "[DEMO] Karakter ve Yaratıcılık Analizi", en: "[DEMO] Character and Creativity Analysis", az: "[DEMO] Xarakter və Yaradıcılıq Təhlili" },
    description: {
      tr: "Her ifadeye ne kadar katıldığını işaretle. Doğru ya da yanlış cevap yok.",
      en: "Mark how much you agree with each statement. There are no right or wrong answers.",
      az: "Hər ifadə ilə nə qədər razı olduğunu qeyd et. Düzgün və ya yanlış cavab yoxdur.",
    },
    dims: [
      {
        code: "CURIOSITY",
        label: { tr: "Merak", en: "Curiosity", az: "Maraq" },
        low: { tr: "Yeni konuları keşfetmeye küçük adımlarla başlayabilirsin: her hafta bir soru belirle.", en: "Start exploring new topics in small steps: pick one question each week.", az: "Yeni mövzuları kiçik addımlarla kəşf etməyə başla: hər həftə bir sual seç." },
        mid: { tr: "Merakın var; onu düzenli araştırma alışkanlığına çevirmek seni öne çıkarır.", en: "You are curious; turning it into a habit of regular research will set you apart.", az: "Marağın var; onu müntəzəm araşdırma vərdişinə çevirmək səni fərqləndirəcək." },
        high: { tr: "Güçlü bir merakın var. Problem keşfi haftasında bunu öne çıkar.", en: "You have strong curiosity. Put it to work in the problem discovery week.", az: "Güclü marağın var. Problem kəşfi həftəsində bunu önə çıxar." },
        items: [
          { text: { tr: "Yeni konuları öğrenmek bana keyif verir.", en: "I enjoy learning about new topics.", az: "Yeni mövzuları öyrənmək mənə zövq verir." } },
          { text: { tr: "Bir şeyin nasıl çalıştığını merak eder, araştırırım.", en: "I wonder how things work and look into it.", az: "Bir şeyin necə işlədiyini maraqlanıb araşdırıram." } },
        ],
      },
      {
        code: "IDEA_FLUENCY",
        label: { tr: "Fikir Üretme", en: "Idea Generation", az: "İdeya Yaratma" },
        low: { tr: "Fikir üretme tekniklerine odaklanan 6. eğitim birimi senin için özellikle faydalı olacak.", en: "Unit 6 on idea generation techniques will be especially useful for you.", az: "İdeya yaratma texnikalarına həsr olunmuş 6-cı təlim bölməsi sənin üçün xüsusilə faydalı olacaq." },
        mid: { tr: "Fikir üretebiliyorsun; sayıyı artırmak için beyin fırtınası sürelerini kısalt ve sınırla.", en: "You can generate ideas; timed brainstorming will help you produce more.", az: "İdeya yarada bilirsən; vaxtla məhdud beyin fırtınası daha çox ideya yaratmağa kömək edəcək." },
        high: { tr: "Fikir üretmede güçlüsün. Şimdi fikirleri değerlendirme ve önceliklendirmeye odaklan.", en: "You are strong at generating ideas. Now focus on evaluating and prioritizing them.", az: "İdeya yaratmaqda güclüsən. İndi ideyaları qiymətləndirməyə və prioritetləşdirməyə fokuslan." },
        items: [
          { text: { tr: "Bir problem için kısa sürede birden fazla fikir üretebilirim.", en: "I can come up with several ideas for a problem quickly.", az: "Bir problem üçün qısa vaxtda bir neçə ideya yarada bilirəm." } },
          { text: { tr: "Alışılmışın dışında çözümler düşünmekten hoşlanırım.", en: "I like thinking of unconventional solutions.", az: "Adi olmayan həllər düşünməyi xoşlayıram." } },
        ],
      },
      {
        code: "PERSISTENCE",
        label: { tr: "Kararlılık", en: "Persistence", az: "Qətiyyət" },
        low: { tr: "Büyük hedefleri küçük görevlere böl; her tamamlanan adım motivasyonunu artırır.", en: "Break big goals into small tasks; each finished step builds momentum.", az: "Böyük hədəfləri kiçik tapşırıqlara böl; hər bitən addım motivasiyanı artırır." },
        mid: { tr: "Çoğu zaman devam ediyorsun; zorlandığında kısa bir mola verip geri dön.", en: "You usually keep going; when it gets hard, take a short break and come back.", az: "Çox vaxt davam edirsən; çətinləşəndə qısa fasilə ver və geri qayıt." },
        high: { tr: "Kararlılığın güçlü. Final projede bu özelliğin fark yaratacak.", en: "Your persistence is strong. It will make a difference in the final project.", az: "Qətiyyətin güclüdür. Final layihəsində bu xüsusiyyətin fərq yaradacaq." },
        items: [
          { text: { tr: "Zorlandığım bir işi yarım bırakmam.", en: "I do not give up on a task when it gets hard.", az: "Çətinləşən işi yarımçıq qoymuram." } },
          { text: { tr: "İlk denemem başarısız olursa kolayca vazgeçerim.", en: "If my first attempt fails, I give up easily.", az: "İlk cəhdim uğursuz olsa, asanlıqla vaz keçirəm." }, reverse: true },
        ],
      },
    ],
  },
  {
    code: "PSYCH_STATE",
    kind: "PSYCH",
    sortOrder: 2,
    title: { tr: "[DEMO] Psikolojik Durum Değerlendirmesi", en: "[DEMO] Psychological Wellbeing Check", az: "[DEMO] Psixoloji Vəziyyət Qiymətləndirməsi" },
    description: {
      tr: "Son iki haftayı düşünerek cevapla. Sonuçların yalnızca ayrıca onay verdiysen üniversitenle paylaşılır.",
      en: "Answer thinking about the last two weeks. Your results are shared with your university only if you gave separate consent.",
      az: "Son iki həftəni düşünərək cavab ver. Nəticələrin yalnız ayrıca razılıq vermisənsə universitetinlə paylaşılır.",
    },
    dims: [
      {
        code: "MOTIVATION",
        label: { tr: "Motivasyon", en: "Motivation", az: "Motivasiya" },
        low: { tr: "Kendine küçük ve ulaşılabilir haftalık hedefler koymak motivasyonunu destekleyebilir.", en: "Setting small, reachable weekly goals can support your motivation.", az: "Özünə kiçik və əlçatan həftəlik hədəflər qoymaq motivasiyanı dəstəkləyə bilər." },
        mid: { tr: "Motivasyonun iyi düzeyde; ilerlemeni takip etmek onu korumana yardım eder.", en: "Your motivation is at a good level; tracking progress helps you keep it.", az: "Motivasiyan yaxşı səviyyədədir; irəliləyişi izləmək onu qorumağa kömək edir." },
        high: { tr: "Motivasyonun yüksek. Enerjini takım çalışmalarında da paylaş.", en: "Your motivation is high. Share that energy in team work too.", az: "Motivasiyan yüksəkdir. Enerjini komanda işlərində də paylaş." },
        items: [
          { text: { tr: "Bu programa katılmak için istekliyim.", en: "I am keen to take part in this program.", az: "Bu proqramda iştirak etməyə həvəsliyəm." } },
          { text: { tr: "Hedeflerime ulaşmak için enerjim var.", en: "I have the energy to work towards my goals.", az: "Hədəflərimə çatmaq üçün enerjim var." } },
        ],
      },
      {
        code: "STRESS_BALANCE",
        label: { tr: "Stres Dengesi", en: "Stress Balance", az: "Stres Balansı" },
        low: { tr: "Yoğun hissettiğin dönemlerde üniversitenin psikolojik danışmanlık birimine başvurmayı düşünebilirsin.", en: "When things feel heavy, consider reaching out to your university counselling service.", az: "Özünü ağır hiss etdiyin dövrlərdə universitetin psixoloji məsləhət xidmətinə müraciət etməyi düşünə bilərsən." },
        mid: { tr: "Stresle genel olarak başa çıkıyorsun; düzenli molalar dengeni korur.", en: "You generally cope with stress; regular breaks help keep the balance.", az: "Ümumilikdə streslə bacarırsan; müntəzəm fasilələr balansı qoruyur." },
        high: { tr: "Stres dengen iyi görünüyor.", en: "Your stress balance looks good.", az: "Stres balansın yaxşı görünür." },
        items: [
          { text: { tr: "Son zamanlarda kendimi sık sık bunalmış hissediyorum.", en: "Lately I often feel overwhelmed.", az: "Son vaxtlar özümü tez-tez sıxılmış hiss edirəm." }, reverse: true },
          { text: { tr: "Yoğun dönemlerde sakin kalabilirim.", en: "I can stay calm during busy periods.", az: "Gərgin dövrlərdə sakit qala bilirəm." } },
        ],
      },
      {
        code: "SELF_CONFIDENCE",
        label: { tr: "Özgüven", en: "Self-confidence", az: "Özünəinam" },
        low: { tr: "Küçük başarılarını not etmek, kendine güvenini zamanla artırır.", en: "Noting small wins builds your confidence over time.", az: "Kiçik uğurlarını qeyd etmək zamanla özünəinamını artırır." },
        mid: { tr: "Kendine güvenin yerinde; fikirlerini paylaşma fırsatlarını değerlendir.", en: "Your confidence is solid; take chances to share your ideas.", az: "Özünəinamın yerindədir; ideyalarını paylaşmaq fürsətlərindən istifadə et." },
        high: { tr: "Özgüvenin yüksek. Jüri sunumlarında bu sana avantaj sağlar.", en: "Your confidence is high. It will help you in the jury presentations.", az: "Özünəinamın yüksəkdir. Jüri təqdimatlarında bu sənə üstünlük verəcək." },
        items: [
          { text: { tr: "Yeni bir işe başlarken kendime güvenirim.", en: "I feel confident when starting something new.", az: "Yeni işə başlayanda özümə güvənirəm." } },
          { text: { tr: "Fikirlerimi başkalarının önünde rahatça paylaşabilirim.", en: "I can share my ideas comfortably in front of others.", az: "İdeyalarımı başqalarının qarşısında rahat paylaşa bilirəm." } },
        ],
      },
    ],
  },
];

export async function seedDemoAssessments(prisma: PrismaClient) {
  for (const a of DEMO) {
    const existing = await prisma.assessment.findUnique({ where: { code: a.code }, select: { id: true, isDemo: true } });
    if (existing && !existing.isDemo) continue;

    const data = {
      kind: a.kind,
      version: "demo-1",
      isDemo: true,
      title: j(a.title),
      description: j(a.description),
      sortOrder: a.sortOrder,
    };
    const assessment = existing
      ? await prisma.assessment.update({ where: { id: existing.id }, data })
      : await prisma.assessment.create({ data: { code: a.code, ...data } });

    await prisma.assessmentDimension.deleteMany({ where: { assessmentId: assessment.id } });
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } });
    await prisma.assessmentDimension.createMany({
      data: a.dims.map((d, i) => ({
        assessmentId: assessment.id,
        code: d.code,
        label: j(d.label),
        lowText: j(d.low),
        midText: j(d.mid),
        highText: j(d.high),
        sortOrder: i,
      })),
    });
    // Interleave dimensions so items of one trait are not all adjacent.
    const items = a.dims.flatMap((d) => d.items.map((item, n) => ({ ...item, dimensionCode: d.code, n })));
    items.sort((x, y) => x.n - y.n);
    await prisma.assessmentQuestion.createMany({
      data: items.map((item, i) => ({
        assessmentId: assessment.id,
        dimensionCode: item.dimensionCode,
        text: j(item.text),
        reverse: item.reverse ?? false,
        sortOrder: i,
      })),
    });
  }
}
