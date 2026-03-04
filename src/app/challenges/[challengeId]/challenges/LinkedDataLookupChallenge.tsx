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
      <div style={{ marginBottom: 24 }}>
        <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Employees</h3>
        <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden" }}>
          <table className="w-full text-sm" {...testAttr('table', 'employees')}>
            <thead>
              <tr style={{ background: "#f3f3f3" }}>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Name</th>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Role</th>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Dept ID</th>
                <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Salary</th>
              </tr>
            </thead>
            <tbody>
              {pageData.employees.map((emp, i) => (
                <tr key={i} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('employee-name', emp.name)}>
                  <td style={{ padding: "12px 16px" }}>{emp.name}</td>
                  <td style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>{emp.role}</td>
                  <td className="font-mono" style={{ padding: "12px 16px" }} {...testAttr('dept-id')}>{emp.departmentId}</td>
                  <td className="text-right font-mono" style={{ padding: "12px 16px" }}>${emp.salary.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table B: Departments (expandable rows) */}
      <div style={{ marginBottom: 24 }}>
        <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Departments</h3>
        <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden" }}>
          <table className="w-full text-sm" {...testAttr('table', 'departments')}>
            <thead>
              <tr style={{ background: "#f3f3f3" }}>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)", width: 32 }}></th>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Dept ID</th>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Name</th>
              </tr>
            </thead>
            <tbody>
              {pageData.departments.map((dept) => (
                <tr key={dept.id} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('dept-row', dept.id)}>
                  <td style={{ padding: "12px 16px" }} colSpan={3}>
                    <button
                      onClick={() => toggleDept(dept.id)}
                      className="w-full text-left flex items-center"
                      style={{ gap: 12, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      {...testAttr('expand-dept', dept.id)}
                    >
                      <span className="text-xs" style={{ color: "rgba(38,38,38,0.35)" }}>
                        {expandedDepts.has(dept.id) ? "\u25BC" : "\u25B6"}
                      </span>
                      <span className="font-mono text-sm">{dept.id}</span>
                      <span className="text-sm">{dept.name}</span>
                    </button>
                    {expandedDepts.has(dept.id) && (
                      <div className="text-sm" style={{ marginTop: 8, marginLeft: 24, background: "rgba(0,0,0,0.02)", borderRadius: 8, padding: 12 }} {...testAttr('dept-details', dept.id)}>
                        {loadingDept === dept.id ? (
                          <div className="flex items-center" style={{ padding: "8px 0" }}>
                            <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
                            <span className="text-xs" style={{ marginLeft: 8, color: "rgba(38,38,38,0.5)" }}>Loading...</span>
                          </div>
                        ) : deptDetails[dept.id] ? (
                          <dl className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
                            <dt style={{ color: "rgba(38,38,38,0.35)" }}>Budget</dt>
                            <dd className="font-mono" {...testAttr('field', 'budget')}>${deptDetails[dept.id].budget.toLocaleString()}</dd>
                            <dt style={{ color: "rgba(38,38,38,0.35)" }}>Manager</dt>
                            <dd {...testAttr('field', 'manager')}>{deptDetails[dept.id].manager}</dd>
                            <dt style={{ color: "rgba(38,38,38,0.35)" }}>Location</dt>
                            <dd {...testAttr('field', 'location')}>{deptDetails[dept.id].location}</dd>
                            <dt style={{ color: "rgba(38,38,38,0.35)" }}>Headcount</dt>
                            <dd {...testAttr('field', 'headcount')}>{deptDetails[dept.id].headcount}</dd>
                          </dl>
                        ) : (
                          <p className="text-xs" style={{ color: "rgba(38,38,38,0.35)" }}>No details available</p>
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

      <div style={{ marginBottom: 24 }}>
        <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Projects</h3>
        <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden" }}>
          <table className="w-full text-sm" {...testAttr('table', 'projects')}>
            <thead>
              <tr style={{ background: "#f3f3f3" }}>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Project ID</th>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Name</th>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Dept ID</th>
                <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Budget</th>
                <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData.projects.map((proj) => (
                <tr key={proj.id} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('project-id', proj.id)}>
                  <td className="font-mono text-xs" style={{ padding: "12px 16px" }}>{proj.id}</td>
                  <td style={{ padding: "12px 16px" }}>{proj.name}</td>
                  <td className="font-mono" style={{ padding: "12px 16px" }} {...testAttr('project-dept-id')}>{proj.departmentId}</td>
                  <td className="text-right font-mono" style={{ padding: "12px 16px" }} {...testAttr('project-budget')}>${proj.budget.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>{proj.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
          Your Answer ({pageData.targetField})
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`Enter the ${pageData.targetField}...`}
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
