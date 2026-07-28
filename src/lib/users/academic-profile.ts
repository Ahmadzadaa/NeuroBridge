/**
 * Academic profile normalisation.
 *
 * Forms submit empty strings for untouched optional fields; the database
 * should hold `null` instead, so "not provided" is one value rather than two.
 */

export interface AcademicProfileInput {
  university?: string | null;
  faculty?: string | null;
  specialty?: string | null;
  studyYear?: number | null;
}

export interface AcademicProfile {
  university: string | null;
  faculty: string | null;
  specialty: string | null;
  studyYear: number | null;
}

function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeAcademicProfile(
  input: AcademicProfileInput
): AcademicProfile {
  return {
    university: blankToNull(input.university),
    faculty: blankToNull(input.faculty),
    specialty: blankToNull(input.specialty),
    studyYear:
      input.studyYear === null || input.studyYear === undefined
        ? null
        : input.studyYear,
  };
}

/** True when at least one academic field has been filled in. */
export function hasAcademicProfile(profile: AcademicProfile): boolean {
  return Boolean(
    profile.university || profile.faculty || profile.specialty || profile.studyYear
  );
}
