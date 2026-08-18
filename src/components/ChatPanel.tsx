"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ModelToggle } from "./ModelToggle";
import { IconFile, IconLoader, IconSearch, IconSend, IconSparkles } from "./icons";
import type { ModelMode } from "@/lib/types";

interface SearchResult {
  document: string;
  page: number | null;
  excerpt: string;
}

export function ChatPanel({
  documentId,
  documentLabel,
  disabled,
  modelMode,
  onModelModeChange,
}: {
  documentId: string | null;
  documentLabel: string;
  disabled?: string;
  modelMode: ModelMode;
  onModelModeChange: (mode: ModelMode) => void;
}) {
  const transport = new DefaultChatTransport({
    api: "/api/chat",
    body: { modelMode, documentId },
  });

  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || disabled) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <IconFile className="text-foreground/40" />
          <span className="font-medium">{documentLabel}</span>
        </div>
        <ModelToggle value={modelMode} onChange={onModelModeChange} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center text-sm text-foreground/50">
            <IconSparkles className="mb-3 text-2xl text-accent" />
            <p className="font-medium text-foreground/70">Ask about this policy</p>
            <p className="mt-1">
              e.g. &ldquo;What is our data retention period?&rdquo; or &ldquo;Who do I contact to
              report a security incident?&rdquo;
            </p>
          </div>
        )}

        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed animate-fade-in ${
                  message.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-muted text-foreground"
                }`}
              >
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <p key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  if (part.type === "tool-searchPolicyDocuments") {
                    return <ToolCallView key={i} state={part.state} output={part.output as { results?: SearchResult[] } | undefined} />;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {error && (
            <div className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
              Something went wrong: {error.message}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-border bg-surface-muted px-3 py-2 focus-within:border-accent/60">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={disabled ?? "Ask a question about this policy…"}
            disabled={!!disabled}
            rows={1}
            className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-foreground/40 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!!disabled || isStreaming || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:opacity-30 cursor-pointer"
          >
            {isStreaming ? <IconLoader className="text-sm" /> : <IconSend className="text-sm" />}
          </button>
        </div>
      </form>
    </div>
  );
}

function ToolCallView({
  state,
  output,
}: {
  state: string;
  output?: { results?: SearchResult[]; note?: string };
}) {
  if (state !== "output-available") {
    return (
      <div className="mb-2 flex items-center gap-1.5 text-xs text-foreground/50">
        <IconSearch className="animate-pulse" />
        Searching policy documents…
      </div>
    );
  }

  const results = output?.results ?? [];
  if (results.length === 0) {
    return (
      <div className="mb-2 flex items-center gap-1.5 text-xs text-foreground/40">
        <IconSearch />
        No relevant passages found
      </div>
    );
  }

  const unique = Array.from(
    new Map(results.map((r) => [`${r.document}-${r.page}`, r])).values()
  );

  return (
    <details className="mb-2 group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground/70">
        <IconSearch />
        {unique.length} source{unique.length === 1 ? "" : "s"} referenced
      </summary>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {unique.map((r, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs">
            <div className="font-medium text-foreground/70">
              {r.document}
              {r.page ? ` · p. ${r.page}` : ""}
            </div>
            <div className="mt-0.5 line-clamp-2 text-foreground/50">{r.excerpt}</div>
          </div>
        ))}
      </div>
    </details>
  );
}
