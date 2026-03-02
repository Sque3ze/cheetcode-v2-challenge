"use client";

import { useState, useEffect, useMemo, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";

interface Employee {
  name: string;
  department: string;
  salary: number;
  city: string;
  age: number;
}

interface FilterSearchPageData {
  employees: Employee[];
  filterConditions: Array<{ field: string; value: string }>;
  aggregation: "count" | "total salary" | "average salary";
  employeesPerPage: number;
}

interface Props {
  pageData: FilterSearchPageData;
  answerRef: MutableRefObject<string>;
}

export default function FilterSearchChallenge({ pageData, answerRef }: Props) {
  const [filterText, setFilterText] = useState("");
  const [answer, setAnswer] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const filtered = useMemo(() => {
    if (!filterText.trim()) return pageData.employees;
    const query = filterText.toLowerCase();
    return pageData.employees.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query) ||
        e.city.toLowerCase().includes(query)
    );
  }, [pageData.employees, filterText]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [filterText]);

  const perPage = pageData.employeesPerPage;
  const totalPages = Math.ceil(filtered.length / perPage);
  const pageSlice = filtered.slice(currentPage * perPage, (currentPage + 1) * perPage);

  return (
    <div>
      {/* Search input */}
      <div className="mb-4">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Type to filter employees..."
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          {...testAttr('testid', 'filter-input')}
        />
        <p className="mt-1 text-xs text-gray-500">
          Showing {filtered.length} of {pageData.employees.length} employees
        </p>
      </div>

      {/* Employee table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800 mb-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900">
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Name</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Department</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Salary</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">City</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((emp, i) => (
              <tr key={i} className="border-t border-gray-800">
                <td className="px-4 py-3">{emp.name}</td>
                <td className="px-4 py-3 text-gray-400">{emp.department}</td>
                <td className="px-4 py-3 text-right font-mono">${emp.salary.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-400">{emp.city}</td>
                <td className="px-4 py-3 text-right text-gray-400">{emp.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-gray-500">
          Page {currentPage + 1} of {totalPages} ({filtered.length} results)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 transition-colors"
            {...testAttr('page-prev')}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 transition-colors"
            {...testAttr('page-next')}
          >
            Next
          </button>
        </div>
      </div>

      {/* Answer input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Your Answer</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={
            pageData.aggregation === "count"
              ? "Enter the count..."
              : pageData.aggregation === "average salary"
                ? "Enter the average salary..."
                : "Enter the total salary..."
          }
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
