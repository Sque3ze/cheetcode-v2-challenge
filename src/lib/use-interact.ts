"use client";

import { useCallback, useRef } from "react";

/**
 * Hook for calling the /interact endpoint to fetch gated challenge data.
 * Returns an `interact(action, params?)` function that handles caching.
 */
export function useInteract(
  challengeId: string,
  sessionId: string,
  renderToken: string
) {
  const cache = useRef<Map<string, unknown>>(new Map());

  const interact = useCallback(
    async (action: string, params?: Record<string, unknown>): Promise<unknown> => {
      const cacheKey = `${action}:${JSON.stringify(params ?? {})}`;
      if (cache.current.has(cacheKey)) {
        return cache.current.get(cacheKey);
      }

      const res = await fetch(`/api/challenges/${challengeId}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action, params, renderToken }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Interaction failed" }));
        throw new Error(err.error || "Interaction failed");
      }

      const { data } = await res.json();
      cache.current.set(cacheKey, data);
      return data;
    },
    [challengeId, sessionId, renderToken]
  );

  return interact;
}
