import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

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
    const { userId, fileId, fileName, objectKey } = body;

    if (!userId || !fileId || !fileName || !objectKey) {
      return response(400, { message: "userId, fileId, fileName, and objectKey are required" });
    }

    const item = {
      pk: `USER#${userId}`,
      sk: `FILE#${fileId}`,
      userId,
      fileId,
      fileName,
      objectKey,
      status: "UPLOADED",
      createdAt: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Item: item,
      })
    );

    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: process.env.PROCESS_PDF_FUNCTION_NAME!,
        InvocationType: "Event",
        Payload: Buffer.from(
          JSON.stringify({
            userId,
            fileId,
            fileName,
            objectKey,
          })
        ),
      })
    );

    return response(200, {
      message: "File metadata saved and processing started",
      item,
    });
  } catch (error: any) {
    return response(500, {
      message: "Failed to save metadata",
      error: error?.message || "Unknown error",
    });
  }
};