"use client";

import React, { useState } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind CSS class utility merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── 1. Spatial Panel ─────────────────────────────────────────────────────────

interface SpatialPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  interactive?: boolean;
  glow?: boolean;
}

export function SpatialPanel({
  children,
  className,
  interactive = false,
  glow = false,
  ...props
}: SpatialPanelProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const hoverAnimation = interactive
    ? {
        y: -4,
        scale: 1.008,
        borderColor: "rgba(255, 255, 255, 0.12)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.08)",
      }
    : {};

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "spatial-glass rounded-2xl p-6 relative overflow-hidden transition-colors duration-300",
        interactive && "cursor-pointer",
        className
      )}
      whileHover={hoverAnimation}
      whileTap={interactive ? { scale: 0.995 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Radial Glow */}
      {glow && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: isHovered ? 0.9 : 0,
            background: `radial-gradient(400px circle at ${coords.x}px ${coords.y}px, rgba(139, 92, 246, 0.07), transparent 80%)`,
          }}
        />
      )}
      {/* Spotlight Border Highlight */}
      {glow && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: isHovered ? 0.8 : 0,
            background: `radial-gradient(150px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.08), transparent 80%)`,
            border: "1px solid transparent",
            maskImage: "linear-gradient(black, black) exclude, linear-gradient(black, black)",
            WebkitMaskImage: "linear-gradient(black, black) exclude, linear-gradient(black, black)",
            maskComposite: "exclude",
            WebkitMaskComposite: "source-out",
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// ── 2. Interactive Button ───────────────────────────────────────────────────

interface InteractiveButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "glow";
}

export function InteractiveButton({
  children,
  className,
  variant = "primary",
  ...props
}: InteractiveButtonProps) {
  return (
    <motion.button
      className={cn(
        "px-4 py-2 text-xs font-semibold rounded-lg font-mono relative overflow-hidden transition-all duration-300 active:scale-95 disabled:opacity-40",
        variant === "primary" && "bg-zinc-100 hover:bg-white text-zinc-950 shadow-[0_4px_12px_rgba(255,255,255,0.1)]",
        variant === "secondary" && "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700",
        variant === "glow" && "bg-zinc-950 text-zinc-200 border border-zinc-800 hover:border-violet-800/40 hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
        className
      )}
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      {...props}
    >
      {variant === "glow" && (
        <span className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      <span className="relative z-10 flex items-center justify-center gap-1.5">{children}</span>
    </motion.button>
  );
}

// ── 3. Ambient Glow Backplate ────────────────────────────────────────────────

interface AmbientGlowProps {
  color?: "indigo" | "violet" | "cyan" | "emerald" | "mixed";
  size?: "sm" | "md" | "lg";
  className?: string;
  opacity?: number;
}

export function AmbientGlow({
  color = "mixed",
  size = "md",
  className,
  opacity = 0.5,
}: AmbientGlowProps) {
  const gradientMap = {
    indigo: "from-indigo-600/30 to-indigo-950/0",
    violet: "from-violet-600/30 to-violet-950/0",
    cyan: "from-cyan-600/25 to-cyan-950/0",
    emerald: "from-emerald-600/20 to-emerald-950/0",
    mixed: "from-violet-600/20 via-indigo-600/15 to-cyan-600/10",
  };

  const sizeMap = {
    sm: "w-48 h-48 blur-[80px]",
    md: "w-80 h-80 blur-[120px]",
    lg: "w-[450px] h-[450px] blur-[150px]",
  };

  return (
    <div
      className={cn(
        "absolute rounded-full pointer-events-none -z-10 mix-blend-screen bg-gradient-to-br",
        gradientMap[color],
        sizeMap[size],
        className
      )}
      style={{ opacity }}
    />
  );
}

// ── 4. Neural Pulse (AI Indicator) ──────────────────────────────────────────

interface NeuralPulseProps {
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

export function NeuralPulse({ size = "md", className, label }: NeuralPulseProps) {
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2.5 h-2.5";
  const containerSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("relative flex items-center justify-center shrink-0", containerSize)}>
        {/* Staggered Outer Rings */}
        <motion.div
          className="absolute inset-0 rounded-full bg-violet-500/25"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{
            repeat: Infinity,
            duration: 2.4,
            ease: "easeOut",
            delay: 0.8,
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-cyan-400/30"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{
            repeat: Infinity,
            duration: 2.4,
            ease: "easeOut",
          }}
        />
        {/* Pulse Heart Core */}
        <span className={cn("rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_10px_rgba(167,139,250,0.5)]", dotSize)} />
      </div>
      {label && (
        <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}
