/**
 * Letter grade utilities for the Agent Report Card.
 */

const THRESHOLDS: [number, string][] = [
  [95, "A+"],
  [90, "A"],
  [85, "A-"],
  [80, "B+"],
  [75, "B"],
  [70, "B-"],
  [65, "C+"],
  [60, "C"],
  [55, "C-"],
  [40, "D"],
];

/** Convert a 0–100 score to a letter grade. */
export function letterGrade(score: number): string {
  for (const [min, grade] of THRESHOLDS) {
    if (score >= min) return grade;
  }
  return "F";
}

/** Return a hex color for a given letter grade. */
export function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "#16a34a";
  if (grade.startsWith("B")) return "#2a6dfb";
  if (grade.startsWith("C")) return "#ca8a04";
  if (grade === "D") return "#dc2626";
  return "#991b1b";
}
