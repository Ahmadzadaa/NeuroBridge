import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 200 },
    { duration: "30s", target: 500 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function healthLoadTest() {
  const live = http.get(`${BASE_URL}/api/health`);
  check(live, {
    "health status 200": (r) => r.status === 200,
    "health body ok": (r) => r.json("status") === "ok",
  });

  const ready = http.get(`${BASE_URL}/api/health/ready`);
  check(ready, {
    "ready status ok": (r) => r.status === 200 || r.status === 503,
  });

  sleep(0.2);
}
