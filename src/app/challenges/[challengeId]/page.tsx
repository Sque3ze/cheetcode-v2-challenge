"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import ChallengeLayout from "../../../components/ChallengeLayout";
import { MAX_ATTEMPTS_PER_CHALLENGE } from "../../../lib/config";

// Challenge-specific renderers
import TableSortChallenge from "./challenges/TableSortChallenge";
import FormFillChallenge from "./challenges/FormFillChallenge";
import DropdownSelectChallenge from "./challenges/DropdownSelectChallenge";
import TabNavigationChallenge from "./challenges/TabNavigationChallenge";
import FilterSearchChallenge from "./challenges/FilterSearchChallenge";
import ModalInteractionChallenge from "./challenges/ModalInteractionChallenge";
import MultiStepWizardChallenge from "./challenges/MultiStepWizardChallenge";
import LinkedDataLookupChallenge from "./challenges/LinkedDataLookupChallenge";
import SequentialCalculatorChallenge from "./challenges/SequentialCalculatorChallenge";
import DataDashboardChallenge from "./challenges/DataDashboardChallenge";
import ConstraintSolverChallenge from "./challenges/ConstraintSolverChallenge";
import CalculationAuditChallenge from "./challenges/CalculationAuditChallenge";
import RedHerringChallenge from "./challenges/RedHerringChallenge";

interface ChallengePageData {
  id: string;
  title: string;
  tier: number;
  points: number;
  description: string;
  instructions: string;
  pageData: unknown;
  renderToken?: string;
  status: {
    solved: boolean;
    locked: boolean;
    attempts: number;
  };
}

export interface ChallengeRendererProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageData: any;
  answerRef: React.MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

// Map challenge IDs to their renderer components
const CHALLENGE_RENDERERS: Record<string, React.ComponentType<ChallengeRendererProps>> = {
  "tier1-table-sort": TableSortChallenge,
  "tier1-form-fill": FormFillChallenge,
  "tier1-dropdown-select": DropdownSelectChallenge,
  "tier1-tab-navigation": TabNavigationChallenge,
  "tier1-filter-search": FilterSearchChallenge,
  "tier1-modal-interaction": ModalInteractionChallenge,
  "tier2-multi-step-wizard": MultiStepWizardChallenge,
  "tier2-linked-data-lookup": LinkedDataLookupChallenge,
  "tier2-sequential-calculator": SequentialCalculatorChallenge,
  "tier3-data-dashboard": DataDashboardChallenge,
  "tier3-constraint-solver": ConstraintSolverChallenge,
  "tier4-calculation-audit": CalculationAuditChallenge,
  "tier4-red-herring": RedHerringChallenge,
};

export default function ChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { data: authSession } = useSession();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeData, setChallengeData] = useState<ChallengePageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeRemainingMs, setTimeRemainingMs] = useState(0);
  const answerRef = useRef("");

  // Resolve params
  useEffect(() => {
    params.then((p) => setChallengeId(p.challengeId));
  }, [params]);

  // Get active session
  const DEV_USER = process.env.NEXT_PUBLIC_DEV_USER;
  useEffect(() => {
    if (!authSession?.user && !DEV_USER) return;

    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSessionId(data.session.sessionId);
          setTimeRemainingMs(data.session.timeRemainingMs);
        } else {
          setError("No active session. Start a session first.");
        }
      })
      .catch(() => setError("Failed to load session"));
  }, [authSession]);

  // Fetch challenge data
  useEffect(() => {
    if (!challengeId || !sessionId) return;

    fetch(`/api/challenges/${challengeId}?sessionId=${sessionId}`)
      .then(async (res) => {
        if (!res.ok) {
          let data: { error?: string; message?: string } = {};
          try { data = await res.json(); } catch { /* non-JSON error response */ }
          if (data.error === "prerequisites_not_met") {
            throw new Error(
              `Prerequisites not met. ${data.message}`
            );
          }
          throw new Error(data.error || `Failed to load challenge (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setChallengeData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [challengeId, sessionId]);

  // Countdown timer (cosmetic — server is authority)
  useEffect(() => {
    if (timeRemainingMs <= 0) return;
    const interval = setInterval(() => {
      setTimeRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemainingMs]);

  const getAnswer = useCallback(() => answerRef.current, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/" className="text-blue-400 hover:underline">
            Go home
          </a>
        </div>
      </div>
    );
  }

  if (!challengeData || !challengeId || !sessionId) return null;

  const Renderer = CHALLENGE_RENDERERS[challengeId];
  if (!Renderer) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400">Unknown challenge type: {challengeId}</p>
      </div>
    );
  }

  return (
    <ChallengeLayout
      id={challengeData.id}
      title={challengeData.title}
      tier={challengeData.tier}
      points={challengeData.points}
      instructions={challengeData.instructions}
      solved={challengeData.status.solved}
      locked={challengeData.status.locked}
      attempts={challengeData.status.attempts}
      maxAttempts={MAX_ATTEMPTS_PER_CHALLENGE}
      sessionId={sessionId}
      timeRemainingMs={timeRemainingMs}
      getAnswer={getAnswer}
    >
      <Renderer
        pageData={challengeData.pageData}
        answerRef={answerRef}
        sessionId={sessionId}
        challengeId={challengeId}
        renderToken={challengeData.renderToken ?? ""}
      />
    </ChallengeLayout>
  );
}
