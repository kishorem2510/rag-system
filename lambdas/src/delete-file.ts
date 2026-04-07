import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  DeleteCommand,
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
      "Access-Control-Allow-Methods": "OPTIONS,DELETE",
    },
    body: JSON.stringify(body),
  };
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

    const result = await ddb.send(
      new GetCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Key: { pk, sk },
      })
    );

    if (!result.Item) {
      return response(404, { message: "File not found" });
    }

    const objectKey = result.Item.objectKey;
    const processedKey = result.Item.processedKey;

    if (objectKey) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.UPLOAD_BUCKET_NAME!,
          Key: objectKey,
        })
      );
    }

    if (processedKey) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.UPLOAD_BUCKET_NAME!,
          Key: processedKey,
        })
      );
    }

    await ddb.send(
      new DeleteCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Key: { pk, sk },
      })
    );

    return response(200, {
      message: "File deleted successfully",
      fileId,
    });
  } catch (error: any) {
    return response(500, {
      message: "Failed to delete file",
      error: error?.message || "Unknown error",
    });
  }
};