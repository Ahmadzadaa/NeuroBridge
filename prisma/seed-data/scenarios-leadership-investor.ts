/**
 * Scenario content for the platform's Leadership and Investor Readiness
 * simulations (seeded by prisma/seed-scenarios.ts). Every text is trilingual.
 *
 * Balance: start satisfaction / reputation are 50 (engine defaults). The most
 * thoughtful path scores ~90, a short-term-gain path ~45 — passing (70) needs
 * mostly sound decisions, not a single lucky one.
 */

type T = { az: string; tr: string; en: string };

export interface ScenarioChoice {
  label: T;
  detail: T;
  feedback: T;
  cash: number;
  sat: number;
  rep: number;
  variance: number;
}

export interface ScenarioRound {
  title: T;
  context: T;
  choices: ScenarioChoice[];
}

export interface ScenarioDef {
  key: string;
  startCash: number;
  targetCash: number;
  description: T;
  rounds: ScenarioRound[];
}

export const LEADERSHIP: ScenarioDef = {
  key: "leadership",
  startCash: 10000,
  targetCash: 15000,
  description: {
    az: "NovaPay — fintex şirkətində 12 nəfərlik məhsul komandasına yeni rəhbər təyin olunmusunuz. 6 raundda komandanı idarə edin: hər qərar komanda büdcəsinə, motivasiyaya və liderlik etibarınıza təsir edir.",
    tr: "NovaPay — bir fintek şirketinde 12 kişilik ürün ekibine yeni yönetici olarak atandınız. 6 turda ekibi yönetin: her karar ekip bütçesini, motivasyonu ve liderlik güvenilirliğinizi etkiler.",
    en: "NovaPay — you have just been appointed head of a 12-person product team at a fintech company. Lead the team through 6 rounds: every decision affects the team budget, morale and your credibility as a leader.",
  },
  rounds: [
    {
      title: { az: "İlk həftə", tr: "İlk hafta", en: "The first week" },
      context: {
        az: "Komanda əvvəlki rəhbərin gedişindən sonra narahatdır: bəziləri işdən çıxmağı düşünür, prioritetlər qarışıqdır. Rəhbərlik sizdən tez nəticə gözləyir. İlk həftəni necə keçirirsiniz?",
        tr: "Ekip, önceki yöneticinin ayrılmasından sonra tedirgin: bazıları istifa etmeyi düşünüyor, öncelikler karışık. Üst yönetim sizden hızlı sonuç bekliyor. İlk haftayı nasıl geçiriyorsunuz?",
        en: "The team is unsettled after the previous manager left: some are thinking of quitting and priorities are muddled. Senior management expects quick results. How do you spend your first week?",
      },
      choices: [
        {
          label: { az: "Hər kəslə təkbətək görüş keçir", tr: "Herkesle birebir görüşme yap", en: "Hold one-to-ones with everyone" },
          detail: { az: "Vaxt aparır, amma komandanı tanıyırsınız", tr: "Zaman alır ama ekibi tanırsınız", en: "Takes time, but you get to know the team" },
          feedback: {
            az: "12 görüşdən sonra əsas problemləri bilirsiniz: aydın olmayan rollar və tanınmayan əmək. İnsanlar ilk dəfə dinlənildiklərini hiss etdilər.",
            tr: "12 görüşmeden sonra asıl sorunları biliyorsunuz: belirsiz roller ve takdir edilmeyen emek. İnsanlar ilk kez dinlendiklerini hissetti.",
            en: "After 12 conversations you know the real problems: unclear roles and unrecognised effort. People felt listened to for the first time.",
          },
          cash: -300, sat: 8, rep: 6, variance: 0,
        },
        {
          label: { az: "Dərhal yeni vizyon elan et və strukturu dəyiş", tr: "Hemen yeni vizyon açıkla ve yapıyı değiştir", en: "Announce a new vision and reorganise at once" },
          detail: { az: "Güclü start görünür, amma kontekst yoxdur", tr: "Güçlü bir başlangıç gibi görünür ama bağlam yok", en: "Looks decisive, but you lack context" },
          feedback: {
            az: "Rəhbərlik qətiyyətinizi bəyəndi, amma komanda dəyişikliklərin səbəbini anlamadı. İki aparıcı mütəxəssis işdən çıxmaq üçün müsahibələrə getməyə başladı.",
            tr: "Üst yönetim kararlılığınızı beğendi ama ekip değişikliklerin nedenini anlamadı. İki kilit uzman başka işlere mülakata girmeye başladı.",
            en: "Management liked your decisiveness, but the team didn't understand why things changed. Two key specialists started interviewing elsewhere.",
          },
          cash: -800, sat: -8, rep: 3, variance: 200,
        },
        {
          label: { az: "Heç nəyi dəyişmə, bir ay müşahidə et", tr: "Hiçbir şeyi değiştirme, bir ay gözlemle", en: "Change nothing and observe for a month" },
          detail: { az: "Risksiz görünür, amma boşluq yaranır", tr: "Risksiz görünür ama bir boşluk oluşur", en: "Feels safe, but leaves a vacuum" },
          feedback: {
            az: "Gərginlik azalmadı: qərarsızlıq komandaya istiqamətin olmadığı kimi göründü. Qeyri-rəsmi liderlər boşluğu doldurmağa başladı.",
            tr: "Gerginlik azalmadı: kararsızlık ekibe yön yokluğu gibi göründü. Gayriresmi liderler boşluğu doldurmaya başladı.",
            en: "The tension didn't ease: your hesitation looked like a lack of direction. Informal leaders began to fill the gap.",
          },
          cash: 0, sat: 2, rep: -4, variance: 0,
        },
      ],
    },
    {
      title: { az: "Komandadaxili münaqişə", tr: "Ekip içi çatışma", en: "Conflict in the team" },
      context: {
        az: "İki baş developer yeni ödəniş modulunun arxitekturası üzərində açıq mübahisə edir. İş dayanıb, digərləri tərəf seçməyə başlayıb. Nə edirsiniz?",
        tr: "İki kıdemli geliştirici yeni ödeme modülünün mimarisi konusunda açıkça tartışıyor. İş durdu, diğerleri taraf tutmaya başladı. Ne yaparsınız?",
        en: "Two senior developers are openly fighting over the architecture of the new payments module. Work has stalled and others are taking sides. What do you do?",
      },
      choices: [
        {
          label: { az: "Birgə görüş təşkil et və qərar meyarları razılaşdır", tr: "Ortak toplantı düzenle ve karar kriterlerinde uzlaş", en: "Bring them together and agree decision criteria" },
          detail: { az: "Fikirlərə yox, meyarlara əsaslanan qərar", tr: "Kişilere değil kriterlere dayalı karar", en: "Decide on criteria, not on personalities" },
          feedback: {
            az: "Təhlükəsizlik, xərc və çatdırılma müddəti meyarları ilə variantlar müqayisə olundu. Hər iki developer qərarı qəbul etdi, çünki proses ədalətli idi.",
            tr: "Seçenekler güvenlik, maliyet ve teslim süresi kriterleriyle karşılaştırıldı. Süreç adil olduğu için iki geliştirici de kararı kabul etti.",
            en: "The options were compared on security, cost and delivery time. Both developers accepted the outcome because the process was fair.",
          },
          cash: -200, sat: 8, rep: 8, variance: 0,
        },
        {
          label: { az: "Daha təcrübəli olanın tərəfini tut", tr: "Daha deneyimli olanın tarafını tut", en: "Side with the more experienced one" },
          detail: { az: "Sürətli qərar, amma biri məğlub olur", tr: "Hızlı karar ama biri kaybeder", en: "Quick, but someone loses" },
          feedback: {
            az: "İş davam etdi, amma digər developer özünü kənarda qalmış hiss edir və artıq iclaslarda susur. Komandada \"favoritlər\" söhbəti başladı.",
            tr: "İş devam etti ama diğer geliştirici dışlanmış hissediyor ve artık toplantılarda susuyor. Ekipte \"gözdeler\" konuşulmaya başladı.",
            en: "Work resumed, but the other developer feels sidelined and now stays silent in meetings. Talk of \"favourites\" has started in the team.",
          },
          cash: 0, sat: -10, rep: -3, variance: 0,
        },
        {
          label: { az: "Qoy özləri həll etsinlər", tr: "Kendi aralarında çözsünler", en: "Let them sort it out themselves" },
          detail: { az: "Müdaxilə yoxdur, gecikmə riski böyükdür", tr: "Müdahale yok, gecikme riski büyük", en: "No intervention, high risk of delay" },
          feedback: {
            az: "Mübahisə iki həftə də uzandı və sprint itdi. Komanda rəhbərin çətin anlarda kənara çəkildiyini gördü.",
            tr: "Tartışma iki hafta daha sürdü ve sprint kaybedildi. Ekip, yöneticinin zor anlarda geri çekildiğini gördü.",
            en: "The argument dragged on for two more weeks and a sprint was lost. The team saw their manager step back when it got hard.",
          },
          cash: -400, sat: -6, rep: -8, variance: 300,
        },
      ],
    },
    {
      title: { az: "Dedlayn təzyiqi", tr: "Teslim tarihi baskısı", en: "Deadline pressure" },
      context: {
        az: "Böyük bank müştərisi yeni funksiyanı 3 həftə tez istəyir və rəhbərlik \"bəli\" deyib. Komanda artıq tam yüklənib. Necə cavab verirsiniz?",
        tr: "Büyük bir banka müşterisi yeni özelliği 3 hafta erken istiyor ve üst yönetim \"evet\" dedi. Ekip zaten tam kapasitede. Nasıl karşılık verirsiniz?",
        en: "A major bank client wants the new feature 3 weeks early, and management has already said \"yes\". The team is already at full capacity. How do you respond?",
      },
      choices: [
        {
          label: { az: "Həcmi müzakirə et: əvvəl əsas hissəni çatdır", tr: "Kapsamı müzakere et: önce temel kısmı teslim et", en: "Negotiate scope: ship the core first" },
          detail: { az: "Müştəri və rəhbərliklə açıq danışıq", tr: "Müşteri ve yönetimle açık konuşma", en: "An honest conversation with client and management" },
          feedback: {
            az: "Müştəri ən vacib hissəni vaxtında aldı, qalanı iki həftə sonra gəldi. Bank razı qaldı, komanda isə tükənmədi.",
            tr: "Müşteri en önemli kısmı zamanında aldı, kalanı iki hafta sonra geldi. Banka memnun kaldı, ekip ise tükenmedi.",
            en: "The client got the most important part on time and the rest two weeks later. The bank was satisfied and the team didn't burn out.",
          },
          cash: 1500, sat: 6, rep: 7, variance: 300,
        },
        {
          label: { az: "Komandadan iş həftəsonları da işləməyi tələb et", tr: "Ekipten hafta sonları da çalışmasını iste", en: "Ask the team to work weekends" },
          detail: { az: "Dedlayn tutulur, insanlar yorulur", tr: "Tarih tutulur, insanlar yorulur", en: "The deadline is met, people get exhausted" },
          feedback: {
            az: "Funksiya vaxtında çıxdı və bonus büdcəsi gəldi, amma iki nəfər xəstə vərəqəsi götürdü və səhvlər artdı. Komanda bunun normaya çevrilməsindən qorxur.",
            tr: "Özellik zamanında çıktı ve bonus bütçesi geldi ama iki kişi rapor aldı ve hatalar arttı. Ekip bunun normale dönüşmesinden korkuyor.",
            en: "The feature shipped on time and a bonus budget followed, but two people went on sick leave and bugs increased. The team fears this will become the norm.",
          },
          cash: 2500, sat: -15, rep: 2, variance: 400,
        },
        {
          label: { az: "Kənar podratçılar cəlb et", tr: "Dış yükleniciler getir", en: "Bring in outside contractors" },
          detail: { az: "Bahalıdır, adaptasiya vaxt alır", tr: "Pahalı, uyum süreci zaman alır", en: "Expensive, and onboarding takes time" },
          feedback: {
            az: "Podratçılar kömək etdi, amma onların işini yoxlamaq komandanın vaxtını aldı. Dedlayn az fərqlə tutuldu, büdcə isə ciddi xərcləndi.",
            tr: "Yükleniciler yardımcı oldu ama işlerini kontrol etmek ekibin zamanını aldı. Tarih kıl payı tutuldu, bütçe ise ciddi harcandı.",
            en: "The contractors helped, but reviewing their work ate into the team's time. The deadline was only just met and the budget took a real hit.",
          },
          cash: -1500, sat: 0, rep: 4, variance: 500,
        },
      ],
    },
    {
      title: { az: "Zəif performans", tr: "Düşük performans", en: "Underperformance" },
      context: {
        az: "Komandanın ən uzunmüddətli üzvlərindən biri son iki ayda tapşırıqları gecikdirir, digərləri onun işini görməli olur. Nə edirsiniz?",
        tr: "Ekibin en kıdemli üyelerinden biri son iki aydır görevleri geciktiriyor, diğerleri onun işini yapmak zorunda kalıyor. Ne yaparsınız?",
        en: "One of the longest-serving team members has been missing deadlines for two months, and others are picking up the slack. What do you do?",
      },
      choices: [
        {
          label: { az: "Açıq söhbət et və inkişaf planı qur", tr: "Açık konuş ve gelişim planı kur", en: "Talk openly and agree an improvement plan" },
          detail: { az: "Səbəbi öyrən, aydın gözləntilər qoy", tr: "Nedeni öğren, net beklentiler koy", en: "Find the cause and set clear expectations" },
          feedback: {
            az: "Məlum oldu ki, ailəsində çətinlik var. Çevik qrafik və aydın hədəflərlə iki ay sonra performansı bərpa olundu. Komanda ədalətli davrandığınızı gördü.",
            tr: "Ailesinde bir zorluk olduğu ortaya çıktı. Esnek çalışma ve net hedeflerle iki ay sonra performansı toparlandı. Ekip adil davrandığınızı gördü.",
            en: "It turned out there were difficulties at home. With flexible hours and clear goals, performance recovered within two months. The team saw you act fairly.",
          },
          cash: -300, sat: 6, rep: 6, variance: 0,
        },
        {
          label: { az: "Dərhal işdən çıxar", tr: "Hemen işten çıkar", en: "Let them go immediately" },
          detail: { az: "Problem tez həll olunur, amma necə?", tr: "Sorun hızlı çözülür ama nasıl?", en: "Fast, but at what cost?" },
          feedback: {
            az: "Maaş xərci azaldı, amma komanda söhbətsiz işdən çıxarılmanı gördü və hər kəs \"növbəti mən ola bilərəm\" deyə düşünür. Təcrübəli biliklər də getdi.",
            tr: "Maaş gideri azaldı ama ekip konuşmadan yapılan işten çıkarmayı gördü ve herkes \"sıradaki ben olabilirim\" diye düşünüyor. Deneyimli bilgi de gitti.",
            en: "Salary costs fell, but the team saw someone fired without a conversation and now everyone wonders if they're next. Valuable knowledge left too.",
          },
          cash: 600, sat: -10, rep: -4, variance: 0,
        },
        {
          label: { az: "Görməzdən gəl, işi başqalarına payla", tr: "Görmezden gel, işi başkalarına dağıt", en: "Ignore it and redistribute the work" },
          detail: { az: "Narahat söhbətdən qaçmaq", tr: "Rahatsız edici konuşmadan kaçmak", en: "Avoid an uncomfortable conversation" },
          feedback: {
            az: "Ən yaxşı işçiləriniz əlavə yükdən narazıdır və biri artıq başqa təklif aldığını deyib. Problem böyüdü, həll olunmadı.",
            tr: "En iyi çalışanlarınız ek yükten memnun değil ve biri başka bir teklif aldığını söyledi. Sorun büyüdü, çözülmedi.",
            en: "Your best people resent the extra load and one has mentioned another job offer. The problem grew instead of going away.",
          },
          cash: 0, sat: -8, rep: -6, variance: 0,
        },
      ],
    },
    {
      title: { az: "Cümə gecəsi böhran", tr: "Cuma gecesi kriz", en: "Friday-night crisis" },
      context: {
        az: "Cümə axşamı yeni buraxılışdan sonra ödənişlər 2 saat işləmədi, minlərlə istifadəçi təsirləndi. Səbəb komandanızdan birinin səhvidir. Necə idarə edirsiniz?",
        tr: "Cuma akşamı yeni sürümden sonra ödemeler 2 saat çalışmadı, binlerce kullanıcı etkilendi. Neden ekibinizden birinin hatası. Nasıl yönetirsiniz?",
        en: "On Friday evening, after a new release, payments were down for 2 hours and thousands of users were affected. The cause was a mistake by one of your team. How do you handle it?",
      },
      choices: [
        {
          label: { az: "Böhranı özün idarə et və günahsız təhlil apar", tr: "Krizi bizzat yönet ve suçlamasız analiz yap", en: "Lead the incident and run a blameless review" },
          detail: { az: "Müştərilərə açıq məlumat, prosesi düzəlt", tr: "Müşterilere açık bilgi, süreci düzelt", en: "Be open with users, fix the process" },
          feedback: {
            az: "Sistem tez bərpa olundu, istifadəçilərə dürüst izahat getdi. Təhlil göstərdi ki, problem fərddə deyil, test prosesindədir — avtomatik yoxlama əlavə olundu.",
            tr: "Sistem hızla toparlandı, kullanıcılara dürüst bir açıklama gitti. Analiz, sorunun kişide değil test sürecinde olduğunu gösterdi — otomatik kontrol eklendi.",
            en: "Service was restored quickly and users received an honest explanation. The review showed the problem was the test process, not a person — an automated check was added.",
          },
          cash: -500, sat: 8, rep: 10, variance: 200,
        },
        {
          label: { az: "Səhv edəni tap və hamının qarşısında xəbərdarlıq et", tr: "Hatayı yapanı bul ve herkesin önünde uyar", en: "Find who did it and reprimand them publicly" },
          detail: { az: "Məsuliyyət göstərir, amma qorxu yaradır", tr: "Hesap sorar ama korku yaratır", en: "Shows accountability, but breeds fear" },
          feedback: {
            az: "Developer utandı, komanda isə səhvləri gizlətməyə başladı. Növbəti problem gec aşkarlandı, çünki heç kim xəbər vermək istəmirdi.",
            tr: "Geliştirici utandı, ekip ise hataları saklamaya başladı. Bir sonraki sorun geç fark edildi çünkü kimse haber vermek istemedi.",
            en: "The developer was humiliated and the team began hiding mistakes. The next problem was found late because nobody wanted to report it.",
          },
          cash: -500, sat: -12, rep: -5, variance: 0,
        },
        {
          label: { az: "Hadisəni kiçilt, müştərilərə xəbər vermə", tr: "Olayı küçült, müşterilere bildirme", en: "Play it down and don't tell users" },
          detail: { az: "Qısamüddətli rahatlıq, uzunmüddətli risk", tr: "Kısa vadeli rahatlık, uzun vadeli risk", en: "Short-term calm, long-term risk" },
          feedback: {
            az: "İstifadəçilər sosial şəbəkələrdə yazmağa başladı və tənzimləyici izahat istədi. Gizlətmə cəhdi böhrandan daha çox ziyan vurdu.",
            tr: "Kullanıcılar sosyal medyada yazmaya başladı ve düzenleyici açıklama istedi. Saklama girişimi krizin kendisinden daha çok zarar verdi.",
            en: "Users started posting on social media and the regulator asked for an explanation. The cover-up did more damage than the outage itself.",
          },
          cash: -900, sat: -4, rep: -15, variance: 800,
        },
      ],
    },
    {
      title: { az: "Kvartal nəticələri", tr: "Çeyrek sonuçları", en: "Quarterly review" },
      context: {
        az: "Kvartal bitdi və rəhbərliyə nəticələri təqdim edirsiniz. Növbəti kvartalın büdcəsi bu təqdimatdan asılıdır. Necə təqdim edirsiniz?",
        tr: "Çeyrek bitti ve üst yönetime sonuçları sunuyorsunuz. Bir sonraki çeyreğin bütçesi bu sunuma bağlı. Nasıl sunarsınız?",
        en: "The quarter has ended and you are presenting results to senior management. Next quarter's budget depends on it. How do you present?",
      },
      choices: [
        {
          label: { az: "Dürüst rəqəmlər və komandanın əməyini önə çıxar", tr: "Dürüst rakamlar ve ekibin emeğini öne çıkar", en: "Honest numbers, with credit to the team" },
          detail: { az: "Uğurlar da, dərslər də", tr: "Başarılar da dersler de", en: "Wins and lessons alike" },
          feedback: {
            az: "Rəhbərlik şəffaflığı yüksək qiymətləndirdi və büdcəni artırdı. Komanda adlarının çəkildiyini eşidəndə motivasiya yüksəldi.",
            tr: "Üst yönetim şeffaflığı takdir etti ve bütçeyi artırdı. Ekip isimlerinin anıldığını duyunca motivasyon yükseldi.",
            en: "Management valued the transparency and increased the budget. Morale rose when the team heard their names mentioned.",
          },
          cash: 4000, sat: 6, rep: 6, variance: 500,
        },
        {
          label: { az: "Uğurları öz adına təqdim et", tr: "Başarıları kendi adına sun", en: "Present the wins as your own" },
          detail: { az: "Şəxsi imic üçün qısa yol", tr: "Kişisel imaj için kestirme", en: "A shortcut for your personal image" },
          feedback: {
            az: "Büdcə artırıldı, amma təqdimat komandaya çatdı. İnsanlar əməklərinin mənimsənildiyini düşünür və etimad zədələndi.",
            tr: "Bütçe artırıldı ama sunum ekibe ulaştı. İnsanlar emeklerinin sahiplenildiğini düşünüyor ve güven zedelendi.",
            en: "The budget went up, but the slides reached the team. People feel their work was taken from them and trust is damaged.",
          },
          cash: 4500, sat: -15, rep: -6, variance: 500,
        },
        {
          label: { az: "Növbəti kvartal üçün iddialı vədlər ver", tr: "Gelecek çeyrek için iddialı sözler ver", en: "Make bold promises for next quarter" },
          detail: { az: "Böyük büdcə, böyük risk", tr: "Büyük bütçe, büyük risk", en: "Bigger budget, bigger risk" },
          feedback: {
            az: "Rəhbərlik ən böyük büdcəni ayırdı, amma komanda vədlərin real olmadığını bilir. Növbəti kvartal təzyiq altında başlayır.",
            tr: "Üst yönetim en büyük bütçeyi ayırdı ama ekip sözlerin gerçekçi olmadığını biliyor. Gelecek çeyrek baskı altında başlıyor.",
            en: "Management allocated the biggest budget, but the team knows the promises aren't realistic. Next quarter starts under pressure.",
          },
          cash: 6000, sat: -6, rep: -10, variance: 1500,
        },
      ],
    },
  ],
};

export const INVESTOR_READINESS: ScenarioDef = {
  key: "investor_readiness",
  startCash: 4000,
  targetCash: 40000,
  description: {
    az: "GreenRoute — yük daşımalarında yanacaq sərfiyyatını azaldan startapsınız və ilk investisiya raundunu cəlb etməlisiniz. 6 raundda hazırlıqdan term sheet-ə qədər: hər qərar kapitala, investor marağına və reputasiyaya təsir edir.",
    tr: "GreenRoute — yük taşımacılığında yakıt tüketimini azaltan bir girişimsiniz ve ilk yatırım turunu almanız gerekiyor. 6 turda hazırlıktan term sheet'e: her karar sermayeyi, yatırımcı ilgisini ve itibarı etkiler.",
    en: "GreenRoute — your startup cuts fuel use in freight transport and needs to raise its first round. In 6 rounds, from preparation to the term sheet: every decision affects capital, investor interest and reputation.",
  },
  rounds: [
    {
      title: { az: "Hazırlıq", tr: "Hazırlık", en: "Getting ready" },
      context: {
        az: "6 aylıq pulunuz qalıb, 3 pilot müştəriniz var. İnvestorlarla görüşməzdən əvvəl nəyə vaxt ayırırsınız?",
        tr: "6 aylık paranız kaldı, 3 pilot müşteriniz var. Yatırımcılarla görüşmeden önce neye zaman ayırırsınız?",
        en: "You have 6 months of runway and 3 pilot customers. Before meeting investors, where do you spend your time?",
      },
      choices: [
        {
          label: { az: "Metrikləri və data room-u qaydaya sal", tr: "Metrikleri ve data room'u düzenle", en: "Get metrics and a data room in order" },
          detail: { az: "Gəlir, müştəri, xərc — hamısı bir yerdə", tr: "Gelir, müşteri, maliyet — hepsi bir arada", en: "Revenue, customers, costs — all in one place" },
          feedback: {
            az: "Pilotların nəticələri ölçüldü: yanacaq sərfiyyatı orta hesabla 11% azalıb. Bu rəqəm bütün sonrakı danışıqların təməli oldu.",
            tr: "Pilotların sonuçları ölçüldü: yakıt tüketimi ortalama %11 azalmış. Bu rakam sonraki tüm görüşmelerin temeli oldu.",
            en: "You measured the pilots: fuel use fell by 11% on average. That number became the foundation of every conversation that followed.",
          },
          cash: -600, sat: 6, rep: 8, variance: 0,
        },
        {
          label: { az: "Dizaynerə gözəl pitch deck sifariş et", tr: "Tasarımcıya şık bir pitch deck yaptır", en: "Hire a designer for a beautiful deck" },
          detail: { az: "Göz oxşayır, məzmun isə zəifdir", tr: "Göze hoş gelir, içerik zayıf", en: "Looks great, the substance is thin" },
          feedback: {
            az: "Slaydlar təsirli görünür, amma ilk sual — \"pilotlarda nə ölçdünüz?\" — cavabsız qaldı. Forma məzmunu əvəz etmədi.",
            tr: "Slaytlar etkileyici görünüyor ama ilk soru — \"pilotlarda neyi ölçtünüz?\" — cevapsız kaldı. Biçim içeriğin yerini tutmadı.",
            en: "The slides look impressive, but the first question — \"what did you measure in the pilots?\" — went unanswered. Style didn't replace substance.",
          },
          cash: -1200, sat: 3, rep: -2, variance: 0,
        },
        {
          label: { az: "Hazırlıqsız birbaşa investorlara yaz", tr: "Hazırlıksız doğrudan yatırımcılara yaz", en: "Write to investors straight away" },
          detail: { az: "Sürətli, amma ilk təəssürat bir dəfə olur", tr: "Hızlı ama ilk izlenim bir kez olur", en: "Fast, but you only get one first impression" },
          feedback: {
            az: "Bir neçə görüş alındı, amma rəqəmlərin olmaması ciddi sual doğurdu. İki fond \"daha sonra yenidən danışaq\" dedi.",
            tr: "Birkaç görüşme alındı ama rakamların olmaması ciddi soru işaretleri yarattı. İki fon \"daha sonra tekrar konuşalım\" dedi.",
            en: "You landed a few meetings, but the missing numbers raised serious doubts. Two funds said \"let's talk again later\".",
          },
          cash: 0, sat: -8, rep: -6, variance: 0,
        },
      ],
    },
    {
      title: { az: "Pitch hekayəsi", tr: "Pitch hikâyesi", en: "The pitch story" },
      context: {
        az: "Təqdimatınız 10 dəqiqədir. Hekayəni nəyin üzərində qurursunuz?",
        tr: "Sunumunuz 10 dakika. Hikâyeyi neyin üzerine kuruyorsunuz?",
        en: "Your pitch is 10 minutes long. What do you build the story around?",
      },
      choices: [
        {
          label: { az: "Problem → həll → pilot nəticələri", tr: "Problem → çözüm → pilot sonuçları", en: "Problem → solution → pilot results" },
          detail: { az: "Sübut olunmuş dəyər önə çəkilir", tr: "Kanıtlanmış değer öne çıkar", en: "Leads with proven value" },
          feedback: {
            az: "İnvestorlar real müştəri nəticəsini gördü və sual-cavab bazar ölçüsünə keçdi. Bu, hekayənin işlədiyini göstərir.",
            tr: "Yatırımcılar gerçek müşteri sonucunu gördü ve soru-cevap pazar büyüklüğüne geçti. Bu, hikâyenin işe yaradığını gösteriyor.",
            en: "Investors saw a real customer outcome and the Q&A moved on to market size — a sign the story works.",
          },
          cash: -200, sat: 10, rep: 5, variance: 0,
        },
        {
          label: { az: "Texnologiyanın detallarını göstər", tr: "Teknolojinin ayrıntılarını göster", en: "Walk through the technology in detail" },
          detail: { az: "Komanda üçün maraqlı, investor üçün yox", tr: "Ekip için ilginç, yatırımcı için değil", en: "Fascinating to you, less so to investors" },
          feedback: {
            az: "Alqoritmlər təsirli idi, amma investorlar \"bunu kim, niyə alır?\" sualına cavab tapmadı. Diqqət ortada itdi.",
            tr: "Algoritmalar etkileyiciydi ama yatırımcılar \"bunu kim, neden alır?\" sorusuna cevap bulamadı. Dikkat ortada kayboldu.",
            en: "The algorithms were impressive, but investors couldn't see who would buy it and why. Attention drifted halfway through.",
          },
          cash: -200, sat: -4, rep: 2, variance: 0,
        },
        {
          label: { az: "Bazar rəqəmlərini şişirt", tr: "Pazar rakamlarını abart", en: "Inflate the market numbers" },
          detail: { az: "\"Milyardlıq bazar\" effekti", tr: "\"Milyarlık pazar\" etkisi", en: "The \"billion-dollar market\" effect" },
          feedback: {
            az: "İlk anda maraq yarandı, amma analitik bir investor mənbələri yoxladı və rəqəmlərin uyğun gəlmədiyini gördü. Söz-söhbət tez yayılır.",
            tr: "İlk anda ilgi oluştu ama analitik bir yatırımcı kaynakları kontrol etti ve rakamların tutmadığını gördü. Bu dünyada laf çabuk yayılır.",
            en: "It sparked interest at first, but an analytical investor checked the sources and found the numbers didn't add up. Word travels fast.",
          },
          cash: 0, sat: 6, rep: -12, variance: 0,
        },
      ],
    },
    {
      title: { az: "İnvestor seçimi", tr: "Yatırımcı seçimi", en: "Choosing investors" },
      context: {
        az: "Kimə müraciət edəcəyinizi seçməlisiniz. Vaxt və enerji məhduddur.",
        tr: "Kime başvuracağınızı seçmelisiniz. Zaman ve enerji sınırlı.",
        en: "You need to decide who to approach. Time and energy are limited.",
      },
      choices: [
        {
          label: { az: "Logistika və iqlim sahəsində 25 fond və mələk seç", tr: "Lojistik ve iklim alanında 25 fon ve melek yatırımcı seç", en: "Shortlist 25 funds and angels in logistics and climate" },
          detail: { az: "Tanışlıq vasitəsilə, fərdi müraciət", tr: "Tanıdık aracılığıyla, kişisel başvuru", en: "Warm introductions, personal approach" },
          feedback: {
            az: "Görüşlərin yarısı alındı və iki fond ikinci görüşə çağırdı. Sahəni bilən investorlar dəyəri tez anladı.",
            tr: "Görüşmelerin yarısı gerçekleşti ve iki fon ikinci görüşmeye çağırdı. Sektörü bilen yatırımcılar değeri hemen anladı.",
            en: "Half of them agreed to meet and two funds invited you back. Investors who know the sector grasped the value quickly.",
          },
          cash: -400, sat: 10, rep: 6, variance: 0,
        },
        {
          label: { az: "200 investora eyni e-poçtu göndər", tr: "200 yatırımcıya aynı e-postayı gönder", en: "Send the same email to 200 investors" },
          detail: { az: "Rəqəmlər oyunu", tr: "Sayılar oyunu", en: "A numbers game" },
          feedback: {
            az: "Cavab dərəcəsi 3% oldu və bir neçə investor şablon məktubu digərləri ilə müzakirə etdi. Kütləvi yanaşma ciddiyyət göstərmədi.",
            tr: "Yanıt oranı %3 oldu ve birkaç yatırımcı şablon e-postayı diğerleriyle konuştu. Toplu yaklaşım ciddiyet göstermedi.",
            en: "The reply rate was 3%, and a few investors compared notes on the template email. The mass approach didn't signal seriousness.",
          },
          cash: -100, sat: -6, rep: -6, variance: 0,
        },
        {
          label: { az: "Yalnız dost və ailədən pul topla", tr: "Sadece eş dost ve aileden para topla", en: "Raise only from friends and family" },
          detail: { az: "Asan pul, kiçik məbləğ", tr: "Kolay para, küçük tutar", en: "Easy money, small amounts" },
          feedback: {
            az: "Bir az vaxt qazandınız, amma bu məbləğ böyümə üçün kifayət deyil və peşəkar investorlar hələ də sizi tanımır.",
            tr: "Biraz zaman kazandınız ama bu tutar büyüme için yetmiyor ve profesyonel yatırımcılar sizi hâlâ tanımıyor.",
            en: "You bought some time, but the amount won't fund growth and professional investors still don't know you.",
          },
          cash: 5000, sat: -4, rep: -2, variance: 2000,
        },
      ],
    },
    {
      title: { az: "Sual-cavab", tr: "Soru-cevap", en: "The Q&A" },
      context: {
        az: "Fond tərəfdaşı soruşur: \"Böyük logistika şirkətləri bunu özləri tiksə, nə olacaq?\" Bu, ən zəif nöqtənizdir. Necə cavab verirsiniz?",
        tr: "Fon ortağı soruyor: \"Büyük lojistik şirketleri bunu kendileri geliştirirse ne olur?\" Bu en zayıf noktanız. Nasıl cevap verirsiniz?",
        en: "A fund partner asks: \"What happens if the big logistics companies build this themselves?\" It is your weakest point. How do you answer?",
      },
      choices: [
        {
          label: { az: "Riski qəbul et və azaltma planını göstər", tr: "Riski kabul et ve azaltma planını göster", en: "Acknowledge the risk and show your mitigation" },
          detail: { az: "Dürüstlük + strategiya", tr: "Dürüstlük + strateji", en: "Honesty plus strategy" },
          feedback: {
            az: "\"Bəli, risk var — buna görə orta ölçülü daşıyıcılara fokuslanırıq və məlumat üstünlüyümüz böyüyür\" cavabı inam yaratdı. Tərəfdaş qeyd götürdü.",
            tr: "\"Evet, risk var — bu yüzden orta ölçekli taşıyıcılara odaklanıyoruz ve veri avantajımız büyüyor\" cevabı güven yarattı. Ortak not aldı.",
            en: "\"Yes, that's a risk — which is why we focus on mid-sized carriers and our data advantage keeps growing\" built trust. The partner took notes.",
          },
          cash: 0, sat: 8, rep: 10, variance: 0,
        },
        {
          label: { az: "Sualdan yayın, mövzunu dəyiş", tr: "Sorudan kaç, konuyu değiştir", en: "Dodge the question and change topic" },
          detail: { az: "Zəif nöqtəni gizlətmək", tr: "Zayıf noktayı saklamak", en: "Hide the weak spot" },
          feedback: {
            az: "Tərəfdaş sualı iki dəfə təkrarladı. Yayınma riskin özündən daha böyük narahatlıq yaratdı.",
            tr: "Ortak soruyu iki kez tekrarladı. Kaçamak cevap, riskin kendisinden daha büyük endişe yarattı.",
            en: "The partner repeated the question twice. Evasion worried them more than the risk itself.",
          },
          cash: 0, sat: -8, rep: -6, variance: 0,
        },
        {
          label: { az: "\"Rəqibimiz yoxdur\" de və böyük artım vəd et", tr: "\"Rakibimiz yok\" de ve büyük büyüme sözü ver", en: "Say \"we have no competition\" and promise huge growth" },
          detail: { az: "Özünəinam, yoxsa sadəlövhlük?", tr: "Özgüven mi, saflık mı?", en: "Confidence, or naivety?" },
          feedback: {
            az: "\"Rəqibimiz yoxdur\" investorlar üçün qırmızı bayraqdır: ya bazar yoxdur, ya da siz onu tanımırsınız. Coşqu var, etibar yox.",
            tr: "\"Rakibimiz yok\" yatırımcılar için kırmızı bayraktır: ya pazar yoktur ya da siz onu tanımıyorsunuz. Heyecan var, güven yok.",
            en: "\"No competition\" is a red flag to investors: either there is no market or you don't understand it. Enthusiasm, but no trust.",
          },
          cash: 0, sat: 6, rep: -10, variance: 0,
        },
      ],
    },
    {
      title: { az: "Due diligence", tr: "Due diligence", en: "Due diligence" },
      context: {
        az: "Aparıcı fond due diligence-ə başladı. Yoxlama zamanı köhnə bir müqavilədə əqli mülkiyyət hüququ ilə bağlı qüsur tapdınız. Nə edirsiniz?",
        tr: "Lider fon due diligence'a başladı. İnceleme sırasında eski bir sözleşmede fikri mülkiyet hakkıyla ilgili bir kusur buldunuz. Ne yaparsınız?",
        en: "The lead fund has started due diligence. While preparing, you find a flaw in an old contract concerning intellectual property rights. What do you do?",
      },
      choices: [
        {
          label: { az: "Problemi özün bildir və həll planı təqdim et", tr: "Sorunu kendin bildir ve çözüm planı sun", en: "Disclose it yourself with a fix" },
          detail: { az: "Hüquqşünasla tez düzəliş", tr: "Avukatla hızlı düzeltme", en: "A quick fix with a lawyer" },
          feedback: {
            az: "Fond açıqlığı yüksək qiymətləndirdi; düzəliş iki həftəyə imzalandı. Tərəfdaş: \"Biz pis xəbəri erkən deyən təsisçilərə investisiya edirik.\"",
            tr: "Fon açıklığı takdir etti; düzeltme iki haftada imzalandı. Ortak: \"Kötü haberi erken veren kurucuların arkasında dururuz.\"",
            en: "The fund appreciated the openness; the fix was signed within two weeks. The partner said: \"We back founders who share bad news early.\"",
          },
          cash: -800, sat: 8, rep: 8, variance: 0,
        },
        {
          label: { az: "Susmaq, bəlkə görməzlər", tr: "Sessiz kal, belki fark etmezler", en: "Stay quiet and hope they miss it" },
          detail: { az: "Ən ucuz, ən təhlükəli", tr: "En ucuz, en tehlikeli", en: "Cheapest, and most dangerous" },
          feedback: {
            az: "Fondun hüquqşünasları qüsuru tapdı. İndi sual problemin özü deyil, onu gizlətməyiniz oldu — danışıqlar dondu.",
            tr: "Fonun avukatları kusuru buldu. Artık mesele sorunun kendisi değil, onu saklamanız — görüşmeler dondu.",
            en: "The fund's lawyers found it. Now the issue isn't the flaw but the fact that you hid it — talks have been put on ice.",
          },
          cash: 0, sat: -12, rep: -15, variance: 0,
        },
        {
          label: { az: "Bahalı hüquq firmasına hər şeyi yenidən yazdır", tr: "Pahalı bir hukuk bürosuna her şeyi yeniden yazdır", en: "Have an expensive law firm redo everything" },
          detail: { az: "Təmiz, amma kapitalı yeyir", tr: "Temiz ama sermayeyi eritir", en: "Clean, but burns capital" },
          feedback: {
            az: "Sənədlər qüsursuzdur, amma ödəniş pulunuzun ciddi hissəsini apardı və proses bir ay uzandı.",
            tr: "Belgeler kusursuz ama ücret paranızın ciddi bir kısmını götürdü ve süreç bir ay uzadı.",
            en: "The paperwork is flawless, but the fees took a big bite out of your cash and the process slipped by a month.",
          },
          cash: -3000, sat: 4, rep: 4, variance: 0,
        },
      ],
    },
    {
      title: { az: "Term sheet", tr: "Term sheet", en: "The term sheet" },
      context: {
        az: "Masada iki təklif var: sahəni bilən fond ədalətli qiymətləndirmə ilə, digər investor isə daha çox pulu ağır şərtlərlə təklif edir. Hansını seçirsiniz?",
        tr: "Masada iki teklif var: sektörü bilen fon adil bir değerlemeyle, diğer yatırımcı ise daha fazla parayı ağır koşullarla teklif ediyor. Hangisini seçersiniz?",
        en: "Two offers are on the table: a sector-savvy fund at a fair valuation, and another investor offering more money on harsh terms. Which do you choose?",
      },
      choices: [
        {
          label: { az: "Sahəni bilən fondun ədalətli təklifi", tr: "Sektörü bilen fonun adil teklifi", en: "The sector fund's fair offer" },
          detail: { az: "Daha az pul, güclü tərəfdaş", tr: "Daha az para, güçlü ortak", en: "Less money, a strong partner" },
          feedback: {
            az: "Raund bağlandı. Fond ilk ayda iki böyük daşıyıcı ilə görüş təşkil etdi — pul qədər əlaqələr də dəyərlidir.",
            tr: "Tur kapandı. Fon ilk ayda iki büyük taşıyıcıyla görüşme ayarladı — bağlantılar da para kadar değerli.",
            en: "The round closed. Within a month the fund set up meetings with two large carriers — the network is worth as much as the money.",
          },
          cash: 35000, sat: 6, rep: 8, variance: 2000,
        },
        {
          label: { az: "Ən yüksək məbləğ, ağır şərtlər", tr: "En yüksek tutar, ağır koşullar", en: "Most money, harsh terms" },
          detail: { az: "3x likvidasiya üstünlüyü və idarə heyətində nəzarət", tr: "3x tasfiye tercihi ve yönetim kurulu kontrolü", en: "3x liquidation preference and board control" },
          feedback: {
            az: "Hesabda daha çox pul var, amma qərarlar artıq sizdən asılı deyil və növbəti investorlar bu şərtləri görüb geri çəkilir.",
            tr: "Hesapta daha fazla para var ama kararlar artık size bağlı değil ve sonraki yatırımcılar bu koşulları görüp geri çekiliyor.",
            en: "There is more money in the bank, but decisions are no longer yours and future investors back away when they see these terms.",
          },
          cash: 45000, sat: -6, rep: -8, variance: 3000,
        },
        {
          label: { az: "Hər ikisini rədd et, gəlirlə böyü", tr: "İkisini de reddet, gelirle büyü", en: "Decline both and grow on revenue" },
          detail: { az: "Tam nəzarət, yavaş böyümə", tr: "Tam kontrol, yavaş büyüme", en: "Full control, slow growth" },
          feedback: {
            az: "Şirkət sizindir, amma pul azdır və rəqiblər investisiya ilə sürətlə böyüyür. İnvestorlar sizi \"qərarsız\" kimi xatırlayacaq.",
            tr: "Şirket sizin ama para az ve rakipler yatırımla hızla büyüyor. Yatırımcılar sizi \"kararsız\" olarak hatırlayacak.",
            en: "The company is all yours, but cash is tight and competitors are scaling on fresh funding. Investors will remember you as indecisive.",
          },
          cash: 3000, sat: -10, rep: 2, variance: 1000,
        },
      ],
    },
  ],
};

export const SCENARIOS: ScenarioDef[] = [LEADERSHIP, INVESTOR_READINESS];
