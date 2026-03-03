"use client";

import { useState, useEffect, useMemo, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

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
  totalEmployees?: number;
}

interface Props {
  pageData: FilterSearchPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function FilterSearchChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [filterText, setFilterText] = useState("");
  const [answer, setAnswer] = useState("");
  const [allEmployees, setAllEmployees] = useState<Employee[]>(pageData.employees);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(
    !pageData.totalEmployees || pageData.employees.length >= pageData.totalEmployees
  );
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const filtered = useMemo(() => {
    if (!filterText.trim()) return allEmployees;
    const query = filterText.toLowerCase();
    return allEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query) ||
        e.city.toLowerCase().includes(query)
    );
  }, [allEmployees, filterText]);

  const handleLoadMore = async () => {
    if (allLoaded || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = Math.ceil(allEmployees.length / pageData.employeesPerPage);
      const result = await interact("page", { page }) as { employees: Employee[] };
      if (result?.employees?.length) {
        setAllEmployees(prev => [...prev, ...result.employees]);
      }
      if (!result?.employees?.length ||
          allEmployees.length + (result?.employees?.length ?? 0) >= (pageData.totalEmployees ?? Infinity)) {
        setAllLoaded(true);
      }
    } catch (err) {
      console.error("Failed to load more employees:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      {/* Search input */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Type to filter employees..."
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
          {...testAttr('testid', 'filter-input')}
        />
        <p className="text-xs" style={{ marginTop: 4, color: "rgba(38,38,38,0.35)" }}>
          Showing {filtered.length} matching ({allEmployees.length} loaded{pageData.totalEmployees ? `, ${pageData.totalEmployees} total` : ""})
        </p>
      </div>

      {/* Employee cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 16, marginBottom: 16 }} {...testAttr('employee-grid')}>
        {filtered.map((emp, i) => (
          <div
            key={i}
            className="card-surface"
            style={{ borderRadius: 12, padding: 16 }}
            {...testAttr('employee-card', emp.name)}
          >
            <h4 className="font-medium text-base" style={{ color: "#262626", marginBottom: 12 }}>{emp.name}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }} className="text-sm">
              <div className="flex justify-between">
                <span style={{ color: "rgba(38,38,38,0.35)" }}>Department</span>
                <span style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('emp-department')}>{emp.department}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "rgba(38,38,38,0.35)" }}>Salary</span>
                <span className="font-mono" style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('emp-salary')}>${emp.salary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "rgba(38,38,38,0.35)" }}>City</span>
                <span style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('emp-city')}>{emp.city}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "rgba(38,38,38,0.35)" }}>Age</span>
                <span style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('emp-age')}>{emp.age}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More button */}
      {!allLoaded && (
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn-ghost text-sm"
            style={{ padding: "8px 24px", borderRadius: 8 }}
            {...testAttr('load-more')}
          >
            {loadingMore ? "Loading..." : `Load More (${(pageData.totalEmployees ?? 0) - allEmployees.length} remaining)`}
          </button>
        </div>
      )}

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Your Answer</label>
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
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
