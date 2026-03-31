"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "Help me get my first 10 B2B clients with no marketing budget",
  "Write a LinkedIn content strategy for a solo SaaS founder",
  "Build a cold DM sequence for a B2B service founder",
  "Sharpen my positioning: I help [X] do [Y] — make it land",
  "Create a 7-day founder-led growth action plan",
];

export default function FounderGrowthChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponse]);

  const handleSubmit = async (e?: React.FormEvent, overrideMsg?: string) => {
    e?.preventDefault();
    const msg = overrideMsg || input.trim();
    if (!msg || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setCurrentResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          const event = JSON.parse(raw);
          if (event.chunk) {
            fullResponse += event.chunk;
            setCurrentResponse(fullResponse);
          } else if (event.error) {
            console.error(event.error);
          }
        }
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentResponse("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-[#0d0d14]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg font-bold shadow-lg">
            🚀
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Founder Growth Agent</h1>
            <p className="text-xs text-white/40">B2B growth strategist for solo founders</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">Founder-led</span>
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">$0 budget</span>
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">Organic pipeline</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="max-w-2xl mx-auto pt-12">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold mb-2">Founder-Led B2B Growth Agent</h2>
              <p className="text-white/50 text-sm max-w-md mx-auto">
                Positioning, messaging, content, and outreach strategies — organic, $0-budget B2B growth.
              </p>
            </div>
            <div className="grid gap-2">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(undefined, p)}
                  className="text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-white/70 hover:text-white transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="max-w-4xl mx-auto">
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-xl px-4 py-3 rounded-2xl bg-emerald-600 text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <MarkdownContent content={msg.content} />
              </div>
            )}
          </div>
        ))}

        {isLoading && currentResponse && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
              <MarkdownContent content={currentResponse} />
              <div className="flex items-center gap-2 mt-3 text-white/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-4 bg-[#0d0d14]">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about positioning, messaging, content strategy, outreach..."
              rows={2}
              className="flex-1 resize-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-11 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Thinking
                </>
              ) : (
                "Send →"
              )}
            </button>
          </div>
          <p className="text-xs text-white/20 mt-2 ml-1">Enter to send · Shift+Enter for new line</p>
        </form>
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none
        prose-headings:font-semibold prose-headings:text-white
        prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
        prose-p:text-white/80 prose-p:leading-relaxed
        prose-li:text-white/80 prose-strong:text-white
        prose-code:text-emerald-300 prose-code:bg-emerald-500/10 prose-code:px-1 prose-code:rounded
        prose-hr:border-white/10">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}