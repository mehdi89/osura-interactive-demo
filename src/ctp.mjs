export const IMPACT_SCORES = Object.freeze({ "N/A": 0, Low: 1, Medium: 3, High: 5 });
export const IMPACT_CHOICES = [...Object.keys(IMPACT_SCORES), "Unknown"];
export const IMPACT_SOURCE = "CTP_17_Questions_Simple_Guide (1).docx · supplied 8 November 2026";
export const IMPACT_GROUPS = {
  Confidentiality: "What happens if sensitive information is disclosed to someone who should not see it?",
  Integrity: "What happens if information is changed, corrupted or no longer trustworthy?",
  Availability: "How serious is the disruption if the supplier’s service is unavailable for different lengths of time?",
};
const IMPACT_COUNTS = { Confidentiality: 5, Integrity: 5, Availability: 7 };

export function hasImpactQuestionSet(questions) {
  return questions.length === 17 && new Set(questions.map(question => question.id)).size === 17
    && Object.entries(IMPACT_COUNTS).every(([dimension, count]) => questions.filter(question => question.dimension === dimension).length === count);
}

export function summarizeImpact(questions, answers = {}) {
  const categories = Object.keys(IMPACT_GROUPS).map(dimension => {
    const rows = questions.filter(question => question.dimension === dimension);
    const complete = rows.length === IMPACT_COUNTS[dimension] && rows.every(question => Object.hasOwn(IMPACT_SCORES, answers[question.id]));
    return { dimension, complete, score: complete ? Math.max(...rows.map(question => IMPACT_SCORES[answers[question.id]])) : null };
  });
  const complete = hasImpactQuestionSet(questions) && categories.every(category => category.complete);
  const score = complete ? Math.max(...categories.map(category => category.score)) : null;
  const label = score === null ? "Incomplete" : score === 5 ? "High / Significant" : score === 3 ? "Medium" : score === 1 ? "Low" : "N/A";
  return { complete, score, label, categories };
}

export function firstMissingImpact(questions, answers = {}) {
  return questions.find(question => !IMPACT_CHOICES.includes(answers[question.id]));
}

export function snapshotImpact(questions, answers = {}) {
  if (!hasImpactQuestionSet(questions)) throw new Error("The CTP guide requires 17 questions in 5/5/7 groups.");
  const missing = firstMissingImpact(questions, answers);
  if (missing) throw new Error(`Answer the business-impact question: ${missing.label}`);
  return { source: IMPACT_SOURCE, questions: questions.map(({ id, dimension, label, canonicalCode }) => ({ id, dimension, label, canonicalCode, answer: answers[id] })), summary: summarizeImpact(questions, answers) };
}
