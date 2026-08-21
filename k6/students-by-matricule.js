import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";

const mode = (__ENV.MODE || "respect-limit").toLowerCase();
const isStressMode = mode === "stress-limit";
const ratePerMinute = Number(__ENV.RATE_PER_MIN || (isStressMode ? 120 : 9));
const preAllocatedVUs = Number(
  __ENV.PRE_ALLOCATED_VUS || (isStressMode ? 10 : 1),
);
const maxVUs = Number(__ENV.MAX_VUS || (isStressMode ? 50 : 1));
const duration = __ENV.DURATION || "1m";

if (isStressMode) {
  http.setResponseCallback(http.expectedStatuses(200, 429));
}

const okRate = new Rate("status_200_rate");
const rateLimitRate = new Rate("status_429_rate");

export const options = {
  scenarios: {
    studentsByMatricule: {
      executor: "constant-arrival-rate",
      rate: ratePerMinute,
      timeUnit: "1m",
      duration,
      preAllocatedVUs,
      maxVUs,
    },
  },
  thresholds: {
    http_req_failed: [isStressMode ? "rate<0.01" : "rate<0.05"],
    http_req_duration: ["p(95)<1000"],
    status_200_rate: [isStressMode ? "rate>0.01" : "rate>0.90"],
    status_429_rate: [isStressMode ? "rate>0.70" : "rate<0.05"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
};

const baseUrl = __ENV.BASE_URL || "http://localhost:3000/api";
const matricule = __ENV.MATRICULE || "NWT-1483";

export default function () {
  const response = http.get(
    `${baseUrl}/students/by-matricule/${encodeURIComponent(matricule)}`,
  );

  okRate.add(response.status === 200);
  rateLimitRate.add(response.status === 429);

  check(response, {
    "statut HTTP attendu": (res) =>
      isStressMode ? [200, 429].includes(res.status) : res.status === 200,
  });
}

export function handleSummary(data) {
  const httpReqDuration = data.metrics.http_req_duration?.values ?? {};
  const checks = data.metrics.checks?.values ?? {};
  const httpReqFailed = data.metrics.http_req_failed?.values ?? {};
  const httpReqs = data.metrics.http_reqs?.values ?? {};
  const status200Rate = data.metrics.status_200_rate?.values?.rate;
  const status429Rate = data.metrics.status_429_rate?.values?.rate;
  const failedRate =
    typeof httpReqFailed.rate === "number"
      ? (httpReqFailed.rate * 100).toFixed(2)
      : "n/a";
  const status200 =
    typeof status200Rate === "number"
      ? (status200Rate * 100).toFixed(2)
      : "n/a";
  const status429 =
    typeof status429Rate === "number"
      ? (status429Rate * 100).toFixed(2)
      : "n/a";
  const checkPasses = typeof checks.passes === "number" ? checks.passes : 0;
  const checkFails = typeof checks.fails === "number" ? checks.fails : 0;
  const totalChecks = checkPasses + checkFails;

  const text = [
    "Résumé k6",
    `- mode: ${mode}`,
    `- cadence cible: ${ratePerMinute} req/min`,
    `- requêtes totales: ${httpReqs.count ?? 0}`,
    `- checks réussis: ${checkPasses}/${totalChecks}`,
    `- taux d'erreur HTTP: ${failedRate}%`,
    `- taux HTTP 200: ${status200}%`,
    `- taux HTTP 429: ${status429}%`,
    `- durée HTTP moyenne: ${httpReqDuration.avg?.toFixed?.(2) ?? "n/a"} ms`,
    `- durée HTTP médiane: ${httpReqDuration.med?.toFixed?.(2) ?? "n/a"} ms`,
    `- p95 HTTP: ${httpReqDuration["p(95)"]?.toFixed?.(2) ?? "n/a"} ms`,
    `- min/max HTTP: ${httpReqDuration.min?.toFixed?.(2) ?? "n/a"} / ${httpReqDuration.max?.toFixed?.(2) ?? "n/a"} ms`,
  ].join("\n");

  return {
    stdout: `${text}\n`,
  };
}
