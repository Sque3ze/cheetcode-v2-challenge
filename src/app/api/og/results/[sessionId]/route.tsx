import { ImageResponse } from "next/og";
import { fetchResultsData } from "../../../../../lib/results-data";
import { gradeColor } from "../../../../../lib/letter-grades";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  let data;
  try {
    data = await fetchResultsData(sessionId);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const { session, grades, timeline } = data;

  const gradeCards = [
    { label: "Parallelization", grade: grades.parallelization },
    { label: "Solve Order", grade: grades.dagEfficiency },
    { label: "Critical Path", grade: grades.criticalPathSpeed },
    { label: "Recovery", grade: grades.failureRecovery },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fafafa",
          padding: "48px 56px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top row: branding + user */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#fa5d19",
                letterSpacing: "-0.5px",
              }}
            >
              CheetCode v2
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://github.com/${session.github}.png`}
              alt=""
              width={40}
              height={40}
              style={{ borderRadius: 999 }}
            />
            <span style={{ fontSize: 22, fontWeight: 500, color: "#262626" }}>
              @{session.github}
            </span>
          </div>
        </div>

        {/* Score */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 24,
            marginTop: 36,
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1,
              color: "#262626",
              letterSpacing: "-2px",
            }}
          >
            {session.score.toFixed(1)}%
          </span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: gradeColor(grades.overall),
            }}
          >
            {grades.overall}
          </span>
        </div>

        {/* Score split */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 12,
            fontSize: 20,
            color: "rgba(38,38,38,0.5)",
          }}
        >
          <span>
            {timeline.challengesSolved}/{data.challenges.length} challenges
          </span>
          {data.rank > 0 && <span>Rank #{data.rank}</span>}
        </div>

        {/* Grade pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          {gradeCards.map(({ label, grade }) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "16px 28px",
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #e5e5e5",
              }}
            >
              <span style={{ fontSize: 16, color: "rgba(38,38,38,0.5)" }}>
                {label}
              </span>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: grade !== "N/A" ? gradeColor(grade) : "rgba(38,38,38,0.3)",
                  marginTop: 4,
                }}
              >
                {grade}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
