export type JuryErrorCode =
  | "PROGRAM_NOT_FOUND"
  | "JURY_DISABLED"
  | "CRITERIA_LOCKED"
  | "INVALID_CRITERIA"
  | "USER_HAS_OTHER_ROLE"
  | "ALREADY_JUROR"
  | "JUROR_NOT_FOUND"
  | "NOT_A_PARTICIPANT"
  | "FINALIST_SCORED"
  | "TOO_MANY_FINALISTS"
  | "FINALIST_NOT_FOUND"
  | "INVALID_SCORE"
  | "INCOMPLETE_EVALUATION";

/** A jury-module rule broken by the request; surfaces with its status and code. */
export class JuryError extends Error {
  constructor(
    public readonly code: JuryErrorCode,
    public readonly statusCode: number,
    message: string = code
  ) {
    super(message);
    this.name = "JuryError";
  }
}
