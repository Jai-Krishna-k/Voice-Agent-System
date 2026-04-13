"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock } from "lucide-react";

const inputCls =
  "w-full bg-[#0C0C0C] border border-[#1E1E1E] text-stone-200 text-sm px-3 py-2.5 placeholder-stone-700 focus:outline-none focus:border-amber-500/60 transition-colors";

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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/dashboard";
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage("Check your email for a confirmation link");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <span className="text-amber-500 text-xl font-bold leading-none">■</span>
          <span className="text-[11px] font-semibold tracking-widest text-stone-300 uppercase">
            Aryantra
          </span>
        </div>

        {/* Card */}
        <div className="border border-[#181818] p-8 space-y-5">
          <div className="mb-2">
            <h1 className="text-[18px] font-semibold text-stone-100 tracking-tight">
              {mode === "login" ? "Sign in" : "Create account"}
            </h1>
            <p className="text-xs text-stone-600 mt-1">Voice Agent Platform</p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full py-2.5 border border-[#282828] hover:border-[#383838] text-stone-300 text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2.5"
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
            <div className="flex-1 h-px bg-[#181818]" />
            <span className="text-[10px] text-stone-700 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#181818]" />
          </div>

          {/* Email / Password */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className={inputCls}
              />
            </div>

            {error && (
              <div className="p-3 text-xs text-center border border-red-500/20 text-red-400 bg-red-500/5">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 text-xs text-center border border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[13px] px-5 py-2.5 w-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Sign In" : "Sign Up"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
                className="text-xs text-stone-600 hover:text-stone-300 transition-colors"
              >
                {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
