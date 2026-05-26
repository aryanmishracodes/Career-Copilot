"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Activity } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import AuthGuard from "../../components/AuthGuard";

import { InterviewLoading }   from "../../components/interview/InterviewLoading";
import { InterviewSetup }     from "../../components/interview/InterviewSetup";
import { LiveInterviewPanel } from "../../components/interview/LiveInterviewPanel";
import { EvaluationSidebar } from "../../components/interview/EvaluationSidebar";
import { InterviewResults }   from "../../components/interview/InterviewResults";

import {
  evaluateAnswer,
  computeSessionAnalytics,
  buildResumeContext,
  getNextQuestion,
  getIdealAnswer,
} from "../../components/interview/engine";

import type {
  ResumeData,
  InterviewType,
  Turn,
  InterviewPhase,
  PersonalityId,
} from "../../components/interview/types";

import { SpatialPanel, InteractiveButton, AmbientGlow, NeuralPulse } from "../../components/ui/primitives";

const API = "http://localhost:4000/api/v1";
const DEFAULT_MAX_QUESTIONS = 10;

export default function InterviewPage() {
  const { token } = useAuth();

  const [phase, setPhase]                   = useState<InterviewPhase>("setup");
  const [resume, setResume]                 = useState<ResumeData | null>(null);
  const [resumeLoading, setResumeLoading]   = useState(true);
  const [interviewId, setInterviewId]       = useState<string | null>(null);
  const [interviewType, setInterviewType]   = useState<InterviewType | null>(null);
  const [targetRole, setTargetRole]         = useState("Software Engineer");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [turns, setTurns]                   = useState<Turn[]>([]);
  const [isThinking, setIsThinking]         = useState(false);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [coveredConcepts, setCoveredConcepts] = useState<Set<string>>(new Set());
  const [personalityId, setPersonalityId]   = useState<PersonalityId>("faang_engineer");
  const [maxQuestions, setMaxQuestions]     = useState(DEFAULT_MAX_QUESTIONS);

  // Load resume on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/resumes/latest`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.parsed_json && Object.keys(d.parsed_json).length > 0) {
          setResume(d.parsed_json);
        }
        setResumeLoading(false);
      })
      .catch(() => setResumeLoading(false));
  }, [token]);

  // Start interview
  const handleStart = useCallback(
    async (type: InterviewType, role: string, personality: PersonalityId, questions: number) => {
      if (!token) return;
      setInterviewType(type);
      setTargetRole(role);
      setPersonalityId(personality);
      setMaxQuestions(questions);
      setPhase("active");
      setIsThinking(true);
      setAskedQuestions(new Set());
      setCoveredConcepts(new Set());

      const { question: firstQ, concepts: firstConcepts } = getNextQuestion(type.id, new Set(), new Set(), 0);
      setAskedQuestions(new Set([firstQ]));
      setCoveredConcepts(new Set(firstConcepts));

      try {
        const res = await fetch(`${API}/interviews/start`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            type: type.id,
            targetRole: role,
            resumeContext: buildResumeContext(resume),
          }),
        });
        const data = await res.json();
        setInterviewId(data.interviewId);
        const q = data.nextQuestion ?? firstQ;
        setCurrentQuestion(q);
        setAskedQuestions(new Set([q]));
        setQuestionNumber(1);
      } catch {
        setCurrentQuestion(firstQ);
        setQuestionNumber(1);
      } finally {
        setIsThinking(false);
      }
    },
    [token, resume]
  );

  // Submit answer
  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!token || !interviewType) return;
      setIsThinking(true);

      const local = evaluateAnswer(answer, currentQuestion);

      const optimisticTurn: Turn = {
        id: `${Date.now()}`,
        question: currentQuestion,
        answer,
        feedback: local.evaluationConfidence === "invalid"
          ? "Feedback unavailable — response did not contain meaningful technical content."
          : "",
        idealAnswer: getIdealAnswer(interviewType.id, currentQuestion),
        scores: local.scores,
        overallPct: local.overallPct,
        evaluationState: local.evaluationState,
        passFail: local.passFail,
        passFailReason: local.passFailReason,
        strengths: local.strengths,
        weaknesses: local.weaknesses,
        recruiterImpression: local.recruiterImpression,
        bluffDetected: local.bluffDetected,
        bluffNote: local.bluffNote,
        followUpUsed: false,
        timestamp: Date.now(),
        validation: local.validation,
        evaluationConfidence: local.evaluationConfidence,
      };
      setTurns((prev) => [optimisticTurn, ...prev]);

      // Advance to next question OR end the interview.
      const advanceOrEnd = (nextQ: string, concepts: string[]) => {
        if (questionNumber >= maxQuestions) {
          setPhase("results");
        } else {
          setAskedQuestions((prev) => new Set([...prev, nextQ]));
          setCoveredConcepts((prev) => new Set([...prev, ...concepts]));
          setCurrentQuestion(nextQ);
          setQuestionNumber((n) => n + 1);
        }
      };

      // Invalid responses: skip AI call, advance immediately
      if (!local.validation.valid) {
        const nextResult = getNextQuestion(interviewType.id, askedQuestions, coveredConcepts, questionNumber);
        advanceOrEnd(nextResult.question, nextResult.concepts);
        setIsThinking(false);
        return;
      }

      try {
        const endpoint = interviewId
          ? `${API}/interviews/${interviewId}/answer`
          : `${API}/interviews/start`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            answer,
            targetRole,
            type: interviewType.id,
            resumeContext: buildResumeContext(resume),
          }),
        });

        if (res.ok) {
          const data = await res.json();

          const resolvedFeedback = data.feedback?.trim()
            || local.recruiterImpression
            || "Evaluation complete. See scores above for detailed breakdown.";

          setTurns((prev) =>
            prev.map((t) =>
              t.id === optimisticTurn.id
                ? {
                    ...t,
                    feedback: resolvedFeedback,
                    scores: {
                      ...t.scores,
                      technical:     data.scores?.technical     ?? t.scores.technical,
                      communication: data.scores?.communication ?? t.scores.communication,
                    },
                    overallPct: data.overall_pct ?? t.overallPct,
                  }
                : t
            )
          );

          // Use AI's next question if provided and not a duplicate, else pick from bank
          const nextResult = getNextQuestion(interviewType.id, askedQuestions, coveredConcepts, questionNumber);
          const aiQ = data.next_question && !askedQuestions.has(data.next_question)
            ? data.next_question
            : null;
          advanceOrEnd(aiQ ?? nextResult.question, nextResult.concepts);

        } else {
          setTurns((prev) =>
            prev.map((t) =>
              t.id === optimisticTurn.id
                ? { ...t, feedback: local.recruiterImpression || "Evaluation complete." }
                : t
            )
          );
          const nextResult = getNextQuestion(interviewType.id, askedQuestions, coveredConcepts, questionNumber);
          advanceOrEnd(nextResult.question, nextResult.concepts);
        }
      } catch {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === optimisticTurn.id
              ? { ...t, feedback: local.recruiterImpression || "Evaluation complete." }
              : t
          )
        );
        const nextResult = getNextQuestion(
          interviewType?.id ?? "technical_screening",
          askedQuestions,
          coveredConcepts,
          questionNumber
        );
        advanceOrEnd(nextResult.question, nextResult.concepts);
      } finally {
        setIsThinking(false);
      }
    },
    [token, interviewId, interviewType, currentQuestion, questionNumber, targetRole, resume, maxQuestions, askedQuestions, coveredConcepts]
  );

  const handleEnd     = useCallback(() => setPhase("results"), []);

  const handleRestart = useCallback(() => {
    setPhase("setup");
    setTurns([]);
    setQuestionNumber(0);
    setCurrentQuestion("");
    setInterviewId(null);
    setInterviewType(null);
    setAskedQuestions(new Set());
    setCoveredConcepts(new Set());
  }, []);

  const analytics = computeSessionAnalytics(turns);

  return (
    <AuthGuard>
      <div className="w-full min-h-screen overflow-x-hidden bg-[#030303] text-zinc-100 relative">
        {/* Overhead atmospheric background glow */}
        <AmbientGlow size="lg" color="mixed" className="-top-40 left-1/2 -translate-x-1/2 opacity-20" />
        <AmbientGlow size="md" color="violet" className="-bottom-20 -right-20 opacity-10" />

        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 px-6 pt-4 pb-2 bg-[#030303]/90 backdrop-blur-md border-b border-zinc-900/60 relative">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Link href="/dashboard">
                <InteractiveButton variant="secondary" className="px-3.5 py-1.5 flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Dashboard
                </InteractiveButton>
              </Link>
            </motion.div>

            {phase === "active" && interviewType && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="border border-zinc-900 bg-zinc-950/60 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 select-none font-mono">
                  <NeuralPulse size="sm" label={`Simulation Active · Q${questionNumber}/${maxQuestions}`} />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {resumeLoading ? (
          <div className="py-20 relative z-10">
            <InterviewLoading />
          </div>
        ) : phase === "setup" ? (
          <div className="relative z-10">
            <InterviewSetup resume={resume} onStart={handleStart} />
          </div>
        ) : phase === "active" && interviewType ? (
          <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
              <div className="border border-zinc-900/80 rounded-2xl bg-zinc-950/40 backdrop-blur-xl p-6 flex flex-col min-h-[60vh] shadow-2xl relative overflow-hidden">
                <AmbientGlow size="sm" color="violet" className="-top-10 -left-10 opacity-10" />
                <LiveInterviewPanel
                  currentQuestion={currentQuestion}
                  questionNumber={questionNumber}
                  isThinking={isThinking}
                  onSubmitAnswer={handleAnswer}
                  onEndInterview={handleEnd}
                  lastTurn={turns[0] ?? null}
                  personalityId={personalityId}
                />
              </div>
              <EvaluationSidebar
                analytics={analytics}
                questionNumber={questionNumber}
                totalQuestions={maxQuestions}
              />
            </div>
          </div>
        ) : phase === "results" && interviewType ? (
          <div className="relative z-10">
            <InterviewResults
              turns={[...turns].reverse()}
              interviewType={interviewType}
              targetRole={targetRole}
              onRestart={handleRestart}
            />
          </div>
        ) : null}

      </div>
    </AuthGuard>
  );
}
