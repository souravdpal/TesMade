"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login, sendOtp } from "@/actions/outh";

export default function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await login(formData.email, formData.password);

      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      // Account exists but email not verified: send a fresh code, then go verify
      if (res.status === 403) {
        const otp = await sendOtp(formData.email, "vemail");
        if (!otp.ok) {
          setError(otp.message ?? "Could not send code");
          return;
        }
        router.push(`/outh/u/email/verify?m=${encodeURIComponent(formData.email)}`);
        return;
      }

      setError(res.err ?? "Something went wrong");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl text-zinc-100">
      <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
      <p className="text-sm text-zinc-400 mb-6">Enter your credentials to access your account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              setError("");
            }}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              setError("");
            }}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-400">
        Don&apos;t have an account?{" "}
        <button
          onClick={onSwitchToRegister}
          type="button"
          className="text-indigo-400 hover:underline font-medium"
        >
          Sign Up
        </button>
      </p>
    </div>
  );
}