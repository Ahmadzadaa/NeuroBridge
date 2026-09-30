/** Minimal branded HTML email templates (inline styles only). */

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
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
        © ${new Date().getFullYear()} BizSim · Sahibkarlıq Simulyasiya Platforması
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

export function juryCredentialsEmail(params: {
  email: string;
  tempPassword: string;
  loginUrl: string;
  programName?: string;
}): { subject: string; html: string } {
  return {
    subject: "BizSim — Jüri hesabınız hazırdır",
    html: layout(
      "Jüri panelinə dəvət olunmusunuz",
      paragraph(
        params.programName
          ? `<strong>${params.programName}</strong> üçün jüri üzvü təyin olundunuz.`
          : "Hakaton jürisinə üzv təyin olundunuz."
      ) +
        paragraph(
          `Giriş məlumatlarınız:<br/>E-poçt: <strong>${params.email}</strong><br/>Müvəqqəti şifrə: <code style="background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:14px;">${params.tempPassword}</code>`
        ) +
        paragraph(
          "İlk girişdən sonra profil bölməsindən şifrənizi dəyişməyi tövsiyə edirik."
        ) +
        button(params.loginUrl, "Daxil ol")
    ),
  };
}

export function teacherCredentialsEmail(params: {
  email: string;
  tempPassword: string;
  loginUrl: string;
  organizationName?: string;
}): { subject: string; html: string } {
  return {
    subject: "BizSim — Müəllim hesabınız hazırdır",
    html: layout(
      "Müəllim panelinə xoş gəlmisiniz 👩‍🏫",
      paragraph(
        params.organizationName
          ? `<strong>${params.organizationName}</strong> sizin üçün BizSim-də müəllim hesabı yaratdı.`
          : "Sizin üçün BizSim-də müəllim hesabı yaradıldı."
      ) +
        paragraph(
          `Giriş məlumatlarınız:<br/>E-poçt: <strong>${params.email}</strong><br/>Müvəqqəti şifrə: <code style="background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:14px;">${params.tempPassword}</code>`
        ) +
        paragraph(
          "Panelinizdə: tələbələrinizi QR kod / dəvət linki ilə qeydiyyata dəvət edin, öz biznes ssenarilərinizi yaradın və tələbələrin simulyasiya nəticələrini qiymətləndirin."
        ) +
        button(params.loginUrl, "Panelə daxil ol")
    ),
  };
}

export function welcomeEmail(params: {
  firstName: string;
  programName: string;
  loginUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `BizSim — "${params.programName}" proqramına xoş gəlmisiniz`,
    html: layout(
      `Xoş gəlmisiniz, ${params.firstName}!`,
      paragraph(
        `<strong>${params.programName}</strong> proqramına müraciətiniz qəbul olundu.`
      ) +
        paragraph(
          "Platformada sizi təlim videoları, imtahanlar, simulyasiyalar və liderlik cədvəli gözləyir."
        ) +
        button(params.loginUrl, "Platformaya keç")
    ),
  };
}

export function resultsAnnouncedEmail(params: {
  programName: string;
  teamName: string;
  rank: number;
  total: number | null;
  resultsUrl: string;
}): { subject: string; html: string } {
  const medal = params.rank === 1 ? "🥇" : params.rank === 2 ? "🥈" : params.rank === 3 ? "🥉" : "🏁";
  return {
    subject: `BizSim — "${params.programName}" nəticələri açıqlandı`,
    html: layout(
      `${medal} Nəticələr açıqlandı!`,
      paragraph(
        `<strong>${params.programName}</strong> üzrə jüri qiymətləndirməsi yekunlaşdı.`
      ) +
        paragraph(
          `Komandanız <strong>${params.teamName}</strong>: <strong>${params.rank}-ci yer</strong>` +
            (params.total !== null
              ? ` · yekun bal <strong>${params.total.toFixed(1)}</strong>`
              : "")
        ) +
        paragraph("Meyar-meyar bölgü və jüri rəyləri platformada sizi gözləyir.") +
        button(params.resultsUrl, "Nəticələrə bax")
    ),
  };
}

/** Formats integer kuruş for email copy, e.g. 250000 -> "2.500,00 ₺". */
function formatAmount(kurus: number, currency = "TRY"): string {
  return new Intl.NumberFormat("az-AZ", { style: "currency", currency }).format(
    kurus / 100
  );
}

export function subscriptionRenewalEmail(params: {
  organizationName: string;
  seats: number;
  amount: number;
  currency: string;
  periodEnd: Date;
  paymentUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "BizSim — abunəliyinizin ödənişi gözlənilir",
    html: layout(
      "Abunəlik yenilənməsi",
      paragraph(
        `<strong>${params.organizationName}</strong> üçün yeni dövrün hesabı hazırdır.`
      ) +
        paragraph(
          `Yer sayı: <strong>${params.seats}</strong><br/>` +
            `Məbləğ: <strong>${formatAmount(params.amount, params.currency)}</strong><br/>` +
            `Dövrün sonu: <strong>${params.periodEnd.toLocaleDateString("az-AZ")}</strong>`
        ) +
        paragraph(
          "Ödənişi aşağıdakı düymə ilə edə bilərsiniz. Bank köçürməsi ilə ödəmək istəsəniz bizimlə əlaqə saxlayın."
        ) +
        button(params.paymentUrl, "Ödənişi et")
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
}): { subject: string; html: string } {
  const retryLine = params.nextRetryAt
    ? `Növbəti cəhd: <strong>${params.nextRetryAt.toLocaleDateString("az-AZ")}</strong>`
    : "Bu, son avtomatik cəhd idi.";

  return {
    subject: "BizSim — ödəniş alınmadı",
    html: layout(
      "Ödəniş alınmadı",
      paragraph(
        `<strong>${params.organizationName}</strong> üçün ${formatAmount(
          params.amount,
          params.currency
        )} məbləğində ödəniş uğursuz oldu (cəhd ${params.attemptNo}).`
      ) +
        paragraph(retryLine) +
        paragraph(
          `<strong>${params.expiresAt.toLocaleDateString("az-AZ")}</strong> tarixinədək ödəniş edilməsə, ` +
            "hesabınız yalnız oxuma rejiminə keçəcək. <strong>Məlumatlarınız silinmir.</strong>"
        ) +
        button(params.paymentUrl, "İndi ödə")
    ),
  };
}

export function subscriptionExpiredEmail(params: {
  organizationName: string;
  paymentUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "BizSim — abunəliyiniz dayandırıldı",
    html: layout(
      "Abunəlik dayandırıldı",
      paragraph(
        `<strong>${params.organizationName}</strong> üçün ödəniş alınmadığı üçün hesabınız ` +
          "<strong>yalnız oxuma</strong> rejiminə keçdi."
      ) +
        paragraph(
          "Bütün məlumatlarınız — proqramlar, iştirakçılar, nəticələr — yerindədir və silinməyib. " +
            "Ödənişi tamamladıqdan sonra hər şey dərhal bərpa olunur."
        ) +
        button(params.paymentUrl, "Abunəliyi bərpa et")
    ),
  };
}

/** For values typed by the public (e.g. an institution name on the pricing form). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  locale: string;
}): { subject: string; html: string } {
  const copy = ACTIVATION_COPY[params.locale as keyof typeof ACTIVATION_COPY] ?? ACTIVATION_COPY.tr;
  const org = escapeHtml(params.organizationName);
  return {
    subject: copy.subject(params.organizationName),
    html: layout(
      copy.title,
      paragraph(copy.intro(org)) +
        paragraph(copy.action) +
        button(params.activationUrl, copy.button) +
        paragraph(`<span style="color:#94a3b8;font-size:12px;">${copy.ignore}</span>`)
    ),
  };
}
