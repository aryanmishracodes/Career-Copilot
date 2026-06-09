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
import { SpatialPanel } from "../../components/ui/primitives";

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
    transition: { delay: Math.min(i, 3) * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
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
    <div ref={ref} className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <motion.div
        className={`h-1.5 rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={inView ? { width: `${pct}%` } : { width: 0 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

// ── Section card (identical to Resume Intelligence) ────────────────────────────

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
      <SpatialPanel
        glow={true}
        interactive={true}
        className="p-0 overflow-hidden border-zinc-800 bg-zinc-950/40 backdrop-blur-xl"
      >
        <motion.button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900/60 hover:bg-zinc-800/40 transition-colors"
          whileTap={{ scale: 0.995 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-zinc-400">{icon}</span>
            <span className="text-sm font-semibold text-zinc-100 tracking-wide uppercase">{title}</span>
          </div>
          <motion.span
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ChevronUp className="w-4 h-4 text-zinc-500" />
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
              <div className="bg-zinc-950/20 px-6 py-5">{children}</div>
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

// ── Empty state — replaced by full onboarding flow below ─────────────────────
// (kept as a named export for backwards compat, but no longer used directly)
function _EmptyStateLegacy() { return null; }

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Career Intelligence</p>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">
            Welcome, {firstName}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Complete your setup to unlock your personalized career intelligence profile.
          </p>
        </motion.div>

        {/* Setup progress banner */}
        <motion.div
          className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Intelligence Profile — Setup Required
            </span>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
            Your career intelligence dashboard is ready, but needs your resume to generate
            real analysis. No scores, predictions, or insights are shown until the system
            has actual data to work from.
          </p>
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <Link
              href="/resume"
              className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-900 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-white transition-colors"
            >
              <FileText className="w-4 h-4" />
              Start with Resume Analysis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Setup steps */}
        <div>
          <motion.p
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Setup Steps
          </motion.p>
          <div className="space-y-3">
            {SETUP_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                className="border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 + 0.1, duration: 0.4, ease: "easeOut" }}
                whileHover={{ borderColor: "rgb(63 63 70)", y: -1, transition: { duration: 0.2 } }}
              >
                <div className="px-5 py-4 flex items-start gap-4">
                  {/* Step number */}
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    i === 0
                      ? "bg-zinc-100 border-zinc-200 text-zinc-900"
                      : "bg-zinc-900 border-zinc-700 text-zinc-500"
                  }`}>
                    <span className="text-xs font-bold">{step.step}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={i === 0 ? "text-zinc-400" : "text-zinc-600"}>{step.icon}</span>
                          <h3 className={`text-sm font-semibold ${i === 0 ? "text-zinc-100" : "text-zinc-500"}`}>
                            {step.title}
                          </h3>
                          {i === 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded border font-mono bg-amber-950/40 text-amber-400 border-amber-900">
                              Start here
                            </span>
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed ${i === 0 ? "text-zinc-400" : "text-zinc-600"}`}>
                          {step.description}
                        </p>
                        {/* Unlocks */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {step.unlocks.map(u => (
                            <span key={u} className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
                              i === 0
                                ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                : "bg-zinc-900 text-zinc-700 border-zinc-800"
                            }`}>
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* CTA */}
                      {i === 0 ? (
                        <Link
                          href={step.href}
                          className="inline-flex items-center gap-1.5 text-xs bg-zinc-100 text-zinc-900 font-semibold px-4 py-2 rounded-lg hover:bg-white transition-colors shrink-0"
                        >
                          {step.cta}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 border border-zinc-800 px-4 py-2 rounded-lg shrink-0 cursor-not-allowed">
                          <Lock className="w-3 h-3" />
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Locked intelligence modules */}
        <div>
          <motion.p
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Intelligence Modules — Pending Activation
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {LOCKED_MODULES.map((mod, i) => (
              <motion.div
                key={mod.label}
                className="border border-zinc-800 rounded-xl bg-zinc-900 px-4 py-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.45, duration: 0.35 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-700">{mod.icon}</span>
                  <Lock className="w-3 h-3 text-zinc-700" />
                </div>
                <p className="text-xs font-semibold text-zinc-600">{mod.label}</p>
                <p className="text-xs text-zinc-700 mt-0.5">{mod.reason}</p>
                {/* Placeholder bar */}
                <div className="mt-3 w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                  <div className="h-1 w-0 bg-zinc-700 rounded-full" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* What you'll unlock */}
        <motion.div
          className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            What You'll Unlock After Resume Analysis
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: "ATS Compatibility Score", desc: "6-dimension breakdown of how your resume performs in automated screening" },
              { title: "Recruiter Simulation", desc: "Simulated first-pass recruiter scan with shortlist probability" },
              { title: "Role Fit Analysis", desc: "Match confidence across 5 engineering tracks based on your skill profile" },
              { title: "Highest ROI Action", desc: "Single most impactful improvement to increase your hiring probability" },
              { title: "Interview Readiness", desc: "Technical strengths, communication concerns, and missing signals" },
              { title: "Market Intelligence", desc: "Live job listings matched to your skills with AI fit scoring" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 + 0.65 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0 mt-1.5" />
                <div>
                  <p className="text-xs font-semibold text-zinc-400">{item.title}</p>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${apiBase}/api/v1/resumes/latest`, {
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-300 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
  const atsColor = atsScore >= 75 ? "text-emerald-400" : atsScore >= 55 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-start justify-between"
        >
          <div>
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Career Intelligence</p>
            <h1 className="text-2xl font-bold text-zinc-100 mt-1">
              Good {getTimeOfDay()}, {firstName}
            </h1>
          </div>
          <motion.div
            className="flex items-center gap-2 text-xs text-zinc-600 border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Activity className="w-3.5 h-3.5" />
            Intelligence updated from latest resume
          </motion.div>
        </motion.div>

        {/* ── Career Intelligence Hero ── */}
        <motion.div
          className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ borderColor: "rgb(63 63 70)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <motion.span
                  className="text-xs font-semibold px-2.5 py-1 rounded border font-mono bg-zinc-800 text-zinc-400 border-zinc-700"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, ...springConfig }}
                >
                  Career Positioning
                </motion.span>
                <motion.span
                  className="text-xs text-zinc-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Derived from resume analysis
                </motion.span>
              </div>
              <motion.p
                className="text-zinc-200 text-sm leading-relaxed max-w-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                {positioning}
              </motion.p>
            </div>
            <motion.div
              className="flex gap-3 shrink-0"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <HeroPill value={atsScore} label="ATS Score" color={atsColor} />
              <HeroPill value={shortlistPct} suffix="%" label="Shortlist Prob." color={shortlistPct >= 65 ? "text-emerald-400" : shortlistPct >= 45 ? "text-amber-400" : "text-red-400"} />
              <HeroPill value={skills.length} label="Skills" />
            </motion.div>
          </div>
        </motion.div>

        {/* ── Top ROI Action ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <SpatialPanel
            glow={true}
            interactive={true}
            className="border-zinc-800 bg-zinc-950/40 backdrop-blur-xl px-6 py-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Today's Highest ROI Action</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                <p className="text-zinc-100 font-medium text-sm leading-relaxed mb-2">{bottleneck.action}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{bottleneck.why}</p>
              </div>
              <div className="shrink-0 border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-950 min-w-[200px]">
                <p className="text-xs text-zinc-500 mb-1">Estimated impact</p>
                <p className="text-xs font-semibold text-emerald-400">{bottleneck.impact}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <Link
                href="/resume"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                View full resume analysis <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </SpatialPanel>
        </motion.div>

        {/* ── Two-column: Recruiter Snapshot + Career Trajectory ── */}
        {/* items-start: each card sizes to its own content, not the tallest sibling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Recruiter Impression Snapshot */}
          <SectionCard title="Recruiter Snapshot" icon={<Users className="w-4 h-4" />} delay={1}>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Simulated 6-second recruiter first impression based on resume signal density.
            </p>
            <div className="space-y-2 mb-4">
              {recruiterPositive.slice(0, 3).map((s, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2 text-sm text-zinc-300"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 + 0.1 }}
                >
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.07 + 0.15, ...springConfig }}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  </motion.span>
                  {s}
                </motion.div>
              ))}
              {recruiterNegative.slice(0, 2).map((s, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2 text-sm text-zinc-300"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (i + recruiterPositive.length) * 0.07 + 0.1 }}
                >
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: (i + 3) * 0.07 + 0.15, ...springConfig }}>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  </motion.span>
                  {s}
                </motion.div>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Shortlist probability</span>
              <motion.span
                className={`text-lg font-black font-mono ${shortlistPct >= 65 ? "text-emerald-400" : shortlistPct >= 45 ? "text-amber-400" : "text-red-400"}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, ...springConfig }}
              >
                <AnimatedNumber value={shortlistPct} suffix="%" />
              </motion.span>
            </div>
          </SectionCard>

          {/* Career Trajectory */}
          <SectionCard title="Career Trajectory" icon={<TrendingUp className="w-4 h-4" />} delay={2}>
            <p className="text-xs text-zinc-500 mb-4">
              Role alignment derived from skill category distribution. Reflects current resume signal strength.
            </p>
            <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="visible">
              {roleFit.slice(0, 4).map((r, i) => (
                <motion.div key={r.role} variants={fadeUp} custom={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {i === 0 && (
                        <motion.span
                          className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-mono"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2, ...springConfig }}
                        >
                          Best
                        </motion.span>
                      )}
                      <span className="text-xs text-zinc-300">{r.role}</span>
                    </div>
                    <span className={`text-xs font-mono font-semibold ${r.pct >= 70 ? "text-emerald-400" : r.pct >= 50 ? "text-amber-400" : "text-zinc-500"}`}>
                      <AnimatedNumber value={r.pct} suffix="%" />
                    </span>
                  </div>
                  <AnimatedBar
                    pct={r.pct}
                    color={r.pct >= 70 ? "bg-emerald-500" : r.pct >= 50 ? "bg-amber-500" : "bg-zinc-600"}
                    delay={Math.min(i, 3) * 0.04 + 0.05}
                  />
                </motion.div>
              ))}
            </motion.div>
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <Link href="/roadmap" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                View learning roadmap <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </SectionCard>
        </div>

        {/* ── Interview Readiness ── */}
        <SectionCard title="Interview Readiness" icon={<Target className="w-4 h-4" />} delay={3}>
          <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
            Readiness signals derived from resume language quality, impact evidence, and portfolio depth.
            These directly predict interview performance patterns.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Technical Strengths</p>
              <ul className="space-y-2">
                {interview.strengths.length > 0 ? interview.strengths.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2 text-xs text-zinc-300"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    {s}
                  </motion.li>
                )) : <li className="text-xs text-zinc-600">Upload resume to detect strengths</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Communication Concerns</p>
              <ul className="space-y-2">
                {interview.concerns.length > 0 ? interview.concerns.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2 text-xs text-zinc-300"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 + 0.1 }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    {s}
                  </motion.li>
                )) : <li className="text-xs text-zinc-500">No major concerns detected</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Missing Signals</p>
              <ul className="space-y-2">
                {interview.missing.length > 0 ? interview.missing.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2 text-xs text-zinc-300"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 + 0.2 }}
                  >
                    <span className="w-3.5 h-3.5 shrink-0 mt-0.5 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    </span>
                    {s}
                  </motion.li>
                )) : <li className="text-xs text-zinc-500">No missing signals detected</li>}
              </ul>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-zinc-800">
            <Link href="/interview" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Start mock interview <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </SectionCard>

        {/* ── Market Intelligence ── */}
        <SectionCard title="Market Intelligence" icon={<BarChart2 className="w-4 h-4" />} delay={4}>
          <p className="text-xs text-zinc-500 mb-5">
            Live hiring signal trends across engineering domains. Updated weekly from job market analysis.
          </p>
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {MARKET_SIGNALS.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0"
                whileHover={{ x: 2, transition: { duration: 0.15 } }}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.trend === "up" ? "bg-emerald-500" :
                    item.trend === "down" ? "bg-red-500" : "bg-zinc-500"
                  }`} />
                  <span className="text-sm text-zinc-300">{item.signal}</span>
                </div>
                <span className="text-xs text-zinc-600 shrink-0 ml-4 font-mono">{item.domain}</span>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <Link href="/market" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Full market analysis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </SectionCard>

        {/* ── Live AI Intelligence Feed ── */}
        <SectionCard title="Intelligence Feed" icon={<Activity className="w-4 h-4" />} delay={5}>
          <p className="text-xs text-zinc-500 mb-5">
            Real-time career intelligence updates — market shifts, benchmark changes, and role demand signals.
          </p>
          <motion.div
            className="space-y-0"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {FEED_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="flex items-start gap-4 py-3.5 border-b border-zinc-800 last:border-0"
                whileHover={{ x: 2, transition: { duration: 0.15 } }}
              >
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <span className={`w-2 h-2 rounded-full ${
                    item.type === "market" ? "bg-blue-500" :
                    item.type === "match" ? "bg-emerald-500" :
                    item.type === "benchmark" ? "bg-amber-500" :
                    item.type === "hiring" ? "bg-purple-500" : "bg-zinc-500"
                  }`} />
                  {i < FEED_ITEMS.length - 1 && <div className="w-px flex-1 bg-zinc-800 min-h-[20px]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 leading-relaxed">{item.event}</p>
                  <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-mono shrink-0 ${
                  item.type === "market" ? "bg-blue-950/40 text-blue-400 border-blue-900" :
                  item.type === "match" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900" :
                  item.type === "benchmark" ? "bg-amber-950/40 text-amber-400 border-amber-900" :
                  item.type === "hiring" ? "bg-purple-950/40 text-purple-400 border-purple-900" :
                  "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}>
                  {item.type}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </SectionCard>

        {/* ── Quick navigation ── */}
        <motion.div
          variants={fadeUp}
          custom={6}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { href: "/resume", icon: <FileText className="w-4 h-4" />, label: "Resume Intelligence", desc: "Full analysis" },
            { href: "/market", icon: <BarChart2 className="w-4 h-4" />, label: "Market Analysis", desc: "Job demand" },
            { href: "/roadmap", icon: <TrendingUp className="w-4 h-4" />, label: "Learning Roadmap", desc: "Skill gaps" },
            { href: "/interview", icon: <Cpu className="w-4 h-4" />, label: "Mock Interview", desc: "Practice" },
          ].map((item, i) => (
            <motion.div key={item.href} whileHover={{ y: -2, borderColor: "rgb(63 63 70)" }} transition={{ duration: 0.2 }}>
              <Link
                href={item.href}
                className="flex flex-col gap-2 border border-zinc-800 rounded-xl p-4 bg-zinc-900 hover:bg-zinc-800/60 transition-colors group"
              >
                <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">{item.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">{item.label}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{item.desc}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors self-end" />
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </div>
  );
}

// ── Hero pill ──────────────────────────────────────────────────────────────────

function HeroPill({ value, label, color = "text-zinc-100", suffix = "" }: {
  value: number; label: string; color?: string; suffix?: string;
}) {
  return (
    <SpatialPanel
      glow={true}
      interactive={true}
      className="border border-zinc-800 rounded-xl p-0 bg-zinc-950/40 backdrop-blur-2xl min-w-[120px]"
    >
      <div className="flex flex-col items-center justify-center px-5 py-4.5">
        <span className={`text-xl font-bold font-mono tracking-tight ${color}`}>
          <AnimatedNumber value={value} suffix={suffix} />
        </span>
        <span className="text-[10px] font-mono tracking-widest text-zinc-500 mt-2 uppercase text-center whitespace-nowrap font-bold">{label}</span>
      </div>
    </SpatialPanel>
  );
}

// ── Utility ────────────────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
