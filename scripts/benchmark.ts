/**
 * Micro-benchmarks for pagination and cache helpers.
 * Run: npm run benchmark
 */
import { performance } from "node:perf_hooks";
import { parsePagination, buildPaginatedResult } from "../src/lib/pagination";
import {
  getCached,
  setCached,
  invalidateCache,
} from "../src/lib/cache/cache-service";
import { resetRedisMemoryForTests } from "../src/lib/redis/client";

function bench(name: string, fn: () => void | Promise<void>, iterations = 10_000) {
  const start = performance.now();
  const run = fn();
  if (run instanceof Promise) {
    return run.then(() => {
      const elapsed = performance.now() - start;
      console.log(`${name}: ${(elapsed / iterations * 1000).toFixed(3)} µs/op (${iterations} ops, ${elapsed.toFixed(2)} ms total)`);
    });
  }
  const elapsed = performance.now() - start;
  console.log(`${name}: ${(elapsed / iterations * 1000).toFixed(3)} µs/op (${iterations} ops, ${elapsed.toFixed(2)} ms total)`);
}

async function main() {
  console.log("BizSim performance benchmarks\n");

  bench("parsePagination", () => {
    const params = new URLSearchParams("page=3&pageSize=50");
    parsePagination(params);
  });

  bench("buildPaginatedResult", () => {
    buildPaginatedResult([{ id: "1" }], 100, { page: 2, pageSize: 25, skip: 25 });
  });

  resetRedisMemoryForTests();

  const cacheIterations = 1_000;
  const cacheStart = performance.now();
  for (let i = 0; i < cacheIterations; i++) {
    await setCached(`bench:${i}`, { n: i }, 60);
    await getCached<{ n: number }>(`bench:${i}`);
  }
  const cacheElapsed = performance.now() - cacheStart;
  console.log(
    `cache set+get: ${(cacheElapsed / cacheIterations * 1000).toFixed(3)} µs/op (${cacheIterations} ops, ${cacheElapsed.toFixed(2)} ms total)`
  );

  await setCached("bench:invalidate", "x", 60);
  bench("invalidateCache", async () => {
    await invalidateCache("bench:invalidate");
    await setCached("bench:invalidate", "x", 60);
  }, 1_000);

  console.log("\nScale targets: 100 tenants · 50k participants · 5k concurrent users");
  console.log("Load tests: k6 run scripts/load/health.js");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
