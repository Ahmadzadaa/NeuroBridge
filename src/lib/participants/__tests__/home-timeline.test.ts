import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { programTimeline } from "@/lib/participants/home";
import { generateProgramSchedule } from "@/lib/programs/schedule";

const start = new Date("2026-10-05T00:00:00Z");
const end = new Date("2026-11-15T00:00:00Z");
const schedule = generateProgramSchedule(start, end).map((i) => ({ ...i, id: null, editedAt: null }));

describe("programTimeline", () => {
  it("counts down before the programme starts", () => {
    const t = programTimeline(schedule, start, end, new Date("2026-10-01T15:00:00Z"));
    expect(t.phase).toBe("upcoming");
    expect(t.daysLeft).toBe(4);
    expect(t.percent).toBe(0);
  });

  it("reports the current week and activity while running", () => {
    const t = programTimeline(schedule, start, end, new Date("2026-10-13T09:00:00Z"));
    expect(t.phase).toBe("running");
    expect(t.week).toBe(2);
    expect(t.current?.week).toBe(2);
    expect(t.percent).toBeGreaterThan(0);
    expect(t.upcoming[0].week).toBe(2);
  });

  it("is complete after the end date", () => {
    const t = programTimeline(schedule, start, end, new Date("2026-12-01T00:00:00Z"));
    expect(t.phase).toBe("finished");
    expect(t.percent).toBe(100);
    expect(t.upcoming).toHaveLength(0);
  });

  it("has no progress without dates", () => {
    expect(programTimeline([], null, null).phase).toBe("undated");
  });
});
