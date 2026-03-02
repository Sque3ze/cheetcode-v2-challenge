/**
 * Tier 1 Challenge: Table Sort (with Pagination)
 *
 * A paginated table (5 rows/page, 10-12 total). Agent must sort + paginate
 * to find the Nth highest/lowest value. Forces at least 2 interactions.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface TableSortPageData {
  employees: Array<{
    name: string;
    department: string;
    salary: number;
    startDate: string;
  }>;
  sortColumn: string;
  sortDirection: "highest" | "lowest";
  targetPosition: number;
  targetField: string;
  rowsPerPage: number;
}

export const tableSortChallenge: ChallengeDefinition<TableSortPageData> = {
  id: "tier1-table-sort",
  title: "Table Sort",
  tier: 1,
  description: "Sort a paginated table and find a specific value.",

  instructions: (pageData) => {
    const directionWord = pageData.sortDirection === "highest" ? "highest" : "lowest";
    const ordinal = getOrdinal(pageData.targetPosition);
    return `Sort the employee table by ${pageData.sortColumn} and find the ${ordinal} ${directionWord} value. Submit the ${pageData.targetField} of that employee. Note: the table is paginated — you may need to navigate pages.`;
  },

  generate(data: ChallengeData) {
    const count = data.int(10, 12);
    const people = data.people(count);

    const sortableColumns = ["salary", "startDate"] as const;
    const sortColumn = data.pick(sortableColumns);
    const sortDirection = data.pick(["highest", "lowest"] as const);

    // Target position 6-8 forces pagination (beyond first page of 5)
    const targetPosition = data.int(6, Math.min(8, count));
    const targetField = "name";

    const sorted = [...people].sort((a, b) => {
      if (sortColumn === "salary") {
        return sortDirection === "highest" ? b.salary - a.salary : a.salary - b.salary;
      }
      return sortDirection === "highest"
        ? b.startDate.localeCompare(a.startDate)
        : a.startDate.localeCompare(b.startDate);
    });

    const targetEmployee = sorted[targetPosition - 1];
    const answer = targetEmployee.fullName;

    return {
      pageData: {
        employees: people.map((p) => ({
          name: p.fullName,
          department: p.department,
          salary: p.salary,
          startDate: p.startDate,
        })),
        sortColumn: sortColumn === "salary" ? "Salary" : "Start Date",
        sortDirection,
        targetPosition,
        targetField,
        rowsPerPage: 5,
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
