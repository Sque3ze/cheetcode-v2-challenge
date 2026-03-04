"use client";

import { useRef, useEffect } from "react";
import { DIM, BORDER, EVENT_COLORS, formatTime, challengeLabel } from "./formatters";

interface SpectatorEvent {
  type: string;
  timestamp: number;
  challengeId?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface EventFeedProps {
  events: SpectatorEvent[];
  startedAt: number;
  /** Auto-scroll to bottom on new events */
  live?: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  session_started: "Session Started",
  challenge_viewed: "Viewed",
  challenge_interacted: "Interacted",
  answer_submitted: "Submitted",
  answer_correct: "Correct",
  answer_wrong: "Wrong",
  challenge_locked: "Locked",
  session_completed: "Session Done",
};

export function EventFeed({ events, startedAt, live }: EventFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(events.length);

  useEffect(() => {
    if (live && events.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = events.length;
  }, [events.length, live]);

  if (events.length === 0) {
    return (
      <p style={{ color: DIM, fontSize: 12, padding: "12px 16px" }}>
        No events yet.
      </p>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        maxHeight: 280,
        overflowY: "auto",
        padding: "8px 16px",
        borderTop: `1px solid ${BORDER}`,
        background: "rgba(0,0,0,0.015)",
      }}
    >
      {events.map((event, i) => {
        const isLatest = live && i === events.length - 1;
        return (
        <div
          key={i}
          className={isLatest ? "spectate-latest-event" : undefined}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            padding: "3px 0",
            paddingLeft: isLatest ? 8 : 0,
            fontSize: 12,
            fontFamily: "var(--font-geist-mono), monospace",
            borderLeft: isLatest ? "2px solid #16a34a" : "2px solid transparent",
            transition: "all 0.3s ease",
          }}
        >
          <span style={{ color: DIM, width: 40, flexShrink: 0 }}>
            {formatTime(event.timestamp, startedAt)}
          </span>
          <span
            style={{
              color: EVENT_COLORS[event.type] || "#262626",
              fontWeight: 500,
              width: 110,
              flexShrink: 0,
            }}
          >
            {EVENT_LABELS[event.type] || event.type}
          </span>
          <span style={{ color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.challengeId ? challengeLabel(event.challengeId) : ""}
          </span>
        </div>
        );
      })}
    </div>
  );
}
