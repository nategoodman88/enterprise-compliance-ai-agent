import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getChatModel } from "@/lib/models";
import { embedText } from "@/lib/embeddings";
import { searchChunks } from "@/lib/retrieval";
import { AUDIT_RULES } from "@/lib/audit-rules";
import type { AuditFinding, AuditRecord, ModelMode } from "@/lib/types";

export const maxDuration = 120;

const RULE_IDS = AUDIT_RULES.map((r) => r.id) as [string, ...string[]];

const findingSchema = z.object({
  ruleId: z.enum(RULE_IDS),
  verdict: z.enum(["pass", "partial", "fail", "not_applicable"]),
  evidence: z
    .string()
    .describe(
      "A short quote or paraphrase from the retrieved excerpts that supports the verdict, including the source document name. Empty string if nothing relevant was found."
    ),
  recommendation: z
    .string()
    .describe("A concrete, actionable recommendation to close the gap, or a brief note confirming compliance."),
});

const auditSchema = z.object({
  summary: z.string().describe("A 2-4 sentence executive summary of the document's overall compliance posture."),
  findings: z.array(findingSchema).length(AUDIT_RULES.length),
});

export async function POST(request: Request) {
  const { documentId, modelMode }: { documentId: string; modelMode: ModelMode } =
    await request.json();

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  const pool = getPool();
  const docResult = await pool.query(
    `SELECT id, filename, status FROM documents WHERE id = $1`,
    [documentId]
  );
  const doc = docResult.rows[0];
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  if (doc.status !== "ready") {
    return NextResponse.json({ error: "Document is not ready for audit yet." }, { status: 409 });
  }

  const ruleContexts = await Promise.all(
    AUDIT_RULES.map(async (rule) => {
      const embedding = await embedText(rule.searchQuery);
      const matches = await searchChunks(embedding, { documentId, limit: 3 });
      return { rule, matches };
    })
  );

  const contextBlock = ruleContexts
    .map(({ rule, matches }) => {
      const excerpts = matches.length
        ? matches
            .map(
              (m, i) =>
                `  [${i + 1}]${m.pageNumber ? ` (p. ${m.pageNumber})` : ""} ${m.content.replace(/\s+/g, " ").slice(0, 800)}`
            )
            .join("\n")
        : "  No relevant passages were retrieved from the document.";
      return `Rule "${rule.id}" - ${rule.title}\nWhat to look for: ${rule.description}\nRetrieved excerpts from "${doc.filename}":\n${excerpts}`;
    })
    .join("\n\n");

  const { object } = await generateObject({
    model: getChatModel(modelMode ?? "robust"),
    schema: auditSchema,
    system:
      "You are a compliance auditor reviewing a corporate policy document against a fixed checklist of governance, privacy, and security rules. Judge each rule strictly using only the retrieved excerpts provided - do not assume anything the document doesn't state. Return exactly one finding per rule, in the same order the rules are given.",
    prompt: `Document under review: "${doc.filename}"\n\n${contextBlock}\n\nEvaluate every rule listed above and return a finding for each.`,
  });

  const findings: AuditFinding[] = object.findings.map((f) => {
    const rule = AUDIT_RULES.find((r) => r.id === f.ruleId)!;
    return {
      ruleId: rule.id,
      category: rule.category,
      title: rule.title,
      verdict: f.verdict,
      evidence: f.evidence,
      recommendation: f.recommendation,
    };
  });

  const overallScore = computeScore(findings);

  const insertResult = await pool.query(
    `INSERT INTO audits (document_id, model_mode, overall_score, summary, findings)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, document_id, model_mode, overall_score, summary, findings, created_at`,
    [documentId, modelMode, overallScore, object.summary, JSON.stringify(findings)]
  );

  return NextResponse.json({ audit: toAuditRecord(insertResult.rows[0]) });
}

export async function GET(request: Request) {
  const documentId = new URL(request.url).searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, document_id, model_mode, overall_score, summary, findings, created_at
     FROM audits WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [documentId]
  );

  return NextResponse.json({ audit: rows[0] ? toAuditRecord(rows[0]) : null });
}

function computeScore(findings: AuditFinding[]): number {
  const weights: Record<AuditFinding["verdict"], number> = {
    pass: 1,
    partial: 0.5,
    fail: 0,
    not_applicable: -1, // excluded below
  };
  const scored = findings.filter((f) => f.verdict !== "not_applicable");
  if (scored.length === 0) return 100;
  const total = scored.reduce((sum, f) => sum + weights[f.verdict], 0);
  return Math.round((total / scored.length) * 100);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAuditRecord(row: any): AuditRecord {
  return {
    id: row.id,
    documentId: row.document_id,
    modelMode: row.model_mode,
    overallScore: row.overall_score,
    summary: row.summary,
    findings: row.findings,
    createdAt: row.created_at,
  };
}
