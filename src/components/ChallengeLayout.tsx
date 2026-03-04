"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { TIER_LABELS } from "../lib/config";
import { testAttr } from "../lib/test-attrs";

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
  const attemptsRemaining = maxAttempts - currentAttempts;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <header className="nav-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
        <div className="flex items-center justify-between" style={{ maxWidth: 896, margin: "0 auto", padding: "16px 24px" }}>
          <div className="flex items-center" style={{ gap: 16 }}>
            <Link
              href="/challenges"
              className="text-sm"
              style={{ color: "rgba(38,38,38,0.5)", textDecoration: "none" }}
            >
              &larr; Back
            </Link>
            <h1 className="text-lg font-semibold">{title}</h1>
            <span
              className={`tier-badge-${tier}`}
              style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999 }}
            >
              {tierLabel}
            </span>
            <span className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>{points} pt{points !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center" style={{ gap: 16 }}>
            {isSolved && (
              <span className="pill-solved">Solved</span>
            )}
            {isLocked && !isSolved && (
              <span className="pill-locked">Locked</span>
            )}
            {!isSolved && !isLocked && (
              <span className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>
                {attemptsRemaining}/{maxAttempts} attempts
              </span>
            )}
            <TimeDisplay timeRemainingMs={timeRemainingMs} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 896, margin: "0 auto", padding: "32px 24px" }}>
        {/* Instructions */}
        <div className="card-surface" style={{ marginBottom: 32, padding: 16, borderRadius: 12 }}>
          <h2 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
            Instructions
          </h2>
          <p {...testAttr("instructions")} style={{ color: "#262626" }}>{instructions}</p>
        </div>

        {/* Challenge interactive area */}
        <div style={{ marginBottom: 32 }}>{children}</div>

        {/* Submission area */}
        <div style={{ borderTop: "1px solid #e8e8e8", paddingTop: 24 }}>
          {feedback && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${feedback.correct ? "rgba(26,147,56,0.2)" : "rgba(220,38,38,0.2)"}`,
                background: feedback.correct ? "rgba(26,147,56,0.08)" : "rgba(220,38,38,0.08)",
                color: feedback.correct ? "#1a9338" : "#dc2626",
              }}
            >
              {feedback.message}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || isSolved || isLocked}
            className={!(isSolved || isLocked || submitting) ? "btn-heat" : undefined}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 450,
              ...(isSolved
                ? { background: "rgba(26,147,56,0.08)", color: "#1a9338", border: "none", cursor: "not-allowed" }
                : isLocked
                  ? { background: "rgba(0,0,0,0.04)", color: "rgba(38,38,38,0.35)", border: "none", cursor: "not-allowed" }
                  : submitting
                    ? { background: "rgba(0,0,0,0.04)", color: "rgba(38,38,38,0.5)", border: "none", cursor: "wait" }
                    : {}),
            }}
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
      className="font-mono text-sm"
      style={{ color: isUrgent ? "#dc2626" : "rgba(38,38,38,0.5)" }}
    >
      {mins}:{String(secs).padStart(2, "0")}
    </span>
  );
}
