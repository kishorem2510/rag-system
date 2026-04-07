import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({ region: process.env.AWS_REGION });

function response(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { fileName, fileType, userId } = body;

    if (!fileName || !fileType || !userId) {
      return response(400, { message: "fileName, fileType, and userId are required" });
    }

    if (fileType !== "application/pdf") {
      return response(400, { message: "Only PDF uploads are allowed" });
    }

    const fileId = randomUUID();
    const sanitizedName = fileName.replace(/\s+/g, "-");
    const objectKey = `${userId}/${fileId}/${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.UPLOAD_BUCKET_NAME!,
      Key: objectKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return response(200, {
      fileId,
      objectKey,
      uploadUrl,
    });
  } catch (error: any) {
    return response(500, {
      message: "Failed to create upload URL",
      error: error?.message || "Unknown error",
    });
  }
};