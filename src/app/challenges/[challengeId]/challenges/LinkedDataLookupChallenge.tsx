"use client";

import { useState, useEffect, MutableRefObject } from "react";

interface EmployeeRow {
  name: string;
  role: string;
  departmentId: string;
  salary: number;
}

interface DepartmentRow {
  id: string;
  name: string;
  budget: number;
  manager: string;
  location: string;
  headcount: number;
}

interface ProjectRow {
  id: string;
  name: string;
  departmentId: string;
  budget: number;
  status: string;
}

interface LinkedDataLookupPageData {
  employees: EmployeeRow[];
  departments: DepartmentRow[];
  projects: ProjectRow[];
  targetEmployeeName: string;
  targetField: string;
  taskType: "department-field" | "project-aggregate";
}

interface Props {
  pageData: LinkedDataLookupPageData;
  answerRef: MutableRefObject<string>;
}

export default function LinkedDataLookupChallenge({ pageData, answerRef }: Props) {
  const [answer, setAnswer] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const toggleDept = (id: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Table A: Employees */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Employees</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm" data-table="employees">
            <thead>
              <tr className="bg-gray-900">
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Name</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Role</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Dept ID</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">Salary</th>
              </tr>
            </thead>
            <tbody>
              {pageData.employees.map((emp, i) => (
                <tr key={i} className="border-t border-gray-800" data-employee-name={emp.name}>
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3 text-gray-400">{emp.role}</td>
                  <td className="px-4 py-3 font-mono" data-dept-id>{emp.departmentId}</td>
                  <td className="px-4 py-3 text-right font-mono">${emp.salary.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table B: Departments (expandable rows) */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Departments</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm" data-table="departments">
            <thead>
              <tr className="bg-gray-900">
                <th className="px-4 py-3 text-left text-gray-400 font-medium w-8"></th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Dept ID</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Name</th>
              </tr>
            </thead>
            <tbody>
              {pageData.departments.map((dept) => (
                <tr key={dept.id} className="border-t border-gray-800" data-dept-row={dept.id}>
                  <td className="px-4 py-3" colSpan={3}>
                    <button
                      onClick={() => toggleDept(dept.id)}
                      className="w-full text-left flex items-center gap-3"
                      data-expand-dept={dept.id}
                    >
                      <span className="text-xs text-gray-500">
                        {expandedDepts.has(dept.id) ? "▼" : "▶"}
                      </span>
                      <span className="font-mono text-sm">{dept.id}</span>
                      <span className="text-sm">{dept.name}</span>
                    </button>
                    {expandedDepts.has(dept.id) && (
                      <div className="mt-2 ml-6 bg-gray-900/50 rounded-lg p-3 text-sm" data-dept-details={dept.id}>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <dt className="text-gray-500">Budget</dt>
                          <dd className="font-mono" data-field="budget">${dept.budget.toLocaleString()}</dd>
                          <dt className="text-gray-500">Manager</dt>
                          <dd data-field="manager">{dept.manager}</dd>
                          <dt className="text-gray-500">Location</dt>
                          <dd data-field="location">{dept.location}</dd>
                          <dt className="text-gray-500">Headcount</dt>
                          <dd data-field="headcount">{dept.headcount}</dd>
                        </dl>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table C: Projects */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Projects</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm" data-table="projects">
            <thead>
              <tr className="bg-gray-900">
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Project ID</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Name</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Dept ID</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">Budget</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData.projects.map((proj) => (
                <tr key={proj.id} className="border-t border-gray-800" data-project-id={proj.id}>
                  <td className="px-4 py-3 font-mono text-xs">{proj.id}</td>
                  <td className="px-4 py-3">{proj.name}</td>
                  <td className="px-4 py-3 font-mono" data-project-dept-id>{proj.departmentId}</td>
                  <td className="px-4 py-3 text-right font-mono" data-project-budget>${proj.budget.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">{proj.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Answer input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Your Answer ({pageData.targetField})
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`Enter the ${pageData.targetField}...`}
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
