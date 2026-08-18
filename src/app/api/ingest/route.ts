import { NextRequest, NextResponse } from "next/server";
import { getPool, toVectorLiteral } from "@/lib/db";
import { extractPdfText } from "@/lib/pdf";
import { extractDocxText } from "@/lib/docx";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { uploadDocumentFile } from "@/lib/supabase";
import type { DocumentRecord } from "@/lib/types";

export const maxDuration = 120;

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type DocKind = "pdf" | "docx";

function detectKind(file: File): DocKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type === DOCX_MIME_TYPE || name.endsWith(".docx")) return "docx";
  return null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF or DOCX file was provided." }, { status: 400 });
  }
  const kind = detectKind(file);
  if (!kind) {
    return NextResponse.json({ error: "Only PDF and DOCX files are supported." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25MB limit." }, { status: 400 });
  }

  const pool = getPool();
  const insertResult = await pool.query<{ id: string }>(
    `INSERT INTO documents (filename, status) VALUES ($1, 'processing') RETURNING id`,
    [file.name]
  );
  const documentId = insertResult.rows[0].id;

  try {
    const buffer = await file.arrayBuffer();
    const mimeType = kind === "pdf" ? "application/pdf" : DOCX_MIME_TYPE;
    const storagePath = await uploadDocumentFile(documentId, file.name, buffer, mimeType);

    const { text, pageCount, pageOffsets } =
      kind === "pdf" ? await extractPdfText(buffer) : await extractDocxText(buffer);

    if (!text.trim()) {
      throw new Error(
        kind === "pdf"
          ? "No extractable text was found in this PDF (it may be a scanned image)."
          : "No extractable text was found in this document."
      );
    }

    const chunks = chunkText(text, pageOffsets);
    if (chunks.length === 0) {
      throw new Error("The document did not produce any usable text chunks.");
    }

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < chunks.length; i++) {
        await client.query(
          `INSERT INTO chunks (document_id, chunk_index, page_number, content, token_count, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [
            documentId,
            i,
            chunks[i].pageNumber,
            chunks[i].content,
            chunks[i].tokenCount,
            toVectorLiteral(embeddings[i]),
          ]
        );
      }
      await client.query(
        `UPDATE documents
         SET status = 'ready', page_count = $2, char_count = $3, chunk_count = $4,
             storage_path = $5, mime_type = $6
         WHERE id = $1`,
        [documentId, pageCount, text.length, chunks.length, storagePath, mimeType]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process document.";
    await pool.query(`UPDATE documents SET status = 'error', error = $2 WHERE id = $1`, [
      documentId,
      message,
    ]);
    return NextResponse.json({ error: message, documentId }, { status: 422 });
  }

  const { rows } = await pool.query(
    `SELECT id, filename, status, error, page_count, char_count, chunk_count, created_at
     FROM documents WHERE id = $1`,
    [documentId]
  );
  return NextResponse.json({ document: toDocumentRecord(rows[0]) });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDocumentRecord(row: any): DocumentRecord {
  return {
    id: row.id,
    filename: row.filename,
    status: row.status,
    error: row.error,
    pageCount: row.page_count,
    charCount: row.char_count,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
  };
}
