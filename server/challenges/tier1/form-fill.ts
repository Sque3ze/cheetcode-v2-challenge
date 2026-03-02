/**
 * Tier 1 Challenge: Form Fill (Round 4 — Field Transformations)
 *
 * 3 fields across 3 different disclosure mechanisms:
 * - Tab: A "Contact" tab alongside "Profile" — one field (e.g. city) is only there
 * - Inline expand: A "[+] Show full details" link reveals one field (e.g. role)
 * - Tooltip: Start date shown as "Joined: 2022" — clicking reveals full date "2022-03-15"
 *
 * Plus: 1 field requires a transformation before submission (salary_band, start_quarter, or dept_code).
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

type DisclosureType = "tab" | "expand" | "tooltip";
type TransformationType = "salary_band" | "start_quarter" | "dept_code";

interface SalaryBand { min: number; max: number; label: string; }

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
  fieldDisclosures: Array<{ field: string; type: DisclosureType }>;
  transformations: Array<{ field: string; type: TransformationType }>;
  salaryBands: SalaryBand[];
  variantIndex: number;
}

/** Fields always visible in Profile tab */
const ALWAYS_VISIBLE = ["name", "email", "department", "salary"] as const;
/** Fields that can be hidden behind disclosure mechanisms */
const HIDEABLE_FIELDS: Array<{ field: string; disclosureType: DisclosureType }> = [
  { field: "city", disclosureType: "tab" },        // Hidden in Contact tab
  { field: "role", disclosureType: "expand" },      // Hidden behind expand
  { field: "startDate", disclosureType: "tooltip" }, // Abbreviated, click to reveal
];

const SALARY_BANDS: SalaryBand[] = [
  { min: 0, max: 59999, label: "Junior" },
  { min: 60000, max: 99999, label: "Mid" },
  { min: 100000, max: 149999, label: "Senior" },
  { min: 150000, max: Infinity, label: "Executive" },
];

function getSalaryBand(salary: number): string {
  const band = SALARY_BANDS.find((b) => salary >= b.min && salary <= b.max);
  return band?.label ?? "Unknown";
}

function getStartQuarter(startDate: string): string {
  const month = parseInt(startDate.split("-")[1], 10);
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

function getDeptCode(department: string): string {
  return department.substring(0, 3).toUpperCase();
}

export const formFillChallenge: ChallengeDefinition<FormFillPageData> = {
  id: "tier1-form-fill",
  title: "Form Fill",
  tier: 1,
  description: "Read employee details (some hidden across tabs, expandable sections, and tooltips) and submit specific values — some require transformation.",

  instructions: (pageData) => {
    const fields = pageData.fieldsToFill.join(", ");
    const variants = [
      `Read the employee profile below and submit the following fields separated by a comma: ${fields}. Note: some fields are in other tabs, expandable sections, or abbreviated displays. Click to reveal full values. Some fields require transformation — check the reference notes on the page.`,
      `Look at the employee information. What are their ${fields}? Provide them comma-separated. Some data is in the Contact tab, some behind an expand link, and some abbreviated. Pay attention to any transformation rules.`,
      `From the profile data, extract and submit (comma-delimited): ${fields}. Check all tabs, expand any collapsed sections, and click abbreviated values. Apply any required transformations noted on the page.`,
      `The employee record shows various attributes across tabs and expandable areas. Submit these values joined by commas: ${fields}. Explore all disclosure mechanisms and apply transformation rules where needed.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const person = data.person();
    const variantIndex = data.int(0, 3);

    // Map each transformation to the field it replaces
    const transformFieldMap: Record<TransformationType, { originalField: string; newLabel: string }> = {
      salary_band: { originalField: "salary", newLabel: "salary band" },
      start_quarter: { originalField: "startDate", newLabel: "start quarter" },
      dept_code: { originalField: "department", newLabel: "dept code" },
    };

    // Pick 2 transformations (guarantees agent must always transform)
    const allTransformTypes: TransformationType[] = ["salary_band", "start_quarter", "dept_code"];
    const chosenTransforms = data.pickN(allTransformTypes, 2);

    // Build the set of transformed fields
    const transformedOriginals = new Set(chosenTransforms.map((t) => transformFieldMap[t].originalField));

    // Pick 1 visible field that is NOT being transformed (for variety)
    const availableVisible = ALWAYS_VISIBLE.filter(
      (f) => f !== "name" && !transformedOriginals.has(f),
    );
    const visibleField = availableVisible.length > 0
      ? data.pick(availableVisible)
      : data.pick(ALWAYS_VISIBLE.filter((f) => f !== "name"));

    // Build field list: 1 visible + 3 hidden
    const rawFields = [
      visibleField as string,
      ...HIDEABLE_FIELDS.map((h) => h.field),
    ];

    // Replace transformed fields with their new labels
    const fieldsToFill = rawFields.map((f) => {
      for (const t of chosenTransforms) {
        if (f === transformFieldMap[t].originalField) return transformFieldMap[t].newLabel;
      }
      return f;
    });

    // Shuffle to avoid predictable order
    const shuffled = data.pickN(fieldsToFill, fieldsToFill.length);

    const fieldDisclosures = HIDEABLE_FIELDS.map((h) => ({
      field: h.field,
      type: h.disclosureType,
    }));

    const transformations = chosenTransforms.map((t) => ({
      field: transformFieldMap[t].originalField,
      type: t,
    }));

    // Build field values, applying transformation where needed
    const fieldValues: Record<string, string> = {
      name: person.fullName,
      department: person.department,
      role: person.role,
      city: person.city,
      email: person.email,
      startDate: person.startDate,
      salary: `$${person.salary.toLocaleString()}`,
      // Transformed values
      "salary band": getSalaryBand(person.salary),
      "start quarter": getStartQuarter(person.startDate),
      "dept code": getDeptCode(person.department),
    };

    const answer = shuffled.map((f) => fieldValues[f]).join(", ");

    return {
      pageData: {
        employee: {
          name: person.fullName,
          email: person.email,
          department: person.department,
          role: person.role,
          salary: person.salary,
          city: person.city,
          startDate: person.startDate,
        },
        fieldsToFill: shuffled,
        fieldDisclosures,
        transformations,
        salaryBands: SALARY_BANDS.map((b) => ({
          min: b.min,
          max: b.max === Infinity ? 999999 : b.max,
          label: b.label,
        })),
        variantIndex,
      },
      answer,
    };
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const normalize = (s: string) =>
      s.trim().toLowerCase().split(",").map((p) => p.trim()).join(", ");
    return normalize(submitted) === normalize(correct);
  },
};
