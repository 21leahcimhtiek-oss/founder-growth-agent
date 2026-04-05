"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface LinkedAccount {
  id: string;
  account_token: string;
  integration: string;
  integration_slug: string;
  category: string;
  end_user_organization_name: string;
  status: string;
}

const SUGGESTED_PROMPTS = [
  "Help me get my first 10 B2B clients with no marketing budget",
  "Write a LinkedIn content strategy for a solo SaaS founder",
  "Build a cold DM sequence for a B2B service founder",
  "Sharpen my positioning: I help [X] do [Y] — make it land",
  "Create a 7-day founder-led growth action plan",
];

const CRM_PROMPTS = [
  "Analyze my CRM contacts and suggest who to reach out to first",
  "Write personalized outreach for my top 5 leads",
  "What patterns do you see in my pipeline? Where should I focus?",
  "Draft follow-up messages for my open deals",
];

export default function FounderGrowthChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [showCRM, setShowCRM] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkOrg, setLinkOrg] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponse]);

  // Load linked accounts on mount
  const loadLinkedAccounts = useCallback(async () => {
    setCrmLoading(true);
    try {
      const res = await fetch("/api/merge/link");
      const data = await res.json();
      if (data.results) {
        setLinkedAccounts(data.results);
        if (data.results.length > 0 && !activeAccount) {
          setActiveAccount(data.results[0].account_token);
        }
      }
    } catch {
      // silent fail
    } finally {
      setCrmLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    loadLinkedAccounts();
  }, [loadLinkedAccounts]);

  const handleConnectCRM = async () => {
    if (!linkEmail || !linkOrg) return;
    setLinkLoading(true);
    try {
      const res = await fetch("/api/merge/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: linkEmail, orgName: linkOrg }),
      });
      const data = await res.json();
      if (data.link_token) {
        // Open Merge Link in a new window
        window.open(
          `https://link.merge.dev/?link_token=${data.link_token}`,
          "merge-link",
          "width=600,height=700"
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLinkLoading(false);
    }
  };

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
        body: JSON.stringify({
          message: msg,
          accountToken: activeAccount || undefined,
        }),
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

          try {
            const event = JSON.parse(raw);
            if (event.chunk) {
              fullResponse += event.chunk;
              setCurrentResponse(fullResponse);
            } else if (event.error) {
              console.error(event.error);
            }
          } catch {
            continue;
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

  const prompts = activeAccount
    ? [...CRM_PROMPTS, ...SUGGESTED_PROMPTS.slice(0, 2)]
    : SUGGESTED_PROMPTS;

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
        <div className="flex items-center gap-2">
          {activeAccount && (
            <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              CRM Connected
            </span>
          )}
          <button
            onClick={() => setShowCRM(!showCRM)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              showCRM
                ? "bg-emerald-600 text-white"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            {showCRM ? "Close CRM" : "🔗 Connect CRM"}
          </button>
        </div>
      </header>

      {/* CRM Panel */}
      {showCRM && (
        <div className="border-b border-white/10 bg-[#0d0d14] px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>🔗</span> CRM Integration
              <span className="text-xs text-white/30 font-normal">via Merge.dev — HubSpot, Salesforce, Pipedrive, Zoho, Close & more</span>
            </h3>

            {crmLoading ? (
              <div className="text-xs text-white/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
                Loading linked accounts...
              </div>
            ) : linkedAccounts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-white/50 mb-2">Linked CRM accounts:</p>
                {linkedAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setActiveAccount(acc.account_token)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all w-full text-left ${
                      activeAccount === acc.account_token
                        ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-300"
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      acc.status === "COMPLETE" ? "bg-emerald-400" : "bg-yellow-400"
                    }`} />
                    <span className="font-medium">{acc.integration}</span>
                    <span className="text-xs text-white/30">— {acc.end_user_organization_name}</span>
                    {activeAccount === acc.account_token && (
                      <span className="ml-auto text-xs text-emerald-400">Active</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setActiveAccount(null);
                  }}
                  className="text-xs text-white/30 hover:text-white/60 transition-all mt-1"
                >
                  Disconnect CRM context
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/50">
                  Connect your CRM to get data-informed outreach advice. The agent will reference your real contacts, leads, and deals.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Your email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Company name"
                    value={linkOrg}
                    onChange={(e) => setLinkOrg(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    onClick={handleConnectCRM}
                    disabled={linkLoading || !linkEmail || !linkOrg}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-xs font-medium transition-all"
                  >
                    {linkLoading ? "Connecting..." : "Connect CRM →"}
                  </button>
                </div>
                <p className="text-xs text-white/20">
                  Supports: HubSpot, Salesforce, Pipedrive, Zoho CRM, Close, Copper, Freshsales, and 30+ more
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="max-w-2xl mx-auto pt-12">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold mb-2">Founder-Led B2B Growth Agent</h2>
              <p className="text-white/50 text-sm max-w-md mx-auto">
                Positioning, messaging, content, and outreach strategies — organic, $0-budget B2B growth.
                {activeAccount && (
                  <span className="block mt-1 text-emerald-400">✓ CRM connected — ask about your pipeline</span>
                )}
              </p>
            </div>
            <div className="grid gap-2">
              {prompts.map((p, i) => (
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

        {isLoading && !currentResponse && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-white/30 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {activeAccount ? "Analyzing CRM data and crafting strategy..." : "Crafting your growth strategy..."}
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
              placeholder={
                activeAccount
                  ? "Ask about your pipeline, outreach strategy, CRM insights..."
                  : "Ask about positioning, messaging, content strategy, outreach..."
              }
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
          <p className="text-xs text-white/20 mt-2 ml-1">
            Enter to send · Shift+Enter for new line
            {activeAccount && <span className="text-emerald-400/40 ml-2">· CRM enriched</span>}
          </p>
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