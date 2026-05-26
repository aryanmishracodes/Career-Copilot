"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ArrowLeft, User, Shield, FileText, AlertTriangle, Brain,
  CheckCircle, XCircle, Eye, EyeOff, ChevronUp, ChevronDown,
  RefreshCw, Trash2, ExternalLink, Star, TrendingUp, Zap,
  Calendar, Award, Activity,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const API = "http://localhost:4000/api/v1";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ResumeRecord {
  id: string;
  uploaded_at: string;
  is_active: boolean;
  parsed_json: {
    name?: string;
    ats_score?: { total_score: number; grade: string };
    skills?: { name: string }[];
  } | null;
}

interface Stats {
  totalInterviews: number;
  avgInterviewScore: number;
  bestInterviewScore: number;
  totalResumes: number;
  activeResume: ResumeRecord | null;
}

// ── Animation variants (exact match to rest of app) ───────────────────────────

const fadeUp: any = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: any = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const springConfig = { type: "spring" as const, stiffness: 260, damping: 28 };

// ── Primitives ─────────────────────────────────────────────────────────────────

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
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ delay: delay * 0.1 }}
      whileHover={{ y: -1, transition: { duration: 0.2 } }}
      className="border border-zinc-800 rounded-xl"
    >
      <motion.button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900 hover:bg-zinc-800/80 transition-colors"
        style={{ borderRadius: open ? "0.75rem 0.75rem 0 0" : "0.75rem" }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-zinc-400">{icon}</span>
          <span className="text-sm font-semibold text-zinc-100 tracking-wide uppercase">{title}</span>
        </div>
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.25 }}>
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
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden rounded-b-xl"
          >
            <div className="bg-zinc-950 px-6 py-5 rounded-b-xl">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, disabled, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      />
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

// ── Inline feedback banner (replaces fixed toast) ─────────────────────────────
// Uses relative positioning inside the section — never floats off-screen

function InlineFeedback({ message, type, onDismiss }: {
  message: string; type: "success" | "error"; onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -6, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-xs font-medium overflow-hidden ${
        type === "success"
          ? "bg-emerald-950/40 border-emerald-900/60 text-emerald-400"
          : "bg-red-950/40 border-red-900/60 text-red-400"
      }`}
    >
      <div className="flex items-center gap-2">
        {type === "success"
          ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          : <XCircle className="w-3.5 h-3.5 shrink-0" />}
        {message}
      </div>
      <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0">
        <XCircle className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// Keep Toast as an alias for backwards compat but point to InlineFeedback
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return <InlineFeedback message={message} type={type} onDismiss={() => {}} />;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={`bg-zinc-800 rounded-lg ${className}`}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Section 1: Profile ────────────────────────────────────────────────────────

function ProfileSection({ token, user, onUpdate }: {
  token: string; user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onUpdate: (u: Partial<typeof user>) => void;
}) {
  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!name.trim()) return showToast("Name cannot be empty", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate({ name: data.name });
        showToast("Profile updated", "success");
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const initials = (user.name || user.email)
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <div className="flex items-start gap-5 mb-6">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-zinc-300">{initials}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-200">{user.name || "—"}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            {user.email_verified ? (
              <span className="text-xs px-2 py-0.5 rounded border font-mono bg-emerald-950/40 text-emerald-400 border-emerald-900">
                Email verified
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded border font-mono bg-amber-950/40 text-amber-400 border-amber-900">
                Email unverified
              </span>
            )}
            {user.oauth_provider && (
              <span className="text-xs px-2 py-0.5 rounded border font-mono bg-zinc-800 text-zinc-400 border-zinc-700 capitalize">
                {user.oauth_provider}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Full Name" value={name} onChange={setName} placeholder="Your full name" />
        <Field label="Email" value={user.email} onChange={() => {}} disabled hint="Email cannot be changed here" />

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-600">
            Member since {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
          </p>
          <motion.button
            onClick={handleSave}
            disabled={saving || name === user.name}
            className="flex items-center gap-2 bg-zinc-100 text-zinc-900 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springConfig}
          >
            {saving ? (
              <motion.div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            ) : "Save Changes"}
          </motion.button>
        </div>

        {/* Inline feedback — appears right below the save button */}
        <AnimatePresence>
          {toast && (
            <InlineFeedback
              message={toast.msg}
              type={toast.type}
              onDismiss={() => setToast(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ── Section 2: Security ───────────────────────────────────────────────────────

function SecuritySection({ token, user }: {
  token: string; user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChangePassword = async () => {
    if (newPw.length < 8) return showToast("New password must be at least 8 characters", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPw(""); setNewPw("");
        showToast("Password updated", "success");
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  // OAuth-only: has an OAuth provider and no password set
  const isOAuthOnly = !!user.oauth_provider;

  return (
    <>
      {/* Email verification status */}
      <div className="border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-900 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Email Verification</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
          {user.email_verified ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <CheckCircle className="w-3.5 h-3.5" /> Verified
            </span>
          ) : (
            <button
              onClick={async () => {
                const res = await fetch(`${API}/auth/resend-verification`, {
                  method: "POST", headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                  showToast("Verification email sent — check your inbox", "success");
                } else {
                  const d = await res.json();
                  showToast(d.error || "Failed to send email", "error");
                }
              }}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Resend verification →
            </button>
          )}
        </div>
      </div>

      {/* Inline feedback for verification / password actions */}
      <AnimatePresence>
        {toast && (
          <div className="mb-4">
            <InlineFeedback message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />
          </div>
        )}
      </AnimatePresence>

      {/* Connected providers */}
      <div className="border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-900 mb-5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Connected Accounts</p>
        <div className="space-y-2">
          {["google", "github"].map((provider) => {
            const connected = user.oauth_provider === provider;
            return (
              <div key={provider} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300 capitalize">{provider}</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  connected
                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-900"
                    : "bg-zinc-900 text-zinc-600 border-zinc-800"
                }`}>
                  {connected ? "Connected" : "Not connected"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Change password */}
      {!isOAuthOnly && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Change Password</p>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors" tabIndex={-1}>
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="Min. 8 characters" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors" tabIndex={-1}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <motion.button
            onClick={handleChangePassword}
            disabled={saving || !currentPw || !newPw}
            className="flex items-center gap-2 bg-zinc-100 text-zinc-900 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springConfig}
          >
            {saving ? (
              <motion.div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            ) : "Update Password"}
          </motion.button>
        </div>
      )}

      {isOAuthOnly && (
        <p className="text-xs text-zinc-600">
          You signed in with {user.oauth_provider}. Password management is handled by your OAuth provider.
        </p>
      )}
    </>
  );
}

// ── Section 3: Resume Management ─────────────────────────────────────────────

function ResumeSection({ token }: { token: string }) {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${API}/auth/me/resumes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then(setResumes)
      .catch(() => setResumes([]))
      .finally(() => setLoading(false));
  }, [token]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const scoreColor = (s: number) => s >= 75 ? "text-emerald-400" : s >= 55 ? "text-amber-400" : "text-red-400";
  const scoreBar = (s: number) => s >= 75 ? "bg-emerald-500" : s >= 55 ? "bg-amber-500" : "bg-red-500";

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-500 mb-3">No resumes uploaded yet</p>
        <Link href="/resume" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          Upload your first resume →
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-zinc-500 mb-4">
        {resumes.length} resume version{resumes.length !== 1 ? "s" : ""} · Active version shown first
      </p>
      <motion.div className="space-y-3" variants={stagger} initial="hidden" animate="visible">
        {resumes.map((r, i) => {
          const ats = r.parsed_json?.ats_score?.total_score ?? 0;
          const skillCount = r.parsed_json?.skills?.length ?? 0;
          const name = r.parsed_json?.name || "Resume";

          return (
            <motion.div
              key={r.id}
              variants={fadeUp}
              className={`border rounded-xl px-4 py-4 transition-colors ${
                r.is_active
                  ? "border-zinc-600 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
              whileHover={{ borderColor: "rgb(63 63 70)", transition: { duration: 0.2 } }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-200">{name}</span>
                    {r.is_active && (
                      <span className="text-xs px-1.5 py-0.5 rounded border font-mono bg-emerald-950/40 text-emerald-400 border-emerald-900">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(r.uploaded_at)}
                    </span>
                    {ats > 0 && (
                      <span className={`font-mono font-semibold ${scoreColor(ats)}`}>
                        ATS {ats}/100
                      </span>
                    )}
                    {skillCount > 0 && (
                      <span>{skillCount} skills</span>
                    )}
                  </div>
                  {ats > 0 && (
                    <div className="mt-2 w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                      <motion.div
                        className={`h-1 rounded-full ${scoreBar(ats)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${ats}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href="/resume">
                    <motion.div
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800 border border-transparent hover:border-zinc-700 flex items-center gap-1"
                      whileTap={{ scale: 0.97 }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <Link href="/resume" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          Upload new resume version →
        </Link>
      </div>

      <AnimatePresence>{toast && <Toast message={toast.msg} type={toast.type} />}</AnimatePresence>
    </>
  );
}

// ── Section 4: Career Memory ──────────────────────────────────────────────────

function CareerMemorySection({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/auth/me/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  const memoryItems = [
    {
      icon: <Activity className="w-4 h-4" />,
      label: "Interviews Completed",
      value: stats?.totalInterviews ?? 0,
      color: "text-blue-400",
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: "Avg Interview Score",
      value: stats?.avgInterviewScore ? `${stats.avgInterviewScore}%` : "—",
      color: stats?.avgInterviewScore && stats.avgInterviewScore >= 70 ? "text-emerald-400" : "text-amber-400",
    },
    {
      icon: <Award className="w-4 h-4" />,
      label: "Best Interview Score",
      value: stats?.bestInterviewScore ? `${stats.bestInterviewScore}%` : "—",
      color: "text-purple-400",
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: "Resume Versions",
      value: stats?.totalResumes ?? 0,
      color: "text-zinc-400",
    },
    {
      icon: <Zap className="w-4 h-4" />,
      label: "Active ATS Score",
      value: stats?.activeResume?.parsed_json?.ats_score?.total_score
        ? `${stats.activeResume.parsed_json.ats_score.total_score}/100`
        : "—",
      color: "text-amber-400",
    },
    {
      icon: <Star className="w-4 h-4" />,
      label: "Skills Detected",
      value: stats?.activeResume?.parsed_json?.skills?.length ?? "—",
      color: "text-emerald-400",
    },
  ];

  return (
    <>
      <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
        Persistent career intelligence derived from your resume analysis and interview history.
        This data powers your personalized recommendations across the platform.
      </p>
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {memoryItems.map((item, i) => (
          <motion.div
            key={item.label}
            variants={fadeUp}
            className="border border-zinc-800 rounded-xl bg-zinc-900 px-4 py-4"
            whileHover={{ borderColor: "rgb(63 63 70)", y: -1, transition: { duration: 0.2 } }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`${item.color}`}>{item.icon}</span>
            </div>
            <p className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</p>
            <p className="text-xs text-zinc-600 mt-0.5 leading-tight">{item.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {stats?.totalInterviews === 0 && stats?.totalResumes === 0 && (
        <div className="mt-5 border border-zinc-800 rounded-lg px-4 py-4 bg-zinc-900">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Your career memory is empty. Upload a resume and complete a mock interview to start building your intelligence profile.
          </p>
        </div>
      )}
    </>
  );
}

// ── Section 5: Danger Zone ────────────────────────────────────────────────────

function DangerZoneSection({ token, onDeleted }: { token: string; onDeleted: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        onDeleted();
      } else {
        setError(data.error || "Deletion failed");
        setDeleting(false);
      }
    } catch {
      setError("Network error");
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="border border-red-900/40 rounded-xl bg-red-950/10 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-400 mb-1">Delete Account Permanently</p>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
              Permanently removes your account, all resumes, interview history, analytics, and career data.
              This action cannot be undone.
            </p>
          </div>
          <motion.button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-xs text-red-400 border border-red-900/50 hover:bg-red-950/30 px-4 py-2 rounded-lg transition-colors shrink-0"
            whileTap={{ scale: 0.97 }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Account
          </motion.button>
        </div>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
              onClick={() => !deleting && setShowModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="relative w-full max-w-md border border-red-900/50 bg-zinc-950 rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={springConfig}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-900 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Delete your account?</h3>
                  <p className="text-xs text-zinc-500">This is permanent and cannot be undone</p>
                </div>
              </div>

              <div className="border border-red-900/30 bg-red-950/10 rounded-lg px-4 py-3 mb-5">
                <p className="text-xs text-red-400/80 leading-relaxed">
                  The following will be permanently deleted: your profile, all resume versions,
                  interview history, analytics, and career intelligence data.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Confirm with your password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-800 transition-colors"
                      placeholder="Enter your password"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors" tabIndex={-1}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 shrink-0"
                  />
                  <span className="text-xs text-zinc-400 leading-relaxed">
                    I understand this will permanently delete my account and all associated data
                  </span>
                </label>

                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />{error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setShowModal(false); setPassword(""); setConfirmed(false); setError(""); }}
                    disabled={deleting}
                    className="flex-1 text-sm text-zinc-400 border border-zinc-800 hover:border-zinc-600 py-2.5 rounded-lg transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleDelete}
                    disabled={deleting || !confirmed || !password}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 py-2.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    whileTap={{ scale: 0.98 }}
                  >
                    {deleting ? (
                      <motion.div className="w-4 h-4 border-2 border-red-300 border-t-white rounded-full"
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    ) : (
                      <><Trash2 className="w-4 h-4" /> Delete Account</>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, token, logout, updateUser, refreshUser } = useAuth();

  // Always refresh user data on mount so oauth_provider and email_verified are current
  useEffect(() => {
    refreshUser();
  }, []);

  if (!user || !token) return null;

  const handleAccountDeleted = () => {
    logout();
  };

  return (
    <div className="w-full overflow-x-hidden bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Back button + header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >

          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Account</p>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">Settings</h1>
        </motion.div>

        {/* Section 1 — Profile */}
        <SectionCard title="Profile" icon={<User className="w-4 h-4" />} delay={1}>
          <ProfileSection token={token} user={user} onUpdate={updateUser} />
        </SectionCard>

        {/* Section 2 — Security */}
        <SectionCard title="Account Security" icon={<Shield className="w-4 h-4" />} delay={2}>
          <SecuritySection token={token} user={user} />
        </SectionCard>

        {/* Section 3 — Resume Management */}
        <SectionCard title="Resume Versions" icon={<FileText className="w-4 h-4" />} delay={3}>
          <ResumeSection token={token} />
        </SectionCard>

        {/* Section 4 — Career Memory */}
        <SectionCard title="Career Memory" icon={<Brain className="w-4 h-4" />} delay={4}>
          <CareerMemorySection token={token} />
        </SectionCard>

        {/* Section 5 — Danger Zone */}
        <SectionCard
          title="Danger Zone"
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          defaultOpen={false}
          delay={5}
        >
          <DangerZoneSection token={token} onDeleted={handleAccountDeleted} />
        </SectionCard>

      </div>
    </div>
  );
}
