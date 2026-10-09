import { describe, expect, it } from "vitest";
import { parsePagination, buildPaginatedResult } from "@/lib/pagination";

describe("pagination", () => {
  it("parses page and pageSize from query params", () => {
    const params = new URLSearchParams("page=2&pageSize=50");
    const result = parsePagination(params);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
    expect(result.skip).toBe(50);
  });

  it("caps pageSize at 100", () => {
    const params = new URLSearchParams("pageSize=500");
    const result = parsePagination(params);
    expect(result.pageSize).toBe(100);
  });

  it("defaults invalid page to 1", () => {
    const params = new URLSearchParams("page=-1");
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  it("builds paginated result metadata", () => {
    const pagination = parsePagination(new URLSearchParams("page=1&pageSize=25"));
    const result = buildPaginatedResult(["a", "b"], 52, pagination);
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(52);
    expect(result.items).toHaveLength(2);
  });
});
