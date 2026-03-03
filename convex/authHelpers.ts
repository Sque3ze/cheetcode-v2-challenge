/**
 * Shared Convex auth helper.
 * Used by all action gateways to verify the server-to-Convex secret.
 */
export function assertSecret(secret: string) {
  if (secret !== process.env.CONVEX_MUTATION_SECRET) {
    throw new Error("unauthorized");
  }
}
