import { controlById } from "./controls.mjs";
import { documentFromLibrary } from "./document-library.mjs";

// AI seam for AI1 (evidence notes), AI2 (finding + follow-up drafts) and AI4 (claim vs evidence).
// Every call returns a run record: { id, task, provider, model, live, status, startedAt, finishedAt, input, output, error }.
// status: "ok" | "abstained" | "failed". Callers must show failures and abstentions honestly and require human acceptance.
// To plug in a real model, call setAiProvider({ id, model, live: true, evidenceNotes, draftFindings, compareClaim })
// with server-side functions that return the same output shapes. Nothing else in the app changes.

const sentences = text => text.match(/[^.]+\./g)?.map(s => s.trim()) || [];
const pagesOf = docs => docs.flatMap(doc => {
  const lib = documentFromLibrary(doc.libraryId);
  return lib ? lib.pages.map((text, i) => ({ doc, page: i + 1, text })) : [];
});

export const simulatedProvider = {
  id: "simulated", model: "osura-sim-v0", live: false,
  // AI1: propose cited evidence notes for one control from extracted page text.
  async evidenceNotes({ controlId, documents }) {
    const control = controlById(controlId);
    if (!control) throw new Error("Unknown control.");
    const pages = pagesOf(documents);
    if (!pages.length) throw new Error("No extracted document text is available for this assessment.");
    const notes = [];
    for (const { doc, page, text } of pages) for (const sentence of sentences(text))
      if (control.keywords.some(k => sentence.toLowerCase().includes(k.toLowerCase())))
        notes.push({ documentId: doc.id, page, excerpt: sentence, shows: `${doc.name} ${doc.version} states this for ${control.name.toLowerCase()}.` });
    const gap = notes.some(n => /not performed|carved out|remains open|No technical failover|exception/i.test(n.excerpt));
    const stale = notes.length > 0 && notes.every(n => documents.find(d => d.id === n.documentId)?.status === "Draft");
    const hint = !notes.length ? "Missing" : gap || stale ? "Insufficient" : "Supported";
    return { notes: notes.slice(0, 4), conclusionHint: hint, reasoning: !notes.length ? "No passage in the reviewed documents addresses this control." : `${notes.length} passage(s) address ${control.name.toLowerCase()}${gap ? "; at least one states a gap or exception" : ""}${stale ? "; only draft sources" : ""}.` };
  },
  // AI2: draft findings and supplier follow-up questions from control gaps.
  async draftFindings({ gaps }) {
    return {
      findings: gaps.map(gap => {
        const control = controlById(gap.controlId);
        return { controlIds: [gap.controlId], issue: `${control.name}: evidence is ${gap.conclusion.toLowerCase()}`, missingRequirement: control.expectation,
          severity: gap.conclusion === "Contradicted" ? "High" : "Medium", severityRationale: `${gap.conclusion} evidence for a control applied by ${gap.ruleId || "analyst scope"}.`,
          action: `Obtain ${control.expectation.toLowerCase()}.` };
      }),
      followUps: gaps.map(gap => ({ controlId: gap.controlId, question: `Please provide ${controlById(gap.controlId).expectation.toLowerCase()} for the contracted service.` })),
    };
  },
  // AI4: compare an editable supplier claim with cited passages. Changing either changes the result.
  async compareClaim({ claim, citations }) {
    if (!citations.length) return { verdict: "No evidence", reasoning: "No cited passage exists for this control; the claim cannot be checked.", uncertainty: "High" };
    const nums = s => (s.match(/\d+(?:\.\d+)?\s*(?:hours?|days?|minutes?)/gi) || []).map(n => n.toLowerCase().replace(/s$/, "").replace(/\s+/, " "));
    const claimNums = nums(claim);
    const evidenceNums = citations.flatMap(c => nums(c.excerpt));
    const words = claim.toLowerCase().match(/[a-z]{5,}/g) || [];
    const overlap = citations.filter(c => words.filter(w => c.excerpt.toLowerCase().includes(w)).length >= 2);
    if (claimNums.length && evidenceNums.length && !claimNums.some(n => evidenceNums.includes(n)))
      return { verdict: "Contradicts", reasoning: `The claim states ${claimNums.join(", ")}; the cited evidence states ${evidenceNums.join(", ")}.`, uncertainty: "Low" };
    if (overlap.length) return { verdict: "Supports", reasoning: `${overlap.length} cited passage(s) state the same facts as the claim.`, uncertainty: claimNums.length ? "Low" : "Medium" };
    return { verdict: "Insufficient", reasoning: "The cited passages do not address what the claim states.", uncertainty: "Medium" };
  },
};

let provider = simulatedProvider;
export const setAiProvider = next => { provider = next; };
export const aiProvider = () => provider;
const tasks = { "evidence-notes": "evidenceNotes", "draft-findings": "draftFindings", "compare-claim": "compareClaim" };

export async function runAi(task, input, { delay = 350 } = {}) {
  const run = { id: `run-${crypto.randomUUID().slice(0, 8)}`, task, provider: provider.id, model: provider.model, live: !!provider.live, startedAt: new Date().toISOString(), input: structuredClone(input) };
  try {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    const output = await provider[tasks[task]](input);
    const empty = task === "evidence-notes" ? !output.notes.length : task === "draft-findings" ? !output.findings.length : false;
    return { ...run, status: empty ? "abstained" : "ok", output, finishedAt: new Date().toISOString() };
  } catch (error) {
    return { ...run, status: "failed", error: error.message, output: null, finishedAt: new Date().toISOString() };
  }
}
