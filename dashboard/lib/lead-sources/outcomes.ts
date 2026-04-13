export const OUTCOME_CODES = [
  "answered_interested",
  "answered_not_interested",
  "answered_callback",
  "unanswered_voicemail",
  "unanswered_no_pickup",
  "wrong_number",
  "do_not_call",
  "language_barrier",
  "transferred_to_human",
  "failed",
] as const;

export type OutcomeCode = (typeof OUTCOME_CODES)[number];

export const OUTCOME_LABELS: Record<OutcomeCode, string> = {
  answered_interested: "Interested",
  answered_not_interested: "Not interested",
  answered_callback: "Callback requested",
  unanswered_voicemail: "Voicemail",
  unanswered_no_pickup: "No pickup",
  wrong_number: "Wrong number",
  do_not_call: "Do not call",
  language_barrier: "Language barrier",
  transferred_to_human: "Transferred",
  failed: "Failed",
};

export function isTerminalOutcome(code: OutcomeCode): boolean {
  return (
    code === "answered_interested" ||
    code === "answered_not_interested" ||
    code === "wrong_number" ||
    code === "do_not_call" ||
    code === "transferred_to_human"
  );
}

export function isRetryable(code: OutcomeCode): boolean {
  return (
    code === "unanswered_voicemail" ||
    code === "unanswered_no_pickup" ||
    code === "answered_callback" ||
    code === "failed" ||
    code === "language_barrier"
  );
}
