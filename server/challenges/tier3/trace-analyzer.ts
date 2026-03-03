/**
 * Tier 3 Challenge: Distributed Trace Analyzer
 *
 * A log viewer for a microservices system. Agent must trace a specific
 * request (by trace ID) through 5 services to find where it failed.
 * Each service has log entries for many trace IDs — agent must filter
 * to the target trace and identify the failing service + error code.
 *
 * Tests: log/trace correlation, filtering noise, systematic exploration.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface TraceAnalyzerPageData {
  traceId: string;
  services: string[];
  requestSummary: {
    startTime: string;
    method: string;
    path: string;
    status: string;
  };
  variantIndex: number;
}

interface LogEntry {
  traceId: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  errorCode?: string;
}

const SERVICE_POOL = [
  "API Gateway", "Auth Service", "User Service", "Order Service",
  "Payment Service", "Inventory Service", "Notification Service", "Shipping Service",
] as const;

const ERROR_CODES = [
  "ERR_INSUFFICIENT_FUNDS", "ERR_TIMEOUT", "ERR_AUTH_EXPIRED",
  "ERR_RATE_LIMITED", "ERR_INVALID_PAYLOAD", "ERR_SERVICE_UNAVAILABLE",
  "ERR_DUPLICATE_REQUEST", "ERR_QUOTA_EXCEEDED",
] as const;

const REQUEST_PATHS = [
  "/api/v1/orders/create", "/api/v1/payments/process", "/api/v1/users/update",
  "/api/v1/inventory/reserve", "/api/v1/shipments/initiate", "/api/v1/auth/refresh",
] as const;

const INFO_MESSAGES = [
  "Request received", "Processing request", "Forwarding to next service",
  "Validation passed", "Cache hit", "Session validated",
  "Rate limit check passed", "Request queued", "Metrics recorded",
  "Payload deserialized", "Connection established", "Response sent",
] as const;

const WARN_MESSAGES = [
  "High latency detected", "Cache miss - falling back to DB",
  "Retry attempt 1 of 3", "Connection pool near capacity",
  "Response time above threshold", "Deprecated endpoint called",
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  ERR_INSUFFICIENT_FUNDS: "Payment declined: insufficient funds in account",
  ERR_TIMEOUT: "Upstream service did not respond within timeout window",
  ERR_AUTH_EXPIRED: "Authentication token has expired, re-authentication required",
  ERR_RATE_LIMITED: "Rate limit exceeded for this API key",
  ERR_INVALID_PAYLOAD: "Request payload failed schema validation",
  ERR_SERVICE_UNAVAILABLE: "Downstream service returned 503",
  ERR_DUPLICATE_REQUEST: "Idempotency key already processed",
  ERR_QUOTA_EXCEEDED: "Monthly API quota exceeded for this tenant",
};

function hexChar(data: ChallengeData): string {
  return "0123456789abcdef"[data.int(0, 15)];
}

function makeTraceId(data: ChallengeData): string {
  let id = "trace-";
  for (let i = 0; i < 8; i++) id += hexChar(data);
  return id;
}

function makeTimestamp(data: ChallengeData, baseMinute: number): string {
  const minute = baseMinute + data.int(0, 2);
  const second = data.int(0, 59);
  const ms = data.int(0, 999);
  return `2025-03-15T14:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}.${String(ms).padStart(3, "0")}Z`;
}

export const traceAnalyzerChallenge: ChallengeDefinition<TraceAnalyzerPageData> = {
  id: "tier3-trace-analyzer",
  title: "Distributed Trace Analyzer",
  tier: 3,
  dependsOn: ["tier2-resilient-collector"],
  description: "Trace a failed request through microservices to find the failing service and error code.",

  instructions: (pageData) => {
    const interactHint = `To load a service's logs, use the interact API with action "logs" and parameter service set to the service name (e.g. { "service": "${pageData.services[0]}" }).`;
    const variants = [
      `A request with trace ID "${pageData.traceId}" has failed. Load logs from each of the ${pageData.services.length} services to find which service encountered the error and what error code was returned. Submit your answer as "ServiceName:ERROR_CODE". ${interactHint}`,
      `Trace the failed request "${pageData.traceId}" through the microservice architecture. Query each service's logs, filter for the target trace ID, and identify the service that produced the error. Answer format: "ServiceName:ERROR_CODE". ${interactHint}`,
      `The request "${pageData.traceId}" failed somewhere in the pipeline. Investigate by loading logs from each service. Most services processed this request successfully — find the one that didn't. Submit as "ServiceName:ERROR_CODE". ${interactHint}`,
      `Debug this failed request. Load log data from all ${pageData.services.length} services, search for trace ID "${pageData.traceId}", and find the error. Your answer should be the service name and error code, separated by a colon. ${interactHint}`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);

    // Pick 5 services
    const selectedServices = data.pickN(SERVICE_POOL, 5);
    const services = [...selectedServices];

    // Generate target trace ID
    const targetTraceId = makeTraceId(data);

    // Generate 10-12 noise trace IDs
    const noiseTraceCount = data.int(10, 12);
    const noiseTraces: string[] = [];
    for (let i = 0; i < noiseTraceCount; i++) {
      noiseTraces.push(makeTraceId(data));
    }

    // Pick the failing service (not the first one — make it more interesting)
    const failingIdx = data.int(1, services.length - 1);
    const failingService = services[failingIdx];
    const errorCode = data.pick(ERROR_CODES);

    // The target trace appears in services 0..failingIdx (request path)
    const requestPath = services.slice(0, failingIdx + 1);
    const requestPathSet = new Set(requestPath);

    // Pick request metadata
    const requestPath_ = data.pick(REQUEST_PATHS);
    const method = data.pick(["POST", "PUT", "GET", "PATCH"] as const);

    // Generate logs per service
    const logs: Record<string, LogEntry[]> = {};
    const baseMinute = data.int(10, 40);

    for (let sIdx = 0; sIdx < services.length; sIdx++) {
      const service = services[sIdx];
      const entries: LogEntry[] = [];
      const entryCount = data.int(15, 25);

      // Generate noise entries
      for (let e = 0; e < entryCount; e++) {
        const noiseTrace = data.pick(noiseTraces);
        const level = data.int(0, 9) < 8 ? "INFO" as const : "WARN" as const;
        const message = level === "INFO"
          ? data.pick(INFO_MESSAGES)
          : data.pick(WARN_MESSAGES);

        entries.push({
          traceId: noiseTrace,
          timestamp: makeTimestamp(data, baseMinute + sIdx),
          level,
          message,
        });
      }

      // Add target trace entries
      if (requestPathSet.has(service)) {
        if (service === failingService) {
          // This service has the error for the target trace
          // Add an INFO entry first (request received)
          entries.push({
            traceId: targetTraceId,
            timestamp: makeTimestamp(data, baseMinute + sIdx),
            level: "INFO",
            message: "Request received from upstream service",
          });
          // Then the ERROR entry
          entries.push({
            traceId: targetTraceId,
            timestamp: makeTimestamp(data, baseMinute + sIdx),
            level: "ERROR",
            message: ERROR_MESSAGES[errorCode],
            errorCode,
          });
        } else {
          // This service processed the target trace successfully
          entries.push({
            traceId: targetTraceId,
            timestamp: makeTimestamp(data, baseMinute + sIdx),
            level: "INFO",
            message: data.pick(["Request received", "Processing request", "Forwarding to next service"] as const),
          });
          entries.push({
            traceId: targetTraceId,
            timestamp: makeTimestamp(data, baseMinute + sIdx),
            level: "INFO",
            message: data.pick(["Request processed successfully", "Response sent", "Forwarded downstream"] as const),
          });
        }
      }

      // Shuffle entries so target trace entries aren't always at the end
      data.shuffle(entries);

      logs[service] = entries;
    }

    const answer = `${failingService}:${errorCode}`;

    return {
      pageData: {
        traceId: targetTraceId,
        services,
        requestSummary: {
          startTime: `2025-03-15T14:${String(baseMinute).padStart(2, "0")}:00.000Z`,
          method,
          path: requestPath_,
          status: "FAILED",
        },
        variantIndex,
      },
      hiddenData: {
        logs,
        failingService,
        errorCode,
      },
      answer,
    };
  },

  interactActions: ["logs"],

  handleInteract(hiddenData, action, params) {
    if (action === "logs") {
      const service = params.service as string | undefined;
      if (!service) {
        return { error: "Missing required parameter: service. Use { \"service\": \"<service name>\" }." };
      }
      const logs = hiddenData.logs as Record<string, LogEntry[]>;
      const entries = logs[service];
      if (!entries) {
        return { error: `Unknown service "${service}". Valid services: ${Object.keys(logs).join(", ")}` };
      }
      return { service, entries };
    }
    return null;
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const sParts = submitted.trim().split(":");
    const cParts = correct.split(":");
    if (sParts.length < 2 || cParts.length < 2) return false;

    // Service name might have spaces, error code is after last colon
    const sCode = sParts[sParts.length - 1].trim().toUpperCase();
    const sService = sParts.slice(0, -1).join(":").trim().toLowerCase();

    const cCode = cParts[cParts.length - 1].trim().toUpperCase();
    const cService = cParts.slice(0, -1).join(":").trim().toLowerCase();

    return sService === cService && sCode === cCode;
  },
};
