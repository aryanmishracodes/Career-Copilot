"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  TrendingUp, Zap, Target, BarChart2, BookOpen, ExternalLink,
  Activity, ArrowRight, Clock, Layers, Cpu, Star, RefreshCw
} from "lucide-react";
import {
  motion, AnimatePresence, useInView, useMotionValue,
  useSpring, useTransform
} from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import AuthGuard from "../../components/AuthGuard";
import { SpatialPanel, InteractiveButton, AmbientGlow, NeuralPulse } from "../../components/ui/primitives";

// ── Types ──────────────────────────────────────────────────────────────────────

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
  improvement_tips?: string[];
}

interface SkillNode {
  name: string;
  stage: "critical" | "roi" | "differentiator" | "advanced" | "growth";
  hiringImpact: "Very High" | "High" | "Medium" | "Low";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedWeeks: number;
  recruiterRelevance: number; // 0-100
  marketDemand: "Surging" | "Growing" | "Stable" | "Declining";
  demandPct: number; // YoY % change
  why: string;
  companies: string[];
  resources: Resource[];
  missingFrom: boolean; // not in resume
}

interface Resource {
  type: "course" | "book" | "project" | "video" | "practice";
  name: string;
  platform: string;
  why: string;
  hours: number;
}

// ── Animation system (exact mirror of Resume Intelligence) ─────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
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
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
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

// ── Roadmap intelligence engine ────────────────────────────────────────────────

const SKILL_INTELLIGENCE: Record<string, Partial<SkillNode>> = {
  // Backend
  "Docker": { hiringImpact: "Very High", difficulty: "Intermediate", estimatedWeeks: 2, recruiterRelevance: 91, marketDemand: "Surging", demandPct: 38, companies: ["Stripe", "Vercel", "Shopify", "Cloudflare"], resources: [{ type: "course", name: "Docker & Kubernetes: The Practical Guide", platform: "Udemy", why: "Most comprehensive hands-on Docker course with real deployment scenarios", hours: 22 }, { type: "project", name: "Containerize your existing Node.js/Python project", platform: "Personal", why: "Recruiters value demonstrated Docker usage over theoretical knowledge", hours: 8 }] },
  "Kubernetes": { hiringImpact: "Very High", difficulty: "Advanced", estimatedWeeks: 4, recruiterRelevance: 87, marketDemand: "Surging", demandPct: 44, companies: ["Google", "Stripe", "Datadog", "Cloudflare"], resources: [{ type: "course", name: "Kubernetes for Developers", platform: "Linux Foundation", why: "Official certification path — CKA is highly valued by hiring teams", hours: 30 }, { type: "practice", name: "KillerCoda Kubernetes Labs", platform: "KillerCoda", why: "Interactive browser-based labs — no local setup required", hours: 10 }] },
  "PostgreSQL": { hiringImpact: "High", difficulty: "Intermediate", estimatedWeeks: 2, recruiterRelevance: 84, marketDemand: "Growing", demandPct: 22, companies: ["Supabase", "Neon", "PlanetScale", "Railway"], resources: [{ type: "course", name: "Complete SQL & Databases Bootcamp", platform: "Zero to Mastery", why: "Covers advanced query optimization and indexing strategies recruiters test for", hours: 18 }, { type: "book", name: "PostgreSQL: Up and Running", platform: "O'Reilly", why: "Concise reference for production patterns — covers JSONB, CTEs, window functions", hours: 12 }] },
  "Redis": { hiringImpact: "High", difficulty: "Intermediate", estimatedWeeks: 1, recruiterRelevance: 79, marketDemand: "Growing", demandPct: 28, companies: ["Upstash", "Vercel", "Shopify", "Discord"], resources: [{ type: "course", name: "Redis University RU101", platform: "Redis University", why: "Free official course — directly maps to what interviewers ask about caching", hours: 8 }, { type: "project", name: "Add Redis caching layer to an existing API", platform: "Personal", why: "Demonstrates practical understanding of cache invalidation and TTL strategies", hours: 6 }] },
  "TypeScript": { hiringImpact: "Very High", difficulty: "Intermediate", estimatedWeeks: 3, recruiterRelevance: 93, marketDemand: "Surging", demandPct: 41, companies: ["Vercel", "Linear", "Notion", "Stripe"], resources: [{ type: "course", name: "TypeScript: The Complete Developer's Guide", platform: "Udemy", why: "Covers generics, utility types, and advanced patterns used in production codebases", hours: 27 }, { type: "book", name: "Programming TypeScript", platform: "O'Reilly", why: "Deep type system coverage — essential for senior-level TypeScript interviews", hours: 15 }] },
  "System Design": { hiringImpact: "Very High", difficulty: "Advanced", estimatedWeeks: 6, recruiterRelevance: 95, marketDemand: "Surging", demandPct: 52, companies: ["Google", "Meta", "Stripe", "Airbnb"], resources: [{ type: "course", name: "Grokking the System Design Interview", platform: "Educative", why: "Industry-standard prep — covers distributed systems patterns tested at FAANG", hours: 40 }, { type: "book", name: "Designing Data-Intensive Applications", platform: "O'Reilly", why: "The definitive reference for distributed systems — cited in virtually every senior interview", hours: 35 }, { type: "video", name: "ByteByteGo System Design Series", platform: "YouTube", why: "Visual explanations of complex architectures — excellent for interview prep", hours: 12 }] },
  "AWS": { hiringImpact: "Very High", difficulty: "Intermediate", estimatedWeeks: 4, recruiterRelevance: 88, marketDemand: "Surging", demandPct: 34, companies: ["Amazon", "Stripe", "Shopify", "Twilio"], resources: [{ type: "course", name: "AWS Certified Developer Associate", platform: "A Cloud Guru", why: "Certification is a strong hiring signal — covers EC2, Lambda, S3, RDS in depth", hours: 35 }, { type: "practice", name: "AWS Free Tier hands-on projects", platform: "AWS", why: "Practical deployment experience is what interviewers probe for", hours: 15 }] },
  "React": { hiringImpact: "Very High", difficulty: "Intermediate", estimatedWeeks: 3, recruiterRelevance: 90, marketDemand: "Stable", demandPct: 8, companies: ["Meta", "Vercel", "Linear", "Notion"], resources: [{ type: "course", name: "Epic React", platform: "Kent C. Dodds", why: "The most comprehensive React course — covers patterns used in production at scale", hours: 30 }, { type: "project", name: "Build a full-stack Next.js application", platform: "Personal", why: "React + Next.js is the dominant frontend stack — portfolio projects are essential", hours: 20 }] },
  "Next.js": { hiringImpact: "High", difficulty: "Intermediate", estimatedWeeks: 2, recruiterRelevance: 85, marketDemand: "Surging", demandPct: 47, companies: ["Vercel", "Shopify", "TikTok", "Twitch"], resources: [{ type: "course", name: "Next.js 14 Complete Course", platform: "Udemy", why: "Covers App Router, Server Components, and streaming — the current production standard", hours: 20 }] },
  "GraphQL": { hiringImpact: "Medium", difficulty: "Intermediate", estimatedWeeks: 2, recruiterRelevance: 72, marketDemand: "Stable", demandPct: 5, companies: ["GraphQL", "Shopify", "Twitter", "Airbnb"], resources: [{ type: "course", name: "The Modern GraphQL Bootcamp", platform: "Udemy", why: "Covers schema design, resolvers, and subscriptions — the full production stack", hours: 16 }] },
  "Python": { hiringImpact: "High", difficulty: "Beginner", estimatedWeeks: 3, recruiterRelevance: 82, marketDemand: "Growing", demandPct: 25, companies: ["Google", "Stripe", "Dropbox", "Reddit"], resources: [{ type: "course", name: "Python for Everybody", platform: "Coursera", why: "Best structured Python course for developers coming from other languages", hours: 20 }] },
  "Go": { hiringImpact: "High", difficulty: "Intermediate", estimatedWeeks: 4, recruiterRelevance: 80, marketDemand: "Growing", demandPct: 31, companies: ["Google", "Cloudflare", "Stripe", "Uber"], resources: [{ type: "course", name: "Learn Go with Tests", platform: "GitHub", why: "Free, test-driven approach — mirrors how Go is actually used in production", hours: 20 }] },
  "CI/CD": { hiringImpact: "High", difficulty: "Intermediate", estimatedWeeks: 2, recruiterRelevance: 83, marketDemand: "Growing", demandPct: 29, companies: ["GitHub", "GitLab", "Vercel", "Netlify"], resources: [{ type: "course", name: "GitHub Actions: The Complete Guide", platform: "Udemy", why: "GitHub Actions is now the dominant CI/CD platform — directly applicable to most jobs", hours: 12 }, { type: "project", name: "Set up CI/CD pipeline for a personal project", platform: "GitHub", why: "Demonstrated pipeline experience is a strong hiring signal for DevOps-adjacent roles", hours: 6 }] },
  "Node.js": { hiringImpact: "High", difficulty: "Intermediate", estimatedWeeks: 3, recruiterRelevance: 86, marketDemand: "Stable", demandPct: 12, companies: ["Netflix", "LinkedIn", "Uber", "PayPal"], resources: [{ type: "course", name: "Node.js: The Complete Guide", platform: "Udemy", why: "Covers event loop, streams, clustering — the internals interviewers probe for", hours: 25 }] },
};

// Gap skill database — skills commonly required but often missing
const GAP_SKILLS_BY_DOMAIN: Record<string, string[]> = {
  backend: ["Docker", "Kubernetes", "PostgreSQL", "Redis", "System Design", "CI/CD"],
  frontend: ["TypeScript", "Next.js", "System Design", "Docker", "GraphQL"],
  cloud: ["Kubernetes", "AWS", "CI/CD", "Docker", "System Design"],
  ai: ["Python", "Docker", "PostgreSQL", "System Design", "AWS"],
  data: ["PostgreSQL", "Redis", "Docker", "Python", "System Design"],
  fullstack: ["TypeScript", "Docker", "PostgreSQL", "System Design", "CI/CD"],
};

const STAGE_META: Record<SkillNode["stage"], { label: string; description: string; color: string; borderColor: string; badgeStyle: string }> = {
  critical: {
    label: "Critical Hiring Gap",
    description: "Skills that are blocking your shortlist rate right now",
    color: "text-rose-400",
    borderColor: "border-rose-900/60 shadow-[0_0_12px_rgba(244,63,94,0.06)]",
    badgeStyle: "bg-rose-950/50 text-rose-400 border-rose-900/40",
  },
  roi: {
    label: "High ROI Skills",
    description: "Highest return on learning investment for your target domain",
    color: "text-amber-400",
    borderColor: "border-amber-900/40 shadow-[0_0_12px_rgba(245,158,11,0.06)]",
    badgeStyle: "bg-amber-950/50 text-amber-400 border-amber-900/30",
  },
  differentiator: {
    label: "Market Differentiators",
    description: "Skills that separate you from average candidates",
    color: "text-cyan-400",
    borderColor: "border-cyan-900/40 shadow-[0_0_12px_rgba(34,211,238,0.06)]",
    badgeStyle: "bg-cyan-950/50 text-cyan-400 border-cyan-900/30",
  },
  advanced: {
    label: "Advanced Engineering",
    description: "Senior-level signals that unlock higher compensation",
    color: "text-purple-400",
    borderColor: "border-purple-900/40",
    badgeStyle: "bg-purple-950/50 text-purple-400 border-purple-900/30",
  },
  growth: {
    label: "Long-Term Growth",
    description: "Emerging technologies with strong 2–3 year trajectory",
    color: "text-emerald-400",
    borderColor: "border-emerald-900/40",
    badgeStyle: "bg-emerald-950/50 text-emerald-400 border-emerald-900/30",
  },
};

function buildRoadmap(resume: ResumeData): SkillNode[] {
  const userSkillNames = (resume.skills || []).map(s => s.name.toLowerCase());
  const cats = (resume.skills || []).reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1; return acc;
  }, {});

  // Determine primary domain
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const primaryDomain = sorted[0]?.[0] || "backend";
  const secondaryDomain = sorted[1]?.[0];

  // Get gap skills for this domain
  const domainGaps = GAP_SKILLS_BY_DOMAIN[primaryDomain] || GAP_SKILLS_BY_DOMAIN["backend"];
  const secondaryGaps = secondaryDomain ? (GAP_SKILLS_BY_DOMAIN[secondaryDomain] || []) : [];

  // Combine and deduplicate
  const allCandidates = [...new Set([...domainGaps, ...secondaryGaps, "System Design", "Docker", "TypeScript"])];

  const nodes: SkillNode[] = [];

  for (const skillName of allCandidates) {
    const intel = SKILL_INTELLIGENCE[skillName];
    if (!intel) continue;

    const alreadyHas = userSkillNames.includes(skillName.toLowerCase());

    // Assign stage
    let stage: SkillNode["stage"];
    if (!alreadyHas && (intel.hiringImpact === "Very High") && (intel.marketDemand === "Surging" || intel.marketDemand === "Growing")) {
      stage = "critical";
    } else if (!alreadyHas && intel.hiringImpact === "High") {
      stage = "roi";
    } else if (alreadyHas && (intel.recruiterRelevance || 0) >= 85) {
      stage = "differentiator"; // deepen existing strength
    } else if (!alreadyHas && intel.difficulty === "Advanced") {
      stage = "advanced";
    } else {
      stage = "growth";
    }

    // Build why string
    const why = alreadyHas
      ? `You have ${skillName} on your resume — deepening this to production-level proficiency increases your recruiter relevance score from ${intel.recruiterRelevance}% to an estimated 95%+.`
      : `${skillName} appears in ${intel.recruiterRelevance}% of job descriptions matching your profile. It is currently absent from your resume, directly reducing your ATS match rate.`;

    nodes.push({
      name: skillName,
      stage,
      hiringImpact: intel.hiringImpact || "Medium",
      difficulty: intel.difficulty || "Intermediate",
      estimatedWeeks: intel.estimatedWeeks || 2,
      recruiterRelevance: intel.recruiterRelevance || 70,
      marketDemand: intel.marketDemand || "Stable",
      demandPct: intel.demandPct || 10,
      why,
      companies: intel.companies || [],
      resources: intel.resources || [],
      missingFrom: !alreadyHas,
    });
  }

  // Sort: critical first, then by recruiterRelevance desc
  const stageOrder: Record<SkillNode["stage"], number> = { critical: 0, roi: 1, differentiator: 2, advanced: 3, growth: 4 };
  return nodes.sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage] || b.recruiterRelevance - a.recruiterRelevance);
}

function deriveHeroText(resume: ResumeData, roadmap: SkillNode[]): string {
  const cats = (resume.skills || []).reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1; return acc;
  }, {});
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const domainMap: Record<string, string> = {
    backend: "backend engineering", frontend: "frontend engineering",
    cloud: "cloud and DevOps", ai: "AI/ML engineering", data: "data engineering",
  };
  const domain = domainMap[sorted[0]?.[0]] || "software engineering";
  const secondary = sorted[1]?.[0] ? ` with growing ${domainMap[sorted[1][0]] || sorted[1][0]} potential` : "";
  const topGap = roadmap.find(n => n.stage === "critical");
  const gapStr = topGap ? ` Learning ${topGap.name} is your highest-ROI next step — it appears in ${topGap.recruiterRelevance}% of matching job descriptions.` : "";
  return `Your profile aligns strongest with ${domain} roles${secondary}.${gapStr}`;
}

function deriveTopPriority(roadmap: SkillNode[]): SkillNode | null {
  return roadmap.find(n => n.stage === "critical") || roadmap[0] || null;
}

function deriveTrendingSkills(resume: ResumeData): { name: string; trend: "up" | "down" | "neutral"; pct: number; inResume: boolean }[] {
  const userSkills = (resume.skills || []).map(s => s.name.toLowerCase());
  return [
    { name: "Docker", trend: "up", pct: 38, inResume: userSkills.includes("docker") },
    { name: "TypeScript", trend: "up", pct: 41, inResume: userSkills.includes("typescript") },
    { name: "Kubernetes", trend: "up", pct: 44, inResume: userSkills.includes("kubernetes") },
    { name: "Next.js", trend: "up", pct: 47, inResume: userSkills.includes("next.js") },
    { name: "System Design", trend: "up", pct: 52, inResume: userSkills.includes("system design") },
    { name: "PostgreSQL", trend: "up", pct: 22, inResume: userSkills.includes("postgresql") },
    { name: "Go", trend: "up", pct: 31, inResume: userSkills.includes("go") || userSkills.includes("golang") },
    { name: "jQuery", trend: "down", pct: -18, inResume: userSkills.includes("jquery") },
    { name: "REST (only)", trend: "down", pct: -12, inResume: false },
  ];
}

// ── Skill card (visually redesigned with HSL borders) ──────────────────────────

function SkillCard({ node, index }: { node: SkillNode; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const meta = STAGE_META[node.stage];

  const impactColor = node.hiringImpact === "Very High" ? "text-emerald-400"
    : node.hiringImpact === "High" ? "text-amber-400"
    : node.hiringImpact === "Medium" ? "text-blue-400" : "text-zinc-500";

  const demandColor = node.marketDemand === "Surging" ? "text-emerald-400"
    : node.marketDemand === "Growing" ? "text-amber-400"
    : node.marketDemand === "Stable" ? "text-zinc-400" : "text-rose-500";

  const resourceIcon: Record<Resource["type"], string> = {
    course: "📚", book: "📖", project: "🛠", video: "🎬", practice: "⚡",
  };

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className="group/card"
    >
      <SpatialPanel
        glow={true}
        interactive={false}
        className={`p-5 border transition-all duration-300 bg-zinc-950/40 backdrop-blur-xl shadow-xl ${
          node.missingFrom 
            ? `${meta.borderColor} bg-zinc-950/65` 
            : "border-zinc-900/80"
        }`}
      >
        {/* Main row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Header badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-mono tracking-widest font-bold px-2.5 py-0.5 rounded-md border uppercase ${meta.badgeStyle}`}>
                {meta.label}
              </span>
              {node.missingFrom && (
                <motion.span
                  className="text-[9px] font-mono tracking-widest font-bold px-2.5 py-0.5 rounded-md border bg-rose-950/30 text-rose-400 border-rose-900/40 animate-pulse"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.1, ...springConfig }}
                >
                  Not in resume
                </motion.span>
              )}
            </div>

            <h3 className="text-base font-bold text-zinc-100 font-outfit">{node.name}</h3>

            {/* Meta row */}
            <div className="flex items-center gap-3.5 flex-wrap text-xs font-outfit">
              <span className={`font-semibold ${impactColor}`}>{node.hiringImpact} Impact</span>
              <span className="text-zinc-700 select-none">·</span>
              <span className={demandColor}>
                {node.marketDemand === "Surging" || node.marketDemand === "Growing" ? "↑" : node.marketDemand === "Declining" ? "↓" : "→"} {node.marketDemand} ({node.demandPct > 0 ? "+" : ""}{node.demandPct}%)
              </span>
              <span className="text-zinc-700 select-none">·</span>
              <span className="text-zinc-400">{node.difficulty}</span>
              <span className="text-zinc-700 select-none">·</span>
              <span className="text-zinc-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-600" />{node.estimatedWeeks} weeks
              </span>
            </div>
          </div>

          {/* Recruiter relevance circular gauge */}
          <div className="shrink-0 text-left sm:text-right border-t border-zinc-900/50 sm:border-t-0 pt-3 sm:pt-0">
            <span className={`text-2xl font-bold font-mono tracking-tight ${node.recruiterRelevance >= 85 ? "text-emerald-400" : node.recruiterRelevance >= 70 ? "text-amber-400" : "text-zinc-500"}`}>
              <AnimatedNumber value={node.recruiterRelevance} suffix="%" />
            </span>
            <p className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase mt-0.5">recruiter relevance</p>
          </div>
        </div>

        {/* Relevance progress bar */}
        <div className="mt-4">
          <AnimatedBar
            pct={node.recruiterRelevance}
            color={node.recruiterRelevance >= 85 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : node.recruiterRelevance >= 70 ? "bg-amber-500" : "bg-zinc-700"}
            delay={Math.min(index, 3) * 0.04 + 0.05}
          />
        </div>

        {/* Description/Why summary */}
        <p className="text-xs text-zinc-400 mt-3 leading-relaxed font-outfit">{node.why}</p>

        {/* Target Hiring Companies */}
        {node.companies.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Target Hiring:</span>
            {node.companies.slice(0, 4).map(c => (
              <span key={c} className="text-xs text-zinc-300 font-mono bg-zinc-900/60 border border-zinc-800/40 rounded px-2 py-0.5">{c}</span>
            ))}
          </div>
        )}

        {/* Expand Details Trigger */}
        <div className="mt-4 pt-3.5 border-t border-zinc-900/80 flex items-center justify-between">
          <motion.button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-outfit"
            whileTap={{ scale: 0.97 }}
          >
            Resources & telemetry details
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
            </motion.span>
          </motion.button>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{node.resources.length} active path{node.resources.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Expanded detail resources panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-zinc-900/80 pt-4.5 mt-2.5 space-y-4">

                {/* Extended Analysis */}
                <div className="space-y-2">
                  <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">AI Diagnostic</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="border border-zinc-900 rounded-xl px-4 py-3 bg-zinc-950/60 font-outfit">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">Market demand</p>
                      <p className={`text-xs font-semibold ${demandColor}`}>{node.marketDemand} · {node.demandPct > 0 ? "+" : ""}{node.demandPct}% YoY</p>
                    </div>
                    <div className="border border-zinc-900 rounded-xl px-4 py-3 bg-zinc-950/60 font-outfit">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">Hiring impact</p>
                      <p className={`text-xs font-semibold ${impactColor}`}>{node.hiringImpact}</p>
                    </div>
                  </div>
                </div>

                {/* Resource Lists */}
                {node.resources.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Recommended learning channels</p>
                    <div className="space-y-2.5">
                      {node.resources.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <SpatialPanel
                            glow={false}
                            interactive={true}
                            className="border-zinc-900/80 bg-zinc-950/60 p-3.5 hover:bg-zinc-900/10 shadow-lg relative overflow-hidden flex flex-col sm:flex-row justify-between gap-4"
                          >
                            <div className="flex items-start gap-2.5 flex-1">
                              <span className="text-sm shrink-0 pt-0.5">{resourceIcon[r.type]}</span>
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-zinc-200 font-outfit leading-snug">{r.name}</p>
                                <p className="text-[10px] text-zinc-500 font-mono tracking-wide uppercase">{r.platform} · ~{r.hours} hours</p>
                                <p className="text-xs text-zinc-500 leading-relaxed font-outfit pt-1 border-t border-zinc-900/40">{r.why}</p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-mono tracking-widest px-2.5 py-0.5 rounded-md border shrink-0 self-start sm:self-center uppercase ${
                              r.type === "course" ? "bg-blue-950/40 text-blue-400 border-blue-900/50" :
                              r.type === "book" ? "bg-purple-950/40 text-purple-400 border-purple-900/50" :
                              r.type === "project" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" :
                              r.type === "video" ? "bg-amber-950/40 text-amber-400 border-amber-900/50" :
                              "bg-zinc-900 text-zinc-500 border-zinc-800"
                            }`}>
                              {r.type}
                            </span>
                          </SpatialPanel>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SpatialPanel>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type StageFilter = "all" | SkillNode["stage"];

export default function RoadmapPage() {
  const { token } = useAuth();
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [roadmap, setRoadmap] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StageFilter>("all");
  const [lastUpdated] = useState(() => {
    const d = new Date();
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  });

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:4000/api/v1/resumes/latest", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.parsed_json && Object.keys(d.parsed_json).length > 0) {
          const rd: ResumeData = d.parsed_json;
          setResume(rd);
          setRoadmap(buildRoadmap(rd));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const filteredRoadmap = activeFilter === "all" ? roadmap : roadmap.filter(n => n.stage === activeFilter);
  const criticalCount = roadmap.filter(n => n.stage === "critical").length;
  const totalWeeks = roadmap.slice(0, 5).reduce((acc, n) => acc + n.estimatedWeeks, 0);
  const heroText = resume && roadmap.length > 0 ? deriveHeroText(resume, roadmap) : null;
  const topPriority = resume ? deriveTopPriority(roadmap) : null;
  const trending = resume ? deriveTrendingSkills(resume) : [];

  const STAGE_FILTERS: { key: StageFilter; label: string; count?: number }[] = [
    { key: "all", label: "All nodes", count: roadmap.length },
    { key: "critical", label: "Critical Gaps", count: criticalCount },
    { key: "roi", label: "High ROI", count: roadmap.filter(n => n.stage === "roi").length },
    { key: "differentiator", label: "Differentiators", count: roadmap.filter(n => n.stage === "differentiator").length },
    { key: "advanced", label: "Advanced", count: roadmap.filter(n => n.stage === "advanced").length },
    { key: "growth", label: "Growth paths", count: roadmap.filter(n => n.stage === "growth").length },
  ];

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#030303] flex items-center justify-center relative overflow-hidden">
          <AmbientGlow size="md" color="mixed" className="opacity-20" />
          <motion.div
            className="w-10 h-10 border-2 border-zinc-800 border-t-violet-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </AuthGuard>
    );
  }

  if (!resume) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center px-6 relative overflow-hidden">
          <AmbientGlow size="lg" color="mixed" className="-top-40 left-1/2 -translate-x-1/2 opacity-25" />
          <motion.div
            className="w-full max-w-md text-center space-y-6 relative z-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SpatialPanel glow={true} className="border-zinc-900 bg-zinc-950/40 p-8 text-center max-w-md w-full relative overflow-hidden shadow-2xl rounded-2xl flex flex-col items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.015)] relative overflow-hidden group">
                <Layers className="w-5 h-5 text-zinc-400 group-hover:text-violet-400 transition-colors" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-zinc-100 font-outfit">No Telemetry Matrix Detected</h2>
                <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed font-outfit max-w-xs mx-auto">
                  Initialize resume intelligence scanning to map a prioritized skill trajectory based on market demand signals and direct gaps.
                </p>
              </div>
              <Link href="/resume" className="w-full">
                <InteractiveButton variant="primary" className="w-full flex items-center justify-center gap-2">
                  Analyze Resume
                  <ArrowRight className="w-4 h-4 text-zinc-950" />
                </InteractiveButton>
              </Link>
            </SpatialPanel>
          </motion.div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#030303] text-zinc-100 relative overflow-hidden pb-20">
        {/* High-end ambient atmospheric backlights */}
        <AmbientGlow size="lg" color="mixed" className="-top-[240px] left-1/4 opacity-15" />
        <AmbientGlow size="lg" color="cyan" className="-bottom-[200px] -right-[100px] opacity-10" />

        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 px-6 pt-4 pb-2 bg-[#030303]/90 backdrop-blur-md border-b border-zinc-900/60 relative">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <Link href="/dashboard">
                <InteractiveButton variant="secondary" className="px-3.5 py-1.5 flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Dashboard
                </InteractiveButton>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="border border-zinc-900 bg-zinc-950/60 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 select-none self-start sm:self-center">
                <NeuralPulse size="sm" label="Learning Telemetry Stream Active" />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 relative z-10">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-1"
          >
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Interactive Skill Map</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mt-1 font-outfit">Career Growth Roadmap</h1>
          </motion.div>

          {/* Career Trajectory Hero */}
          {heroText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <SpatialPanel glow={true} interactive={false} className="border-zinc-900/80 bg-zinc-950/40 relative overflow-hidden py-6 px-7 shadow-2xl">
                <AmbientGlow size="md" color="indigo" className="-top-20 -right-20 opacity-15" />
                <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                  <div className="space-y-3.5 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-md border bg-zinc-900/80 text-zinc-400 border-zinc-800">
                        Trajectory Vector
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        Derived from parsed resume benchmarks
                      </span>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed max-w-2xl font-outfit">
                      {heroText}
                    </p>
                  </div>
                  <motion.div
                    className="flex gap-3.5 shrink-0 w-full md:w-auto justify-start md:justify-end"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <HeroPill value={criticalCount} label="Critical gaps" color={criticalCount > 0 ? "text-rose-400" : "text-zinc-500"} />
                    <HeroPill value={roadmap.length} label="Nodes mapped" />
                    <HeroPill value={totalWeeks} label="Weeks mapped" suffix="w" color="text-amber-400" />
                  </motion.div>
                </div>
              </SpatialPanel>
            </motion.div>
          )}

          {/* AI Priority Engine Highlight */}
          {topPriority && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <SpatialPanel glow={true} className="border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-xl relative overflow-hidden py-6 px-7 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Primary Growth Node Recommendation</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg font-bold text-zinc-100 font-outfit">{topPriority.name}</h3>
                      <span className={`text-[9px] font-mono tracking-widest font-bold px-2 py-0.5 rounded-md border uppercase ${STAGE_META[topPriority.stage].badgeStyle}`}>
                        {STAGE_META[topPriority.stage].label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl font-outfit">{topPriority.why}</p>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 flex-wrap">
                      <span>Recruiter relevance: <span className="text-emerald-400 font-bold">{topPriority.recruiterRelevance}%</span></span>
                      <span className="select-none text-zinc-700">//</span>
                      <span>Market demand: <span className={`font-bold ${topPriority.marketDemand === "Surging" ? "text-emerald-400" : "text-amber-400"}`}>{topPriority.marketDemand} (+{topPriority.demandPct}%)</span></span>
                      <span className="select-none text-zinc-700">//</span>
                      <span>Est. learning time: <span className="text-zinc-300 font-bold">{topPriority.estimatedWeeks}w</span></span>
                    </div>
                  </div>
                  <div className="shrink-0 border border-zinc-900 rounded-xl px-5 py-4 bg-zinc-950/80 min-w-[200px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] text-center sm:text-left">
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5">hiring impact</p>
                    <p className={`text-base font-bold font-outfit leading-none ${topPriority.hiringImpact === "Very High" ? "text-emerald-400 animate-pulse" : "text-amber-400"}`}>
                      {topPriority.hiringImpact}
                    </p>
                    {topPriority.companies.length > 0 && (
                      <>
                        <div className="border-t border-zinc-900/60 my-2 pt-2" />
                        <p className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">active filters</p>
                        <p className="text-xs text-zinc-400 font-outfit">{topPriority.companies.slice(0, 3).join(", ")}</p>
                      </>
                    )}
                  </div>
                </div>
              </SpatialPanel>
            </motion.div>
          )}

          {/* Market-Driven Trending Skills collapsible card */}
          <SectionCard title="Hiring Demand Signals" icon={<TrendingUp className="w-4.5 h-4.5" />} delay={0}>
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed font-outfit">
              Hiring telemetry signals tracking YoY demand spikes. Green = covered by your current profile. Red = target node gaps.
            </p>
            <motion.div className="space-y-1.5" variants={staggerContainer} initial="hidden" animate="visible">
              {trending.map((item, i) => (
                <motion.div
                  key={item.name}
                  variants={fadeUp}
                  custom={i}
                  className="flex items-center justify-between py-2 px-3 border border-zinc-900/40 bg-zinc-950/20 hover:bg-zinc-900/10 hover:border-zinc-800/80 rounded-xl transition-all duration-300"
                  whileHover={{ x: 2 }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono font-bold ${item.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
                      {item.trend === "up" ? "↑" : "↓"}
                    </span>
                    <span className="text-xs sm:text-sm text-zinc-300 font-outfit">{item.name}</span>
                    {item.inResume ? (
                      <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded border bg-emerald-950/40 text-emerald-400 border-emerald-900/40 uppercase">active</span>
                    ) : (
                      <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded border bg-rose-950/30 text-rose-400 border-rose-900/40 uppercase">gap</span>
                    )}
                  </div>
                  <span className={`text-xs font-mono font-semibold ${item.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
                    {item.pct > 0 ? "+" : ""}{item.pct}% YoY
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </SectionCard>

          {/* Dynamic Learning Path Filters & Grid */}
          <div className="space-y-5">
            {/* Filter controls tabs */}
            <motion.div
              className="flex items-center gap-2 flex-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              {STAGE_FILTERS.map(f => {
                const isActive = activeFilter === f.key;
                return (
                  <motion.button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0"
                  >
                    <InteractiveButton variant={isActive ? "primary" : "secondary"} className="py-2.5 px-4 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                      <span>{f.label}</span>
                      {f.count !== undefined && (
                        <span className={`text-[10px] font-mono rounded-md px-1.5 py-0.2 ${isActive ? "bg-zinc-800 text-zinc-400" : "bg-zinc-950 text-zinc-600"}`}>{f.count}</span>
                      )}
                    </InteractiveButton>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Stage headers + Skill cards */}
            <div className="space-y-6">
              {(["critical", "roi", "differentiator", "advanced", "growth"] as SkillNode["stage"][]).map(stage => {
                const stageNodes = filteredRoadmap.filter(n => n.stage === stage);
                if (stageNodes.length === 0) return null;
                const meta = STAGE_META[stage];
                return (
                  <div key={stage} className="space-y-4">
                    <motion.div
                      className="flex items-center justify-between gap-4 pb-2 border-b border-zinc-900"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <span className={`text-[10px] font-mono tracking-widest font-bold uppercase ${meta.color}`}>{meta.label}</span>
                      <span className="text-[10px] text-zinc-600 font-outfit text-right leading-none uppercase tracking-wider">{meta.description}</span>
                    </motion.div>
                    <div className="grid grid-cols-1 gap-3.5">
                      {stageNodes.map((node, i) => (
                        <SkillCard key={node.name} node={node} index={i} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Impact Insights */}
          <SectionCard title="Hiring ROI Forecasts" icon={<BarChart2 className="w-4.5 h-4.5" />} delay={2} defaultOpen={false}>
            <p className="text-xs text-zinc-500 mb-5 font-outfit">
              Simulated score gains showing how learning actions adjust your overall recruiter relevance indices.
            </p>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={staggerContainer} initial="hidden" animate="visible">
              {roadmap.slice(0, 4).map((node, i) => (
                <motion.div
                  key={node.name}
                  variants={fadeUp}
                  custom={i}
                >
                  <SpatialPanel glow={true} className="border-zinc-900 bg-zinc-950/20 p-4 hover:border-zinc-800 transition-colors shadow-lg h-full flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-zinc-200 font-outfit">{node.name}</span>
                        {node.missingFrom && <span className="text-[9px] font-mono tracking-widest font-bold px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-900/30 uppercase">gap</span>}
                      </div>
                      <AnimatedBar
                        pct={node.recruiterRelevance}
                        color={node.recruiterRelevance >= 85 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-amber-500"}
                        delay={i * 0.08}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-900/60">
                      <span>Demand: <span className={node.marketDemand === "Surging" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{node.marketDemand}</span></span>
                      <span>Target index: <span className="text-zinc-300 font-bold">{node.recruiterRelevance}%</span></span>
                    </div>
                  </SpatialPanel>
                </motion.div>
              ))}
            </motion.div>
          </SectionCard>

          {/* Live adaptation notice spatial alert */}
          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="visible"
          >
            <SpatialPanel glow={true} className="border-zinc-900 bg-zinc-950/40 p-5 flex flex-col sm:flex-row items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] mt-0.5">
                <Activity className="w-4.5 h-4.5 text-zinc-400 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0 font-outfit">
                <p className="text-xs sm:text-sm font-semibold text-zinc-300 leading-snug">System Adaptability Telemetry Notice</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Market demand models indicate Docker and Kubernetes hiring volume has spiked 38–44% YoY, positioning infrastructure automation as a prime engineering separator. System design continues to represent the absolute highest-value telemetry skill. Telemetry streams regenerate instantly on each resume matrix ingestion.
                </p>
              </div>
            </SpatialPanel>
          </motion.div>

        </div>
      </div>
    </AuthGuard>
  );
}

// ── Hero pill (capsule gauges equivalents) ────────────────────────────────────

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
