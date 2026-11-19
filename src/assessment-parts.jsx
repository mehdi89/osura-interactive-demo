import React from "react";
import { controlById } from "./controls.mjs";
import { documentFromLibrary, documentUrl } from "./document-library.mjs";
import { activeControls, derivedControlStatus, documentQualifiers, openFindings } from "./request-workflow.mjs";

// E5: the actual cited PDF page beside the note. Native browser PDF viewer, no dependency.
export function PdfViewer({ doc, page = 1, excerpt, Note }) {
  const lib = doc?.libraryId ? documentFromLibrary(doc.libraryId) : null;
  if (!doc) return <div className="pdf-viewer empty"><p>Select a citation or document to view its page.</p></div>;
  if (!lib) return <div className="pdf-viewer empty"><Note warning>{doc.name} · {doc.version} has metadata only. No file is attached, so its pages cannot be viewed or its citations verified.</Note></div>;
  return <div className="pdf-viewer">
    <div className="pdf-viewer-head"><b>{doc.name} · {doc.version}</b><span>Page {page} of {lib.pages.length} · synthetic demo file</span><a href={documentUrl(lib, page)} target="_blank" rel="noreferrer">Open in new tab</a></div>
    <iframe key={`${lib.file}-${page}`} title={`${doc.name} page ${page}`} src={documentUrl(lib, page)} />
    <details><summary>Extracted page text</summary><p className="pdf-page-text">{excerpt ? highlight(lib.pages[page - 1], excerpt) : lib.pages[page - 1]}</p></details>
  </div>;
}
const highlight = (text, excerpt) => {
  const at = text.indexOf(excerpt);
  return at < 0 ? text : <>{text.slice(0, at)}<mark>{excerpt}</mark>{text.slice(at + excerpt.length)}</>;
};

export const AiBadge = ({ run }) => <span className="ai-badge" title={`${run?.provider || "simulated"} · ${run?.model || "osura-sim-v0"}`}>{run?.live ? "AI" : "Simulated AI"} · {run?.model || "osura-sim-v0"}{run ? ` · ${run.status}` : ""}</span>;

// D1: one memo built from current assessment data. Used on the decision step, in the pack and in print.
export function buildMemo(record, engagement) {
  const controls = activeControls(record);
  return {
    context: { customer: engagement.client, supplier: engagement.supplier, service: record.scope?.service || engagement.service, plan: record.scope?.plan },
    risk: { tier: record.scope?.risk, calculated: record.scope?.calculated?.tier, override: record.scope?.overrideReason, drivers: record.scope?.calculated?.drivers || [], rulesVersion: record.scope?.calculated?.rulesVersion },
    controls: controls.map(row => ({ id: row.controlId, name: row.name, conclusion: record.controlReviews?.[row.controlId]?.conclusion || "Not concluded", derived: derivedControlStatus(record, row.controlId).status })),
    limitations: record.evidence.filter(doc => doc.review).map(doc => ({ doc: `${doc.name} · ${doc.version}`, doesNotProve: doc.review.doesNotProve, qualifiers: documentQualifiers(record, doc) })),
    findings: record.findings || [],
    recommendation: record.recommendation,
    qa: record.qa, challenges: record.challenges || [],
    nextActions: [
      ...openFindings(record).map(f => `${f.owner}: ${f.action} (due ${f.due})`),
      ...(record.qa?.condition ? [`QA condition: ${record.qa.condition}`] : []),
    ],
  };
}

export function DecisionMemo({ memo, Badge, Fields }) {
  return <div className="decision-memo">
    <section><h3>Context and inherent risk</h3><Fields items={[["Service", `${memo.context.supplier} · ${memo.context.service}`], ["Review plan", memo.context.plan || "Not confirmed"],
      ["CTP inherent risk", memo.risk.tier ? `${memo.risk.tier}${memo.risk.override ? ` (rules calculated ${memo.risk.calculated}; override: ${memo.risk.override})` : ""}` : "Pending"], ["Rule version", memo.risk.rulesVersion || "Not recorded"]]} />
      {memo.risk.drivers.length > 0 && <ul className="memo-drivers">{memo.risk.drivers.map((d, i) => <li key={i}><b>{d.input}</b> → {d.effect}{d.detail ? ` · ${d.detail}` : ""}</li>)}</ul>}</section>
    <section><h3>Control conclusions</h3><ul className="memo-controls">{memo.controls.map(row => <li key={row.id}><span>{row.id} · {row.name}</span><Badge>{row.conclusion}</Badge></li>)}</ul></section>
    <section><h3>Evidence limitations</h3>{memo.limitations.length ? <ul>{memo.limitations.map((l, i) => <li key={i}><b>{l.doc}</b>{l.qualifiers.length ? ` [${l.qualifiers.join(", ")}]` : ""}: does not prove {l.doesNotProve}</li>)}</ul> : <p>No reviewed documents.</p>}</section>
    <section><h3>Findings</h3>{memo.findings.length ? <ul>{memo.findings.map(f => <li key={f.id}><Badge>{f.severity}</Badge> <b>{f.issue}</b> · {f.controlIds.join(", ")} · {f.state} · {f.owner}, due {f.due}. Action: {f.action}</li>)}</ul> : <p>No findings raised.</p>}</section>
    <section><h3>Recommendation and independent QA</h3><Fields items={[["Recommendation", memo.recommendation ? `${memo.recommendation.outcome} · ${memo.recommendation.actor}` : "Not recorded"], ["Rationale", memo.recommendation?.rationale || "—"],
      ["Independent QA", memo.qa ? `${memo.qa.outcome} · ${memo.qa.actor}` : "Not recorded"], ["QA rationale", memo.qa?.rationale || "—"], ...(memo.qa?.condition ? [["QA condition", memo.qa.condition]] : []),
      ["QA challenges", memo.challenges.length ? memo.challenges.map(ch => `${ch.text} → ${ch.response?.rationale || "unanswered"}`).join(" | ") : "None"]]} /></section>
    {memo.nextActions.length > 0 && <section><h3>Next actions</h3><ul>{memo.nextActions.map((a, i) => <li key={i}>{a}</li>)}</ul></section>}
  </div>;
}

// D5: the same frozen snapshot exported as JSON and printed (Save as PDF) from one place, for both flows.
export function PackExport({ name, pack, Button, downloadJSON, Note }) {
  return <div className="pack-export">
    <div className="request-flow-actions"><Button primary icon="Printer" onClick={() => window.print()}>Print / Save PDF</Button><Button icon="Download" onClick={() => downloadJSON(name, pack)}>Download JSON</Button></div>
    <Note>Both exports come from the same frozen snapshot. Print uses your browser’s “Save as PDF”; no reporting service is involved in this demo.</Note>
  </div>;
}

export const controlName = id => controlById(id)?.name || id;
