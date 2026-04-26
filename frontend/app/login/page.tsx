"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      // /api/auth/login returns the OAuth2 standard shape: { access_token, token_type }
      const token = res.data?.access_token;
      if (token) {
        localStorage.setItem("projectiq_token", token);
        router.push("/dashboard");
      } else {
        setError("Login failed: no token returned");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Sign in to ProjectIQ</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Enter your credentials to continue.</p>
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
