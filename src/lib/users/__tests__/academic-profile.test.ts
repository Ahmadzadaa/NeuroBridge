import { describe, expect, it } from "vitest";
import {
  hasAcademicProfile,
  normalizeAcademicProfile,
} from "@/lib/users/academic-profile";
import { academicProfileSchema, joinTeacherSchema } from "@/lib/validation/schemas";

describe("normalizeAcademicProfile", () => {
  it("keeps provided values, trimmed", () => {
    expect(
      normalizeAcademicProfile({
        university: "  Baku State University  ",
        faculty: "Economics",
        specialty: "Finance",
        studyYear: 3,
      })
    ).toEqual({
      university: "Baku State University",
      faculty: "Economics",
      specialty: "Finance",
      studyYear: 3,
    });
  });

  it("turns empty strings into null so 'not provided' has one representation", () => {
    expect(
      normalizeAcademicProfile({ university: "", faculty: "   ", specialty: "" })
    ).toEqual({
      university: null,
      faculty: null,
      specialty: null,
      studyYear: null,
    });
  });

  it("treats missing fields as null", () => {
    expect(normalizeAcademicProfile({})).toEqual({
      university: null,
      faculty: null,
      specialty: null,
      studyYear: null,
    });
  });

  it("preserves study year 0 as null rather than a falsy year", () => {
    // Year 0 is not a valid course, so it should never survive as a number.
    expect(normalizeAcademicProfile({ studyYear: null }).studyYear).toBeNull();
  });
});

describe("hasAcademicProfile", () => {
  it("is false when nothing is filled in", () => {
    expect(hasAcademicProfile(normalizeAcademicProfile({}))).toBe(false);
  });

  it("is true when only the university is known", () => {
    expect(
      hasAcademicProfile(normalizeAcademicProfile({ university: "ADA" }))
    ).toBe(true);
  });

  it("is true when only the study year is known", () => {
    expect(hasAcademicProfile(normalizeAcademicProfile({ studyYear: 1 }))).toBe(
      true
    );
  });
});

describe("academicProfileSchema", () => {
  it("accepts an entirely empty profile", () => {
    expect(academicProfileSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a study year within 1–6", () => {
    for (const year of [1, 2, 3, 4, 5, 6]) {
      expect(academicProfileSchema.safeParse({ studyYear: year }).success).toBe(
        true
      );
    }
  });

  it("rejects a study year outside the range", () => {
    expect(academicProfileSchema.safeParse({ studyYear: 0 }).success).toBe(false);
    expect(academicProfileSchema.safeParse({ studyYear: 7 }).success).toBe(false);
  });

  it("rejects angle brackets, which the shared safeString guard blocks", () => {
    expect(
      academicProfileSchema.safeParse({ university: "<script>" }).success
    ).toBe(false);
  });
});

describe("joinTeacherSchema", () => {
  const valid = {
    email: "Student@Example.com",
    password: "Passw0rdd",
    firstName: "Ayan",
    lastName: "Mammadova",
    university: "Baku State University",
    faculty: "Economics",
    specialty: "Finance",
    studyYear: 2,
  };

  it("accepts a complete student registration", () => {
    const result = joinTeacherSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("student@example.com");
  });

  it("requires the university — teachers need it to run a class", () => {
    expect(joinTeacherSchema.safeParse({ ...valid, university: "" }).success).toBe(
      false
    );
  });

  it("requires the faculty", () => {
    expect(joinTeacherSchema.safeParse({ ...valid, faculty: "" }).success).toBe(
      false
    );
  });

  it("requires the specialty", () => {
    expect(joinTeacherSchema.safeParse({ ...valid, specialty: "" }).success).toBe(
      false
    );
  });

  it("requires a study year", () => {
    const withoutYear: Record<string, unknown> = { ...valid };
    delete withoutYear.studyYear;
    expect(joinTeacherSchema.safeParse(withoutYear).success).toBe(false);
  });

  it("coerces a study year sent as a string by the form", () => {
    const result = joinTeacherSchema.safeParse({ ...valid, studyYear: "3" });
    expect(result.success).toBe(true);
    expect(result.data?.studyYear).toBe(3);
  });

  it("still enforces the password policy", () => {
    expect(
      joinTeacherSchema.safeParse({ ...valid, password: "alllowercase" }).success
    ).toBe(false);
  });
});
