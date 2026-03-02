"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface SalaryBand { min: number; max: number; label: string; }

interface FormFillPageData {
  employee: {
    name: string;
    email: string;
    department: string;
    salary: number;
    role?: string;
    city?: string;
    startDate?: string;
  };
  fieldsToFill: string[];
  fieldDisclosures?: Array<{ field: string; type: "tab" | "expand" | "tooltip" }>;
  transformations?: Array<{ field: string; type: "salary_band" | "start_quarter" | "dept_code" }>;
  salaryBands?: SalaryBand[];
}

interface Props {
  pageData: FormFillPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  department: "Department",
  role: "Role",
  salary: "Salary",
  city: "City",
  startDate: "Start Date",
  "salary band": "Salary Band",
  "start quarter": "Start Quarter",
  "dept code": "Dept Code",
};

export default function FormFillChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "contact">("profile");
  const [showExpand, setShowExpand] = useState(false);
  const [tooltipRevealed, setTooltipRevealed] = useState(false);
  const [role, setRole] = useState<string | null>(pageData.employee.role ?? null);
  const [city, setCity] = useState<string | null>(pageData.employee.city ?? null);
  const [startDate, setStartDate] = useState<string | null>(pageData.employee.startDate ?? null);
  const [loadingExpand, setLoadingExpand] = useState(false);
  const [loadingTab, setLoadingTab] = useState(false);
  const [loadingTooltip, setLoadingTooltip] = useState(false);
  const { employee, fieldsToFill, fieldDisclosures, salaryBands } = pageData;
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const hasDisclosures = fieldDisclosures && fieldDisclosures.length > 0;

  if (!hasDisclosures) {
    return <LegacyFormFill pageData={pageData} answerRef={answerRef} />;
  }

  const startYear = startDate ? startDate.split("-")[0] : "—";

  const handleExpand = async () => {
    if (!showExpand && role === null) {
      setLoadingExpand(true);
      try {
        const result = await interact("expand") as { role: string };
        if (result?.role) setRole(result.role);
      } catch (err) {
        console.error("Failed to load expand content:", err);
      } finally {
        setLoadingExpand(false);
      }
    }
    setShowExpand(!showExpand);
  };

  const handleContactTab = async () => {
    setActiveTab("contact");
    if (city === null) {
      setLoadingTab(true);
      try {
        const result = await interact("tab") as { city: string };
        if (result?.city) setCity(result.city);
      } catch (err) {
        console.error("Failed to load contact tab:", err);
      } finally {
        setLoadingTab(false);
      }
    }
  };

  const handleTooltip = async () => {
    if (!tooltipRevealed && startDate === null) {
      setLoadingTooltip(true);
      try {
        const result = await interact("tooltip") as { startDate: string };
        if (result?.startDate) setStartDate(result.startDate);
      } catch (err) {
        console.error("Failed to load tooltip:", err);
      } finally {
        setLoadingTooltip(false);
      }
    }
    setTooltipRevealed(!tooltipRevealed);
  };

  return (
    <div>
      {/* Salary Band Reference Table */}
      {salaryBands && salaryBands.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4" {...testAttr('salary-band-table')}>
          <h4 className="text-xs font-medium text-amber-400 mb-2">Salary Band Reference</h4>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {salaryBands.map((band) => (
              <div key={band.label} className="text-center" {...testAttr('salary-band', band.label)}>
                <p className="text-gray-200 font-medium">{band.label}</p>
                <p className="text-gray-500 font-mono">
                  {band.max >= 999999
                    ? `$${band.min.toLocaleString()}+`
                    : `$${band.min.toLocaleString()}-$${band.max.toLocaleString()}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-4" {...testAttr('dept-code-note')}>
        Dept codes: first 3 letters, uppercased (e.g., Engineering → ENG)
      </p>

      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-0">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "profile"
              ? "text-white border-b-2 border-blue-500 bg-gray-900"
              : "text-gray-400 hover:text-gray-200"
          }`}
          {...testAttr('form-tab', 'profile')}
        >
          Profile
        </button>
        <button
          onClick={handleContactTab}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "contact"
              ? "text-white border-b-2 border-blue-500 bg-gray-900"
              : "text-gray-400 hover:text-gray-200"
          }`}
          {...testAttr('form-tab', 'contact')}
        >
          Contact
        </button>
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 p-6 mb-4">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-400">Name</dt>
              <dd className="text-gray-100" {...testAttr('field', 'name')}>{employee.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Email</dt>
              <dd className="text-gray-100" {...testAttr('field', 'email')}>{employee.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Department</dt>
              <dd className="text-gray-100" {...testAttr('field', 'department')}>{employee.department}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Salary</dt>
              <dd className="text-gray-100" {...testAttr('field', 'salary')}>${employee.salary.toLocaleString()}</dd>
            </div>
          </dl>

          {/* Tooltip: Start date */}
          <div className="mt-4">
            <button
              onClick={handleTooltip}
              className="text-sm text-gray-400 hover:text-gray-200 cursor-pointer transition-colors"
              {...testAttr('tooltip-trigger')}
            >
              Joined: {startYear}
              {!tooltipRevealed && <span className="text-gray-600 ml-1">(click for details)</span>}
            </button>
            {loadingTooltip && (
              <span className="text-xs text-gray-500 ml-2">Loading...</span>
            )}
            {tooltipRevealed && startDate && (
              <p className="text-sm text-gray-100 mt-1" {...testAttr('field', 'startDate')}>
                {startDate}
              </p>
            )}
          </div>

          {/* Inline expand for role */}
          <div className="mt-4">
            <button
              onClick={handleExpand}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              {...testAttr('expand-details')}
            >
              {showExpand ? "[-] Hide full details" : "[+] Show full details"}
            </button>
            {loadingExpand && (
              <span className="text-xs text-gray-500 ml-2">Loading...</span>
            )}
            {showExpand && role && (
              <div className="mt-2 bg-gray-800/50 rounded p-3" {...testAttr('expand-panel')}>
                <dl>
                  <dt className="text-sm text-gray-400">Role</dt>
                  <dd className="text-gray-100" {...testAttr('field', 'role')}>{role}</dd>
                </dl>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact tab */}
      {activeTab === "contact" && (
        <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 p-6 mb-4" {...testAttr('contact-panel')}>
          {loadingTab ? (
            <div className="flex items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
              <span className="ml-3 text-sm text-gray-400">Loading...</span>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-400">City</dt>
                <dd className="text-gray-100" {...testAttr('field', 'city')}>{city ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Email</dt>
                <dd className="text-gray-100">{employee.email}</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      {/* Fields to submit */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Submit these fields (comma-separated): {fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}
        </h3>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`e.g. ${fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}`}
          className="w-full max-w-lg px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}

/** Legacy form fill for backward compatibility */
function LegacyFormFill({ pageData, answerRef }: { pageData: FormFillPageData; answerRef: MutableRefObject<string> }) {
  const [answer, setAnswer] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const { employee, fieldsToFill } = pageData;

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  return (
    <div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-4">
        <h3 className="text-lg font-semibold mb-4">Basic Info</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-400">Name</dt>
            <dd className="text-gray-100" {...testAttr('field', 'name')}>{employee.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400">Email</dt>
            <dd className="text-gray-100" {...testAttr('field', 'email')}>{employee.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400">Department</dt>
            <dd className="text-gray-100" {...testAttr('field', 'department')}>{employee.department}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400">Salary</dt>
            <dd className="text-gray-100" {...testAttr('field', 'salary')}>${employee.salary.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-2"
          {...testAttr('toggle-details')}
        >
          <span className="text-xs">{showDetails ? "\u25BC" : "\u25B6"}</span>
          Details
        </button>
        {showDetails && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6" {...testAttr('details-panel')}>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-400">Role</dt>
                <dd className="text-gray-100" {...testAttr('field', 'role')}>{employee.role}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">City</dt>
                <dd className="text-gray-100" {...testAttr('field', 'city')}>{employee.city}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Start Date</dt>
                <dd className="text-gray-100" {...testAttr('field', 'startDate')}>{employee.startDate}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Submit these fields (comma-separated): {fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}
        </h3>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`e.g. ${fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}`}
          className="w-full max-w-lg px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
