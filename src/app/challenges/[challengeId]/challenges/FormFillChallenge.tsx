"use client";

import { useState, useEffect, MutableRefObject } from "react";

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
  basicFields: string[];
  detailFields: string[];
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
  const [showDetails, setShowDetails] = useState(false);
  const { employee, fieldsToFill } = pageData;

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const getFieldValue = (field: string): string => {
    switch (field) {
      case "name": return employee.name;
      case "email": return employee.email;
      case "department": return employee.department;
      case "role": return employee.role;
      case "salary": return `$${employee.salary.toLocaleString()}`;
      case "city": return employee.city;
      case "startDate": return employee.startDate;
      default: return "";
    }
  };

  return (
    <div>
      {/* Basic Info — always visible */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-4">
        <h3 className="text-lg font-semibold mb-4">Basic Info</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-400">Name</dt>
            <dd className="text-gray-100" data-field="name">{employee.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400">Email</dt>
            <dd className="text-gray-100" data-field="email">{employee.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400">Department</dt>
            <dd className="text-gray-100" data-field="department">{employee.department}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400">Salary</dt>
            <dd className="text-gray-100" data-field="salary">${employee.salary.toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      {/* Details — collapsed by default */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-2"
          data-toggle-details
        >
          <span className="text-xs">{showDetails ? "▼" : "▶"}</span>
          Details
        </button>
        {showDetails && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6" data-details-panel>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-400">Role</dt>
                <dd className="text-gray-100" data-field="role">{employee.role}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">City</dt>
                <dd className="text-gray-100" data-field="city">{employee.city}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Start Date</dt>
                <dd className="text-gray-100" data-field="startDate">{employee.startDate}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

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
