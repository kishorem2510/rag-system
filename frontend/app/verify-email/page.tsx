"use client";

import "@/lib/amplify";
import AuthShell from "@/components/auth/AuthShell";
import { confirmEmail, register } from "@/lib/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Missing email. Please go back and sign up again.");
      return;
    }

    if (!code) {
      setError("Please enter the verification code.");
      return;
    }

    setLoading(true);
    try {
      await confirmEmail(email, code);
      setSuccess("Email verified successfully. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");

    const password = sessionStorage.getItem("signup_password");

    if (!email || !password) {
      setError("Unable to resend code. Please sign up again.");
      return;
    }

    setResendLoading(true);
    try {
      await register(email, password);
      setSuccess("A new verification code has been sent.");
    } catch (err: any) {
      setError(err?.message || "Could not resend verification code.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the OTP sent to your email address to activate your account."
      footerText={
        <>
          Back to{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleVerify} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-medium">Email:</span>{" "}
          {email || "Not available"}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Verification code
          </label>
          <input
            type="text"
            placeholder="Enter OTP"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Email"
          )}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendLoading}
          className="w-full text-sm font-medium text-blue-600 hover:underline disabled:opacity-60"
        >
          {resendLoading ? "Resending..." : "Resend code"}
        </button>
      </form>
    </AuthShell>
  );
}