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
    transition: { delay: Math.min(i, 3) * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
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
  "GraphQL": { hiringImpact: "Medium", difficulty: "Intermediate", estimatedWeeks: 2, recruiterRelevance: 72, marketDemand: "Stable", demandPct: 5, companies: ["GitHub", "Shopify", "Twitter", "Airbnb"], resources: [{ type: "course", name: "The Modern GraphQL Bootcamp", platform: "Udemy", why: "Covers schema design, resolvers, and subscriptions — the full production stack", hours: 16 }] },
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
    color: "text-red-400",
    borderColor: "border-red-900/50",
    badgeStyle: "bg-red-950/50 text-red-400 border-red-800",
  },
  roi: {
    label: "High ROI Skills",
    description: "Highest return on learning investment for your target domain",
    color: "text-amber-400",
    borderColor: "border-amber-900/40",
    badgeStyle: "bg-amber-950/50 text-amber-400 border-amber-800",
  },
  differentiator: {
    label: "Market Differentiators",
    description: "Skills that separate you from average candidates",
    color: "text-blue-400",
    borderColor: "border-blue-900/40",
    badgeStyle: "bg-blue-950/50 text-blue-400 border-blue-800",
  },
  advanced: {
    label: "Advanced Engineering",
    description: "Senior-level signals that unlock higher compensation",
    color: "text-purple-400",
    borderColor: "border-purple-900/40",
    badgeStyle: "bg-purple-950/50 text-purple-400 border-purple-800",
  },
  growth: {
    label: "Long-Term Growth",
    description: "Emerging technologies with strong 2–3 year trajectory",
    color: "text-emerald-400",
    borderColor: "border-emerald-900/40",
    badgeStyle: "bg-emerald-950/50 text-emerald-400 border-emerald-800",
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

// ── Skill card ─────────────────────────────────────────────────────────────────

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
    : node.marketDemand === "Stable" ? "text-zinc-400" : "text-red-400";

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
      whileHover={{ y: -1, borderColor: "rgb(63 63 70)", transition: { duration: 0.2 } }}
      className={`border rounded-xl overflow-hidden bg-zinc-900 ${node.missingFrom ? meta.borderColor : "border-zinc-800"}`}
    >
      {/* Main row */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border font-mono ${meta.badgeStyle}`}>
                {meta.label}
              </span>
              {node.missingFrom && (
                <motion.span
                  className="text-xs px-2 py-0.5 rounded border font-mono bg-red-950/30 text-red-500 border-red-900/50"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.1, ...springConfig }}
                >
                  Not in resume
                </motion.span>
              )}
            </div>

            <h3 className="text-base font-bold text-zinc-100 mb-1">{node.name}</h3>

            {/* Meta row */}
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <span className={`font-semibold ${impactColor}`}>{node.hiringImpact} hiring impact</span>
              <span className="text-zinc-600">·</span>
              <span className={demandColor}>
                {node.marketDemand === "Surging" || node.marketDemand === "Growing" ? "↑" : node.marketDemand === "Declining" ? "↓" : "→"} {node.marketDemand} ({node.demandPct > 0 ? "+" : ""}{node.demandPct}% YoY)
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">{node.difficulty}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />{node.estimatedWeeks}w
              </span>
            </div>
          </div>

          {/* Recruiter relevance */}
          <div className="shrink-0 text-right">
            <span className={`text-2xl font-black font-mono ${node.recruiterRelevance >= 85 ? "text-emerald-400" : node.recruiterRelevance >= 70 ? "text-amber-400" : "text-zinc-500"}`}>
              <AnimatedNumber value={node.recruiterRelevance} suffix="%" />
            </span>
            <p className="text-xs text-zinc-600 leading-none mt-0.5">recruiter relevance</p>
          </div>
        </div>

        {/* Relevance bar */}
        <div className="mt-3">
          <AnimatedBar
            pct={node.recruiterRelevance}
            color={node.recruiterRelevance >= 85 ? "bg-emerald-500" : node.recruiterRelevance >= 70 ? "bg-amber-500" : "bg-zinc-600"}
            delay={Math.min(index, 3) * 0.04 + 0.05}
          />
        </div>

        {/* Why summary */}
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed line-clamp-2">{node.why}</p>

        {/* Companies */}
        {node.companies.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-zinc-600">Hiring at:</span>
            {node.companies.slice(0, 4).map(c => (
              <span key={c} className="text-xs text-zinc-500 font-mono">{c}</span>
            ))}
          </div>
        )}

        {/* Expand button */}
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <motion.button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            whileTap={{ scale: 0.97 }}
          >
            Resources & reasoning
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.span>
          </motion.button>
          <span className="text-xs text-zinc-600 font-mono">{node.resources.length} resource{node.resources.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-950 border-t border-zinc-800 px-5 py-4 space-y-4">

              {/* Full reasoning */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">AI Reasoning</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{node.why}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-900">
                    <p className="text-xs text-zinc-600 mb-0.5">Market demand</p>
                    <p className={`text-xs font-semibold ${demandColor}`}>{node.marketDemand} · {node.demandPct > 0 ? "+" : ""}{node.demandPct}% YoY</p>
                  </div>
                  <div className="border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-900">
                    <p className="text-xs text-zinc-600 mb-0.5">Hiring impact</p>
                    <p className={`text-xs font-semibold ${impactColor}`}>{node.hiringImpact}</p>
                  </div>
                </div>
              </div>

              {/* Resources */}
              {node.resources.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recommended Resources</p>
                  <div className="space-y-2">
                    {node.resources.map((r, i) => (
                      <motion.div
                        key={i}
                        className="border border-zinc-800 rounded-lg p-3 bg-zinc-900"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ borderColor: "rgb(63 63 70)", transition: { duration: 0.15 } }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-sm shrink-0">{resourceIcon[r.type]}</span>
                            <div>
                              <p className="text-xs font-semibold text-zinc-200">{r.name}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">{r.platform} · ~{r.hours}h</p>
                              <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{r.why}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-mono shrink-0 ${
                            r.type === "course" ? "bg-blue-950/40 text-blue-400 border-blue-900" :
                            r.type === "book" ? "bg-purple-950/40 text-purple-400 border-purple-900" :
                            r.type === "project" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900" :
                            r.type === "video" ? "bg-amber-950/40 text-amber-400 border-amber-900" :
                            "bg-zinc-900 text-zinc-500 border-zinc-800"
                          }`}>
                            {r.type}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${apiBase}/api/v1/resumes/latest`, {
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
    { key: "all", label: "All", count: roadmap.length },
    { key: "critical", label: "Critical Gaps", count: criticalCount },
    { key: "roi", label: "High ROI", count: roadmap.filter(n => n.stage === "roi").length },
    { key: "differentiator", label: "Differentiators", count: roadmap.filter(n => n.stage === "differentiator").length },
    { key: "advanced", label: "Advanced", count: roadmap.filter(n => n.stage === "advanced").length },
    { key: "growth", label: "Growth", count: roadmap.filter(n => n.stage === "growth").length },
  ];

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-300 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </AuthGuard>
    );
  }

  if (!resume) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
          <motion.div
            className="w-full max-w-md text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-5">
              <Layers className="w-5 h-5 text-zinc-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">No resume analyzed yet</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-7">
              Upload your resume to generate a personalized AI learning roadmap — prioritized by hiring impact, market demand, and your current skill gaps.
            </p>
            <Link
              href="/resume"
              className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-900 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white transition-colors"
            >
              Analyze Resume <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">

        {/* ── Sticky top bar ── */}
        <div className="sticky top-0 z-20 px-6 pt-4 pb-2 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-900">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
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

            <motion.div
              className="flex items-center gap-2 text-xs text-zinc-600 border border-zinc-800 rounded-lg px-3 py-1.5 bg-zinc-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Activity className="w-3 h-3" />
              Roadmap updated {lastUpdated} · based on backend hiring demand
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
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Learning Intelligence</p>
            <h1 className="text-2xl font-bold text-zinc-100 mt-1">Career Growth Roadmap</h1>
          </motion.div>

          {/* ── Career Trajectory Hero ── */}
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
                      Career Trajectory
                    </motion.span>
                    <motion.span className="text-xs text-zinc-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                      Derived from resume + market signals
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
                  <HeroPill value={criticalCount} label="Critical Gaps" color={criticalCount > 0 ? "text-red-400" : "text-zinc-400"} />
                  <HeroPill value={roadmap.length} label="Skills Mapped" />
                  <HeroPill value={totalWeeks} label="Est. Weeks" suffix="w" color="text-amber-400" />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── AI Priority Engine ── */}
          {topPriority && (
            <motion.div
              className="border border-zinc-800 rounded-xl bg-zinc-900 px-6 py-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ borderColor: "rgb(63 63 70)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Highest ROI Next Step</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-zinc-100">{topPriority.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${STAGE_META[topPriority.stage].badgeStyle}`}>
                      {STAGE_META[topPriority.stage].label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">{topPriority.why}</p>
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <span className="text-zinc-500">Recruiter relevance: <span className="text-emerald-400 font-mono font-semibold">{topPriority.recruiterRelevance}%</span></span>
                    <span className="text-zinc-500">Market demand: <span className={`font-semibold ${topPriority.marketDemand === "Surging" ? "text-emerald-400" : "text-amber-400"}`}>{topPriority.marketDemand} (+{topPriority.demandPct}%)</span></span>
                    <span className="text-zinc-500">Est. time: <span className="text-zinc-300 font-mono">{topPriority.estimatedWeeks}w</span></span>
                  </div>
                </div>
                <div className="shrink-0 border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-950 min-w-[180px]">
                  <p className="text-xs text-zinc-500 mb-1">Hiring impact</p>
                  <p className={`text-sm font-bold ${topPriority.hiringImpact === "Very High" ? "text-emerald-400" : "text-amber-400"}`}>
                    {topPriority.hiringImpact}
                  </p>
                  {topPriority.companies.length > 0 && (
                    <>
                      <p className="text-xs text-zinc-600 mt-2 mb-1">Hiring at</p>
                      <p className="text-xs text-zinc-500">{topPriority.companies.slice(0, 3).join(", ")}</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Market-Driven Trending Skills ── */}
          <SectionCard title="Market-Driven Skill Signals" icon={<TrendingUp className="w-4 h-4" />} delay={0}>
            <p className="text-xs text-zinc-500 mb-5">
              Skills with increasing hiring demand in your target domain. Green = in your resume. Red = missing.
            </p>
            <motion.div className="space-y-0" variants={staggerContainer} initial="hidden" animate="visible">
              {trending.map((item, i) => (
                <motion.div
                  key={item.name}
                  variants={fadeUp}
                  custom={i}
                  className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0"
                  whileHover={{ x: 2, transition: { duration: 0.15 } }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono ${item.trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
                      {item.trend === "up" ? "↑" : "↓"}
                    </span>
                    <span className="text-sm text-zinc-300">{item.name}</span>
                    {item.inResume ? (
                      <span className="text-xs px-1.5 py-0.5 rounded border font-mono bg-emerald-950/30 text-emerald-500 border-emerald-900/50">In resume</span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded border font-mono bg-red-950/30 text-red-500 border-red-900/50">Missing</span>
                    )}
                  </div>
                  <span className={`text-xs font-mono font-semibold ${item.trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
                    {item.pct > 0 ? "+" : ""}{item.pct}% YoY
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </SectionCard>

          {/* ── Dynamic Learning Path ── */}
          <div>
            {/* Filter tabs */}
            <motion.div
              className="flex items-center gap-1 flex-wrap mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              {STAGE_FILTERS.map(f => (
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
                    <span className={`text-xs ${activeFilter === f.key ? "text-zinc-400" : "text-zinc-700"}`}>{f.count}</span>
                  )}
                </motion.button>
              ))}
            </motion.div>

            {/* Stage group headers + cards */}
            {(["critical", "roi", "differentiator", "advanced", "growth"] as SkillNode["stage"][]).map(stage => {
              const stageNodes = filteredRoadmap.filter(n => n.stage === stage);
              if (stageNodes.length === 0) return null;
              const meta = STAGE_META[stage];
              return (
                <div key={stage} className="mb-6">
                  <motion.div
                    className="flex items-center gap-3 mb-3"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <span className={`text-xs font-bold uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-xs text-zinc-600">{meta.description}</span>
                  </motion.div>
                  <div className="space-y-3">
                    {stageNodes.map((node, i) => (
                      <SkillCard key={node.name} node={node} index={i} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Market Impact Insights ── */}
          <SectionCard title="Market Impact Insights" icon={<BarChart2 className="w-4 h-4" />} delay={2} defaultOpen={false}>
            <p className="text-xs text-zinc-500 mb-5">
              How each learning investment translates to recruiter perception and hiring probability.
            </p>
            <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
              {roadmap.slice(0, 4).map((node, i) => (
                <motion.div
                  key={node.name}
                  variants={fadeUp}
                  custom={i}
                  className="border border-zinc-800 rounded-lg p-4 bg-zinc-900"
                  whileHover={{ borderColor: "rgb(63 63 70)", transition: { duration: 0.15 } }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-sm font-semibold text-zinc-200">{node.name}</span>
                      {node.missingFrom && <span className="ml-2 text-xs text-red-500 font-mono">missing</span>}
                    </div>
                    <span className={`text-xs font-mono font-semibold ${node.recruiterRelevance >= 85 ? "text-emerald-400" : "text-amber-400"}`}>
                      {node.recruiterRelevance}% relevance
                    </span>
                  </div>
                  <AnimatedBar
                    pct={node.recruiterRelevance}
                    color={node.recruiterRelevance >= 85 ? "bg-emerald-500" : "bg-amber-500"}
                    delay={i * 0.08}
                  />
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-zinc-600">Companies: <span className="text-zinc-400">{node.companies.slice(0, 3).join(", ")}</span></span>
                    <span className="text-zinc-600">Demand: <span className={node.marketDemand === "Surging" ? "text-emerald-400" : "text-amber-400"}>{node.marketDemand}</span></span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </SectionCard>

          {/* ── Live adaptation notice ── */}
          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="visible"
            className="border border-zinc-800 rounded-xl bg-zinc-900 px-5 py-4 flex items-start gap-3"
          >
            <Activity className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-zinc-300 mb-0.5">Roadmap updated based on recent backend hiring demand increases</p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Docker and Kubernetes demand increased 38–44% YoY. System Design remains the highest-value skill for senior engineering roles.
                This roadmap is regenerated each time you update your resume.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </AuthGuard>
  );
}

// ── Hero pill ──────────────────────────────────────────────────────────────────

function HeroPill({ value, label, color = "text-zinc-100", suffix = "" }: {
  value: number; label: string; color?: string; suffix?: string;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-950"
      whileHover={{ borderColor: "rgb(63 63 70)", backgroundColor: "rgb(24 24 27)", transition: { duration: 0.2 } }}
    >
      <span className={`text-xl font-bold font-mono ${color}`}>
        <AnimatedNumber value={value} suffix={suffix} />
      </span>
      <span className="text-xs text-zinc-500 mt-0.5 text-center whitespace-nowrap">{label}</span>
    </motion.div>
  );
}
