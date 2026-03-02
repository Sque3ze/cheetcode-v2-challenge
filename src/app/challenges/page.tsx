"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface ChallengeMeta {
  id: string;
  title: string;
  tier: number;
  description: string;
  points: number;
}

interface ChallengeStatus {
  challengeId: string;
  solved: boolean;
  locked: boolean;
  attempts: number;
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

const TIER_LABELS: Record<number, string> = {
  1: "Browser Fundamentals",
  2: "Multi-Step Workflow",
  3: "Complex Synthesis",
  4: "Adversarial",
};

const TIER_COLORS: Record<number, string> = {
  1: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  2: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  3: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  4: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ChallengesPage() {
  const { data: authSession } = useSession();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [finishing, setFinishing] = useState(false);

  // Fetch session data
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

  // Countdown timer (cosmetic)
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

  const handleFinish = async () => {
    if (!sessionData || finishing) return;
    setFinishing(true);

    try {
      const res = await fetch("/api/session/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionData.sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/`;
      } else {
        setError(data.error || "Failed to finish session");
      }
    } catch {
      setError("Failed to finish session");
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading session...</p>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "No session data"}</p>
          <a href="/" className="text-blue-400 hover:underline">
            Go home
          </a>
        </div>
      </div>
    );
  }

  const totalSecs = Math.max(0, Math.ceil(timeRemaining / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const isExpired = timeRemaining <= 0;
  const isUrgent = totalSecs <= 30;

  // Group challenges by tier
  const tiers = [1, 2, 3, 4] as const;
  const statusMap = new Map(
    sessionData.challengeStatuses.map((s) => [s.challengeId, s])
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-gray-200 text-sm">
              &larr; Home
            </a>
            <h1 className="text-lg font-semibold">Challenges</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-gray-400">Score: </span>
              <span className="font-mono text-emerald-400">
                {sessionData.score.percentage.toFixed(1)}%
              </span>
              <span className="text-gray-600 ml-1">
                ({sessionData.score.earned}/{sessionData.score.total} pts)
              </span>
            </div>
            <div
              className={`font-mono text-sm ${isExpired ? "text-red-400" : isUrgent ? "text-red-400" : "text-gray-400"}`}
            >
              {isExpired ? "Time's up!" : `${mins}:${String(secs).padStart(2, "0")}`}
            </div>
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="px-4 py-1.5 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {finishing ? "Finishing..." : "Finish"}
            </button>
          </div>
        </div>
      </header>

      {/* Challenge list */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {tiers.map((tier) => {
          const tierChallenges = sessionData.challenges.filter(
            (c) => c.tier === tier
          );
          if (tierChallenges.length === 0) return null;

          return (
            <div key={tier} className="mb-8">
              <h2 className="text-sm font-medium text-gray-400 mb-3">
                Tier {tier} — {TIER_LABELS[tier]}
              </h2>
              <div className="space-y-2">
                {tierChallenges.map((challenge) => {
                  const status = statusMap.get(challenge.id);
                  const solved = status?.solved ?? false;
                  const locked = status?.locked ?? false;

                  return (
                    <a
                      key={challenge.id}
                      href={
                        isExpired
                          ? undefined
                          : `/challenges/${challenge.id}`
                      }
                      className={`block p-4 rounded-lg border transition-colors ${
                        solved
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : locked
                            ? "bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed"
                            : isExpired
                              ? "bg-gray-900/50 border-gray-800 opacity-50"
                              : "bg-gray-900 border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded border ${TIER_COLORS[tier]}`}
                          >
                            T{tier}
                          </span>
                          <span className="font-medium">{challenge.title}</span>
                          <span className="text-gray-500 text-sm">
                            {challenge.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-400">
                            {challenge.points} pt{challenge.points !== 1 ? "s" : ""}
                          </span>
                          {solved && (
                            <span className="text-emerald-400 text-sm">
                              Solved
                            </span>
                          )}
                          {locked && !solved && (
                            <span className="text-red-400 text-sm">
                              Locked
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
