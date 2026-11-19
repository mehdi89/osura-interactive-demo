import React, { useState } from "react";
import {
  activeControls, derivedControlStatus, documentQualifiers, effectiveEngagement, OUTCOMES, openFindings, QA_OUTCOMES, qaPassed,
  requestAssessment, requestProgress, respondAsSupplier, SEVERITIES, transitionRequest, uncoveredGaps,
} from "./request-workflow.mjs";
import { calculateRisk, CONTROL_CONCLUSIONS, CONTROL_LIBRARY, controlById, TIERS } from "./controls.mjs";
import { DOCUMENT_LIBRARY } from "./document-library.mjs";
import { runAi } from "./ai.mjs";
import { AiBadge, buildMemo, DecisionMemo, PackExport, PdfViewer } from "./assessment-parts.jsx";
import "./request-assessment.css";

const sections = [["triage", "Intake & risk"], ["controls", "Controls"], ["evidence", "Evidence & findings"], ["recommendation", "Recommendation"], ["qa", "Independent QA"], ["decision", "Customer decision"], ["monitoring", "Decision pack & follow-up"]];
// ponytail: published CTP plan versions from the scenario; read from policyVersions when plans become editable.
const REVIEW_PLANS = ["Standard v2", "Enhanced v3"];
const sectionFor = action => ({ scope: "triage", clarification: "triage", pack: "monitoring", findings: "evidence" }[action] || action);
const instructions = {
  triage: ["Review submitted request", "Read the submitted facts, clarify anything missing, then confirm scope and the calculated CTP inherent risk."],
  clarification: ["Answer the analyst’s question", "Your reply stays with this service. If you confirm an Unknown fact, the risk is recalculated."],
  evidence: ["Review evidence for each control", "Add documents, cite the exact page, conclude each applied control and raise a finding for every gap."],
  findings: ["Raise a finding for each gap", "Every insufficient, contradicted or missing control needs a finding before the recommendation."],
  recommendation: ["Record your recommendation", "Answer any QA challenge, then propose the customer outcome from the reviewed evidence and findings."],
  qa: ["Complete independent QA", "A different analyst with QA permission checks reasoning against the cited sources, side by side."],
  decision: ["Record the customer decision", "The designated customer Decision Owner chooses the outcome after independent QA passes."],
  monitoring: ["Decision pack and follow-up", "The signed pack stays frozen. Findings and conditions close only on new, cited evidence."],
};
const FACT_LABELS = ["Personal or payment data", "Connects to production systems", "Outage interrupts a critical journey", "Replaceable within one business day"];
const AUTHOR_ACTIONS = ["scope", "addControl", "removeControl", "evidence", "reviewDocument", "cite", "claim", "aiDecision", "conclude", "finding", "recommend", "respondChallenge"];
const isGap = review => ["Insufficient", "Contradicted", "Missing"].includes(review?.conclusion);

export default function RequestAssessment(c) {
  const { state, data, engagement, user, update, navigate, notify, ui } = c;
  const { Card, Button, Badge, Note, Fields, ImpactAnswers, downloadJSON } = ui;
  const record = requestAssessment(state, engagement);
  const receipt = state.extraEngagements?.find(row => row.id === engagement.id && row.workspaceId === engagement.workspaceId && row.receipt === engagement.receipt) || engagement;
  const progress = requestProgress(record);
  const routeSection = { O03: "evidence", O04: "evidence", C13: "evidence", O08: "qa", C06: "decision", C07: "monitoring", C08: "monitoring", O09: "monitoring", O12: "triage" }[c.screen.id];
  const [section, setSection] = useState(routeSection || sectionFor(progress.action));
  const [error, setError] = useState("");
  const [view, setView] = useState(null);
  const [openControl, setOpenControl] = useState(null);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);
  const analyst = user.role === "analyst";
  const followUp = !!record.decision && ((record.decision.condition && !record.conditionClosed) || openFindings(record).length > 0);
  const canWork = analyst && (!record.decision || followUp);
  const decisionOwner = user.role === "customer" && user.actorId === engagement.decisionOwnerId;
  const drafts = state.requestDrafts?.[engagement.id]?.[user.id] || {};
  const controls = activeControls(record);
  const asks = record.supplierAsks || [];
  const authors = record.events.filter(row => AUTHOR_ACTIONS.includes(row.workflowAction)).map(row => row.actorId);
  const mayQA = analyst && user.canQA && !authors.includes(user.actorId);
  const eligibleQA = c.demoUsers?.filter(person => person.active && person.role === "analyst" && person.canQA && person.workspaceIds?.includes(engagement.workspaceId) && !authors.includes(person.actorId));
  const ctx = () => ({ ...data, workspace: data.workspaceProfiles?.[engagement.workspaceId] || data.workspace });
  const clearDrafts = keys => ({ requestDrafts: { ...state.requestDrafts, [engagement.id]: { ...state.requestDrafts?.[engagement.id], [user.id]: { ...drafts, ...Object.fromEntries(keys.map(k => [k, null])) } } } });
  const edit = (key, values) => {
    setError("");
    update({ requestDrafts: { ...state.requestDrafts, [engagement.id]: { ...state.requestDrafts?.[engagement.id], [user.id]: { ...drafts, [key]: { ...drafts[key], ...values } } } } });
  };
  // Applies one or more workflow actions atomically (e.g. an AI citation plus its proposal decision).
  const apply = (steps, { draftKeys = [], stay = true, message = "Saved for this service in the current demo session." } = {}) => {
    try {
      let current = state; const events = [];
      for (const [action, values] of steps) {
        const patch = transitionRequest(current, ctx(), engagement.id, action, values);
        current = { ...current, ...patch }; events.push(...patch.events);
      }
      update({ requestAssessments: current.requestAssessments, events, ...clearDrafts(draftKeys) });
      setError(""); setEditing(null);
      if (!stay) setSection(sectionFor(requestProgress(current.requestAssessments[engagement.id]).action));
      notify(message);
      return true;
    } catch (err) { setError(err.message); return false; }
  };
  const run = (action, values, draftKey = action, stay = true) => apply([[action, values]], { draftKeys: [draftKey], stay });
  const ai = async (task, input, meta, key) => {
    setBusy(key); setError("");
    const result = await runAi(task, input);
    setBusy(null);
    apply([["aiRun", { run: result, ...meta }]], { message: result.status === "ok" ? "Simulated AI proposal ready for your review." : result.status === "abstained" ? "Simulated AI abstained: nothing to propose." : `Simulated AI failed: ${result.error}` });
  };
  const form = (key, fields, submit, label, defaults = {}) => {
    const values = { ...defaults, ...drafts[key] };
    return <form className="request-flow-form" noValidate onSubmit={event => {
      event.preventDefault();
      const missing = fields.find(([name, , , optional]) => !optional && !String(values[name] || "").trim());
      if (missing) { setError(`Complete “${missing[1]}” to continue.`); event.currentTarget.querySelector(`[name="${missing[0]}"]`)?.focus(); return; }
      submit(values);
    }}>
      {fields.map(([name, fieldLabel, choices, optional]) => <label className="field" key={name}><span>{fieldLabel}{optional ? " (optional)" : ""}</span>{Array.isArray(choices)
        ? <select name={name} required={!optional} value={values[name] || ""} onChange={e => edit(key, { [name]: e.target.value })}><option value="">Choose…</option>{choices.map(choice => Array.isArray(choice) ? <option key={choice[0]} value={choice[0]}>{choice[1]}</option> : <option key={choice}>{choice}</option>)}</select>
        : choices === "textarea" ? <textarea name={name} rows={3} required={!optional} value={values[name] || ""} onChange={e => edit(key, { [name]: e.target.value })}/>
          : <input name={name} type={choices || "text"} required={!optional} value={values[name] || ""} onChange={e => edit(key, { [name]: e.target.value })}/>}</label>)}
      <small>Draft kept for this service and demo user until refresh.</small>
      <Button primary type="submit">{label}</Button>
    </form>;
  };
  const customerStep = ["clarification", "decision"].includes(progress.action) || (progress.action === "monitoring" && !followUp);
  const supplierStep = progress.nextOwner === "Supplier contact";
  const qaStep = progress.action === "qa";
  const myTurn = supplierStep ? user.role === "supplier" : customerStep ? decisionOwner : qaStep ? mayQA : analyst;
  const changeSection = key => {
    setSection(key); setError("");
    requestAnimationFrame(() => document.getElementById("request-stage-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const live = effectiveEngagement(engagement, record);
  const calculated = calculateRisk(live);
  const unresolved = Object.entries(live.answers || {}).filter(([, answer]) => answer === "Unknown").map(([key]) => key);
  const factLabel = key => engagement.questions?.[key] || FACT_LABELS[key] || `Business fact ${Number(key) + 1}`;
  const historyRecord = value => value ? `${value.actor || "Recorded reviewer"} · ${new Date(value.at).toLocaleString()}` : "Not recorded";
  const doc = id => record.evidence.find(row => row.id === id);
  const showCitation = cite => setView({ documentId: cite.documentId, page: cite.page, excerpt: cite.excerpt });
  const viewer = <div className="evidence-viewer-pane"><PdfViewer doc={view ? doc(view.documentId) : record.evidence.find(row => row.libraryId)} page={view?.page || 1} excerpt={view?.excerpt} Note={Note}/></div>;
  const currentAction = instructions[progress.action] || instructions.triage;
  const stillMissing = controls.filter(row => !["Supported", "Not applicable"].includes(record.controlReviews[row.controlId]?.conclusion) && derivedControlStatus(record, row.controlId).status !== "Supported");
  const memo = buildMemo(record, engagement);

  const findingForm = (row, cites) => {
    const fKey = `finding-${row.controlId}`;
    const values = drafts[fKey] || {};
    const also = values.also || [];
    return <>{form(fKey, [["issue", "Precise issue"], ["severity", "Severity", SEVERITIES], ["severityRationale", "Severity rationale", "textarea"], ["action", "Recommended action", "textarea"], ["owner", "Accountable owner"], ["due", "Due date", "date"],
      ["citationId", "Cited evidence", cites.map(ci => [ci.id, `p.${ci.page} · ${ci.excerpt.slice(0, 60)}`]), true], ["missingRequirement", "Missing requirement (if no evidence exists)", "textarea", true]],
    v => {
      const draftRun = record.aiRuns.find(r => r.id === v.runId);
      const steps = [["finding", { ...v, controlIds: [row.controlId, ...also], citationIds: v.citationId ? [v.citationId] : [], runId: v.runId, draft: draftRun?.output.findings[0] || null }]];
      if (draftRun) steps.push(["aiDecision", { runId: draftRun.id, index: 0, decision: ["issue", "action", "severity"].every(k => draftRun.output.findings[0][k] === v[k]) ? "accepted" : "edited", original: draftRun.output.findings[0], final: v, rationale: "Human-reviewed finding draft." }]);
      apply(steps, { draftKeys: [fKey] });
    }, "Raise finding")}
    {controls.length > 1 && <fieldset className="finding-also"><legend>Also covers (one finding may cover related controls)</legend>{controls.filter(o => o.controlId !== row.controlId).map(o => <label key={o.controlId}><input type="checkbox" checked={also.includes(o.controlId)} onChange={e => edit(fKey, { also: e.target.checked ? [...also, o.controlId] : also.filter(id => id !== o.controlId) })}/> {o.controlId}</label>)}</fieldset>}</>;
  };

  // One control: expectation, claim vs evidence, citations, simulated AI, conclusion and findings (E2–E4, AI1/AI2/AI4, N1, F1).
  const controlPanel = row => {
    const review = record.controlReviews[row.controlId];
    const derived = derivedControlStatus(record, row.controlId);
    const cites = record.citations.filter(cite => cite.controlId === row.controlId);
    const claims = record.claims.filter(cl => cl.controlId === row.controlId);
    const runs = record.aiRuns.filter(r => r.controlId === row.controlId);
    const notesRun = runs.filter(r => r.task === "evidence-notes").at(-1);
    const compareRun = runs.filter(r => r.task === "compare-claim").at(-1);
    const draftRun = runs.filter(r => r.task === "draft-findings" && r.status === "ok").at(-1);
    const decided = i => record.aiDecisions.find(d => d.runId === notesRun?.id && d.index === i);
    const findings = record.findings.filter(f => f.controlIds.includes(row.controlId));
    const reviewed = record.evidence.filter(d => d.review);
    const open = openControl === row.controlId;
    return <article className={`control-panel ${open ? "is-open" : ""}`} key={row.controlId}>
      <button type="button" className="control-panel-head" aria-expanded={open} onClick={() => setOpenControl(open ? null : row.controlId)}>
        <span><b>{row.controlId} · {row.name}</b><small>{row.family} · {row.source === "rule" ? `rule ${row.ruleId}` : "added by analyst"}</small></span>
        <span className="badges"><Badge>Evidence: {derived.status}</Badge><Badge>{review?.conclusion || "Not concluded"}</Badge>{findings.some(f => f.state === "Open") && <Badge>Finding open</Badge>}</span>
      </button>
      {open && <div className="control-panel-body">
        <p><b>Expectation:</b> {row.expectation}</p>
        <h4>Supplier claim and corrections</h4>
        {claims.length ? <div className="claim-compare"><div><small>Original · v{claims[0].version} · {claims[0].source}</small><p>{claims[0].text}</p></div><div><small>Latest · v{claims.at(-1).version}{claims.length > 1 ? ` · ${claims.at(-1).reason || "correction"}` : ""}</small><p>{claims.at(-1).text}</p></div></div> : <p className="muted">No supplier claim recorded.</p>}
        {canWork && <details><summary>{claims.length ? "Record a supplier correction" : "Enter the supplier's claim (demo-assisted)"}</summary>{form(`claim-${row.controlId}`, [["text", "Supplier claim"], ["rationale", "Source of the claim or correction", "textarea", true]], values => run("claim", { ...values, controlId: row.controlId }, `claim-${row.controlId}`), "Save claim")}</details>}
        {claims.length > 0 && <div className="ai-block"><div className="ai-block-head"><b>Claim vs evidence</b>{compareRun && <AiBadge run={compareRun}/>}</div>
          {compareRun?.status === "ok" && <p><Badge>{compareRun.output.verdict}</Badge> {compareRun.output.reasoning} <small>Uncertainty: {compareRun.output.uncertainty}. Compared claim v{claims.find(cl => cl.id === compareRun.claimId)?.version || "?"}.</small></p>}
          {analyst && <Button small disabled={busy === `cmp-${row.controlId}`} onClick={() => ai("compare-claim", { claim: claims.at(-1).text, citations: cites.filter(ci => ci.verified).map(({ excerpt, page, documentId }) => ({ excerpt, page, documentId })) }, { controlId: row.controlId, claimId: claims.at(-1).id }, `cmp-${row.controlId}`)}>{busy === `cmp-${row.controlId}` ? "Comparing…" : "Compare latest claim with cited evidence (simulated AI)"}</Button>}</div>}
        <h4>Citations</h4>
        {cites.length ? <ul className="citation-list">{cites.map(cite => <li key={cite.id}><button type="button" className="link" onClick={() => showCitation(cite)}>{doc(cite.documentId)?.name} · {doc(cite.documentId)?.version} · p.{cite.page}</button> “{cite.excerpt}” — {cite.shows} <Badge>{cite.verified ? "Verified on page" : "Unverified citation"}</Badge>{cite.origin === "ai" && <small> AI-proposed, human-accepted</small>}</li>)}</ul> : <p className="muted">No citation yet.</p>}
        <div className="ai-block"><div className="ai-block-head"><b>Evidence notes</b>{notesRun && <AiBadge run={notesRun}/>}</div>
          {notesRun?.status === "failed" && <Note warning>Simulated AI failed: {notesRun.error}</Note>}
          {notesRun?.status === "abstained" && <Note>Simulated AI abstained: {notesRun.output?.reasoning || "no relevant passage"}</Note>}
          {notesRun?.status === "ok" && <><p>{notesRun.output.reasoning} Suggested conclusion: <Badge>{notesRun.output.conclusionHint}</Badge></p>
            {notesRun.output.notes.map((note, i) => { const done = decided(i); const target = doc(note.documentId);
              const citeStep = values => ["cite", { controlId: row.controlId, documentId: note.documentId, page: note.page, excerpt: values.excerpt, shows: values.shows, origin: "ai", runId: notesRun.id, proposal: note }];
              return <div className="ai-proposal" key={i}><p><button type="button" className="link" onClick={() => setView({ documentId: note.documentId, page: note.page, excerpt: note.excerpt })}>{target?.name} · p.{note.page}</button> “{note.excerpt}”</p><small>{note.shows}</small>
                {done ? <Badge>{done.decision}{done.reason ? ` · ${done.reason}` : ""}</Badge> : canWork && (editing === `${notesRun.id}-${i}`
                  ? form(`edit-${notesRun.id}-${i}`, [["excerpt", "Excerpt (must appear on the page)", "textarea"], ["shows", "What it shows"], ["rationale", "Why you edited it", "textarea"]],
                    values => apply([citeStep(values), ["aiDecision", { runId: notesRun.id, index: i, decision: "edited", original: note, final: { ...note, excerpt: values.excerpt, shows: values.shows }, rationale: values.rationale }]], { draftKeys: [`edit-${notesRun.id}-${i}`] }), "Save edited citation", { excerpt: note.excerpt, shows: note.shows })
                  : <div className="request-flow-actions">
                    <Button small primary disabled={!target?.review} onClick={() => apply([citeStep(note), ["aiDecision", { runId: notesRun.id, index: i, decision: "accepted", original: note, final: note }]])}>Accept as citation</Button>
                    <Button small disabled={!target?.review} onClick={() => setEditing(`${notesRun.id}-${i}`)}>Edit</Button>
                    <details><summary>Reject</summary>{form(`reject-${notesRun.id}-${i}`, [["rationale", "Why you reject it", "textarea"]], values => apply([["aiDecision", { runId: notesRun.id, index: i, decision: "rejected", original: note, rationale: values.rationale }]], { draftKeys: [`reject-${notesRun.id}-${i}`] }), "Reject proposal")}</details>
                    {!target?.review && <small>Review the document before citing it.</small>}</div>)}
              </div>; })}</>}
          {canWork && <Button small disabled={busy === `notes-${row.controlId}`} onClick={() => ai("evidence-notes", { controlId: row.controlId, documents: record.evidence.map(({ id, libraryId, name, version, status }) => ({ id, libraryId, name, version, status })) }, { controlId: row.controlId }, `notes-${row.controlId}`)}>{busy === `notes-${row.controlId}` ? "Reading documents…" : notesRun ? "Run again (simulated AI)" : "Propose evidence notes (simulated AI)"}</Button>}
        </div>
        {canWork && reviewed.length > 0 && <details><summary>Add a citation yourself</summary>{form(`cite-${row.controlId}`, [["documentId", "Reviewed document", reviewed.map(d => [d.id, `${d.name} · ${d.version}`])], ["page", "Page", "number"], ["excerpt", "Exact excerpt from the page", "textarea"], ["shows", "What it shows for this control"]], values => run("cite", { ...values, controlId: row.controlId }, `cite-${row.controlId}`), "Record citation")}</details>}
        <h4>Control conclusion</h4>
        <p><small>Derived from evidence: <b>{derived.status}</b> — {derived.why}</small></p>
        {review && <p><Badge>{review.conclusion}</Badge> {review.rationale}{review.overrideReason ? <><br/><b>Override reason:</b> {review.overrideReason}</> : null} <small>{historyRecord(review)}</small></p>}
        {analyst && !record.decision && form(`conclude-${row.controlId}`, [["conclusion", "Conclusion", CONTROL_CONCLUSIONS], ["rationale", "What the cited evidence shows and its limits", "textarea"], ["overrideReason", "Override reason (required when you differ from the derived status or the AI suggestion)", "textarea", true]], values => run("conclude", { ...values, controlId: row.controlId }, `conclude-${row.controlId}`), review ? "Revise conclusion" : "Record conclusion", review ? { conclusion: review.conclusion, rationale: review.rationale } : {})}
        <h4>Findings</h4>
        {findings.map(f => <div className="finding-row" key={f.id}><p><Badge>{f.severity}</Badge> <Badge>{f.state}</Badge> <b>{f.issue}</b></p><small>{f.id} · controls {f.controlIds.join(", ")} · {f.owner} · due {f.due}{f.origin === "ai-draft" ? " · from a simulated AI draft, human-reviewed" : ""}</small><p><b>Severity rationale:</b> {f.severityRationale} <b>Action:</b> {f.action} {f.missingRequirement ? <><b>Missing:</b> {f.missingRequirement}</> : null}</p></div>)}
        {!findings.length && <p className="muted">No finding for this control.</p>}
        {canWork && !record.decision && <details open={isGap(review) && !findings.some(f => f.state === "Open")}><summary>Raise a finding for this control</summary>
          <div className="ai-block"><div className="ai-block-head"><b>Finding draft</b>{draftRun && <AiBadge run={draftRun}/>}</div>
            {draftRun && <><p><small>Draft: {draftRun.output.findings[0].issue}. Follow-up question: {draftRun.output.followUps[0]?.question}</small></p><div className="request-flow-actions"><Button small onClick={() => edit(`finding-${row.controlId}`, { ...draftRun.output.findings[0], controlIds: undefined, runId: draftRun.id })}>Use the draft in the form</Button><Button small onClick={() => edit("askSupplier", { ask: draftRun.output.followUps[0].question, controlIds: [row.controlId], consolidated: false })}>Use the question as a supplier follow-up</Button></div></>}
            <Button small disabled={busy === `draft-${row.controlId}`} onClick={() => ai("draft-findings", { gaps: [{ controlId: row.controlId, conclusion: review?.conclusion || derived.status, ruleId: row.ruleId }] }, { controlId: row.controlId }, `draft-${row.controlId}`)}>{busy === `draft-${row.controlId}` ? "Drafting…" : "Draft finding and follow-up (simulated AI)"}</Button></div>
          {findingForm(row, cites)}
        </details>}
      </div>}
    </article>;
  };

  return <div className="request-flow">
    <section className="request-flow-hero" aria-label="Current assessment and next action">
      <div className="eyebrow">{engagement.client} · {engagement.receipt}</div>
      <h2>{engagement.supplier} · {record.scope?.service || engagement.service}</h2>
      <div className="badges"><Badge>{progress.label}</Badge><Badge>CTP inherent risk: {record.scope?.risk || "Pending triage"}</Badge><Badge>Evidence: {controls.length ? `${controls.filter(r => record.controlReviews[r.controlId]?.conclusion === "Supported").length}/${controls.length} controls supported` : "No controls yet"}</Badge><Badge>Open findings: {openFindings(record).length}</Badge></div>
      <div className="request-flow-next"><div><b>{record.decision && !followUp ? "Complete · no open actions" : myTurn ? "Your next action" : `Waiting for ${progress.nextOwner}`}</b><h3>{currentAction[0]}</h3><p>{currentAction[1]}</p></div>{myTurn ? <Button primary onClick={() => changeSection(sectionFor(progress.action))}>{currentAction[0]} →</Button> : <Button onClick={() => changeSection(sectionFor(progress.action))}>View this step</Button>}</div>
      {!myTurn && (!record.decision || followUp) && <p>Switch the bottom Demo user to the {supplierStep ? "supplier" : customerStep ? "customer" : qaStep ? "independent QA reviewer" : "analyst"} to continue{supplierStep ? "; the request appears in the supplier's inbox" : "; this service stays selected"}.</p>}
    </section>
    <nav className="request-flow-steps" aria-label="Assessment steps">{sections.map(([key, label], index) => <button key={key} type="button" aria-current={section === key ? "step" : undefined} onClick={() => changeSection(key)}><span>{index + 1}</span>{label}</button>)}</nav>
    {error && <p className="op-field-error" role="alert">{error}</p>}
    <div className={`request-flow-layout ${["evidence", "qa"].includes(section) ? "is-wide" : ""}`}>
      <div id="request-stage-panel">
        {section === "triage" && <Card title="Review intake, calculate risk and confirm scope">
          <Fields items={[["Submitted service", engagement.service], ...(engagement.purpose && engagement.purpose !== engagement.service ? [["Intended use", engagement.purpose]] : []), ["Customer", engagement.client], ["Documents at submission", engagement.attachments?.map(item => item.name).join(", ") || "None"], ["Scope review", historyRecord(record.scope)]]}/>
          {unresolved.length > 0 && <Note warning>Unresolved facts: {unresolved.map(factLabel).join("; ")}. Unknown is never treated as low risk; the tier stays provisional until clarified.</Note>}
          <details><summary>Submitted business facts and impact answers</summary>
            <Fields items={Object.entries(engagement.answers || {}).map(([key, answer]) => [factLabel(key), record.factUpdates?.[key] ? `${answer} → ${record.factUpdates[key]} (clarified)` : answer])}/>
            {engagement.businessImpact && <><h3>Submitted CTP business impact</h3><ImpactAnswers questions={engagement.businessImpact.questions} answers={Object.fromEntries(engagement.businessImpact.questions.map(question => [question.id, question.answer]))}/></>}
          </details>
          <div className="risk-calculation"><h3>Calculated CTP inherent risk <Badge>{`${calculated.tier}${calculated.provisional ? " · provisional" : ""}`}</Badge></h3>
            <p><small>{calculated.rulesVersion}. Base impact: {calculated.baseImpact}.</small></p>
            <ul>{calculated.drivers.map((d, i) => <li key={i}><b>{d.input}</b> → {d.effect}{d.detail ? <small> · {d.detail}</small> : null}</li>)}</ul></div>
          {record.clarification && <div className="request-flow-evidence"><h3>Clarification requested</h3><p>{record.clarification.question}</p><small>{historyRecord(record.clarification)}</small>{record.clarification.answer ? <p><b>Customer reply:</b> {record.clarification.answer}{Object.keys(record.clarification.facts || {}).length ? ` · confirmed ${Object.entries(record.clarification.facts).map(([k, v]) => `${factLabel(k)}: ${v}`).join(", ")}` : ""}</p>
            : decisionOwner ? form("respond", [["answer", "Your reply", "textarea"], ...unresolved.map(k => [`fact-${k}`, `Confirm: ${factLabel(k)}`, ["Yes", "No"], true])], values => run("respond", { answer: values.answer, facts: Object.fromEntries(unresolved.filter(k => values[`fact-${k}`]).map(k => [k, values[`fact-${k}`]])) }, "respond", false), "Send reply to analyst")
              : <Note>Waiting for the customer Decision Owner’s reply. Use Demo user to switch to the customer.</Note>}</div>}
          {record.scope && <Fields items={[["Confirmed service", record.scope.service], ["CTP inherent risk", `${record.scope.risk}${record.scope.overrideReason ? ` · overrides calculated ${record.scope.calculated?.tier}` : ""}`], ...(record.scope.overrideReason ? [["Override reason", record.scope.overrideReason]] : []), ["Review plan", record.scope.plan], ["Classification reasoning", record.scope.rationale]]}/>}
          {analyst && !record.decision && <>
            {!record.clarification && <details><summary>Need more information from the customer?</summary>{form("clarify", [["question", "Question for the customer", "textarea"]], values => run("clarify", values, "clarify", false), "Request clarification", unresolved.length ? { question: `Please confirm: ${unresolved.map(factLabel).join("; ")}.` } : {})}</details>}
            <Note>Record the classification under the customer’s approved CTP method. Confirm the calculated tier or override it with a reason; confirming scope applies controls from the demo rules. Keep the submitted service scope; a different use requires a new request and fresh business-impact answers.</Note>
            {form("scope", [["risk", "CTP inherent-risk tier", TIERS], ["plan", "Applicable review plan", REVIEW_PLANS], ["rationale", "Scope, unresolved facts and CTP classification reasoning", "textarea"], ["overrideReason", "Override reason (required if the tier differs from the calculation)", "textarea", true]], values => run("scope", { ...values, service: engagement.service }, "scope", false), record.scope ? "Save revised scope" : "Confirm scope and begin assessment", record.scope ? { risk: record.scope.risk, plan: record.scope.plan, rationale: record.scope.rationale, overrideReason: record.scope.overrideReason } : { risk: calculated.tier })}
          </>}
          {!analyst && !record.scope && <Note>The assigned analyst reviews your facts and confirms scope. No supplier decision has been made.</Note>}
          <Button onClick={() => downloadJSON(engagement.receipt, receipt)}>Download original receipt</Button>
        </Card>}

        {section === "controls" && <Card title="Applied controls">
          {!record.scope ? <Note>Confirm scope first. Controls are applied from the confirmed tier and intake facts. <Button onClick={() => changeSection("triage")}>Review intake →</Button></Note> : <>
            <p>Controls come from a separate library and are applied by the demo rules ({record.scope.calculated?.rulesVersion}). Each shows why it applies.</p>
            {record.controls.map(row => <article className="request-flow-evidence" key={row.controlId}><h3>{row.controlId} · {row.name} {row.status === "Removed" && <Badge>Not applicable</Badge>}</h3><p>{row.expectation}</p><small>{row.source === "rule" ? `Rule ${row.ruleId}: ${row.reason}` : `Added by ${row.actor}: ${row.reason}`}</small>
              {row.removed && <p><b>Not applicable:</b> {row.removed.rationale}</p>}
              {canWork && !record.decision && row.status !== "Removed" && <details><summary>Mark not applicable</summary>{form(`remove-${row.controlId}`, [["rationale", "Justification", "textarea"]], values => run("removeControl", { ...values, controlId: row.controlId }, `remove-${row.controlId}`), "Mark not applicable")}</details>}</article>)}
            {canWork && !record.decision && <details><summary>Add a control from the library</summary>{form("addControl", [["controlId", "Control", CONTROL_LIBRARY.filter(l => !controls.some(r => r.controlId === l.id)).map(l => [l.id, `${l.id} · ${l.name}`])], ["rationale", "Why it applies to this service", "textarea"]], values => run("addControl", values), "Add control")}</details>}
            <Button onClick={() => changeSection("evidence")}>Continue to evidence →</Button></>}
        </Card>}

        {section === "evidence" && <Card title="Documents, controls and findings">
          {!record.scope ? <Note>Confirm intake and scope before adding evidence. <Button onClick={() => changeSection("triage")}>Review intake →</Button></Note> : <div className="evidence-split">
            <div className="evidence-main">
              <h3>Documents</h3>
              {record.evidence.map(item => { const q = documentQualifiers(record, item); return <article className="request-flow-evidence document-row" key={item.id}>
                <h4>{item.name} · {item.version}</h4>
                <p><small>{item.sourceType} · {item.status} · dated {item.date || "unknown"} · {item.pageCount ? `${item.pageCount} pages` : "metadata only"} · {item.source}</small></p>
                <div className="badges">{q.map(x => <Badge key={x}>{x}</Badge>)}<Badge>{item.review ? "Reviewed" : "Needs review"}</Badge>{item.replacesId && <Badge>{`Replaces ${doc(item.replacesId)?.version}`}</Badge>}</div>
                <p>{item.notes}</p>{item.review && <p><b>Does not prove:</b> {item.review.doesNotProve}</p>}<small>{historyRecord(item)}</small>
                {item.libraryId && <Button small onClick={() => setView({ documentId: item.id, page: 1 })}>View document</Button>}
                {canWork && !item.review && form(`review-${item.id}`, [["doesNotProve", "What this document does not prove"], ["rationale", "Review notes", "textarea"]], values => run("reviewDocument", { ...values, evidenceId: item.id }, `review-${item.id}`), "Save document review")}
              </article>; })}
              {!record.evidence.length && <Note>No documents recorded for this service yet.</Note>}
              {canWork && <details><summary>{record.decision ? "Add follow-up document" : "Add a document from the synthetic pack"}</summary>{form("evidence", [["libraryId", "Synthetic document", DOCUMENT_LIBRARY.map(l => [l.id, `${l.name} · ${l.version} · ${l.status}`])], ["notes", "Service coverage and source context", "textarea"], ["doesNotProve", "What it does not prove (reviews it now)", "textarea", true]], values => run("evidence", values), "Record document")}<Note>Synthetic PDFs stand in for uploads. Source type, status, date and replacement links come from the document; real upload and extraction arrive with the backend.</Note></details>}

              <h3>Supplier requests</h3>
              {asks.map(ask => <article className="request-flow-evidence" key={ask.id}><h4 className="pre-wrap">{ask.condition ? "Approval condition · " : ask.consolidated ? "Consolidated request · " : ""}{ask.ask}</h4><small>Due {ask.due}{ask.controlIds?.length ? ` · controls ${ask.controlIds.join(", ")}` : " · not tied to a control"} · requested by {historyRecord(ask)}</small><Badge>{{ Open: "Waiting for supplier", Withdrawn: "Withdrawn" }[ask.status] || "Supplier responded"}</Badge>{ask.withdrawn && <p><b>Withdrawn:</b> {ask.withdrawn.rationale}</p>}{ask.status === "Open" && canWork && <details><summary>Withdraw this request</summary>{form(`withdraw-${ask.id}`, [["rationale", "Why it is no longer needed", "textarea"]], values => run("withdrawAsk", { ...values, askId: ask.id }, `withdraw-${ask.id}`), "Withdraw request")}</details>}{ask.response && <p><b>Response:</b> {ask.response.name} · {ask.response.version}{ask.response.claim ? ` · claim: “${ask.response.claim}”` : ""}. Review it in Documents above.</p>}</article>)}
              {canWork && <><div className="request-flow-actions"><Button small disabled={!stillMissing.length} onClick={() => edit("askSupplier", { ask: `Please provide the following for ${engagement.service}:\n${stillMissing.map(r => `- ${r.controlId} ${r.name}: ${r.expectation}`).join("\n")}`, controlIds: stillMissing.map(r => r.controlId), consolidated: true })}>Draft one request for everything still missing ({stillMissing.length})</Button></div>
                <details open={!!drafts.askSupplier}><summary>Request evidence from the supplier</summary>{drafts.askSupplier?.controlIds?.length > 0 && <small>Linked to {drafts.askSupplier.controlIds.join(", ")}.</small>}{form("askSupplier", [["ask", "What the supplier must provide", "textarea"], ["due", "Due date", "date"]], values => run("askSupplier", { ...values, controlIds: drafts.askSupplier?.controlIds || [], consolidated: !!drafts.askSupplier?.consolidated }), "Send request to supplier")}<Note>On-screen only: nothing is emailed. A follow-up question does not have to be tied to a control.</Note></details></>}

              <h3>Controls ({controls.length})</h3>
              {!controls.length ? <Note>No controls apply yet. <Button onClick={() => changeSection("controls")}>Review controls →</Button></Note> : controls.map(controlPanel)}
              {uncoveredGaps(record).length > 0 && <Note warning>Raise a finding for: {uncoveredGaps(record).map(r => r.name).join(", ")}. Every insufficient, contradicted or missing control needs a finding before the recommendation.</Note>}
              {progress.step >= 3 && !record.decision && <Button primary onClick={() => changeSection("recommendation")}>Continue to recommendation →</Button>}
            </div>
            {viewer}
          </div>}
        </Card>}

        {section === "recommendation" && <Card title="Analyst recommendation">
          {record.customerReturn && <Note warning>Customer requested clarification: {record.customerReturn.rationale}. Revise the analyst recommendation, then run independent QA again.</Note>}
          {record.challenges.length > 0 && <><h3>QA challenges</h3>{record.challenges.map(ch => <article className="request-flow-evidence" key={ch.id}><p><b>{ch.controlId ? `${ch.controlId}: ` : ""}{ch.text}</b></p><small>Raised by {historyRecord(ch)}</small>
            {ch.response ? <p><b>Analyst answer:</b> {ch.response.rationale} <small>{historyRecord(ch.response)}</small></p> : canWork ? form(`challenge-${ch.id}`, [["rationale", "Your correction, source and rationale", "textarea"], ["citationId", "Supporting citation", record.citations.map(ci => [ci.id, `${ci.controlId} · p.${ci.page} · ${ci.excerpt.slice(0, 50)}`]), true]], values => run("respondChallenge", { ...values, challengeId: ch.id }, `challenge-${ch.id}`), "Answer challenge") : <Note>Waiting for the analyst’s answer.</Note>}
            <Badge>{ch.resolved ? "Resolved by QA" : ch.response ? "Answered · awaiting QA" : "Open"}</Badge></article>)}</>}
          {record.recommendation && <><Badge>{record.recommendation.outcome}</Badge><p>{record.recommendation.rationale}</p><small>{historyRecord(record.recommendation)}</small></>}
          {progress.step < 3 && !record.recommendation ? <Note>Conclude every control and raise findings for every gap before recommending an outcome. <Button onClick={() => changeSection("evidence")}>Review evidence →</Button></Note>
            : analyst && !record.decision ? form("recommend", [["outcome", "Suggested customer outcome", OUTCOMES], ["rationale", "Rationale tied to risk, evidence and unresolved findings", "textarea"]], values => run("recommend", values, "recommend", false), "Save recommendation and send to QA", record.recommendation || {})
              : <Note>The analyst records a recommendation. The customer retains the final decision.</Note>}
          {record.qa && !qaPassed(record.qa) && <Note warning>QA {record.qa.outcome}: {record.qa.rationale}</Note>}
        </Card>}

        {section === "qa" && <Card title="Independent QA · reasoning and sources side by side">
          {!record.recommendation ? <Note>An analyst recommendation and complete evidence reviews are required first.</Note> : <div className="evidence-split">
            <div className="evidence-main">
              <h3>Recommendation: {record.recommendation.outcome}</h3><p>{record.recommendation.rationale}</p><small>{historyRecord(record.recommendation)}</small>
              {controls.map(row => { const rv = record.controlReviews[row.controlId]; const cl = record.claims.filter(x => x.controlId === row.controlId); const nr = record.aiRuns.filter(r => r.controlId === row.controlId && r.task === "evidence-notes" && r.status === "ok").at(-1);
                return <article className="request-flow-evidence qa-control" key={row.controlId}><h4>{row.controlId} · {row.name} <Badge>{rv?.conclusion || "Not concluded"}</Badge></h4>
                  {cl.length > 0 && <p><b>Claim:</b> {cl.at(-1).text}{cl.length > 1 ? ` (corrected from “${cl[0].text}”)` : ""}</p>}
                  {nr && <p><b>AI reasoning</b> <AiBadge run={nr}/>: {nr.output.reasoning} Suggested {nr.output.conclusionHint}.</p>}
                  <p><b>Analyst:</b> {rv?.rationale}{rv?.overrideReason ? ` · override: ${rv.overrideReason}` : ""}</p>
                  <ul className="citation-list">{record.citations.filter(ci => ci.controlId === row.controlId).map(ci => <li key={ci.id}><button type="button" className="link" onClick={() => showCitation(ci)}>p.{ci.page} · {doc(ci.documentId)?.name}</button> “{ci.excerpt}” <Badge>{ci.verified ? "Verified" : "Unverified"}</Badge></li>)}</ul>
                  {record.challenges.filter(ch => ch.controlId === row.controlId).map(ch => <p key={ch.id}><small>Challenge: {ch.text} → {ch.response?.rationale || "unanswered"}</small></p>)}
                </article>; })}
              {record.qa && <><Badge>{record.qa.outcome}</Badge><p>{record.qa.rationale}</p>{record.qa.condition && <p><b>QA condition:</b> {record.qa.condition}</p>}<small>{historyRecord(record.qa)}</small></>}
              {eligibleQA && !mayQA && !record.qa && (eligibleQA.length ? <Note>Available independent reviewer{eligibleQA.length > 1 ? "s" : ""}: {eligibleQA.map(person => person.name).join(", ")}. Choose the reviewer through Demo user.</Note> : <Note warning>No independent QA reviewer is assigned to this customer who is separate from the assessment authors. Ask the Superadmin to assign another analyst with QA permission to this customer, then return here.</Note>)}
              {record.qa ? <Note>{qaPassed(record.qa) ? "QA is recorded. The next action belongs to the customer Decision Owner." : "QA has returned this recommendation. The analyst answers each challenge and revises it before another independent review."}</Note>
                : mayQA && !record.decision ? form("qa", [["outcome", "QA outcome", QA_OUTCOMES], ["rationale", "What you checked against the sources", "textarea"], ["condition", "Condition (required for Passed with condition)", "textarea", true], ["challenge", "Challenge for the analyst (required unless passing)", "textarea", true], ["challengeControlId", "Challenged control", controls.map(r => [r.controlId, `${r.controlId} · ${r.name}`]), true]], values => run("qa", values, "qa", false), "Record independent QA")
                  : <Note>A different analyst with independent QA permission records QA. Analysis authors cannot review their own work.</Note>}
            </div>
            {viewer}
          </div>}
        </Card>}

        {section === "decision" && <Card title="Decision memo and customer decision">
          <DecisionMemo memo={memo} Badge={Badge} Fields={Fields}/>
          {record.decision ? <><Badge>{record.decision.outcome}</Badge><p>{record.decision.rationale}</p>{record.decision.riskAcceptance && <p><b>Risk acceptance:</b> {record.decision.riskAcceptance.rationale} ({record.decision.riskAcceptance.findingIds.length} open findings)</p>}<Button onClick={() => changeSection("monitoring")}>View frozen decision pack →</Button></>
            : progress.action !== "decision" ? <Note>The analyst recommendation and independent QA must be current and complete before a customer decision.</Note>
              : !decisionOwner ? <Note>Ready for the designated customer Decision Owner. Switch Demo user to the customer to sign; analysts can read this decision page but cannot sign.</Note>
                : <DecisionForm key={engagement.id} supplier={engagement.supplier} openCount={openFindings(record).length} form={form} drafts={drafts} run={run} Button={Button} Note={Note}/>}
        </Card>}

        {section === "monitoring" && <Card title="Decision pack and follow-up">
          {!record.signedPack ? <Note>No final customer decision has been recorded. <Button onClick={() => changeSection("decision")}>View decision readiness →</Button></Note> : <>
            <div className="request-pack-print">
              <div className="eyebrow">DECISION PACK v{record.signedPack.version} · FROZEN {new Date(record.signedPack.frozenAt).toLocaleString()}</div>
              <Badge>{record.decision.outcome}</Badge><Fields items={[["Service", `${engagement.supplier} · ${record.scope.service}`], ["Decision Owner", record.decision.actor], ["Rationale", record.decision.rationale], ...(record.decision.riskAcceptance ? [["Risk acceptance", record.decision.riskAcceptance.rationale]] : []), ...(record.decision.condition ? [["Condition", `${record.decision.condition.evidence} · ${record.decision.condition.owner} · due ${record.decision.condition.due}`]] : []), ["Methodology", `${record.signedPack.policy || "CTP"} · ${record.signedPack.rulesVersion}`], ["Citations frozen", String(record.signedPack.citations.length)], ["AI runs recorded", `${record.signedPack.aiRuns.length} (${record.signedPack.aiDecisions.length} human decisions)`]]}/>
              <DecisionMemo memo={buildMemo({ ...record.signedPack, supplierAsks: [] }, engagement)} Badge={Badge} Fields={Fields}/>
            </div>
            <PackExport name={`${engagement.receipt}-decision-pack`} pack={record.signedPack} Button={Button} downloadJSON={downloadJSON} Note={Note}/>
            <h3>Findings after the decision</h3>
            {record.findings.length ? record.findings.map(f => <article className="request-flow-evidence" key={f.id}><p><Badge>{f.severity}</Badge> <Badge>{f.state}</Badge> <b>{f.issue}</b></p><small>{f.controlIds.join(", ")} · {f.owner} · due {f.due}</small>
              {f.closure && <p><b>Closed:</b> {f.closure.rationale} <small>{historyRecord(f.closure)}</small></p>}
              {f.state === "Open" && analyst && form(`close-${f.id}`, [["citationId", "New verified citation on this finding's control", record.citations.filter(ci => f.controlIds.includes(ci.controlId) && ci.verified && ci.revision > f.revision).map(ci => [ci.id, `p.${ci.page} · ${ci.excerpt.slice(0, 60)}`])], ["rationale", "Why the new evidence resolves it", "textarea"]], values => run("closeFinding", { ...values, findingId: f.id }, `close-${f.id}`), "Close finding")}
            </article>) : <p>No findings were raised.</p>}
            {openFindings(record).length > 0 && <Note>Open findings stay open after the decision. A risk acceptance is not closure: add a newer document, cite it on the finding’s control, then close. <Button onClick={() => changeSection("evidence")}>Add and review follow-up evidence →</Button></Note>}
            {record.decision.condition && <><h3>Customer condition · {record.conditionClosed ? "Closed" : "Open"}</h3><Fields items={[["Owner", record.decision.condition.owner], ["Due date", record.decision.condition.due], ["Required proof", record.decision.condition.evidence]]}/>{!record.conditionClosed && <><Note>{asks.some(ask => ask.condition && ask.status === "Open") ? "The condition was sent to the supplier as an evidence request. Their response will appear for analyst review." : "Review and cite the new evidence, then close the condition."}</Note><Button onClick={() => changeSection("evidence")}>Add and review follow-up evidence →</Button>{analyst && form("close", [["rationale", "How new, cited evidence satisfies the condition", "textarea"]], values => run("close", values), "Close condition")}</>}</>}
            {!record.decision.condition && !openFindings(record).length && <p>{record.decision.outcome === "Reject" ? "This service was rejected; no active assurance relationship was created." : "No customer conditions or findings are outstanding."}</p>}
          </>}
        </Card>}
      </div>
      {!["evidence", "qa"].includes(section) && <aside className="request-flow-meta">
        <Card title="This assessment"><Fields items={[["Customer", engagement.client], ["Supplier", engagement.supplier], ["Service", record.scope?.service || engagement.service], ["Stage", progress.stage], ["Next owner", progress.nextOwner], ["Review plan", record.scope?.plan || "Awaiting scope review"], ["Controls", controls.length ? String(controls.length) : "Pending scope"]]}/><Button onClick={() => navigate(analyst ? "O01" : "C15")}>Back to {analyst ? "My work" : "assessments"}</Button></Card>
        <Card title="Named action history"><ol className="request-flow-history">{record.events.map(item => <li key={item.id}><b>{item.action}</b><p>{item.rationale}</p><small>{historyRecord(item)}</small></li>)}</ol>{!record.events.length && <p>Request submitted. No analyst action has been recorded yet.</p>}</Card>
      </aside>}
    </div>
  </div>;
}

function DecisionForm({ supplier, openCount, form, drafts, run, Button, Note }) {
  const [review, setReview] = useState(null);
  const [sendAck, setSendAck] = useState(false);
  const values = drafts.decision || {};
  const approving = values.outcome?.startsWith("Approve");
  if (review) return <><h3>Confirm your decision</h3><p><b>{review.outcome}</b></p><p>{review.rationale}</p>
    {review.riskAcceptance && <Note warning>You accept the risk of {openCount} open finding(s): “{review.riskAcceptance}”. This is recorded in the pack; it does not close the findings.</Note>}
    {review.condition && <><p>Condition: {review.condition.owner} · {review.condition.due} · {review.condition.evidence}</p><Note warning>Confirming sends this condition to {supplier} as an evidence request: “{review.condition.evidence}”, due {review.condition.due}. The supplier sees only that request. If the condition is met inside your organisation, the analyst withdraws the supplier request and records the evidence directly.</Note><label className="request-flow-ack"><input type="checkbox" checked={sendAck} onChange={e => setSendAck(e.target.checked)}/> I understand this condition is sent to {supplier}</label></>}
    <Note>Confirming records your named decision and freezes its evidence, citations, findings and independent QA.</Note>
    <div className="request-flow-actions"><Button onClick={() => { setReview(null); setSendAck(false); }}>Keep editing</Button><Button primary disabled={review.condition && !sendAck} onClick={() => run("decision", review, "decision", false)}>{review.condition ? "Confirm decision and send condition to supplier" : "Confirm customer decision"}</Button></div></>;
  return form("decision", [["outcome", "Customer outcome", OUTCOMES], ["rationale", "Your decision rationale", "textarea"],
    ...(approving && openCount ? [["riskAcceptance", `Risk acceptance for ${openCount} open finding(s)`, "textarea"]] : []),
    ...(values.outcome === "Approve with conditions" ? [["owner", "Condition owner"], ["due", "Condition due date", "date"], ["evidence", "Evidence required to close the condition (sent to the supplier)", "textarea"]] : [])],
  value => setReview({ outcome: value.outcome, rationale: value.rationale, ...(value.outcome?.startsWith("Approve") && openCount ? { riskAcceptance: value.riskAcceptance } : {}), ...(value.outcome === "Approve with conditions" ? { condition: { owner: value.owner, due: value.due, evidence: value.evidence } } : {}) }), "Review customer decision");
}

export function SupplierInbox(c) {
  const { state, user, update, notify, ui } = c;
  const { Card, Button, Badge, Note } = ui;
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  // ponytail: one demo supplier contact; scope to the selected case when it has requests, else every case with requests.
  const all = (state.extraEngagements || []).map(engagement => ({ engagement, record: state.requestAssessments?.[engagement.id] }))
    .filter(row => row.record?.supplierAsks?.some(ask => ask.status !== "Withdrawn"));
  const cases = all.some(row => row.engagement.id === state.selected) ? all.filter(row => row.engagement.id === state.selected) : all;
  const submit = (engagement, ask) => {
    try {
      update(respondAsSupplier(state, engagement.id, ask.id, drafts[ask.id] || {}, { actorId: user.actorId, id: user.id, name: `${engagement.supplier} contact` }));
      setError(""); notify("Response sent (simulated; nothing emailed). The assurance team reviews it; sending evidence does not approve anything.");
    } catch (err) { setError(err.message); }
  };
  const set = (ask, name, value) => setDrafts({ ...drafts, [ask.id]: { ...drafts[ask.id], [name]: value } });
  return <div className="request-flow">
    <section className="request-flow-hero"><div className="eyebrow">SUPPLIER INBOX · SIMULATED SUPPLIER VIEW</div><h2>Evidence requests</h2><p>Each request names the customer, service and proof needed. Attach a document from the synthetic pack; real uploads arrive with the backend.</p></section>
    {error && <p className="op-field-error" role="alert">{error}</p>}
    {cases.map(({ engagement, record }) => <Card key={engagement.id} title={`${engagement.client} · ${engagement.supplier} · ${engagement.service}`}>
      {record.supplierAsks.filter(ask => ask.status !== "Withdrawn").map(ask => <article className="request-flow-evidence" key={ask.id}>
        <h3 className="pre-wrap">{ask.ask}</h3><small>Due {ask.due}{ask.controlIds?.length ? ` · ${ask.controlIds.map(id => controlById(id)?.name || id).join(", ")}` : ""}</small>
        <Badge>{ask.status === "Open" ? "Response required" : "Sent · awaiting review"}</Badge>
        {ask.status === "Open" ? <form className="request-flow-form" onSubmit={e => { e.preventDefault(); submit(engagement, ask); }}>
          <label className="field"><span>Attach document (synthetic pack)</span><select value={drafts[ask.id]?.libraryId || ""} onChange={e => set(ask, "libraryId", e.target.value)}><option value="">Choose…</option>{DOCUMENT_LIBRARY.map(l => <option key={l.id} value={l.id}>{l.name} · {l.version}</option>)}</select></label>
          <label className="field"><span>What it covers for this service</span><textarea rows={3} value={drafts[ask.id]?.notes || ""} onChange={e => set(ask, "notes", e.target.value)}/></label>
          {ask.controlIds?.length > 0 && <label className="field"><span>Your statement about {controlById(ask.controlIds[0])?.name.toLowerCase()} (optional)</span><input value={drafts[ask.id]?.claim || ""} onChange={e => set(ask, "claim", e.target.value)}/></label>}
          <Button primary type="submit">Send response</Button></form>
          : <p><b>You sent:</b> {ask.response.name} · {ask.response.version}</p>}
      </article>)}
    </Card>)}
    <Note>Sending evidence never approves the supplier. The assurance team reviews each response and the customer keeps the final decision.</Note>
  </div>;
}
