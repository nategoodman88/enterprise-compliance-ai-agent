import { getPool, toVectorLiteral } from "./db";
import type { ChunkMatch } from "./types";

interface SearchOptions {
  documentId?: string;
  limit?: number;
}

export async function searchChunks(
  queryEmbedding: number[],
  { documentId, limit = 6 }: SearchOptions = {}
): Promise<ChunkMatch[]> {
  const pool = getPool();
  const vector = toVectorLiteral(queryEmbedding);

  const params: unknown[] = [vector];
  let documentFilter = "";
  if (documentId) {
    params.push(documentId);
    documentFilter = `WHERE c.document_id = $${params.length}`;
  }
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.document_id,
       d.filename AS document_filename,
       c.chunk_index,
       c.page_number,
       c.content,
       1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     JOIN documents d ON d.id = c.document_id
     ${documentFilter}
     ORDER BY c.embedding <=> $1::vector
     LIMIT $${params.length}`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    documentFilename: row.document_filename,
    chunkIndex: row.chunk_index,
    pageNumber: row.page_number,
    content: row.content,
    similarity: Number(row.similarity),
  }));
}
