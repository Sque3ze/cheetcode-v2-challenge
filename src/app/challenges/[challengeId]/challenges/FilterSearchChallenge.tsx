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
  initialVisibleCount?: number;
}

interface Props {
  pageData: FilterSearchPageData;
  answerRef: MutableRefObject<string>;
}

export default function FilterSearchChallenge({ pageData, answerRef }: Props) {
  const [filterText, setFilterText] = useState("");
  const [answer, setAnswer] = useState("");
  const initialVisible = pageData.initialVisibleCount ?? 12;
  const [visibleCount, setVisibleCount] = useState(initialVisible);

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

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(initialVisible);
  }, [filterText, initialVisible]);

  const visibleEmployees = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visibleCount;

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
          Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} matching ({pageData.employees.length} total)
        </p>
      </div>

      {/* Employee cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4" {...testAttr('employee-grid')}>
        {visibleEmployees.map((emp, i) => (
          <div
            key={i}
            className="bg-gray-900 rounded-lg border border-gray-800 p-4"
            {...testAttr('employee-card', emp.name)}
          >
            <h4 className="font-medium text-gray-100 mb-3 text-base">{emp.name}</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Department</span>
                <span className="text-gray-300" {...testAttr('emp-department')}>{emp.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Salary</span>
                <span className="text-gray-300 font-mono" {...testAttr('emp-salary')}>${emp.salary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">City</span>
                <span className="text-gray-300" {...testAttr('emp-city')}>{emp.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Age</span>
                <span className="text-gray-300" {...testAttr('emp-age')}>{emp.age}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More button — disappears when all loaded */}
      {remaining > 0 && (
        <div className="mb-6 text-center">
          <button
            onClick={() => setVisibleCount((v) => v + initialVisible)}
            className="px-6 py-2 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-gray-300"
            {...testAttr('load-more')}
          >
            Load More ({remaining} remaining)
          </button>
        </div>
      )}

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
