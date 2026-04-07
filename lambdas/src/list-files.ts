import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return response(400, { message: "userId is required" });
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "FILE#",
        },
      })
    );

    const files = (result.Items || []).map((item) => ({
      userId: item.userId,
      fileId: item.fileId,
      fileName: item.fileName,
      objectKey: item.objectKey,
      status: item.status,
      createdAt: item.createdAt,
    }));

    return response(200, { files });
  } catch (error: any) {
    return response(500, {
      message: "Failed to fetch files",
      error: error?.message || "Unknown error",
    });
  }
};