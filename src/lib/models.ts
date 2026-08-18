import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { ModelMode } from "./types";

// "Fast" uses OpenAI GPT-4o. "Robust" uses the current top-tier Claude
// model (Claude Sonnet 5) rather than the originally-specified Claude 3.5
// Sonnet, which has since been retired by Anthropic.
const MODEL_IDS: Record<ModelMode, string> = {
  fast: "gpt-4o",
  robust: "claude-sonnet-5",
};

export const MODEL_LABELS: Record<ModelMode, { name: string; provider: string }> = {
  fast: { name: "GPT-4o", provider: "OpenAI" },
  robust: { name: "Claude Sonnet 5", provider: "Anthropic" },
};

export function getChatModel(mode: ModelMode): LanguageModel {
  return mode === "fast" ? openai(MODEL_IDS.fast) : anthropic(MODEL_IDS.robust);
}
