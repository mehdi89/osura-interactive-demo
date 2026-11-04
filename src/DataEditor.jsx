import React, { useState } from "react";
import { changeRecord } from "./data-model.mjs";

const label = row => row.name || row.fileName || row.issue || row.label || row.id;
const words = value => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());

export default function DataEditor({ model, schema, validate, onChange }) {
  const tables = Object.keys(schema.$defs).filter(name => !["users", "customerAssignments"].includes(name));
  const [table, setTable] = useState("engagements");
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fields = schema.$defs[table].properties;
  const selectRecord = row => {
    setDraft(structuredClone(row)); setEditing(true); setDeleting(false); setError(""); setMessage("");
  };
  const add = () => {
    setDraft(Object.fromEntries(Object.entries(fields).map(([key, property]) => [key,
      key === "id" ? `${table}-${crypto.randomUUID()}` : Array.isArray(property.type) ? null
        : property.enum ? property.enum[0] : property.type === "boolean" ? false : property.type === "integer" ? 1 : ""])));
    setEditing(false); setDeleting(false); setError(""); setMessage("");
  };
  const commit = action => {
    try {
      const next = changeRecord(model, table, action, draft, validate);
      onChange(next);
      setMessage(`${words(table)} record ${action === "delete" ? "deleted" : "saved"}. Changes last until refresh.`);
      setError(""); setDeleting(false); if (action === "delete") setDraft(null); else setEditing(true);
    } catch (error) { setError(error.message); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(model, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "workspace.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="data-editor">
    <p className="note">Synthetic fixture records · changes stay in this tab until refresh. Manage analysts and assignments in Team & access. Linked records must exist before saving; referenced records cannot be deleted. Current workflow actions can override these base values. Reset the walkthrough to clear workflow overrides.</p>
    <div className="data-editor-tools">
      <label className="field"><span>Collection</span><select value={table} onChange={event => {
        setTable(event.target.value); setDraft(null); setError(""); setMessage(""); setDeleting(false);
      }}>{tables.map(name => <option key={name} value={name}>{words(name)} ({model[name].length})</option>)}</select></label>
      <button type="button" className="button primary" onClick={add}>Add record</button>
      <button type="button" className="button" onClick={download}>Download data JSON</button>
      <a href="/schemas/workspace.schema.json" target="_blank" rel="noreferrer">View schema</a>
    </div>
    {message && <p role="status" className="note">{message}</p>}
    {error && <p role="alert" className="data-error">{error}</p>}
    <div className="data-editor-grid">
      <div className="data-records" aria-label="Records">
        {model[table].length === 0 && <p>No records yet. Add a record to begin.</p>}
        {model[table].map(row => <button type="button" key={row.id} className={draft?.id === row.id ? "active" : ""} onClick={() => selectRecord(row)}>
          <b>{label(row)}</b><small>{row.id}</small>
        </button>)}
      </div>
      {draft ? <form onSubmit={event => { event.preventDefault(); commit(editing ? "update" : "create"); }}>
        <h3>{editing ? "Edit record" : "New record"}</h3>
        <div className="data-fields">{Object.entries(fields).map(([key, property]) => {
          const value = draft[key];
          const nullable = Array.isArray(property.type);
          const target = property["x-references"];
          const options = target ? model[target].map(row => [row.id, `${label(row)} · ${row.id}`])
            : property.enum?.map(value => [value, value]);
          return <label className="field" key={key}><span>{words(key)}{nullable ? " (optional)" : " *"}</span>
            {options ? <select name={key} required={!nullable} value={value ?? ""} onChange={event => setDraft({ ...draft, [key]: event.target.value || null })}>
              <option value="">Select…</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select> : property.type === "boolean" ? <select name={key} value={String(value)} onChange={event => setDraft({ ...draft, [key]: event.target.value === "true" })}>
              <option value="true">Yes</option><option value="false">No</option>
            </select> : <input name={key} required={!nullable} disabled={key === "id" && editing}
              type={property.format === "date" ? "date" : property.format === "email" ? "email" : (property.type === "integer" || property.type?.includes?.("integer")) ? "number" : "text"}
              min={property.minimum} step={1} value={value ?? ""} pattern={property.pattern === "\\S" ? ".*\\S.*" : undefined}
              onChange={event => setDraft({ ...draft, [key]: event.target.value === "" && nullable ? null : property.type === "integer" || property.type?.includes?.("integer") ? Number(event.target.value) : event.target.value })} />}
          </label>;
        })}</div>
        <div className="form-actions">
          <button className="button primary" type="submit">Save record</button>
          {editing && <button className="button" type="button" onClick={() => setDeleting(true)}>Delete record</button>}
        </div>
        {deleting && <div className="note warning" role="group" aria-label="Confirm deletion">
          <span>Delete {draft.id}? This affects the current tab.</span>
          <button className="button" type="button" onClick={() => commit("delete")}>Confirm delete</button>
          <button className="button" type="button" onClick={() => setDeleting(false)}>Cancel</button>
        </div>}
      </form> : <p>Select a record to edit or add a new one.</p>}
    </div>
  </div>;
}
