// Which text-emotion results are shown in the interview feedback, and the suggestions tied to them.
//
// The GoEmotions model scores 28 labels. Most are noise for interview practice, so the main
// feedback shows only labels on this allowlist, only when they reach the model's own detection
// threshold, and at most MAX_DISPLAYED_EMOTIONS of them. The full output stays available under
// "Technical details".
//
// To change what is shown, edit RELEVANT_EMOTIONS (and give each label a suggestion below).
// Labels keep the model's names: they describe emotional *wording* in the transcript and are
// never renamed as confidence, anxiety, passion or knowledge.

import type { TextEmotionResult } from "./types";

export interface EmotionRule {
  /** Shown in the feedback, the model's label with a capital letter. */
  display: string;
  /** Why it is on the allowlist (documentation only, not shown as a verdict). */
  group: "tone of the wording" | "engagement in the wording" | "neutral wording";
  /**
   * Shown when this label is displayed. Cautious wording about the *words*, never about the
   * candidate's feelings or personality.
   */
  suggestion: string;
}

export const RELEVANT_EMOTIONS: Record<string, EmotionRule> = {
  approval: {
    display: "Approval",
    group: "tone of the wording",
    suggestion: "Your wording may sound agreeable. You could try pairing agreement with a specific reason or example.",
  },
  optimism: {
    display: "Optimism",
    group: "tone of the wording",
    suggestion:
      "Your wording may sound hopeful about outcomes. You could try backing that up with a concrete result or measure.",
  },
  nervousness: {
    display: "Nervousness",
    group: "tone of the wording",
    suggestion:
      "Some of your wording may sound uncertain. You could try stating your main point plainly before adding caveats.",
  },
  admiration: {
    display: "Admiration",
    group: "engagement in the wording",
    suggestion:
      "Your wording may sound appreciative of others. You could try also making your own part in the work clear.",
  },
  curiosity: {
    display: "Curiosity",
    group: "engagement in the wording",
    suggestion:
      "Your wording may sound inquisitive. You could try making sure each question you raise leads to an answer or next step.",
  },
  excitement: {
    display: "Excitement",
    group: "engagement in the wording",
    suggestion: "Your wording may sound enthusiastic. You could try pairing that energy with specific details.",
  },
  gratitude: {
    display: "Gratitude",
    group: "engagement in the wording",
    suggestion:
      "Your wording includes thanks. You could try keeping it brief and moving quickly to the substance of the answer.",
  },
  neutral: {
    display: "Neutral",
    group: "neutral wording",
    suggestion:
      "Your wording may read as neutral and factual. You could try adding a short example to make the answer easier to remember.",
  },
};

export const MAX_DISPLAYED_EMOTIONS = 3;

export const NO_SIGNAL_TEXT = "No clear emotion signal detected.";
export const NO_SUGGESTION_TEXT = "No emotion-based suggestion is available for this answer.";

export interface DisplayedEmotion {
  label: string;
  display: string;
  score: number;
}

/**
 * Allowlisted labels at or above the model's detection threshold, highest first, at most
 * MAX_DISPLAYED_EMOTIONS. Labels below the threshold are never shown or used.
 */
export function selectDisplayedEmotions(result: TextEmotionResult): DisplayedEmotion[] {
  return Object.entries(result.scores)
    .filter(([label, score]) => label in RELEVANT_EMOTIONS && score >= result.threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DISPLAYED_EMOTIONS)
    .map(([label, score]) => ({ label, display: RELEVANT_EMOTIONS[label].display, score }));
}

/** One suggestion per displayed label, from the mapping above. Empty when nothing is displayed. */
export function suggestionsFor(displayed: DisplayedEmotion[]): string[] {
  return displayed.map((e) => RELEVANT_EMOTIONS[e.label].suggestion);
}
