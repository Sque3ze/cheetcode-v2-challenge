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

  const startYear = startDate ? startDate.split("-")[0] : "\u2014";

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
      {salaryBands && salaryBands.length > 0 && (
        <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 16 }} {...testAttr('salary-band-table')}>
          <h4 className="text-xs font-medium" style={{ color: "#b45309", marginBottom: 8 }}>Salary Band Reference</h4>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${salaryBands.length}, 1fr)`, gap: 8, fontSize: 12 }}>
            {salaryBands.map((band) => (
              <div key={band.label} style={{ textAlign: "center" }} {...testAttr('salary-band', band.label)}>
                <p className="font-medium" style={{ color: "#262626" }}>{band.label}</p>
                <p className="font-mono" style={{ color: "rgba(38,38,38,0.35)" }}>
                  {band.max >= 999999
                    ? `$${band.min.toLocaleString()}+`
                    : `$${band.min.toLocaleString()}-$${band.max.toLocaleString()}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: "rgba(38,38,38,0.35)", marginBottom: 16 }} {...testAttr('dept-code-note')}>
        Dept codes: first 3 letters, uppercased (e.g., Engineering &rarr; ENG)
      </p>

      <div className="flex" style={{ borderBottom: "1px solid #e8e8e8" }}>
        <button
          onClick={() => setActiveTab("profile")}
          className="text-sm font-medium"
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            cursor: "pointer",
            ...(activeTab === "profile"
              ? { color: "#fa5d19", borderBottom: "2px solid #fa5d19" }
              : { color: "rgba(38,38,38,0.5)" }),
          }}
          {...testAttr('form-tab', 'profile')}
        >
          Profile
        </button>
        <button
          onClick={handleContactTab}
          className="text-sm font-medium"
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            cursor: "pointer",
            ...(activeTab === "contact"
              ? { color: "#fa5d19", borderBottom: "2px solid #fa5d19" }
              : { color: "rgba(38,38,38,0.5)" }),
          }}
          {...testAttr('form-tab', 'contact')}
        >
          Contact
        </button>
      </div>

      {activeTab === "profile" && (
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 24, marginBottom: 16 }}>
          <dl className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Name</dt>
              <dd style={{ color: "#262626" }} {...testAttr('field', 'name')}>{employee.name}</dd>
            </div>
            <div>
              <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Email</dt>
              <dd style={{ color: "#262626" }} {...testAttr('field', 'email')}>{employee.email}</dd>
            </div>
            <div>
              <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Department</dt>
              <dd style={{ color: "#262626" }} {...testAttr('field', 'department')}>{employee.department}</dd>
            </div>
            <div>
              <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Salary</dt>
              <dd style={{ color: "#262626" }} {...testAttr('field', 'salary')}>${employee.salary.toLocaleString()}</dd>
            </div>
          </dl>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={handleTooltip}
              className="text-sm"
              style={{ color: "rgba(38,38,38,0.5)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              {...testAttr('tooltip-trigger')}
            >
              Joined: {startYear}
              {!tooltipRevealed && <span style={{ color: "rgba(38,38,38,0.35)", marginLeft: 4 }}>(click for details)</span>}
            </button>
            {loadingTooltip && (
              <span className="text-xs" style={{ color: "rgba(38,38,38,0.35)", marginLeft: 8 }}>Loading...</span>
            )}
            {tooltipRevealed && startDate && (
              <p className="text-sm" style={{ color: "#262626", marginTop: 4 }} {...testAttr('field', 'startDate')}>
                {startDate}
              </p>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={handleExpand}
              className="text-sm"
              style={{ color: "#fa5d19", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              {...testAttr('expand-details')}
            >
              {showExpand ? "[-] Hide full details" : "[+] Show full details"}
            </button>
            {loadingExpand && (
              <span className="text-xs" style={{ color: "rgba(38,38,38,0.35)", marginLeft: 8 }}>Loading...</span>
            )}
            {showExpand && role && (
              <div style={{ marginTop: 8, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: 12 }} {...testAttr('expand-panel')}>
                <dl>
                  <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Role</dt>
                  <dd style={{ color: "#262626" }} {...testAttr('field', 'role')}>{role}</dd>
                </dl>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "contact" && (
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 24, marginBottom: 16 }} {...testAttr('contact-panel')}>
          {loadingTab ? (
            <div className="flex items-center" style={{ padding: "16px 0" }}>
              <div className="animate-spin" style={{ width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
              <span className="text-sm" style={{ marginLeft: 12, color: "rgba(38,38,38,0.5)" }}>Loading...</span>
            </div>
          ) : (
            <dl className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>City</dt>
                <dd style={{ color: "#262626" }} {...testAttr('field', 'city')}>{city ?? "\u2014"}</dd>
              </div>
              <div>
                <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Email</dt>
                <dd style={{ color: "#262626" }}>{employee.email}</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      <div className="card-surface" style={{ borderRadius: 12, padding: 24 }}>
        <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 12 }}>
          Submit these fields (comma-separated): {fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}
        </h3>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`e.g. ${fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}`}
          style={{ width: "100%", maxWidth: 512, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
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
      <div className="card-surface" style={{ borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 className="text-lg font-semibold" style={{ marginBottom: 16 }}>Basic Info</h3>
        <dl className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Name</dt>
            <dd style={{ color: "#262626" }} {...testAttr('field', 'name')}>{employee.name}</dd>
          </div>
          <div>
            <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Email</dt>
            <dd style={{ color: "#262626" }} {...testAttr('field', 'email')}>{employee.email}</dd>
          </div>
          <div>
            <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Department</dt>
            <dd style={{ color: "#262626" }} {...testAttr('field', 'department')}>{employee.department}</dd>
          </div>
          <div>
            <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Salary</dt>
            <dd style={{ color: "#262626" }} {...testAttr('field', 'salary')}>${employee.salary.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center text-sm"
          style={{ gap: 8, color: "rgba(38,38,38,0.35)", background: "none", border: "none", padding: 0, cursor: "pointer", marginBottom: 8 }}
          {...testAttr('toggle-details')}
        >
          <span className="text-xs">{showDetails ? "\u25BC" : "\u25B6"}</span>
          Details
        </button>
        {showDetails && (
          <div className="card-surface" style={{ borderRadius: 12, padding: 24 }} {...testAttr('details-panel')}>
            <dl className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Role</dt>
                <dd style={{ color: "#262626" }} {...testAttr('field', 'role')}>{employee.role}</dd>
              </div>
              <div>
                <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>City</dt>
                <dd style={{ color: "#262626" }} {...testAttr('field', 'city')}>{employee.city}</dd>
              </div>
              <div>
                <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Start Date</dt>
                <dd style={{ color: "#262626" }} {...testAttr('field', 'startDate')}>{employee.startDate}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
      <div className="card-surface" style={{ borderRadius: 12, padding: 24 }}>
        <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 12 }}>
          Submit these fields (comma-separated): {fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}
        </h3>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`e.g. ${fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}`}
          style={{ width: "100%", maxWidth: 512, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
