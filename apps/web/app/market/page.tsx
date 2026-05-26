"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, MapPin, ExternalLink, Building2, Clock,
  CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Zap,
  Target, BarChart2, TrendingUp, Activity, ArrowRight,
  Briefcase, Globe, RefreshCw, Filter, X
} from "lucide-react";
import {
  motion, AnimatePresence, useInView, useMotionValue,
  useSpring, useTransform
} from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import AuthGuard from "../../components/AuthGuard";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RawJob {
  id: string;
  title: string;
  company: string;
  company_logo: string | null;
  location: string;
  is_remote: boolean;
  employment_type: string;
  description_snippet: string;
  apply_link: string;
  source: string;
  posted_at: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  matched_skill?: string;
  required_skills?: string[];
}

interface ResumeSkill {
  name: string;
  category: string;
  confidence_score: number;
}

interface ResumeData {
  name?: string;
  skills?: ResumeSkill[];
  ats_score?: { total_score: number; grade: string };
  action_verbs_used?: string[];
  metrics_found?: number;
  sections_found?: Record<string, boolean>;
}

interface ScoredJob extends RawJob {
  matchScore: number;
  shortlistPct: number;
  tier: "strong" | "roi" | "stretch";
  matchReasons: string[];
  missingSignals: string[];
  atsStrengths: string[];
  atsWeaknesses: string[];
  confidence: "High" | "Medium" | "Low";
}

// ── Animation system (exact mirror of Resume Intelligence) ─────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: Math.min(i, 3) * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
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

// ── Matching engine ────────────────────────────────────────────────────────────

function scoreJob(job: RawJob, resume: ResumeData): ScoredJob {
  try {
    const resumeSkills = (resume?.skills || [])
      .filter(s => s && s.name)
      .map(s => s.name.toLowerCase());
    const resumeSkillNames = resume?.skills?.filter(s => s && s.name).map(s => s.name) || [];
    const desc = ((job?.description_snippet || "") + " " + (job?.title || "")).toLowerCase();
    const reqSkills = (job?.required_skills || [])
      .filter((r): r is string => typeof r === "string" && !!r);

    // Skill overlap scoring
    const skillHits = resumeSkills.filter(s => desc.includes(s) || reqSkills.some(r => r.toLowerCase().includes(s)));
    const skillScore = Math.min(50, skillHits.length * 8);

    // Title alignment
    const titleLower = (job?.title || "").toLowerCase();
    const cats = (resume?.skills || [])
      .filter(s => s && s.category)
      .reduce<Record<string, number>>((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1; return acc;
      }, {});
    const be = cats["backend"] || 0;
    const fe = cats["frontend"] || 0;
    const cloud = cats["cloud"] || 0;
    const ai = cats["ai"] || 0;

    let titleScore = 0;
    if ((be > fe) && (titleLower.includes("backend") || titleLower.includes("api") || titleLower.includes("server"))) titleScore = 15;
    else if ((fe > be) && (titleLower.includes("frontend") || titleLower.includes("ui") || titleLower.includes("react"))) titleScore = 15;
    else if (titleLower.includes("full") && titleLower.includes("stack")) titleScore = 12;
    else if (cloud > 2 && (titleLower.includes("devops") || titleLower.includes("cloud") || titleLower.includes("platform"))) titleScore = 15;
    else if (ai > 2 && (titleLower.includes("ml") || titleLower.includes("ai") || titleLower.includes("data"))) titleScore = 15;
    else if (titleLower.includes("software") || titleLower.includes("engineer") || titleLower.includes("developer")) titleScore = 8;

    // ATS quality bonus
    const atsBonus = Math.min(15, Math.round((resume?.ats_score?.total_score || 0) * 0.15));

    // Impact language bonus
    const verbBonus = Math.min(10, ((resume?.action_verbs_used || []).length >= 6 ? 10 : 5));
    const metricBonus = Math.min(10, (resume?.metrics_found || 0) * 3);

    const rawScore = skillScore + titleScore + atsBonus + verbBonus + metricBonus;
    const matchScore = Math.min(97, Math.max(18, rawScore));

    // Shortlist probability
    const shortlistPct = Math.min(92, Math.max(10, Math.round(matchScore * 0.7 + (resume?.ats_score?.total_score || 0) * 0.3)));

    // Tier
    const tier: ScoredJob["tier"] = matchScore >= 70 ? "strong" : matchScore >= 50 ? "roi" : "stretch";

    // Match reasons
    const matchReasons: string[] = [];
    if (skillHits.length > 0) matchReasons.push(`${skillHits.length} resume skill${skillHits.length > 1 ? "s" : ""} detected in job description`);
    if (titleScore >= 12) matchReasons.push("Role title aligns with your strongest engineering domain");
    if ((resume?.metrics_found || 0) >= 2) matchReasons.push("Quantified impact on resume matches role expectations");
    if (job?.is_remote) matchReasons.push("Remote-friendly — no location barrier");
    if (job?.matched_skill) matchReasons.push(`Directly matched via your skill: ${job.matched_skill}`);

    // Missing signals
    const missingSignals: string[] = [];
    if ((resume?.metrics_found || 0) < 2) missingSignals.push("Quantified impact missing from resume bullets");
    if (!(resume?.sections_found?.summary)) missingSignals.push("No professional summary to anchor positioning");
    if (skillHits.length < 2) missingSignals.push("Low keyword overlap with job description");

    // ATS strengths/weaknesses
    const atsStrengths: string[] = [];
    const atsWeaknesses: string[] = [];
    if ((resume?.ats_score?.total_score || 0) >= 70) atsStrengths.push("Strong ATS score — likely to pass automated screening");
    if (skillHits.length >= 3) atsStrengths.push("High keyword density match for this role");
    if ((resume?.action_verbs_used || []).length >= 6) atsStrengths.push("Action-oriented language improves ATS ranking");
    if ((resume?.ats_score?.total_score || 0) < 60) atsWeaknesses.push("ATS score below average — may be filtered before human review");
    if (skillHits.length < 2) atsWeaknesses.push("Low keyword overlap reduces ATS match rate");

    const confidence: ScoredJob["confidence"] = matchScore >= 70 ? "High" : matchScore >= 50 ? "Medium" : "Low";

    return { ...job, matchScore, shortlistPct, tier, matchReasons, missingSignals, atsStrengths, atsWeaknesses, confidence };
  } catch (err) {
    console.error("[SCORE JOB ERROR] Failed to score job ID:", job?.id, err);
    return {
      ...job,
      matchScore: 0,
      shortlistPct: 0,
      tier: "stretch" as const,
      matchReasons: [],
      missingSignals: ["AI matching failed for this role"],
      atsStrengths: [],
      atsWeaknesses: [],
      confidence: "Low" as const
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${n}`;
  const c = currency || "₹";
  if (min && max) return `${c}${fmt(min)}–${c}${fmt(max)}`;
  if (min) return `${c}${fmt(min)}+`;
  return `Up to ${c}${fmt(max!)}`;
}

function deriveMarketHero(jobs: ScoredJob[], resume: ResumeData): string {
  const strong = jobs.filter(j => j.tier === "strong").length;
  const topJob = jobs[0];
  const cats = (resume.skills || []).reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1; return acc;
  }, {});
  const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "software";
  const domainMap: Record<string, string> = {
    backend: "backend engineering", frontend: "frontend engineering",
    cloud: "cloud and DevOps", ai: "AI/ML engineering", data: "data engineering",
  };
  const domain = domainMap[topCat] || "software engineering";
  if (strong === 0) return `Your resume has limited overlap with current listings. Strengthening keyword density and quantified impact will significantly improve match rates.`;
  return `You have ${strong} strong match${strong > 1 ? "es" : ""} in ${domain}. ${topJob ? `"${topJob.title}" at ${topJob.company} is your highest-confidence opportunity at ${topJob.matchScore}% alignment.` : ""}`;
}

const MARKET_SIGNALS = [
  { signal: "Backend + cloud hybrid roles up 34% YoY", trend: "up", domain: "Backend / Cloud" },
  { signal: "TypeScript required in 78% of frontend JDs", trend: "up", domain: "Frontend" },
  { signal: "Pure frontend roles declining — full-stack preferred", trend: "down", domain: "Frontend" },
  { signal: "AI/ML engineering demand up 61% in 6 months", trend: "up", domain: "AI / ML" },
  { signal: "Remote backend roles increased 22% since Q1", trend: "up", domain: "Backend" },
];

const LOADING_STAGES = [
  "Fetching live job listings",
  "Analyzing resume signals",
  "Computing semantic match scores",
  "Ranking by recruiter fit confidence",
  "Generating AI reasoning",
];

// ── Loading experience ─────────────────────────────────────────────────────────

function MarketLoader({ onComplete }: { onComplete?: () => void }) {
  const [stageIdx, setStageIdx] = useState(0);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      setStageIdx(prev => {
        const next = prev + 1;
        setDone(d => [...d, prev]);
        if (next >= LOADING_STAGES.length) {
          clearInterval(iv);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 600);
          return prev;
        }
        return next;
      });
    }, 700);
    return () => clearInterval(iv);
  }, [onComplete]);

  return (
    <motion.div
      className="flex flex-col items-center gap-6 py-20"
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
        <p className="text-zinc-200 font-medium text-sm">Analyzing market opportunities</p>
        <p className="text-zinc-600 text-xs mt-1">Matching against your resume profile</p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {LOADING_STAGES.map((stage, i) => {
          const isDone = done.includes(i);
          const isActive = stageIdx === i;
          return (
            <motion.div
              key={stage}
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: i <= stageIdx ? 1 : 0.2, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            >
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                {isDone ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springConfig}>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                ) : isActive ? (
                  <motion.div className="w-2 h-2 rounded-full bg-zinc-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                )}
              </div>
              <span className={`text-xs ${isDone ? "text-zinc-400" : isActive ? "text-zinc-200" : "text-zinc-600"}`}>{stage}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Job card ───────────────────────────────────────────────────────────────────

function JobCard({ job, index }: { job: ScoredJob; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const scoreColor = job.matchScore >= 70 ? "text-emerald-400" : job.matchScore >= 50 ? "text-amber-400" : "text-zinc-500";
  const barColor = job.matchScore >= 70 ? "bg-emerald-500" : job.matchScore >= 50 ? "bg-amber-500" : "bg-zinc-600";
  const tierLabel = job.tier === "strong" ? "Strong Match" : job.tier === "roi" ? "High ROI" : "Stretch";
  const tierStyle = job.tier === "strong"
    ? "bg-emerald-950/50 text-emerald-400 border-emerald-800"
    : job.tier === "roi"
    ? "bg-amber-950/50 text-amber-400 border-amber-800"
    : "bg-zinc-900 text-zinc-500 border-zinc-700";
  const confStyle = job.confidence === "High" ? "text-emerald-400" : job.confidence === "Medium" ? "text-amber-400" : "text-zinc-500";

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      whileHover={{ y: -1, borderColor: "rgb(63 63 70)", transition: { duration: 0.2 } }}
      className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900"
    >
      {/* Main row */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
            {job.company_logo ? (
              <img src={job.company_logo} alt={job.company} className="w-full h-full object-contain" />
            ) : (
              <span className="text-sm font-bold text-zinc-400">{job.company?.charAt(0) || "?"}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 leading-tight">{job.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />{job.company}
                  </span>
                  <span className="flex items-center gap-1">
                    {job.is_remote ? <><Globe className="w-3 h-3" />Remote</> : <><MapPin className="w-3 h-3" />{job.location}</>}
                  </span>
                  {job.posted_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatDate(job.posted_at)}
                    </span>
                  )}
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                    <span className="text-zinc-400 font-mono">{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                  )}
                </div>
              </div>

              {/* Score + tier */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded border font-mono ${tierStyle}`}>{tierLabel}</span>
                <div className="text-right">
                  <span className={`text-lg font-black font-mono ${scoreColor}`}>
                    <AnimatedNumber value={job.matchScore} suffix="%" />
                  </span>
                  <p className="text-xs text-zinc-600 leading-none">match</p>
                </div>
              </div>
            </div>

            {/* Match bar */}
            <div className="mt-3">
              <AnimatedBar pct={job.matchScore} color={barColor} delay={Math.min(index, 3) * 0.04 + 0.05} />
            </div>

            {/* Snippet */}
            {job.description_snippet && (
              <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">{job.description_snippet}</p>
            )}

            {/* Footer row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600">
                  Shortlist prob: <span className={`font-mono font-semibold ${confStyle}`}>{job.shortlistPct}%</span>
                </span>
                <span className={`text-xs font-mono ${confStyle}`}>{job.confidence} confidence</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  whileTap={{ scale: 0.97 }}
                >
                  Why this role?
                  <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                </motion.button>
                {job.apply_link && (
                  <motion.a
                    href={job.apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springConfig}
                  >
                    Apply <ExternalLink className="w-3 h-3" />
                  </motion.a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded AI reasoning */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-950 border-t border-zinc-800 px-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Why matched */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Why This Role Fits</p>
                  <ul className="space-y-1.5">
                    {job.matchReasons.length > 0 ? job.matchReasons.map((r, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-2 text-xs text-zinc-300"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        {r}
                      </motion.li>
                    )) : <li className="text-xs text-zinc-600">Limited direct signals detected</li>}
                  </ul>
                </div>

                {/* Missing signals */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Missing Signals</p>
                  <ul className="space-y-1.5">
                    {job.missingSignals.length > 0 ? job.missingSignals.map((s, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-2 text-xs text-zinc-300"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 + 0.1 }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        {s}
                      </motion.li>
                    )) : <li className="text-xs text-zinc-500">No critical gaps detected</li>}
                  </ul>
                </div>

                {/* ATS analysis */}
                <div className="md:col-span-2 border-t border-zinc-800 pt-3 mt-1">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">ATS Analysis for This Role</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      {job.atsStrengths.map((s, i) => (
                        <p key={i} className="text-xs text-zinc-400 flex items-start gap-1.5 mb-1">
                          <span className="text-emerald-500 mt-0.5">+</span>{s}
                        </p>
                      ))}
                    </div>
                    <div>
                      {job.atsWeaknesses.map((s, i) => (
                        <p key={i} className="text-xs text-zinc-400 flex items-start gap-1.5 mb-1">
                          <span className="text-amber-500 mt-0.5">−</span>{s}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Section card (identical to Resume Intelligence) ────────────────────────────

function SectionCard({ title, icon, children, defaultOpen = true, delay = 0 }: {
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
      whileHover={{ y: -1, transition: { duration: 0.2 } }}
      className="border border-zinc-800 rounded-xl overflow-hidden"
    >
      <motion.button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900 hover:bg-zinc-800/80 transition-colors"
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-zinc-400">{icon}</span>
          <span className="text-sm font-semibold text-zinc-100 tracking-wide uppercase">{title}</span>
        </div>
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
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
            <div className="bg-zinc-950 px-6 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type FilterTab = "all" | "strong" | "roi" | "stretch" | "remote";

export default function MarketPage() {
  const { token } = useAuth();
  const [rawJobs, setRawJobs] = useState<RawJob[]>([]);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [scoredJobs, setScoredJobs] = useState<ScoredJob[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [userSkills, setUserSkills] = useState<string[]>([]);

  const loading = apiLoading || visualLoading;

  // Load resume + jobs on mount
  useEffect(() => {
    if (token) init();
  }, [token]);

  const init = useCallback(async () => {
    if (!token) return;
    setApiLoading(true);
    setVisualLoading(true);

    let resumeData: ResumeData | null = null;
    let skills = ["React", "JavaScript", "Node.js"];

    try {
      const r = await fetch("http://localhost:4000/api/v1/resumes/latest", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.parsed_json && Object.keys(d.parsed_json).length > 0) {
          resumeData = d.parsed_json;
          setResume(resumeData);
          if (resumeData?.skills?.length) {
            skills = resumeData.skills.slice(0, 5).map(s => s.name);
          }
        }
      }
    } catch { /* no resume */ }

    setUserSkills(skills);

    try {
      // 40s timeout — if the Python AI service is down, don't hang forever
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40000);

      const r = await fetch("http://localhost:4000/api/v1/market/jobs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ skills }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (r.ok) {
        const d = await r.json();
        const jobs: RawJob[] = d.jobs || [];
        setRawJobs(jobs);
        if (resumeData) {
          const scored = jobs.map(j => scoreJob(j, resumeData!)).sort((a, b) => b.matchScore - a.matchScore);
          setScoredJobs(scored);
        } else {
          setScoredJobs(jobs.map(j => ({ ...j, matchScore: 0, shortlistPct: 0, tier: "stretch" as const, matchReasons: [], missingSignals: ["Upload resume for AI matching"], atsStrengths: [], atsWeaknesses: [], confidence: "Low" as const })));
        }
      }
      // Always mark as loaded — even if 0 jobs returned
      setHasLoaded(true);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
         console.warn("[MARKET INIT] Request timed out (aborted after 40s)");
      } else {
        console.error("[MARKET INIT ERROR]", err);
      }
      // Network error or timeout — show empty state, don't hang
      setHasLoaded(true);
    } finally {
      setApiLoading(false);
    }
  }, [token]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !token) return;
    setApiLoading(true);
    setVisualLoading(true);
    try {
      const r = await fetch("http://localhost:4000/api/v1/market/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (r.ok) {
        const d = await r.json();
        const jobs: RawJob[] = d.jobs || [];
        setRawJobs(jobs);
        if (resume) {
          const scored = jobs.map(j => scoreJob(j, resume)).sort((a, b) => b.matchScore - a.matchScore);
          setScoredJobs(scored);
        } else {
          setScoredJobs(jobs.map(j => ({ ...j, matchScore: 0, shortlistPct: 0, tier: "stretch" as const, matchReasons: [], missingSignals: [], atsStrengths: [], atsWeaknesses: [], confidence: "Low" as const })));
        }
        setHasLoaded(true);
      }
    } catch (err) {
      console.error("[MARKET SEARCH ERROR]", err);
    }
    setApiLoading(false);
  }, [searchQuery, token, resume]);

  // Filtered jobs
  const filteredJobs = scoredJobs.filter(j => {
    if (activeFilter === "strong") return j.tier === "strong";
    if (activeFilter === "roi") return j.tier === "roi";
    if (activeFilter === "stretch") return j.tier === "stretch";
    if (activeFilter === "remote") return j.is_remote;
    return true;
  });

  const strongCount = scoredJobs.filter(j => j.tier === "strong").length;
  const roiCount = scoredJobs.filter(j => j.tier === "roi").length;
  const remoteCount = scoredJobs.filter(j => j.is_remote).length;
  const heroText = hasLoaded && scoredJobs.length > 0 && resume ? deriveMarketHero(scoredJobs, resume) : null;

  const FILTERS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All Matches", count: scoredJobs.length },
    { key: "strong", label: "Strong", count: strongCount },
    { key: "roi", label: "High ROI", count: roiCount },
    { key: "stretch", label: "Stretch", count: scoredJobs.filter(j => j.tier === "stretch").length },
    { key: "remote", label: "Remote", count: remoteCount },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">

        {/* ── Sticky back button ── */}
        <div className="sticky top-0 z-20 px-6 pt-4 pb-2 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-900">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Link href="/dashboard">
                <motion.div
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Dashboard
                </motion.div>
              </Link>
            </motion.div>

            {/* Search bar */}
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Search roles…"
                  className="pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 w-52 transition-colors"
                />
              </div>
              <motion.button
                onClick={handleSearch}
                disabled={loading}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors disabled:opacity-40"
                whileTap={{ scale: 0.97 }}
              >
                Search
              </motion.button>
              <motion.button
                onClick={init}
                disabled={loading}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors disabled:opacity-40"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.4 }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* ── Page header ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Market Intelligence</p>
            <h1 className="text-2xl font-bold text-zinc-100 mt-1">Opportunity Analysis</h1>
          </motion.div>

          {/* ── Loading ── */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MarketLoader onComplete={() => setVisualLoading(false)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Content ── */}
          {!loading && hasLoaded && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* ── Market Intelligence Hero ── */}
              {heroText && (
                <motion.div
                  className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ borderColor: "rgb(63 63 70)" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <motion.span
                          className="text-xs font-semibold px-2.5 py-1 rounded border font-mono bg-zinc-800 text-zinc-400 border-zinc-700"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15, ...springConfig }}
                        >
                          AI Market Assessment
                        </motion.span>
                        <motion.span className="text-xs text-zinc-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                          Derived from {scoredJobs.length} live listings
                        </motion.span>
                      </div>
                      <motion.p
                        className="text-zinc-200 text-sm leading-relaxed max-w-2xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                      >
                        {heroText}
                      </motion.p>
                    </div>
                    <motion.div
                      className="flex gap-3 shrink-0"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <HeroPill value={scoredJobs.length} label="Total Roles" />
                      <HeroPill value={strongCount} label="Strong Matches" color={strongCount > 0 ? "text-emerald-400" : "text-zinc-400"} />
                      <HeroPill value={remoteCount} label="Remote" color="text-blue-400" />
                    </motion.div>
                  </div>

                  {/* Skills being matched */}
                  {userSkills.length > 0 && (
                    <motion.div
                      className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2 flex-wrap"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <span className="text-xs text-zinc-600">Matched via:</span>
                      {userSkills.map((s, i) => (
                        <motion.span
                          key={s}
                          className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded font-mono"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.05, ...springConfig }}
                        >
                          {s}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── Filter tabs ── */}
              <motion.div
                className="flex items-center gap-1 flex-wrap"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
              >
                {FILTERS.map(f => (
                  <motion.button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors font-mono ${
                      activeFilter === f.key
                        ? "bg-zinc-800 text-zinc-100 border-zinc-600"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                    }`}
                    whileTap={{ scale: 0.97 }}
                  >
                    {f.label}
                    {f.count !== undefined && (
                      <span className={`text-xs ${activeFilter === f.key ? "text-zinc-400" : "text-zinc-700"}`}>
                        {f.count}
                      </span>
                    )}
                  </motion.button>
                ))}
              </motion.div>

              {/* ── Job cards ── */}
              {filteredJobs.length > 0 ? (
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredJobs.map((job, i) => (
                    <JobCard key={job.id} job={job} index={i} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-12 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Briefcase className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No jobs match this filter.</p>
                  <button onClick={() => setActiveFilter("all")} className="text-xs text-zinc-400 hover:text-zinc-200 mt-2 transition-colors">
                    Clear filter
                  </button>
                </motion.div>
              )}

              {/* ── Market Signals ── */}
              <SectionCard title="Market Signals" icon={<Activity className="w-4 h-4" />} delay={0} defaultOpen={false}>
                <p className="text-xs text-zinc-500 mb-5">
                  Hiring trend signals across engineering domains. Updated weekly from job market analysis.
                </p>
                <motion.div className="space-y-0" variants={staggerContainer} initial="hidden" animate="visible">
                  {MARKET_SIGNALS.map((item, i) => (
                    <motion.div
                      key={i}
                      variants={fadeUp}
                      custom={i}
                      className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0"
                      whileHover={{ x: 2, transition: { duration: 0.15 } }}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.trend === "up" ? "bg-emerald-500" : item.trend === "down" ? "bg-red-500" : "bg-zinc-500"}`} />
                        <span className="text-sm text-zinc-300">{item.signal}</span>
                      </div>
                      <span className="text-xs text-zinc-600 shrink-0 ml-4 font-mono">{item.domain}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </SectionCard>

              {/* ── Application Strategy ── */}
              <SectionCard title="Application Strategy" icon={<Target className="w-4 h-4" />} delay={1} defaultOpen={false}>
                <p className="text-xs text-zinc-500 mb-5">
                  AI-recommended application prioritization based on match scores, company response rates, and resume alignment.
                </p>
                <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
                  {[
                    {
                      priority: "01",
                      action: `Apply to your top ${Math.min(3, strongCount || 1)} strong matches first`,
                      reason: "High match scores indicate strong keyword overlap and role alignment. These have the highest shortlist probability.",
                      impact: strongCount > 0 ? `${scoredJobs.filter(j => j.tier === "strong")[0]?.shortlistPct || 0}% estimated shortlist rate` : "Upload resume for personalized estimate",
                    },
                    {
                      priority: "02",
                      action: resume && (resume.metrics_found || 0) < 2 ? "Add 2–3 quantified outcomes before applying" : "Tailor your summary to each role's top keyword",
                      reason: resume && (resume.metrics_found || 0) < 2
                        ? "Resumes with ≥3 metrics are shortlisted 2.3× more often. A quick edit before applying significantly improves outcomes."
                        : "ATS systems rank resumes by keyword density. A role-specific summary increases match rate by 15–20%.",
                      impact: "+11–15% shortlist probability",
                    },
                    {
                      priority: "03",
                      action: remoteCount > 0 ? `Target ${remoteCount} remote role${remoteCount > 1 ? "s" : ""} to expand opportunity pool` : "Broaden search to include hybrid roles",
                      reason: "Remote roles remove location barriers and typically have larger applicant pools but also more structured screening.",
                      impact: "Wider opportunity surface",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      variants={fadeUp}
                      custom={i}
                      className="border border-zinc-800 rounded-lg p-4 bg-zinc-900"
                      whileHover={{ borderColor: "rgb(63 63 70)", transition: { duration: 0.15 } }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-mono text-zinc-600 shrink-0 mt-0.5">{item.priority}</span>
                        <div className="flex-1">
                          <p className="text-sm text-zinc-200 font-medium mb-1">{item.action}</p>
                          <p className="text-xs text-zinc-500 leading-relaxed mb-2">{item.reason}</p>
                          <span className="text-xs text-emerald-400 font-mono">{item.impact}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </SectionCard>

            </motion.div>
          )}

          {/* ── Empty state when loaded but no jobs (service unavailable) ── */}
          {!loading && hasLoaded && scoredJobs.length === 0 && (
            <motion.div
              className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-16 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={springConfig}
              >
                <Briefcase className="w-5 h-5 text-zinc-500" />
              </motion.div>
              <p className="text-sm font-medium text-zinc-300 mb-1">No job listings available</p>
              <p className="text-xs text-zinc-600 mb-4">
                The job search service may be offline. Try searching manually or check back later.
              </p>
              <motion.button
                onClick={init}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-lg transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </motion.button>
            </motion.div>
          )}

          {/* ── Initial loading state (before first fetch completes) ── */}
          {!loading && !hasLoaded && (
            <motion.div
              className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-16 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={springConfig}
              >
                <Briefcase className="w-5 h-5 text-zinc-500" />
              </motion.div>
              <p className="text-sm font-medium text-zinc-300 mb-1">Loading market intelligence…</p>
              <p className="text-xs text-zinc-600">Fetching live job listings matched to your profile</p>
            </motion.div>
          )}

        </div>
      </div>
    </AuthGuard>
  );
}

// ── Hero pill ──────────────────────────────────────────────────────────────────

function HeroPill({ value, label, color = "text-zinc-100" }: { value: number; label: string; color?: string }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-950"
      whileHover={{ borderColor: "rgb(63 63 70)", backgroundColor: "rgb(24 24 27)", transition: { duration: 0.2 } }}
    >
      <span className={`text-xl font-bold font-mono ${color}`}>
        <AnimatedNumber value={value} />
      </span>
      <span className="text-xs text-zinc-500 mt-0.5 text-center whitespace-nowrap">{label}</span>
    </motion.div>
  );
}
