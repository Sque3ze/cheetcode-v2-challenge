"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface EmployeeRow {
  name: string;
  role: string;
  departmentId: string;
  salary: number;
}

interface DepartmentRow {
  id: string;
  name: string;
  budget?: number;
  manager?: string;
  location?: string;
  headcount?: number;
}

interface DeptDetails {
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
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function LinkedDataLookupChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [deptDetails, setDeptDetails] = useState<Record<string, DeptDetails>>({});
  const [loadingDept, setLoadingDept] = useState<string | null>(null);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const toggleDept = async (id: string) => {
    const next = new Set(expandedDepts);
    if (next.has(id)) {
      next.delete(id);
      setExpandedDepts(next);
      return;
    }

    next.add(id);
    setExpandedDepts(next);

    // Fetch details if not cached
    if (!deptDetails[id]) {
      setLoadingDept(id);
      try {
        const result = await interact("expand", { deptId: id }) as DeptDetails;
        if (result) {
          setDeptDetails(prev => ({ ...prev, [id]: result }));
        }
      } catch (err) {
        console.error("Failed to load department details:", err);
      } finally {
        setLoadingDept(null);
      }
    }
  };

  return (
    <div>
      {/* Table A: Employees */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Employees</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm" {...testAttr('table', 'employees')}>
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
                <tr key={i} className="border-t border-gray-800" {...testAttr('employee-name', emp.name)}>
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3 text-gray-400">{emp.role}</td>
                  <td className="px-4 py-3 font-mono" {...testAttr('dept-id')}>{emp.departmentId}</td>
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
          <table className="w-full text-sm" {...testAttr('table', 'departments')}>
            <thead>
              <tr className="bg-gray-900">
                <th className="px-4 py-3 text-left text-gray-400 font-medium w-8"></th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Dept ID</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Name</th>
              </tr>
            </thead>
            <tbody>
              {pageData.departments.map((dept) => (
                <tr key={dept.id} className="border-t border-gray-800" {...testAttr('dept-row', dept.id)}>
                  <td className="px-4 py-3" colSpan={3}>
                    <button
                      onClick={() => toggleDept(dept.id)}
                      className="w-full text-left flex items-center gap-3"
                      {...testAttr('expand-dept', dept.id)}
                    >
                      <span className="text-xs text-gray-500">
                        {expandedDepts.has(dept.id) ? "\u25BC" : "\u25B6"}
                      </span>
                      <span className="font-mono text-sm">{dept.id}</span>
                      <span className="text-sm">{dept.name}</span>
                    </button>
                    {expandedDepts.has(dept.id) && (
                      <div className="mt-2 ml-6 bg-gray-900/50 rounded-lg p-3 text-sm" {...testAttr('dept-details', dept.id)}>
                        {loadingDept === dept.id ? (
                          <div className="flex items-center py-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
                            <span className="ml-2 text-xs text-gray-400">Loading...</span>
                          </div>
                        ) : deptDetails[dept.id] ? (
                          <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                            <dt className="text-gray-500">Budget</dt>
                            <dd className="font-mono" {...testAttr('field', 'budget')}>${deptDetails[dept.id].budget.toLocaleString()}</dd>
                            <dt className="text-gray-500">Manager</dt>
                            <dd {...testAttr('field', 'manager')}>{deptDetails[dept.id].manager}</dd>
                            <dt className="text-gray-500">Location</dt>
                            <dd {...testAttr('field', 'location')}>{deptDetails[dept.id].location}</dd>
                            <dt className="text-gray-500">Headcount</dt>
                            <dd {...testAttr('field', 'headcount')}>{deptDetails[dept.id].headcount}</dd>
                          </dl>
                        ) : (
                          <p className="text-xs text-gray-500">No details available</p>
                        )}
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
          <table className="w-full text-sm" {...testAttr('table', 'projects')}>
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
                <tr key={proj.id} className="border-t border-gray-800" {...testAttr('project-id', proj.id)}>
                  <td className="px-4 py-3 font-mono text-xs">{proj.id}</td>
                  <td className="px-4 py-3">{proj.name}</td>
                  <td className="px-4 py-3 font-mono" {...testAttr('project-dept-id')}>{proj.departmentId}</td>
                  <td className="px-4 py-3 text-right font-mono" {...testAttr('project-budget')}>${proj.budget.toLocaleString()}</td>
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
