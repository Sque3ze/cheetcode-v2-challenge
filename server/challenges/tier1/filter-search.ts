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
  initialVisibleCount: number;
  variantIndex: number;
}

export const filterSearchChallenge: ChallengeDefinition<FilterSearchPageData> = {
  id: "tier1-filter-search",
  title: "Filter & Count",
  tier: 1,
  description: "Filter a paginated list by multiple conditions and compute an aggregate.",

  instructions: (pageData) => {
    const conditions = pageData.filterConditions.map((c) => `${c.field} = "${c.value}"`).join(" AND ");
    const agg = pageData.aggregation;
    const variants = [
      agg === "count"
        ? `Filter employees where ${conditions} and submit the count of matching employees.`
        : agg === "average salary"
          ? `Filter employees where ${conditions} and submit the average salary of matching employees, rounded to the nearest whole number.`
          : `Filter employees where ${conditions} and submit the total salary of matching employees.`,
      agg === "count"
        ? `From the employee list, find all records matching ${conditions}. How many are there? Submit that number.`
        : agg === "average salary"
          ? `Find employees matching ${conditions}. Compute their mean salary (round to whole number) and submit it.`
          : `Find employees matching ${conditions}. Add up all their salaries and submit the total.`,
      agg === "count"
        ? `The table contains employee records. Apply these filters: ${conditions}. Submit how many employees match.`
        : agg === "average salary"
          ? `Apply filters ${conditions} to the employee data. Calculate the average salary of results, rounded to the nearest integer.`
          : `Apply filters ${conditions} to the employee data. What is the combined salary of all matching employees?`,
      agg === "count"
        ? `Look through the employee list for entries where ${conditions}. Report the total count of matches.`
        : agg === "average salary"
          ? `Search for employees with ${conditions}. Compute the average of their salaries, rounded to a whole number.`
          : `Search for employees with ${conditions}. Sum their salaries and submit the result.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const count = data.int(30, 40);
    const people = data.people(count);
    const variantIndex = data.int(0, 3);

    const employees = people.map((p) => ({
      name: p.fullName,
      department: p.department,
      salary: p.salary,
      city: p.city,
      age: p.age,
    }));

    const deptValues = [...new Set(employees.map((e) => e.department))];
    const cityValues = [...new Set(employees.map((e) => e.city))];

    const filterDept = data.pick(deptValues);
    const filterCity = data.pick(cityValues);

    const filterConditions = [
      { field: "department", value: filterDept },
      { field: "city", value: filterCity },
    ];

    let matching = employees.filter(
      (e) => e.department === filterDept && e.city === filterCity
    );

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
        initialVisibleCount: 12,
        variantIndex,
      },
      answer,
    };
  },
};
