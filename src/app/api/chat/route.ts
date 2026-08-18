import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { ensureSchema } from "@/lib/db";
import { getChatModel } from "@/lib/models";
import { embedText } from "@/lib/embeddings";
import { searchChunks } from "@/lib/retrieval";
import type { ModelMode } from "@/lib/types";

export const maxDuration = 60;

interface ChatRequestBody {
  messages: UIMessage[];
  modelMode: ModelMode;
  documentId?: string | null;
}

const SYSTEM_PROMPT = `You are the compliance assistant inside an Enterprise Smart Document Compliance Agent.
You help employees understand corporate policy documents (HR manuals, security policies, privacy policies, etc.) that have been uploaded to the system.

Rules:
- Always call the "searchPolicyDocuments" tool before answering any question about what a policy says. Do not answer from general knowledge alone.
- Base your answer only on the retrieved excerpts. If the excerpts don't cover the question, say the policy doesn't appear to address it - never invent policy language.
- When you reference a specific rule or requirement, cite the source document name and page number when a page number is available, e.g. "(Security_Policy.pdf, p. 4)". Some file types (e.g. DOCX) don't have page numbers - in that case just cite the document name.
- Keep answers concise and practical for a business audience.`;

export async function POST(request: Request) {
  await ensureSchema();
  const { messages, modelMode, documentId }: ChatRequestBody = await request.json();

  const searchPolicyDocuments = tool({
    description: documentId
      ? "Search the currently selected policy document for passages relevant to a query."
      : "Search across all uploaded policy documents for passages relevant to a query.",
    inputSchema: z.object({
      query: z.string().describe("A focused search query describing the information needed."),
    }),
    execute: async ({ query }) => {
      const embedding = await embedText(query);
      const matches = await searchChunks(embedding, {
        documentId: documentId ?? undefined,
        limit: 6,
      });

      if (matches.length === 0) {
        return { results: [], note: "No relevant passages were found." };
      }

      return {
        results: matches.map((m) => ({
          document: m.documentFilename,
          page: m.pageNumber,
          excerpt: m.content,
        })),
      };
    },
  });

  const result = streamText({
    model: getChatModel(modelMode ?? "fast"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: { searchPolicyDocuments },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
