import { extractText, getDocumentProxy } from "unpdf";
import type { PageOffset } from "./chunk";

export interface ExtractedPdf {
  text: string;
  pageCount: number;
  pageOffsets: PageOffset[];
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<ExtractedPdf> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text: pages } = await extractText(pdf, { mergePages: false });

  const pageOffsets: PageOffset[] = [];
  let cursor = 0;
  const parts: string[] = [];

  pages.forEach((pageText, index) => {
    pageOffsets.push({ page: index + 1, startChar: cursor });
    parts.push(pageText);
    cursor += pageText.length + 1; // account for the join separator below
  });

  return {
    text: parts.join("\n"),
    pageCount: totalPages,
    pageOffsets,
  };
}
