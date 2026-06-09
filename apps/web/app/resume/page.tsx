"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Upload, CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  FileText, Users, TrendingUp, Target, Zap, BarChart2,
  AlertTriangle, Info, ArrowRight, RefreshCw, Clock, ArrowLeft,
  Cpu
} from "lucide-react";
import {
  motion, AnimatePresence, useInView, useMotionValue,
  useSpring, useTransform
} from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import AuthGuard from "../../components/AuthGuard";
import { SpatialPanel, InteractiveButton, AmbientGlow, NeuralPulse } from "../../components/ui/primitives";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Skill {
  name: string;
  category: string;
  confidence_score: number;
  mentions?: number;
}

interface AtsBreakdown {
  [key: string]: { score: number; max: number; label: string };
}

interface AtsScore {
  total_score: number;
  grade: string;
  breakdown: AtsBreakdown;
  word_count: number;
}

interface Contact {
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
}

interface ParsedData {
  name?: string;
  email?: string | null;
  contact?: Contact;
  summary?: string;
  skills?: Skill[];
  sections_found?: Record<string, boolean>;
  ats_score?: AtsScore;
  action_verbs_used?: string[];
  metrics_found?: number;
  improvement_tips?: string[];
  role_fit?: { role: string; pct: number; missing: string[] }[];
  recruiter_signals?: { positive: string[]; negative: string[] };
  shortlist_probability?: number;
  experience?: any[];
  education?: any[];
  projects?: any[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveRoleFit(skills: Skill[]): { role: string; pct: number; missing: string[] }[] {
  const cats = skills.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});

  const fe = cats["frontend"] || 0;
  const be = cats["backend"] || 0;
  const cloud = cats["cloud"] || 0;
  const ai = cats["ai"] || 0;
  const data = cats["data"] || 0;

  const roles = [
    {
      role: "Backend Engineer",
      pct: Math.min(97, Math.round(40 + be * 6 + cloud * 3 + data * 2)),
      missing: be < 3 ? ["Node.js / Go / Python", "REST API design"] : cloud < 2 ? ["Docker", "CI/CD"] : [],
    },
    {
      role: "Full-Stack Engineer",
      pct: Math.min(97, Math.round(20 + fe * 5 + be * 5 + data * 2)),
      missing: fe < 2 ? ["React / Next.js"] : be < 2 ? ["Express / FastAPI"] : [],
    },
    {
      role: "Frontend Engineer",
      pct: Math.min(97, Math.round(30 + fe * 8 + be * 1)),
      missing: fe < 3 ? ["React", "TypeScript", "CSS frameworks"] : [],
    },
    {
      role: "DevOps / Cloud Engineer",
      pct: Math.min(97, Math.round(15 + cloud * 10 + be * 2)),
      missing: cloud < 3 ? ["Kubernetes", "Terraform", "AWS/GCP"] : [],
    },
    {
      role: "ML / AI Engineer",
      pct: Math.min(97, Math.round(10 + ai * 10 + data * 3 + be * 2)),
      missing: ai < 2 ? ["PyTorch / TensorFlow", "ML fundamentals"] : [],
    },
  ];

  return roles.sort((a, b) => b.pct - a.pct);
}

function deriveRecruiterSignals(data: ParsedData): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];

  const skills = data.skills || [];
  const verbs = data.action_verbs_used || [];
  const metrics = data.metrics_found || 0;
  const sections = data.sections_found || {};
  const ats = data.ats_score;

  if (skills.length >= 10) positive.push("Strong technical breadth across multiple domains");
  if (skills.length >= 5 && skills.length < 10) positive.push("Solid core technical skill set");
  if (verbs.length >= 8) positive.push("Uses strong action-oriented language");
  if (metrics >= 3) positive.push("Quantified impact with measurable results");
  if (sections.projects) positive.push("Portfolio / project work demonstrated");
  if (data.contact?.github) positive.push("GitHub profile linked — verifiable work");
  if (data.contact?.linkedin) positive.push("LinkedIn presence established");
  if (ats && ats.word_count >= 300 && ats.word_count <= 900) positive.push("Appropriate resume length (concise and complete)");

  if (metrics < 2) negative.push("Missing measurable impact — bullets lack quantified outcomes");
  if (verbs.length < 5) negative.push("Weak action verbs — bullets feel passive or vague");
  if (!sections.summary) negative.push("No professional summary — recruiter has no quick context");
  if (skills.length < 5) negative.push("Thin technical skill coverage");
  if (!data.contact?.linkedin && !data.contact?.github) negative.push("No professional profile links");
  if (ats && ats.word_count < 250) negative.push("Resume too sparse — insufficient detail for evaluation");

  return { positive, negative };
}

function deriveShortlistProbability(data: ParsedData): number {
  const ats = data.ats_score?.total_score || 0;
  const metrics = data.metrics_found || 0;
  const verbs = (data.action_verbs_used || []).length;
  const skills = (data.skills || []).length;

  let score = Math.round(ats * 0.5 + Math.min(metrics * 5, 20) + Math.min(verbs * 1.5, 15) + Math.min(skills * 0.5, 15));
  return Math.min(Math.max(score, 5), 95);
}

function deriveResumeTier(ats: number): { tier: string; description: string } {
  if (ats >= 85) return { tier: "Tier 1", description: "Top-quartile candidate profile" };
  if (ats >= 70) return { tier: "Tier 2", description: "Competitive — passes most screens" };
  if (ats >= 55) return { tier: "Tier 3", description: "Borderline — needs targeted improvements" };
  return { tier: "Tier 4", description: "Below threshold — significant gaps detected" };
}

function groupSkillsByDomain(skills: Skill[]): Record<string, Skill[]> {
  const labels: Record<string, string> = {
    frontend: "Frontend & UI",
    backend: "Backend & APIs",
    cloud: "Cloud & DevOps",
    data: "Databases & Storage",
    ai: "AI / ML",
    tools: "Developer Tools",
    other: "Engineering Practices",
  };
  const grouped: Record<string, Skill[]> = {};
  for (const skill of skills) {
    const label = labels[skill.category] || "Other";
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(skill);
  }
  return grouped;
}

// ── Animation variants ─────────────────────────────────────────────────────────

const fadeUp: any = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i, 3) * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const fadeIn: any = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const springConfig = { type: "spring" as const, stiffness: 260, damping: 28 };

// ── Animated number counter ────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => { if (inView) motionVal.set(value); }, [inView, value, motionVal]);
  return <motion.span ref={ref}>{display}</motion.span>;
}

// ── Animated progress bar ──────────────────────────────────────────────────────

function AnimatedBar({
  pct, color, delay = 0,
}: { pct: number; color: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="w-full bg-zinc-900/60 rounded-full h-1.5 overflow-hidden border border-zinc-800/30">
      <motion.div
        className={`h-1.5 rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={inView ? { width: `${pct}%` } : { width: 0 }}
        transition={{ duration: 0.95, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

// ── Loading stage component ────────────────────────────────────────────────────

const ANALYSIS_STAGES = [
  "Parsing resume structure",
  "Detecting technical domains",
  "Benchmarking ATS compatibility",
  "Computing recruiter readability",
  "Evaluating impact language",
  "Generating role fit predictions",
];

function AnalysisLoader() {
  const [stageIndex, setStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        const next = prev + 1;
        setCompletedStages((c) => [...c, prev]);
        if (next >= ANALYSIS_STAGES.length) {
          clearInterval(interval);
          return prev;
        }
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <SpatialPanel glow={true} interactive={false} className="border-zinc-900/80 bg-zinc-950/40 p-8 max-w-sm w-full mx-auto relative overflow-hidden shadow-2xl rounded-2xl">
      <div className="flex flex-col items-center gap-6 relative z-10">
        {/* Ring Spinner */}
        <div className="relative w-16 h-16">
          <motion.div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-violet-400 animate-pulse" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-zinc-200 font-semibold text-sm font-outfit">Analyzing resume telemetry</p>
          <p className="text-zinc-600 text-[10px] font-mono flex items-center justify-center gap-1.5 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-zinc-700" /> Typically 10–20 seconds
          </p>
        </div>

        {/* Stage list */}
        <div className="w-full space-y-2.5 pt-4 border-t border-zinc-900/60">
          {ANALYSIS_STAGES.map((stage, i) => {
            const done = completedStages.includes(i);
            const active = stageIndex === i;
            return (
              <motion.div
                key={stage}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: i <= stageIndex ? 1 : 0.2, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
              >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  {done ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springConfig}>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </motion.div>
                  ) : active ? (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                  )}
                </div>
                <span className={`text-xs font-outfit ${done ? "text-zinc-400" : active ? "text-zinc-200 font-medium" : "text-zinc-600"}`}>
                  {stage}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SpatialPanel>
  );
}

// ── Section card with scroll-triggered reveal ──────────────────────────────────

function SectionCard({
  title, icon, children, defaultOpen = true, delay = 0,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  defaultOpen?: boolean; delay?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      <SpatialPanel glow={true} interactive={false} className="border-zinc-900/80 bg-zinc-950/40 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
        <motion.button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-6 py-4.5 bg-zinc-950/40 hover:bg-zinc-900/20 transition-colors border-b border-zinc-900/80"
          whileTap={{ scale: 0.995 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-zinc-500">{icon}</span>
            <span className="text-[11px] font-mono font-bold text-zinc-400 tracking-widest uppercase">{title}</span>
          </div>
          <motion.span
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ChevronUp className="w-4 h-4 text-zinc-600 hover:text-zinc-400 transition-colors" />
          </motion.span>
        </motion.button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-950/10 px-6 py-5.5">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </SpatialPanel>
    </motion.div>
  );
}

// ── Score row with animated bar ────────────────────────────────────────────────

function ScoreRow({
  label, score, max, reasoning, index = 0,
}: {
  label: string; score: number; max: number; reasoning?: string; index?: number;
}) {
  const pct = Math.round((score / max) * 100);
  const barColor = pct >= 75 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  const textColor = pct >= 75 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <motion.div
      className="py-4.5 border-b border-zinc-900 last:border-0"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm text-zinc-300 font-outfit">{label}</span>
        <span className={`text-xs sm:text-sm font-mono font-semibold ${textColor}`}>
          <AnimatedNumber value={score} />
          <span className="text-zinc-600">/{max}</span>
        </span>
      </div>
      <AnimatedBar pct={pct} color={barColor} delay={Math.min(index, 3) * 0.04 + 0.05} />
      {reasoning && (
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed font-outfit">{reasoning}</p>
      )}
    </motion.div>
  );
}

// ── Stat pill with animated number ────────────────────────────────────────────

function StatPill({
  value, label, color = "text-zinc-100", numericValue, suffix = "",
}: {
  value: string | number; label: string; color?: string;
  numericValue?: number; suffix?: string;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center border border-zinc-900/80 rounded-xl px-5 py-3.5 bg-zinc-950/80 relative overflow-hidden min-w-[90px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]"
      whileHover={{
        y: -2,
        borderColor: "rgba(255,255,255,0.1)",
        boxShadow: "0 10px 20px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.05)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <span className={`text-2xl font-bold font-mono tracking-tight ${color} relative z-10`}>
        {numericValue !== undefined
          ? <AnimatedNumber value={numericValue} suffix={suffix} />
          : value}
      </span>
      <span className="text-[9px] font-mono tracking-widest text-zinc-500 mt-1.5 uppercase text-center whitespace-nowrap relative z-10">{label}</span>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ResumePage() {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [expandedTip, setExpandedTip] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load previous resume on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${apiBase}/api/v1/resumes/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.parsed_json && Object.keys(d.parsed_json).length > 0) {
          setParsedData(d.parsed_json);
          setIsDone(true);
        }
      })
      .catch(() => {/* no previous resume */ });
  }, [token]);

  // Polling logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resumeId && isUploading) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${apiBase}/api/v1/resumes/${resumeId}/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.status === "ready") {
            setIsUploading(false);
            setIsDone(true);
            setParsedData(data.data);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [resumeId, isUploading, token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5 MB limit.");
      return;
    }

    setIsUploading(true);
    setIsDone(false);
    setError(null);
    setParsedData(null);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiBase}/api/v1/resumes/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResumeId(data.resumeId);
      } else {
        setError(data.error || "Upload failed.");
        setIsUploading(false);
      }
    } catch {
      setError("Network error during upload.");
      setIsUploading(false);
    }
  }, [token]);

  const handleReset = () => {
    setIsDone(false);
    setParsedData(null);
    setResumeId(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const skills = parsedData?.skills || [];
  const ats = parsedData?.ats_score;
  const roleFit = parsedData?.role_fit || (parsedData ? deriveRoleFit(skills) : []);
  const recruiterSignals = parsedData?.recruiter_signals || (parsedData ? deriveRecruiterSignals(parsedData) : { positive: [], negative: [] });
  const shortlistPct = parsedData?.shortlist_probability ?? (parsedData ? deriveShortlistProbability(parsedData) : 0);
  const tier = ats ? deriveResumeTier(ats.total_score) : null;
  const skillGroups = groupSkillsByDomain(skills);

  const atsReasoningMap: Record<string, string> = {
    contact_info: "ATS systems and recruiters verify identity and reachability. Missing contact details reduce credibility.",
    sections: "Structured sections (Experience, Education, Skills) are required for ATS parsers to correctly categorize content.",
    skills: "Keyword density directly affects ATS ranking. More relevant skills = higher match rate against job descriptions.",
    action_verbs: "Strong verbs signal ownership and impact. Passive language reduces perceived contribution.",
    metrics: "Quantified achievements are the single strongest signal of real-world impact to both ATS and human reviewers.",
    length: "Resumes under 250 words lack substance; over 1000 words lose recruiter attention. 400–700 is optimal.",
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col relative overflow-hidden">
        {/* Cinematic atmospheric glowing plate */}
        <AmbientGlow size="lg" color="mixed" className="-top-[240px] left-1/4 opacity-15" />
        <AmbientGlow size="lg" color="cyan" className="-bottom-[200px] -right-[100px] opacity-10" />

        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 px-6 pt-4 pb-2 bg-[#030303]/90 backdrop-blur-md border-b border-zinc-900/60 relative">
          <div className="max-w-5xl mx-auto flex items-center justify-between w-full">
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <Link href="/dashboard">
                <motion.div
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 cursor-pointer"
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Dashboard
                </motion.div>
              </Link>
            </motion.div>

            {isDone && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <InteractiveButton variant="glow" onClick={handleReset} className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Upload New Resume
                </InteractiveButton>
              </motion.div>
            )}
          </div>
        </div>

        {!isDone ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
            <motion.div
              className="w-full max-w-xl space-y-8"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* Header */}
              <motion.div className="text-center space-y-2.5" variants={fadeUp} custom={0}>
                <div className="flex justify-center mb-1">
                  <NeuralPulse size="md" label="Telemetry Scanner" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 font-outfit mt-3">
                  Resume Intelligence
                </h1>
                <p className="text-zinc-400 mt-2 text-sm leading-relaxed max-w-lg mx-auto">
                  Ingest your resume telemetry matrix to benchmark ATS indices, evaluate recruiter signal density, and calculate role fit profiles.
                </p>
              </motion.div>

              {/* Error block */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-3 bg-red-950/40 border border-red-800/50 text-red-400 px-4 py-3 rounded-xl mb-4 text-xs font-outfit shadow-xl"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Drop Zone */}
              <motion.div variants={fadeUp} custom={1}>
                <AnimatePresence mode="wait">
                  {isUploading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="py-10"
                    >
                      <AnalysisLoader />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file && !isUploading) processFile(file);
                      }}
                      className="cursor-pointer"
                    >
                      <SpatialPanel
                        glow={true}
                        interactive={true}
                        className={`border border-dashed p-0 transition-all duration-300 rounded-2xl relative overflow-hidden ${isDragOver
                            ? "border-violet-500 bg-violet-500/[0.04] scale-[1.01]"
                            : "border-zinc-800 bg-zinc-950/20 hover:border-zinc-600 hover:bg-zinc-900/10"
                          }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-5 p-12 text-center w-full h-full">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.docx,.doc,.txt"
                          />

                          <motion.div
                            className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]"
                            whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.12)" }}
                            transition={springConfig}
                          >
                            <Upload className="w-5 h-5 text-zinc-400 block -translate-y-[1px]" />
                          </motion.div>
                          <div className="space-y-1">
                            <p className="text-zinc-200 font-semibold font-outfit text-sm sm:text-base">
                              {isDragOver ? "Release matrix to parse" : "Drop resume here or browse files"}
                            </p>
                            <p className="text-zinc-500 text-xs font-mono tracking-wider uppercase">PDF, DOCX, DOC, TXT — up to 5 MB</p>
                          </div>
                        </div>
                      </SpatialPanel>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Scannability cards */}
              <motion.div
                className="grid grid-cols-3 gap-3"
                variants={staggerContainer}
              >
                {[
                  { label: "ATS Index Matrix", desc: "6-dimension metrics" },
                  { label: "Role Alignment Fit", desc: "5 engineering tracks" },
                  { label: "Telemetry Cluster", desc: "Domain skill maps" },
                ].map((f, i) => (
                  <motion.div
                    key={f.label}
                    variants={fadeUp}
                    custom={i + 2}
                  >
                    <SpatialPanel glow={true} interactive={true} className="p-3 text-center border-zinc-900/80 bg-zinc-950/20 h-full flex flex-col justify-center">
                      <p className="text-xs font-semibold text-zinc-300 font-outfit">{f.label}</p>
                      <p className="text-[10px] font-mono text-zinc-600 mt-1">{f.desc}</p>
                    </SpatialPanel>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-10 space-y-7 w-full relative z-10">
            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex items-start justify-between flex-wrap gap-4"
            >
              <div>
                <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Analysis Complete</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mt-1 font-outfit">
                  {parsedData?.name ? `${parsedData.name}'s Intelligence` : "Intelligence Report"}
                </h1>
              </div>
            </motion.div>

            {/* Hero Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <SpatialPanel glow={true} interactive={false} className="border-zinc-900/80 bg-zinc-950/40 relative overflow-hidden py-6 px-7 shadow-2xl">
                <AmbientGlow size="md" color="violet" className="-top-20 -right-20 opacity-15" />
                <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                  <div className="space-y-3.5 flex-1">
                    <div className="flex items-center gap-3">
                      {tier && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2, ...springConfig }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md border font-mono tracking-widest uppercase
                            ${tier.tier === "Tier 1" ? "bg-emerald-950/50 text-emerald-400 border-emerald-900/40" :
                              tier.tier === "Tier 2" ? "bg-blue-950/50 text-blue-400 border-blue-900/40" :
                                tier.tier === "Tier 3" ? "bg-amber-950/50 text-amber-400 border-amber-900/40" :
                                  "bg-red-950/50 text-rose-400 border-red-900/40"}`}
                        >
                          {tier.tier}
                        </motion.span>
                      )}
                      {tier && (
                        <motion.span
                          className="text-xs text-zinc-500 font-outfit"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          {tier.description}
                        </motion.span>
                      )}
                    </div>
                    <motion.p
                      className="text-zinc-300 text-sm leading-relaxed max-w-2xl font-outfit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25, duration: 0.5 }}
                    >
                      {parsedData?.summary || "Analysis complete."}
                    </motion.p>
                  </div>
                  <motion.div
                    className="flex gap-3.5 shrink-0 w-full md:w-auto justify-start md:justify-end"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <StatPill
                      value={ats?.total_score ?? 0}
                      numericValue={ats?.total_score ?? 0}
                      label="ATS Score"
                      color={
                        (ats?.total_score ?? 0) >= 75 ? "text-emerald-400" :
                          (ats?.total_score ?? 0) >= 55 ? "text-amber-400" : "text-rose-400"
                      }
                    />
                    <StatPill
                      value={`${shortlistPct}%`}
                      numericValue={shortlistPct}
                      suffix="%"
                      label="Shortlist Prob"
                      color={
                        shortlistPct >= 65 ? "text-emerald-400" :
                          shortlistPct >= 45 ? "text-amber-400" : "text-rose-400"
                      }
                    />
                    <StatPill
                      value={skills.length}
                      numericValue={skills.length}
                      label="Skills Found"
                    />
                  </motion.div>
                </div>
              </SpatialPanel>
            </motion.div>

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

              {/* Left Column Stack */}
              <div className="flex flex-col gap-6">
                {/* ATS Analysis */}
                <SectionCard title="ATS Score Telemetry" icon={<Target className="w-4.5 h-4.5" />} delay={0}>
                  <div className="mb-6 flex items-center gap-4.5 pb-4 border-b border-zinc-900">
                    <motion.div
                      className="text-4xl font-black font-mono text-zinc-100"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, ...springConfig }}
                    >
                      <AnimatedNumber value={ats?.total_score ?? 0} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-0.5">
                      <div className={`text-sm font-bold font-outfit
                        ${ats?.grade === "Excellent" ? "text-emerald-400" :
                          ats?.grade === "Good" ? "text-blue-400" :
                            ats?.grade === "Average" ? "text-amber-400" : "text-rose-400"}`}>
                        {ats?.grade} Grade
                      </div>
                      <div className="text-xs text-zinc-500 font-mono tracking-wide uppercase">
                        {ats?.word_count} words ·{" "}
                        {ats?.word_count && ats.word_count >= 300 && ats.word_count <= 900
                          ? "Optimal substance density" : ats?.word_count && ats.word_count < 300 ? "Too short" : "Too long"}
                      </div>
                    </motion.div>
                  </div>
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-0.5">
                    {ats?.breakdown && Object.entries(ats.breakdown).map(([key, val], i) => (
                      <ScoreRow key={key} label={val.label} score={val.score} max={val.max} reasoning={atsReasoningMap[key]} index={i} />
                    ))}
                  </motion.div>
                </SectionCard>

                {/* Role Fit */}
                <SectionCard title="Vector Alignment Score" icon={<BarChart2 className="w-4.5 h-4.5" />} delay={2}>
                  <p className="text-xs text-zinc-500 mb-5 font-outfit">
                    Weighted category fit tracking how well your resume matches technical roles based on skill density models.
                  </p>
                  <motion.div className="space-y-4.5" variants={staggerContainer} initial="hidden" animate="visible">
                    {roleFit.map((r, i) => (
                      <motion.div key={r.role} variants={fadeUp} custom={i} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {i === 0 && (
                              <motion.span
                                className="text-[9px] font-mono tracking-widest bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded-md"
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2, ...springConfig }}
                              >
                                Prime
                              </motion.span>
                            )}
                            <span className="text-xs text-zinc-300 font-outfit">{r.role}</span>
                          </div>
                          <span className={`text-xs font-mono font-semibold ${r.pct >= 70 ? "text-emerald-400" : r.pct >= 50 ? "text-amber-400" : "text-zinc-500"}`}>
                            <AnimatedNumber value={r.pct} suffix="%" />
                          </span>
                        </div>
                        <AnimatedBar pct={r.pct} color={r.pct >= 70 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : r.pct >= 50 ? "bg-amber-500" : "bg-zinc-700"} delay={i * 0.08} />
                        {r.missing.length > 0 && (
                          <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1 font-mono">
                            <ArrowRight className="w-3 h-3 text-zinc-700" />
                            Missing targets: {r.missing.join(", ")}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                </SectionCard>

                {/* Improvement Paths */}
                <SectionCard title="Priority Optimization Gaps" icon={<TrendingUp className="w-4.5 h-4.5" />} delay={4}>
                  <p className="text-xs text-zinc-500 mb-5 font-outfit">
                    Chronological recommendations designed to maximize ATS parsing metrics and human recruiter interest.
                  </p>
                  <motion.div className="space-y-2.5" variants={staggerContainer} initial="hidden" animate="visible">
                    {(parsedData?.improvement_tips || []).map((tip, i) => (
                      <motion.div
                        key={i}
                        variants={fadeUp}
                        custom={i}
                      >
                        <SpatialPanel glow={false} interactive={true} className="p-0 overflow-hidden border-zinc-900 bg-zinc-950/20 hover:bg-zinc-900/10">
                          <motion.button
                            onClick={() => setExpandedTip(expandedTip === i ? null : i)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left font-outfit"
                            whileTap={{ scale: 0.995 }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-zinc-600 w-5">{String(i + 1).padStart(2, "0")}</span>
                              <span className="text-xs sm:text-sm text-zinc-200">{tip}</span>
                            </div>
                            <motion.span animate={{ rotate: expandedTip === i ? 180 : 0 }} transition={{ duration: 0.25 }}>
                              <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0 ml-3" />
                            </motion.span>
                          </motion.button>
                          <AnimatePresence>
                            {expandedTip === i && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="border-t border-zinc-900"
                              >
                                <div className="px-4.5 pb-3.5 pt-2.5 bg-zinc-950/60 font-outfit">
                                  <p className="text-xs text-zinc-500 leading-relaxed flex items-start gap-2.5">
                                    <Info className="w-4 h-4 shrink-0 text-zinc-600" />
                                    <span>This recommendation acts directly upon a structural telemetry gap detected in our scan. Fixing it yields immediate return on ATS compatibility runs.</span>
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </SpatialPanel>
                      </motion.div>
                    ))}
                    {(!parsedData?.improvement_tips || parsedData.improvement_tips.length === 0) && (
                      <p className="text-xs text-zinc-600 font-outfit">No priority improvements generated.</p>
                    )}
                  </motion.div>
                </SectionCard>
              </div>

              {/* Right Column Stack */}
              <div className="flex flex-col gap-6">
                {/* Recruiter Simulation */}
                <SectionCard title="Recruiter Signal Simulation" icon={<Users className="w-4.5 h-4.5" />} delay={1}>
                  <p className="text-xs text-zinc-500 mb-5 leading-relaxed font-outfit">
                    Simulated recruiter scan index calculated from visual structures, active keywords, and impact metrics.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                      <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Optimal Highlights</p>
                      <ul className="space-y-2">
                        {recruiterSignals.positive.length > 0 ? recruiterSignals.positive.map((s, i) => (
                          <motion.li key={i} variants={fadeUp} custom={i} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed font-outfit">
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 + 0.1, ...springConfig }} className="shrink-0 mt-0.5">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            </motion.span>
                            <span>{s}</span>
                          </motion.li>
                        )) : <li className="text-xs text-zinc-600 font-outfit">No highlights registered.</li>}
                      </ul>
                    </motion.div>
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                      <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Gaps & Flags</p>
                      <ul className="space-y-2">
                        {recruiterSignals.negative.length > 0 ? recruiterSignals.negative.map((s, i) => (
                          <motion.li key={i} variants={fadeUp} custom={i} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed font-outfit">
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 + 0.1, ...springConfig }} className="shrink-0 mt-0.5">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </motion.span>
                            <span>{s}</span>
                          </motion.li>
                        )) : <li className="text-xs text-zinc-500 font-outfit">No high-risk concerns detected.</li>}
                      </ul>
                    </motion.div>
                  </div>
                  <div className="border-t border-zinc-900/60 pt-4.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Average Pass Probability</p>
                      <p className="text-[10px] text-zinc-600 font-outfit">Calculated from aggregate keyword density patterns</p>
                    </div>
                    <motion.span
                      className={`text-2xl font-bold font-mono ${shortlistPct >= 65 ? "text-emerald-400" : shortlistPct >= 45 ? "text-amber-400" : "text-rose-400"}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, ...springConfig }}
                    >
                      <AnimatedNumber value={shortlistPct} suffix="%" />
                    </motion.span>
                  </div>
                </SectionCard>

                {/* Skill Intelligence */}
                <SectionCard title="Telemetry Cluster Groups" icon={<Zap className="w-4.5 h-4.5" />} delay={3}>
                  <p className="text-xs text-zinc-500 mb-5 font-outfit">
                    Extracted technologies grouped systematically by domain boundaries, scaled by context mention scores.
                  </p>
                  {Object.keys(skillGroups).length > 0 ? (
                    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
                      {Object.entries(skillGroups).map(([domain, domainSkills], di) => (
                        <motion.div key={domain} variants={fadeUp} custom={di} className="space-y-2">
                          <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">{domain}</p>
                          <div className="flex flex-wrap gap-2">
                            {domainSkills.map((skill, si) => {
                              const highConf = skill.confidence_score >= 85;
                              const medConf = skill.confidence_score >= 65;
                              return (
                                <motion.div
                                  key={skill.name}
                                  className="flex items-center gap-2 border border-zinc-900 bg-zinc-950/60 rounded-xl px-3 py-1.5 cursor-default shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] hover:border-zinc-800 hover:bg-zinc-900/10 transition-colors"
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: di * 0.04 + si * 0.02, duration: 0.25 }}
                                  whileHover={{ y: -1 }}
                                >
                                  <span className="text-xs text-zinc-200 font-outfit">{skill.name}</span>
                                  {/* Mini HSL backglow confidence dot */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`w-1.5 h-1.5 rounded-full ${highConf ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" :
                                        medConf ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "bg-zinc-600"
                                      }`} />
                                    <span className="text-[9px] font-mono text-zinc-500">{skill.confidence_score}%</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <p className="text-xs text-zinc-600 font-outfit">No telemetry skills detected. Verify technological section formatting.</p>
                  )}
                </SectionCard>

                {/* AI Reasoning */}
                <SectionCard title="Telemetry Evidence Basis" icon={<FileText className="w-4.5 h-4.5" />} defaultOpen={false} delay={5}>
                  <p className="text-xs text-zinc-500 mb-5 leading-relaxed font-outfit">
                    Underlying structural facts and weights calculated directly from your raw resume telemetry block.
                  </p>
                  <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
                    <ReasoningBlock
                      label="ATS Score Formula basis"
                      items={[
                        `Contact integrity: email ${parsedData?.contact?.email ? "validated" : "missing"}, phone ${parsedData?.contact?.phone ? "validated" : "missing"}, LinkedIn ${parsedData?.contact?.linkedin ? "validated" : "missing"}, GitHub ${parsedData?.contact?.github ? "validated" : "missing"}`,
                        `Semantic sections: ${Object.entries(parsedData?.sections_found || {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "none detected"}`,
                        `Skill items: ${skills.length} target tags clusters across ${Object.keys(skillGroups).length} domains`,
                        `Action verbs tracked: ${(parsedData?.action_verbs_used || []).slice(0, 6).join(", ") || "none"}`,
                        `Measurable outcomes: ${parsedData?.metrics_found ?? 0} instances of quantified telemetry`,
                        `Word-count: ${ats?.word_count ?? 0} words`,
                      ]}
                    />
                    <ReasoningBlock
                      label="Shortlist Probability weight"
                      items={[
                        `ATS compatibility indices contributes 50% weight (${ats?.total_score ?? 0} → ${Math.round((ats?.total_score ?? 0) * 0.5)} points)`,
                        `Measurable outcome nodes contribute up to 20 points (${parsedData?.metrics_found ?? 0} detected → ${Math.min((parsedData?.metrics_found ?? 0) * 5, 20)} points)`,
                        `Action verb active syntax contributes up to 15 points (${(parsedData?.action_verbs_used || []).length} verbs → ${Math.min((parsedData?.action_verbs_used || []).length * 1.5, 15)} points)`,
                        `Overall skill matrix breadth contributes up to 15 points (${skills.length} skills → ${Math.min(skills.length * 0.5, 15)} points)`,
                      ]}
                    />
                    <ReasoningBlock
                      label="Skill Cluster density"
                      items={[
                        `Frontend nodes: ${(parsedData?.skills || []).filter(s => s.category === "frontend").map(s => s.name).join(", ") || "none"}`,
                        `Backend nodes: ${(parsedData?.skills || []).filter(s => s.category === "backend").map(s => s.name).join(", ") || "none"}`,
                        `DevOps / Cloud infrastructure: ${(parsedData?.skills || []).filter(s => s.category === "cloud").map(s => s.name).join(", ") || "none"}`,
                        `AI / ML components: ${(parsedData?.skills || []).filter(s => s.category === "ai").map(s => s.name).join(", ") || "none"}`,
                      ]}
                    />
                  </motion.div>
                </SectionCard>
              </div>

            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

function ReasoningBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <motion.div
      variants={fadeUp}
      className="border border-zinc-900/80 bg-zinc-950/80 rounded-xl p-4 font-mono text-[11px] leading-relaxed shadow-lg relative overflow-hidden group hover:border-zinc-800 transition-colors"
      whileHover={{ y: -1 }}
    >
      <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-3.5 border-b border-zinc-900 pb-1.5">{label}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <motion.li
            key={i}
            className="text-zinc-400 flex items-start gap-2.5 leading-relaxed"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            <span className="text-zinc-700 select-none">//</span>
            <span>{item}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
