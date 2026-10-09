import { inflateRawSync } from "zlib";
import { describe, expect, it } from "vitest";
import { buildUniversityReport, defaultYears } from "@/lib/reports/university-reports";
import { academicYearLabel, academicYearOf, type Translate } from "@/lib/reports/university-types";
import { buildXlsx, sheetNames } from "@/lib/reports/xlsx";
import type { DsUser, ReportDataset } from "@/lib/reports/university-dataset";

const t: Translate = (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key);
const ctx = { t, scope: "all" };

function user(id: string, extra: Partial<DsUser> = {}): DsUser {
  return { id, name: id.toUpperCase(), email: `${id}@x.az`, university: "ADA", department: "CS", studyYear: 2, coins: 0, recentlyActive: false, opportunities: false, psychShared: false, ...extra };
}

/**
 * Three students: u1 and u2 in a 2025–26 programme (u2 still pending), u3 in
 * a 2026–27 one, plus a 2026–27 hackathon with one team.
 */
function dataset(): ReportDataset {
  return {
    programs: [
      { id: "p1", name: "Spring", type: "training", academicYear: 2025, trainingKeys: ["idea"] },
      { id: "p2", name: "Autumn", type: "training", academicYear: 2026, trainingKeys: ["idea"] },
      { id: "h1", name: "Hack", type: "hackathon", academicYear: 2026, trainingKeys: [] },
    ],
    participants: [
      { userId: "u1", programId: "p1", status: "ACTIVE", registeredAt: new Date("2025-10-01") },
      { userId: "u2", programId: "p1", status: "PENDING", registeredAt: new Date("2025-10-02") },
      { userId: "u3", programId: "p2", status: "ACTIVE", registeredAt: new Date("2026-10-01") },
    ],
    users: new Map([
      ["u1", user("u1", { recentlyActive: true, psychShared: true, opportunities: true })],
      ["u2", user("u2", { studyYear: null, department: null })],
      ["u3", user("u3")],
    ]),
    trainings: [
      {
        id: "t1",
        key: "idea",
        title: "Idea development",
        lessons: [
          { id: "L1", title: "Unit 1", isUnit: true, points: 100 },
          { id: "L2", title: "Unit 2", isUnit: true, points: 100 },
          { id: "L3", title: "Wrap-up", isUnit: false, points: 0 },
        ],
        exams: [
          { id: "E1", lessonId: "L1" },
          { id: "E2", lessonId: "L2" },
        ],
      },
    ],
    progress: [
      { userId: "u1", lessonId: "L1" },
      { userId: "u1", lessonId: "L2" },
      { userId: "u1", lessonId: "L3" },
      { userId: "u3", lessonId: "L1" },
    ],
    attempts: [
      { userId: "u1", examId: "E1", score: 80, passed: true },
      { userId: "u1", examId: "E2", score: 50, passed: false },
      { userId: "u3", examId: "E1", score: 90, passed: true },
    ],
    ideas: [
      { userId: "u1", lessonId: "L1" },
      { userId: "u3", lessonId: "L1" },
    ],
    simulations: [{ id: "s1", title: "Coffee shop" }],
    runs: [{ userId: "u1", simulationId: "s1", completed: true, score: 2000 }],
    certificates: [{ userId: "u1", programId: "p1" }],
    assessments: [
      { id: "CHAR", kind: "CHARACTER", title: "Character", dimensions: [{ code: "a", label: "A" }, { code: "b", label: "B" }] },
      { id: "PSY", kind: "PSYCH", title: "Wellbeing", dimensions: [{ code: "p", label: "P" }] },
    ],
    results: [
      { userId: "u1", programId: "p1", assessmentId: "CHAR", scores: { a: 80, b: 30 } },
      { userId: "u1", programId: "p1", assessmentId: "PSY", scores: { p: 50 } },
      { userId: "u3", programId: "p2", assessmentId: "CHAR", scores: { a: 60, b: 60 } },
      { userId: "u3", programId: "p2", assessmentId: "PSY", scores: { p: 20 } },
    ],
    teams: [{ programId: "h1", name: "Rockets", members: 3, submitted: true, total: 70, rank: 1 }],
    finalists: [],
  };
}

const kpis = (r: { kpis: { key: string; value: number | null }[] }) => Object.fromEntries(r.kpis.map((k) => [k.key, k.value]));

describe("academic years", () => {
  it("runs September to August", () => {
    expect(academicYearOf(new Date("2025-09-01T00:00:00Z"))).toBe(2025);
    expect(academicYearOf(new Date("2026-03-15T00:00:00Z"))).toBe(2025);
    expect(academicYearOf(new Date("2026-08-31T00:00:00Z"))).toBe(2025);
    expect(academicYearLabel(2025)).toBe("2025–26");
    expect(academicYearLabel(2099)).toBe("2099–00");
  });

  it("defaults the comparison to the latest two years", () => {
    expect(defaultYears([2024, 2026, 2025])).toEqual([2025, 2026]);
    expect(defaultYears([2026])).toEqual([2025, 2026]);
  });
});

describe("general report", () => {
  it("averages training completion over enrolled students only", () => {
    const r = buildUniversityReport("general", dataset(), ctx);
    expect(kpis(r)).toMatchObject({
      students: 3,
      active30: 1,
      // u1 100%, u3 1 of 3 lessons; pending u2 is not enrolled yet.
      trainingCompletion: 66.7,
      // 3 attempts over 2 students × 2 exams.
      testCompletion: 75,
      ideas: 2,
      teams: 1,
      mvps: 1,
      hackathonStudents: 3,
    });
    expect(r.tables[0].rows.map((row) => [row.program, row.students])).toEqual([
      ["Spring", 2],
      ["Autumn", 1],
      ["Hack", 0],
    ]);
  });
});

describe("participation report", () => {
  it("groups by department and year and lists every enrolment", () => {
    const r = buildUniversityReport("participation", dataset(), ctx);
    expect(kpis(r)).toMatchObject({ students: 3, enrolledActive: 2, pending: 1, opportunities: 1 });
    const dept = r.tables.find((x) => x.id === "byDepartment")!;
    expect(dept.rows).toEqual([
      { department: "CS", students: 2, share: 66.7 },
      { department: "—", students: 1, share: 33.3 },
    ]);
    expect(r.tables.find((x) => x.id === "students")!.rows).toHaveLength(3);
  });
});

describe("training report", () => {
  it("reports each unit's projects and test results", () => {
    const r = buildUniversityReport("training", dataset(), ctx);
    const units = r.tables.find((x) => x.id === "byUnit")!.rows;
    expect(units[0]).toMatchObject({ unit: "Unit 1", enrolled: 2, projects: 2, projectRate: 100, testsTaken: 2, averageScore: 85, passRate: 100 });
    expect(units[1]).toMatchObject({ unit: "Unit 2", projects: 0, testsTaken: 1, passRate: 0 });
    expect(r.tables.find((x) => x.id === "byTraining")!.rows[0]).toMatchObject({ enrolled: 2, started: 2, completed: 1 });
  });
});

describe("competency report", () => {
  it("includes psychological scores only for students who consented", () => {
    const r = buildUniversityReport("competency", dataset(), ctx);
    const psych = r.tables.find((x) => x.id === "assessment-PSY")!;
    expect(psych.rows[0]).toMatchObject({ scored: 1, averageScore: 50 });
    expect(r.notes[0]).toContain('"shared":1');
    expect(r.notes[0]).toContain('"completed":2');

    const character = r.tables.find((x) => x.id === "assessment-CHAR")!;
    expect(character.rows[1]).toMatchObject({ dimension: "B", scored: 2, averageScore: 45, low: 1, mid: 1, high: 0 });
    expect(kpis(r)).toMatchObject({ baselineCompleted: 2, psychShared: 1 });
  });
});

describe("simulation and test results report", () => {
  it("ranks by unit points, then the test total", () => {
    const r = buildUniversityReport("simulation", dataset(), ctx);
    const board = r.tables.find((x) => x.id === "scoreboard")!.rows;
    expect(board.map((row) => [row.student, row.rank, row.points])).toEqual([
      ["U1", 1, 100],
      ["U3", 2, 100],
      ["U2", 3, 0],
    ]);
    expect(kpis(r)).toMatchObject({ ideas: 2, simulationsCompleted: 1, trainingsCompleted: 1, testsPassed: 2, certificates: 1 });
  });
});

describe("student development report", () => {
  it("sets the baseline against current unit progress", () => {
    const r = buildUniversityReport("development", dataset(), ctx);
    const u1 = r.tables[0].rows.find((row) => row.student === "U1")!;
    // Baseline uses the character test only, never the psychological one.
    expect(u1).toMatchObject({ baselineScore: 55, unitsPassed: "1/2", unitAverage: 65, trainingProgress: 100 });
    expect(r.bars[0].items.map((i) => i.values[0])).toEqual([33.3, 0, 66.7, 0]);
  });
});

describe("year-over-year report", () => {
  it("compares two academic years metric by metric", () => {
    const r = buildUniversityReport("yoy", dataset(), { ...ctx, years: [2025, 2026] });
    const students = r.tables[0].rows.find((row) => row.metric === "kpi.students")!;
    expect(students).toMatchObject({ a: 2, b: 1, change: -1 });
    expect(kpis(r).studentGrowth).toBe(-50);
    expect(r.tables[1].rows.map((row) => row.year)).toEqual(["2025–26", "2026–27"]);
  });
});

describe("xlsx writer", () => {
  it("makes Excel-safe, unique sheet names", () => {
    expect(sheetNames(["A/B", "a/b", "x".repeat(40), ""])).toEqual(["A B", "a b 2", "x".repeat(31), "Sheet"]);
  });

  it("writes a zip whose sheet holds the cells", () => {
    const file = buildXlsx([{ name: "Data", rows: [["Name", "Score"], ["Ləman & Co", 91.5]], boldRows: [0] }]);
    expect(file.subarray(0, 2).toString()).toBe("PK");

    // Walk the local headers to the first worksheet and inflate it.
    let offset = 0;
    let sheet = "";
    while (file.readUInt32LE(offset) === 0x04034b50) {
      const size = file.readUInt32LE(offset + 18);
      const nameLen = file.readUInt16LE(offset + 26);
      const name = file.subarray(offset + 30, offset + 30 + nameLen).toString();
      const start = offset + 30 + nameLen;
      if (name === "xl/worksheets/sheet1.xml") sheet = inflateRawSync(file.subarray(start, start + size)).toString();
      offset = start + size;
    }
    expect(sheet).toContain("Ləman &amp; Co");
    expect(sheet).toContain("<v>91.5</v>");
    expect(sheet).toContain('s="1"');
  });
});
