"use client";

// ── Shared primitive UI atoms used across all interview components ─────────────

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { fadeUp, staggerContainer, springConfig } from "./motion";

// ── Animated count-up number ──────────────────────────────────────────────────

export function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => { if (inView) motionVal.set(value); }, [inView, value, motionVal]);
  return <motion.span ref={ref}>{display}</motion.span>;
}

// ── Scroll-triggered animated bar ────────────────────────────────────────────

export function AnimatedBar({
  pct, color, delay = 0,
}: { pct: number; color: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <motion.div
        className={`h-1.5 rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={inView ? { width: `${pct}%` } : { width: 0 }}
        transition={{ duration: 0.9, delay, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Score color helpers ───────────────────────────────────────────────────────

export function scoreTextColor(n: number) {
  return n >= 75 ? "text-emerald-400" : n >= 55 ? "text-amber-400" : "text-red-400";
}

export function scoreBarColor(n: number) {
  return n >= 75 ? "bg-emerald-500" : n >= 55 ? "bg-amber-500" : "bg-red-500";
}

// ── Collapsible section card (identical to Resume Intelligence) ───────────────

export function SectionCard({
  title, icon, children, defaultOpen = true, delayIndex = 0,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  delayIndex?: number;
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
      transition={{ delay: delayIndex * 0.1 }}
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
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-950 px-6 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Stat pill (hero metrics) ──────────────────────────────────────────────────

export function StatPill({
  value, label, color = "text-zinc-100", suffix = "",
}: {
  value: number; label: string; color?: string; suffix?: string;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center border border-zinc-800 rounded-lg px-4 py-3 bg-zinc-950"
      whileHover={{
        borderColor: "rgb(63 63 70)",
        backgroundColor: "rgb(24 24 27)",
        transition: { duration: 0.2 },
      }}
    >
      <span className={`text-xl font-bold font-mono ${color}`}>
        <AnimatedNumber value={value} suffix={suffix} />
      </span>
      <span className="text-xs text-zinc-500 mt-0.5 text-center whitespace-nowrap">{label}</span>
    </motion.div>
  );
}
