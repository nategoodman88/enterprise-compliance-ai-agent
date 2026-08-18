"use client";

import { useCallback, useRef, useState } from "react";
import { IconLoader, IconUpload } from "./icons";
import type { DocumentRecord } from "@/lib/types";

export function UploadZone({ onUploaded }: { onUploaded: (doc: DocumentRecord) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/ingest", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        onUploaded(data.document);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragging
            ? "border-accent bg-accent-soft"
            : "border-border bg-surface-muted hover:border-accent/50 hover:bg-accent-soft/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        {isUploading ? (
          <IconLoader className="text-lg text-accent" />
        ) : (
          <IconUpload className="text-lg text-accent" />
        )}
        <div className="text-xs font-medium">
          {isUploading ? "Processing document…" : "Drop a policy PDF or DOCX here, or click to browse"}
        </div>
        <div className="text-[11px] text-foreground/50">PDF or DOCX up to 25MB</div>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
