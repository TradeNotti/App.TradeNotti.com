import Link from "next/link";
import Logo from "@/components/Logo";
import SignInForm from "@/components/auth/SignInForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-canvas px-4 py-10">
      {/* indigo gradient wash + glows */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent-bg/70 via-canvas to-canvas"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-accent/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-6rem] left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-3">
        <Logo />
        <p className="text-sm text-muted">Your voice-first trading journal.</p>
      </div>
      <div className="relative">
        <SignInForm />
      </div>
      <Link
        href="/terms"
        className="relative text-[12.5px] text-faint hover:text-ink-soft"
      >
        Terms and Conditions
      </Link>
    </div>
  );
}
