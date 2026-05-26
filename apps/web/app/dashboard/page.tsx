"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CheckCircle, AlertTriangle, Zap, TrendingUp,
  BarChart2, Target, Users, FileText, Cpu, Activity,
  ChevronDown, ChevronUp, ExternalLink, Clock, Sparkles, Lock
} from "lucide-react";
import {
  motion, AnimatePresence, useInView, useMotionValue,
  useSpring, useTransform
} from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { SpatialPanel, InteractiveButton, AmbientGlow, NeuralPulse } from "../../components/ui/primitives";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Skill {
  name: string;
  category: string;
  confidence_score: number;
  mentions?: number;
}

interface ResumeData {
  name?: string;
  summary?: string;
  skills?: Skill[];
  sections_found?: Record<string, boolean>;
  ats_score?: {
    total_score: number;
    grade: string;
    breakdown: Record<string, { score: number; max: number; label: string }>;
    word_count: number;
  };
  action_verbs_used?: string[];
  metrics_found?: number;
  improvement_tips?: string[];
  contact?: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    github: string | null;
  };
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i, 3) * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const springConfig = { type: "spring" as const, stiffness: 260, damping: 28 };

// ── Animated number ────────────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => { if (inView) motionVal.set(value); }, [inView, value, motionVal]);
  return <motion.span ref={ref}>{display}</motion.span>;
}

// ── Animated bar ───────────────────────────────────────────────────────────────

function AnimatedBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
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

// ── Section card (identical to Resume Intelligence but visually upgraded) ────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveRoleFit(skills: Skill[]) {
  const cats = skills.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});
  const fe = cats["frontend"] || 0;
  const be = cats["backend"] || 0;
  const cloud = cats["cloud"] || 0;
  const ai = cats["ai"] || 0;
  const data = cats["data"] || 0;
  return [
    { role: "Backend Engineer",      pct: Math.min(97, Math.round(40 + be * 6 + cloud * 3 + data * 2)) },
    { role: "Full-Stack Engineer",   pct: Math.min(97, Math.round(20 + fe * 5 + be * 5 + data * 2)) },
    { role: "Frontend Engineer",     pct: Math.min(97, Math.round(30 + fe * 8 + be * 1)) },
    { role: "DevOps / Cloud",        pct: Math.min(97, Math.round(15 + cloud * 10 + be * 2)) },
    { role: "ML / AI Engineer",      pct: Math.min(97, Math.round(10 + ai * 10 + data * 3 + be * 2)) },
  ].sort((a, b) => b.pct - a.pct);
}

function deriveShortlistPct(data: ResumeData) {
  const ats = data.ats_score?.total_score || 0;
  const metrics = data.metrics_found || 0;
  const verbs = (data.action_verbs_used || []).length;
  const skills = (data.skills || []).length;
  return Math.min(Math.max(Math.round(ats * 0.5 + Math.min(metrics * 5, 20) + Math.min(verbs * 1.5, 15) + Math.min(skills * 0.5, 15)), 5), 95);
}

function deriveTopBottleneck(data: ResumeData): { action: string; impact: string; why: string } {
  const metrics = data.metrics_found || 0;
  const verbs = (data.action_verbs_used || []).length;
  const sections = data.sections_found || {};
  const skills = (data.skills || []).length;

  if (metrics < 2) return {
    action: "Add measurable outcomes to your top 3 project bullets",
    impact: "Estimated shortlist probability increase: +11–15%",
    why: "Quantified impact is the single strongest recruiter signal. Resumes with ≥3 metrics are shortlisted 2.3× more often.",
  };
  if (!sections.summary) return {
    action: "Write a 2-sentence professional summary at the top of your resume",
    impact: "Estimated ATS score increase: +8 pts",
    why: "Recruiters spend 6–10 seconds on first pass. A summary anchors your positioning immediately.",
  };
  if (verbs < 5) return {
    action: "Replace passive bullet language with strong action verbs",
    impact: "Estimated recruiter readability score increase: +12 pts",
    why: "Passive language signals low ownership. Action verbs (Built, Architected, Reduced) signal direct contribution.",
  };
  if (skills < 8) return {
    action: "Explicitly list your core technologies in a Skills section",
    impact: "Estimated ATS keyword match increase: +18%",
    why: "ATS systems rank resumes by keyword density. Unlisted skills are invisible to automated screening.",
  };
  return {
    action: "Add a GitHub or LinkedIn profile link to your contact section",
    impact: "Estimated recruiter trust increase: +9%",
    why: "Verifiable work signals credibility. Recruiters are 1.7× more likely to proceed with candidates who have linked profiles.",
  };
}

function deriveCareerPositioning(data: ResumeData): string {
  const skills = data.skills || [];
  const cats = skills.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});
  const fe = cats["frontend"] || 0;
  const be = cats["backend"] || 0;
  const cloud = cats["cloud"] || 0;
  const ai = cats["ai"] || 0;
  const metrics = data.metrics_found || 0;
  const ats = data.ats_score?.total_score || 0;

  let domain = "software engineering";
  if (be > fe && be > cloud && be > ai) domain = "backend engineering";
  else if (fe > be && fe > cloud) domain = "frontend engineering";
  else if (cloud > be && cloud > fe) domain = "cloud and DevOps";
  else if (ai > be && ai > fe) domain = "AI and machine learning";
  else if (fe > 0 && be > 0) domain = "full-stack engineering";

  const bottleneck = metrics < 2
    ? "measurable impact remains your primary hiring bottleneck"
    : ats < 60
    ? "ATS compatibility is limiting your automated screening pass rate"
    : "your profile is competitive but lacks differentiation signals";

  return `You currently align strongest with ${domain} roles, but ${bottleneck}.`;
}

function deriveInterviewReadiness(data: ResumeData): { strengths: string[]; concerns: string[]; missing: string[] } {
  const skills = data.skills || [];
  const verbs = data.action_verbs_used || [];
  const metrics = data.metrics_found || 0;
  const sections = data.sections_found || {};

  const strengths: string[] = [];
  const concerns: string[] = [];
  const missing: string[] = [];

  if (skills.length >= 10) strengths.push("Strong technical vocabulary — can discuss multiple domains");
  if (skills.length >= 5) strengths.push("Solid core stack coverage for technical screening");
  if (verbs.length >= 6) strengths.push("Action-oriented language suggests clear ownership narrative");
  if (metrics >= 3) strengths.push("Quantified outcomes ready for behavioral questions");
  if (sections.projects) strengths.push("Project portfolio available for technical deep-dives");

  if (metrics < 2) concerns.push("Weak impact narrative — STAR answers may lack measurable outcomes");
  if (verbs.length < 4) concerns.push("Passive language may signal low confidence in interviews");
  if (!sections.summary) concerns.push("No positioning statement — may struggle with 'Tell me about yourself'");

  if (!skills.find(s => s.category === "other" && s.name.toLowerCase().includes("system")))
    missing.push("System design signals not detected");
  if (!data.contact?.github) missing.push("No verifiable code portfolio linked");
  if (skills.filter(s => s.category === "cloud").length < 2)
    missing.push("Limited cloud/infrastructure exposure");

  return { strengths, concerns, missing };
}

// ── Market intelligence (static but evidence-grounded) ────────────────────────

const MARKET_SIGNALS = [
  { signal: "Backend + cloud hybrid roles up 34% YoY", trend: "up", domain: "Backend / Cloud" },
  { signal: "TypeScript now required in 78% of frontend JDs", trend: "up", domain: "Frontend" },
  { signal: "Pure frontend roles declining — full-stack preferred", trend: "down", domain: "Frontend" },
  { signal: "AI/ML engineering demand up 61% in last 6 months", trend: "up", domain: "AI / ML" },
  { signal: "DevOps + platform engineering consolidating into SRE", trend: "neutral", domain: "DevOps" },
  { signal: "Remote backend roles increased 22% since Q1", trend: "up", domain: "Backend" },
];

const FEED_ITEMS = [
  { time: "2h ago", event: "Backend Engineer demand increased 8% this week", type: "market" },
  { time: "6h ago", event: "TypeScript listed in 12 new senior roles matching your stack", type: "match" },
  { time: "1d ago", event: "Resume ATS benchmark updated — average score now 61/100", type: "benchmark" },
  { time: "2d ago", event: "3 companies hiring for your top role fit started new rounds", type: "hiring" },
  { time: "3d ago", event: "Skill demand shift: Docker + Kubernetes up 18% in JDs", type: "skill" },
];

// ── Onboarding dashboard — shown when no resume exists ────────────────────────

const SETUP_STEPS = [
  {
    step: 1,
    title: "Analyze Your Resume",
    description: "Upload your resume to generate ATS scores, skill intelligence, and recruiter-grade analysis.",
    href: "/resume",
    cta: "Analyze Resume",
    icon: <FileText className="w-5 h-5" />,
    unlocks: ["ATS Intelligence", "Skill Extraction", "Career Positioning"],
  },
  {
    step: 2,
    title: "Explore Market Intelligence",
    description: "See live job listings matched to your skills with AI-powered fit scoring.",
    href: "/market",
    cta: "View Market",
    icon: <BarChart2 className="w-5 h-5" />,
    unlocks: ["Role Fit Analysis", "Job Matching", "Market Signals"],
  },
  {
    step: 3,
    title: "Generate Learning Roadmap",
    description: "Get a personalized skill roadmap based on your gaps and market demand.",
    href: "/roadmap",
    cta: "View Roadmap",
    icon: <TrendingUp className="w-5 h-5" />,
    unlocks: ["Skill Gap Analysis", "Learning Priorities", "Market Differentiators"],
  },
  {
    step: 4,
    title: "Run a Mock Interview",
    description: "Practice with an AI interviewer calibrated to your resume and target role.",
    href: "/interview",
    cta: "Start Interview",
    icon: <Cpu className="w-5 h-5" />,
    unlocks: ["Interview Readiness", "Performance Scoring", "Recruiter Simulation"],
  },
];

const LOCKED_MODULES = [
  { label: "ATS Intelligence", icon: <Target className="w-4 h-4" />, reason: "Requires resume analysis" },
  { label: "Career Positioning", icon: <Zap className="w-4 h-4" />, reason: "Requires resume analysis" },
  { label: "Recruiter Simulation", icon: <Users className="w-4 h-4" />, reason: "Requires resume analysis" },
  { label: "Market Match Score", icon: <BarChart2 className="w-4 h-4" />, reason: "Requires resume analysis" },
  { label: "Interview Readiness", icon: <Activity className="w-4 h-4" />, reason: "Requires resume analysis" },
  { label: "Shortlist Probability", icon: <TrendingUp className="w-4 h-4" />, reason: "Requires resume analysis" },
];

function OnboardingDashboard({ firstName }: { firstName: string }) {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 relative overflow-hidden flex items-center justify-center py-20 px-6">
      {/* Immersive cinematic spatial overlays */}
      <AmbientGlow size="lg" color="mixed" className="-top-40 left-1/2 -translate-x-1/2 opacity-25" />
      <AmbientGlow size="md" color="cyan" className="-bottom-20 -right-20 opacity-15" />
      
      <div className="max-w-4xl w-full mx-auto space-y-10 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-2"
        >
          <div className="flex justify-center mb-1">
            <NeuralPulse size="md" label="Career Intelligence" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 font-outfit mt-3">
            Welcome, {firstName}
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg mx-auto">
            Initialize your spatial AI cockpit to unlock deep career analytics, role alignment models, and personalized simulation vectors.
          </p>
        </motion.div>

        {/* Setup progress banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <SpatialPanel glow={true} interactive={false} className="border-violet-500/25 bg-zinc-950/40 backdrop-blur-xl px-7 py-6.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                    Setup Vector Required
                  </span>
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xl">
                  No telemetry, intelligence metrics, or interview models can initialize until a valid resume matrix is ingested by our neural parsing layers.
                </p>
              </div>
              <Link href="/resume" className="shrink-0 w-full sm:w-auto">
                <InteractiveButton variant="primary" className="w-full sm:w-auto px-5 py-3 flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Injest Resume File
                  <ArrowRight className="w-4 h-4 text-zinc-950" />
                </InteractiveButton>
              </Link>
            </div>
          </SpatialPanel>
        </motion.div>

        {/* Setup steps */}
        <div className="space-y-4">
          <motion.p
            className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Sequence Checklist
          </motion.p>
          <div className="grid grid-cols-1 gap-3">
            {SETUP_STEPS.map((step, i) => {
              const isActive = i === 0;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 + 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SpatialPanel
                    glow={isActive}
                    interactive={isActive}
                    className={`px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 ${
                      isActive 
                        ? "border-violet-500/30 bg-violet-500/[0.03] backdrop-blur-md" 
                        : "border-zinc-900/60 bg-zinc-950/20 opacity-55"
                    }`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      {/* Step marker */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5 transition-all duration-300 ${
                        isActive
                          ? "bg-zinc-100 border-zinc-200 text-zinc-950 shadow-[0_0_10px_rgba(255,255,255,0.15)]"
                          : "bg-zinc-950 border-zinc-800 text-zinc-600"
                      }`}>
                        <span className="text-xs font-mono font-bold">{step.step}</span>
                      </div>

                      {/* Info */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className={isActive ? "text-zinc-300" : "text-zinc-600"}>{step.icon}</span>
                          <h3 className={`text-sm font-semibold tracking-wide font-outfit ${isActive ? "text-zinc-100" : "text-zinc-500"}`}>
                            {step.title}
                          </h3>
                          {isActive && (
                            <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded border bg-violet-950/50 text-violet-400 border-violet-800/40">
                              Active
                            </span>
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed max-w-xl ${isActive ? "text-zinc-400" : "text-zinc-600"}`}>
                          {step.description}
                        </p>
                        {/* Unlocks */}
                        <div className="flex flex-wrap gap-1.5">
                          {step.unlocks.map(u => (
                            <span key={u} className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors duration-300 ${
                              isActive
                                ? "bg-zinc-900/60 text-zinc-400 border-zinc-800"
                                : "bg-zinc-950/10 text-zinc-700 border-zinc-900/40"
                            }`}>
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Button / Lock state */}
                    {isActive ? (
                      <Link href={step.href} className="w-full sm:w-auto shrink-0 mt-3 sm:mt-0">
                        <InteractiveButton variant="glow" className="w-full sm:w-auto">
                          {step.cta}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </InteractiveButton>
                      </Link>
                    ) : (
                      <div className="w-full sm:w-auto shrink-0 mt-3 sm:mt-0 px-4 py-2 border border-zinc-900 bg-zinc-950/40 text-zinc-700 rounded-lg flex items-center justify-center gap-2 text-xs font-mono select-none cursor-not-allowed">
                        <Lock className="w-3 h-3 text-zinc-800" />
                        Locked
                      </div>
                    )}
                  </SpatialPanel>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Locked Modules Grid */}
        <div className="space-y-4">
          <motion.p
            className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Holographic Widgets Offline
          </motion.p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {LOCKED_MODULES.map((mod, i) => (
              <motion.div
                key={mod.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 + 0.55, duration: 0.4 }}
              >
                <SpatialPanel className="border-zinc-900/60 bg-zinc-950/20 p-4 relative overflow-hidden flex flex-col justify-between h-[108px] group hover:border-zinc-800/80 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 transition-colors duration-300 group-hover:text-zinc-600">{mod.icon}</span>
                    <Lock className="w-3 h-3 text-zinc-800" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 font-outfit">{mod.label}</p>
                    <p className="text-[9px] font-mono text-zinc-700 mt-0.5">{mod.reason}</p>
                  </div>
                  {/* Offline progress bar */}
                  <div className="w-full bg-zinc-950/80 border border-zinc-900/40 rounded-full h-1 overflow-hidden mt-2">
                    <div className="h-1 w-0 bg-zinc-800 rounded-full" />
                  </div>
                </SpatialPanel>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:4000/api/v1/resumes/latest", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.parsed_json && Object.keys(d.parsed_json).length > 0) {
          setResumeData(d.parsed_json);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center relative overflow-hidden">
        <AmbientGlow size="md" color="mixed" className="opacity-20" />
        <motion.div
          className="w-10 h-10 border-2 border-zinc-800 border-t-violet-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!resumeData) return <OnboardingDashboard firstName={user?.name?.split(" ")[0] || "there"} />;

  // ── Derived intelligence ───────────────────────────────────────────────────

  const skills = resumeData.skills || [];
  const ats = resumeData.ats_score;
  const roleFit = deriveRoleFit(skills);
  const topRole = roleFit[0];
  const shortlistPct = deriveShortlistPct(resumeData);
  const bottleneck = deriveTopBottleneck(resumeData);
  const positioning = deriveCareerPositioning(resumeData);
  const interview = deriveInterviewReadiness(resumeData);

  const recruiterPositive: string[] = [];
  const recruiterNegative: string[] = [];
  if (skills.length >= 10) recruiterPositive.push("Strong technical breadth across multiple domains");
  else if (skills.length >= 5) recruiterPositive.push("Solid core technical skill set");
  if ((resumeData.action_verbs_used || []).length >= 8) recruiterPositive.push("Action-oriented language throughout");
  if ((resumeData.metrics_found || 0) >= 3) recruiterPositive.push("Quantified impact with measurable results");
  if (resumeData.sections_found?.projects) recruiterPositive.push("Portfolio / project work demonstrated");
  if (resumeData.contact?.github) recruiterPositive.push("GitHub profile linked — verifiable work");
  if ((resumeData.metrics_found || 0) < 2) recruiterNegative.push("Missing measurable impact in bullets");
  if ((resumeData.action_verbs_used || []).length < 5) recruiterNegative.push("Weak action verbs — passive language detected");
  if (!resumeData.sections_found?.summary) recruiterNegative.push("No professional summary present");
  if (!resumeData.contact?.linkedin && !resumeData.contact?.github) recruiterNegative.push("No professional profile links");

  const firstName = user?.name?.split(" ")[0] || resumeData.name?.split(" ")[0] || "there";
  const atsScore = ats?.total_score ?? 0;
  const atsColor = atsScore >= 75 ? "text-emerald-400" : atsScore >= 55 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 relative overflow-hidden pb-20">
      {/* High-end spatial gradients */}
      <AmbientGlow size="lg" color="mixed" className="-top-[240px] left-1/4 opacity-15" />
      <AmbientGlow size="lg" color="cyan" className="-bottom-[200px] -right-[100px] opacity-10" />
      
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 relative z-10">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">System Intelligence Dashboard</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mt-1 font-outfit">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <motion.div
            className="flex items-center self-start sm:self-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="border border-zinc-900 bg-zinc-950/60 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2">
              <NeuralPulse size="sm" label="Telemetry Synchronized" />
            </div>
          </motion.div>
        </motion.div>

        {/* Career Intelligence Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <SpatialPanel glow={true} interactive={false} className="border-zinc-900/80 bg-zinc-950/40 backdrop-blur-xl relative overflow-hidden py-6 px-7">
            <AmbientGlow size="md" color="violet" className="-top-20 -right-20 opacity-15" />
            <div className="flex flex-col md:flex-row items-start justify-between gap-8">
              <div className="space-y-3.5 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-md border bg-zinc-900/80 text-zinc-400 border-zinc-800">
                    Career Signal Matrix
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Extracted from workspace telemetry
                  </span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed max-w-2xl font-outfit">
                  {positioning}
                </p>
              </div>
              <motion.div
                className="flex flex-wrap gap-3.5 shrink-0 w-full md:w-auto justify-start md:justify-end"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <HeroPill value={atsScore} label="ATS index" color={atsColor} />
                <HeroPill value={shortlistPct} suffix="%" label="Shortlist Prob" color={shortlistPct >= 65 ? "text-emerald-400" : shortlistPct >= 45 ? "text-amber-400" : "text-rose-400"} />
                <HeroPill value={skills.length} label="Telemetry skills" />
              </motion.div>
            </div>
          </SpatialPanel>
        </motion.div>

        {/* Top ROI Action */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <SpatialPanel glow={true} className="border-amber-500/20 bg-amber-500/[0.03] backdrop-blur-xl relative overflow-hidden py-6 px-7">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">System Recommendation Vector</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-2">
                <p className="text-zinc-100 font-semibold text-sm leading-relaxed font-outfit">{bottleneck.action}</p>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">{bottleneck.why}</p>
              </div>
              <div className="shrink-0 border border-zinc-900 rounded-xl px-5 py-3.5 bg-zinc-950/80 min-w-[200px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] text-center sm:text-left">
                <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Expected return</p>
                <p className="text-sm font-semibold text-emerald-400 font-outfit">{bottleneck.impact}</p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-900/60 flex items-center justify-between">
              <Link
                href="/resume"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors group"
              >
                Injest full intelligence pipeline
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </SpatialPanel>
        </motion.div>

        {/* Two-column Widgets: Recruiter Snapshot + Career Trajectory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Recruiter Impression Snapshot */}
          <SectionCard title="Recruiter Signal Simulation" icon={<Users className="w-4.5 h-4.5" />} delay={1}>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed font-outfit">
              Simulated recruiter triage sweep based on keyword frequency and output telemetry.
            </p>
            <div className="space-y-3 mb-5">
              {recruiterPositive.slice(0, 3).map((s, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2.5 text-xs text-zinc-300"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                >
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 + 0.15, ...springConfig }} className="shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </motion.span>
                  <span className="font-outfit leading-relaxed">{s}</span>
                </motion.div>
              ))}
              {recruiterNegative.slice(0, 2).map((s, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2.5 text-xs text-zinc-300"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (i + recruiterPositive.length) * 0.05 + 0.1 }}
                >
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: (i + 3) * 0.05 + 0.15, ...springConfig }} className="shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </motion.span>
                  <span className="font-outfit leading-relaxed">{s}</span>
                </motion.div>
              ))}
            </div>
            <div className="border-t border-zinc-900/60 pt-4 flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Calculated Pass Probability</span>
              <motion.span
                className={`text-xl font-bold font-mono ${shortlistPct >= 65 ? "text-emerald-400" : shortlistPct >= 45 ? "text-amber-400" : "text-rose-400"}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, ...springConfig }}
              >
                <AnimatedNumber value={shortlistPct} suffix="%" />
              </motion.span>
            </div>
          </SectionCard>

          {/* Career Trajectory */}
          <SectionCard title="Vector Alignment Score" icon={<TrendingUp className="w-4.5 h-4.5" />} delay={2}>
            <p className="text-xs text-zinc-500 mb-4 font-outfit">
              Weighted role alignment derived from telemetry category concentration models.
            </p>
            <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
              {roleFit.slice(0, 4).map((r, i) => (
                <motion.div key={r.role} variants={fadeUp} custom={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {i === 0 && (
                        <motion.span
                          className="text-[9px] font-mono tracking-widest bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded-md"
                          initial={{ opacity: 0, scale: 0.8 }}
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
                  <AnimatedBar
                    pct={r.pct}
                    color={r.pct >= 70 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : r.pct >= 50 ? "bg-amber-500" : "bg-zinc-700"}
                    delay={Math.min(i, 3) * 0.04 + 0.05}
                  />
                </motion.div>
              ))}
            </motion.div>
            <div className="mt-5.5 pt-4 border-t border-zinc-900/60">
              <Link href="/roadmap" className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors group">
                Trace learning trajectory
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </SectionCard>
        </div>

        {/* Interview Readiness */}
        <SectionCard title="Simulation Telemetry Analysis" icon={<Target className="w-4.5 h-4.5" />} delay={3}>
          <p className="text-xs text-zinc-500 mb-5 leading-relaxed font-outfit">
            System readiness outputs generated from resume structure quality, action-oriented syntax patterns, and verifiable work history evidence.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Optimal Signals</p>
              <ul className="space-y-2">
                {interview.strengths.length > 0 ? interview.strengths.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed font-outfit"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </motion.li>
                )) : <li className="text-xs text-zinc-600 font-outfit">Injest resume telemetry to check optimal indices</li>}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Warning Vectors</p>
              <ul className="space-y-2">
                {interview.concerns.length > 0 ? interview.concerns.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed font-outfit"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 + 0.05 }}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </motion.li>
                )) : <li className="text-xs text-zinc-600 font-outfit">No high-risk concerns registered</li>}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Missing Nodes</p>
              <ul className="space-y-2">
                {interview.missing.length > 0 ? interview.missing.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed font-outfit"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 + 0.1 }}
                  >
                    <span className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    </span>
                    <span>{s}</span>
                  </motion.li>
                )) : <li className="text-xs text-zinc-600 font-outfit">All critical nodes validated</li>}
              </ul>
            </div>
          </div>
          <div className="mt-5.5 pt-4 border-t border-zinc-900/60">
            <Link href="/interview" className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors group">
              Initialize mock simulation
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </SectionCard>

        {/* Market Intelligence */}
        <SectionCard title="Live Market Feeds" icon={<BarChart2 className="w-4.5 h-4.5" />} delay={4}>
          <p className="text-xs text-zinc-500 mb-4 font-outfit">
            Aggregated workspace signals tracking hiring trends and keyword listings across standard indexes.
          </p>
          <motion.div
            className="space-y-1.5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {MARKET_SIGNALS.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="flex items-center justify-between py-2 px-3 border border-zinc-900/40 bg-zinc-950/20 hover:bg-zinc-900/10 hover:border-zinc-800/80 rounded-xl transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.trend === "up" ? "bg-emerald-400 animate-pulse" :
                    item.trend === "down" ? "bg-rose-500" : "bg-zinc-500"
                  }`} />
                  <span className="text-xs sm:text-sm text-zinc-300 font-outfit">{item.signal}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-4">{item.domain}</span>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-5.5 pt-4 border-t border-zinc-900/60">
            <Link href="/market" className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors group">
              Trace full market indexes
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </SectionCard>

        {/* Live AI Intelligence Feed */}
        <SectionCard title="Telemetry Stream Logs" icon={<Activity className="w-4.5 h-4.5" />} delay={5}>
          <p className="text-xs text-zinc-500 mb-5 leading-relaxed font-outfit">
            Holographic real-time telemetry recording and market updates relative to your focus.
          </p>
          <motion.div
            className="space-y-0.5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {FEED_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="flex items-start gap-4 py-3 border-b border-zinc-900/50 last:border-0 hover:bg-zinc-900/5 px-2 rounded-xl transition-colors duration-300"
              >
                <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                  <span className={`w-2 h-2 rounded-full ${
                    item.type === "market" ? "bg-blue-500" :
                    item.type === "match" ? "bg-emerald-500" :
                    item.type === "benchmark" ? "bg-amber-500" :
                    item.type === "hiring" ? "bg-purple-500" : "bg-zinc-500"
                  }`} />
                  {i < FEED_ITEMS.length - 1 && <div className="w-px flex-1 bg-zinc-900 min-h-[22px]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-outfit">{item.event}</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-600" />
                    {item.time}
                  </p>
                </div>
                <span className={`text-[9px] font-mono tracking-widest px-2.5 py-0.5 rounded-md border shrink-0 ${
                  item.type === "market" ? "bg-blue-950/40 text-blue-400 border-blue-900/50" :
                  item.type === "match" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" :
                  item.type === "benchmark" ? "bg-amber-950/40 text-amber-400 border-amber-900/50" :
                  item.type === "hiring" ? "bg-purple-950/40 text-purple-400 border-purple-900/50" :
                  "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}>
                  {item.type}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </SectionCard>

        {/* Quick navigation */}
        <motion.div
          variants={fadeUp}
          custom={6}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { href: "/resume", icon: <FileText className="w-4 h-4" />, label: "Resume Signals", desc: "Analysis matrix" },
            { href: "/market", icon: <BarChart2 className="w-4 h-4" />, label: "Market Indexes", desc: "Hiring trends" },
            { href: "/roadmap", icon: <TrendingUp className="w-4 h-4" />, label: "Learning Vectors", desc: "Gaps & paths" },
            { href: "/interview", icon: <Cpu className="w-4 h-4" />, label: "Mock Simulation", desc: "Interactive arena" },
          ].map((item, i) => (
            <motion.div key={item.href} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 450, damping: 25 }}>
              <Link href={item.href} className="block h-full">
                <SpatialPanel glow={true} interactive={true} className="h-full bg-zinc-950/30 border-zinc-900 hover:border-violet-500/20 p-4 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">{item.icon}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-700 hover:text-zinc-500 transition-colors" />
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-zinc-300 font-outfit">{item.label}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{item.desc}</p>
                  </div>
                </SpatialPanel>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </div>
  );
}

// ── Hero pill (circular / high-tech visual index) ─────────────────────────────

function HeroPill({ value, label, color = "text-zinc-100", suffix = "" }: {
  value: number; label: string; color?: string; suffix?: string;
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
        <AnimatedNumber value={value} suffix={suffix} />
      </span>
      <span className="text-[9px] font-mono tracking-widest text-zinc-500 mt-1.5 uppercase text-center whitespace-nowrap relative z-10">{label}</span>
    </motion.div>
  );
}

// ── Utility ────────────────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
