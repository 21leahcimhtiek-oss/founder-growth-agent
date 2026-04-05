import { NextRequest } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT_FOUNDER_GROWTH } from "@/lib/agent";
import { getCRMSummary } from "@/lib/merge";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { message, accountToken } = await req.json();

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_BACKUP;
  const apiKey2 = process.env.OPENAI_API_KEY_BACKUP || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build system prompt — inject CRM context if a linked account exists
  let systemPrompt = SYSTEM_PROMPT_FOUNDER_GROWTH;

  if (accountToken) {
    try {
      const crmSummary = await getCRMSummary(accountToken);
      systemPrompt += `\n\n---\n\nThe founder has connected their CRM. Here is their current pipeline data. Use this to give specific, data-informed outreach and growth advice. Reference real contacts, leads, and deals when relevant.\n\n${crmSummary}`;
    } catch {
      // CRM unavailable — continue without enrichment
    }
  }

  const openai = new OpenAI({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let mainError = null;
      
      try {
        const openaiStream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
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
            
            const backupStream = await openai2.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
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

        const msg = mainError instanceof Error ? mainError.message : "Both API keys failed";
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