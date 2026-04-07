"use client";

import "@/lib/amplify";
import { currentUser, logout } from "@/lib/auth";
import { completeUpload, deleteFile, listFiles, requestUploadUrl } from "@/lib/upload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


type UploadedFile = {
  fileId: string;
  fileName: string;
  status: string;
  createdAt?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  async function fetchFiles() {
    try {
      setLoadingFiles(true);
      setMessage("");

      const user = await currentUser();
      const userId = user.userId;

      const data = await listFiles(userId);
      setFiles(data.files || []);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load files");
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setMessage("");

    try {
      const user = await currentUser();
      const userId = user.userId;

      for (const file of Array.from(selectedFiles)) {
        if (file.type !== "application/pdf") {
          throw new Error(`Only PDF files are allowed: ${file.name}`);
        }

        const uploadInit = await requestUploadUrl({
          fileName: file.name,
          fileType: file.type,
          userId,
        });

        const putRes = await fetch(uploadInit.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!putRes.ok) {
          throw new Error(`S3 upload failed for ${file.name}`);
        }

        await completeUpload({
          userId,
          fileId: uploadInit.fileId,
          fileName: file.name,
          objectKey: uploadInit.objectKey,
        });
      }

      setMessage("All files uploaded successfully.");
      e.target.value = "";
      await fetchFiles();
    } catch (error: any) {
      setMessage(error?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
  try {
    setMessage("");

    const user = await currentUser();
    const userId = user.userId;

    await deleteFile(userId, fileId);
    setMessage("File deleted successfully.");
    await fetchFiles();
  } catch (error: any) {
    setMessage(error?.message || "Delete failed");
  }
}

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="mt-3 text-slate-300">
                Upload one or more PDF files to start your document QA workflow.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
            >
              Logout
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-white/20 bg-slate-900/50 p-6">
            <label className="mb-3 block text-sm font-medium text-slate-200">
              Upload PDF files
            </label>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-slate-900"
            />
            <p className="mt-3 text-xs text-slate-400">
              Only PDF files are accepted. Multiple upload is enabled.
            </p>
          </div>

          {message ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {message}
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Uploaded files</h2>

            {loadingFiles ? (
              <p className="mt-4 text-slate-300">Loading files...</p>
            ) : files.length === 0 ? (
              <p className="mt-4 text-slate-400">No files uploaded yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
               {files.map((file) => (
  <div
    key={file.fileId}
    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
  >
    <div className="flex items-center justify-between gap-4">
      <Link
        href={`/dashboard/files/${file.fileId}`}
        className="min-w-0 flex-1"
      >
        <p className="truncate font-medium">{file.fileName}</p>
        <p className="truncate text-sm text-slate-400">{file.fileId}</p>
        {file.createdAt ? (
          <p className="mt-1 text-xs text-slate-500">
            {new Date(file.createdAt).toLocaleString()}
          </p>
        ) : null}
      </Link>

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
          {file.status}
        </span>

        <button
          onClick={() => handleDelete(file.fileId)}
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}