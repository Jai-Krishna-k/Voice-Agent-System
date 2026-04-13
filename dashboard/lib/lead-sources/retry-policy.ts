import type { OutcomeCode } from "./outcomes";

export interface RetryDecision {
  nextStatus: "new" | "called" | "failed" | "do_not_call";
  nextRetryAt: Date | null;
  incrementAttempts: boolean;
}

export function decideRetry(
  outcome: OutcomeCode,
  attempts: number,
  maxAttempts: number,
  followUpAt: string | null = null
): RetryDecision {
  const now = Date.now();
  const hrs = (n: number) => new Date(now + n * 60 * 60 * 1000);
  const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  switch (outcome) {
    case "answered_interested":
    case "answered_not_interested":
    case "transferred_to_human":
      return { nextStatus: "called", nextRetryAt: null, incrementAttempts: true };

    case "wrong_number":
    case "do_not_call":
      return { nextStatus: "do_not_call", nextRetryAt: null, incrementAttempts: true };

    case "answered_callback":
      if (attempts + 1 >= maxAttempts) {
        return { nextStatus: "called", nextRetryAt: null, incrementAttempts: true };
      }
      return {
        nextStatus: "new",
        nextRetryAt: followUpAt ? new Date(followUpAt) : hrs(3),
        incrementAttempts: true,
      };

    case "unanswered_no_pickup":
    case "unanswered_voicemail":
      if (attempts + 1 >= maxAttempts) {
        return { nextStatus: "failed", nextRetryAt: null, incrementAttempts: true };
      }
      return {
        nextStatus: "new",
        nextRetryAt: new Date(days(1).getTime() + 3 * 60 * 60 * 1000),
        incrementAttempts: true,
      };

    case "language_barrier":
      return { nextStatus: "failed", nextRetryAt: null, incrementAttempts: true };

    case "failed":
    default:
      if (attempts + 1 >= maxAttempts) {
        return { nextStatus: "failed", nextRetryAt: null, incrementAttempts: true };
      }
      return {
        nextStatus: "new",
        nextRetryAt: hrs(1),
        incrementAttempts: true,
      };
  }
}
