/**
 * Test utilities for challenge verification.
 *
 * Provides deterministic seed generation and answer computation
 * for both unit tests and E2E solvers.
 */

import { ChallengeDataGenerator } from "../../src/lib/seed";
import {
  getAllChallenges,
  getChallenge,
  validateAnswer,
} from "../../server/challenges/registry";
import { TIER_POINTS } from "../../src/lib/config";

// Fixed test constants — same every run
export const TEST_SERVER_SECRET = "test-secret-fixed-for-determinism";
export const TEST_SESSION_ID = "test-session-001";
export const TEST_DEV_USER = "dev-user";

/**
 * Get the correct answer for a challenge given a sessionId.
 * Uses the same logic the server validation API uses.
 */
export function getCorrectAnswer(
  challengeId: string,
  sessionId: string = TEST_SESSION_ID,
  serverSecret: string = TEST_SERVER_SECRET
): string {
  const challenge = getChallenge(challengeId);
  if (!challenge) throw new Error(`Challenge not found: ${challengeId}`);

  const gen = new ChallengeDataGenerator(sessionId, serverSecret);
  const data = gen.forChallenge(challengeId);
  const { answer } = challenge.generate(data);
  return answer;
}

/**
 * Get the page data for a challenge (what the client sees).
 */
export function getPageData(
  challengeId: string,
  sessionId: string = TEST_SESSION_ID,
  serverSecret: string = TEST_SERVER_SECRET
): unknown {
  const challenge = getChallenge(challengeId);
  if (!challenge) throw new Error(`Challenge not found: ${challengeId}`);

  const gen = new ChallengeDataGenerator(sessionId, serverSecret);
  const data = gen.forChallenge(challengeId);
  const { pageData } = challenge.generate(data);
  return pageData;
}

/**
 * Verify that a submitted answer is correct for a challenge.
 */
export function verifyAnswer(
  challengeId: string,
  submitted: string,
  sessionId: string = TEST_SESSION_ID,
  serverSecret: string = TEST_SERVER_SECRET
): boolean {
  const correct = getCorrectAnswer(challengeId, sessionId, serverSecret);
  return validateAnswer(challengeId, submitted, correct);
}

/**
 * Get all challenges with their correct answers for a session.
 * Useful for building E2E solvers.
 */
export function getAllAnswers(
  sessionId: string = TEST_SESSION_ID,
  serverSecret: string = TEST_SERVER_SECRET
): Array<{
  id: string;
  title: string;
  tier: number;
  points: number;
  answer: string;
  pageData: unknown;
}> {
  const challenges = getAllChallenges();
  const gen = new ChallengeDataGenerator(sessionId, serverSecret);

  return challenges.map((challenge) => {
    const data = gen.forChallenge(challenge.id);
    const generated = challenge.generate(data);
    return {
      id: challenge.id,
      title: challenge.title,
      tier: challenge.tier,
      points: TIER_POINTS[challenge.tier],
      answer: generated.answer,
      pageData: generated.pageData,
    };
  });
}

/**
 * Check that pageData doesn't contain the answer string.
 * Catches accidental answer leakage in client-sent data.
 */
export function checkNoAnswerLeakage(
  challengeId: string,
  sessionId: string = TEST_SESSION_ID,
  serverSecret: string = TEST_SERVER_SECRET
): { leaked: boolean; details?: string } {
  const answer = getCorrectAnswer(challengeId, sessionId, serverSecret);
  const pageData = getPageData(challengeId, sessionId, serverSecret);
  const pageDataStr = JSON.stringify(pageData);

  // Check if the exact answer string appears in pageData
  // Note: For some challenges (e.g., name extraction from a table),
  // the answer IS in the pageData by design (the user must find it).
  // This check is mainly for challenges where the answer is computed/derived.
  // Each challenge can mark itself as "answer visible in data" to skip this check.
  const challenge = getChallenge(challengeId);
  if (!challenge) throw new Error(`Challenge not found: ${challengeId}`);

  // For now, just return whether the answer appears literally
  const leaked = pageDataStr.toLowerCase().includes(answer.toLowerCase());
  return {
    leaked,
    details: leaked
      ? `Answer "${answer}" found in pageData JSON`
      : undefined,
  };
}
