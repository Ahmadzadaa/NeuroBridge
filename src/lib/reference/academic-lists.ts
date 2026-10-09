import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/auth/permissions";

/**
 * University / department lists for registration: the platform-wide rows
 * (tenantId null) plus the tenant's own additions.
 */

export type UniversityOption = { id: string; name: string; city: string | null };
export type DepartmentOption = { id: string; name: string; field: string | null };

const visibleTo = (tenantId: string) => ({ active: true, OR: [{ tenantId: null }, { tenantId }] });
/** Database collation does not know Turkish/Azerbaijani letter order. */
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "tr");

export async function listUniversities(tenantId: string): Promise<UniversityOption[]> {
  const rows = await prisma.university.findMany({
    where: visibleTo(tenantId),
    select: { id: true, name: true, city: true },
  });
  return rows.sort(byName);
}

export async function listDepartments(tenantId: string): Promise<DepartmentOption[]> {
  const rows = await prisma.department.findMany({
    where: visibleTo(tenantId),
    select: { id: true, name: true, field: true },
  });
  return rows.sort(byName);
}

/**
 * Checks that picked ids are visible to the tenant and returns their names,
 * so the legacy free-text fields stay filled for screens that read them.
 */
export async function resolveAcademicSelection(
  db: Prisma.TransactionClient,
  tenantId: string,
  ids: { universityId?: string | null; departmentId?: string | null }
): Promise<{ universityName: string | null; departmentName: string | null }> {
  const [university, department] = await Promise.all([
    ids.universityId
      ? db.university.findFirst({ where: { id: ids.universityId, ...visibleTo(tenantId) }, select: { name: true } })
      : null,
    ids.departmentId
      ? db.department.findFirst({ where: { id: ids.departmentId, ...visibleTo(tenantId) }, select: { name: true } })
      : null,
  ]);
  if (ids.universityId && !university) throw new ValidationError("Unknown university");
  if (ids.departmentId && !department) throw new ValidationError("Unknown department");
  return { universityName: university?.name ?? null, departmentName: department?.name ?? null };
}
