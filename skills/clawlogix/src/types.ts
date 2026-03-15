export type Urgency = "normal" | "urgent" | "emergency";
export type ForceApprovalMode = "single_operator" | "two_person";

export type RequestStatus =
  | "approval_pending"
  | "approved"
  | "denied"
  | "draining"
  | "restarting"
  | "completed"
  | "failed"
  | "timeout_waiting_decision";

export type InflightSnapshot = {
  activeSessions: number;
  activeSubagents: number;
  pendingReplies: number;
  queueDepth: number;
  total: number;
  observedAt: string;
};

export type RestartRequest = {
  id: string;
  reason: string;
  urgency: Urgency;
  requester: string;
  createdAt: string;
  status: RequestStatus;
  approver?: string;
  forceUsed?: boolean;
  pendingForceApprovers?: string[];
};
