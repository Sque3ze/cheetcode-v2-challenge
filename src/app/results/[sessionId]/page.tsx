import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchResultsData } from "../../../lib/results-data";
import { gradeColor } from "../../../lib/letter-grades";
import { TIER_LABELS } from "../../../lib/config";
import { ACCENT, DIM, BORDER, formatMs } from "../../../components/spectator/formatters";
import CopyLinkButton from "./CopyLinkButton";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Metadata ─────────────────────────────────────────────────

type PageProps = { params: Promise<{ sessionId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sessionId } = await params;

  try {
    const data = await fetchResultsData(sessionId);
    if (!data) {
      return { title: "Session Not Found — CheetCode" };
    }

    const title = `CheetCode v2 — ${data.session.score.toFixed(1)}% Score (${data.grades.overall} Overall)`;
    const description = `@${data.session.github} scored ${data.session.score.toFixed(1)}% — ${data.timeline.challengesSolved}/${data.challenges.length} challenges solved${data.rank > 0 ? `, Rank #${data.rank}` : ""}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cheetcode.dev";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "CheetCode",
        images: [`${baseUrl}/api/og/results/${sessionId}`],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`${baseUrl}/api/og/results/${sessionId}`],
      },
    };
  } catch {
    return { title: "Session Not Found — CheetCode" };
  }
}

// ─── Page ─────────────────────────────────────────────────────

export default async function ResultsPage({ params }: PageProps) {
  const { sessionId } = await params;

  let data;
  try {
    data = await fetchResultsData(sessionId);
  } catch {
    notFound();
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
            Session in progress
          </p>
          <p style={{ fontSize: 14, color: DIM }}>
            Results will appear once the session is completed.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: 16,
              color: ACCENT,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    );
  }

  const { session, rank, totalPlayers, challenges, timeline, grades } = data;
  const tiers = [1, 2, 3, 4] as const;

  const gradeRows: [string, string, number | undefined][] = [
    ["Parallelization", grades.parallelization, session.orchestrationMetrics?.parallelizationScore],
    ["Solve Order", grades.dagEfficiency, session.orchestrationMetrics?.dagEfficiency],
    ["Critical Path", grades.criticalPathSpeed, session.orchestrationMetrics?.criticalPathSpeed],
    ["Failure Recovery", grades.failureRecovery, session.orchestrationMetrics?.failureRecoveryScore],
  ];

  const tiersReachedValue = session.orchestrationMetrics
    ? `${session.orchestrationMetrics.tiersReached}/4`
    : "N/A";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f4", padding: "48px 24px 64px" }}>
      {/* ── Paper ── */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            padding: "40px 40px 32px",
            display: "flex",
            alignItems: "center",
            gap: 24,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://github.com/${session.github}.png`}
            alt={session.github}
            width={64}
            height={64}
            style={{ borderRadius: 999, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>@{session.github}</span>
              <span style={{ fontSize: 13, color: DIM }}>{formatDate(session.startedAt)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 8 }}>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono), monospace",
                  lineHeight: 1,
                  color: "#262626",
                }}
              >
                {session.score.toFixed(1)}%
              </span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: gradeColor(grades.overall),
                }}
              >
                {grades.overall}
              </span>
            </div>
          </div>
          <div
            style={{
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {rank > 0 ? (
              <>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: ACCENT,
                    lineHeight: 1,
                  }}
                >
                  #{rank}
                </div>
                <div style={{ fontSize: 13, color: DIM, marginTop: 4 }}>
                  of {totalPlayers}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 24, color: DIM }}>&mdash;</div>
            )}
          </div>
        </header>

        <main style={{ padding: "32px 40px 40px" }}>
          {/* ── Report Card ── */}
          <section style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 450,
              color: DIM,
              marginBottom: 12,
            }}
          >
            Orchestration Grades
          </h2>
          <div
            style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}` }}
          >
            {gradeRows.map(([label, grade, raw], i) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: i < gradeRows.length ? `1px solid ${BORDER}` : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 450 }}>{label}</span>
                  {raw != null && (
                    <span
                      style={{
                        fontSize: 12,
                        color: DIM,
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {(raw * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: grade !== "N/A" ? gradeColor(grade) : DIM,
                    minWidth: 48,
                    textAlign: "right",
                  }}
                >
                  {grade}
                </span>
              </div>
            ))}
            {/* Tiers Reached row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 450 }}>Tiers Reached</span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: session.orchestrationMetrics
                    ? session.orchestrationMetrics.tiersReached >= 3
                      ? "#16a34a"
                      : session.orchestrationMetrics.tiersReached >= 2
                        ? "#2a6dfb"
                        : "#ca8a04"
                    : DIM,
                  minWidth: 48,
                  textAlign: "right",
                }}
              >
                {tiersReachedValue}
              </span>
            </div>
          </div>
        </section>

        {/* ── Timeline Summary ── */}
        <section style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 450,
              color: DIM,
              marginBottom: 12,
            }}
          >
            Timeline Summary
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {[
              ["Duration", formatMs(timeline.totalDurationMs)],
              ["Challenges", `${timeline.challengesSolved}/${timeline.challengesViewed} solved`],
              ["Idle Time", formatMs(timeline.idleTimeMs)],
              ["API Calls", String(session.apiCalls)],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: "16px",
                  borderRadius: 10,
                  textAlign: "center",
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ fontSize: 12, color: DIM, marginBottom: 4 }}>{label}</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Challenge Breakdown ── */}
        <section style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 450,
              color: DIM,
              marginBottom: 12,
            }}
          >
            Challenge Breakdown
          </h2>
          <div
            style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}` }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 450, color: DIM }}>
                    Challenge
                  </th>
                  <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 450, color: DIM }}>
                    Status
                  </th>
                  <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 450, color: DIM }}>
                    Attempts
                  </th>
                  <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 450, color: DIM }}>
                    Solve Time
                  </th>
                  <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 450, color: DIM }}>
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => {
                  const tierChallenges = challenges.filter((c) => c.tier === tier);
                  if (tierChallenges.length === 0) return null;
                  return [
                    <tr key={`tier-${tier}`}>
                      <td
                        colSpan={5}
                        style={{
                          padding: "8px 16px 4px",
                          fontSize: 12,
                          fontWeight: 500,
                          color: DIM,
                          background: "rgba(0,0,0,0.02)",
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        Tier {tier} &mdash; {TIER_LABELS[tier]}
                      </td>
                    </tr>,
                    ...tierChallenges.map((c) => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: "10px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 11,
                              fontWeight: 500,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: "rgba(0,0,0,0.04)",
                              color: DIM,
                              marginRight: 8,
                            }}
                          >
                            T{c.tier}
                          </span>
                          {c.title}
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 8px" }}>
                          <StatusPill status={c.status} />
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            padding: "10px 8px",
                            fontFamily: "var(--font-geist-mono), monospace",
                            color: DIM,
                          }}
                        >
                          {c.attempts > 0 ? `${c.attempts}/3` : "\u2014"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "10px 8px",
                            fontFamily: "var(--font-geist-mono), monospace",
                            color: DIM,
                          }}
                        >
                          {c.solveTimeMs != null ? formatMs(c.solveTimeMs) : "\u2014"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "10px 16px",
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontWeight: c.pointsEarned > 0 ? 600 : 400,
                            color: c.pointsEarned > 0 ? "#16a34a" : DIM,
                          }}
                        >
                          {c.pointsEarned}/{c.points}
                        </td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </section>

        </main>
      </div>

      {/* ── Footer (outside paper) ── */}
      <footer
        style={{
          maxWidth: 720,
          margin: "24px auto 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px",
        }}
      >
        <Link
          href="/"
          style={{
            color: DIM,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          &larr; Back to home
        </Link>
        <CopyLinkButton />
      </footer>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function StatusPill({ status }: { status: "solved" | "wrong" | "locked" | "unattempted" }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    solved: { bg: "rgba(22, 163, 74, 0.1)", color: "#16a34a", label: "Solved" },
    wrong: { bg: "rgba(220, 38, 38, 0.1)", color: "#dc2626", label: "Wrong" },
    locked: { bg: "rgba(220, 38, 38, 0.08)", color: "#991b1b", label: "Locked" },
    unattempted: { bg: "rgba(0,0,0,0.04)", color: DIM, label: "Unattempted" },
  };
  const s = styles[status] ?? styles.unattempted;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

