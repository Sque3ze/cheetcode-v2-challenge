"use client";

import { useState, useCallback } from "react";

interface ChallengeLayoutProps {
  /** Challenge metadata */
  id: string;
  title: string;
  tier: number;
  points: number;
  instructions: string;

  /** Current status */
  solved: boolean;
  locked: boolean;
  attempts: number;
  maxAttempts: number;

  /** Session info */
  sessionId: string;
  timeRemainingMs: number;

  /** The interactive challenge content */
  children: React.ReactNode;

  /** Callback to get the current answer from the challenge */
  getAnswer: () => string;

  /** Called after successful submission */
  onSolved?: () => void;
}

const TIER_LABELS: Record<number, string> = {
  1: "Browser Fundamentals",
  2: "Multi-Step Workflow",
  3: "Complex Synthesis",
  4: "Advanced Analysis",
};

const TIER_COLORS: Record<number, string> = {
  1: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  2: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  3: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  4: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ChallengeLayout({
  id,
  title,
  tier,
  points,
  instructions,
  solved,
  locked,
  attempts,
  maxAttempts,
  sessionId,
  timeRemainingMs,
  children,
  getAnswer,
  onSolved,
}: ChallengeLayoutProps) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [currentAttempts, setCurrentAttempts] = useState(attempts);
  const [isSolved, setIsSolved] = useState(solved);
  const [isLocked, setIsLocked] = useState(locked);

  const handleSubmit = useCallback(async () => {
    if (submitting || isSolved || isLocked) return;

    const answer = getAnswer();
    if (!answer.trim()) {
      setFeedback({ correct: false, message: "Please enter an answer." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/validate/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer: answer.trim() }),
      });

      const data = await res.json();

      if (data.error) {
        setFeedback({ correct: false, message: data.error });
        return;
      }

      if (data.correct) {
        setIsSolved(true);
        setFeedback({
          correct: true,
          message: `Correct! +${data.points} point${data.points === 1 ? "" : "s"}`,
        });
        onSolved?.();
      } else {
        setCurrentAttempts((prev) => prev + 1);
        if (data.locked) {
          setIsLocked(true);
        }
        setFeedback({ correct: false, message: data.message });
      }
    } catch {
      setFeedback({ correct: false, message: "Submission failed. Try again." });
    } finally {
      setSubmitting(false);
    }
  }, [id, sessionId, getAnswer, submitting, isSolved, isLocked, onSolved]);

  const tierLabel = TIER_LABELS[tier] ?? `Tier ${tier}`;
  const tierColor = TIER_COLORS[tier] ?? TIER_COLORS[1];
  const attemptsRemaining = maxAttempts - currentAttempts;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/challenges"
              className="text-gray-400 hover:text-gray-200 text-sm"
            >
              &larr; Back
            </a>
            <h1 className="text-lg font-semibold">{title}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded border ${tierColor}`}
            >
              {tierLabel}
            </span>
            <span className="text-sm text-gray-400">{points} pt{points !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-4">
            {isSolved && (
              <span className="text-emerald-400 text-sm font-medium">
                Solved
              </span>
            )}
            {isLocked && !isSolved && (
              <span className="text-red-400 text-sm font-medium">Locked</span>
            )}
            {!isSolved && !isLocked && (
              <span className="text-gray-400 text-sm">
                {attemptsRemaining}/{maxAttempts} attempts
              </span>
            )}
            <TimeDisplay timeRemainingMs={timeRemainingMs} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Instructions */}
        <div className="mb-8 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-sm font-medium text-gray-400 mb-2">
            Instructions
          </h2>
          <p className="text-gray-200">{instructions}</p>
        </div>

        {/* Challenge interactive area */}
        <div className="mb-8">{children}</div>

        {/* Submission area */}
        <div className="border-t border-gray-800 pt-6">
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg border ${
                feedback.correct
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || isSolved || isLocked}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              isSolved
                ? "bg-emerald-500/20 text-emerald-400 cursor-not-allowed"
                : isLocked
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : submitting
                    ? "bg-gray-700 text-gray-400 cursor-wait"
                    : "btn-heat"
            }`}
          >
            {submitting
              ? "Submitting..."
              : isSolved
                ? "Solved"
                : isLocked
                  ? "Locked"
                  : "Submit Answer"}
          </button>
        </div>
      </main>
    </div>
  );
}

/** Countdown timer display */
function TimeDisplay({ timeRemainingMs }: { timeRemainingMs: number }) {
  // This is cosmetic — server is the time authority
  const totalSecs = Math.max(0, Math.ceil(timeRemainingMs / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const isUrgent = totalSecs <= 30;

  return (
    <span
      className={`font-mono text-sm ${isUrgent ? "text-red-400" : "text-gray-400"}`}
    >
      {mins}:{String(secs).padStart(2, "0")}
    </span>
  );
}
