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

const RESET_COPY = {
  az: {
    subject: "BizSim — şifrənin bərpası",
    title: "Şifrənizi yeniləyin",
    intro: "Hesabınız üçün şifrə bərpası istənildi. Yeni şifrə təyin etmək üçün aşağıdakı düyməyə basın.",
    validity: "Link 1 saat etibarlıdır və yalnız bir dəfə istifadə olunur.",
    button: "Yeni şifrə təyin et",
    ignore: "Bu sorğunu siz etməmisinizsə, bu məktubu nəzərə almayın — şifrəniz dəyişməyəcək.",
  },
  en: {
    subject: "BizSim — reset your password",
    title: "Reset your password",
    intro: "Someone asked to reset the password for your account. Use the button below to choose a new one.",
    validity: "The link is valid for 1 hour and can be used once.",
    button: "Choose a new password",
    ignore: "If you did not ask for this, ignore this email — your password will not change.",
  },
  tr: {
    subject: "BizSim — şifre sıfırlama",
    title: "Şifrenizi yenileyin",
    intro: "Hesabınız için şifre sıfırlama istendi. Yeni şifre belirlemek için aşağıdaki düğmeye tıklayın.",
    validity: "Bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.",
    button: "Yeni şifre belirle",
    ignore: "Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın — şifreniz değişmeyecek.",
  },
} as const;

/** One-time "forgot password" link. */
export function passwordResetEmail(params: { resetUrl: string; locale?: string | null }): { subject: string; html: string } {
  const locale = resolveLocale(params.locale);
  const copy = RESET_COPY[locale];
  return {
    subject: copy.subject,
    html: layout(
      copy.title,
      paragraph(copy.intro) +
        button(params.resetUrl, copy.button) +
        paragraph(copy.validity) +
        paragraph(`<span style="color:#94a3b8;font-size:12px;">${copy.ignore}</span>`),
      locale
    ),
  };
}

const INVITE_COPY = {
  az: {
    roles: { TEACHER: "müəllim", JURY: "jüri üzvü" },
    subject: (org: string) => `BizSim — "${org}" sizi dəvət edir`,
    title: "Hesabınız yaradıldı",
    intro: (org: string, role: string) => `<strong>${org}</strong> sizi BizSim platformasına <strong>${role}</strong> kimi əlavə etdi.`,
    action: "Hesabınızı açmaq üçün aşağıdakı düymə ilə şifrənizi təyin edin. Link 48 saat etibarlıdır və yalnız bir dəfə istifadə olunur.",
    button: "Hesabımı aç",
    ignore: "Bu dəvəti gözləmirdinizsə, bu məktubu nəzərə almayın.",
  },
  en: {
    roles: { TEACHER: "a teacher", JURY: "a jury member" },
    subject: (org: string) => `BizSim — ${org} invited you`,
    title: "Your account is ready",
    intro: (org: string, role: string) => `<strong>${org}</strong> added you to BizSim as <strong>${role}</strong>.`,
    action: "Set your password with the button below to open your account. The link is valid for 48 hours and can be used once.",
    button: "Open my account",
    ignore: "If you were not expecting this invitation, you can ignore this email.",
  },
  tr: {
    roles: { TEACHER: "öğretmen", JURY: "jüri üyesi" },
    subject: (org: string) => `BizSim — "${org}" sizi davet ediyor`,
    title: "Hesabınız oluşturuldu",
    intro: (org: string, role: string) => `<strong>${org}</strong> sizi BizSim platformuna <strong>${role}</strong> olarak ekledi.`,
    action: "Hesabınızı açmak için aşağıdaki düğmeyle şifrenizi belirleyin. Bağlantı 48 saat geçerlidir ve yalnızca bir kez kullanılabilir.",
    button: "Hesabımı aç",
    ignore: "Bu daveti beklemiyorsanız bu e-postayı dikkate almayın.",
  },
} as const;

/** Set-password link for a teacher or juror an organisation added. No password travels by email. */
export function invitationEmail(params: {
  organizationName: string;
  role: "TEACHER" | "JURY";
  activationUrl: string;
  locale?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.locale);
  const copy = INVITE_COPY[locale];
  const org = escapeHtml(params.organizationName);
  return {
    subject: copy.subject(params.organizationName),
    html: layout(
      copy.title,
      paragraph(copy.intro(org, copy.roles[params.role])) +
        paragraph(copy.action) +
        button(params.activationUrl, copy.button) +
        paragraph(`<span style="color:#94a3b8;font-size:12px;">${copy.ignore}</span>`),
      locale
    ),
  };
}

const SUPPORT_TICKET_COPY = {
  az: {
    subject: (org: string, topic: string) => `Yeni dəstək müraciəti — ${org}: ${topic}`,
    title: "Yeni dəstək müraciəti",
    intro: "Təşkilatdan yeni dəstək müraciəti gəldi. Cavab panel üzərindən verilir.",
    organisation: "Təşkilat",
    author: "Yazan",
    topic: "Mövzu",
    message: "Mesaj",
    submitted: "Göndərilmə vaxtı",
    button: "Müraciəti aç",
  },
  en: {
    subject: (org: string, topic: string) => `New support request — ${org}: ${topic}`,
    title: "New support request",
    intro: "An organisation sent a new support request. Replies are given in the panel.",
    organisation: "Organisation",
    author: "From",
    topic: "Subject",
    message: "Message",
    submitted: "Sent",
    button: "Open the request",
  },
  tr: {
    subject: (org: string, topic: string) => `Yeni destek talebi — ${org}: ${topic}`,
    title: "Yeni destek talebi",
    intro: "Bir kurumdan yeni destek talebi geldi. Yanıt panel üzerinden verilir.",
    organisation: "Kurum",
    author: "Gönderen",
    topic: "Konu",
    message: "Mesaj",
    submitted: "Gönderim zamanı",
    button: "Talebi aç",
  },
} as const;

/**
 * Tells the platform team a support request came in. Subject and message are
 * free text from an organisation's admin, so everything is escaped.
 */
export function supportTicketEmail(params: {
  organisation: string;
  authorName: string;
  authorEmail: string;
  topic: string;
  message: string;
  ticketUrl: string;
  submittedAt: Date;
  locale?: string | null;
}): { subject: string; html: string } {
  const locale = resolveLocale(params.locale);
  const c = SUPPORT_TICKET_COPY[locale];
  // A preview is enough in the inbox; the full thread is one click away.
  const message = params.message.length > 1200 ? `${params.message.slice(0, 1200)}…` : params.message;
  const rows: [string, string][] = [
    [c.organisation, params.organisation],
    [c.author, `${params.authorName} <${params.authorEmail}>`],
    [c.topic, params.topic],
    [c.submitted, formatDateTime(params.submittedAt, locale)],
  ];
  const table = rows
    .map(
      ([label, value]) =>
        `<tr>
           <td style="padding:6px 12px 6px 0;font-size:13px;color:#64748b;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
           <td style="padding:6px 0;font-size:14px;color:#0f172a;">${escapeHtml(value)}</td>
         </tr>`,
    )
    .join("");

  return {
    // Subjects are a single header line: no newlines from the topic.
    subject: c.subject(params.organisation, params.topic).replace(/[\r\n]+/g, " ").slice(0, 200),
    html: layout(
      c.title,
      paragraph(c.intro) +
        `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${table}</table>` +
        `<p style="margin:16px 0 6px;font-size:13px;color:#64748b;">${escapeHtml(c.message)}</p>` +
        `<div style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:#0f172a;background:#f4f5f7;border-radius:12px;padding:14px 16px;">${escapeHtml(message)}</div>` +
        button(params.ticketUrl, c.button),
      locale,
    ),
  };
}
