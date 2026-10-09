import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    registration_burst: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 100 },
        { duration: "40s", target: 300 },
        { duration: "20s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.3"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const APPLY_TOKEN = __ENV.APPLY_TOKEN || "";

export default function registrationLoadTest() {
  if (!APPLY_TOKEN) return;

  const unique = `${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({
    token: APPLY_TOKEN,
    email: `loadtest+${unique}@example.com`,
    password: "LoadTest123!",
    firstName: "Load",
    lastName: `User${unique}`,
  });

  const res = http.post(`${BASE_URL}/api/registration`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "registration accepted or seat limit": (r) =>
      r.status === 201 || r.status === 409 || r.status === 429,
  });

  sleep(1);
}
