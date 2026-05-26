"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { springConfig } from "./motion";

const STAGES = [
  "Loading resume profile",
  "Analyzing skill signals",
  "Calibrating question difficulty",
  "Preparing adaptive interview flow",
  "Initializing AI interviewer",
];

export function InterviewLoading() {
  const [stageIdx, setStageIdx] = useState(0);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      setStageIdx((prev) => {
        const next = prev + 1;
        setDone((d) => [...d, prev]);
        if (next >= STAGES.length) { clearInterval(iv); return prev; }
        return next;
      });
    }, 900);
    return () => clearInterval(iv);
  }, []);

  return (
    <motion.div
      className="flex flex-col items-center gap-6 py-24"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-zinc-300"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="text-center">
        <p className="text-zinc-200 font-medium text-sm">Preparing your interview</p>
        <p className="text-zinc-600 text-xs mt-1">Personalizing questions from your resume</p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        {STAGES.map((stage, i) => {
          const isDone = done.includes(i);
          const isActive = stageIdx === i;
          return (
            <motion.div
              key={stage}
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: i <= stageIdx ? 1 : 0.2, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={springConfig}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                ) : isActive ? (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-zinc-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                )}
              </div>
              <span
                className={`text-xs ${
                  isDone ? "text-zinc-400" : isActive ? "text-zinc-200" : "text-zinc-600"
                }`}
              >
                {stage}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
