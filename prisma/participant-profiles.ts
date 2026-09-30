/**
 * Academic profiles for demo participants.
 *
 * The columns exist on `User` and the admin panel lists them, so leaving all
 * hundred rows null makes a working feature look broken in every screenshot
 * and demo. Values are derived from the row index rather than randomised, so a
 * reseed produces the same directory and screenshots stay comparable.
 *
 * Shared by `prisma/seed-demo.ts` and `scripts/fill-participant-profiles.ts`
 * so a full reseed and a one-off backfill can never produce different data.
 */

export const AZ_UNIVERSITIES = [
  "Bakı Dövlət Universiteti",
  "ADA Universiteti",
  "Azərbaycan Dövlət İqtisad Universiteti (UNEC)",
  "Azərbaycan Texniki Universiteti",
  "Xəzər Universiteti",
  "Bakı Mühəndislik Universiteti",
];

export const TR_UNIVERSITIES = [
  "Boğaziçi Üniversitesi",
  "Orta Doğu Teknik Üniversitesi",
  "İstanbul Teknik Üniversitesi",
  "Bilkent Üniversitesi",
  "Ege Üniversitesi",
  "Sabancı Üniversitesi",
];

export const FACULTIES = [
  "İqtisadiyyat və İdarəetmə",
  "Mühəndislik",
  "İnformasiya Texnologiyaları",
  "Biznes və Menecment",
  "Sosial Elmlər",
];

export const SPECIALTIES = [
  "Biznesin idarə edilməsi",
  "Kompüter elmləri",
  "Marketinq",
  "Maliyyə",
  "Sənaye mühəndisliyi",
  "Data analitikası",
];

export interface GeneratedProfile {
  phone: string;
  university: string;
  faculty: string;
  specialty: string;
  studyYear: number;
}

export function participantProfile(index: number, language: string): GeneratedProfile {
  const trackTr = language === "tr";
  const universities = trackTr ? TR_UNIVERSITIES : AZ_UNIVERSITIES;
  const block = String(700 + (index % 300));
  const pair = String(10 + (index % 90));
  return {
    phone: trackTr
      ? `+90 5${30 + (index % 10)} ${block} ${pair} ${pair}`
      : `+994 ${50 + (index % 5)} ${block} ${pair} ${pair}`,
    university: universities[index % universities.length],
    faculty: FACULTIES[index % FACULTIES.length],
    specialty: SPECIALTIES[index % SPECIALTIES.length],
    studyYear: 1 + (index % 4),
  };
}
