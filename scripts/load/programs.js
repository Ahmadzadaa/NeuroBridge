import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<1000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_COOKIE = __ENV.AUTH_COOKIE || "";

export default function programsLoadTest() {
  if (!AUTH_COOKIE) return;

  const res = http.get(`${BASE_URL}/api/programs?page=1&pageSize=25`, {
    headers: { Cookie: AUTH_COOKIE },
  });

  check(res, {
    "programs status 200": (r) => r.status === 200,
    "programs paginated": (r) => r.json("items") !== undefined,
  });

  sleep(0.5);
}

export function setup() {
  if (!AUTH_COOKIE) {
    console.warn("Set AUTH_COOKIE env var for authenticated programs load test");
  }
}
