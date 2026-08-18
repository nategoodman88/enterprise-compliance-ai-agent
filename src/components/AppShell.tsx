"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "./ChatPanel";
import { AuditDashboard } from "./AuditDashboard";
import { IconClipboard, IconMessage } from "./icons";
import type { DocumentRecord, ModelMode } from "@/lib/types";

type Tab = "chat" | "audit";

export function AppShell({
  userEmail,
  onLogout,
}: {
  userEmail: string | null;
  onLogout: () => Promise<void>;
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [modelMode, setModelMode] = useState<ModelMode>("fast");

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => setDocuments(data.documents ?? []));
  }, []);

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId]
  );

  function handleUploaded(doc: DocumentRecord) {
    setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
    setSelectedId(doc.id);
  }

  function handleDeleted(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }

  const documentLabel = selectedDoc ? selectedDoc.filename : "All documents";
  const hasReadyDocuments = documents.some((d) => d.status === "ready");

  let chatDisabled: string | undefined;
  if (documents.length === 0) {
    chatDisabled = "Upload a policy PDF or DOCX to start chatting.";
  } else if (selectedDoc && selectedDoc.status !== "ready") {
    chatDisabled =
      selectedDoc.status === "processing"
        ? "This document is still processing…"
        : "This document failed to process.";
  } else if (!selectedDoc && !hasReadyDocuments) {
    chatDisabled = "Waiting for at least one document to finish processing…";
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        documents={documents}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUploaded={handleUploaded}
        onDeleted={handleDeleted}
        userEmail={userEmail}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-border px-6 pt-3">
          <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<IconMessage />}>
            Chat
          </TabButton>
          <TabButton
            active={tab === "audit"}
            onClick={() => setTab("audit")}
            icon={<IconClipboard />}
          >
            Audit Overview
          </TabButton>
        </div>

        <div className="min-h-0 flex-1">
          {tab === "chat" ? (
            <ChatPanel
              key={selectedId ?? "all"}
              documentId={selectedId}
              documentLabel={documentLabel}
              disabled={chatDisabled}
              modelMode={modelMode}
              onModelModeChange={setModelMode}
            />
          ) : (
            <AuditDashboard
              key={selectedId ?? "none"}
              documentId={selectedId}
              documentLabel={documentLabel}
              documentReady={selectedDoc?.status === "ready"}
              modelMode={modelMode}
              onModelModeChange={setModelMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 text-sm font-medium transition-colors cursor-pointer ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-foreground/50 hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
