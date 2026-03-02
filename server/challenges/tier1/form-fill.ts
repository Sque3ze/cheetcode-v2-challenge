/**
 * Tier 1 Challenge: Form Fill (Round 3 — Multiple Disclosure Mechanisms)
 *
 * 3 fields across 3 different disclosure mechanisms:
 * - Tab: A "Contact" tab alongside "Profile" — one field (e.g. city) is only there
 * - Inline expand: A "[+] Show full details" link reveals one field (e.g. role)
 * - Tooltip: Start date shown as "Joined: 2022" — clicking reveals full date "2022-03-15"
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

type DisclosureType = "tab" | "expand" | "tooltip";

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

export const formFillChallenge: ChallengeDefinition<FormFillPageData> = {
  id: "tier1-form-fill",
  title: "Form Fill",
  tier: 1,
  description: "Read employee details (some hidden across tabs, expandable sections, and tooltips) and submit specific values.",

  instructions: (pageData) => {
    const fields = pageData.fieldsToFill.join(", ");
    const variants = [
      `Read the employee profile below and submit the following fields separated by a comma: ${fields}. Note: some fields are in other tabs, expandable sections, or abbreviated displays. Click to reveal full values.`,
      `Look at the employee information. What are their ${fields}? Provide them comma-separated. Some data is in the Contact tab, some behind an expand link, and some abbreviated.`,
      `From the profile data, extract and submit (comma-delimited): ${fields}. Check all tabs, expand any collapsed sections, and click abbreviated values to see full details.`,
      `The employee record shows various attributes across tabs and expandable areas. Submit these values joined by commas: ${fields}. Explore all disclosure mechanisms.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const person = data.person();
    const variantIndex = data.int(0, 3);

    // Pick 3 fields: 1 visible + all 3 hidden fields
    const visibleField = data.pick(ALWAYS_VISIBLE.filter((f) => f !== "name"));
    const fieldsToFill = [
      visibleField as string,
      ...HIDEABLE_FIELDS.map((h) => h.field),
    ];

    // Shuffle to avoid predictable order
    const shuffled = data.pickN(fieldsToFill, fieldsToFill.length);

    const fieldDisclosures = HIDEABLE_FIELDS.map((h) => ({
      field: h.field,
      type: h.disclosureType,
    }));

    const fieldValues: Record<string, string> = {
      name: person.fullName,
      department: person.department,
      role: person.role,
      city: person.city,
      email: person.email,
      startDate: person.startDate,
      salary: `$${person.salary.toLocaleString()}`,
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
