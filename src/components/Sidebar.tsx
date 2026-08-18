"use client";

import { useState } from "react";
import { UploadZone } from "./UploadZone";
import { StatusBadge } from "./Badge";
import {
  IconDownload,
  IconFile,
  IconLayers,
  IconLogOut,
  IconShieldCheck,
  IconTrash,
} from "./icons";
import type { DocumentRecord } from "@/lib/types";

function formatMeta(doc: DocumentRecord): string {
  const parts: string[] = [];
  if (doc.pageCount) parts.push(`${doc.pageCount} pg`);
  if (doc.chunkCount) parts.push(`${doc.chunkCount} chunks`);
  return parts.join(" · ");
}

export function Sidebar({
  documents,
  selectedId,
  onSelect,
  onUploaded,
  onDeleted,
  userEmail,
  onLogout,
}: {
  documents: DocumentRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUploaded: (doc: DocumentRecord) => void;
  onDeleted: (id: string) => void;
  userEmail: string | null;
  onLogout: () => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      onDeleted(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <IconShieldCheck className="text-base" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Compliance Agent</div>
          <div className="text-[11px] leading-tight text-foreground/50">Company Name</div>
        </div>
      </div>

      <div className="border-b border-border p-4">
        <UploadZone onUploaded={onUploaded} />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
            selectedId === null
              ? "bg-accent-soft text-accent font-medium"
              : "hover:bg-surface-muted"
          }`}
        >
          <IconLayers className="shrink-0 text-base" />
          <span>All documents</span>
        </button>

        <div className="mt-2 mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
          Documents
        </div>

        {documents.length === 0 && (
          <p className="px-3 py-4 text-xs text-foreground/40">
            No documents yet. Upload a policy PDF or DOCX to get started.
          </p>
        )}

        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li key={doc.id}>
              <div
                onClick={() => onSelect(doc.id)}
                className={`group flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  selectedId === doc.id
                    ? "bg-accent-soft text-accent font-medium"
                    : "hover:bg-surface-muted"
                }`}
              >
                <IconFile className="mt-0.5 shrink-0 text-base opacity-70" />
                <div className="min-w-0 flex-1">
                  <div className="truncate" title={doc.filename}>
                    {doc.filename}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StatusBadge status={doc.status} />
                    {doc.status === "ready" && (
                      <span className="text-[11px] text-foreground/40">{formatMeta(doc)}</span>
                    )}
                  </div>
                  {doc.status === "error" && doc.error && (
                    <div className="mt-1 text-[11px] text-danger">{doc.error}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {doc.status === "ready" && (
                    <a
                      href={`/api/documents/${doc.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download original file"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md p-1 text-foreground/30 transition-colors hover:bg-accent-soft hover:text-accent"
                    >
                      <IconDownload className="text-sm" />
                    </a>
                  )}
                  <button
                    type="button"
                    title="Delete document"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                    disabled={deletingId === doc.id}
                    className="rounded-md p-1 text-foreground/30 transition-colors hover:bg-danger-soft hover:text-danger cursor-pointer disabled:opacity-50"
                  >
                    <IconTrash className="text-sm" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="min-w-0 truncate text-xs text-foreground/50" title={userEmail ?? undefined}>
          {userEmail ?? ""}
        </span>
        <button
          type="button"
          title="Sign out"
          onClick={() => onLogout()}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/50 transition-colors hover:bg-danger-soft hover:text-danger cursor-pointer"
        >
          <IconLogOut className="text-sm" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
