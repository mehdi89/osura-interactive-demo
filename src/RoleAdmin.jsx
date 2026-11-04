import React, { useState } from "react";
import { saveAnalyst, sessionUser, visibleAudit } from "./access.mjs";

export function AuditTrail({ entries, user }) {
  const rows = visibleAudit(entries, user).slice().reverse();
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "osura-session-audit.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="card"><div className="card-head"><h2>Activity & accountability</h2><button className="button" onClick={download}>Download activity</button></div>
    <div className="card-body"><p>Named actions in this demo session. Prepared fixture reviews are labelled separately. Refresh clears this simulated history.</p>
      {!rows.length && <p className="note">No actions recorded yet in your accessible customers.</p>}
      <div className="audit-list">{rows.map(row => <article key={row.id} className="audit-item">
        <strong>{row.action}{row.recommendation || row.outcome || row.conclusion ? ` · ${row.recommendation || row.outcome || row.conclusion}` : ""}</strong><p>{row.actor} · {row.role} · {new Date(row.at).toLocaleString()}</p>
        <p>{row.customer || "Team administration"}{row.service ? ` / ${row.service}` : ""}</p><p>{row.rationale}</p>
        <details><summary>View actor IDs, evidence and change details</summary><pre>{JSON.stringify(row, null, 2)}</pre></details>
      </article>)}</div>
    </div></section>;
}

export default function RoleAdmin({ model, user, validate, onSave, auditLog }) {
  const blank = { id: "", name: "", email: "", active: true, canQA: false, workspaceIds: [] };
  const [draft, setDraft] = useState(blank);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const edit = row => {
    setDraft({ ...row, name: model.actors.find(actor => actor.id === row.actorId).name, workspaceIds: model.customerAssignments.filter(a => a.userId === row.id).map(a => a.workspaceId) });
    setError(""); setMessage("");
  };
  const submit = event => {
    event.preventDefault();
    try {
      const result = saveAnalyst(model, user, draft, validate);
      onSave(result.model, { id: crypto.randomUUID(), action: result.before ? "Analyst access updated" : "Analyst added", message: "Team access changed",
        rationale: `${result.after.name}: ${draft.active ? "active" : "inactive"}; QA ${draft.canQA ? "enabled" : "disabled"}; customers: ${model.workspaces.filter(row=>draft.workspaceIds.includes(row.id)).map(row=>row.name).join(", ") || "none"}.`,
        at: new Date().toISOString(), actor: user.name, actorId: user.actorId, userId: user.id, role: user.role,
        workspaceId: null, customer: "Team administration", targetUserId: result.userId, before: result.before, after: result.after });
      setDraft(blank); setMessage("Analyst saved. Customer access takes effect immediately in this session."); setError("");
    } catch (error) { setError(error.message); }
  };
  return <>
    <p className="note">Superadmin manages team access. QA and customer decisions remain separate permissions. These controls simulate access; no real login or email invitation is created.</p>
    <div className="stats"><div className="stat"><strong>{model.users.filter(u=>u.role==="analyst"&&u.active).length}</strong><b>Active analysts</b></div><div className="stat"><strong>{model.workspaces.length}</strong><b>Customers</b></div><div className="stat"><strong>{model.customerAssignments.length}</strong><b>Customer assignments</b></div></div>
    <div className="grid equal">
      <section className="card"><div className="card-head"><h2>Analysts & customer access</h2></div><div className="card-body">
        <button className="button" onClick={()=>{setDraft(blank);setError("");setMessage("");}}>Add analyst</button>
        {model.users.filter(row=>row.role==="analyst").map(row=><div className="list-row" key={row.id}><div><b>{sessionUser(model,row.id).name}</b><p>{row.email} · {row.active?"Active":"Inactive"} · {row.canQA?"QA enabled":"Analysis only"}</p>
          <p>{model.customerAssignments.filter(a=>a.userId===row.id).map(a=>model.workspaces.find(w=>w.id===a.workspaceId).name).join(", ")||"No customers assigned"}</p></div><button className="button" onClick={()=>edit(row)}>Edit {sessionUser(model,row.id).name}</button></div>)}
      </div></section>
      <section className="card"><div className="card-head"><h2>{draft.id?"Edit analyst":"Add analyst"}</h2></div><div className="card-body">
        {error&&<p role="alert" className="data-error">{error}</p>}{message&&<p role="status" className="note">{message}</p>}
        <form onSubmit={submit}>
          <label className="field"><span>Analyst name</span><input required name="analystName" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
          <label className="field"><span>Email</span><input required type="email" name="analystEmail" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>
          <label className="role-check"><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/>Active team member</label>
          <label className="role-check"><input type="checkbox" checked={draft.canQA} onChange={e=>setDraft({...draft,canQA:e.target.checked})}/>Allow independent QA (cannot review own work)</label>
          <fieldset><legend>Assigned customers</legend>{model.workspaces.map(workspace=><label className="role-check" key={workspace.id}><input type="checkbox" name={workspace.id} checked={draft.workspaceIds.includes(workspace.id)} onChange={e=>setDraft({...draft,workspaceIds:e.target.checked?[...draft.workspaceIds,workspace.id]:draft.workspaceIds.filter(id=>id!==workspace.id)})}/>{workspace.name}</label>)}</fieldset>
          <p>With no assignments, an analyst sees an empty work list.</p><button className="button primary" type="submit">Save analyst</button>
        </form>
      </div></section>
    </div>
    <AuditTrail entries={auditLog} user={user}/>
  </>;
}
