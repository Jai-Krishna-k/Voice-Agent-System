"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google, no need to unset.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    const supabase = createClient();
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for a confirmation link");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">A</span>
          </div>
          <h1 className="text-xl font-semibold text-white">
            {mode === "login" ? "Sign in to Aryantra" : "Create your account"}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Voice Agent Platform
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 space-y-4 mb-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full py-2.5 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-card-border" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-card-border" />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-card-border rounded-xl p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-xs text-center bg-destructive/10 text-red-300 border border-destructive/20">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg text-xs text-center bg-success/10 text-green-300 border border-success/20">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Sign Up"
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setMessage("");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
