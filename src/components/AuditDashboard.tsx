"use client";

import { useEffect, useState } from "react";
import { ModelToggle } from "./ModelToggle";
import { VerdictBadge } from "./Badge";
import { IconClipboard, IconLoader, IconShieldCheck } from "./icons";
import type { AuditFinding, AuditRecord, ModelMode } from "@/lib/types";

const CATEGORIES: AuditFinding["category"][] = ["Governance", "Privacy", "Security"];

export function AuditDashboard({
  documentId,
  documentLabel,
  documentReady,
  modelMode,
  onModelModeChange,
}: {
  documentId: string | null;
  documentLabel: string;
  documentReady: boolean;
  modelMode: ModelMode;
  onModelModeChange: (mode: ModelMode) => void;
}) {
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  // Set once at mount from the initial prop - AppShell remounts this
  // component (via `key`) whenever the selected document changes, so this
  // never goes stale for a given instance.
  const [loading, setLoading] = useState(() => documentId !== null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    fetch(`/api/audit?documentId=${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAudit(data.audit);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function runAudit() {
    if (!documentId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, modelMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Audit failed.");
      setAudit(data.audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="text-sm font-medium">{documentLabel}</div>
        <div className="flex items-center gap-3">
          <ModelToggle value={modelMode} onChange={onModelModeChange} />
          <button
            type="button"
            onClick={runAudit}
            disabled={!documentId || !documentReady || running}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground transition-opacity disabled:opacity-30 cursor-pointer"
          >
            {running ? <IconLoader className="text-sm" /> : <IconShieldCheck className="text-sm" />}
            {audit ? "Re-run audit" : "Run audit"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {!documentId && (
          <EmptyState text="Select a document from the sidebar to run a compliance audit." />
        )}

        {documentId && !documentReady && (
          <EmptyState text="This document is still processing. Audits become available once it's ready." />
        )}

        {documentId && documentReady && loading && (
          <div className="flex items-center gap-2 text-sm text-foreground/50">
            <IconLoader /> Loading audit history…
          </div>
        )}

        {documentId && documentReady && !loading && !audit && !running && (
          <EmptyState text="Run an audit to check this document against standard governance, privacy, and security rules." />
        )}

        {running && !audit && (
          <div className="flex items-center gap-2 text-sm text-foreground/50">
            <IconLoader /> Auditing document against 10 compliance rules…
          </div>
        )}

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        {audit && (
          <div className="mx-auto flex max-w-3xl flex-col gap-8 animate-fade-in">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row">
              <ScoreGauge score={audit.overallScore} />
              <div className="flex-1">
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                  Executive summary
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{audit.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["pass", "partial", "fail", "not_applicable"] as const).map((v) => {
                    const count = audit.findings.filter((f) => f.verdict === v).length;
                    if (count === 0) return null;
                    return (
                      <span key={v} className="flex items-center gap-1 text-xs text-foreground/50">
                        <VerdictBadge verdict={v} /> × {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {CATEGORIES.map((category) => {
              const findings = audit.findings.filter((f) => f.category === category);
              if (findings.length === 0) return null;
              return (
                <div key={category}>
                  <h3 className="mb-3 text-sm font-semibold">{category}</h3>
                  <div className="flex flex-col gap-3">
                    {findings.map((finding) => (
                      <FindingCard key={finding.ruleId} finding={finding} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center text-center text-sm text-foreground/50">
      <IconClipboard className="mb-3 text-2xl text-accent" />
      <p>{text}</p>
    </div>
  );
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium">{finding.title}</h4>
        <VerdictBadge verdict={finding.verdict} />
      </div>
      {finding.evidence && (
        <blockquote className="mt-2 border-l-2 border-border pl-3 text-xs italic text-foreground/50">
          &ldquo;{finding.evidence}&rdquo;
        </blockquote>
      )}
      <p className="mt-2 text-xs text-foreground/70">{finding.recommendation}</p>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold">{score}</span>
        <span className="text-[10px] text-foreground/40">/ 100</span>
      </div>
    </div>
  );
}
