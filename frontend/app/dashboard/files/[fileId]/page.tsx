"use client";

import "@/lib/amplify";
import { currentUser } from "@/lib/auth";
import { askQuestion, getFile, getFileContent } from "@/lib/upload";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type FileDetails = {
  fileId: string;
  fileName: string;
  status: string;
  createdAt?: string;
  processedKey?: string;
  chunkCount?: number;
  textLength?: number;
  failureReason?: string;
};

type ProcessedChunk = {
  chunkId: string;
  index: number;
  text: string;
};

type SourceChunk = {
  chunkId: string;
  index: number;
  text: string;
};

export default function FileDetailsPage({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) {
  const resolvedParams = use(params);
  const fileId = resolvedParams.fileId;

  const [file, setFile] = useState<FileDetails | null>(null);
  const [chunks, setChunks] = useState<ProcessedChunk[]>([]);
  const [textPreview, setTextPreview] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SourceChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  const statusStyles: Record<string, string> = {
    UPLOADED: "bg-blue-500/15 text-blue-300",
    PROCESSING: "bg-yellow-500/15 text-yellow-300",
    READY: "bg-emerald-500/15 text-emerald-300",
    FAILED: "bg-red-500/15 text-red-300",
  };

  async function fetchAll() {
    try {
      setLoading(true);
      setError("");

      const user = await currentUser();
      const userId = user.userId;

      const fileData = await getFile(userId, fileId);
      const currentFile = fileData.file;
      setFile(currentFile);

      if (currentFile?.status === "READY") {
        setLoadingContent(true);
        const contentData = await getFileContent(userId, fileId);
        const processed = contentData.processed;

        setChunks(processed.chunks || []);
        setTextPreview((processed.text || "").slice(0, 1200));
        setLoadingContent(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load file");
      setLoadingContent(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [fileId]);

  async function handleAsk() {
    try {
      if (!question.trim()) return;

      setAsking(true);
      setError("");
      setAnswer("");
      setSources([]);

      const user = await currentUser();
      const userId = user.userId;

      const result = await askQuestion({
        userId,
        fileId,
        question,
      });

      setAnswer(typeof result.answer === "string" ? result.answer : String(result.answer));
      setSources(result.sources || []);
    } catch (err: any) {
      setError(err?.message || "Failed to get answer");
    } finally {
      setAsking(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-blue-300 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-300">Loading file details...</p>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : !file ? (
          <p className="text-slate-400">File not found.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                  File Details
                </p>

                <h1 className="mt-3 break-words text-2xl font-bold">
                  {file.fileName}
                </h1>

                <div className="mt-6 space-y-4 text-sm">
                  <div>
                    <p className="text-slate-400">Status</p>
                    <p
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusStyles[file.status] ||
                        "bg-slate-500/15 text-slate-300"
                      }`}
                    >
                      {file.status}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Chunk Count</p>
                    <p className="mt-1 text-slate-200">{file.chunkCount ?? "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Text Length</p>
                    <p className="mt-1 text-slate-200">{file.textLength ?? "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                  Ask Questions
                </p>
                <h2 className="mt-3 text-2xl font-bold">
                  File-specific RAG chat
                </h2>

                {file.status !== "READY" ? (
                  <p className="mt-4 text-slate-300">
                    This file is not ready yet. Chat is enabled only after processing completes.
                  </p>
                ) : (
                  <>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question about this document..."
                      className="mt-5 min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <button
                      onClick={handleAsk}
                      disabled={asking}
                      className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 disabled:opacity-60"
                    >
                      {asking ? "Asking..." : "Ask Question"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {answer ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-semibold">Answer</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {answer}
                </p>
              </div>
            ) : null}

            {sources.length > 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-semibold">Sources used</h3>
                <div className="mt-4 space-y-4">
                  {sources.map((source) => (
                    <div
                      key={source.chunkId}
                      className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"
                    >
                      <p className="text-sm font-semibold text-blue-300">
                        Chunk {source.index}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {source.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold">Extracted chunks</h3>

              {file.status !== "READY" ? (
                <p className="mt-4 text-slate-400">
                  Chunks will appear after processing is complete.
                </p>
              ) : loadingContent ? (
                <p className="mt-4 text-slate-300">Loading chunks...</p>
              ) : chunks.length === 0 ? (
                <p className="mt-4 text-slate-400">No chunks found.</p>
              ) : (
                <div className="mt-6 space-y-4">
                  {chunks.map((chunk) => (
                    <div
                      key={chunk.chunkId}
                      className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-blue-300">
                          Chunk {chunk.index}
                        </p>
                        <p className="text-xs text-slate-500">{chunk.chunkId}</p>
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {chunk.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {textPreview ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-semibold">Extracted text preview</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {textPreview}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}