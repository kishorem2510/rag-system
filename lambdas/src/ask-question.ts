import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";

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
      "Access-Control-Allow-Methods": "OPTIONS,POST",
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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreChunk(question: string, chunkText: string): number {
  const qWords = new Set(tokenize(question));
  const cWords = tokenize(chunkText);

  let score = 0;
  for (const word of cWords) {
    if (qWords.has(word)) score++;
  }
  return score;
}

function retrieveTopChunks(
  question: string,
  chunks: Array<{ chunkId: string; index: number; text: string }>,
  topK = 3
) {
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(question, chunk.text),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { userId, fileId, question } = body;

    if (!userId || !fileId || !question) {
      return response(400, {
        message: "userId, fileId, and question are required",
      });
    }

    const fileResult = await ddb.send(
      new GetCommand({
        TableName: process.env.FILES_TABLE_NAME!,
        Key: {
          pk: `USER#${userId}`,
          sk: `FILE#${fileId}`,
        },
      })
    );

    if (!fileResult.Item) {
      return response(404, { message: "File not found" });
    }

    if (fileResult.Item.status !== "READY" || !fileResult.Item.processedKey) {
      return response(400, {
        message: "File is not ready for question answering",
      });
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

    const chunks = parsed.chunks || [];
    const topChunks = retrieveTopChunks(question, chunks, 3);

    if (topChunks.length === 0) {
      return response(200, {
        answer: "I could not find that in this document.",
        sources: [],
      });
    }

    const context = topChunks
      .map(
        (chunk: any) =>
          `Chunk ${chunk.index} (${chunk.chunkId}):\n${chunk.text}`
      )
      .join("\n\n");

    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama-3.3-70b-versatile",
      temperature: 0,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a document question answering assistant.
Answer ONLY from the provided context.
If the answer is not explicitly present in the context, reply exactly:
"I could not find that in this document."
Do not use outside knowledge.
Keep the answer concise and factual.`,
      ],
      [
        "human",
        `Context:
{context}

Question:
{question}`,
      ],
    ]);

    const chain = prompt.pipe(llm);
    const result = await chain.invoke({
      context,
      question,
    });

    return response(200, {
      answer: result.content,
      sources: topChunks.map((chunk: any) => ({
        chunkId: chunk.chunkId,
        index: chunk.index,
        text: chunk.text,
      })),
    });
  } catch (error: any) {
    return response(500, {
      message: "Failed to answer question",
      error: error?.message || "Unknown error",
    });
  }
};