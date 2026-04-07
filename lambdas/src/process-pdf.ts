import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { extractText, getDocumentProxy } from "unpdf";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = end - overlap;
  }

  return chunks;
}

export const handler = async (event: any) => {
  const { userId, fileId, fileName, objectKey } = event;

  if (!userId || !fileId || !fileName || !objectKey) {
    throw new Error("userId, fileId, fileName, and objectKey are required");
  }

  const pk = `USER#${userId}`;
  const sk = `FILE#${fileId}`;

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Key: { pk, sk },
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "PROCESSING",
        },
      })
    );

    const s3Object = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.UPLOAD_BUCKET_NAME!,
        Key: objectKey,
      })
    );

    if (!s3Object.Body) {
      throw new Error("S3 object body is empty");
    }

    const pdfBuffer = await streamToBuffer(s3Object.Body);

    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    const fullText = text || "";
    const chunks = chunkText(fullText).map((chunk, index) => ({
      chunkId: `${fileId}-chunk-${index + 1}`,
      fileId,
      userId,
      index: index + 1,
      text: chunk,
    }));

    const processedKey = `${userId}/${fileId}/processed/parsed.json`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.UPLOAD_BUCKET_NAME!,
        Key: processedKey,
        ContentType: "application/json",
        Body: JSON.stringify(
          {
            userId,
            fileId,
            fileName,
            originalObjectKey: objectKey,
            processedAt: new Date().toISOString(),
            totalPages,
            textLength: fullText.length,
            chunkCount: chunks.length,
            text: fullText,
            chunks,
          },
          null,
          2
        ),
      })
    );

    await ddb.send(
      new UpdateCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Key: { pk, sk },
        UpdateExpression:
          "SET #status = :status, processedKey = :processedKey, chunkCount = :chunkCount, textLength = :textLength",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "READY",
          ":processedKey": processedKey,
          ":chunkCount": chunks.length,
          ":textLength": fullText.length,
        },
      })
    );

    return {
      success: true,
      fileId,
      processedKey,
      chunkCount: chunks.length,
    };
  } catch (error: any) {
    await ddb.send(
      new UpdateCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Key: { pk, sk },
        UpdateExpression: "SET #status = :status, failureReason = :failureReason",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "FAILED",
          ":failureReason": error?.message || "Unknown error",
        },
      })
    );

    throw error;
  }
};