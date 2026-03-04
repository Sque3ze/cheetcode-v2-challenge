"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrailleSpinner from "@/components/BrailleSpinner";

const DEV_USER = process.env.NEXT_PUBLIC_DEV_USER;

const STEPS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
    title: "Build an Agent",
    desc: "Use Playwright, Puppeteer, or any browser automation tool to navigate pages and extract answers.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="12" y1="2" x2="12" y2="22" opacity="0.3" />
      </svg>
    ),
    title: "Solve Challenges",
    desc: "From simple table reads to multi-step workflows. Submit answers via the challenge page or API.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Beat the Clock",
    desc: "Fixed time window. Score is the percentage of points earned. Great orchestration wins.",
  },
];

function DemoButtons() {
  const [launchingLive, setLaunchingLive] = useState(false);
  const [launchingResults, setLaunchingResults] = useState(false);
  const [liveDone, setLiveDone] = useState(false);
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const launchLive = async () => {
    setLaunchingLive(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      if (res.ok) setLiveDone(true);
      else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to launch");
      }
    } catch {
      setError("Failed to launch");
    } finally {
      setLaunchingLive(false);
    }
  };

  const launchResults = async () => {
    setLaunchingResults(true);
    setError(null);
    try {
      const res = await fetch("/api/demo?type=results", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResultsId(data.sessionId);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to launch");
      }
    } catch {
      setError("Failed to launch");
    } finally {
      setLaunchingResults(false);
    }
  };

  return (
    <section style={{ paddingBottom: 16, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {!liveDone && (
          <button
            onClick={launchLive}
            disabled={launchingLive}
            className="btn-ghost btn-sm"
            style={{ fontSize: 13, color: "rgba(38, 38, 38, 0.5)" }}
          >
            {launchingLive ? "Launching..." : "Launch live demo"}
          </button>
        )}
        {!resultsId ? (
          <button
            onClick={launchResults}
            disabled={launchingResults}
            className="btn-ghost btn-sm"
            style={{ fontSize: 13, color: "rgba(38, 38, 38, 0.5)" }}
          >
            {launchingResults ? "Generating..." : "View demo report card"}
          </button>
        ) : (
          <Link
            href={`/results/${resultsId}`}
            className="btn-ghost btn-sm"
            style={{ fontSize: 13, color: "#fa5d19", textDecoration: "none" }}
          >
            View report card &rarr;
          </Link>
        )}
        {error && (
          <span style={{ fontSize: 12, color: "#dc2626" }}>{error}</span>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const leaderboard = useQuery(api.leaderboard.getAll);
  const activeSessions = useQuery(api.spectator.getActiveSessions);

  // Show at most 5 live sessions, deterministically selected by ID hash
  const displayedSessions = useMemo(() => {
    if (!activeSessions || activeSessions.length <= 5) return activeSessions ?? [];
    const sorted = [...activeSessions].sort((a, b) => {
      const hashA = a._id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
      const hashB = b._id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
      return hashA - hashB;
    });
    return sorted.slice(0, 5);
  }, [activeSessions]);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const github =
    DEV_USER ||
    (session?.user as { githubUsername?: string })?.githubUsername;

  const handleStart = async () => {
    setStarting(true);
    setError(null);

    try {
      const res = await fetch("/api/session", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start session");
        setStarting(false);
        return;
      }

      window.location.href = "/challenges";
    } catch {
      setError("Failed to start session");
      setStarting(false);
    }
  };

  const [hasActiveSession, setHasActiveSession] = useState(false);
  useEffect(() => {
    if (!github) return;
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.session?.status === "active") {
          setHasActiveSession(true);
        }
      })
      .catch(() => {});
  }, [github]);

  return (
    <div className="min-h-screen" style={{ position: "relative" }}>
      <AnimatedBackground />

      <section style={{ padding: "140px 0 100px", position: "relative" }}>
        <div className="hero-grid-overlay" />

        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <div className="glow-orb glow-orb-3" />

        <svg className="sparkle-marker" style={{ top: 120, left: "20%", width: 16, height: 16 }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
        <svg className="sparkle-marker" style={{ top: 200, right: "18%", width: 12, height: 12, animationDelay: "-3s" }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>

        <span className="edge-label" style={{ top: 80, left: 32 }}>[ AGENT ]</span>
        <span className="edge-label" style={{ top: 80, right: 32 }}>[ SOLVE ]</span>
        <span className="edge-label" style={{ bottom: 20, left: 32 }}>[ SCORE ]</span>
        <span className="edge-label" style={{ bottom: 20, right: 32 }}>[ TIMER ]</span>

        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div className="animate-fade-up" style={{ marginBottom: 32 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                lineHeight: "16px",
                fontWeight: 450,
                color: "#fa5d19",
                background: "rgba(250, 93, 25, 0.08)",
                border: "1px solid rgba(250, 93, 25, 0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#fa5d19">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Firecrawl CheetCode V2
            </span>
          </div>

          <h1
            className="animate-fade-up hero-glow"
            style={{
              fontSize: 60,
              fontWeight: 500,
              lineHeight: "64px",
              letterSpacing: "-0.3px",
              marginBottom: 16,
              color: "#262626",
              animationDelay: "80ms",
            }}
          >
            Build an Agent.{" "}
            <span className="hero-accent">Beat the Clock.</span>
          </h1>

          <p
            className="animate-fade-up"
            style={{
              fontSize: 20,
              lineHeight: "28px",
              color: "rgba(38, 38, 38, 0.6)",
              maxWidth: 600,
              marginBottom: 40,
              animationDelay: "160ms",
            }}
          >
            Build an AI agent that navigates web pages, extracts data, and
            solves challenges. Your score is based on how well you
            orchestrate your agent.
          </p>

          <div
            className="animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            {status === "loading" && !DEV_USER ? (
              <div style={{ color: "rgba(38, 38, 38, 0.4)", display: "flex", alignItems: "center", gap: 8 }}>
                <BrailleSpinner /> Loading...
              </div>
            ) : !session && !DEV_USER ? (
              <button
                onClick={() => signIn("github")}
                className="btn-heat btn-heat-pulse"
                style={{
                  height: 48,
                  padding: "12px 28px",
                  borderRadius: 10,
                  fontSize: 16,
                  lineHeight: "24px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Sign in with GitHub
              </button>
            ) : hasActiveSession ? (
              <Link
                href="/challenges"
                className="btn-heat btn-heat-pulse"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 48,
                  padding: "12px 28px",
                  borderRadius: 10,
                  fontSize: 16,
                  lineHeight: "24px",
                  color: "white",
                  textDecoration: "none",
                }}
              >
                Continue Session &rarr;
              </Link>
            ) : (
              <div>
                <button
                  onClick={handleStart}
                  disabled={starting}
                  className={`btn-heat ${!starting ? "btn-heat-pulse" : ""}`}
                  style={{
                    height: 48,
                    padding: "12px 28px",
                    borderRadius: 10,
                    fontSize: 16,
                    lineHeight: "24px",
                  }}
                >
                  {starting ? "Starting..." : "Start Challenge"}
                </button>
                {error && (
                  <p
                    style={{
                      marginTop: 12,
                      color: "#dc2626",
                      fontSize: 13,
                      lineHeight: "20px",
                    }}
                  >
                    {error}
                  </p>
                )}
                <p
                  style={{
                    marginTop: 16,
                    color: "rgba(38, 38, 38, 0.4)",
                    fontSize: 13,
                    lineHeight: "20px",
                  }}
                >
                  Signed in as{" "}
                  <span style={{ color: "#262626" }}>
                    {github}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: 96, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="card-surface card-glow glass-surface animate-fade-up"
                style={{
                  padding: 24,
                  borderRadius: 12,
                  animationDelay: `${320 + i * 80}ms`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "rgba(250, 93, 25, 0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 450,
                    color: "#262626",
                    marginBottom: 8,
                    lineHeight: "20px",
                    letterSpacing: "0.14px",
                  }}
                >
                  {step.title}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: "20px",
                    letterSpacing: "0.14px",
                    color: "rgba(38, 38, 38, 0.6)",
                    margin: 0,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DemoButtons />

      {activeSessions && activeSessions.length > 0 && (
        <section style={{ paddingBottom: 32, position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  lineHeight: "24px",
                  letterSpacing: "-0.18px",
                  color: "#262626",
                  margin: 0,
                }}
              >
                Live Now
              </h2>
              <span
                className="spectate-live-badge"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(22, 163, 74, 0.08)",
                  color: "#16a34a",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#16a34a",
                    display: "inline-block",
                  }}
                />
                {activeSessions.length}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {displayedSessions.map((s) => (
                <Link
                  key={s._id}
                  href={`/spectate/${s._id}`}
                  className="card-surface glass-surface"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#262626",
                    fontSize: 13,
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <span
                    className="spectate-activity-dot"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#16a34a",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>{s.github}</span>
                  <span style={{ color: "rgba(38, 38, 38, 0.35)", fontSize: 12 }}>
                    spectate &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section style={{ paddingBottom: 120, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 500,
              lineHeight: "32px",
              letterSpacing: "-0.24px",
              color: "#262626",
              marginBottom: 24,
            }}
          >
            <span className="hero-accent">Leader</span>board
          </h2>

          {!leaderboard ? (
            <p
              style={{
                color: "rgba(38, 38, 38, 0.4)",
                fontSize: 14,
                lineHeight: "20px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <BrailleSpinner /> Loading leaderboard...
            </p>
          ) : leaderboard.length === 0 ? (
            <div
              className="card-surface glass-surface"
              style={{
                padding: "48px 24px",
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: "rgba(38, 38, 38, 0.4)",
                  fontSize: 14,
                  lineHeight: "20px",
                  margin: 0,
                }}
              >
                No scores yet. Be the first to play.
              </p>
            </div>
          ) : (
            <div
              className="card-surface glass-surface"
              style={{
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  fontSize: 14,
                  lineHeight: "20px",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: 48 }} />
                  <col />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 68 }} />
                  <col style={{ width: 60 }} />
                  <col style={{ width: 64 }} />
                  <col style={{ width: 72 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    {["#", "Player", "Score", "Solved", "Orch.", "Wrong", ""].map((label, idx) => (
                      <th
                        key={label}
                        style={{
                          padding: "12px 16px",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "rgba(38, 38, 38, 0.35)",
                          textAlign: idx < 2 ? "left" : "right",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={entry._id}
                      style={{
                        borderTop:
                          i > 0 ? "1px solid rgba(0,0,0,0.04)" : undefined,
                        background:
                          entry.github === github
                            ? "rgba(250, 93, 25, 0.04)"
                            : undefined,
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (entry.github !== github)
                          e.currentTarget.style.background =
                            "rgba(250, 93, 25, 0.02)";
                      }}
                      onMouseLeave={(e) => {
                        if (entry.github !== github)
                          e.currentTarget.style.background = "";
                      }}
                    >
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span
                          className={
                            i === 0
                              ? "rank-gold"
                              : i === 1
                                ? "rank-silver"
                                : i === 2
                                  ? "rank-bronze"
                                  : ""
                          }
                          style={
                            i > 2
                              ? { color: "rgba(38, 38, 38, 0.3)" }
                              : undefined
                          }
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                        <a
                          href={`https://github.com/${entry.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#262626",
                            textDecoration: "none",
                            transition: "color 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#fa5d19")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "#262626")
                          }
                        >
                          {entry.github}
                        </a>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily:
                            "var(--font-geist-mono), monospace",
                          fontWeight: 500,
                          color: "#262626",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.score.toFixed(1)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily:
                            "var(--font-geist-mono), monospace",
                          color: "rgba(38, 38, 38, 0.5)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.completionScore != null
                          ? `${entry.completionScore.toFixed(0)}%`
                          : `${entry.score.toFixed(0)}%`}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily:
                            "var(--font-geist-mono), monospace",
                          whiteSpace: "nowrap",
                          color: entry.orchestrationScore != null
                            ? entry.orchestrationScore >= 70
                              ? "#16a34a"
                              : entry.orchestrationScore >= 40
                                ? "#ca8a04"
                                : "rgba(38, 38, 38, 0.35)"
                            : "rgba(38, 38, 38, 0.35)",
                        }}
                      >
                        {entry.orchestrationScore != null ? entry.orchestrationScore : "\u2014"}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          color: "rgba(38, 38, 38, 0.35)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.wrongAttempts}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <Link
                          href={`/spectate/${entry.sessionId}`}
                          style={{
                            fontSize: 12,
                            color: "rgba(38, 38, 38, 0.35)",
                            textDecoration: "none",
                            transition: "color 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#fa5d19")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "rgba(38, 38, 38, 0.35)")
                          }
                          title="View session replay"
                        >
                          view run
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <footer
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          padding: "32px 0",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontSize: 13,
            lineHeight: "20px",
            color: "rgba(38, 38, 38, 0.3)",
            margin: 0,
          }}
        >
          Built for{" "}
          <a
            href="https://firecrawl.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#fa5d19",
              textDecoration: "none",
            }}
          >
            Firecrawl
          </a>
        </p>
      </footer>
    </div>
  );
}
