export async function requestUploadUrl(payload: {
  fileName: string;
  fileType: string;
  userId: string;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/request-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to request upload URL");
  }

  return res.json();
}

export async function completeUpload(payload: {
  userId: string;
  fileId: string;
  fileName: string;
  objectKey: string;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to save metadata");
  }

  return res.json();
}

export async function listFiles(userId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/files?userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch files");
  }

  return res.json();
}

export async function getFile(userId: string, fileId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${fileId}?userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch file");
  }

  return res.json();
}

export async function deleteFile(userId: string, fileId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${fileId}?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to delete file");
  }

  return res.json();
}

export async function getFileContent(userId: string, fileId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${fileId}/content?userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch file content");
  }

  return res.json();
}

export async function askQuestion(payload: {
  userId: string;
  fileId: string;
  question: string;
}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to ask question");
  }

  return res.json();
}