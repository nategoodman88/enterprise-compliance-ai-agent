import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatModel } from "@/lib/models";
import { embedText } from "@/lib/embeddings";
import { searchChunks } from "@/lib/retrieval";
import { getThreadMessages, saveThreadMessages } from "@/lib/chat-threads";
import { withJsonErrors } from "@/lib/api-utils";
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

// Chat history - GET returns the persisted thread for a document (or the
// global "All documents" thread when no documentId is given) so the client
// can hydrate useChat with prior messages on load.
export const GET = withJsonErrors(async (request: Request) => {
  const documentId = new URL(request.url).searchParams.get("documentId");
  const messages = await getThreadMessages(documentId);
  return NextResponse.json({ messages });
});

export const POST = withJsonErrors(async (request: Request) => {
  const { messages, modelMode, documentId }: ChatRequestBody = await request.json();
  const threadDocumentId = documentId ?? null;

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

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: updatedMessages }) => {
      await saveThreadMessages(threadDocumentId, updatedMessages);
    },
  });
});
