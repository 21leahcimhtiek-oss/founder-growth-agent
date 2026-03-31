import { NextRequest } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT_FOUNDER_GROWTH } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_BACKUP;
  const apiKey2 = process.env.OPENAI_API_KEY_BACKUP || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openai = new OpenAI({ apiKey });

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let mainError = null;
      
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
        mainError = err;
        
        // Try backup key if available and different from primary
        if (apiKey2 && apiKey2 !== apiKey) {
          try {
            const openai2 = new OpenAI({ apiKey: apiKey2 });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ notice: "Switching to backup API key..." })}\n\n`));
            
            const backupStream = await openai2.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: SYSTEM_PROMPT_FOUNDER_GROWTH },
                { role: "user", content: message },
              ],
              temperature: 0.7,
              max_tokens: 2000,
              stream: true,
            });

            for await (const chunk of backupStream) {
              const delta = chunk.choices[0]?.delta?.content || "";
              if (delta) {
                const line = `data: ${JSON.stringify({ chunk: delta })}\n\n`;
                controller.enqueue(encoder.encode(line));
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            return;
          } catch (backupErr) {
            mainError = backupErr;
          }
        }

        // If we get here, both keys failed
        const msg = mainError instanceof Error ? mainError.message : "Both API keys failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
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