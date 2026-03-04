/**
 * Shared Convex auth helper.
 * Used by all action gateways to verify the server-to-Convex secret.
 * Uses constant-time comparison to prevent timing side-channel attacks.
 */
export function assertSecret(secret: string) {
  const expected = process.env.CONVEX_MUTATION_SECRET;
  if (!expected || secret.length !== expected.length) {
    throw new Error("unauthorized");
  }
  let mismatch = 0;
  for (let i = 0; i < secret.length; i++) {
    mismatch |= secret.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) {
    throw new Error("unauthorized");
  }
}
