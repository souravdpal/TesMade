"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp } from "@/actions/outh";

const LENGTH = 4; // must match backend code length
const COOLDOWN = 60;
const PURPOSE = "vemail";

type ActionRes = { ok: boolean; status?: number; err?: string; message?: string };

function OtpForm() {
  const router = useRouter();
  const email = useSearchParams().get("m") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [locked, setLocked] = useState(false); // backend returned 429
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const firstSendDone = useRef(false);

  // resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // send the first code when the page opens
  useEffect(() => {
    if (!email || firstSendDone.current) return;
    firstSendDone.current = true; // stops the dev-mode double send (React Strict Mode)

    (async () => {
      try {
        const res: ActionRes = await sendOtp(email, PURPOSE);
        if (res.ok) {
          setCooldown(COOLDOWN);
          setInfo("Code sent. Check your inbox.");
        } else {
          if (res.status === 429) setLocked(true);
          setError(res.message ?? "Could not send code");
        }
      } catch {
        setError("Network error. Please try again.");
      }
    })();
  }, [email]);

  const resetInputs = () => {
    setDigits(Array(LENGTH).fill(""));
    refs.current[0]?.focus();
  };

  const handleChange = (i: number, value: string) => {
    const d = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError("");
    if (d && i < LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!text) return;
    const next = Array(LENGTH).fill("");
    text.split("").forEach((ch, idx) => (next[idx] = ch));
    setDigits(next);
    refs.current[Math.min(text.length, LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    if (!email) return setError("Missing email. Go back and try again.");
    const code = digits.join("");
    if (code.length < LENGTH) return setError(`Enter all ${LENGTH} digits`);

    setLoading(true);
    setInfo("");
    try {
      const res: ActionRes = await verifyOtp(email, code, PURPOSE);

      if (res.ok) {
        setVerified(true);
        setTimeout(() => router.push("/"), 1200);
        return;
      }

      if (res.status === 429) setLocked(true);
      setError(res.err ?? "Something went wrong");
      resetInputs();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return setError("Missing email. Go back and try again.");
    setError("");
    setInfo("");
    try {
      const res: ActionRes = await sendOtp(email, PURPOSE);

      if (res.ok) {
        setCooldown(COOLDOWN);
        setInfo("New code sent.");
        resetInputs();
        return;
      }

      if (res.status === 429) setLocked(true);
      setError(res.message ?? "Could not resend");
    } catch {
      setError("Network error. Please try again.");
    }
  };

  if (verified) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-2xl text-green-400">
          ✓
        </div>
        <h1 className="text-xl font-semibold">Email verified</h1>
        <p className="mt-1 text-sm text-neutral-400">Redirecting you…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold">Verify your email</h1>
      <p className="mt-2 text-center text-sm text-neutral-400">
        We sent a {LENGTH}-digit code to
        <br />
        <span className="text-neutral-200">{email || "your email"}</span>
      </p>

      <div className="mt-6 flex justify-center gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            autoFocus={i === 0}
            disabled={locked}
            className="h-12 w-11 rounded-lg border border-neutral-700 bg-neutral-900 text-center text-xl font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
          />
        ))}
      </div>

      {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
      {!error && info && <p className="mt-3 text-center text-sm text-green-400">{info}</p>}

      <button
        onClick={handleVerify}
        disabled={loading || locked}
        className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 font-medium transition hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Verifying…" : locked ? "Locked" : "Verify"}
      </button>

      <p className="mt-4 text-center text-sm text-neutral-400">
        Didn&apos;t get it?{" "}
        <button
          onClick={handleResend}
          disabled={cooldown > 0 || locked}
          className="text-blue-400 hover:underline disabled:cursor-not-allowed disabled:text-neutral-500 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </>
  );
}

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
        <Suspense fallback={<p className="text-center text-neutral-400">Loading…</p>}>
          <OtpForm />
        </Suspense>
      </div>
    </main>
  );
}