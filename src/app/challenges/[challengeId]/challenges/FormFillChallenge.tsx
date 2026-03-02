"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";

interface FormFillPageData {
  employee: {
    name: string;
    email: string;
    department: string;
    role: string;
    salary: number;
    city: string;
    startDate: string;
  };
  fieldsToFill: string[];
  fieldDisclosures?: Array<{ field: string; type: "tab" | "expand" | "tooltip" }>;
}

interface Props {
  pageData: FormFillPageData;
  answerRef: MutableRefObject<string>;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  department: "Department",
  role: "Role",
  salary: "Salary",
  city: "City",
  startDate: "Start Date",
};

export default function FormFillChallenge({ pageData, answerRef }: Props) {
  const [answer, setAnswer] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "contact">("profile");
  const [showExpand, setShowExpand] = useState(false);
  const [tooltipRevealed, setTooltipRevealed] = useState(false);
  const { employee, fieldsToFill, fieldDisclosures } = pageData;

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  // Check if we have multi-disclosure mode (Round 3)
  const hasDisclosures = fieldDisclosures && fieldDisclosures.length > 0;

  if (!hasDisclosures) {
    // Legacy mode: Basic Info + Details accordion (for backward compatibility)
    return <LegacyFormFill pageData={pageData} answerRef={answerRef} />;
  }

  // Abbreviated start date (just year) for tooltip display
  const startYear = employee.startDate.split("-")[0];

  return (
    <div>
      {/* Tab bar: Profile | Contact */}
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
          onClick={() => setActiveTab("contact")}
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

      {/* Profile tab — basic visible fields + expand + tooltip */}
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

          {/* Tooltip: Start date abbreviated */}
          <div className="mt-4">
            <button
              onClick={() => setTooltipRevealed(!tooltipRevealed)}
              className="text-sm text-gray-400 hover:text-gray-200 cursor-pointer transition-colors"
              {...testAttr('tooltip-trigger')}
            >
              Joined: {startYear}
              {!tooltipRevealed && <span className="text-gray-600 ml-1">(click for details)</span>}
            </button>
            {tooltipRevealed && (
              <p className="text-sm text-gray-100 mt-1" {...testAttr('field', 'startDate')}>
                {employee.startDate}
              </p>
            )}
          </div>

          {/* Inline expand for role */}
          <div className="mt-4">
            <button
              onClick={() => setShowExpand(!showExpand)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              {...testAttr('expand-details')}
            >
              {showExpand ? "[-] Hide full details" : "[+] Show full details"}
            </button>
            {showExpand && (
              <div className="mt-2 bg-gray-800/50 rounded p-3" {...testAttr('expand-panel')}>
                <dl>
                  <dt className="text-sm text-gray-400">Role</dt>
                  <dd className="text-gray-100" {...testAttr('field', 'role')}>{employee.role}</dd>
                </dl>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact tab — city field */}
      {activeTab === "contact" && (
        <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 p-6 mb-4" {...testAttr('contact-panel')}>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-400">City</dt>
              <dd className="text-gray-100" {...testAttr('field', 'city')}>{employee.city}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Email</dt>
              <dd className="text-gray-100">{employee.email}</dd>
            </div>
          </dl>
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

/** Legacy form fill for backward compatibility (Basic Info + Details accordion) */
function LegacyFormFill({ pageData, answerRef }: Props) {
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
