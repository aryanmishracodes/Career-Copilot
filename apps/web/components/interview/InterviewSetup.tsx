"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Play, Cpu, Layers, Zap, BarChart2, Users, Target, Brain, Activity, Clock
} from "lucide-react";
import { fadeUp, staggerContainer, springConfig } from "./motion";
import { INTERVIEW_TYPES, suggestInterviewType, INTERVIEWER_PERSONALITIES, INTERVIEW_LENGTHS } from "./engine";
import type { ResumeData, InterviewType, PersonalityId } from "./types";
import { SpatialPanel, InteractiveButton, AmbientGlow } from "../ui/primitives";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  technical_screening: <Cpu className="w-4.5 h-4.5" />,
  backend:             <Layers className="w-4.5 h-4.5" />,
  frontend:            <Zap className="w-4.5 h-4.5" />,
  system_design:       <BarChart2 className="w-4.5 h-4.5" />,
  behavioral:          <Users className="w-4.5 h-4.5" />,
  resume_deep_dive:    <Target className="w-4.5 h-4.5" />,
  dsa:                 <Brain className="w-4.5 h-4.5" />,
  devops:              <Activity className="w-4.5 h-4.5" />,
};

interface Props {
  resume: ResumeData | null;
  onStart: (type: InterviewType, role: string, personality: PersonalityId, questions: number) => void;
}

export function InterviewSetup({ resume, onStart }: Props) {
  const [selected, setSelected] = useState<InterviewType | null>(null);
  const [role, setRole] = useState("Software Engineer");
  const [personality, setPersonality] = useState<PersonalityId>("faang_engineer");
  const [selectedLength, setSelectedLength] = useState(10);

  const skills = (resume?.skills ?? []).slice(0, 6).map((s) => s.name);
  const suggestedId = suggestInterviewType(resume);

  return (
    <div className="w-full overflow-x-hidden">
      <motion.div
        className="max-w-5xl mx-auto px-6 py-10 space-y-8"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="space-y-1.5">
          <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Interactive Simulation Suite</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-outfit">Configure Your Interview</h1>
          <p className="text-zinc-500 text-sm font-outfit max-w-xl leading-relaxed">
            The spatial AI interviewer adapts diagnostic inquiries based on your resume, target role, and active response patterns.
          </p>
        </motion.div>

        {/* Resume context loaded panel */}
        {resume && (
          <motion.div variants={fadeUp}>
            <SpatialPanel glow={true} interactive={false} className="border-emerald-500/25 bg-emerald-500/[0.02] backdrop-blur-xl px-5 py-4">
              <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                <span className="text-[9px] font-mono tracking-widest font-bold px-2 py-0.5 rounded-md border bg-emerald-950/40 text-emerald-400 border-emerald-900/40 uppercase shrink-0">
                  Telemetry Active
                </span>
                <span className="text-xs text-zinc-500 font-outfit">
                  Simulation calibrated from parsed resume profile
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-900/50">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] font-mono bg-zinc-900/80 text-zinc-400 border border-zinc-800/40 rounded px-2.5 py-1 select-none"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </SpatialPanel>
          </motion.div>
        )}

        {/* Target role inputs */}
        <motion.div variants={fadeUp} className="space-y-2.5">
          <label className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
            Target Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full max-w-sm bg-zinc-950/80 border border-zinc-900 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-200 placeholder-zinc-700 font-outfit focus:outline-none focus:border-zinc-700 hover:border-zinc-800 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.015)]"
            placeholder="e.g. Senior Backend Engineer"
          />
        </motion.div>

        {/* Interview type selector grid */}
        <motion.div variants={fadeUp} className="space-y-3.5">
          <label className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
            Simulation Matrix Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {INTERVIEW_TYPES.map((type, i) => {
              const isSuggested = type.id === suggestedId;
              const isSelected = selected?.id === type.id;
              return (
                <motion.div
                  key={type.id}
                  onClick={() => setSelected(type)}
                  className="cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 + 0.15, duration: 0.35 }}
                >
                  <SpatialPanel
                    glow={true}
                    interactive={true}
                    className={`h-full flex flex-col justify-between gap-4 border ${
                      isSelected
                        ? "border-zinc-500 bg-zinc-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                        : "border-zinc-900/80 bg-zinc-950/20 hover:border-zinc-800"
                    }`}
                  >
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`shrink-0 transition-colors duration-300 ${isSelected ? "text-violet-400" : "text-zinc-600"}`}>
                            {TYPE_ICONS[type.id]}
                          </span>
                          <span className={`text-sm font-semibold truncate font-outfit ${isSelected ? "text-zinc-100" : "text-zinc-300"}`}>
                            {type.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSuggested && (
                            <motion.span
                              className="text-[9px] font-mono tracking-widest font-bold px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-900/35 uppercase"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4, ...springConfig }}
                            >
                              Suggested
                            </motion.span>
                          )}
                          <span className={`text-[9px] font-mono tracking-widest uppercase ${
                            type.difficulty === "Senior" ? "text-rose-400" :
                            type.difficulty === "Mid" ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {type.difficulty}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed font-outfit">{type.description}</p>
                    </div>

                    {/* Footer domain tags */}
                    <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-zinc-900/50">
                      {type.domains.slice(0, 3).map((d) => (
                        <span key={d} className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide bg-zinc-950 border border-zinc-900/40 rounded px-2 py-0.5">
                          {d}
                        </span>
                      ))}
                    </div>
                  </SpatialPanel>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Interviewer style */}
        <motion.div variants={fadeUp} className="space-y-3.5">
          <label className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
            Diagnostic Persona Style
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INTERVIEWER_PERSONALITIES.map((p) => {
              const isActive = personality === p.id;
              return (
                <motion.div
                  key={p.id}
                  onClick={() => setPersonality(p.id)}
                  className="cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                >
                  <SpatialPanel
                    glow={isActive}
                    className={`h-full flex flex-col justify-between p-4 border ${
                      isActive
                        ? "border-zinc-600 bg-zinc-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                        : "border-zinc-900 bg-zinc-950/20 hover:border-zinc-800"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-xs font-semibold font-outfit ${isActive ? "text-zinc-100 font-bold" : "text-zinc-300"}`}>
                          {p.name}
                        </span>
                        <span className={`text-[9px] font-mono tracking-widest uppercase ${
                          p.strictness === "High" ? "text-rose-400" :
                          p.strictness === "Medium" ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          {p.strictness} strictness
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-outfit font-medium leading-none">{p.title}</p>
                      <p className="text-xs text-zinc-600 font-outfit leading-relaxed">{p.tone}</p>
                    </div>
                  </SpatialPanel>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Interview length */}
        <motion.div variants={fadeUp} className="space-y-3.5">
          <label className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
            Simulation Scope Length
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {INTERVIEW_LENGTHS.map((len) => {
              const isActive = selectedLength === len.questions;
              return (
                <motion.div
                  key={len.questions}
                  onClick={() => setSelectedLength(len.questions)}
                  className="cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                >
                  <SpatialPanel
                    glow={isActive}
                    className={`h-full flex flex-col justify-between p-4 border ${
                      isActive
                        ? "border-zinc-600 bg-zinc-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                        : "border-zinc-900 bg-zinc-950/20 hover:border-zinc-800"
                    }`}
                  >
                    <div className="space-y-2 font-outfit">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-base font-bold font-mono tracking-tight ${isActive ? "text-zinc-100" : "text-zinc-300"}`}>
                          {len.questions}Q
                        </span>
                        <span className={`text-[9px] font-mono tracking-widest uppercase ${len.intensityColor}`}>
                          {len.intensity}
                        </span>
                      </div>
                      <p className={`text-xs leading-none font-semibold ${isActive ? "text-zinc-400" : "text-zinc-600"}`}>{len.label}</p>
                      <p className="text-xs text-zinc-600 flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-700" />
                        <span className="font-mono">{len.duration}</span>
                      </p>
                    </div>
                  </SpatialPanel>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Start button triggers */}
        <motion.div variants={fadeUp} className="pb-6">
          <InteractiveButton
            onClick={() => selected && onStart(selected, role, personality, selectedLength)}
            disabled={!selected}
            variant="primary"
            className="px-6 py-3.5 flex items-center gap-2"
          >
            <Play className="w-4.5 h-4.5 text-zinc-950 fill-zinc-950" />
            Begin Simulation
            {selected && (
              <span className="text-zinc-500 font-normal font-mono">— {selected.label}</span>
            )}
          </InteractiveButton>
          {!selected && (
            <p className="text-[10px] font-mono tracking-wider text-zinc-600 uppercase mt-2">Select a simulation matrix type to unlock diagnostic begin triggers</p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
