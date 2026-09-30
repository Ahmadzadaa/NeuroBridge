/**
 * Minimal branded HTML email templates (inline styles only).
 *
 * Copy lives in this module rather than in the next-intl message files on
 * purpose: these templates are rendered both from route handlers and from the
 * queue worker, and the worker has no request for next-intl to read a locale
 * from. Every template therefore takes the recipient's language explicitly and
 * falls back to the routing default when it is unknown — the emails used to be
 * Azerbaijani for everyone, which meant a Turkish technopark's admin received
 * their own credentials in a language they may not read.
 */
import { routing, type Locale } from "@/i18n/routing";

export type EmailLocale = Locale;

/** Per-locale copy; the recipient's language picks one column. */
type Copy<T> = Record<EmailLocale, T>;

function resolveLocale(language?: string | null): EmailLocale {
  return routing.locales.includes(language as Locale)
    ? (language as Locale)
    : routing.defaultLocale;
}

const INTL_TAG: Copy<string> = { az: "az-AZ", tr: "tr-TR", en: "en-GB" };

const TAGLINE: Copy<string> = {
  az: "Sahibkarlıq Simulyasiya Platforması",
  tr: "Girişimcilik Simülasyon Platformu",
  en: "Entrepreneurship Simulation Platform",
};

const CREDENTIALS_LINE: Copy<(email: string, password: string) => string> = {
  az: (email, password) =>
    `Giriş məlumatlarınız:<br/>E-poçt: <strong>${email}</strong><br/>Müvəqqəti şifrə: ${code(password)}`,
  tr: (email, password) =>
    `Giriş bilgileriniz:<br/>E-posta: <strong>${email}</strong><br/>Geçici şifre: ${code(password)}`,
  en: (email, password) =>
    `Your sign-in details:<br/>Email: <strong>${email}</strong><br/>Temporary password: ${code(password)}`,
};

const OPEN_PANEL: Copy<string> = {
  az: "Panelə daxil ol",
  tr: "Panele giriş yap",
  en: "Open the dashboard",
};

function layout(title: string, bodyHtml: string, locale: EmailLocale): string {
  return `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:#5b5bd6;color:#fff;font-weight:700;border-radius:12px;padding:10px 18px;font-size:16px;">BizSim</span>
      </div>
      <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(15,23,42,.08);">
        <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${title}</h1>
        ${bodyHtml}
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">
        © ${new Date().getFullYear()} BizSim · ${TAGLINE[locale]}
      </p>
    </div>
  </body>
</html>`;
}

const paragraph = (text: string) =>
  `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">${text}</p>`;

const code = (text: string) =>
  `<code style="background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:14px;">${text}</code>`;

const button = (href: string, label: string) =>
  `<p style="margin:22px 0 8px;text-align:center;">
     <a href="${href}" style="display:inline-block;background:#5b5bd6;color:#fff;text-decoration:none;font-weight:600;font-size:14px;border-radius:10px;padding:12px 28px;">${label}</a>
   </p>`;

/** Formats integer kuruş for email copy, e.g. 250000 -> "2.500,00 ₺". */
function formatAmount(kurus: number, currency: string, locale: EmailLocale): string {
  return new Intl.NumberFormat(INTL_TAG[locale], {
    style: "currency",
    currency,
  }).format(kurus / 100);
}

/** Escapes free text before it is placed into email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(date: Date, locale: EmailLocale): string {
  return date.toLocaleString(INTL_TAG[locale]);
}

function formatDate(date: Date, locale: EmailLocale): string {
  return date.toLocaleDateString(INTL_TAG[locale]);
}

/* ------------------------------------------------------------------ */
/* Account credentials                                                 */
/* ------------------------------------------------------------------ */

export function juryCredentialsEmail(params: {
  email: string;
  tempPassword: string;
  loginUrl: string;
  programName?: string;
  language?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.language);
  const copy: Copy<{ subject: string; title: string; intro: string; hint: string }> = {
    az: {
      subject: "BizSim — Jüri hesabınız hazırdır",
      title: "Jüri panelinə dəvət olunmusunuz",
      intro: params.programName
        ? `<strong>${params.programName}</strong> üçün jüri üzvü təyin olundunuz.`
        : "Hakaton jürisinə üzv təyin olundunuz.",
      hint: "İlk girişdən sonra profil bölməsindən şifrənizi dəyişməyi tövsiyə edirik.",
    },
    tr: {
      subject: "BizSim — Jüri hesabınız hazır",
      title: "Jüri paneline davet edildiniz",
      intro: params.programName
        ? `<strong>${params.programName}</strong> için jüri üyesi olarak atandınız.`
        : "Hackathon jürisine üye olarak atandınız.",
      hint: "İlk girişten sonra profil bölümünden şifrenizi değiştirmenizi öneririz.",
    },
    en: {
      subject: "BizSim — your jury account is ready",
      title: "You have been invited to the jury panel",
      intro: params.programName
        ? `You have been appointed to the jury for <strong>${params.programName}</strong>.`
        : "You have been appointed to the hackathon jury.",
      hint: "We recommend changing your password from your profile after the first sign-in.",
    },
  };
  const c = copy[locale];
  return {
    subject: c.subject,
    html: layout(
      c.title,
      paragraph(c.intro) +
        paragraph(CREDENTIALS_LINE[locale](params.email, params.tempPassword)) +
        paragraph(c.hint) +
        button(params.loginUrl, OPEN_PANEL[locale]),
      locale
    ),
  };
}

export function teacherCredentialsEmail(params: {
  email: string;
  tempPassword: string;
  loginUrl: string;
  organizationName?: string;
  language?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.language);
  const copy: Copy<{ subject: string; title: string; intro: string; steps: string }> = {
    az: {
      subject: "BizSim — Müəllim hesabınız hazırdır",
      title: "Müəllim panelinə xoş gəlmisiniz 👩‍🏫",
      intro: params.organizationName
        ? `<strong>${params.organizationName}</strong> sizin üçün BizSim-də müəllim hesabı yaratdı.`
        : "Sizin üçün BizSim-də müəllim hesabı yaradıldı.",
      steps:
        "Panelinizdə: tələbələrinizi QR kod və ya dəvət linki ilə qeydiyyata dəvət edin, öz biznes ssenarilərinizi yaradın və tələbələrin simulyasiya nəticələrini qiymətləndirin.",
    },
    tr: {
      subject: "BizSim — Öğretmen hesabınız hazır",
      title: "Öğretmen paneline hoş geldiniz 👩‍🏫",
      intro: params.organizationName
        ? `<strong>${params.organizationName}</strong> sizin için BizSim'de bir öğretmen hesabı oluşturdu.`
        : "Sizin için BizSim'de bir öğretmen hesabı oluşturuldu.",
      steps:
        "Panelinizde: öğrencilerinizi QR kod veya davet bağlantısıyla kayda davet edin, kendi iş senaryolarınızı oluşturun ve öğrencilerin simülasyon sonuçlarını notlandırın.",
    },
    en: {
      subject: "BizSim — your teacher account is ready",
      title: "Welcome to the teacher panel 👩‍🏫",
      intro: params.organizationName
        ? `<strong>${params.organizationName}</strong> has created a teacher account for you on BizSim.`
        : "A teacher account has been created for you on BizSim.",
      steps:
        "From your panel you can invite students with a QR code or an invitation link, build your own business scenarios, and grade your students' simulation runs.",
    },
  };
  const c = copy[locale];
  return {
    subject: c.subject,
    html: layout(
      c.title,
      paragraph(c.intro) +
        paragraph(CREDENTIALS_LINE[locale](params.email, params.tempPassword)) +
        paragraph(c.steps) +
        button(params.loginUrl, OPEN_PANEL[locale]),
      locale
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Participant lifecycle                                               */
/* ------------------------------------------------------------------ */

export function welcomeEmail(params: {
  firstName: string;
  programName: string;
  loginUrl: string;
  language?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.language);
  const copy: Copy<{
    subject: string;
    title: string;
    intro: string;
    body: string;
    cta: string;
  }> = {
    az: {
      subject: `BizSim — "${params.programName}" proqramına xoş gəlmisiniz`,
      title: `Xoş gəlmisiniz, ${params.firstName}!`,
      intro: `<strong>${params.programName}</strong> proqramına müraciətiniz qəbul olundu.`,
      body: "Platformada sizi təlim videoları, imtahanlar, simulyasiyalar və liderlik cədvəli gözləyir.",
      cta: "Platformaya keç",
    },
    tr: {
      subject: `BizSim — "${params.programName}" programına hoş geldiniz`,
      title: `Hoş geldiniz, ${params.firstName}!`,
      intro: `<strong>${params.programName}</strong> programına başvurunuz alındı.`,
      body: "Platformda sizi eğitim videoları, sınavlar, simülasyonlar ve liderlik tablosu bekliyor.",
      cta: "Platforma git",
    },
    en: {
      subject: `BizSim — welcome to "${params.programName}"`,
      title: `Welcome, ${params.firstName}!`,
      intro: `Your application to <strong>${params.programName}</strong> has been accepted.`,
      body: "Training videos, exams, simulations and the leaderboard are waiting for you on the platform.",
      cta: "Go to the platform",
    },
  };
  const c = copy[locale];
  return {
    subject: c.subject,
    html: layout(
      c.title,
      paragraph(c.intro) + paragraph(c.body) + button(params.loginUrl, c.cta),
      locale
    ),
  };
}

export function resultsAnnouncedEmail(params: {
  programName: string;
  teamName: string;
  rank: number;
  total: number | null;
  resultsUrl: string;
  language?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.language);
  const medal =
    params.rank === 1 ? "🥇" : params.rank === 2 ? "🥈" : params.rank === 3 ? "🥉" : "🏁";
  const score = params.total !== null ? params.total.toFixed(1) : null;

  const copy: Copy<{
    subject: string;
    title: string;
    intro: string;
    placing: string;
    body: string;
    cta: string;
  }> = {
    az: {
      subject: `BizSim — "${params.programName}" nəticələri açıqlandı`,
      title: `${medal} Nəticələr açıqlandı!`,
      intro: `<strong>${params.programName}</strong> üzrə jüri qiymətləndirməsi yekunlaşdı.`,
      placing:
        `Komandanız <strong>${params.teamName}</strong>: <strong>${params.rank}-ci yer</strong>` +
        (score ? ` · yekun bal <strong>${score}</strong>` : ""),
      body: "Meyar-meyar bölgü və jüri rəyləri platformada sizi gözləyir.",
      cta: "Nəticələrə bax",
    },
    tr: {
      subject: `BizSim — "${params.programName}" sonuçları açıklandı`,
      title: `${medal} Sonuçlar açıklandı!`,
      intro: `<strong>${params.programName}</strong> jüri değerlendirmesi tamamlandı.`,
      placing:
        `Takımınız <strong>${params.teamName}</strong>: <strong>${params.rank}. sıra</strong>` +
        (score ? ` · toplam puan <strong>${score}</strong>` : ""),
      body: "Kriter kırılımı ve jüri yorumları platformda sizi bekliyor.",
      cta: "Sonuçlara bak",
    },
    en: {
      subject: `BizSim — results are out for "${params.programName}"`,
      title: `${medal} The results are in!`,
      intro: `Jury scoring for <strong>${params.programName}</strong> has finished.`,
      placing:
        `Your team <strong>${params.teamName}</strong>: <strong>place ${params.rank}</strong>` +
        (score ? ` · final score <strong>${score}</strong>` : ""),
      body: "The per-criterion breakdown and the jury's comments are waiting on the platform.",
      cta: "See the results",
    },
  };
  const c = copy[locale];
  return {
    subject: c.subject,
    html: layout(
      c.title,
      paragraph(c.intro) +
        paragraph(c.placing) +
        paragraph(c.body) +
        button(params.resultsUrl, c.cta),
      locale
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Billing                                                             */
/* ------------------------------------------------------------------ */

export function subscriptionRenewalEmail(params: {
  organizationName: string;
  seats: number;
  amount: number;
  currency: string;
  periodEnd: Date;
  paymentUrl: string;
  language?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.language);
  const amount = formatAmount(params.amount, params.currency, locale);
  const periodEnd = formatDate(params.periodEnd, locale);

  const copy: Copy<{
    subject: string;
    title: string;
    intro: string;
    details: string;
    body: string;
    cta: string;
  }> = {
    az: {
      subject: "BizSim — abunəliyinizin ödənişi gözlənilir",
      title: "Abunəlik yenilənməsi",
      intro: `<strong>${params.organizationName}</strong> üçün yeni dövrün hesabı hazırdır.`,
      details:
        `Yer sayı: <strong>${params.seats}</strong><br/>` +
        `Məbləğ: <strong>${amount}</strong><br/>` +
        `Dövrün sonu: <strong>${periodEnd}</strong>`,
      body: "Ödənişi aşağıdakı düymə ilə edə bilərsiniz. Bank köçürməsi ilə ödəmək istəsəniz bizimlə əlaqə saxlayın.",
      cta: "Ödənişi et",
    },
    tr: {
      subject: "BizSim — aboneliğinizin ödemesi bekleniyor",
      title: "Abonelik yenileme",
      intro: `<strong>${params.organizationName}</strong> için yeni dönemin faturası hazır.`,
      details:
        `Koltuk sayısı: <strong>${params.seats}</strong><br/>` +
        `Tutar: <strong>${amount}</strong><br/>` +
        `Dönem sonu: <strong>${periodEnd}</strong>`,
      body: "Ödemeyi aşağıdaki düğmeyle yapabilirsiniz. Havale ile ödemek isterseniz bizimle iletişime geçin.",
      cta: "Ödemeyi yap",
    },
    en: {
      subject: "BizSim — your subscription payment is due",
      title: "Subscription renewal",
      intro: `The invoice for the next period of <strong>${params.organizationName}</strong> is ready.`,
      details:
        `Seats: <strong>${params.seats}</strong><br/>` +
        `Amount: <strong>${amount}</strong><br/>` +
        `Period ends: <strong>${periodEnd}</strong>`,
      body: "You can pay with the button below. Get in touch if you would rather pay by bank transfer.",
      cta: "Pay now",
    },
  };
  const c = copy[locale];
  return {
    subject: c.subject,
    html: layout(
      c.title,
      paragraph(c.intro) +
        paragraph(c.details) +
        paragraph(c.body) +
        button(params.paymentUrl, c.cta),
      locale
    ),
  };
}

export function paymentFailedEmail(params: {
  organizationName: string;
  amount: number;
  currency: string;
  attemptNo: number;
  nextRetryAt: Date | null;
  expiresAt: Date;
  paymentUrl: string;
  language?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.language);
  const amount = formatAmount(params.amount, params.currency, locale);
  const expiresAt = formatDate(params.expiresAt, locale);
  const nextRetry = params.nextRetryAt ? formatDate(params.nextRetryAt, locale) : null;

  const copy: Copy<{
    subject: string;
    title: string;
    intro: string;
    retry: string;
    deadline: string;
    cta: string;
  }> = {
    az: {
      subject: "BizSim — ödəniş alınmadı",
      title: "Ödəniş alınmadı",
      intro: `<strong>${params.organizationName}</strong> üçün ${amount} məbləğində ödəniş uğursuz oldu (cəhd ${params.attemptNo}).`,
      retry: nextRetry
        ? `Növbəti cəhd: <strong>${nextRetry}</strong>`
        : "Bu, son avtomatik cəhd idi.",
      deadline: `<strong>${expiresAt}</strong> tarixinədək ödəniş edilməsə, hesabınız yalnız oxuma rejiminə keçəcək. <strong>Məlumatlarınız silinmir.</strong>`,
      cta: "İndi ödə",
    },
    tr: {
      subject: "BizSim — ödeme alınamadı",
      title: "Ödeme alınamadı",
      intro: `<strong>${params.organizationName}</strong> için ${amount} tutarındaki ödeme başarısız oldu (deneme ${params.attemptNo}).`,
      retry: nextRetry
        ? `Sonraki deneme: <strong>${nextRetry}</strong>`
        : "Bu, son otomatik denemeydi.",
      deadline: `<strong>${expiresAt}</strong> tarihine kadar ödeme yapılmazsa hesabınız salt okunur moda geçecek. <strong>Verileriniz silinmez.</strong>`,
      cta: "Şimdi öde",
    },
    en: {
      subject: "BizSim — payment failed",
      title: "Payment failed",
      intro: `The ${amount} payment for <strong>${params.organizationName}</strong> did not go through (attempt ${params.attemptNo}).`,
      retry: nextRetry
        ? `Next attempt: <strong>${nextRetry}</strong>`
        : "That was the last automatic attempt.",
      deadline: `If payment is not made by <strong>${expiresAt}</strong>, your account switches to read-only. <strong>Nothing is deleted.</strong>`,
      cta: "Pay now",
    },
  };
  const c = copy[locale];
  return {
    subject: c.subject,
    html: layout(
      c.title,
      paragraph(c.intro) +
        paragraph(c.retry) +
        paragraph(c.deadline) +
        button(params.paymentUrl, c.cta),
      locale
    ),
  };
}

export function subscriptionExpiredEmail(params: {
  organizationName: string;
  paymentUrl: string;
  language?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.language);
  const copy: Copy<{
    subject: string;
    title: string;
    intro: string;
    body: string;
    cta: string;
  }> = {
    az: {
      subject: "BizSim — abunəliyiniz dayandırıldı",
      title: "Abunəlik dayandırıldı",
      intro: `<strong>${params.organizationName}</strong> üçün ödəniş alınmadığı üçün hesabınız <strong>yalnız oxuma</strong> rejiminə keçdi.`,
      body: "Bütün məlumatlarınız — proqramlar, iştirakçılar, nəticələr — yerindədir və silinməyib. Ödənişi tamamladıqdan sonra hər şey dərhal bərpa olunur.",
      cta: "Abunəliyi bərpa et",
    },
    tr: {
      subject: "BizSim — aboneliğiniz durduruldu",
      title: "Abonelik durduruldu",
      intro: `<strong>${params.organizationName}</strong> için ödeme alınamadığından hesabınız <strong>salt okunur</strong> moda geçti.`,
      body: "Tüm verileriniz — programlar, katılımcılar, sonuçlar — yerinde duruyor ve silinmedi. Ödemeyi tamamladığınızda her şey anında geri gelir.",
      cta: "Aboneliği yeniden başlat",
    },
    en: {
      subject: "BizSim — your subscription is on hold",
      title: "Subscription on hold",
      intro: `Because payment for <strong>${params.organizationName}</strong> was not received, your account has switched to <strong>read-only</strong>.`,
      body: "All your data — programs, participants, results — is still there and has not been deleted. Everything comes back the moment payment goes through.",
      cta: "Restore the subscription",
    },
  };
  const c = copy[locale];
  return {
    subject: c.subject,
    html: layout(
      c.title,
      paragraph(c.intro) + paragraph(c.body) + button(params.paymentUrl, c.cta),
      locale
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Sales                                                               */
/* ------------------------------------------------------------------ */

/**
 * Internal alert that someone asked for a demo.
 *
 * The recipient is our own sales inbox, not the visitor, so the locale used
 * is the one the visitor filled the form in — that is the language a reply
 * will have to be written in.
 *
 * Every value here is attacker-supplied free text from a public form, so it is
 * escaped before it reaches the HTML. Without that, a lead could inject markup
 * into the inbox of the person reading it.
 */
export function leadNotificationEmail(params: {
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  seatCount?: string | null;
  message?: string | null;
  locale?: string | null;
  submittedAt: Date;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.locale);

  const copy: Copy<{
    subject: (company: string) => string;
    title: string;
    intro: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    seats: string;
    message: string;
    submitted: string;
    language: string;
    none: string;
  }> = {
    az: {
      subject: (company) => `Yeni demo tələbi — ${company}`,
      title: "Yeni demo tələbi",
      intro: "Marketinq saytından yeni bir demo tələbi gəldi.",
      name: "Ad",
      company: "Şirkət",
      email: "E-poçt",
      phone: "Telefon",
      seats: "Təxmini tələbə sayı",
      message: "Mesaj",
      submitted: "Göndərilmə vaxtı",
      language: "Forma dili",
      none: "—",
    },
    tr: {
      subject: (company) => `Yeni demo talebi — ${company}`,
      title: "Yeni demo talebi",
      intro: "Pazarlama sitesinden yeni bir demo talebi geldi.",
      name: "Ad",
      company: "Şirket",
      email: "E-posta",
      phone: "Telefon",
      seats: "Tahmini öğrenci sayısı",
      message: "Mesaj",
      submitted: "Gönderim zamanı",
      language: "Form dili",
      none: "—",
    },
    en: {
      subject: (company) => `New demo request — ${company}`,
      title: "New demo request",
      intro: "A new demo request came in from the marketing site.",
      name: "Name",
      company: "Company",
      email: "Email",
      phone: "Phone",
      seats: "Estimated students",
      message: "Message",
      submitted: "Submitted",
      language: "Form language",
      none: "—",
    },
  };

  const c = copy[locale];
  const rows: [string, string | null | undefined][] = [
    [c.name, params.name],
    [c.company, params.company],
    [c.email, params.email],
    [c.phone, params.phone],
    [c.seats, params.seatCount],
    [c.message, params.message],
    [c.submitted, formatDateTime(params.submittedAt, locale)],
    [c.language, locale],
  ];

  const table = rows
    .map(
      ([label, value]) =>
        `<tr>
           <td style="padding:6px 12px 6px 0;font-size:13px;color:#64748b;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
           <td style="padding:6px 0;font-size:14px;color:#0f172a;">${escapeHtml(value || c.none)}</td>
         </tr>`,
    )
    .join("");

  return {
    subject: c.subject(params.company),
    html: layout(
      c.title,
      paragraph(c.intro) +
        `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${table}</table>` +
        button(`mailto:${encodeURIComponent(params.email)}`, c.email),
      locale,
    ),
  };
}

const ACTIVATION_COPY = {
  az: {
    subject: (org: string) => `BizSim — "${org}" hesabınızı aktivləşdirin`,
    title: "Hesabınız hazırdır",
    intro: (org: string) => `Ödənişiniz qəbul edildi. <strong>${org}</strong> üçün BizSim hesabı yaradıldı.`,
    action: "Başlamaq üçün aşağıdakı düymə ilə şifrənizi təyin edin. Link 48 saat etibarlıdır və yalnız bir dəfə istifadə olunur.",
    button: "Şifrəni təyin et",
    ignore: "Bu sorğunu siz etməmisinizsə, bu məktubu nəzərə almayın.",
  },
  en: {
    subject: (org: string) => `BizSim — activate your "${org}" account`,
    title: "Your account is ready",
    intro: (org: string) => `Your payment was received and a BizSim account was created for <strong>${org}</strong>.`,
    action: "Set your password with the button below to get started. The link is valid for 48 hours and can be used once.",
    button: "Set password",
    ignore: "If you did not request this, you can ignore this email.",
  },
  tr: {
    subject: (org: string) => `BizSim — "${org}" hesabınızı etkinleştirin`,
    title: "Hesabınız hazır",
    intro: (org: string) => `Ödemeniz alındı ve <strong>${org}</strong> için BizSim hesabı oluşturuldu.`,
    action: "Başlamak için aşağıdaki düğmeyle şifrenizi belirleyin. Bağlantı 48 saat geçerlidir ve yalnızca bir kez kullanılabilir.",
    button: "Şifreyi belirle",
    ignore: "Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.",
  },
} as const;

/** One-time set-password link for a newly provisioned tenant admin. */
export function activationEmail(params: {
  organizationName: string;
  activationUrl: string;
  locale?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.locale);
  const copy = ACTIVATION_COPY[locale];
  const org = escapeHtml(params.organizationName);
  return {
    subject: copy.subject(params.organizationName),
    html: layout(
      copy.title,
      paragraph(copy.intro(org)) +
        paragraph(copy.action) +
        button(params.activationUrl, copy.button) +
        paragraph(`<span style="color:#94a3b8;font-size:12px;">${copy.ignore}</span>`),
      locale
    ),
  };
}
