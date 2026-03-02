/**
 * Tier 1 Challenge: Form Fill (Minor Tweak)
 *
 * Changes: Split profile into visible "Basic Info" and collapsed "Details" accordion.
 * At least one fieldsToFill is guaranteed to be in the collapsed section.
 * Forces an expand click.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

/** Fields shown in Basic Info (always visible) */
const BASIC_FIELDS = ["name", "email", "department"] as const;
/** Fields hidden in Details accordion */
const DETAIL_FIELDS = ["role", "city", "startDate"] as const;

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
  /** Which section each field belongs to */
  basicFields: string[];
  detailFields: string[];
}

export const formFillChallenge: ChallengeDefinition<FormFillPageData> = {
  id: "tier1-form-fill",
  title: "Form Fill",
  tier: 1,
  description: "Read employee details (some hidden) and fill out a form with specific values.",

  instructions: (pageData) => {
    const fieldLabels = pageData.fieldsToFill.join(", ");
    return `Read the employee profile below and submit the following fields separated by a comma: ${fieldLabels}. Note: some fields may be in the collapsed "Details" section.`;
  },

  generate(data: ChallengeData) {
    const person = data.person();

    // Guarantee at least one field from details section
    const detailField = data.pick(DETAIL_FIELDS);
    const basicField = data.pick(BASIC_FIELDS.filter((f) => f !== "name"));
    const fieldsToFill = [basicField, detailField] as string[];

    const fieldValues: Record<string, string> = {
      name: person.fullName,
      department: person.department,
      role: person.role,
      city: person.city,
      email: person.email,
      startDate: person.startDate,
    };

    const answer = fieldsToFill.map((f) => fieldValues[f]).join(", ");

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
        fieldsToFill: [...fieldsToFill],
        basicFields: [...BASIC_FIELDS],
        detailFields: [...DETAIL_FIELDS],
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
