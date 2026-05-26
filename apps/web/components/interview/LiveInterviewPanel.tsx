"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square } from "lucide-react";
import { springConfig } from "./motion";
import { getPersonality, getPressurePrompt } from "./engine";
import type { Turn, PersonalityId } from "./types";

interface Props {
  currentQuestion: string;
  questionNumber: number;
  isThinking: boolean;
  onSubmitAnswer: (answer: string) => void;
  onEndInterview: () => void;
  lastTurn: Turn | null;
  personalityId: PersonalityId;
}

const THINKING_LABELS: Record<PersonalityId, string[]> = {
  faang_engineer:       ["Analysing technical depth", "Formulating follow-up", "Checking for gaps"],
  startup_cto:          ["Thinking...", "Considering practicality", "Next question"],
  hiring_manager:       ["Reviewing your answer", "Noting key points", "Preparing follow-up"],
  staff_engineer:       ["Evaluating reasoning", "Identifying weak points", "Probing deeper"],
  behavioral_recruiter: ["Assessing communication", "Noting structure", "Preparing next question"],
};

// ── Live signal detector ───────────────────────────────────────────────────────
// Runs on every keystroke. Does NOT produce scores — only detects signals.
// Returns a label and a severity level for the UI to render.

type SignalLevel = "none" | "concern" | "neutral" | "positive";

interface LiveSignal {
  label: string;
  level: SignalLevel;
}

const TECH_TERMS = /\b(api|database|cache|async|await|component|function|class|algorithm|complexity|distributed|microservice|container|deploy|pipeline|schema|index|query|hook|state|render|event loop|thread|process|memory|latency|throughput|docker|kubernetes|redis|postgres|sql|rest|graphql|jwt|oauth|cdn|load balanc|replicat|shard|partition|consistency|eventual|cap theorem|trade.?off|scalab)\b/i;

const STRUCTURE_TERMS = /\b(first|second|third|finally|additionally|however|because|therefore|as a result|for example|for instance|in my|i built|i worked|i implemented)\b/i;

const GIBBERISH_PATTERN = /[bcdfghjklmnpqrstvwxyz]{5,}/i;

const PLACEHOLDER_PATTERN = /^(i\s*don'?t\s*know|idk|no\s*idea|not\s*sure|sorry|n\/a|test|hello|hi|ok|okay|lol|lmao)\.?$/i;

function detectLiveSignals(text: string, question: string): LiveSignal {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) return { label: "", level: "none" };

  // ── Hard negatives ────────────────────────────────────────────────────────
  if (PLACEHOLDER_PATTERN.test(trimmed)) {
    return { label: "Placeholder response detected", level: "concern" };
  }

  // Gibberish: consonant clusters + low real-word ratio
  const realWords = words.filter(w => /^[a-zA-Z]{3,}$/.test(w)).length;
  const realWordRatio = realWords / Math.max(1, wordCount);
  if (GIBBERISH_PATTERN.test(trimmed) && realWordRatio < 0.4) {
    return { label: "No meaningful structure detected", level: "concern" };
  }

  // Repetition spam: unique token ratio
  const uniqueRatio = new Set(words.map(w => w.toLowerCase())).size / wordCount;
  if (uniqueRatio < 0.2 && wordCount > 8) {
    return { label: "Repetitive content — low signal value", level: "concern" };
  }

  // ── Too short ─────────────────────────────────────────────────────────────
  if (wordCount < 8) {
    return { label: "Response too brief to evaluate", level: "concern" };
  }

  // ── Positive signals ──────────────────────────────────────────────────────
  const hasTech = TECH_TERMS.test(trimmed);
  const hasStructure = STRUCTURE_TERMS.test(trimmed);
  const hasMetrics = /\d+%|\d+x|\d+ (users|requests|ms|seconds)/i.test(trimmed);
  const hasDepth = /trade.?off|limitation|drawback|however|because|therefore|consider|approach/i.test(trimmed);

  // Check question-word overlap for relevance signal
  const questionKeywords = question
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 4);
  const answerLower = trimmed.toLowerCase();
  const relevantHits = questionKeywords.filter(w => answerLower.includes(w)).length;
  const isRelevant = relevantHits >= Math.max(1, questionKeywords.length * 0.25);

  // Build signal label based on what's detected
  if (hasTech && hasDepth && hasStructure) {
    return { label: "Technical depth and structure detected", level: "positive" };
  }
  if (hasTech && hasMetrics) {
    return { label: "Technical concepts with quantified impact", level: "positive" };
  }
  if (hasTech && isRelevant) {
    return { label: "Relevant technical concepts detected", level: "positive" };
  }
  if (hasTech) {
    return { label: "Technical terminology detected", level: "neutral" };
  }
  if (hasStructure && isRelevant) {
    return { label: "Structured explanation emerging", level: "neutral" };
  }
  if (hasDepth) {
    return { label: "Reasoning and trade-off language present", level: "neutral" };
  }
  if (!isRelevant && wordCount > 20) {
    return { label: "Low relevance to question topic", level: "concern" };
  }
  if (wordCount >= 15) {
    return { label: "Analysing response structure…", level: "neutral" };
  }

  return { label: "Continue typing for signal detection", level: "neutral" };
}

// ── Signal level styles ────────────────────────────────────────────────────────

const SIGNAL_STYLES: Record<SignalLevel, { dot: string; text: string }> = {
  none:     { dot: "bg-zinc-700",    text: "text-zinc-600" },
  concern:  { dot: "bg-amber-500",   text: "text-amber-500/80" },
  neutral:  { dot: "bg-zinc-500",    text: "text-zinc-500" },
  positive: { dot: "bg-emerald-500", text: "text-emerald-500/80" },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function LiveInterviewPanel({
  currentQuestion,
  questionNumber,
  isThinking,
  onSubmitAnswer,
  onEndInterview,
  lastTurn,
  personalityId,
}: Props) {
  const [answer, setAnswer] = useState("");
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [showPressure, setShowPressure] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const personality = getPersonality(personalityId);
  const thinkingLabels = THINKING_LABELS[personalityId];

  // Cycle thinking label
  useEffect(() => {
    if (!isThinking) return;
    const iv = setInterval(() => {
      setThinkingIdx((i) => (i + 1) % thinkingLabels.length);
    }, 1400);
    return () => clearInterval(iv);
  }, [isThinking, thinkingLabels.length]);

  // Show pressure prompt after a weak answer
  useEffect(() => {
    if (!lastTurn || lastTurn.overallPct >= 72) {
      setShowPressure(null);
      return;
    }
    const prompt = getPressurePrompt(personalityId, lastTurn.overallPct, lastTurn.timestamp);
    setShowPressure(prompt);
    const t = setTimeout(() => setShowPressure(null), 6000);
    return () => clearTimeout(t);
  }, [lastTurn, personalityId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentQuestion, isThinking]);

  const handleSubmit = () => {
    const trimmed = answer.trim();
    if (!trimmed || isThinking) return;
    setShowPressure(null);
    onSubmitAnswer(trimmed);
    setAnswer("");
  };

  // Live signal detection — runs on every keystroke, no fake scoring
  const liveSignal = detectLiveSignals(answer, currentQuestion);
  const signalStyle = SIGNAL_STYLES[liveSignal.level];

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">

      {/* Interviewer identity card */}
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-zinc-300">
            {personality.name.split(" ").map(n => n[0]).join("")}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-200">{personality.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border font-mono shrink-0 ${
              personality.strictness === "High"    ? "bg-red-950/30 text-red-400 border-red-900/50" :
              personality.strictness === "Medium"  ? "bg-amber-950/30 text-amber-400 border-amber-900/50" :
                                                     "bg-emerald-950/30 text-emerald-400 border-emerald-900/50"
            }`}>
              {personality.strictness} strictness
            </span>
          </div>
          <p className="text-xs text-zinc-500 truncate">{personality.title} · {personality.tone}</p>
        </div>
      </div>

      {/* Question + thinking area */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">

        {/* Pressure prompt */}
        <AnimatePresence>
          {showPressure && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border border-amber-900/40 bg-amber-950/15 rounded-lg px-4 py-2.5"
            >
              <p className="text-xs text-amber-300 italic">"{showPressure}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={questionNumber}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-start gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-zinc-400">
                {personality.name.split(" ")[0][0]}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-zinc-400">{personality.name}</span>
                <span className="text-xs text-zinc-600 font-mono">Q{questionNumber}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl rounded-tl-sm px-4 py-3">
                <p className="text-sm text-zinc-100 leading-relaxed">{currentQuestion}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Thinking indicator */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-3 pl-10"
            >
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-500"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
                <span className="text-xs text-zinc-500">{thinkingLabels[thinkingIdx]}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Answer input */}
      <div className="border-t border-zinc-800 pt-4 space-y-2.5">

        {/* Live Signal Detection — replaces the fake word-count bar */}
        <div className="flex items-center gap-2 min-h-[18px]">
          <span className="text-xs text-zinc-600 shrink-0">Live analysis</span>
          <AnimatePresence mode="wait">
            {liveSignal.label ? (
              <motion.div
                key={liveSignal.label}
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                transition={{ duration: 0.2 }}
              >
                <motion.span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${signalStyle.dot}`}
                  animate={liveSignal.level === "positive"
                    ? { opacity: [1, 0.4, 1] }
                    : { opacity: 1 }}
                  transition={{ duration: 1.5, repeat: liveSignal.level === "positive" ? Infinity : 0 }}
                />
                <span className={`text-xs ${signalStyle.text}`}>
                  {liveSignal.label}
                </span>
              </motion.div>
            ) : (
              <motion.span
                key="empty"
                className="text-xs text-zinc-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Start typing to begin analysis
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            disabled={isThinking}
            placeholder="Type your answer… (⌘↵ to submit)"
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-between">
          <motion.button
            onClick={onEndInterview}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors px-3 py-2 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
            whileTap={{ scale: 0.97 }}
          >
            <Square className="w-3.5 h-3.5" />
            End interview
          </motion.button>

          <motion.button
            onClick={handleSubmit}
            disabled={!answer.trim() || isThinking}
            className="flex items-center gap-2 bg-zinc-100 text-zinc-900 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={springConfig}
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </motion.button>
        </div>
      </div>
    </div>
  );
}
