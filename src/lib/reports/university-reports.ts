import { rankByPlatformScore } from "@/lib/jury/scoring";
import { bandOf } from "@/lib/assessments/scoring";
import type { DsTraining, ReportDataset } from "@/lib/reports/university-dataset";
import {
  academicYearLabel,
  type Cell,
  type ReportBars,
  type ReportColumn,
  type ReportKpi,
  type ReportTable,
  type Translate,
  type UniversityReport,
  type UniversityReportType,
  type ValueKind,
} from "@/lib/reports/university-types";

/**
 * The eight university reports, built from one loaded dataset. Pure: no
 * database, no clock, so every figure here is covered by unit tests.
 *
 * Shared definitions, used the same way in every report:
 * - a student is enrolled when their enrolment is ACTIVE or COMPLETED;
 * - training completion averages each (student, assigned training) pair's
 *   share of finished lessons, so an untouched training pulls it down;
 * - an idea is a project submitted in a training unit; an MVP is a hackathon
 *   team with a submission.
 */

const ENROLLED = new Set(["ACTIVE", "COMPLETED"]);
const STATUSES = new Set(["PENDING", "ACTIVE", "INACTIVE", "COMPLETED"]);

const round1 = (v: number) => Math.round(v * 10) / 10;
const pct = (n: number, d: number) => (d > 0 ? round1((n / d) * 100) : null);
const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

class Index {
  readonly programName: Map<string, string>;
  readonly trainingByKey: Map<string, DsTraining>;
  readonly lessonsDone = new Map<string, Set<string>>();
  readonly attempt = new Map<string, { score: number; passed: boolean }>();
  readonly ideas = new Map<string, Set<string>>();

  constructor(readonly ds: ReportDataset) {
    this.programName = new Map(ds.programs.map((p) => [p.id, p.name]));
    this.trainingByKey = new Map(ds.trainings.map((t) => [t.key, t]));
    for (const p of ds.progress) this.add(this.lessonsDone, p.userId, p.lessonId);
    for (const i of ds.ideas) this.add(this.ideas, i.userId, i.lessonId);
    for (const a of ds.attempts) this.attempt.set(`${a.userId}:${a.examId}`, a);
  }

  private add(map: Map<string, Set<string>>, key: string, value: string) {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(value);
  }

  /** Lesson-completion share of one training for one student, 0–100. */
  progress(userId: string, t: DsTraining): number {
    if (t.lessons.length === 0) return 0;
    const done = this.lessonsDone.get(userId);
    const n = done ? t.lessons.filter((l) => done.has(l.id)).length : 0;
    return (n / t.lessons.length) * 100;
  }

  attemptsOf(userId: string, t: DsTraining) {
    return t.exams.flatMap((e) => {
      const a = this.attempt.get(`${userId}:${e.id}`);
      return a ? [{ ...a, examId: e.id, lessonId: e.lessonId }] : [];
    });
  }

  ideasOf(userId: string, t: DsTraining): number {
    const mine = this.ideas.get(userId);
    return mine ? t.lessons.filter((l) => mine.has(l.id)).length : 0;
  }

  /** Unit points (counted once, on a pass) and the unit-test score total that breaks ties. */
  unitScore(userId: string, trainings: DsTraining[]) {
    let points = 0;
    let testTotal = 0;
    let passed = 0;
    let units = 0;
    const scores: number[] = [];
    for (const t of trainings) {
      for (const lesson of t.lessons.filter((l) => l.isUnit)) {
        units++;
        const results = t.exams
          .filter((e) => e.lessonId === lesson.id)
          .map((e) => this.attempt.get(`${userId}:${e.id}`))
          .filter((a) => a !== undefined);
        if (results.length === 0) continue;
        const best = Math.max(...results.map((a) => a.score));
        scores.push(best);
        testTotal += best;
        if (results.some((a) => a.passed)) {
          points += lesson.points;
          passed++;
        }
      }
    }
    return { points, testTotal, passed, units, average: mean(scores) };
  }
}

interface Cohort {
  programIds: Set<string>;
  userIds: string[];
  /** Each student's assigned trainings, enrolled students only. */
  trainingsOf: Map<string, DsTraining[]>;
}

function cohortOf(ix: Index, programIds: Set<string>): Cohort {
  const userIds = new Set<string>();
  const trainingsOf = new Map<string, DsTraining[]>();
  for (const p of ix.ds.participants) {
    if (!programIds.has(p.programId) || !ix.ds.users.has(p.userId)) continue;
    userIds.add(p.userId);
    if (!ENROLLED.has(p.status)) continue;
    const list = trainingsOf.get(p.userId) ?? [];
    const program = ix.ds.programs.find((x) => x.id === p.programId);
    for (const key of program?.trainingKeys ?? []) {
      const t = ix.trainingByKey.get(key);
      if (t && !list.includes(t)) list.push(t);
    }
    trainingsOf.set(p.userId, list);
  }
  return { programIds, userIds: [...userIds], trainingsOf };
}

function pairs(c: Cohort) {
  return [...c.trainingsOf].flatMap(([userId, trainings]) => trainings.map((training) => ({ userId, training })));
}

export interface CohortMetrics {
  programs: number;
  students: number;
  active: number;
  trainingCompletion: number | null;
  testCompletion: number | null;
  averageScore: number | null;
  passRate: number | null;
  testsTaken: number;
  ideas: number;
  teams: number;
  mvps: number;
  hackathonStudents: number;
  simulationsCompleted: number;
  certificates: number;
  finalists: number;
}

function cohortMetrics(ix: Index, programIds: Set<string>): CohortMetrics {
  const c = cohortOf(ix, programIds);
  const all = pairs(c);
  const progress = all.filter((p) => p.training.lessons.length > 0).map((p) => ix.progress(p.userId, p.training));
  const attempts = all.flatMap((p) => ix.attemptsOf(p.userId, p.training));
  const examSlots = all.reduce((n, p) => n + p.training.exams.length, 0);
  const users = new Set(c.userIds);
  const teams = ix.ds.teams.filter((t) => programIds.has(t.programId));

  return {
    programs: programIds.size,
    students: c.userIds.length,
    active: c.userIds.filter((id) => ix.ds.users.get(id)?.recentlyActive).length,
    trainingCompletion: mean(progress),
    testCompletion: pct(attempts.length, examSlots),
    averageScore: mean(attempts.map((a) => a.score)),
    passRate: pct(attempts.filter((a) => a.passed).length, attempts.length),
    testsTaken: attempts.length,
    ideas: all.reduce((n, p) => n + ix.ideasOf(p.userId, p.training), 0),
    teams: teams.length,
    mvps: teams.filter((t) => t.submitted).length,
    hackathonStudents: teams.reduce((n, t) => n + t.members, 0),
    simulationsCompleted: ix.ds.runs.filter((r) => r.completed && users.has(r.userId)).length,
    certificates: ix.ds.certificates.filter((x) => (x.programId ? programIds.has(x.programId) : users.has(x.userId))).length,
    finalists: ix.ds.finalists.filter((f) => programIds.has(f.programId)).length,
  };
}

// ---------------------------------------------------------------------------

export interface BuildContext {
  t: Translate;
  scope: string;
  /** Year-over-year only: the two academic years to compare, earlier first. */
  years?: [number, number] | null;
}

type Parts = Pick<UniversityReport, "kpis" | "bars" | "tables" | "notes">;

function helpers(t: Translate) {
  return {
    col: (key: string, kind: ValueKind = "number"): ReportColumn => ({ key, label: t(`col.${key}`), kind }),
    kpi: (key: string, value: number | null, kind: ValueKind = "number"): ReportKpi => ({ key, label: t(`kpi.${key}`), value, kind }),
    table: (id: string, columns: ReportColumn[], rows: Record<string, Cell>[], note?: string): ReportTable => ({
      id,
      title: t(`tables.${id}`),
      columns,
      rows,
      ...(note ? { note } : {}),
    }),
    yesNo: (v: boolean) => (v ? t("yes") : t("no")),
  };
}

export function buildUniversityReport(type: UniversityReportType, ds: ReportDataset, ctx: BuildContext): UniversityReport {
  const ix = new Index(ds);
  const parts = BUILDERS[type](ix, ctx);
  return {
    type,
    title: ctx.t(`types.${type}.title`),
    description: ctx.t(`types.${type}.description`),
    scope: ctx.scope,
    ...parts,
  };
}

const allPrograms = (ix: Index) => new Set(ix.ds.programs.map((p) => p.id));

const BUILDERS: Record<UniversityReportType, (ix: Index, ctx: BuildContext) => Parts> = {
  general(ix, { t }) {
    const { col, kpi, table } = helpers(t);
    const m = cohortMetrics(ix, allPrograms(ix));
    const perProgram = ix.ds.programs.map((p) => ({ p, m: cohortMetrics(ix, new Set([p.id])) }));
    return {
      kpis: [
        kpi("students", m.students),
        kpi("active30", m.active),
        kpi("trainingCompletion", m.trainingCompletion, "percent"),
        kpi("testCompletion", m.testCompletion, "percent"),
        kpi("ideas", m.ideas),
        kpi("teams", m.teams),
        kpi("mvps", m.mvps),
        kpi("hackathonStudents", m.hackathonStudents),
      ],
      bars: [
        {
          id: "completionByProgram",
          title: t("bars.completionByProgram"),
          series: [t("kpi.trainingCompletion")],
          items: perProgram.map(({ p, m }) => ({ label: p.name, values: [m.trainingCompletion] })),
        },
      ],
      tables: [
        table(
          "byProgram",
          [col("program", "text"), col("year", "text"), col("students"), col("active30"), col("trainingCompletion", "percent"), col("averageScore", "score"), col("ideas"), col("certificates")],
          perProgram.map(({ p, m }) => ({
            program: p.name,
            year: academicYearLabel(p.academicYear),
            students: m.students,
            active30: m.active,
            trainingCompletion: m.trainingCompletion,
            averageScore: m.averageScore,
            ideas: m.ideas,
            certificates: m.certificates,
          }))
        ),
      ],
      notes: [t("notes.active30")],
    };
  },

  participation(ix, { t }) {
    const { col, kpi, table, yesNo } = helpers(t);
    const rows = ix.ds.participants.filter((p) => ix.ds.users.has(p.userId));
    const users = [...new Set(rows.map((p) => p.userId))].map((id) => ix.ds.users.get(id)!);
    const count = (status: string) => new Set(rows.filter((p) => p.status === status).map((p) => p.userId)).size;

    const groupBy = (label: (u: (typeof users)[number]) => string) => {
      const groups = new Map<string, number>();
      for (const u of users) groups.set(label(u), (groups.get(label(u)) ?? 0) + 1);
      return [...groups].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, students: n, share: pct(n, users.length) }));
    };

    return {
      kpis: [
        kpi("students", users.length),
        kpi("enrolledActive", count("ACTIVE")),
        kpi("completed", count("COMPLETED")),
        kpi("pending", count("PENDING")),
        kpi("active30", users.filter((u) => u.recentlyActive).length),
        kpi("opportunities", users.filter((u) => u.opportunities).length),
      ],
      bars: [],
      tables: [
        table("byDepartment", [col("department", "text"), col("students"), col("share", "percent")], groupBy((u) => u.department ?? "—").map((g) => ({ department: g.name, students: g.students, share: g.share }))),
        table("byGrade", [col("grade", "text"), col("students"), col("share", "percent")], groupBy((u) => (u.studyYear ? t("gradeN", { n: u.studyYear }) : "—")).map((g) => ({ grade: g.name, students: g.students, share: g.share }))),
        table(
          "students",
          [col("student", "text"), col("email", "text"), col("program", "text"), col("university", "text"), col("department", "text"), col("grade", "text"), col("status", "text"), col("registeredAt", "date"), col("active30", "text"), col("opportunities", "text")],
          rows.map((p) => {
            const u = ix.ds.users.get(p.userId)!;
            return {
              student: u.name,
              email: u.email,
              program: ix.programName.get(p.programId) ?? "",
              university: u.university ?? "—",
              department: u.department ?? "—",
              grade: u.studyYear ? t("gradeN", { n: u.studyYear }) : "—",
              status: STATUSES.has(p.status) ? t(`status.${p.status}`) : p.status,
              registeredAt: p.registeredAt.toISOString().slice(0, 10),
              active30: yesNo(u.recentlyActive),
              opportunities: yesNo(u.opportunities),
            };
          })
        ),
      ],
      notes: [t("notes.active30")],
    };
  },

  training(ix, { t }) {
    const { col, kpi, table } = helpers(t);
    const c = cohortOf(ix, allPrograms(ix));
    const all = pairs(c);
    const m = cohortMetrics(ix, c.programIds);
    const trainings = [...new Set(all.map((p) => p.training))];

    const perTraining = trainings.map((training) => {
      const mine = all.filter((p) => p.training === training);
      const progress = mine.map((p) => ix.progress(p.userId, training));
      const attempts = mine.flatMap((p) => ix.attemptsOf(p.userId, training));
      return {
        training: training.title,
        enrolled: mine.length,
        started: progress.filter((v) => v > 0).length,
        completed: progress.filter((v) => v >= 100).length,
        progress: mean(progress),
        testsTaken: attempts.length,
        averageScore: mean(attempts.map((a) => a.score)),
        passRate: pct(attempts.filter((a) => a.passed).length, attempts.length),
      };
    });

    const units = trainings.flatMap((training) => {
      const enrolled = all.filter((p) => p.training === training).map((p) => p.userId);
      return training.lessons
        .filter((l) => l.isUnit)
        .map((lesson) => {
          const exams = training.exams.filter((e) => e.lessonId === lesson.id).map((e) => e.id);
          const attempts = enrolled.flatMap((u) => exams.map((e) => ix.attempt.get(`${u}:${e}`)).filter((a) => a !== undefined));
          const projects = enrolled.filter((u) => ix.ideas.get(u)?.has(lesson.id)).length;
          return {
            unit: lesson.title,
            enrolled: enrolled.length,
            projects,
            projectRate: pct(projects, enrolled.length),
            testsTaken: attempts.length,
            averageScore: mean(attempts.map((a) => a.score)),
            passRate: pct(attempts.filter((a) => a.passed).length, attempts.length),
            points: lesson.points,
          };
        });
    });

    return {
      kpis: [
        kpi("trainings", trainings.length),
        kpi("trainingCompletion", m.trainingCompletion, "percent"),
        kpi("testsTaken", m.testsTaken),
        kpi("averageScore", m.averageScore, "score"),
        kpi("passRate", m.passRate, "percent"),
      ],
      bars: [
        {
          id: "progressByTraining",
          title: t("bars.progressByTraining"),
          series: [t("col.progress")],
          items: perTraining.map((r) => ({ label: r.training, values: [r.progress] })),
        },
      ],
      tables: [
        table(
          "byTraining",
          [col("training", "text"), col("enrolled"), col("started"), col("completed"), col("progress", "percent"), col("testsTaken"), col("averageScore", "score"), col("passRate", "percent")],
          perTraining
        ),
        ...(units.length
          ? [table("byUnit", [col("unit", "text"), col("enrolled"), col("projects"), col("projectRate", "percent"), col("testsTaken"), col("averageScore", "score"), col("passRate", "percent"), col("points")], units)]
          : []),
      ],
      notes: [],
    };
  },

  competency(ix, { t }) {
    const { col, kpi } = helpers(t);
    const c = cohortOf(ix, allPrograms(ix));
    const users = new Set(c.userIds);
    const results = ix.ds.results.filter((r) => users.has(r.userId) && c.programIds.has(r.programId));
    const done = (userId: string, assessmentId: string) => results.some((r) => r.userId === userId && r.assessmentId === assessmentId);
    const completedAll = c.userIds.filter((u) => ix.ds.assessments.every((a) => done(u, a.id))).length;

    const bars: ReportBars[] = [];
    const tables: ReportTable[] = [];
    const notes: string[] = [];
    for (const a of ix.ds.assessments) {
      // One result per student; PSYCH only with the student's separate consent.
      const seen = new Set<string>();
      const mine = results.filter((r) => r.assessmentId === a.id && !seen.has(r.userId) && seen.add(r.userId));
      const visible = a.kind === "PSYCH" ? mine.filter((r) => ix.ds.users.get(r.userId)?.psychShared) : mine;
      if (a.kind === "PSYCH") notes.push(t("notes.psychConsent", { title: a.title, shared: visible.length, completed: mine.length }));

      const rows = a.dimensions.map((d) => {
        const scores = visible.map((r) => r.scores[d.code]).filter((s): s is number => typeof s === "number");
        const bands = scores.map(bandOf);
        return {
          dimension: d.label,
          scored: scores.length,
          averageScore: mean(scores),
          low: bands.filter((b) => b === "low").length,
          mid: bands.filter((b) => b === "mid").length,
          high: bands.filter((b) => b === "high").length,
        };
      });
      bars.push({ id: `assessment-${a.id}`, title: a.title, series: [t("col.averageScore")], items: rows.map((r) => ({ label: r.dimension, values: [r.averageScore] })) });
      tables.push({
        id: `assessment-${a.id}`,
        title: `${a.title} (${t("completedOf", { done: mine.length, total: c.userIds.length })})`,
        columns: [col("dimension", "text"), col("scored"), col("averageScore", "score"), col("low"), col("mid"), col("high")],
        rows,
      });
    }

    return {
      kpis: [
        kpi("students", c.userIds.length),
        kpi("baselineCompleted", completedAll),
        kpi("baselineRate", pct(completedAll, c.userIds.length), "percent"),
        kpi("psychShared", c.userIds.filter((u) => ix.ds.users.get(u)?.psychShared).length),
      ],
      bars,
      tables,
      notes: [...notes, t("notes.bands")],
    };
  },

  simulation(ix, { t }) {
    const { col, kpi, table } = helpers(t);
    const c = cohortOf(ix, allPrograms(ix));
    const m = cohortMetrics(ix, c.programIds);
    const users = new Set(c.userIds);
    const programsOf = (userId: string) =>
      ix.ds.participants.filter((p) => p.userId === userId && c.programIds.has(p.programId)).map((p) => ix.programName.get(p.programId));

    const ranked = rankByPlatformScore(
      c.userIds.map((userId) => {
        const trainings = c.trainingsOf.get(userId) ?? [];
        const s = ix.unitScore(userId, trainings);
        const attempts = trainings.flatMap((tr) => ix.attemptsOf(userId, tr));
        return {
          userId,
          points: s.points,
          testTotal: s.testTotal,
          testsPassed: attempts.filter((a) => a.passed).length,
          averageScore: mean(attempts.map((a) => a.score)),
          ideas: trainings.reduce((n, tr) => n + ix.ideasOf(userId, tr), 0),
        };
      })
    );

    const trainingsCompleted = pairs(c).filter((p) => p.training.lessons.length > 0 && ix.progress(p.userId, p.training) >= 100).length;
    const perSim = ix.ds.simulations
      .map((sim) => {
        const runs = ix.ds.runs.filter((r) => r.simulationId === sim.id && users.has(r.userId));
        const completed = runs.filter((r) => r.completed);
        return {
          simulation: sim.title,
          players: new Set(runs.map((r) => r.userId)).size,
          runs: runs.length,
          completedRuns: completed.length,
          completionRate: pct(completed.length, runs.length),
          averageScore: mean(completed.map((r) => r.score).filter((s): s is number => s !== null)),
        };
      })
      .filter((r) => r.runs > 0);

    return {
      kpis: [
        kpi("ideas", m.ideas),
        kpi("simulationsCompleted", m.simulationsCompleted),
        kpi("trainingsCompleted", trainingsCompleted),
        kpi("testsPassed", ranked.reduce((n, r) => n + r.testsPassed, 0)),
        kpi("certificates", m.certificates),
      ],
      bars: [],
      tables: [
        table(
          "scoreboard",
          [col("rank"), col("student", "text"), col("program", "text"), col("points"), col("testsPassed"), col("averageScore", "score"), col("simulationsCompleted"), col("ideas"), col("certificates"), col("coins")],
          ranked.map((r) => {
            const u = ix.ds.users.get(r.userId)!;
            return {
              rank: r.rank,
              student: u.name,
              program: programsOf(r.userId).join(", "),
              points: r.points,
              testsPassed: r.testsPassed,
              averageScore: r.averageScore,
              simulationsCompleted: ix.ds.runs.filter((x) => x.userId === r.userId && x.completed).length,
              ideas: r.ideas,
              certificates: ix.ds.certificates.filter((x) => x.userId === r.userId && (!x.programId || c.programIds.has(x.programId))).length,
              coins: u.coins,
            };
          })
        ),
        table("bySimulation", [col("simulation", "text"), col("players"), col("runs"), col("completedRuns"), col("completionRate", "percent"), col("averageScore", "number")], perSim),
      ],
      notes: [t("notes.scoreboard")],
    };
  },

  hackathon(ix, { t }) {
    const { col, kpi, table, yesNo } = helpers(t);
    const programIds = allPrograms(ix);
    const m = cohortMetrics(ix, programIds);
    const hackathons = ix.ds.programs.filter((p) => p.type === "hackathon");
    const finalists = ix.ds.finalists.filter((f) => programIds.has(f.programId));

    return {
      kpis: [
        kpi("hackathons", hackathons.length),
        kpi("teams", m.teams),
        kpi("hackathonStudents", m.hackathonStudents),
        kpi("mvps", m.mvps),
        kpi("finalists", finalists.length),
        kpi("juryEvaluated", finalists.filter((f) => f.jurorsScored > 0).length),
      ],
      bars: [],
      tables: [
        table(
          "teams",
          [col("program", "text"), col("team", "text"), col("members"), col("mvp", "text"), col("juryScore", "score"), col("rank")],
          ix.ds.teams.map((team) => ({
            program: ix.programName.get(team.programId) ?? "",
            team: team.name,
            members: team.members,
            mvp: yesNo(team.submitted),
            juryScore: team.total,
            rank: team.total === null ? null : team.rank,
          }))
        ),
        table(
          "finalists",
          [col("program", "text"), col("student", "text"), col("platformRank"), col("juryScore", "score"), col("jurors"), col("juryRank")],
          finalists.map((f) => ({
            program: ix.programName.get(f.programId) ?? "",
            student: ix.ds.users.get(f.userId)?.name ?? "",
            platformRank: f.platformRank,
            juryScore: f.juryTotal,
            jurors: f.jurorsScored,
            juryRank: f.juryRank,
          }))
        ),
      ],
      notes: hackathons.length ? [] : [t("notes.noHackathon")],
    };
  },

  development(ix, { t }) {
    const { col, kpi, table, yesNo } = helpers(t);
    const c = cohortOf(ix, allPrograms(ix));
    const baseline = ix.ds.assessments.filter((a) => a.kind !== "PSYCH");
    const finalists = new Set(ix.ds.finalists.map((f) => f.userId));

    const rows = c.userIds.map((userId) => {
      const u = ix.ds.users.get(userId)!;
      const trainings = c.trainingsOf.get(userId) ?? [];
      const results = ix.ds.results.filter((r) => r.userId === userId && c.programIds.has(r.programId) && baseline.some((a) => a.id === r.assessmentId));
      const s = ix.unitScore(userId, trainings);
      const registered = ix.ds.participants
        .filter((p) => p.userId === userId && c.programIds.has(p.programId))
        .reduce((min, p) => (p.registeredAt < min ? p.registeredAt : min), new Date(8.64e15));
      return {
        student: u.name,
        registeredAt: registered.toISOString().slice(0, 10),
        baselineDone: baseline.length > 0 && baseline.every((a) => results.some((r) => r.assessmentId === a.id)),
        baselineScore: mean(results.flatMap((r) => Object.values(r.scores))),
        unitsPassed: s.passed,
        units: s.units,
        unitProgress: pct(s.passed, s.units),
        unitAverage: s.average,
        trainingProgress: mean(trainings.filter((tr) => tr.lessons.length).map((tr) => ix.progress(userId, tr))),
        simulationsCompleted: ix.ds.runs.filter((r) => r.userId === userId && r.completed).length,
        certificates: ix.ds.certificates.filter((x) => x.userId === userId && (!x.programId || c.programIds.has(x.programId))).length,
        finalist: finalists.has(userId),
      };
    });

    const band = (r: (typeof rows)[number]) =>
      !r.units || r.unitsPassed === 0 ? "notStarted" : r.unitsPassed === r.units ? "allUnits" : r.unitsPassed * 2 >= r.units ? "halfway" : "started";
    const bands = ["notStarted", "started", "halfway", "allUnits"] as const;

    return {
      kpis: [
        kpi("students", rows.length),
        kpi("baselineAverage", mean(rows.map((r) => r.baselineScore).filter((v): v is number => v !== null)), "score"),
        kpi("unitAverage", mean(rows.map((r) => r.unitAverage).filter((v): v is number => v !== null)), "score"),
        kpi("allUnits", rows.filter((r) => band(r) === "allUnits").length),
        kpi("finalists", rows.filter((r) => r.finalist).length),
      ],
      bars: [
        {
          id: "unitBands",
          title: t("bars.unitBands"),
          series: [t("col.share")],
          items: bands.map((b) => ({ label: t(`band.${b}`), values: [pct(rows.filter((r) => band(r) === b).length, rows.length)] })),
        },
      ],
      tables: [
        table(
          "development",
          [
            col("student", "text"),
            col("registeredAt", "date"),
            col("baselineDone", "text"),
            col("baselineScore", "score"),
            col("unitsPassed", "text"),
            col("unitAverage", "score"),
            col("trainingProgress", "percent"),
            col("simulationsCompleted"),
            col("certificates"),
            col("finalist", "text"),
          ],
          rows.map((r) => ({
            ...r,
            baselineDone: yesNo(r.baselineDone),
            unitsPassed: `${r.unitsPassed}/${r.units}`,
            finalist: yesNo(r.finalist),
          }))
        ),
      ],
      notes: [t("notes.development")],
    };
  },

  yoy(ix, { t, years }) {
    const { col, kpi, table } = helpers(t);
    const all = [...new Set(ix.ds.programs.map((p) => p.academicYear))].sort((a, b) => a - b);
    const [a, b] = years ?? defaultYears(all);
    const metrics = (year: number) => cohortMetrics(ix, new Set(ix.ds.programs.filter((p) => p.academicYear === year).map((p) => p.id)));
    const ma = metrics(a);
    const mb = metrics(b);
    const la = academicYearLabel(a);
    const lb = academicYearLabel(b);

    const compare: [keyof CohortMetrics, ValueKind][] = [
      ["programs", "number"],
      ["students", "number"],
      ["trainingCompletion", "percent"],
      ["testCompletion", "percent"],
      ["averageScore", "score"],
      ["passRate", "percent"],
      ["ideas", "number"],
      ["teams", "number"],
      ["mvps", "number"],
      ["simulationsCompleted", "number"],
      ["certificates", "number"],
      ["finalists", "number"],
    ];
    const change = (x: number | null, y: number | null) => (x === null || y === null ? null : round1(y - x));

    return {
      kpis: [
        { ...kpi("students", mb.students), label: `${t("kpi.students")} · ${lb}` },
        kpi("studentGrowth", ma.students ? round1(((mb.students - ma.students) / ma.students) * 100) : null, "percent"),
        { ...kpi("trainingCompletion", mb.trainingCompletion, "percent"), label: `${t("kpi.trainingCompletion")} · ${lb}` },
        { ...kpi("averageScore", mb.averageScore, "score"), label: `${t("kpi.averageScore")} · ${lb}` },
      ],
      bars: [
        {
          id: "yoyRates",
          title: t("bars.yoyRates"),
          series: [la, lb],
          items: (["trainingCompletion", "testCompletion", "averageScore", "passRate"] as const).map((k) => ({ label: t(`kpi.${k}`), values: [ma[k], mb[k]] })),
        },
      ],
      tables: [
        {
          id: "compare",
          title: t("tables.compare", { a: la, b: lb }),
          columns: [{ key: "metric", label: t("col.metric"), kind: "text" }, { key: "a", label: la, kind: "number" }, { key: "b", label: lb, kind: "number" }, col("change")],
          rows: compare.map(([key, kind]) => ({
            metric: kind === "number" ? t(`kpi.${key}`) : `${t(`kpi.${key}`)} (%)`,
            a: ma[key],
            b: mb[key],
            change: change(ma[key], mb[key]),
          })),
        },
        table(
          "allYears",
          [col("year", "text"), col("programs"), col("students"), col("trainingCompletion", "percent"), col("averageScore", "score"), col("ideas"), col("mvps"), col("certificates")],
          all.map((year) => {
            const m = metrics(year);
            return { year: academicYearLabel(year), programs: m.programs, students: m.students, trainingCompletion: m.trainingCompletion, averageScore: m.averageScore, ideas: m.ideas, mvps: m.mvps, certificates: m.certificates };
          })
        ),
      ],
      notes: [t("notes.yoy")],
    };
  },
};

/** The latest two academic years with programmes; a single year compares with the one before it. */
export function defaultYears(years: number[]): [number, number] {
  const sorted = [...years].sort((a, b) => a - b);
  const b = sorted.at(-1) ?? new Date().getUTCFullYear();
  return [sorted.at(-2) ?? b - 1, b];
}

/** Academic years that have programmes, for the comparison pickers. */
export function availableYears(ds: ReportDataset): number[] {
  return [...new Set(ds.programs.map((p) => p.academicYear))].sort((a, b) => a - b);
}
