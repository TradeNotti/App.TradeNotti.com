"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20";

const buttonClass =
  "mt-1 flex items-center justify-center rounded-lg bg-gradient-to-r from-accent to-[#7b6bf9] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:opacity-60";

type Mode = "signIn" | "forgot" | "reset";

function errMsg(err: unknown, fallback: string): string {
  const e = err as { errors?: { longMessage?: string; message?: string }[] };
  return e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? fallback;
}

/**
 * Single-step email + password sign-in with an inline forgot-password reset
 * flow (send code -> enter code + new password), all on one branded card.
 * Built on the stable Clerk instance API.
 */
export default function SignInForm() {
  const clerk = useClerk();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function finish(sessionId: string | null) {
    await clerk.setActive({ session: sessionId });
    router.push("/today");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Start the sign-in with the email + password.
      let res = await clerk.client.signIn.create({
        identifier: email.trim(),
        password,
      });

      // Some Clerk configurations don't consume the password in create() and
      // return "needs_first_factor" instead — finish it by explicitly attempting
      // the password factor (this is NOT extra verification, just the second
      // step of the same password login).
      if (res.status === "needs_first_factor") {
        const canPassword = res.supportedFirstFactors?.some(
          (f) => f.strategy === "password",
        );
        if (canPassword) {
          res = await clerk.client.signIn.attemptFirstFactor({
            strategy: "password",
            password,
          });
        }
      }

      if (res.status === "complete") {
        return void (await finish(res.createdSessionId));
      }

      // Genuine additional factors (2FA / email code) — tell the user plainly
      // instead of leaving them stuck.
      if (res.status === "needs_second_factor") {
        setError(
          "Two-factor authentication is enabled on this account. Disable it in the Clerk dashboard, or contact support.",
        );
      } else {
        setError("Couldn't sign you in. Check your email and password and try again.");
      }
      setLoading(false);
    } catch (err) {
      setError(errMsg(err, "Invalid email or password."));
      setLoading(false);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await clerk.client.signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      go("reset");
      setInfo("We sent a reset code to your email.");
      setLoading(false);
    } catch (err) {
      setError(errMsg(err, "Couldn't send a reset code. Check the email and try again."));
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      let res = await clerk.client.signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      });
      if (res.status === "needs_new_password") {
        res = await clerk.client.signIn.resetPassword({ password: newPassword });
      }
      if (res.status === "complete") return void (await finish(res.createdSessionId));
      setError("Couldn't reset your password. Please try again.");
      setLoading(false);
    } catch (err) {
      setError(errMsg(err, "Invalid or expired code."));
      setLoading(false);
    }
  }

  const heading =
    mode === "signIn"
      ? { title: "Sign in to TradeNotti", sub: "Welcome back. Enter your details to continue." }
      : mode === "forgot"
        ? { title: "Reset your password", sub: "Enter your email and we'll send you a reset code." }
        : { title: "Enter reset code", sub: "Check your email for the code, then set a new password." };

  return (
    <div className="w-[22rem] max-w-full rounded-2xl border border-accent/10 bg-surface px-7 py-7 shadow-2xl shadow-accent/10 ring-1 ring-accent/10">
      <h1 className="text-center text-xl font-bold tracking-tight text-ink">
        {heading.title}
      </h1>
      <p className="mb-6 mt-1 text-center text-[13px] text-muted">{heading.sub}</p>

      {mode === "signIn" && (
        <form onSubmit={handleSignIn} className="flex flex-col gap-3.5">
          <Field label="Email">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className={inputClass}
            />
          </Field>
          <Field
            label="Password"
            action={
              <button
                type="button"
                onClick={() => go("forgot")}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Forgot password?
              </button>
            }
          >
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </Field>
          {error && <p className="text-[12.5px] text-loss">{error}</p>}
          <div id="clerk-captcha" />
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={handleSendCode} className="flex flex-col gap-3.5">
          <Field label="Email">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className={inputClass}
            />
          </Field>
          {error && <p className="text-[12.5px] text-loss">{error}</p>}
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? "Sending…" : "Send reset code"}
          </button>
          <button
            type="button"
            onClick={() => go("signIn")}
            className="text-center text-[13px] font-medium text-faint hover:text-ink"
          >
            Back to sign in
          </button>
        </form>
      )}

      {mode === "reset" && (
        <form onSubmit={handleReset} className="flex flex-col gap-3.5">
          {info && <p className="text-[12.5px] text-profit">{info}</p>}
          <Field label="Reset code">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className={inputClass}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </Field>
          {error && <p className="text-[12.5px] text-loss">{error}</p>}
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? "Resetting…" : "Reset password & sign in"}
          </button>
          <button
            type="button"
            onClick={() => go("signIn")}
            className="text-center text-[13px] font-medium text-faint hover:text-ink"
          >
            Back to sign in
          </button>
        </form>
      )}

      {mode === "signIn" && (
        <p className="mt-5 text-center text-[13px] text-faint">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-accent">
            Sign up
          </Link>
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[12.5px] font-medium text-ink-soft">
        {label}
        {action}
      </span>
      {children}
    </label>
  );
}
