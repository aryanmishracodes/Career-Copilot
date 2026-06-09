"use client";

// ── OAuth callback handler ─────────────────────────────────────────────────────
// The API redirects here after Google/GitHub OAuth with ?token=<jwt>
// This page reads the token, stores it, and redirects to the dashboard.

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "../../../contexts/AuthContext";

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1`;

function AuthCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      router.push("/login?error=oauth_failed");
      return;
    }

    // Fetch user profile with the token, then log in
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user) {
          login(token, user);
          router.push("/dashboard");
        } else {
          router.push("/login?error=oauth_failed");
        }
      })
      .catch(() => router.push("/login?error=oauth_failed"));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="w-10 h-10 border-2 border-zinc-700 border-t-zinc-300 rounded-full mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-zinc-500 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-zinc-300 rounded-full mx-auto mb-4 animate-spin" />
            <p className="text-zinc-500 text-sm">Completing sign-in…</p>
          </div>
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  );
}
