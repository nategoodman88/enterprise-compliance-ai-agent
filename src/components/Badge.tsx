import type { AuditVerdict, DocumentStatus } from "@/lib/types";

const tone = {
  neutral: "bg-neutral-soft text-foreground/70",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

export function Badge({
  children,
  color = "neutral",
}: {
  children: React.ReactNode;
  color?: keyof typeof tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone[color]}`}
    >
      {children}
    </span>
  );
}

const STATUS_MAP: Record<DocumentStatus, { label: string; color: keyof typeof tone }> = {
  processing: { label: "Processing", color: "accent" },
  ready: { label: "Ready", color: "success" },
  error: { label: "Error", color: "danger" },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, color } = STATUS_MAP[status];
  return <Badge color={color}>{label}</Badge>;
}

const VERDICT_MAP: Record<AuditVerdict, { label: string; color: keyof typeof tone }> = {
  pass: { label: "Pass", color: "success" },
  partial: { label: "Partial", color: "warning" },
  fail: { label: "Fail", color: "danger" },
  not_applicable: { label: "N/A", color: "neutral" },
};

export function VerdictBadge({ verdict }: { verdict: AuditVerdict }) {
  const { label, color } = VERDICT_MAP[verdict];
  return <Badge color={color}>{label}</Badge>;
}
