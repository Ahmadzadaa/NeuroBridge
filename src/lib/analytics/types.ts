/**
 * Response shape for GET /api/tenants/[id]/analytics/overview.
 *
 * Two field groups deliberately ignore the `from`/`to` window, because they
 * answer a different question than the rest of the dashboard:
 *   - `totalStudents` is a snapshot ("how many students does this tenant have")
 *   - `activeStudents7d` / `activeStudents30d` are rolling windows ("who is
 *     active right now")
 * Everything else is bounded by the range.
 */

export interface AnalyticsRange {
  from: string;
  to: string;
  /** True when no from/to was supplied and the default window was applied. */
  defaulted: boolean;
}

export interface AnalyticsFilters {
  /** Training.id */
  courseId: string | null;
  /** Program.id — also what the CSV export button needs. */
  programId: string | null;
}

export interface AnalyticsKpis {
  totalStudents: number;
  activeStudents7d: number;
  activeStudents30d: number;
  enrolments: number;
  /** 0–100, one decimal. */
  averageCompletionPercent: number;
  certificatesIssued: number;
}

export interface CourseBreakdownRow {
  courseId: string;
  /** Training.key — the value ProgramTraining.trainingType matches on. */
  courseKey: string;
  title: string;
  enrolled: number;
  completed: number;
  completionPercent: number;
  /** null when nobody has taken the exam yet. */
  averageScore: number | null;
  /**
   * Days between a student's first and last lesson completion in this course.
   *
   * The data model records only `completedAt` on LessonProgress and
   * ExamAttempt — there is no start timestamp anywhere — so a true "time
   * spent" cannot be derived. This is the honest substitute: elapsed span,
   * not effort. `estimatedMinutes` carries the planned figure alongside it.
   */
  averageActiveDays: number | null;
  estimatedMinutes: number;
}

export interface WeeklyPoint {
  /** ISO date of the Monday that starts the week. */
  weekStart: string;
  activeStudents: number;
  lessonsCompleted: number;
  coursesCompleted: number;
}

export interface AnalyticsMeta {
  generatedAt: string;
  cached: boolean;
  /** Metrics the current data model cannot produce, named so the UI can say so. */
  unavailable: string[];
}

export interface AnalyticsOverview {
  range: AnalyticsRange;
  filters: AnalyticsFilters;
  kpis: AnalyticsKpis;
  courses: CourseBreakdownRow[];
  timeSeries: WeeklyPoint[];
  meta: AnalyticsMeta;
}

export interface AnalyticsQuery {
  tenantId: string;
  from?: Date;
  to?: Date;
  courseId?: string | null;
  programId?: string | null;
}
