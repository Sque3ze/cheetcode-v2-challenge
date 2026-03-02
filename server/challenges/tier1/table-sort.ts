/**
 * Tier 1 Challenge: Table Sort (with Compensation Normalization)
 *
 * A paginated table (5 rows/page, 10-12 total). 30-40% of employees are
 * hourly type with hourlyRate and hoursPerWeek. Sort column is always
 * "Annual Compensation". Agent must compute hourlyRate × hoursPerWeek × 52
 * for hourly employees to compare with salary employees.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface TableSortEmployee {
  name: string;
  department: string;
  type: "Salary" | "Hourly";
  salary?: number;
  hourlyRate?: number;
  hoursPerWeek?: number;
}

interface TableSortPageData {
  employees: TableSortEmployee[];
  sortDirection: "highest" | "lowest";
  targetPosition: number;
  targetField: string;
  rowsPerPage: number;
  variantIndex: number;
}

export const tableSortChallenge: ChallengeDefinition<TableSortPageData> = {
  id: "tier1-table-sort",
  title: "Table Sort",
  tier: 1,
  description: "Sort a paginated table and find a specific value.",

  instructions: (pageData) => {
    const dir = pageData.sortDirection === "highest" ? "highest" : "lowest";
    const ord = getOrdinal(pageData.targetPosition);
    const field = pageData.targetField;
    const variants = [
      `Sort the employee table by Annual Compensation and find the ${ord} ${dir} value. Submit the ${field} of that employee. Note: some employees are hourly — compute their annual compensation as hourlyRate × hoursPerWeek × 52. The table is paginated.`,
      `Order employees by Annual Compensation (${dir} first). Which employee is at position ${pageData.targetPosition}? Provide their ${field}. Hourly employees' annual compensation = rate × hours/week × 52. Check all pages.`,
      `The table below lists employees with mixed compensation types. Sort by Annual Compensation to identify the ${ord} ${dir} entry and submit that employee's ${field}. For hourly workers, annualize as hourlyRate × hoursPerWeek × 52. Pagination is required.`,
      `Look at the employee data. Arrange rows by Annual Compensation from ${dir} to ${dir === "highest" ? "lowest" : "highest"}. Hourly employees need conversion: rate × hours × 52. The ${ord} row's ${field} is your answer. Check all pages.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const count = data.int(10, 12);
    const people = data.people(count);
    const variantIndex = data.int(0, 3);

    const sortDirection = data.pick(["highest", "lowest"] as const);

    // Target position 6-8 forces pagination (beyond first page of 5)
    const targetPosition = data.int(6, Math.min(8, count));
    const targetField = "name";

    // 30-40% hourly employees
    const hourlyCount = Math.round(count * (0.3 + data.int(0, 10) / 100));
    const hourlyIndices = new Set<number>();
    while (hourlyIndices.size < hourlyCount) {
      hourlyIndices.add(data.int(0, count - 1));
    }

    const employees: (TableSortEmployee & { annualComp: number })[] = people.map((p, i) => {
      if (hourlyIndices.has(i)) {
        const hourlyRate = data.int(15, 75) + data.int(0, 99) / 100;
        const hoursPerWeek = data.pick([20, 25, 30, 35, 40] as const);
        return {
          name: p.fullName,
          department: p.department,
          type: "Hourly" as const,
          hourlyRate,
          hoursPerWeek,
          annualComp: hourlyRate * hoursPerWeek * 52,
        };
      }
      return {
        name: p.fullName,
        department: p.department,
        type: "Salary" as const,
        salary: p.salary,
        annualComp: p.salary,
      };
    });

    // Sort by annual compensation
    const sorted = [...employees].sort((a, b) => {
      return sortDirection === "highest"
        ? b.annualComp - a.annualComp
        : a.annualComp - b.annualComp;
    });

    const targetEmployee = sorted[targetPosition - 1];
    const answer = targetEmployee.name;

    return {
      pageData: {
        employees: employees.map(({ annualComp, ...emp }) => emp),
        sortDirection,
        targetPosition,
        targetField,
        rowsPerPage: 5,
        variantIndex,
      },
      answer,
    };
  },

  validateAnswer(submitted: string, correct: string): boolean {
    return submitted.trim().toLowerCase() === correct.trim().toLowerCase();
  },
};

function getOrdinal(n: number): string {
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || "th");
}
