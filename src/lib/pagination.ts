export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function parsePagination(
  searchParams: URLSearchParams,
  defaults?: { pageSize?: number }
): PaginationParams {
  const pageRaw = Number(searchParams.get("page") ?? DEFAULT_PAGE);
  const pageSizeRaw = Number(
    searchParams.get("pageSize") ?? searchParams.get("limit") ?? defaults?.pageSize ?? DEFAULT_PAGE_SIZE
  );

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : DEFAULT_PAGE;
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.min(Math.max(Math.floor(pageSizeRaw), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: PaginationParams
): PaginatedResult<T> {
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}
