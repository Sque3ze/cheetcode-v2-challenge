"use client";

import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  baseAlpha: number;
  phase: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    // Respect reduced motion preferences
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dots: Dot[] = [];
    let isVisible = true;
    const GRID_SPACING = 24;
    const DOT_RADIUS = 1.2;
    const BASE_ALPHA = 0.22;
    const WAVE_SPEED = 0.0008;
    const WAVE_SCALE = 0.018;

    // Only animate when visible in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(canvas);

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    }

    function buildGrid() {
      dots = [];
      const cols = Math.ceil(window.innerWidth / GRID_SPACING) + 1;
      const rows = Math.ceil(window.innerHeight / GRID_SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * GRID_SPACING;
          const y = row * GRID_SPACING;
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight * 0.35;
          const dx = (x - cx) / (window.innerWidth * 0.6);
          const dy = (y - cy) / (window.innerHeight * 0.8);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const falloff = Math.max(0, 1 - dist * 0.55);

          dots.push({
            x,
            y,
            baseAlpha: BASE_ALPHA * falloff,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    let lastDrawTime = 0;
    const FRAME_INTERVAL = 66; // ~15fps

    function draw(time: number) {
      animRef.current = requestAnimationFrame(draw);

      if (!isVisible) return;
      if (time - lastDrawTime < FRAME_INTERVAL) return;
      lastDrawTime = time;

      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const dot of dots) {
        if (dot.baseAlpha < 0.005) continue;

        const wave1 = Math.sin(
          time * WAVE_SPEED + dot.x * WAVE_SCALE + dot.phase
        );
        const wave2 = Math.sin(
          time * WAVE_SPEED * 0.7 + dot.y * WAVE_SCALE * 1.3 + dot.phase * 0.5
        );
        const wave3 = Math.sin(
          time * WAVE_SPEED * 0.4 +
            (dot.x + dot.y) * WAVE_SCALE * 0.8
        );
        const combined = (wave1 + wave2 + wave3) / 3;
        const alpha = dot.baseAlpha * (0.5 + combined * 0.5);

        if (alpha < 0.003) continue;

        const r = 250;
        const g = 93 + Math.floor(combined * 30);
        const b = 25;

        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.fill();
      }
    }

    resize();
    animRef.current = requestAnimationFrame(draw);

    let resizeTimer: ReturnType<typeof setTimeout>;
    function debouncedResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }
    window.addEventListener("resize", debouncedResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
