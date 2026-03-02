/**
 * Tier 2 Challenge: Linked Data Lookup (Moderate Rework)
 *
 * Department table shows only ID and Name; full details behind expandable rows.
 * Added projects table linked to departments for 3rd relationship.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface EmployeeRow { name: string; role: string; departmentId: string; salary: number; }
interface DepartmentRow { id: string; name: string; budget: number; manager: string; location: string; headcount: number; }
interface ProjectRow { id: string; name: string; departmentId: string; budget: number; status: string; }

type TaskType = "department-field" | "project-aggregate";

interface LinkedDataLookupPageData {
  employees: EmployeeRow[];
  departments: DepartmentRow[];
  projects: ProjectRow[];
  targetEmployeeName: string;
  targetField: string;
  taskType: TaskType;
  variantIndex: number;
}

const DEPT_NAMES = ["Engineering", "Design", "Marketing", "Sales", "Finance", "Operations", "Product", "Support"] as const;
const PROJECT_NAMES = ["Phoenix", "Aurora", "Titan", "Nova", "Horizon", "Atlas", "Orbit", "Zenith", "Pulse", "Vertex"] as const;

export const linkedDataLookupChallenge: ChallengeDefinition<LinkedDataLookupPageData> = {
  id: "tier2-linked-data-lookup",
  title: "Linked Data Lookup",
  tier: 2,
  description: "Cross-reference tables with expandable rows to find a specific value.",

  instructions: (pageData) => {
    const emp = pageData.targetEmployeeName;
    const field = pageData.targetField;
    if (pageData.taskType === "department-field") {
      const variants = [
        `Find employee "${emp}" in the Employees table. Note their Department ID, then expand that department's row in the Departments table. Submit the department's ${field}.`,
        `Locate "${emp}" among employees and note which department they belong to. Expand that department to reveal its details and provide the ${field}.`,
        `In the Employees table, look up "${emp}" and find their Dept ID. Use that ID to find the matching department, expand it, and submit its ${field}.`,
        `Which department does "${emp}" work in? Find that department row, expand it, and report the ${field}.`,
      ];
      return variants[pageData.variantIndex];
    }
    const variants = [
      `Find employee "${emp}" in the Employees table. Note their Department ID, then find all projects in that department from the Projects table. Submit the ${field}.`,
      `Look up "${emp}" in employees to get their department. Then check the Projects table for projects in that department and provide the ${field}.`,
      `Locate "${emp}", identify their department ID, and cross-reference it with the Projects table. Submit the ${field} for matching projects.`,
      `Starting from "${emp}" in the employee list, follow their department link to the Projects table. Your answer is the ${field}.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
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

    const projectCount = data.int(6, 10);
    const projectNames = data.pickN(PROJECT_NAMES, projectCount);
    const projects: ProjectRow[] = projectNames.map((name, i) => ({
      id: `PROJ-${String(i + 1).padStart(3, "0")}`,
      name,
      departmentId: data.pick(departments).id,
      budget: data.int(10, 200) * 1000,
      status: data.pick(["Active", "Planned", "Completed"] as const),
    }));

    const targetEmployee = data.pick(employees);
    const targetDept = departments.find((d) => d.id === targetEmployee.departmentId)!;
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
      const deptProjects = projects.filter((p) => p.departmentId === targetDept.id);
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
        employees, departments, projects,
        targetEmployeeName: targetEmployee.name,
        targetField, taskType, variantIndex,
      },
      answer,
    };
  },
};
