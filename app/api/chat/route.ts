import { NextRequest } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT_FOUNDER_GROWTH } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const openaiStream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT_FOUNDER_GROWTH },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        });

        for await (const chunk of openaiStream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            const line = `data: ${JSON.stringify({ chunk: delta })}\n\n`;
            controller.enqueue(encoder.encode(line));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}