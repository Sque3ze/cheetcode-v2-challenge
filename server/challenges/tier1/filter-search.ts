/**
 * Tier 1 Challenge: Filter & Count (Moderate Rework)
 *
 * Changes:
 * - Multiple AND filter conditions: department + city
 * - Pagination (30+ employees, 10 per page)
 * - Added "average salary" as aggregation type
 * - Forces actual interaction (paginate or use filter input)
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface FilterSearchPageData {
  employees: Array<{
    name: string;
    department: string;
    salary: number;
    city: string;
    age: number;
  }>;
  filterConditions: Array<{ field: string; value: string }>;
  aggregation: "count" | "total salary" | "average salary";
  employeesPerPage: number;
}

export const filterSearchChallenge: ChallengeDefinition<FilterSearchPageData> = {
  id: "tier1-filter-search",
  title: "Filter & Count",
  tier: 1,
  description: "Filter a paginated list by multiple conditions and compute an aggregate.",

  instructions: (pageData) => {
    const conditions = pageData.filterConditions.map((c) => `${c.field} = "${c.value}"`).join(" AND ");
    if (pageData.aggregation === "count") {
      return `Filter employees where ${conditions} and submit the count of matching employees.`;
    }
    if (pageData.aggregation === "average salary") {
      return `Filter employees where ${conditions} and submit the average salary of matching employees, rounded to the nearest whole number.`;
    }
    return `Filter employees where ${conditions} and submit the total salary of matching employees.`;
  },

  generate(data: ChallengeData) {
    // Generate 30-40 employees (needs pagination)
    const count = data.int(30, 40);
    const people = data.people(count);

    const employees = people.map((p) => ({
      name: p.fullName,
      department: p.department,
      salary: p.salary,
      city: p.city,
      age: p.age,
    }));

    // Build filter conditions — always 2 AND conditions
    const deptValues = [...new Set(employees.map((e) => e.department))];
    const cityValues = [...new Set(employees.map((e) => e.city))];

    const filterDept = data.pick(deptValues);
    const filterCity = data.pick(cityValues);

    const filterConditions = [
      { field: "department", value: filterDept },
      { field: "city", value: filterCity },
    ];

    // Find matching employees
    let matching = employees.filter(
      (e) => e.department === filterDept && e.city === filterCity
    );

    // Ensure at least 2 matches
    while (matching.length < 2) {
      const idx = data.int(0, employees.length - 1);
      employees[idx].department = filterDept;
      employees[idx].city = filterCity;
      matching = employees.filter(
        (e) => e.department === filterDept && e.city === filterCity
      );
    }

    const aggregation = data.pick(["count", "total salary", "average salary"] as const);
    let answer: string;

    if (aggregation === "count") {
      answer = String(matching.length);
    } else if (aggregation === "average salary") {
      const avg = Math.round(matching.reduce((sum, e) => sum + e.salary, 0) / matching.length);
      answer = String(avg);
    } else {
      answer = String(matching.reduce((sum, e) => sum + e.salary, 0));
    }

    return {
      pageData: {
        employees,
        filterConditions,
        aggregation,
        employeesPerPage: 10,
      },
      answer,
    };
  },
};
