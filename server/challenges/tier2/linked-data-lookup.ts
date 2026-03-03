/**
 * Tier 2 Challenge: Linked Data Lookup (Round 3 — Disambiguation)
 *
 * Department table shows only ID and Name; full details behind expandable rows.
 * Added projects table linked to departments for 3rd relationship.
 * Now generates 2 employees with the same first name in different departments.
 * Instructions reference by first name only with a disambiguation hint.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface EmployeeRow { name: string; role: string; departmentId: string; salary: number; }
interface DepartmentRow { id: string; name: string; budget?: number; manager?: string; location?: string; headcount?: number; }
interface ProjectRow { id: string; name: string; departmentId: string; budget: number; status: string; }

type TaskType = "department-field" | "project-aggregate";

interface LinkedDataLookupPageData {
  employees: EmployeeRow[];
  departments: DepartmentRow[];
  projects: ProjectRow[];
  targetEmployeeName: string;
  targetField: string;
  taskType: TaskType;
  disambiguationHint: string;
  variantIndex: number;
}

const DEPT_NAMES = ["Engineering", "Design", "Marketing", "Sales", "Finance", "Operations", "Product", "Support"] as const;
const PROJECT_NAMES = ["Phoenix", "Aurora", "Titan", "Nova", "Horizon", "Atlas", "Orbit", "Zenith", "Pulse", "Vertex"] as const;

export const linkedDataLookupChallenge: ChallengeDefinition<LinkedDataLookupPageData> = {
  id: "tier2-linked-data-lookup",
  title: "Linked Data Lookup",
  tier: 2,
  dependsOn: ["tier1-form-fill"],
  description: "Cross-reference tables with expandable rows to find a specific value.",

  instructions: (pageData) => {
    const firstName = pageData.targetEmployeeName.split(" ")[0];
    const hint = pageData.disambiguationHint;
    const field = pageData.targetField;
    const interactHint = `To reveal a department's hidden details, use the interact API with action "expand" and parameter deptId set to the department's ID (e.g. { "deptId": "DEPT-001" }).`;
    if (pageData.taskType === "department-field") {
      const variants = [
        `Find employee "${firstName}" (${hint}) in the Employees table. Note their Department ID, then expand that department's row in the Departments table. Submit the department's ${field}. ${interactHint}`,
        `Locate "${firstName}" among employees — ${hint}. Note which department they belong to. Expand that department to reveal its details and provide the ${field}. ${interactHint}`,
        `In the Employees table, look up "${firstName}" (${hint}) and find their Dept ID. Use that ID to find the matching department, expand it, and submit its ${field}. ${interactHint}`,
        `Which department does "${firstName}" (${hint}) work in? Find that department row, expand it, and report the ${field}. ${interactHint}`,
      ];
      return variants[pageData.variantIndex];
    }
    const variants = [
      `Find employee "${firstName}" (${hint}) in the Employees table. Note their Department ID, then find all projects in that department from the Projects table. Submit the ${field}. ${interactHint}`,
      `Look up "${firstName}" (${hint}) in employees to get their department. Then check the Projects table for projects in that department and provide the ${field}. ${interactHint}`,
      `Locate "${firstName}" (${hint}), identify their department ID, and cross-reference it with the Projects table. Submit the ${field} for matching projects. ${interactHint}`,
      `Starting from "${firstName}" (${hint}) in the employee list, follow their department link to the Projects table. Your answer is the ${field}. ${interactHint}`,
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
    const usedFullNames = new Set<string>();

    for (let i = 0; i < empCount; i++) {
      const person = data.person();
      let name = person.fullName;
      if (usedFullNames.has(name)) {
        name = `${person.firstName} ${data.pick(["A.", "B.", "C.", "D.", "E."] as const)} ${person.lastName}`;
      }
      usedFullNames.add(name);
      employees.push({
        name,
        role: person.role,
        departmentId: data.pick(departments).id,
        salary: person.salary,
      });
    }

    // Disambiguation: create a second employee with the same first name in a different department
    const targetEmployee = data.pick(employees);
    const targetFirstName = targetEmployee.name.split(" ")[0];
    const targetDept = departments.find((d) => d.id === targetEmployee.departmentId)!;
    const otherDepts = departments.filter((d) => d.id !== targetEmployee.departmentId);

    if (otherDepts.length > 0) {
      const dupeExists = employees.some(
        (e) => e.name !== targetEmployee.name && e.name.startsWith(targetFirstName + " ")
      );
      if (!dupeExists) {
        // Add a duplicate first-name employee in a different department
        const dupePerson = data.person();
        const dupeDept = data.pick(otherDepts);
        employees.push({
          name: `${targetFirstName} ${dupePerson.lastName}`,
          role: dupePerson.role,
          departmentId: dupeDept.id,
          salary: dupePerson.salary,
        });
      }
    }

    // Generate disambiguation hint
    const targetDeptName = targetDept.name;
    const hintType = data.pick(["department", "salary"] as const);
    let disambiguationHint: string;
    if (hintType === "department") {
      disambiguationHint = `the one in ${targetDeptName}`;
    } else {
      disambiguationHint = targetEmployee.salary >= 100000
        ? "with salary above $100K"
        : "with salary below $100K";
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

    // Gate department details behind expand interaction
    const deptDetails: Record<string, { budget: number; manager: string; location: string; headcount: number }> = {};
    for (const dept of departments) {
      deptDetails[dept.id] = { budget: dept.budget, manager: dept.manager, location: dept.location, headcount: dept.headcount };
    }

    return {
      pageData: {
        employees,
        departments: departments.map(({ budget, manager, location, headcount, ...rest }) => rest),
        projects,
        targetEmployeeName: targetEmployee.name,
        targetField, taskType,
        disambiguationHint,
        variantIndex,
      },
      hiddenData: { deptDetails },
      answer,
    };
  },

  interactActions: ["expand"],

  handleInteract(hiddenData, action, params) {
    if (action === "expand") {
      const deptId = params.deptId as string | undefined;
      if (!deptId) {
        return { error: "Missing required parameter: deptId. Use { \"deptId\": \"DEPT-XXX\" }." };
      }
      const deptDetails = hiddenData.deptDetails as Record<string, unknown>;
      const details = deptDetails[deptId];
      if (!details) {
        const validIds = Object.keys(deptDetails);
        return { error: `Unknown deptId "${deptId}". Valid IDs: ${validIds.join(", ")}` };
      }
      return details;
    }
    return null;
  },
};
