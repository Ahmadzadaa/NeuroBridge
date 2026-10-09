/**
 * Turkish and English versions of the "TexnoStart" scenario in
 * prisma/seed-simulation.ts. Same shape and order as its ROUNDS (AZ source).
 */

export interface ScenarioTranslation {
  description: string;
  rounds: {
    title: string;
    context: string;
    choices: { label: string; detail: string; feedback: string }[];
  }[];
}

export const TEXNOSTART_TR: ScenarioTranslation = {
  description:
    "TexnoStart — B2B SaaS girişimini 8 turda sıfırdan bölgesel bir oyuncuya dönüştür. Her kararın sermayeye, müşteri memnuniyetine ve itibara etkisi var.",
  rounds: [
    {
      title: "Fikir doğrulama",
      context:
        "Ekibiniz bir B2B SaaS fikri üzerinde çalışıyor: küçük şirketler için otomatik bir muhasebe asistanı. MVP'yi geliştirmeden önce pazarın bu sorunu gerçekten yaşadığını doğrulamanız gerekiyor. Zaman ve para kısıtlı — nasıl doğruluyorsunuz?",
      choices: [
        {
          label: "50 potansiyel müşteriyle yüz yüze görüşme yap",
          detail: "Yavaş ve pahalı, ama derin içgörü sağlar",
          feedback:
            "Görüşmeler altın değerinde bilgi verdi: müşteriler sorunu farklı adlandırıyor ve en çok raporlama kısmında zorlanıyorlar. Ürün yönünüz netleşti.",
        },
        {
          label: "Çevrimiçi anket gönder",
          detail: "Ucuz ve hızlı, ama yüzeysel yanıtlar",
          feedback:
            "Ankete 200 yanıt geldi, ama yanıtlar yüzeysel — sorunu doğruladınız, derinliğini değil. Bazı varsayımlar hâlâ test edilmedi.",
        },
        {
          label: "Doğrulamayı atla, doğrudan MVP geliştir",
          detail: "En hızlı yol, ama kör uçuş riski",
          feedback:
            "Zaman kazandınız, ama ilk demo görüşmelerinde müşterilerin beklentileri tahmininizden farklı çıktı. Şimdi geri dönüp düzeltmek daha pahalıya mal olacak.",
        },
      ],
    },
    {
      title: "MVP stratejisi",
      context:
        "Doğrulama aşaması geride kaldı. Şimdi ilk çalışan sürümü geliştirmek gerekiyor. Yatırımcınız yok, sermaye sınırlı ve rakip bir şirket de benzer bir yönde çalışıyor. MVP'yi nasıl geliştiriyorsunuz?",
      choices: [
        {
          label: "3 haftada minimal bir MVP çıkar",
          detail: "Yalnızca ana işlev — hızlı pazar testi",
          feedback:
            "MVP 3 haftada hazır oldu. Kaba görünse de temel değeri gösteriyor ve ilk kullanıcılar gerçek geri bildirim vermeye başladı.",
        },
        {
          label: "3 ayda tam işlevli bir ürün geliştir",
          detail: "Güçlü ilk izlenim, ama büyük maliyet ve gecikme",
          feedback:
            "Ürün eksiksiz oldu ve kullanıcılar kaliteyi övüyor. Ama bu 3 ayda rakip ilk müşterilerini topladı — pazara geç girdiniz.",
        },
        {
          label: "No-code araçlarla prototip kur",
          detail: "En ucuzu, ama teknik borç yaratır",
          feedback:
            "Prototip çalışıyor, ama yükleme sorunları var ve bazı müşteriler 'oyuncak gibi görünüyor' dedi. Yakında yeniden yazmanız gerekecek.",
        },
      ],
    },
    {
      title: "İlk müşteriler",
      context:
        "MVP hazır. Şimdi ilk gerçek müşterileri kazanma zamanı. Satış hunisinde ilgilenen 12 şirket var. Onlara hangi teklifle gidiyorsunuz?",
      choices: [
        {
          label: "5 şirkete ücretsiz pilot teklif et",
          detail: "Gelir yok, ama geri bildirim ve referans kazanırsın",
          feedback:
            "Pilot şirketler ürünü her gün kullanıyor ve ayrıntılı geri bildirim veriyor. İkisi ücretli sözleşmeye geçmeye hazır olduğunu söyledi — referanslarınız oluştu.",
        },
        {
          label: "Erken kayıt indirimiyle sat",
          detail: "Orta gelir + taahhüt veren müşteriler",
          feedback:
            "6 şirket indirimli yıllık paket aldı. Kasaya para girdi ve müşteriler ödeme yaptığı için ürünü ciddi şekilde kullanıyor.",
        },
        {
          label: "Tam fiyatla satmaya çalış",
          detail: "Yüksek marj, ama erken aşamada zor satış",
          feedback:
            "Yalnızca 2 şirket tam fiyatı kabul etti. Diğerleri 'ürün henüz kanıtlanmadı' deyip gitti — bazıları rakibe yöneldi.",
        },
      ],
    },
    {
      title: "Ekip büyümesi",
      context:
        "İş büyüyor ve üç kişilik ekip yetmiyor. Satış görüşmeleri teknik işleri yiyor, destek soruları gecikiyor. Kadro kararınız nedir?",
      choices: [
        {
          label: "Deneyimli bir B2B satışçı işe al",
          detail: "Pahalı, ama satış sürecini profesyonelleştirir",
          feedback:
            "Yeni satışçı ilk ayında satış hunisini üç katına çıkardı ve görüşmelerin kalitesi belirgin şekilde arttı.",
        },
        {
          label: "Üniversiteden stajyerler al",
          detail: "Ucuz iş gücü, ama eğitim zamanı ister",
          feedback:
            "Stajyerler destek ve test işlerini üstlendi. Eğitime zaman gitti, ama ekipte enerji arttı.",
        },
        {
          label: "Kimseyi işe alma, kendiniz yetişin",
          detail: "Para tasarrufu, ama tükenmişlik riski",
          feedback:
            "İki hafta 80 saatlik çalışmadan sonra destek yanıt süreleri uzadı ve bir müşteri memnuniyetsizliğini açıkça dile getirdi.",
        },
      ],
    },
    {
      title: "Pazarlama kanalı",
      context:
        "Ürün istikrara kavuştu, şimdi bir büyüme kanalı seçmek gerekiyor. Bütçe hâlâ sınırlı ve her kanalın kendi riski var. Nereye yatırım yapıyorsunuz?",
      choices: [
        {
          label: "Hedefli dijital reklam",
          detail: "Ölçülebilir sonuç, orta risk",
          feedback:
            "Reklam kampanyası pozitif ROI sağladı: harcanan her liraya iki lira geri dönüyor. Kanal çalışıyor ve büyütülebilir.",
        },
        {
          label: "Sektör konferansında stant",
          detail: "Pahalı, ama güçlü marka görünürlüğü",
          feedback:
            "Stant ilgi çekti: 40 nitelikli bağlantı, iki potansiyel kurumsal müşteri ve bir medya röportajı kazandınız.",
        },
        {
          label: "Viral sosyal medya kampanyası",
          detail: "Ucuz, ama sonucu tamamen belirsiz",
          feedback:
            "Kampanya videolarından biri beklenmedik şekilde yayıldı — binlerce izlenme ve çok sayıda kayıt getirdi, ama çoğu hedef segmentten değildi.",
        },
      ],
    },
    {
      title: "Müşteri krizi",
      context:
        "En büyük müşteriniz kritik bir hata buldu: ay sonu raporları yanlış rakamlar gösteriyor. Sözleşmeyi iptal etmekle tehdit ediyor ve sosyal medyada yazmaya hazırlanıyor. Tepkiniz?",
      choices: [
        {
          label: "Ekibi seferber et, tazminat teklif et",
          detail: "Pahalıya mal olur, ama güveni yeniden kurar",
          feedback:
            "Hata 36 saatte düzeltildi, müşteriye 2 aylık ücretsiz kullanım verdiniz. Müşteri o kadar etkilendi ki LinkedIn'de teşekkür paylaşımı yaptı.",
        },
        {
          label: "Standart destek süreciyle çöz",
          detail: "Dengeli yaklaşım, orta hız",
          feedback:
            "Hata bir haftada düzeltildi. Müşteri kaldı, ama ilişki soğudu — yenileme zamanında indirim isteyeceği hissediliyor.",
        },
        {
          label: "Sorunu küçümse, yeni satışlara odaklan",
          detail: "Kısa vadede para, uzun vadede itibar riski",
          feedback:
            "Müşteri sözleşmeyi iptal etti ve memnuniyetsizliğini iki sektör grubunda paylaştı. Yeni satışlar bunu hissetti — üç görüşme iptal edildi.",
        },
      ],
    },
    {
      title: "Yatırımcı masası",
      context:
        "Metrikler büyümeyi gösteriyor ve masada iki yatırım teklifi var. Tanınmış bir fon adil koşullarla tohum yatırım turu teklif ediyor; bir melek yatırımcı ise daha fazla parayı kötü koşullarla veriyor. Üçüncü yol — hiçbirini almamak.",
      choices: [
        {
          label: "Tanınmış fondan tohum yatırım al",
          detail: "Büyük sermaye + fonun ağı, adil hisse",
          feedback:
            "Tur kapandı! Fonun adı kapılar açıyor: iki kurumsal müşteri şimdiden görüşme istedi. Yeni kaynaklarla büyüme planı gerçekçi.",
        },
        {
          label: "Kendi kaynaklarınla devam et",
          detail: "Tam kontrol, ama yavaş büyüme",
          feedback:
            "Hissenizi korudunuz ve gelirle büyümeye devam ediyorsunuz. Büyüme yavaş, ama şirket tamamen sizin kontrolünüzde.",
        },
        {
          label: "Melek yatırımcının hızlı parasını al",
          detail: "Hızlı para, ama ağır koşullar ve müdahale hakkı",
          feedback:
            "Para hesapta, ama koşullar ağır: yatırımcı veto hakkı aldı ve gelecek turlarda hisseniz ciddi şekilde azalacak. Sektörde bu anlaşma olumsuz karşılandı.",
        },
      ],
    },
    {
      title: "Büyüme stratejisi",
      context:
        "Son karar: şirketin önümüzdeki yılı hangi yönde geçecek? Bu seçim nihai sonucunuzu belirleyecek.",
      choices: [
        {
          label: "Bölgesel pazara açıl",
          detail: "Büyük potansiyel, operasyonel karmaşıklık",
          feedback:
            "Komşu pazara giriş başarılı oldu: ilk ayda 15 yeni kurumsal müşteri. Şirketiniz artık bölgesel bir oyuncu sayılıyor. Simülasyon tamamlandı!",
        },
        {
          label: "Mevcut müşterilere odaklan, ürünü derinleştir",
          detail: "İstikrarlı gelir, yüksek sadakat",
          feedback:
            "Müşteri kaybı sıfıra indi ve mevcut müşteriler ek modüller almaya başladı. Sağlıklı, sürdürülebilir bir iş kurdunuz. Simülasyon tamamlandı!",
        },
        {
          label: "Agresif indirimle pazar payı kap",
          detail: "Hızlı büyüme, marj ve marka riski",
          feedback:
            "Müşteri sayısı fırladı, ama marj eridi ve 'ucuz alternatif' imajı oluştu. Büyüdünüz, ama konumunuz kırılgan. Simülasyon tamamlandı!",
        },
      ],
    },
  ],
};

export const TEXNOSTART_EN: ScenarioTranslation = {
  description:
    "TexnoStart — grow a B2B SaaS startup from zero to a regional player in 8 rounds. Every decision affects your capital, customer satisfaction and reputation.",
  rounds: [
    {
      title: "Idea validation",
      context:
        "Your team is working on a B2B SaaS idea: an automated bookkeeping assistant for small companies. Before building an MVP you need to check that the market really has this problem. Time and money are tight — how do you validate?",
      choices: [
        {
          label: "Interview 50 potential customers face to face",
          detail: "Slow and costly, but gives deep insight",
          feedback:
            "The interviews were pure gold: customers describe the problem differently and struggle most with reporting. Your product direction is now clear.",
        },
        {
          label: "Send an online survey",
          detail: "Cheap and fast, but shallow answers",
          feedback:
            "The survey got 200 responses, but they are shallow — you confirmed the problem, not its depth. Some assumptions are still untested.",
        },
        {
          label: "Skip validation and build the MVP straight away",
          detail: "The fastest path, but you are flying blind",
          feedback:
            "You saved time, but in the first demo meetings customers expected something different from what you assumed. Going back to fix it will now cost more.",
        },
      ],
    },
    {
      title: "MVP strategy",
      context:
        "Validation is behind you. Now you need a first working version. You have no investor, capital is limited and a competitor is working in a similar direction. How do you build the MVP?",
      choices: [
        {
          label: "Ship a minimal MVP in 3 weeks",
          detail: "Core feature only — a quick market test",
          feedback:
            "The MVP was ready in 3 weeks. It looks rough, but it shows the core value and the first users have started giving real feedback.",
        },
        {
          label: "Build a full-featured product in 3 months",
          detail: "A strong first impression, but high cost and delay",
          feedback:
            "The product came out complete and users praise its quality. But in those 3 months the competitor won its first customers — you entered the market late.",
        },
        {
          label: "Put together a prototype with no-code tools",
          detail: "The cheapest option, but it creates technical debt",
          feedback:
            "The prototype works, but it has loading problems and some customers said it 'looks like a toy'. You will soon have to rewrite it.",
        },
      ],
    },
    {
      title: "First customers",
      context:
        "The MVP is ready. Now it is time to win the first real customers. There are 12 interested companies in the pipeline. What offer do you take to them?",
      choices: [
        {
          label: "Offer a free pilot to 5 companies",
          detail: "No revenue, but you gain feedback and references",
          feedback:
            "The pilot companies use the product every day and give detailed feedback. Two said they are ready to move to a paid contract — you now have references.",
        },
        {
          label: "Sell with an early-bird discount",
          detail: "Moderate revenue + committed customers",
          feedback:
            "6 companies bought a discounted annual plan. Cash came in, and because they paid, customers use the product seriously.",
        },
        {
          label: "Try to sell at full price",
          detail: "High margin, but a hard sell at an early stage",
          feedback:
            "Only 2 companies accepted the full price. The rest left saying 'the product is not proven yet' — some turned to the competitor.",
        },
      ],
    },
    {
      title: "Growing the team",
      context:
        "The business is growing and a team of three is no longer enough. Sales meetings eat into technical work and support questions are delayed. What is your hiring decision?",
      choices: [
        {
          label: "Hire an experienced B2B salesperson",
          detail: "Expensive, but professionalises the sales process",
          feedback:
            "In the first month the new salesperson tripled the pipeline and the quality of meetings rose noticeably.",
        },
        {
          label: "Take on interns from a university",
          detail: "Cheap labour, but training takes time",
          feedback:
            "The interns took over support and testing. Training took time, but the team's energy went up.",
        },
        {
          label: "Hire nobody and cover it yourselves",
          detail: "Saves money, but risks burnout",
          feedback:
            "After two weeks of 80-hour work, support response times grew and one customer openly voiced their dissatisfaction.",
        },
      ],
    },
    {
      title: "Marketing channel",
      context:
        "The product has stabilised; now you need to choose a growth channel. The budget is still limited and every channel has its own risk. Where do you invest?",
      choices: [
        {
          label: "Targeted digital advertising",
          detail: "Measurable results, moderate risk",
          feedback:
            "The ad campaign delivered a positive ROI: every dollar spent brings back two. The channel works and can be scaled.",
        },
        {
          label: "A stand at an industry conference",
          detail: "Expensive, but strong brand visibility",
          feedback:
            "The stand drew attention: you gained 40 qualified contacts, two potential corporate customers and a media interview.",
        },
        {
          label: "A viral social media campaign",
          detail: "Cheap, but the outcome is completely uncertain",
          feedback:
            "One of the campaign videos unexpectedly went viral — it brought thousands of views and many sign-ups, but most were outside the target segment.",
        },
      ],
    },
    {
      title: "Customer crisis",
      context:
        "Your biggest customer found a critical bug: the month-end reports show the wrong figures. They are threatening to cancel the contract and are about to post on social media. How do you respond?",
      choices: [
        {
          label: "Mobilise the team and offer compensation",
          detail: "Costly, but restores trust",
          feedback:
            "The bug was fixed in 36 hours and you gave the customer 2 months of free use. They were so impressed that they posted a thank-you on LinkedIn.",
        },
        {
          label: "Handle it through the standard support process",
          detail: "A balanced approach, moderate speed",
          feedback:
            "The bug was fixed within a week. The customer stayed, but the relationship cooled — you can sense they will ask for a discount at renewal.",
        },
        {
          label: "Play the problem down and focus on new sales",
          detail: "Money in the short term, reputation risk in the long term",
          feedback:
            "The customer cancelled the contract and shared their dissatisfaction in two industry groups. New sales felt it — three meetings were cancelled.",
        },
      ],
    },
    {
      title: "The investor table",
      context:
        "The metrics show growth and two investment offers are on the table. A well-known fund offers a seed round on fair terms; an angel investor offers more money on poor terms. The third path is to take neither.",
      choices: [
        {
          label: "Take a seed round from the well-known fund",
          detail: "Big capital + the fund's network, a fair stake",
          feedback:
            "The round closed! The fund's name opens doors: two corporate customers have already asked for meetings. The growth plan is realistic with the new resources.",
        },
        {
          label: "Keep bootstrapping",
          detail: "Full control, but slow growth",
          feedback:
            "You kept your stake and continue to grow on revenue. Growth is slow, but the company is fully under your control.",
        },
        {
          label: "Take the angel investor's quick money",
          detail: "Fast cash, but heavy terms and a right to interfere",
          feedback:
            "The money is in the account, but the terms are heavy: the investor got a veto and your stake will shrink sharply in future rounds. The industry saw the deal negatively.",
        },
      ],
    },
    {
      title: "Growth strategy",
      context:
        "The final decision: which direction will the company take next year? This choice will decide your final result.",
      choices: [
        {
          label: "Expand into the regional market",
          detail: "Big potential, operational complexity",
          feedback:
            "Entering the neighbouring market was a success: 15 new corporate customers in the first month. Your company now counts as a regional player. Simulation complete!",
        },
        {
          label: "Focus on existing customers and deepen the product",
          detail: "Steady revenue, high loyalty",
          feedback:
            "Churn fell to zero and existing customers started buying extra modules. You have built a healthy, sustainable business. Simulation complete!",
        },
        {
          label: "Grab market share with aggressive discounts",
          detail: "Fast growth, margin and brand risk",
          feedback:
            "The customer count jumped, but the margin melted and a 'cheap alternative' image formed. You grew, but your position is fragile. Simulation complete!",
        },
      ],
    },
  ],
};
