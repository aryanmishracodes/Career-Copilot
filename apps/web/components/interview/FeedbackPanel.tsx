"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronDown, CheckCircle, AlertTriangle, XCircle, Info, AlertOctagon, Lightbulb } from "lucide-react";
import { AnimatedBar, scoreTextColor, scoreBarColor } from "./primitives";
import { fadeUp, springConfig } from "./motion";
import { EVALUATION_STATE_META } from "./engine";
import type { Turn } from "./types";

const PASS_FAIL_STYLE: Record<string, string> = {
  likely_rejected:  "bg-red-950/30 text-red-400 border-red-900/50",
  borderline:       "bg-amber-950/30 text-amber-400 border-amber-900/50",
  strong_signal:    "bg-blue-950/30 text-blue-400 border-blue-900/50",
  likely_advanced:  "bg-emerald-950/30 text-emerald-400 border-emerald-900/50",
};

// ── Ideal Answer Panel ────────────────────────────────────────────────────────

function IdealAnswerPanel({ idealAnswer }: { idealAnswer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-700/60 rounded-lg overflow-hidden">
      <motion.button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/60 hover:bg-zinc-800 transition-colors text-left"
        whileTap={{ scale: 0.998 }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
            Ideal Answer
          </span>
          <span className="text-xs text-zinc-500">— Senior-level response</span>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-950/80 px-4 py-3 border-t border-zinc-700/40">
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {idealAnswer}
              </p>
              <div className="mt-3 pt-3 border-t border-zinc-800 flex items-start gap-2">
                <Info className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-600 leading-relaxed">
                  This is a reference answer showing the depth and structure expected at a senior level.
                  Your answer doesn't need to match exactly — focus on the reasoning patterns and trade-off awareness.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  turn: Turn;
  index: number;
}

// ── Invalid answer banner ─────────────────────────────────────────────────────

function InvalidBanner({ turn }: { turn: Turn }) {
  const categoryLabel: Record<string, string> = {
    gibberish:    "Gibberish / keyboard spam",
    too_short:    "Insufficient length",
    placeholder:  "Placeholder / non-answer",
    repetition:   "Repetition spam",
    irrelevant:   "Irrelevant content",
    low_density:  "Low linguistic density",
  };

  const cat = turn.validation.invalidCategory ?? "low_density";

  return (
    <div className="bg-zinc-950 px-5 py-4 space-y-3">
      <div className="flex items-start gap-3 border border-red-900/50 bg-red-950/20 rounded-lg px-4 py-3">
        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-red-400 mb-1">
            Evaluation Failed — {categoryLabel[cat]}
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {turn.validation.invalidReason}
          </p>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-900">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Recruiter Consequence
        </p>
        <p className="text-xs text-zinc-400 italic">{turn.recruiterImpression}</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-zinc-600">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Scores are not generated for invalid responses. Provide a substantive answer to receive evaluation.
      </div>
    </div>
  );
}

// ── Score dimension rows ──────────────────────────────────────────────────────

const SCORE_DIMENSIONS = [
  { key: "technical",     label: "Technical Accuracy",    weight: "35%" },
  { key: "relevance",     label: "Semantic Relevance",    weight: "25%" },
  { key: "communication", label: "Communication Clarity", weight: "20%" },
  { key: "depth",         label: "Conceptual Depth",      weight: "12%" },
  { key: "structure",     label: "Answer Structure",      weight: "8%"  },
] as const;

// ── Main component ────────────────────────────────────────────────────────────

export function FeedbackPanel({ turn, index }: Props) {
  const [expanded, setExpanded] = useState(index === 0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });

  const isInvalid = !turn.validation.valid;
  const stateMeta = EVALUATION_STATE_META[turn.evaluationState];
  const scoreColor = isInvalid ? "text-red-500" : scoreTextColor(turn.overallPct);

  const PASS_FAIL_STYLE = {
    likely_rejected:  "bg-red-950/30 text-red-400 border-red-900/50",
    borderline:       "bg-amber-950/30 text-amber-400 border-amber-900/50",
    strong_signal:    "bg-blue-950/30 text-blue-400 border-blue-900/50",
    likely_advanced:  "bg-emerald-950/30 text-emerald-400 border-emerald-900/50",
  };

  const confidenceBadge = {
    high:    { label: "High confidence", style: "bg-emerald-950/40 text-emerald-400 border-emerald-900" },
    medium:  { label: "Medium confidence", style: "bg-amber-950/40 text-amber-400 border-amber-900" },
    low:     { label: "Low confidence", style: "bg-zinc-900 text-zinc-500 border-zinc-700" },
    invalid: { label: "Not evaluated", style: "bg-red-950/40 text-red-400 border-red-900" },
  }[turn.evaluationConfidence];

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ delay: index * 0.06 }}
      className={`border rounded-xl overflow-hidden ${
        isInvalid ? "border-red-900/40" : "border-zinc-800"
      }`}
      whileHover={{
        borderColor: isInvalid ? "rgb(127 29 29 / 0.6)" : "rgb(63 63 70)",
        transition: { duration: 0.2 },
      }}
    >
      {/* Header row */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between px-5 py-4 bg-zinc-900 hover:bg-zinc-800/80 transition-colors text-left"
        whileTap={{ scale: 0.998 }}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-zinc-600 shrink-0">Q{index + 1}</span>
            {/* Evaluation state badge — replaces raw % as primary signal */}
            <span className={`text-xs px-1.5 py-0.5 rounded border font-mono shrink-0 ${stateMeta.badgeStyle}`}>
              {stateMeta.label}
            </span>
            {turn.bluffDetected && (
              <span className="text-xs px-1.5 py-0.5 rounded border font-mono bg-amber-950/30 text-amber-400 border-amber-900/50 shrink-0">
                Bluff detected
              </span>
            )}
            {turn.followUpUsed && (
              <span className="text-xs px-1.5 py-0.5 rounded border font-mono bg-blue-950/40 text-blue-400 border-blue-900 shrink-0">
                Follow-up
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-200 font-medium leading-snug line-clamp-2">
            {turn.question}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isInvalid ? (
            <span className="text-sm font-bold text-red-500 font-mono">—</span>
          ) : (
            <span className={`text-lg font-black font-mono ${scoreColor}`}>
              {turn.overallPct}%
            </span>
          )}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </motion.span>
        </div>
      </motion.button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {/* Answer always shown */}
            <div className="bg-zinc-950 px-5 pt-4 pb-0">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Your Answer
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 mb-4">
                {turn.answer}
              </p>
            </div>

            {/* Branch: invalid vs valid */}
            {isInvalid ? (
              <InvalidBanner turn={turn} />
            ) : (
              <div className="bg-zinc-950 px-5 pb-4 space-y-4">

                {/* Score breakdown — 5 dimensions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Performance Breakdown
                    </p>
                    <span className={`text-xs font-mono font-bold ${scoreTextColor(turn.overallPct)}`}>
                      Overall: {turn.overallPct}%
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {SCORE_DIMENSIONS.map(({ key, label, weight }, i) => {
                      const val = turn.scores[key] ?? 0;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-400">
                              {label}
                              <span className="text-zinc-700 ml-1">({weight})</span>
                            </span>
                            <span className={`font-mono font-semibold ${scoreTextColor(val)}`}>
                              {val}
                            </span>
                          </div>
                          <AnimatedBar pct={val} color={scoreBarColor(val)} delay={i * 0.07} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Relevance warning */}
                  {(turn.scores.relevance ?? 100) < 40 && (
                    <motion.div
                      className="mt-3 flex items-start gap-2 border border-amber-900/40 bg-amber-950/20 rounded-lg px-3 py-2"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-400/80">
                        Low semantic relevance ({turn.scores.relevance}%) — answer does not clearly address the question.
                        All other scores are capped as a result.
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* AI feedback — staged analysis states */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    AI Feedback
                  </p>
                  {!turn.feedback || turn.feedback === "" ? (
                    // Staged analysis loading — never shows indefinite "Evaluating…"
                    <div className="space-y-1.5">
                      {[
                        "Semantic relevance analysed",
                        "Technical concepts extracted",
                        "Recruiter evaluation generating…",
                      ].map((stage, i) => (
                        <motion.div
                          key={stage}
                          className="flex items-center gap-2 text-xs text-zinc-500"
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 }}
                        >
                          {i < 2 ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <motion.div
                              className="w-3 h-3 rounded-full border border-zinc-600 shrink-0 flex items-center justify-center"
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                            >
                              <div className="w-1 h-1 rounded-full bg-zinc-500" />
                            </motion.div>
                          )}
                          {stage}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 leading-relaxed">{turn.feedback}</p>
                  )}
                </div>

                {/* Ideal Answer — the educational core */}
                {turn.idealAnswer && <IdealAnswerPanel idealAnswer={turn.idealAnswer} />}

                {/* Strengths / Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Strengths
                    </p>
                    <ul className="space-y-1.5">
                      {turn.strengths.length > 0 ? (
                        turn.strengths.map((s, i) => (
                          <motion.li
                            key={i}
                            className="flex items-start gap-2 text-xs text-zinc-300"
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            {s}
                          </motion.li>
                        ))
                      ) : (
                        <li className="text-xs text-zinc-600">No notable strengths detected</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Improvement Areas
                    </p>
                    <ul className="space-y-1.5">
                      {turn.weaknesses.length > 0 ? (
                        turn.weaknesses.map((w, i) => (
                          <motion.li
                            key={i}
                            className="flex items-start gap-2 text-xs text-zinc-300"
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 + 0.1 }}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            {w}
                          </motion.li>
                        ))
                      ) : (
                        <li className="text-xs text-zinc-500">No major concerns</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Recruiter impression */}
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    Recruiter Impression
                  </p>
                  <p className="text-xs text-zinc-400 italic">{turn.recruiterImpression}</p>
                </div>

                {/* Pass/fail prediction */}
                <div className="border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-900">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Outcome Prediction
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${PASS_FAIL_STYLE[turn.passFail]}`}>
                      {turn.passFail.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{turn.passFailReason}</p>
                </div>

                {/* Bluff note */}
                {turn.bluffDetected && turn.bluffNote && (
                  <div className="flex items-start gap-2 border border-amber-900/40 bg-amber-950/15 rounded-lg px-3 py-2">
                    <AlertOctagon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400/80">{turn.bluffNote}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
