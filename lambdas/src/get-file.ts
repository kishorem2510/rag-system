import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

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

export const handler = async (event: any) => {
  try {
    const fileId = event.pathParameters?.fileId;
    const userId = event.queryStringParameters?.userId;

    if (!fileId || !userId) {
      return response(400, { message: "fileId and userId are required" });
    }

    const result = await ddb.send(
      new GetCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Key: {
          pk: `USER#${userId}`,
          sk: `FILE#${fileId}`,
        },
      })
    );

    if (!result.Item) {
      return response(404, { message: "File not found" });
    }

    return response(200, {
  file: {
    userId: result.Item.userId,
    fileId: result.Item.fileId,
    fileName: result.Item.fileName,
    objectKey: result.Item.objectKey,
    status: result.Item.status,
    createdAt: result.Item.createdAt,
    processedKey: result.Item.processedKey,
    chunkCount: result.Item.chunkCount,
    textLength: result.Item.textLength,
    failureReason: result.Item.failureReason,
  },
});
  } catch (error: any) {
    return response(500, {
      message: "Failed to fetch file",
      error: error?.message || "Unknown error",
    });
  }
};