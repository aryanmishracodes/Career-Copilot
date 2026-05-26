"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, BarChart2, Map, MessageSquare, LogOut, Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

const NAV = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { href: "/resume",     icon: FileText,         label: "Resume Intelligence" },
  { href: "/market",     icon: BarChart2,         label: "Market Analysis" },
  { href: "/roadmap",    icon: Map,               label: "Learning Roadmap" },
  { href: "/interview",  icon: MessageSquare,     label: "Mock Interviews" },
  { href: "/settings",   icon: Settings,          label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <div className="h-screen w-60 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-0.5">Career Copilot</p>
        <p className="text-sm font-bold text-zinc-100">Intelligence Platform</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <motion.div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative
                  ${active
                    ? "text-zinc-100 bg-zinc-800"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                  }`}
                whileHover={{ x: 1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-zinc-800 rounded-lg"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4 shrink-0 relative z-10" />
                <span className="font-medium relative z-10">{label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-zinc-800 space-y-1">
        {user && (
          <div className="px-3 py-2 mb-1 rounded-lg">
            <p className="text-xs font-semibold text-zinc-300 truncate">{user.name}</p>
            <p className="text-xs text-zinc-600 truncate">{user.email}</p>
          </div>
        )}
        <motion.button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
          whileHover={{ x: 1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="font-medium">Sign out</span>
        </motion.button>
      </div>
    </div>
  );
}
