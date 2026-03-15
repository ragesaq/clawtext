import type { ClawLogixPolicy } from "./policy.js";

const MUTATING_COMMAND_PREFIXES = [
  "request restart",
  "approve restart",
  "deny restart",
  "force restart",
  "run restart",
  "restart force-mode",
  "safety resume",
];

export function isMutatingCommand(cmd: string): boolean {
  return MUTATING_COMMAND_PREFIXES.some((p) => cmd.startsWith(p));
}

export function assertOperatorAllowed(actor: string, cmd: string, policy: ClawLogixPolicy): void {
  if (!isMutatingCommand(cmd)) return;
  const operators = policy.approval?.operators ?? [];
  if (operators.length === 0) return; // open when unset
  if (!operators.includes(actor)) {
    throw new Error(`Actor '${actor}' is not an approved operator for command: ${cmd}`);
  }
}
