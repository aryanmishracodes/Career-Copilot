"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AnimatedBar, AnimatedNumber, scoreTextColor, scoreBarColor } from "./primitives";
import { fadeUp, staggerContainer } from "./motion";
import type { SessionAnalytics } from "./types";

interface Props {
  analytics: SessionAnalytics;
  questionNumber: number;
  totalQuestions: number;
}

export function EvaluationSidebar({ analytics, questionNumber, totalQuestions }: Props) {
  const readinessColor =
    analytics.hiringReadiness === "Strong"
      ? "text-emerald-400"
      : analytics.hiringReadiness === "Moderate"
      ? "text-amber-400"
      : "text-red-400";

  const TrendIcon =
    analytics.communicationTrend === "improving"
      ? TrendingUp
      : analytics.communicationTrend === "declining"
      ? TrendingDown
      : Minus;

  const trendColor =
    analytics.communicationTrend === "improving"
      ? "text-emerald-400"
      : analytics.communicationTrend === "declining"
      ? "text-red-400"
      : "text-zinc-500";

  return (
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Progress */}
      <motion.div
        variants={fadeUp}
        className="border border-zinc-800 rounded-xl bg-zinc-900 px-4 py-4"
      >
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Interview Progress
        </p>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-black font-mono text-zinc-100">{questionNumber}</span>
          <span className="text-xs text-zinc-600 font-mono">/ {totalQuestions} questions</span>
        </div>
        <AnimatedBar
          pct={Math.round((questionNumber / totalQuestions) * 100)}
          color="bg-zinc-500"
        />
      </motion.div>

      {/* Live score */}
      {analytics.questionCount > 0 && (
        <motion.div
          variants={fadeUp}
          className="border border-zinc-800 rounded-xl bg-zinc-900 px-4 py-4 space-y-3"
        >
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Live Performance
          </p>

          <div className="text-center py-1">
            <span className={`text-3xl font-black font-mono ${scoreTextColor(analytics.avgScore)}`}>
              <AnimatedNumber value={analytics.avgScore} suffix="%" />
            </span>
            <p className="text-xs text-zinc-600 mt-0.5">avg score</p>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">Technical</span>
                <span className={`font-mono ${scoreTextColor(analytics.technicalDepth)}`}>
                  {analytics.technicalDepth}
                </span>
              </div>
              <AnimatedBar
                pct={analytics.technicalDepth}
                color={scoreBarColor(analytics.technicalDepth)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Trend</span>
            <span className={`flex items-center gap-1 text-xs font-mono ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {analytics.communicationTrend}
            </span>
          </div>
        </motion.div>
      )}

      {/* Hiring readiness */}
      {analytics.questionCount > 0 && (
        <motion.div
          variants={fadeUp}
          className="border border-zinc-800 rounded-xl bg-zinc-900 px-4 py-4"
        >
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Hiring Readiness
          </p>
          <p className={`text-lg font-bold ${readinessColor}`}>
            {analytics.hiringReadiness}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Based on {analytics.questionCount} answer{analytics.questionCount !== 1 ? "s" : ""}
          </p>
        </motion.div>
      )}

      {/* Recurring weaknesses */}
      {analytics.recurringWeaknesses.length > 0 && (
        <motion.div
          variants={fadeUp}
          className="border border-zinc-800 rounded-xl bg-zinc-900 px-4 py-4"
        >
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Recurring Patterns
          </p>
          <ul className="space-y-1.5">
            {analytics.recurringWeaknesses.map((w, i) => (
              <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">—</span>
                {w}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
