import { describe, expect, it } from "vitest";
import {
  generateProgramSchedule,
  isWeekend,
  MIN_PROGRAM_DAYS,
  PROGRAM_WEEKS,
  ScheduleError,
  validateJuryDate,
} from "@/lib/programs/schedule";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const jury = (items: ReturnType<typeof generateProgramSchedule>) =>
  items.find((i) => i.activity === "JURY_PRESENTATION")!;

function expectScheduleError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ScheduleError);
    expect((error as ScheduleError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ScheduleError ${code}`);
}

describe("generateProgramSchedule", () => {
  // 2026-10-05 is a Monday; +41 days = Sunday 2026-11-15.
  const standard = generateProgramSchedule(d("2026-10-05"), d("2026-11-15"));

  it("splits a 42-day program into six 7-day weeks with every activity in order", () => {
    const weekStarts = [
      ...new Set(
        standard
          .filter((i) => i.activity !== "JURY_PRESENTATION")
          .map((i) => `${i.week}:${iso(i.startsOn)}`)
      ),
    ];
    expect(weekStarts).toEqual([
      "1:2026-10-05", "2:2026-10-12", "3:2026-10-19",
      "4:2026-10-26", "5:2026-11-02", "6:2026-11-09",
    ]);
    expect(standard.map((i) => i.activity)).toEqual(PROGRAM_WEEKS.flat());
    expect(standard.map((i) => i.sortOrder)).toEqual(standard.map((_, n) => n));
    expect(standard.find((i) => i.activity === "BASELINE_TESTS")).toMatchObject({ week: 1 });
  });

  it("puts the jury on the last weekday when the program ends on a Sunday", () => {
    expect(iso(jury(standard).startsOn)).toBe("2026-11-13"); // Friday
    expect(jury(standard).startsOn).toEqual(jury(standard).endsOn);
  });

  it.each([
    ["2026-11-14", "2026-11-13"], // ends Saturday -> Friday
    ["2026-11-16", "2026-11-16"], // ends Monday -> that Monday
  ])("ending on %s puts the jury on %s", (end, expected) => {
    expect(iso(jury(generateProgramSchedule(d("2026-10-05"), d(end))).startsOn)).toBe(expected);
  });

  it("falls back before the final week when that week is only a weekend", () => {
    // Mon 2026-10-05 .. Sat 2026-10-10: six 1-day weeks, week 6 is Saturday.
    const items = generateProgramSchedule(d("2026-10-05"), d("2026-10-10"));
    expect(iso(items.find((i) => i.week === 6)!.startsOn)).toBe("2026-10-10");
    expect(iso(jury(items).startsOn)).toBe("2026-10-09");
  });

  it("ignores the time of day on inputs", () => {
    const items = generateProgramSchedule(
      new Date("2026-10-05T21:30:00Z"),
      new Date("2026-11-15T03:00:00Z")
    );
    expect(iso(items[0].startsOn)).toBe("2026-10-05");
    expect(items[0].startsOn.getUTCHours()).toBe(0);
  });

  it("never schedules the jury on a weekend and always covers every day", () => {
    for (let offset = 0; offset < 14; offset++) {
      const start = new Date(Date.UTC(2026, 9, 5 + offset));
      for (let days = MIN_PROGRAM_DAYS; days <= 70; days++) {
        const end = new Date(start.getTime() + (days - 1) * 86_400_000);
        const items = generateProgramSchedule(start, end);
        const j = jury(items);

        expect(isWeekend(j.startsOn)).toBe(false);
        expect(j.startsOn >= start && j.startsOn <= end).toBe(true);

        // Weeks are contiguous and cover start..end exactly.
        const weeks = PROGRAM_WEEKS.map((_, w) => items.find((i) => i.week === w + 1 && i.activity !== "JURY_PRESENTATION")!);
        expect(weeks[0].startsOn).toEqual(start);
        expect(weeks[5].endsOn).toEqual(end);
        for (let w = 1; w < 6; w++) {
          expect(weeks[w].startsOn.getTime() - weeks[w - 1].endsOn.getTime()).toBe(86_400_000);
        }
      }
    }
  });

  it("rejects programs shorter than six days and reversed ranges", () => {
    expectScheduleError(() => generateProgramSchedule(d("2026-10-05"), d("2026-10-09")), "TOO_SHORT");
    expectScheduleError(() => generateProgramSchedule(d("2026-10-05"), d("2026-10-04")), "END_BEFORE_START");
    expectScheduleError(() => generateProgramSchedule(new Date("nope"), d("2026-10-04")), "INVALID_DATE");
  });
});

describe("validateJuryDate", () => {
  const start = d("2026-10-05");
  const end = d("2026-11-15");

  it("accepts a weekday inside the program", () => {
    expect(iso(validateJuryDate(new Date("2026-11-12T15:00:00Z"), start, end))).toBe("2026-11-12");
  });

  it("rejects weekends", () => {
    expectScheduleError(() => validateJuryDate(d("2026-11-14"), start, end), "WEEKEND_JURY_DATE");
    expectScheduleError(() => validateJuryDate(d("2026-11-15"), start, end), "WEEKEND_JURY_DATE");
  });

  it("rejects days outside the program", () => {
    expectScheduleError(() => validateJuryDate(d("2026-11-16"), start, end), "OUT_OF_RANGE");
    expectScheduleError(() => validateJuryDate(d("2026-10-02"), start, end), "OUT_OF_RANGE");
  });
});
