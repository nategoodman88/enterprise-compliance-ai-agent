import mammoth from "mammoth";
import type { PageOffset } from "./chunk";

export interface ExtractedDocx {
  text: string;
  pageCount: null;
  pageOffsets: PageOffset[];
}

// .docx has no reliable stored page boundaries (pagination is a rendering-time
// concept in Word, not data in the file), so unlike PDF extraction this never
// produces page offsets - chunks from a docx file simply have a null page.
export async function extractDocxText(buffer: ArrayBuffer): Promise<ExtractedDocx> {
  // Mammoth's Node build only recognizes the `buffer` input form, not
  // `arrayBuffer` (that's browser-only) - so convert first.
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return { text: value, pageCount: null, pageOffsets: [] };
}
