import { Pill } from "./ui/primitives";
import type {
  DeliverableStatus,
  InvoiceStatus,
  ProjectStatus,
  RequestStatus,
} from "../lib/data";

export function DeliverablePill({ status }: { status: DeliverableStatus }) {
  const map = {
    shared: { tone: "pending", label: "In review" },
    approved: { tone: "approved", label: "Approved" },
    changes_requested: { tone: "overdue", label: "Changes requested" },
  } as const;
  const s = map[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function InvoicePill({ status }: { status: InvoiceStatus }) {
  const map = {
    paid: { tone: "approved", label: "Paid" },
    pending: { tone: "neutral", label: "Pending" },
    overdue: { tone: "overdue", label: "Overdue" },
  } as const;
  const s = map[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function RequestPill({ status }: { status: RequestStatus }) {
  const map = {
    open: { tint: "var(--todo)", label: "To do" },
    in_progress: { tint: "var(--progress)", label: "In progress" },
    done: { tint: "var(--done)", label: "Completed" },
  } as const;
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium"
      style={{
        color: `rgb(${s.tint})`,
        borderColor: `rgb(${s.tint} / 0.3)`,
        background: `rgb(${s.tint} / 0.1)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: `rgb(${s.tint})`, boxShadow: `0 0 8px rgb(${s.tint} / 0.8)` }}
      />
      {s.label}
    </span>
  );
}

export function ProjectPill({ status }: { status: ProjectStatus }) {
  const map = {
    on_track: { tone: "approved", label: "On track" },
    at_risk: { tone: "pending", label: "At risk" },
    paused: { tone: "neutral", label: "Paused" },
    delivered: { tone: "accent", label: "Delivered" },
  } as const;
  const s = map[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function Thumb({
  seed,
  size = 56,
  className,
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundImage: `url(https://picsum.photos/seed/${seed}/240/240)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "grayscale(0.15) contrast(1.03)",
        outline: "1px solid rgb(0 0 0 / 0.1)",
        flexShrink: 0,
      }}
    />
  );
}
