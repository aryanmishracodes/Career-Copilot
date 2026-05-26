"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw, CheckCircle, AlertTriangle, TrendingUp,
  TrendingDown, Minus, ArrowRight, AlertOctagon,
} from "lucide-react";
import { AnimatedBar, StatPill, SectionCard, scoreTextColor } from "./primitives";
import { staggerContainer, fadeUp, springConfig } from "./motion";
import { FeedbackPanel } from "./FeedbackPanel";
import { computeSessionAnalytics, EVALUATION_STATE_META } from "./engine";
import type { Turn, InterviewType } from "./types";

interface Props {
  turns: Turn[];
  interviewType: InterviewType;
  targetRole: string;
  onRestart: () => void;
}

const PASS_FAIL_META = {
  likely_rejected:  { label: "Likely Rejected",           style: "bg-red-950/50 text-red-400 border-red-800",         icon: "✗" },
  borderline:       { label: "Borderline Pass",            style: "bg-amber-950/50 text-amber-400 border-amber-800",   icon: "~" },
  strong_signal:    { label: "Strong Screening Signal",    style: "bg-blue-950/50 text-blue-400 border-blue-800",      icon: "↑" },
  likely_advanced:  { label: "Likely Advanced to Next Round", style: "bg-emerald-950/50 text-emerald-400 border-emerald-800", icon: "✓" },
};

export function InterviewResults({ turns, interviewType, targetRole, onRestart }: Props) {
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const analytics = computeSessionAnalytics(turns);
  const pf = PASS_FAIL_META[analytics.overallPassFail] ?? PASS_FAIL_META["likely_rejected"];

  const TrendIcon = analytics.communicationTrend === "improving" ? TrendingUp
    : analytics.communicationTrend === "declining" ? TrendingDown : Minus;
  const trendColor = analytics.communicationTrend === "improving" ? "text-emerald-400"
    : analytics.communicationTrend === "declining" ? "text-amber-400" : "text-zinc-500";

  // Derive overall pass/fail reason from session
  const overallReason = analytics.overallPassFail === "likely_rejected"
    ? `Average score of ${analytics.avgScore}% fell below the minimum threshold. ${analytics.recurringWeaknesses[0] ? `Primary issue: ${analytics.recurringWeaknesses[0].toLowerCase()}.` : ""}`
    : analytics.overallPassFail === "borderline"
    ? `Performance was inconsistent. Strong answers were offset by weaker responses. Focus on ${analytics.weakestArea}.`
    : analytics.overallPassFail === "strong_signal"
    ? `Solid technical performance with clear domain knowledge. ${analytics.bluffCount > 0 ? "Note: some advanced terminology was used without full explanation." : ""}`
    : `Consistently strong answers across ${analytics.questionCount} questions. ${analytics.strongestDomain} was the standout signal.`;

  // Top 3 strongest and weakest turns
  const sortedByScore = [...turns].filter(t => t.validation.valid).sort((a, b) => b.overallPct - a.overallPct);
  const strongestTurns = sortedByScore.slice(0, 2);
  const weakestTurns = sortedByScore.slice(-2).reverse();

  const visibleTurns = showAllQuestions ? turns : turns.slice(0, 3);

  return (
    <motion.div
      className="max-w-5xl mx-auto px-6 py-10 space-y-5"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-1">
            Interview Complete
          </p>
          <h1 className="text-2xl font-bold text-zinc-100">Performance Report</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {interviewType.label} · {targetRole} · {turns.length} question{turns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <motion.button
          onClick={onRestart}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-lg transition-colors shrink-0"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={springConfig}
        >
          <RotateCcw className="w-4 h-4" />
          New Interview
        </motion.button>
      </motion.div>

      {/* ── SUMMARY PANEL (scannable first) ── */}
      <motion.div
        variants={fadeUp}
        className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-5"
        whileHover={{ borderColor: "rgb(63 63 70)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Pass/fail prediction */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <motion.span
                className={`text-xs font-semibold px-2.5 py-1 rounded border font-mono ${pf.style}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, ...springConfig }}
              >
                {pf.icon} {pf.label}
              </motion.span>
              <span className={`text-xs px-2 py-0.5 rounded border font-mono ${
                analytics.hiringReadiness === "Strong" ? "bg-emerald-950/30 text-emerald-400 border-emerald-900" :
                analytics.hiringReadiness === "Moderate" ? "bg-amber-950/30 text-amber-400 border-amber-900" :
                "bg-zinc-900 text-zinc-500 border-zinc-700"
              }`}>
                {analytics.hiringReadiness} Readiness
              </span>
            </div>
            <p className="text-zinc-200 text-sm leading-relaxed max-w-xl">{overallReason}</p>

            {/* Bluff warning */}
            {analytics.bluffCount > 0 && (
              <motion.div
                className="mt-3 flex items-start gap-2 border border-amber-900/40 bg-amber-950/15 rounded-lg px-3 py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <AlertOctagon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/80">
                  Advanced terminology was referenced in {analytics.bluffCount} answer{analytics.bluffCount > 1 ? "s" : ""} without full implementation-level explanation.
                </p>
              </motion.div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-3 shrink-0">
            <StatPill value={analytics.avgScore} suffix="%" label="Avg Score" color={scoreTextColor(analytics.avgScore)} />
            <StatPill value={analytics.technicalDepth} label="Technical" color={scoreTextColor(analytics.technicalDepth)} />
            <StatPill value={analytics.questionCount} label="Evaluated" />
          </div>
        </div>

        {/* Trend row */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4 flex-wrap text-xs">
          <span className="text-zinc-600">Score trend:</span>
          <span className={`flex items-center gap-1 font-mono ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {analytics.communicationTrend === "improving" ? "Improving across session"
              : analytics.communicationTrend === "declining" ? "Declining — review later answers"
              : "Consistent throughout"}
          </span>
          <span className="text-zinc-600">Strongest: <span className="text-zinc-400">{analytics.strongestDomain}</span></span>
          <span className="text-zinc-600">Weakest: <span className="text-zinc-400">{analytics.weakestArea}</span></span>
        </div>
      </motion.div>

      {/* ── KEY SIGNALS (2-col) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Strongest answers */}
        <motion.div variants={fadeUp} className="border border-zinc-800 rounded-xl bg-zinc-900 px-5 py-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Strongest Signals
          </p>
          {strongestTurns.length > 0 ? (
            <ul className="space-y-2.5">
              {strongestTurns.map((t, i) => {
                const meta = EVALUATION_STATE_META[t.evaluationState];
                return (
                  <li key={t.id} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 line-clamp-1">{t.question}</p>
                      <span className={`text-xs font-mono ${meta.color}`}>{meta.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600">No strong answers detected in this session.</p>
          )}
        </motion.div>

        {/* Weakest answers */}
        <motion.div variants={fadeUp} className="border border-zinc-800 rounded-xl bg-zinc-900 px-5 py-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Key Weaknesses
          </p>
          {analytics.recurringWeaknesses.length > 0 ? (
            <ul className="space-y-2">
              {analytics.recurringWeaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  {w}
                </li>
              ))}
            </ul>
          ) : weakestTurns.length > 0 ? (
            <ul className="space-y-2.5">
              {weakestTurns.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-300 line-clamp-1">{t.question}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600">No recurring weaknesses detected.</p>
          )}
        </motion.div>
      </div>

      {/* ── SCORE PROGRESSION ── */}
      <SectionCard title="Score Progression" icon={<TrendingUp className="w-4 h-4" />} delayIndex={2} defaultOpen={false}>
        <div className="space-y-2">
          {turns.map((t, i) => {
            const meta = EVALUATION_STATE_META[t.evaluationState];
            return (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-600 w-6 shrink-0">Q{i + 1}</span>
                <div className="flex-1">
                  <AnimatedBar
                    pct={t.overallPct}
                    color={t.overallPct >= 75 ? "bg-emerald-500" : t.overallPct >= 55 ? "bg-amber-500" : t.overallPct >= 35 ? "bg-zinc-500" : "bg-red-500/60"}
                    delay={i * 0.05}
                  />
                </div>
                <span className={`text-xs font-mono w-24 text-right shrink-0 ${meta.color}`}>
                  {t.validation.valid ? `${t.overallPct}%` : "—"} {meta.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── QUESTION REVIEW (collapsible, shows 3 by default) ── */}
      <SectionCard title="Question Review" icon={<CheckCircle className="w-4 h-4" />} delayIndex={3}>
        <p className="text-xs text-zinc-500 mb-4">
          Expand each question to review your answer, scores, and AI feedback.
        </p>
        <div className="space-y-3">
          {visibleTurns.map((turn, i) => (
            <FeedbackPanel key={turn.id} turn={turn} index={i} />
          ))}
        </div>
        {turns.length > 3 && (
          <motion.button
            onClick={() => setShowAllQuestions(!showAllQuestions)}
            className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            whileTap={{ scale: 0.97 }}
          >
            <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showAllQuestions ? "rotate-90" : ""}`} />
            {showAllQuestions ? "Show fewer" : `Show all ${turns.length} questions`}
          </motion.button>
        )}
      </SectionCard>

      {/* ── NEXT STEPS ── */}
      <SectionCard title="Improvement Plan" icon={<ArrowRight className="w-4 h-4" />} delayIndex={4} defaultOpen={false}>
        <div className="space-y-3">
          {([
            analytics.recurringWeaknesses[0] ? {
              action: `Address recurring pattern: "${analytics.recurringWeaknesses[0]}"`,
              impact: "Highest-impact improvement from this session",
            } : null,
            analytics.bluffCount > 0 ? {
              action: "Deepen understanding of advanced concepts before referencing them",
              impact: "Bluff detection reduces credibility — depth matters more than vocabulary",
            } : null,
            {
              action: analytics.weakestArea === "Technical depth"
                ? "Practice explaining implementation details, not just concepts"
                : "Use STAR format: Situation → Task → Action → Result",
              impact: analytics.weakestArea === "Technical depth"
                ? "Technical depth is your primary gap this session"
                : "Structured answers score 15–20% higher on average",
            },
          ].filter(Boolean) as { action: string; impact: string }[])
            .map((item, i) => (
              <motion.div
                key={i}
                className="border border-zinc-800 rounded-lg p-4 bg-zinc-900"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ borderColor: "rgb(63 63 70)", transition: { duration: 0.15 } }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-zinc-600 shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm text-zinc-200 font-medium mb-1">{item!.action}</p>
                    <p className="text-xs text-emerald-400 font-mono">{item!.impact}</p>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </SectionCard>

    </motion.div>
  );
}
