import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
          AWS + Next.js + RAG
        </p>
        <h1 className="text-5xl font-bold tracking-tight">
          Document Q&amp;A System
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          Upload PDFs, retrieve grounded context, and chat with each file
          independently using AI.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/signup"
            className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}