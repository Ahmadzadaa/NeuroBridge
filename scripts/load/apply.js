import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 100,
  duration: "2m",
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const APPLY_TOKEN = __ENV.APPLY_TOKEN || "";

export default function applyLoadTest() {
  if (!APPLY_TOKEN) {
    return;
  }

  const res = http.get(`${BASE_URL}/api/apply/${APPLY_TOKEN}`);
  check(res, {
    "apply status 200": (r) => r.status === 200,
    "apply cached response": (r) => r.json("id") !== undefined,
  });

  sleep(0.5);
}

export function setup() {
  if (!APPLY_TOKEN) {
    console.warn("Set APPLY_TOKEN env var to run apply load test");
  }
}
