"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface Employee {
  name: string;
  department: string;
  type: "Salary" | "Hourly";
  salary?: number;
  hourlyRate?: number;
  hoursPerWeek?: number;
}

interface TableSortPageData {
  employees: Employee[];
  totalEmployees?: number;
  sortDirection: "highest" | "lowest";
  targetPosition: number;
  targetField: string;
  rowsPerPage: number;
}

interface Props {
  pageData: TableSortPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

type SortKey = "name" | "department" | "compensation" | "type";

function getAnnualComp(emp: Employee): number {
  if (emp.type === "Hourly" && emp.hourlyRate && emp.hoursPerWeek) {
    return emp.hourlyRate * emp.hoursPerWeek * 52;
  }
  return emp.salary ?? 0;
}

export default function TableSortChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Employee[]>(pageData.employees);
  const [loadingPage, setLoadingPage] = useState(false);
  const interact = useInteract(challengeId, sessionId, renderToken);

  const totalEmployees = pageData.totalEmployees ?? allEmployees.length;
  const perPage = pageData.rowsPerPage;
  const totalPages = Math.ceil(totalEmployees / perPage);

  // Fetch additional pages as needed
  const ensurePage = async (page: number) => {
    const neededUpTo = (page + 1) * perPage;
    if (allEmployees.length >= neededUpTo || allEmployees.length >= totalEmployees) return;
    setLoadingPage(true);
    try {
      const fetchPage = Math.ceil(allEmployees.length / perPage);
      const result = await interact("page", { page: fetchPage }) as { employees: Employee[] };
      if (result?.employees?.length) {
        setAllEmployees(prev => [...prev, ...result.employees]);
      }
    } catch (err) {
      console.error("Failed to load page:", err);
    } finally {
      setLoadingPage(false);
    }
  };

  const employees = [...allEmployees];

  if (sortKey) {
    employees.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "compensation") cmp = getAnnualComp(a) - getAnnualComp(b);
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "department") cmp = a.department.localeCompare(b.department);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      return sortAsc ? cmp : -cmp;
    });
  }

  const pageSlice = employees.slice(currentPage * perPage, (currentPage + 1) * perPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else { setSortKey(key); setSortAsc(true); }
    setSelectedRow(null);
    setCurrentPage(0);
  };

  const handlePageChange = async (newPage: number) => {
    await ensurePage(newPage);
    setCurrentPage(newPage);
  };

  const handleRowClick = (pageIndex: number) => {
    const globalIndex = currentPage * perPage + pageIndex;
    setSelectedRow(globalIndex);
    const emp = employees[globalIndex];
    const newAnswer = emp.name;
    setAnswer(newAnswer);
    answerRef.current = newAnswer;
  };

  useEffect(() => { answerRef.current = answer; }, [answer, answerRef]);

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortAsc ? " \u2191" : " \u2193";
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "department", label: "Department" },
    { key: "type", label: "Type" },
    { key: "compensation", label: "Annual Compensation" },
  ];

  return (
    <div>
      <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#f3f3f3" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left font-medium select-none"
                  style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)", cursor: "pointer" }}
                >
                  {col.label}{getSortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingPage ? (
              <tr>
                <td colSpan={4} style={{ padding: "32px 16px", textAlign: "center", color: "rgba(38,38,38,0.5)" }}>
                  <div className="animate-spin" style={{ display: "inline-block", width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19", marginRight: 8 }} />
                  Loading...
                </td>
              </tr>
            ) : (
              pageSlice.map((emp, i) => {
                const globalIndex = currentPage * perPage + i;
                return (
                  <tr
                    key={`${emp.name}-${globalIndex}`}
                    onClick={() => handleRowClick(i)}
                    style={{
                      borderTop: "1px solid #e8e8e8",
                      cursor: "pointer",
                      background: selectedRow === globalIndex ? "rgba(250,93,25,0.04)" : undefined,
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>{emp.name}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>{emp.department}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>{emp.type}</td>
                    <td className="font-mono" style={{ padding: "12px 16px" }}>
                      {emp.type === "Hourly"
                        ? `$${emp.hourlyRate?.toFixed(2)}/hr \u00d7 ${emp.hoursPerWeek} hrs/wk`
                        : `$${(emp.salary ?? 0).toLocaleString()}`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
        <p className="text-xs" style={{ color: "rgba(38,38,38,0.35)" }}>
          Page {currentPage + 1} of {totalPages} ({totalEmployees} total)
        </p>
        <div className="flex" style={{ gap: 8 }}>
          <button
            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="btn-ghost text-sm"
            style={{ padding: "4px 12px", borderRadius: 6 }}
            {...testAttr('page-prev')}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="btn-ghost text-sm"
            style={{ padding: "4px 12px", borderRadius: 6 }}
            {...testAttr('page-next')}
          >
            Next
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
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
