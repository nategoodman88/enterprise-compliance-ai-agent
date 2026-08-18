import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// Embeddings always run on OpenAI, independent of the "Fast" / "Robust"
// chat model toggle - Anthropic does not expose an embeddings endpoint.
const embeddingModel = openai.embedding("text-embedding-3-small");

const BATCH_SIZE = 100;

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({ model: embeddingModel, values: batch });
    results.push(...embeddings);
  }

  return results;
}
