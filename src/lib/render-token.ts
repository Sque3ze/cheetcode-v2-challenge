import { createHmac } from "crypto";

/**
 * Generate an HMAC-SHA256 render token binding a session+challenge+timestamp.
 * Used to prove the client loaded the challenge page before interacting.
 */
export function generateRenderToken(
  sessionId: string,
  challengeId: string,
  timestamp: number,
  secret: string
): string {
  const payload = `${sessionId}:${challengeId}:${timestamp}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}
