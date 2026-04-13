import type { OutcomeCode } from "./outcomes";

export interface FallbackResult {
  outcome: OutcomeCode;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  confidence: number;
}

const NEG = /\b(not interested|don'?t call|stop calling|remove me|do not call)\b/i;
const POS = /\b(interested|tell me more|sounds good|sign me up|book|schedule)\b/i;
const WRONG = /\b(wrong number|who is this|never asked|didn'?t sign up)\b/i;
const VM = /\b(voicemail|leave a message|after the beep|record your message)\b/i;
const CALLBACK = /\b(call me (back|later)|busy right now|not a good time)\b/i;

export function ruleBasedClassify(transcript: string, duration: number): FallbackResult {
  const t = transcript || "";
  const shortCall = duration < 8;

  if (WRONG.test(t)) {
    return { outcome: "wrong_number", sentiment: "neutral", summary: "Wrong number.", confidence: 0.5 };
  }
  if (NEG.test(t)) {
    return { outcome: "answered_not_interested", sentiment: "negative", summary: "Lead said not interested.", confidence: 0.5 };
  }
  if (POS.test(t)) {
    return { outcome: "answered_interested", sentiment: "positive", summary: "Lead expressed interest.", confidence: 0.5 };
  }
  if (CALLBACK.test(t)) {
    return { outcome: "answered_callback", sentiment: "neutral", summary: "Lead asked to be called back.", confidence: 0.5 };
  }
  if (VM.test(t) || shortCall) {
    return { outcome: "unanswered_voicemail", sentiment: "neutral", summary: "Hit voicemail.", confidence: 0.4 };
  }
  return { outcome: "unanswered_no_pickup", sentiment: "neutral", summary: "No pickup.", confidence: 0.3 };
}
