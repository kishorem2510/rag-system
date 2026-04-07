"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { FileText, ShieldCheck, SearchCheck, Database } from "lucide-react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  footerText?: ReactNode;
  children: ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  footerText,
  children,
}: AuthShellProps) {
  const features = [
    {
      icon: FileText,
      title: "Multi-PDF Workspace",
      desc: "Upload multiple PDFs and manage each document independently.",
    },
    {
      icon: SearchCheck,
      title: "Grounded AI Answers",
      desc: "Responses come only from your uploaded documents using RAG.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Authentication",
      desc: "Protected with Amazon Cognito for reliable user access control.",
    },
    {
      icon: Database,
      title: "Scalable AWS Backend",
      desc: "Built for serverless document storage, retrieval, and chat.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-10 xl:p-14">
          <div className="absolute inset-0">
            <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute top-1/3 left-1/3 h-52 w-52 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <FileText className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-wide">DocuRAG</p>
                <p className="text-sm text-slate-300">
                  AI-powered document intelligence
                </p>
              </div>
            </Link>
          </div>

          <div className="relative z-10 max-w-xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
              Smart Document Q&A
            </p>
            <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
              Chat with your PDFs,
              <span className="block text-blue-300">one file at a time.</span>
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Upload documents, retrieve exact context, and get grounded
              answers without hallucinations. Built with Next.js, AWS, and RAG.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                      <Icon className="h-5 w-5 text-blue-300" />
                    </div>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-6 text-sm text-slate-400">
            Designed for secure document ingestion, retrieval, and grounded
            chatbot interactions.
          </div>
        </div>

        <div className="flex items-center justify-center bg-slate-50 px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    DocuRAG
                  </p>
                  <p className="text-sm text-slate-500">
                    AI-powered document intelligence
                  </p>
                </div>
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {subtitle}
                </p>
              </div>

              {children}

              {footerText ? (
                <div className="mt-6 text-center text-sm text-slate-500">
                  {footerText}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}