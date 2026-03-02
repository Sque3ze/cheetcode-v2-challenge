/**
 * Tier 2 Challenge: Linked Data Lookup (Moderate Rework)
 *
 * Changes:
 * - Department table shows only ID and Name; full details (budget, manager,
 *   location) behind expandable rows (click to expand)
 * - Forces click interaction to see lookup target field
 * - Added projects table linked to departments for 3rd relationship
 *
 * Tests: cross-referencing data across tables, following foreign key
 * relationships, interacting with expandable rows.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface EmployeeRow {
  name: string;
  role: string;
  departmentId: string;
  salary: number;
}

interface DepartmentRow {
  id: string;
  name: string;
  /** Hidden behind expandable row */
  budget: number;
  /** Hidden behind expandable row */
  manager: string;
  /** Hidden behind expandable row */
  location: string;
  /** Hidden behind expandable row */
  headcount: number;
}

interface ProjectRow {
  id: string;
  name: string;
  departmentId: string;
  budget: number;
  status: string;
}

type TaskType = "department-field" | "project-aggregate";

interface LinkedDataLookupPageData {
  employees: EmployeeRow[];
  departments: DepartmentRow[];
  projects: ProjectRow[];
  targetEmployeeName: string;
  targetField: string;
  taskType: TaskType;
}

const DEPT_NAMES = [
  "Engineering", "Design", "Marketing", "Sales",
  "Finance", "Operations", "Product", "Support",
] as const;

const PROJECT_NAMES = [
  "Phoenix", "Aurora", "Titan", "Nova", "Horizon",
  "Atlas", "Orbit", "Zenith", "Pulse", "Vertex",
] as const;

export const linkedDataLookupChallenge: ChallengeDefinition<LinkedDataLookupPageData> = {
  id: "tier2-linked-data-lookup",
  title: "Linked Data Lookup",
  tier: 2,
  description: "Cross-reference tables with expandable rows to find a specific value.",

  instructions: (pageData) => {
    if (pageData.taskType === "department-field") {
      return `Find employee "${pageData.targetEmployeeName}" in the Employees table. ` +
        `Note their Department ID, then expand that department's row in the Departments table. ` +
        `Submit the department's ${pageData.targetField}.`;
    }
    return `Find employee "${pageData.targetEmployeeName}" in the Employees table. ` +
      `Note their Department ID, then find all projects in that department from the Projects table. ` +
      `Submit the ${pageData.targetField}.`;
  },

  generate(data: ChallengeData) {
    // Generate departments
    const deptCount = data.int(4, 6);
    const deptNames = data.pickN(DEPT_NAMES, deptCount);
    const departments: DepartmentRow[] = deptNames.map((name, i) => ({
      id: `DEPT-${String(i + 1).padStart(3, "0")}`,
      name,
      budget: data.int(100, 900) * 1000,
      manager: data.person().fullName,
      location: data.city(),
      headcount: data.int(5, 80),
    }));

    // Generate employees linked to departments
    const empCount = data.int(8, 14);
    const employees: EmployeeRow[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < empCount; i++) {
      const person = data.person();
      let name = person.fullName;
      if (usedNames.has(name)) {
        name = `${person.firstName} ${data.pick(["A.", "B.", "C.", "D.", "E."] as const)} ${person.lastName}`;
      }
      usedNames.add(name);

      employees.push({
        name,
        role: person.role,
        departmentId: data.pick(departments).id,
        salary: person.salary,
      });
    }

    // Generate projects linked to departments
    const projectCount = data.int(6, 10);
    const projectNames = data.pickN(PROJECT_NAMES, projectCount);
    const projects: ProjectRow[] = projectNames.map((name, i) => ({
      id: `PROJ-${String(i + 1).padStart(3, "0")}`,
      name,
      departmentId: data.pick(departments).id,
      budget: data.int(10, 200) * 1000,
      status: data.pick(["Active", "Planned", "Completed"] as const),
    }));

    // Pick a target employee
    const targetEmployee = data.pick(employees);
    const targetDept = departments.find((d) => d.id === targetEmployee.departmentId)!;

    // Pick task type
    const taskType = data.pick(["department-field", "project-aggregate"] as const);

    let targetField: string;
    let answer: string;

    if (taskType === "department-field") {
      targetField = data.pick(["manager", "location", "budget", "headcount"] as const);
      if (targetField === "budget") {
        answer = String(targetDept.budget);
      } else if (targetField === "headcount") {
        answer = String(targetDept.headcount);
      } else {
        answer = targetDept[targetField as "manager" | "location"];
      }
    } else {
      // Project aggregate: count projects or total budget
      const deptProjects = projects.filter((p) => p.departmentId === targetDept.id);
      // Ensure at least 1 project exists for this department
      if (deptProjects.length === 0) {
        const newProject: ProjectRow = {
          id: `PROJ-${String(projectCount + 1).padStart(3, "0")}`,
          name: data.pick(PROJECT_NAMES),
          departmentId: targetDept.id,
          budget: data.int(10, 200) * 1000,
          status: data.pick(["Active", "Planned", "Completed"] as const),
        };
        projects.push(newProject);
        deptProjects.push(newProject);
      }
      const aggType = data.pick(["total project budget", "number of projects"] as const);
      targetField = aggType;
      if (aggType === "total project budget") {
        answer = String(deptProjects.reduce((sum, p) => sum + p.budget, 0));
      } else {
        answer = String(deptProjects.length);
      }
    }

    return {
      pageData: {
        employees,
        departments,
        projects,
        targetEmployeeName: targetEmployee.name,
        targetField,
        taskType,
      },
      answer,
    };
  },
};
