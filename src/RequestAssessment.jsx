import React, { useState } from "react";
import { requestAssessment, requestProgress, respondAsSupplier, transitionRequest } from "./request-workflow.mjs";
import "./request-assessment.css";

const outcomes = ["Approve", "Approve with conditions", "Reject", "Return for clarification"];
const sections = [["triage", "Intake & scope"], ["evidence", "Evidence"], ["recommendation", "Recommendation"], ["qa", "QA review"], ["decision", "Customer decision"], ["monitoring", "Decision record & follow-up"]];
// ponytail: published CTP plan versions from the scenario; read from policyVersions when plans become editable.
const REVIEW_PLANS = ["Standard v2", "Enhanced v3"];
const sectionFor = action => ({ scope: "triage", clarification: "triage", pack: "monitoring" }[action] || action);
const instructions = {
  triage: ["Review submitted request", "Read the submitted facts, clarify anything missing, then confirm the service scope and record the CTP classification with your reasoning."],
  clarification: ["Answer the analyst’s question", "Your reply stays with this service. The analyst will review it before confirming scope."],
  evidence: ["Record and review service evidence", "Add a source and its exact version, then record what it supports for this service. File contents are not uploaded."],
  recommendation: ["Record your recommendation", "Explain the proposed customer outcome using this service’s reviewed evidence."],
  qa: ["Complete QA review", "Check the recommendation against the reviewed evidence, then pass it to the customer or send it back for rework."],
  decision: ["Record the customer decision", "The designated customer Decision Owner chooses the final outcome after QA review passes."],
  monitoring: ["View decision record and follow-up", "The signed record stays frozen. Review new evidence before closing any customer condition."],
};

export default function RequestAssessment(c) {
  const { state, data, engagement, user, update, navigate, notify, ui } = c;
  const { Card, Button, Badge, Note, Fields, ImpactAnswers, downloadJSON } = ui;
  const record = requestAssessment(state, engagement);
  const receipt = state.extraEngagements?.find(row => row.id === engagement.id && row.workspaceId === engagement.workspaceId && row.receipt === engagement.receipt) || engagement;
  const progress = requestProgress(record);
  const routeSection = { O03: "evidence", O04: "evidence", C13: "evidence", O08: "qa", C06: "decision", C07: "monitoring", C08: "monitoring", O09: "monitoring", O12: "triage" }[c.screen.id];
  const [section, setSection] = useState(routeSection || sectionFor(progress.action));
  const [error, setError] = useState("");
  const [reviewId, setReviewId] = useState(null);
  const analyst = user.role === "analyst";
  const canFollowUp = !record.decision || record.decision.condition && !record.conditionClosed;
  const decisionOwner = user.role === "customer" && user.actorId === engagement.decisionOwnerId;
  const drafts = state.requestDrafts?.[engagement.id]?.[user.id] || {};
  const edit = (key, values) => {
    setError("");
    update({ requestDrafts: { ...state.requestDrafts, [engagement.id]: { ...state.requestDrafts?.[engagement.id], [user.id]: { ...drafts, [key]: { ...drafts[key], ...values } } } } });
  };
  const run = (action, values, draftKey = action) => {
    try {
      const patch = transitionRequest(state, { ...data, workspace: data.workspaceProfiles?.[engagement.workspaceId] || data.workspace }, engagement.id, action, values);
      update({ ...patch, requestDrafts: { ...state.requestDrafts, [engagement.id]: { ...state.requestDrafts?.[engagement.id], [user.id]: { ...drafts, [draftKey]: null } } } });
      setError(""); setReviewId(null);
      if (!["evidence", "review", "askSupplier", "withdrawAsk", "finding"].includes(action)) setSection(sectionFor(requestProgress(patch.requestAssessments[engagement.id]).action));
      notify("Saved for this service in the current demo session.");
    } catch (err) { setError(err.message); }
  };
  const form = (key, fields, submit, label, defaults = {}) => {
    const values = { ...defaults, ...drafts[key] };
    return <form className="request-flow-form" noValidate onSubmit={event => {
      event.preventDefault();
      const missing = fields.find(([name]) => !String(values[name] || "").trim());
      if (missing) { setError(`Complete “${missing[1]}” to continue.`); event.currentTarget.querySelector(`[name="${missing[0]}"]`)?.focus(); return; }
      submit(values);
    }}>
      {fields.map(([name, label, choices]) => <label className="field" key={name}><span>{label}</span>{Array.isArray(choices)
        ? <select name={name} value={values[name] || ""} required aria-invalid={error.includes(`“${label}”`) || undefined} onChange={e => edit(key, { [name]: e.target.value })}><option value="">Choose…</option>{choices.map(choice => <option key={choice}>{choice}</option>)}</select>
        : choices === "textarea" ? <textarea name={name} rows={4} value={values[name] || ""} required aria-invalid={error.includes(`“${label}”`) || undefined} onChange={e => edit(key, { [name]: e.target.value })}/>
          : <input name={name} type={choices || "text"} value={values[name] || ""} required aria-invalid={error.includes(`“${label}”`) || undefined} onChange={e => edit(key, { [name]: e.target.value })}/>}</label>)}
      <small>Draft kept for this service and demo user until refresh.</small>
      <Button primary type="submit">{label}</Button>
    </form>;
  };
  const currentAction = instructions[progress.action] || instructions.triage;
  const customerStep = ["clarification", "decision"].includes(progress.action) || (progress.action === "monitoring" && !canFollowUp);
  const supplierStep = progress.nextOwner === "Supplier contact";
  const myTurn = supplierStep ? user.role === "supplier" : customerStep ? decisionOwner : analyst;
  const asks = record.supplierAsks || [];
  const findings = record.findings || [];
  const changeSection = key => {
    setSection(key); setError("");
    requestAnimationFrame(() => document.getElementById("request-stage-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const evidenceReviewed = record.evidence.length > 0 && record.evidence.every(item => record.reviews[item.id]);
  const unresolved = Object.entries(engagement.answers || {}).filter(([, answer]) => answer === "Unknown").map(([key]) => engagement.questions?.[key] || `Business fact ${Number(key) + 1}`);
  const historyRecord = value => value ? `${value.actor || "Recorded reviewer"} · ${new Date(value.at).toLocaleString()}` : "Not recorded";

  return <div className="request-flow">
    <section className="request-flow-hero" aria-label="Current assessment and next action">
      <div className="eyebrow">{engagement.client} · {engagement.receipt}</div>
      <h2>{engagement.supplier} · {record.scope?.service || engagement.service}</h2>
      <div className="badges"><Badge>{progress.label}</Badge><Badge>CTP inherent risk: {record.scope?.risk || "Pending triage"}</Badge></div>
      <div className="request-flow-next"><div><b>{!canFollowUp ? "Complete · no open actions" : myTurn ? "Your next action" : `Waiting for ${progress.nextOwner}`}</b><h3>{currentAction[0]}</h3><p>{currentAction[1]}</p></div>{myTurn ? <Button primary onClick={() => changeSection(sectionFor(progress.action))}>{currentAction[0]} →</Button> : <Button onClick={() => changeSection(sectionFor(progress.action))}>View this step</Button>}</div>
      {!myTurn && <p>Switch the bottom Demo user to the {supplierStep ? "supplier" : customerStep ? "customer" : "analyst"} to continue{supplierStep ? "; the request appears in the supplier's inbox" : "; this service stays selected"}.</p>}
    </section>
    <nav className="request-flow-steps" aria-label="Assessment steps">{sections.map(([key, label], index) => <button key={key} type="button" aria-current={section === key ? "step" : undefined} onClick={() => changeSection(key)}><span>{index + 1}</span>{label}</button>)}</nav>
    {error && <p className="op-field-error" role="alert">{error}</p>}
    <div className="request-flow-layout">
      <div id="request-stage-panel">
        {section === "triage" && <Card title="Review intake and confirm scope">
          <Fields items={[["Submitted service", engagement.service], ...(engagement.purpose && engagement.purpose !== engagement.service ? [["Intended use", engagement.purpose]] : []), ["Customer", engagement.client], ["Documents at submission", engagement.attachments?.map(item => item.name).join(", ") || "None"], ["Scope review", historyRecord(record.scope)]]}/>
          {unresolved.length > 0 && <Note warning>Unresolved facts: {unresolved.join("; ")}{record.clarification?.answer ? ` — customer clarified: “${record.clarification.answer}”` : analyst ? " — ask the customer below or record how you resolved it in your reasoning." : ""}</Note>}
          <details><summary>Submitted business facts and impact answers</summary>
            <Fields items={Object.entries(engagement.answers || {}).map(([key, answer]) => [engagement.questions?.[key] || `Business fact ${Number(key) + 1}`, answer === "Unknown" && record.clarification?.answer ? "Unknown → clarified (see reply)" : answer])}/>
            {engagement.businessImpact && <><h3>Submitted CTP business impact</h3><ImpactAnswers questions={engagement.businessImpact.questions} answers={Object.fromEntries(engagement.businessImpact.questions.map(question => [question.id, question.answer]))}/></>}
          </details>
          {record.clarification && <div className="request-flow-evidence"><h3>Clarification requested</h3><p>{record.clarification.question}</p><small>{historyRecord(record.clarification)}</small>{record.clarification.answer ? <p><b>Customer reply:</b> {record.clarification.answer}</p> : decisionOwner ? form("respond", [["answer", "Your reply", "textarea"]], values => run("respond", values), "Send reply to analyst") : <Note>Waiting for the customer Decision Owner’s reply. Use Demo user to switch to the customer.</Note>}</div>}
          {record.scope && <Fields items={[["Confirmed service", record.scope.service], ["CTP inherent risk", record.scope.risk], ["Review plan", record.scope.plan], ["Classification reasoning", record.scope.rationale]]}/>}
          {analyst && !record.decision && <>
            <Note>Record the classification under the customer’s approved CTP method. The base-impact score does not calculate the final tier. Keep the submitted service scope; a different use requires a new request and fresh business-impact answers.</Note>
            {form("scope", [["risk", "CTP inherent-risk tier", ["Critical", "High", "Medium", "Low"]], ["plan", "Applicable review plan", REVIEW_PLANS], ["rationale", "Scope, unresolved facts and CTP classification reasoning", "textarea"]], values => run("scope", { ...values, service: engagement.service }), record.scope ? "Save revised scope" : "Confirm scope and begin assessment", record.scope || {})}
            <details><summary>Need more information from the customer?</summary>{form("clarify", [["question", "Question for the customer", "textarea"]], values => run("clarify", values), "Request clarification")}</details>
          </>}
          {!analyst && !record.scope && <Note>The assigned analyst reviews your facts and confirms scope. No supplier decision has been made.</Note>}
          <Button onClick={() => downloadJSON(engagement.receipt, receipt)}>Download original receipt</Button>
        </Card>}

        {section === "evidence" && <Card title="Service evidence and review">
          {!record.scope ? <Note>Confirm intake and scope before adding evidence. <Button onClick={() => changeSection("triage")}>Review intake →</Button></Note> : <>
            <p>Record a document or source reference you have actually reviewed. Each entry keeps its own version and reviewer; earlier entries remain in the history.</p>
            {record.evidence.map(item => <article className="request-flow-evidence" key={item.id}><h3>{item.name} · {item.version}</h3><p><b>Source:</b> {item.source}</p><p>{item.notes}</p><small>{historyRecord(item)}</small><Badge>{record.reviews[item.id]?.conclusion || "Needs review"}</Badge>{record.reviews[item.id] && <><p>{record.reviews[item.id].rationale}</p><small>{historyRecord(record.reviews[item.id])}</small></>}{analyst && canFollowUp && <Button small onClick={() => setReviewId(reviewId === item.id ? null : item.id)}>{record.reviews[item.id] ? "Revise source review" : "Review this source"}</Button>}{reviewId === item.id && analyst && canFollowUp && form(`review-${item.id}`, [["conclusion", "Evidence conclusion", ["Supported", "Partially supported", "Unknown", "Contradictory", "Out of scope"]], ["rationale", "What this source supports, its service coverage and limits", "textarea"]], values => run("review", { ...values, evidenceId: item.id }, `review-${item.id}`), "Save evidence review", record.reviews[item.id] || {})}{findings.filter(f => f.evidenceId === item.id).map(f => <p key={f.id}><Badge>{f.severity} finding</Badge> <b>{f.issue}</b> · owner {f.owner} · due {f.due}. Closes with: {f.closure}</p>)}{analyst && !record.decision && ["Partially supported", "Contradictory"].includes(record.reviews[item.id]?.conclusion) && <details><summary>Raise a finding from this source</summary>{form(`finding-${item.id}`, [["issue", "What is unresolved"], ["severity", "Finding severity", ["High", "Medium", "Low"]], ["owner", "Accountable owner"], ["due", "Due date", "date"], ["closure", "Evidence that would close this finding", "textarea"]], values => run("finding", { ...values, evidenceId: item.id }, `finding-${item.id}`), "Raise finding")}<Note>A finding does not change the CTP inherent-risk tier. Raising it sends the recommendation back for revision.</Note></details>}</article>)}
            {!record.evidence.length && <Note>No evidence has been recorded for this service.</Note>}
            {asks.length > 0 && <><h3>Supplier requests</h3>{asks.map(ask => <article className="request-flow-evidence" key={ask.id}><h3>{ask.condition ? "Approval condition · " : ""}{ask.ask}</h3><small>Due {ask.due} · requested by {historyRecord(ask)}</small><Badge>{{ Open: "Waiting for supplier", Withdrawn: "Withdrawn" }[ask.status] || "Supplier responded"}</Badge>{ask.withdrawn && <p><b>Withdrawn:</b> {ask.withdrawn.rationale}</p>}{ask.status === "Open" && analyst && canFollowUp && <details><summary>Withdraw this request</summary>{form(`withdraw-${ask.id}`, [["rationale", "Why it is no longer needed", "textarea"]], values => run("withdrawAsk", { ...values, askId: ask.id }, `withdraw-${ask.id}`), "Withdraw request")}</details>}{ask.response && <p><b>Response:</b> {ask.response.name} · {ask.response.version}. Review it in the source list above.</p>}</article>)}</>}
            {analyst && canFollowUp && <details><summary>Request evidence from the supplier</summary>{form("askSupplier", [["ask", "What the supplier must provide", "textarea"], ["due", "Due date", "date"]], values => run("askSupplier", values), "Send request to supplier")}</details>}
            {analyst && canFollowUp && <><h3>{record.decision ? "Add follow-up evidence" : "Add evidence source"}</h3>{form("evidence", [["name", "Document or source name"], ["source", "Source reference or URL"], ["version", "Exact document or source version"], ["notes", "Service coverage and source context", "textarea"]], values => run("evidence", values), "Record evidence source")}<Note>Sources and file metadata stay in this session. This form does not upload, extract or verify file contents.</Note></>}
            {evidenceReviewed && !record.decision && <Button onClick={() => changeSection("recommendation")}>Continue to recommendation →</Button>}
          </>}
        </Card>}

        {section === "recommendation" && <Card title="Analyst recommendation">
          {record.customerReturn && <Note warning>Customer requested clarification: {record.customerReturn.rationale}. Revise the analyst recommendation, then run QA again.</Note>}
          {record.recommendation && <><Badge>{record.recommendation.outcome}</Badge><p>{record.recommendation.rationale}</p><small>{historyRecord(record.recommendation)}</small></>}
          {!evidenceReviewed ? <Note>Confirm scope and review every evidence source before recommending an outcome. <Button onClick={() => changeSection("evidence")}>Review evidence →</Button></Note> : analyst && !record.decision ? form("recommend", [["outcome", "Suggested customer outcome", outcomes], ["rationale", "Evidence-based recommendation and remaining limitations", "textarea"]], values => run("recommend", values), "Save recommendation and go to QA", record.recommendation || {}) : <Note>The analyst records a recommendation. The customer retains the final decision.</Note>}
          {record.qa && !record.qa.outcome?.startsWith("Passed") && <Note warning>QA challenge: {record.qa.rationale}</Note>}
        </Card>}

        {section === "qa" && <Card title="QA review">
                    {record.recommendation ? <><h3>Recommendation: {record.recommendation.outcome}</h3><p>{record.recommendation.rationale}</p><small>{historyRecord(record.recommendation)}</small><Button onClick={() => changeSection("evidence")}>Inspect the reviewed sources →</Button></> : <Note>An analyst recommendation and complete evidence reviews are required first.</Note>}
          {record.qa && <><Badge>{record.qa.outcome}</Badge><p>{record.qa.rationale}</p><small>{historyRecord(record.qa)}</small></>}
          {record.qa ? <Note>{record.qa.outcome === "Passed" ? "QA passed. The next action belongs to the customer Decision Owner." : "QA sent this back. Revise the recommendation, then run QA again."}</Note> : analyst && record.recommendation && !record.decision ? <><Note>Check the recommendation against each reviewed source. Pass sends it to the customer; Rework or More evidence sends it back to the recommendation step.</Note>{form("qa", [["outcome", "QA outcome", ["Passed", "Rework requested", "More evidence required"]], ["rationale", "What you checked and why", "textarea"]], values => run("qa", values), "Record QA and send to customer")}</> : <Note>The assigned analyst completes QA before the customer decides.</Note>}
        </Card>}

        {section === "decision" && <Card title="Customer decision">
          <Fields items={[["Recommendation", record.recommendation?.outcome || "Not recorded"], ["Recommended by", record.recommendation?.actor || "Not recorded"], ["QA review", record.qa?.outcome || "Not recorded"], ["QA reviewer", record.qa?.actor || "Not recorded"], ["Findings raised", findings.map(f => `${f.severity} · ${f.issue} (${f.source})`).join("; ") || "None"]]}/>
          {record.recommendation && <p>{record.recommendation.rationale}</p>}{record.qa && <p><b>QA rationale:</b> {record.qa.rationale}</p>}
          {record.decision ? <><Badge>{record.decision.outcome}</Badge><p>{record.decision.rationale}</p><Button onClick={() => changeSection("monitoring")}>View frozen decision record →</Button></> : progress.action !== "decision" ? <Note>The analyst recommendation and QA review must be current and complete before a customer decision.</Note> : !decisionOwner ? <Note>Ready for the designated customer Decision Owner. Switch Demo user to the customer to sign; analysts can read this page but cannot sign.</Note> : <DecisionForm key={engagement.id} supplier={engagement.supplier} form={form} drafts={drafts} run={run} Button={Button} Note={Note}/>}
        </Card>}

        {section === "monitoring" && <Card title="Decision record and follow-up">
          {!record.signedPack ? <Note>No final customer decision has been recorded. <Button onClick={() => changeSection("decision")}>View decision readiness →</Button></Note> : <>
            <Badge>{record.decision.outcome}</Badge><Fields items={[["Service", record.scope.service], ["Decision Owner", record.decision.actor], ["Recorded", new Date(record.decision.at).toLocaleString()], ["Rationale", record.decision.rationale], ["Evidence versions at decision", record.signedPack.evidence?.map(item => `${item.name} · ${item.version}`).join(", ") || "See exported decision record"]]}/>
            <Button onClick={() => downloadJSON(`${engagement.receipt}-decision`, record.signedPack)}>Download frozen decision record</Button>
            <Note>The decision record is a frozen session snapshot. Follow-up actions never rewrite it. Download it before refreshing.</Note>
            {record.decision.condition && <><h3>Customer condition · {record.conditionClosed ? "Closed" : "Open"}</h3><Fields items={[["Owner", record.decision.condition.owner], ["Due date", record.decision.condition.due], ["Required proof", record.decision.condition.evidence]]}/>{!record.conditionClosed && <><Note>{asks.some(ask => ask.condition && ask.status === "Open") ? "The condition was sent to the supplier as an evidence request. Their response will appear for analyst review." : "The supplier has responded. The analyst reviews the new evidence, then closes the condition."}</Note><Button onClick={() => changeSection("evidence")}>Add and review follow-up evidence →</Button>{analyst && form("close", [["rationale", "How new, reviewed evidence satisfies the condition", "textarea"]], values => run("close", values), "Close condition")}</>}</>}
            {!record.decision.condition && <p>{record.decision.outcome === "Reject" ? "This service was rejected; no active assurance relationship was created." : "No customer conditions are outstanding."}</p>}
          </>}
        </Card>}
      </div>
      <aside className="request-flow-meta">
        <Card title="This assessment"><Fields items={[["Customer", engagement.client], ["Supplier", engagement.supplier], ["Service", record.scope?.service || engagement.service], ["Stage", progress.stage], ["Next owner", progress.nextOwner], ["Review plan", record.scope?.plan || "Awaiting scope review"]]}/><Button onClick={() => navigate(analyst ? "O01" : "C15")}>Back to {analyst ? "My work" : "assessments"}</Button></Card>
        <Card title="Named action history"><ol className="request-flow-history">{record.events.map(item => <li key={item.id}><b>{item.action}</b><p>{item.rationale}</p><small>{historyRecord(item)}</small></li>)}</ol>{!record.events.length && <p>Request submitted. No analyst action has been recorded yet.</p>}</Card>
      </aside>
    </div>
  </div>;
}

function DecisionForm({ supplier, form, drafts, run, Button, Note }) {
  const [review, setReview] = useState(null);
  const [sendAck, setSendAck] = useState(false);
  const values = drafts.decision || {};
  if (review) return <><h3>Confirm your decision</h3><p><b>{review.outcome}</b></p><p>{review.rationale}</p>{review.condition && <><p>Condition: {review.condition.owner} · {review.condition.due} · {review.condition.evidence}</p><Note warning>Confirming sends this condition to {supplier} as an evidence request: “{review.condition.evidence}”, due {review.condition.due}. The supplier sees only that request. If the condition is met inside your organisation, the analyst withdraws the supplier request and records the evidence directly.</Note><label className="request-flow-ack"><input type="checkbox" checked={sendAck} onChange={e => setSendAck(e.target.checked)}/> I understand this condition is sent to {supplier}</label></>}<Note>Confirming records your named decision and freezes its evidence and QA review.</Note><div className="request-flow-actions"><Button onClick={() => { setReview(null); setSendAck(false); }}>Keep editing</Button><Button primary disabled={review.condition && !sendAck} onClick={() => run("decision", review)}>{review.condition ? "Confirm decision and send condition to supplier" : "Confirm customer decision"}</Button></div></>;
  return form("decision", [["outcome", "Customer outcome", outcomes], ["rationale", "Your decision rationale", "textarea"], ...(values.outcome === "Approve with conditions" ? [["owner", "Condition owner"], ["due", "Condition due date", "date"], ["evidence", "Evidence required to close the condition (sent to the supplier)", "textarea"]] : [])], value => setReview({ outcome: value.outcome, rationale: value.rationale, ...(value.outcome === "Approve with conditions" ? { condition: { owner: value.owner, due: value.due, evidence: value.evidence } } : {}) }), "Review customer decision");
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
      setError(""); notify("Response sent. The assurance team reviews it; sending evidence does not approve anything.");
    } catch (err) { setError(err.message); }
  };
  const field = (ask, name, label, type = "text") => <label className="field"><span>{label}</span>{type === "textarea"
    ? <textarea rows={3} value={drafts[ask.id]?.[name] || ""} onChange={e => setDrafts({ ...drafts, [ask.id]: { ...drafts[ask.id], [name]: e.target.value } })}/>
    : <input value={drafts[ask.id]?.[name] || ""} onChange={e => setDrafts({ ...drafts, [ask.id]: { ...drafts[ask.id], [name]: e.target.value } })}/>}</label>;
  return <div className="request-flow">
    <section className="request-flow-hero"><div className="eyebrow">SUPPLIER INBOX</div><h2>Evidence requests</h2><p>Each request names the customer, service and proof needed. File contents are not uploaded in this demo; describe the document you would send.</p></section>
    {error && <p className="op-field-error" role="alert">{error}</p>}
    {cases.map(({ engagement, record }) => <Card key={engagement.id} title={`${engagement.client} · ${engagement.supplier} · ${engagement.service}`}>
      {record.supplierAsks.filter(ask => ask.status !== "Withdrawn").map(ask => <article className="request-flow-evidence" key={ask.id}>
        <h3>{ask.ask}</h3><small>Due {ask.due}</small>
        <Badge>{ask.status === "Open" ? "Response required" : "Sent · awaiting review"}</Badge>
        {ask.status === "Open" ? <form className="request-flow-form" onSubmit={e => { e.preventDefault(); submit(engagement, ask); }}>
          {field(ask, "name", "Document name")}{field(ask, "version", "Document version or date")}{field(ask, "notes", "What it covers for this service", "textarea")}
          <Button primary type="submit">Send response</Button></form>
          : <p><b>You sent:</b> {ask.response.name} · {ask.response.version}</p>}
      </article>)}
    </Card>)}
    <Note>Sending evidence never approves the supplier. The assurance team reviews each response and the customer keeps the final decision.</Note>
  </div>;
}
