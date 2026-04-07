import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

function response(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
    },
    body: JSON.stringify(body),
  };
}

async function streamToString(stream: any): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export const handler = async (event: any) => {
  try {
    const fileId = event.pathParameters?.fileId;
    const userId = event.queryStringParameters?.userId;

    if (!fileId || !userId) {
      return response(400, { message: "fileId and userId are required" });
    }

    const pk = `USER#${userId}`;
    const sk = `FILE#${fileId}`;

    const fileResult = await ddb.send(
      new GetCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Key: { pk, sk },
      })
    );

    if (!fileResult.Item) {
      return response(404, { message: "File not found" });
    }

    if (!fileResult.Item.processedKey) {
      return response(400, { message: "File is not processed yet" });
    }

    const s3Object = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.UPLOAD_BUCKET_NAME!,
        Key: fileResult.Item.processedKey,
      })
    );

    if (!s3Object.Body) {
      return response(500, { message: "Processed file body is empty" });
    }

    const content = await streamToString(s3Object.Body);
    const parsed = JSON.parse(content);

    return response(200, {
      processed: {
        textLength: parsed.textLength,
        chunkCount: parsed.chunkCount,
        text: parsed.text,
        chunks: parsed.chunks || [],
      },
    });
  } catch (error: any) {
    return response(500, {
      message: "Failed to fetch processed content",
      error: error?.message || "Unknown error",
    });
  }
};