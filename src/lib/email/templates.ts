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

export function tenantWelcomeEmail(params: {
  organizationName: string;
  adminEmail: string;
  tempPassword: string;
  seatLimit: number;
  loginUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `BizSim — "${params.organizationName}" hesabınız hazırdır`,
    html: layout(
      "Təşkilat hesabınız aktivləşdirildi 🎉",
      paragraph(
        `<strong>${params.organizationName}</strong> üçün BizSim platformasında <strong>${params.seatLimit} nəfərlik</strong> hesab yaradıldı.`
      ) +
        paragraph(
          `Admin giriş məlumatlarınız:<br/>E-poçt: <strong>${params.adminEmail}</strong><br/>Müvəqqəti şifrə: <code style="background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:14px;">${params.tempPassword}</code>`
        ) +
        paragraph(
          "İlk girişdən sonra: 1) şifrənizi dəyişin, 2) proqram yaradın, 3) QR kod və ya dəvət linki ilə iştirakçılarınızı qeydiyyata dəvət edin. Jüri üzvlərini hakaton panelindən özünüz təyin edə bilərsiniz."
        ) +
        button(params.loginUrl, "Panelə daxil ol")
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
