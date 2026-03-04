"use client";

import { useState, useEffect } from "react";

const FRAMES = ["\u28fe", "\u28fd", "\u28fb", "\u28bf", "\u287f", "\u28df", "\u28ef", "\u28f7"];

export default function BrailleSpinner({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ fontFamily: "var(--font-geist-mono), monospace" }}
    >
      {FRAMES[index]}
    </span>
  );
}
