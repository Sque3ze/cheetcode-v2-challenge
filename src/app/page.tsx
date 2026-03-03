"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const DEV_USER = process.env.NEXT_PUBLIC_DEV_USER;

const STEPS = [
  {
    title: "Build an Agent",
    desc: "Use Playwright, Puppeteer, or any browser automation tool to navigate pages and extract answers.",
  },
  {
    title: "Solve Challenges",
    desc: "From simple table reads to multi-step workflows. Submit answers via the challenge page or API.",
  },
  {
    title: "Beat the Clock",
    desc: "Fixed time window. Score is the percentage of points earned. Parallel execution wins.",
  },
];

export default function Home() {
  const { data: session, status } = useSession();
  const leaderboard = useQuery(api.leaderboard.getAll);
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
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section style={{ padding: "140px 0 100px" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <div className="animate-fade-up" style={{ marginBottom: 32 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 450,
                color: "#fa5d19",
                background: "rgba(250, 93, 25, 0.08)",
              }}
            >
              Firecrawl Agent Challenge
            </span>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up"
            style={{
              fontSize: 52,
              fontWeight: 500,
              lineHeight: "56px",
              letterSpacing: "-0.52px",
              marginBottom: 16,
              color: "#262626",
              animationDelay: "80ms",
            }}
          >
            Build an Agent.{" "}
            <span style={{ color: "#fa5d19" }}>Beat the Clock.</span>
          </h1>

          {/* Description */}
          <p
            className="animate-fade-up"
            style={{
              fontSize: 16,
              lineHeight: "24px",
              color: "rgba(38, 38, 38, 0.6)",
              maxWidth: 480,
              marginBottom: 40,
              animationDelay: "160ms",
            }}
          >
            Build an AI agent that navigates web pages, extracts data, and
            solves challenges. Your score is the percentage you complete in
            the time window.
          </p>

          {/* CTA */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            {status === "loading" && !DEV_USER ? (
              <div style={{ color: "rgba(38, 38, 38, 0.4)" }}>
                Loading...
              </div>
            ) : !session && !DEV_USER ? (
              <button
                onClick={() => signIn("github")}
                className="btn-heat"
                style={{
                  height: 48,
                  padding: "12px 24px",
                  borderRadius: 10,
                  fontSize: 16,
                  lineHeight: "24px",
                }}
              >
                Sign in with GitHub
              </button>
            ) : hasActiveSession ? (
              <a
                href="/challenges"
                className="btn-heat"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 48,
                  padding: "12px 24px",
                  borderRadius: 10,
                  fontSize: 16,
                  lineHeight: "24px",
                  color: "white",
                  textDecoration: "none",
                }}
              >
                Continue Session &rarr;
              </a>
            ) : (
              <div>
                <button
                  onClick={handleStart}
                  disabled={starting}
                  className="btn-heat"
                  style={{
                    height: 48,
                    padding: "12px 24px",
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

      {/* ── How it works ── */}
      <section style={{ paddingBottom: 96 }}>
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
                className="card-surface animate-fade-up"
                style={{
                  padding: 24,
                  borderRadius: 12,
                  animationDelay: `${320 + i * 80}ms`,
                }}
              >
                {/* Icon box — Firecrawl feature card pattern */}
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
                    fontSize: 18,
                  }}
                >
                  {i === 0 ? "🤖" : i === 1 ? "🧩" : "⏱"}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 450,
                    color: "#262626",
                    marginBottom: 8,
                    lineHeight: "20px",
                  }}
                >
                  {step.title}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: "20px",
                    color: "rgba(38, 38, 38, 0.5)",
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

      {/* ── Leaderboard ── */}
      <section style={{ paddingBottom: 120 }}>
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
            <span style={{ color: "#fa5d19" }}>Leader</span>board
          </h2>

          {!leaderboard ? (
            <p
              style={{
                color: "rgba(38, 38, 38, 0.4)",
                fontSize: 14,
                lineHeight: "20px",
              }}
            >
              Loading...
            </p>
          ) : leaderboard.length === 0 ? (
            <div
              className="card-surface"
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
              className="card-surface"
              style={{ borderRadius: 12, overflow: "hidden" }}
            >
              <table
                style={{
                  width: "100%",
                  fontSize: 14,
                  lineHeight: "20px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                    {["#", "Player", "Score", "Wrong", "API Calls"].map((label, idx) => (
                      <th
                        key={label}
                        style={{
                          padding: "12px 24px",
                          fontSize: 13,
                          fontWeight: 450,
                          color: "rgba(38, 38, 38, 0.4)",
                          textAlign: idx < 2 ? "left" : "right",
                          ...(idx === 0 ? { width: 56 } : {}),
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
                          i > 0 ? "1px solid #f0f0f0" : undefined,
                        background:
                          entry.github === github
                            ? "rgba(250, 93, 25, 0.04)"
                            : undefined,
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (entry.github !== github)
                          e.currentTarget.style.background =
                            "rgba(0,0,0,0.02)";
                      }}
                      onMouseLeave={(e) => {
                        if (entry.github !== github)
                          e.currentTarget.style.background = "";
                      }}
                    >
                      <td style={{ padding: "12px 24px" }}>
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
                      <td style={{ padding: "12px 24px" }}>
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
                          padding: "12px 24px",
                          textAlign: "right",
                          fontFamily:
                            "var(--font-geist-mono), monospace",
                          fontWeight: 500,
                          color: "#262626",
                        }}
                      >
                        {entry.score.toFixed(1)}%
                      </td>
                      <td
                        style={{
                          padding: "12px 24px",
                          textAlign: "right",
                          color: "rgba(38, 38, 38, 0.35)",
                        }}
                      >
                        {entry.wrongAttempts}
                      </td>
                      <td
                        style={{
                          padding: "12px 24px",
                          textAlign: "right",
                          color: "rgba(38, 38, 38, 0.35)",
                        }}
                      >
                        {entry.apiCalls ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid #f0f0f0",
          padding: "32px 0",
          textAlign: "center",
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
