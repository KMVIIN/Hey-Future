import type { Locale } from "./i18n";

export type WorkflowStepKind =
  | "research"
  | "open_url"
  | "contact_lookup"
  | "calendar_read"
  | "calendar_write"
  | "email_read"
  | "email_draft"
  | "email_send"
  | "booking"
  | "payment"
  | "note";

export type EmailApprovalPayload = {
  to?: string;
  from?: string;
  subject?: string;
  body?: string;
};

export type WorkflowStep = {
  id: string;
  kind: WorkflowStepKind;
  title: string;
  detail?: string;
  url?: string;
  requiresApproval?: boolean;
  payload?: EmailApprovalPayload;
  status: "queued" | "ready" | "waiting_approval" | "approved" | "done";
};

export type Workflow = {
  id: string;
  title: string;
  summary: string;
  locale: Locale;
  createdAt: string;
  status: "draft" | "awaiting_approval" | "ready" | "done";
  source: "ai" | "local";
  steps: WorkflowStep[];
};

export type Approval = {
  id: string;
  workflowId: string;
  stepId: string;
  kind: WorkflowStepKind;
  title: string;
  detail?: string;
  payload?: EmailApprovalPayload;
  createdAt: string;
  status: "pending" | "approved" | "declined";
};

const HIGH_RISK = new Set<WorkflowStepKind>(["booking", "payment", "email_send"]);

export function normalizeWorkflow(input: Partial<Workflow>, locale: Locale, source: "ai" | "local" = "ai"): Workflow {
  const now = new Date().toISOString();
  const steps = (input.steps || []).map((raw, index) => {
    const kind = (raw.kind || "note") as WorkflowStepKind;
    const requiresApproval = Boolean(raw.requiresApproval || HIGH_RISK.has(kind));
    return {
      id: raw.id || `step-${Date.now()}-${index}`,
      kind,
      title: raw.title || (locale === "th" ? "เตรียมงาน" : locale === "fr" ? "Préparer l’action" : "Prepare action"),
      detail: raw.detail || "",
      url: raw.url,
      payload: raw.payload,
      requiresApproval,
      status: requiresApproval ? "waiting_approval" : (raw.status || "ready"),
    } satisfies WorkflowStep;
  });
  return {
    id: input.id || `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title || (locale === "th" ? "แผนงานใหม่" : locale === "fr" ? "Nouveau workflow" : "New workflow"),
    summary: input.summary || "",
    locale,
    createdAt: input.createdAt || now,
    status: steps.some((s) => s.requiresApproval && s.status === "waiting_approval") ? "awaiting_approval" : "ready",
    source,
    steps,
  };
}

export function approvalsForWorkflow(workflow: Workflow): Approval[] {
  return workflow.steps
    .filter((step) => step.requiresApproval && step.status === "waiting_approval")
    .map((step) => ({
      id: `approval-${workflow.id}-${step.id}`,
      workflowId: workflow.id,
      stepId: step.id,
      kind: step.kind,
      title: step.title,
      detail: step.detail,
      payload: step.payload,
      createdAt: new Date().toISOString(),
      status: "pending" as const,
    }));
}

export function applyApproval(workflow: Workflow, approval: Approval, approved: boolean, executed = false): Workflow {
  const steps = workflow.steps.map((step) => {
    if (step.id !== approval.stepId) return step;
    return { ...step, status: executed ? "done" as const : approved ? "approved" as const : "queued" as const };
  });
  const stillWaiting = steps.some((step) => step.status === "waiting_approval");
  const allDone = steps.every((step) => step.status === "done" || step.status === "approved");
  return { ...workflow, steps, status: stillWaiting ? "awaiting_approval" : allDone ? "done" : "ready" };
}
