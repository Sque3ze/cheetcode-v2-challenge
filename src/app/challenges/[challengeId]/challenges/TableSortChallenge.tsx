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
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                >
                  {col.label}{getSortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingPage ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  <div className="animate-spin inline-block rounded-full h-6 w-6 border-b-2 border-blue-400 mr-2" />
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
                    className={`border-t border-gray-800 cursor-pointer transition-colors ${
                      selectedRow === globalIndex ? "bg-blue-500/10" : "hover:bg-gray-900/50"
                    }`}
                  >
                    <td className="px-4 py-3">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-400">{emp.department}</td>
                    <td className="px-4 py-3 text-gray-400">{emp.type}</td>
                    <td className="px-4 py-3 font-mono">
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

      {/* Pagination controls */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-500">
          Page {currentPage + 1} of {totalPages} ({totalEmployees} total)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 transition-colors"
            {...testAttr('page-prev')}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 transition-colors"
            {...testAttr('page-next')}
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6">
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
