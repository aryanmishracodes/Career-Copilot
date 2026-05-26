// ── Shared motion config — mirrors Resume Intelligence exactly ─────────────────
// Framer Motion v12 requires ease as a named string or EasingFunction, not a
// raw number[]. We use "easeOut" for the cubic-bezier approximation.

import type { Variants } from "framer-motion";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const springConfig = {
  type: "spring" as const,
  stiffness: 260,
  damping: 28,
};

/** Staggered fadeUp with per-item delay via custom prop */
export function makeFadeUp(delaySeconds: number): Variants {
  return {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: delaySeconds, duration: 0.5, ease: "easeOut" },
    },
  };
}
