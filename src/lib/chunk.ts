import { encode, decode } from "gpt-tokenizer";

const CHUNK_SIZE_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 50;

export interface PageOffset {
  page: number;
  startChar: number;
}

export interface TextChunk {
  content: string;
  tokenCount: number;
  pageNumber: number | null;
}

/**
 * Splits text into ~500-token chunks with a 50-token overlap between
 * consecutive chunks, operating on the actual model token stream (not word
 * or character counts) so chunk boundaries reflect what the embedding model
 * sees.
 */
export function chunkText(text: string, pageOffsets: PageOffset[] = []): TextChunk[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const tokens = encode(trimmed);
  const chunks: TextChunk[] = [];
  const step = CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS;

  for (let start = 0; start < tokens.length; start += step) {
    const end = Math.min(start + CHUNK_SIZE_TOKENS, tokens.length);
    const slice = tokens.slice(start, end);
    const content = decode(slice).trim();

    if (content) {
      chunks.push({
        content,
        tokenCount: slice.length,
        pageNumber: null,
      });
    }

    if (end >= tokens.length) break;
  }

  if (pageOffsets.length > 0) {
    return assignPageNumbers(chunks, trimmed, pageOffsets);
  }

  return chunks;
}

// Best-effort page attribution: locate each chunk's leading text within the
// full document and map that character offset to a page using the offsets
// captured during text extraction. Only PDFs produce page offsets; other
// formats (e.g. DOCX) skip this and every chunk keeps a null page number.
function assignPageNumbers(
  chunks: TextChunk[],
  fullText: string,
  pageOffsets: PageOffset[]
): TextChunk[] {
  let searchFrom = 0;

  return chunks.map((chunk) => {
    const needle = chunk.content.slice(0, 60);
    let idx = fullText.indexOf(needle, searchFrom);
    if (idx === -1) idx = fullText.indexOf(needle);
    if (idx !== -1) searchFrom = idx;

    let page: number | null = null;
    if (idx !== -1) {
      for (const offset of pageOffsets) {
        if (offset.startChar <= idx) {
          page = offset.page;
        } else {
          break;
        }
      }
    }

    return { ...chunk, pageNumber: page };
  });
}
