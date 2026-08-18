export type DocumentStatus = "processing" | "ready" | "error";

export interface DocumentRecord {
  id: string;
  filename: string;
  status: DocumentStatus;
  error: string | null;
  pageCount: number | null;
  charCount: number | null;
  chunkCount: number | null;
  createdAt: string;
}

export interface ChunkMatch {
  id: string;
  documentId: string;
  documentFilename: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  similarity: number;
}

export type ModelMode = "fast" | "robust";

export type AuditVerdict = "pass" | "partial" | "fail" | "not_applicable";

export interface AuditFinding {
  ruleId: string;
  category: string;
  title: string;
  verdict: AuditVerdict;
  evidence: string;
  recommendation: string;
}

export interface AuditRecord {
  id: string;
  documentId: string;
  modelMode: ModelMode;
  overallScore: number;
  summary: string;
  findings: AuditFinding[];
  createdAt: string;
}
