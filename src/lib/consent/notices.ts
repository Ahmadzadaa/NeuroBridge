/**
 * Legal notices shown at student registration, from docs/spec/KVKK.docx and
 * docs/spec/GDPR.docx. They live here (not in messages/*.json) because the
 * text and its version must change together: bumping `version` makes every
 * student re-consent.
 *
 * Which notices a student sees depends on the page language:
 *   tr -> KVKK (TR), az -> KVKK (AZ), en -> KVKK (EN) + GDPR.
 */

export type NoticeLocale = "tr" | "en" | "az";

export type Notice = {
  code: "kvkk" | "gdpr";
  version: string;
  title: string;
  paragraphs: string[];
  /** Checkbox 1: "I have read the notice". Required. */
  acknowledge: string;
  /** Checkbox 2: use of ideas and results by XMind Studio. Optional. */
  dataUse: string;
  /** Translation not yet reviewed by legal. */
  draft?: boolean;
};

const KVKK_VERSION = "2026-09";
const GDPR_VERSION = "2026-09";

/** Current version per notice; a stored notice set with an older one is stale. */
export const NOTICE_VERSIONS: Record<Notice["code"], string> = {
  kvkk: KVKK_VERSION,
  gdpr: GDPR_VERSION,
};

const KVKK: Record<NoticeLocale, Notice> = {
  tr: {
    code: "kvkk",
    version: KVKK_VERSION,
    title: "KVKK Aydınlatma Metni",
    paragraphs: [
      "Platforma kayıt ve kullanım sürecinde paylaştığım ad-soyad, iletişim, eğitim, program katılımı, değerlendirme, performans ve platform kullanım bilgilerimin; eğitim ve simülasyon süreçlerinin yürütülmesi, yetkinlik değerlendirmelerinin gerçekleştirilmesi, gelişim analizlerinin yapılması, raporlama ve sertifikalandırma süreçlerinin yürütülmesi amacıyla işlenebileceği konusunda bilgilendirildim.",
      "Platform kapsamında oluşturduğum fikir, proje, cevap, çalışma ve değerlendirme sonuçlarının; eğitim, araştırma, analiz, hizmet geliştirme ve raporlama amaçlarıyla XMind Studio ve XMind Studio Grup Şirketleri tarafından kullanılabileceği konusunda bilgilendirildim.",
      "Kişisel verilerimin KVKK kapsamında korunacağını ve KVKK uyarınca sahip olduğum haklar konusunda bilgilendirildiğimi kabul ederim.",
    ],
    acknowledge: "KVKK Bilgilendirme Metni'ni okudum ve kabul ediyorum.",
    dataUse:
      "Platform kapsamında oluşturduğum fikir, cevap, çalışma, performans ve değerlendirme sonuçlarının XMind Studio ve XMind Studio Grup Şirketleri tarafından belirtilen amaçlarla kullanılmasına izin veriyorum.",
  },
  en: {
    code: "kvkk",
    version: KVKK_VERSION,
    title: "KVKK Privacy Notice",
    paragraphs: [
      "I have been informed that the personal data I provide during the registration and use of the Platform, including my name and surname, contact information, education information, program participation, assessment, performance and Platform usage information, may be processed for the purposes of conducting educational and simulation processes, carrying out competency assessments, conducting development analyses, preparing reports and issuing certificates.",
      "I have been informed that the ideas, projects, responses, work and assessment results I create through the Platform may be used by XMind Studio and XMind Studio Group Companies for educational, research, analytical, service development and reporting purposes.",
      "I acknowledge that my personal data will be protected in accordance with the KVKK (Law No. 6698 on the Protection of Personal Data) and that I have been informed of my rights under the KVKK.",
    ],
    acknowledge: "I have read and understood the KVKK Information Notice.",
    dataUse:
      "I consent to the use of the ideas, responses, work, performance data and assessment results I create through the Platform by XMind Studio and XMind Studio Group Companies for the purposes stated above.",
  },
  az: {
    code: "kvkk",
    version: KVKK_VERSION,
    title: "Şəxsi Məlumatların Qorunması (KVKK) üzrə Məlumatlandırma Mətni",
    paragraphs: [
      "Platformada qeydiyyat və istifadə zamanı paylaşdığım ad-soyad, əlaqə, təhsil, proqram iştirakı, qiymətləndirmə, performans və platformadan istifadə məlumatlarımın təlim və simulyasiya proseslərinin həyata keçirilməsi, səriştə qiymətləndirmələrinin aparılması, inkişaf təhlillərinin edilməsi, hesabat və sertifikatlaşdırma proseslərinin icrası məqsədilə emal oluna biləcəyi barədə məlumatlandırıldım.",
      "Platforma çərçivəsində yaratdığım ideya, layihə, cavab, iş və qiymətləndirmə nəticələrinin təlim, tədqiqat, təhlil, xidmətin inkişafı və hesabat məqsədilə XMind Studio və XMind Studio Qrup Şirkətləri tərəfindən istifadə oluna biləcəyi barədə məlumatlandırıldım.",
      "Şəxsi məlumatlarımın KVKK (6698 saylı Şəxsi Məlumatların Qorunması haqqında Qanun) çərçivəsində qorunacağını və bu qanuna əsasən malik olduğum hüquqlar barədə məlumatlandırıldığımı qəbul edirəm.",
    ],
    acknowledge: "KVKK Məlumatlandırma Mətnini oxudum və qəbul edirəm.",
    dataUse:
      "Platforma çərçivəsində yaratdığım ideya, cavab, iş, performans və qiymətləndirmə nəticələrinin XMind Studio və XMind Studio Qrup Şirkətləri tərəfindən göstərilən məqsədlərlə istifadəsinə icazə verirəm.",
    draft: true,
  },
};

const GDPR: Notice = {
  code: "gdpr",
  version: GDPR_VERSION,
  title: "GDPR Privacy Notice",
  paragraphs: [
    "Through my registration and use of the platform, identification, contact, education, program participation, assessment, performance and platform usage data may be processed for the purposes of delivering educational and simulation activities, conducting competency assessments, analyzing development and performance, generating reports and issuing certificates.",
    "The ideas, projects, responses, work and assessment results I create through the platform may be used by XMind Studio and XMind Studio Group Companies for educational, research, analytical, service development and reporting purposes.",
    "My personal data will be processed in accordance with the applicable provisions of the General Data Protection Regulation (GDPR). I have been informed of my rights regarding my personal data.",
  ],
  acknowledge: "I have read and understood the GDPR Privacy Notice.",
  dataUse: KVKK.en.dataUse,
};

export function toNoticeLocale(locale: string): NoticeLocale {
  return locale === "en" || locale === "az" ? locale : "tr";
}

export function noticesFor(locale: string): Notice[] {
  const l = toNoticeLocale(locale);
  return l === "en" ? [KVKK.en, GDPR] : [KVKK[l]];
}

/**
 * The exact notice set a consent refers to, e.g. "kvkk-en@2026-09+gdpr@2026-09".
 * Stored as the consent version so the record shows what the student saw.
 */
export function noticeSetVersion(locale: string): string {
  const l = toNoticeLocale(locale);
  return noticesFor(l)
    .map((n) => (n.code === "kvkk" ? `kvkk-${l}@${n.version}` : `${n.code}@${n.version}`))
    .join("+");
}

/** True when every notice in a stored set is still at its current version. */
export function isNoticeSetCurrent(stored: string): boolean {
  const parts = stored.split("+").filter(Boolean);
  return (
    parts.length > 0 &&
    parts.every((part) => {
      const [name, version] = part.split("@");
      const code = name.split("-")[0] as Notice["code"];
      return code in NOTICE_VERSIONS && NOTICE_VERSIONS[code] === version;
    })
  );
}
