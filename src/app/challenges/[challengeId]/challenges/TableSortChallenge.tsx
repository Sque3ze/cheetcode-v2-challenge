"use client";

import { useState, useEffect, MutableRefObject } from "react";

interface Employee {
  name: string;
  department: string;
  salary: number;
  startDate: string;
}

interface TableSortPageData {
  employees: Employee[];
  sortColumn: string;
  sortDirection: "highest" | "lowest";
  targetPosition: number;
  targetField: string;
  rowsPerPage: number;
}

interface Props {
  pageData: TableSortPageData;
  answerRef: MutableRefObject<string>;
}

type SortKey = "name" | "department" | "salary" | "startDate";

export default function TableSortChallenge({ pageData, answerRef }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const employees = [...pageData.employees];

  if (sortKey) {
    employees.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "salary") cmp = a.salary - b.salary;
      else if (sortKey === "startDate") cmp = a.startDate.localeCompare(b.startDate);
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "department") cmp = a.department.localeCompare(b.department);
      return sortAsc ? cmp : -cmp;
    });
  }

  const perPage = pageData.rowsPerPage;
  const totalPages = Math.ceil(employees.length / perPage);
  const pageSlice = employees.slice(currentPage * perPage, (currentPage + 1) * perPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else { setSortKey(key); setSortAsc(true); }
    setSelectedRow(null);
    setCurrentPage(0);
  };

  const handleRowClick = (pageIndex: number) => {
    const globalIndex = currentPage * perPage + pageIndex;
    setSelectedRow(globalIndex);
    const emp = employees[globalIndex];
    const value = emp[pageData.targetField as keyof Employee];
    const newAnswer = String(value);
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
    { key: "salary", label: "Salary" },
    { key: "startDate", label: "Start Date" },
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
            {pageSlice.map((emp, i) => {
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
                  <td className="px-4 py-3 font-mono">${emp.salary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">{emp.startDate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-500">
          Page {currentPage + 1} of {totalPages} ({employees.length} total)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 transition-colors"
            data-page-prev
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 transition-colors"
            data-page-next
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
