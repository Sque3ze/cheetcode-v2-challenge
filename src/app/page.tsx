"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const DEV_USER = process.env.NEXT_PUBLIC_DEV_USER;

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

  // Check for existing active session
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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">
          CheetCode <span className="text-emerald-400">v2</span>
        </h1>
        <p className="text-xl text-gray-400 mb-2">
          Agent-focused coding challenges.
        </p>
        <p className="text-gray-500 mb-8 max-w-2xl">
          Build an AI agent that can navigate web pages, extract information,
          and solve challenges. Your score is the percentage of challenges
          you complete in the time window. The leaderboard shows who builds
          the best agent.
        </p>

        {/* Auth + Start */}
        <div className="mb-12">
          {status === "loading" && !DEV_USER ? (
            <div className="text-gray-500">Loading...</div>
          ) : !session && !DEV_USER ? (
            <button
              onClick={() => signIn("github")}
              className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Sign in with GitHub
            </button>
          ) : hasActiveSession ? (
            <a
              href="/challenges"
              className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Continue Session &rarr;
            </a>
          ) : (
            <div>
              <button
                onClick={handleStart}
                disabled={starting}
                className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {starting ? "Starting..." : "Start Session"}
              </button>
              {error && (
                <p className="mt-3 text-red-400 text-sm">{error}</p>
              )}
              <p className="mt-3 text-gray-500 text-sm">
                Signed in as <span className="text-gray-300">{github}</span>
              </p>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-emerald-400 text-sm font-medium mb-2">
              1. Build an Agent
            </div>
            <p className="text-gray-400 text-sm">
              Use Playwright, Puppeteer, or any browser automation tool.
              Your agent navigates the challenge pages and extracts answers.
            </p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-blue-400 text-sm font-medium mb-2">
              2. Solve Challenges
            </div>
            <p className="text-gray-400 text-sm">
              Challenges range from simple table reads to multi-step workflows.
              Each challenge has a point value. Submit answers via the page or API.
            </p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-purple-400 text-sm font-medium mb-2">
              3. Beat the Clock
            </div>
            <p className="text-gray-400 text-sm">
              Your session has a fixed time window. Score is the percentage
              of points you earn. Parallel agents score higher.
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Leaderboard</h2>
          {!leaderboard ? (
            <p className="text-gray-500">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-gray-500">
              No scores yet. Be the first to play.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-4 py-3 text-left text-gray-400 font-medium w-16">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">
                      Player
                    </th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">
                      Score
                    </th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">
                      Wrong Guesses
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={entry._id}
                      className={`border-t border-gray-800 ${
                        entry.github === github ? "bg-blue-500/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://github.com/${entry.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-400 transition-colors"
                        >
                          {entry.github}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {entry.score.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {entry.wrongAttempts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
