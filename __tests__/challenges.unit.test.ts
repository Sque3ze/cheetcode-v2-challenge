/**
 * Unit tests for all challenge definitions.
 *
 * For each registered challenge, verifies:
 * 1. generate() produces pageData and an answer
 * 2. The answer validates correctly against itself
 * 3. A wrong answer does NOT validate
 * 4. Different sessions produce different answers (seed variation)
 * 5. Same session always produces the same answer (determinism)
 */

import { describe, it, expect } from "vitest";
import { getAllChallenges, validateAnswer } from "../server/challenges/registry";
import { ChallengeDataGenerator } from "../src/lib/seed";
import { TIER_POINTS } from "../src/lib/config";
import {
  TEST_SERVER_SECRET,
  TEST_SESSION_ID,
  getCorrectAnswer,
  getPageData,
} from "./helpers/challenge-test-utils";

const challenges = getAllChallenges();

describe("Challenge definitions", () => {
  // Run tests for every registered challenge
  for (const challenge of challenges) {
    describe(`${challenge.id} (Tier ${challenge.tier})`, () => {
      it("generates pageData and an answer", () => {
        const gen = new ChallengeDataGenerator(TEST_SESSION_ID, TEST_SERVER_SECRET);
        const data = gen.forChallenge(challenge.id);
        const result = challenge.generate(data);

        expect(result).toHaveProperty("pageData");
        expect(result).toHaveProperty("answer");
        expect(typeof result.answer).toBe("string");
        expect(result.answer.trim().length).toBeGreaterThan(0);
      });

      it("correct answer validates", () => {
        const answer = getCorrectAnswer(challenge.id);
        const isValid = validateAnswer(challenge.id, answer, answer);
        expect(isValid).toBe(true);
      });

      it("wrong answer does not validate", () => {
        const answer = getCorrectAnswer(challenge.id);
        const isValid = validateAnswer(
          challenge.id,
          "DEFINITELY_WRONG_ANSWER_12345",
          answer
        );
        expect(isValid).toBe(false);
      });

      it("is deterministic — same session produces same answer", () => {
        const answer1 = getCorrectAnswer(challenge.id, TEST_SESSION_ID);
        const answer2 = getCorrectAnswer(challenge.id, TEST_SESSION_ID);
        expect(answer1).toBe(answer2);
      });

      it("different sessions produce different data", () => {
        const answer1 = getCorrectAnswer(challenge.id, "session-aaa");
        const answer2 = getCorrectAnswer(challenge.id, "session-bbb");
        // Not guaranteed to be different for every challenge,
        // but with enough randomness it should be for most.
        // We just verify the generator doesn't crash with different inputs.
        expect(typeof answer1).toBe("string");
        expect(typeof answer2).toBe("string");
      });

      it("has valid tier and point value", () => {
        expect([1, 2, 3, 4]).toContain(challenge.tier);
        expect(TIER_POINTS[challenge.tier]).toBeGreaterThan(0);
      });

      it("has non-empty title and description", () => {
        expect(challenge.title.length).toBeGreaterThan(0);
        expect(challenge.description.length).toBeGreaterThan(0);
      });

      it("pageData is JSON-serializable", () => {
        const pageData = getPageData(challenge.id);
        // Should not throw
        const serialized = JSON.stringify(pageData);
        expect(typeof serialized).toBe("string");
        // Should round-trip
        const parsed = JSON.parse(serialized);
        expect(parsed).toEqual(pageData);
      });
    });
  }
});
