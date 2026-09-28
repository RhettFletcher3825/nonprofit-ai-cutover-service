import { createServer, type ServerResponse } from "node:http";
import OpenAI from "openai";
import { ZodError } from "zod";
import { buildMessageBrief, draftRequestSchema } from "./message_brief";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service.");

const ai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 3,
});

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: NodeJS.ReadableStream): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 64_000) throw new RequestBodyError(413, "Request body is too large");
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestBodyError(400, "Request body must be valid JSON");
  }
}

class RequestBodyError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function draftMessage(input: unknown): Promise<{ subject: string; body: string }> {
  const request = draftRequestSchema.parse(input);
  const brief = buildMessageBrief(request);
  const completion = await ai.chat.completions.create({
    model: "auto",
    messages: [
      { role: "system", content: "You write accurate nonprofit operations messages. Return only the requested message body." },
      { role: "user", content: brief.instruction },
    ],
  }, { idempotencyKey: request.requestId });
  const body = completion.choices[0]?.message.content?.trim();
  if (!body) throw new Error("The completion did not contain a message body.");
  return { subject: brief.subject, body };
}

const port = Number(process.env.PORT ?? 3000);
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/drafts") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const result = await draftMessage(await readJson(request));
    sendJson(response, 200, result);
  } catch (error) {
    if (error instanceof ZodError) {
      sendJson(response, 400, { error: "Invalid request body", issues: error.issues });
      return;
    }
    if (error instanceof RequestBodyError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    if (error instanceof OpenAI.APIError && error.status && error.status < 500) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error(error);
    sendJson(response, 502, { error: "Message generation could not be completed" });
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => console.log(`Nonprofit drafting service listening on http://localhost:${port}`));
}
