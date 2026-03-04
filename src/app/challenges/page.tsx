"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TIER_LABELS } from "../../lib/config";

interface ChallengeMeta {
  id: string;
  title: string;
  tier: number;
  description: string;
  points: number;
  dependsOn: string[];
}

interface ChallengeStatus {
  challengeId: string;
  solved: boolean;
  locked: boolean;
  attempts: number;
  unmetPrerequisites: string[];
}

interface SessionData {
  sessionId: string;
  status: string;
  startedAt: number;
  expiresAt: number;
  timeRemainingMs: number;
  challenges: ChallengeMeta[];
  challengeStatuses: ChallengeStatus[];
  score: {
    earned: number;
    total: number;
    percentage: number;
  };
}

const TIER_BADGE_CLASS: Record<number, string> = {
  1: "tier-badge-1",
  2: "tier-badge-2",
  3: "tier-badge-3",
  4: "tier-badge-4",
};

export default function ChallengesPage() {
  const { data: authSession } = useSession();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const autoFinishFired = useRef(false);
  const finishingRef = useRef(false);

  const DEV_USER = process.env.NEXT_PUBLIC_DEV_USER;
  useEffect(() => {
    if (!authSession?.user && !DEV_USER) return;

    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSessionData(data.session);
          setTimeRemaining(data.session.timeRemainingMs);
        } else {
          setError("No active session. Go back to start one.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load session");
        setLoading(false);
      });
  }, [authSession]);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const handleFinish = useCallback(async () => {
    if (!sessionData || finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);

    try {
      const res = await fetch("/api/session/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionData.sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/results/${sessionData.sessionId}`;
      } else {
        setError(data.error || "Failed to finish session");
      }
    } catch {
      setError("Failed to finish session");
    } finally {
      finishingRef.current = false;
      setFinishing(false);
    }
  }, [sessionData]);

  // Auto-finish when timer expires
  useEffect(() => {
    if (timeRemaining > 0 || !sessionData || autoFinishFired.current) return;
    autoFinishFired.current = true;
    handleFinish();
  }, [timeRemaining, sessionData, handleFinish]);

  if (loading) {
    return (
      <div
        className="min-h-screen"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            color: "rgba(38, 38, 38, 0.4)",
            fontSize: 14,
            lineHeight: "20px",
          }}
        >
          Loading session...
        </p>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div
        className="min-h-screen"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "#eb3424",
              marginBottom: 16,
              fontSize: 14,
              lineHeight: "20px",
            }}
          >
            {error || "No session data"}
          </p>
          <Link
            href="/"
            style={{
              color: "#fa5d19",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const totalSecs = Math.max(0, Math.ceil(timeRemaining / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const isExpired = timeRemaining <= 0;
  const isUrgent = totalSecs <= 30;

  const tiers = [1, 2, 3, 4] as const;
  const statusMap = new Map(
    sessionData.challengeStatuses.map((s) => [s.challengeId, s])
  );
  const challengeNameMap = new Map(
    sessionData.challenges.map((c) => [c.id, c.title])
  );

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header
        className="nav-header"
        style={{ position: "sticky", top: 0, zIndex: 10 }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/"
              style={{
                color: "rgba(38, 38, 38, 0.4)",
                fontSize: 13,
                lineHeight: "18px",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#262626")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(38, 38, 38, 0.4)")
              }
            >
              &larr; Home
            </Link>
            <span
              style={{ fontSize: 14, fontWeight: 450, lineHeight: "20px" }}
            >
              Challenges
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Score badge */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "var(--font-geist-mono), monospace",
                background: "rgba(250, 93, 25, 0.08)",
                color: "#fa5d19",
                lineHeight: "18px",
              }}
            >
              {sessionData.score.percentage.toFixed(1)}%
            </span>
            {/* Timer badge */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "var(--font-geist-mono), monospace",
                background:
                  isExpired || isUrgent
                    ? "rgba(235, 52, 36, 0.10)"
                    : "rgba(0, 0, 0, 0.04)",
                color:
                  isExpired || isUrgent
                    ? "#eb3424"
                    : "rgba(38, 38, 38, 0.5)",
                lineHeight: "18px",
              }}
            >
              {isExpired
                ? "Time's up!"
                : `${mins}:${String(secs).padStart(2, "0")}`}
            </span>
            {/* Finish */}
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="btn-ghost"
              style={{
                height: 32,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                lineHeight: "18px",
                opacity: finishing ? 0.5 : 1,
              }}
            >
              {finishing ? "Finishing..." : "Finish"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Challenge list ── */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        {tiers.map((tier) => {
          const tierChallenges = sessionData.challenges.filter(
            (c) => c.tier === tier
          );
          if (tierChallenges.length === 0) return null;

          return (
            <div key={tier} style={{ marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 450,
                  lineHeight: "20px",
                  color: "rgba(38, 38, 38, 0.4)",
                  marginBottom: 12,
                }}
              >
                Tier {tier} &mdash; {TIER_LABELS[tier]}
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {tierChallenges.map((challenge) => {
                  const cStatus = statusMap.get(challenge.id);
                  const solved = cStatus?.solved ?? false;
                  const locked = cStatus?.locked ?? false;
                  const unmetPrereqs = cStatus?.unmetPrerequisites ?? [];
                  const prerequisitesBlocked = unmetPrereqs.length > 0;
                  const isDisabled = locked || isExpired || prerequisitesBlocked;

                  return (
                    <a
                      key={challenge.id}
                      href={
                        isDisabled ? undefined : `/challenges/${challenge.id}`
                      }
                      className="card-surface"
                      style={{
                        display: "block",
                        padding: "16px 24px",
                        borderRadius: 12,
                        textDecoration: "none",
                        color: "inherit",
                        borderLeft: solved
                          ? "3px solid #42c366"
                          : undefined,
                        opacity: isDisabled ? 0.4 : 1,
                        cursor:
                          isDisabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            minWidth: 0,
                          }}
                        >
                          <span
                            className={TIER_BADGE_CLASS[tier]}
                            style={{
                              fontSize: 12,
                              fontWeight: 450,
                              padding: "2px 8px",
                              borderRadius: 4,
                              flexShrink: 0,
                              lineHeight: "16px",
                            }}
                          >
                            T{tier}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 450,
                              color: "#262626",
                              lineHeight: "20px",
                              flexShrink: 0,
                            }}
                          >
                            {challenge.title}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              lineHeight: "20px",
                              color: "rgba(38, 38, 38, 0.4)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {challenge.description}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexShrink: 0,
                            marginLeft: 16,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 450,
                              lineHeight: "16px",
                              color: "rgba(38, 38, 38, 0.3)",
                            }}
                          >
                            {challenge.points} pt
                            {challenge.points !== 1 ? "s" : ""}
                          </span>
                          {solved && (
                            <span className="pill-solved">Solved</span>
                          )}
                          {locked && !solved && !prerequisitesBlocked && (
                            <span className="pill-locked">Locked</span>
                          )}
                          {prerequisitesBlocked && !solved && (
                            <span
                              className="pill-locked"
                              title={`Requires: ${unmetPrereqs.map((id) => challengeNameMap.get(id) ?? id).join(", ")}`}
                            >
                              Requires: {unmetPrereqs.map((id) => challengeNameMap.get(id) ?? id).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
