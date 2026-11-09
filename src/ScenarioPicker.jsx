import React, { useState } from "react";
import { MAX_SCENARIO_BYTES } from "./scenarios.mjs";

export default function ScenarioPicker({ current, defaultScenario, validate, onLoad }) {
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = React.useRef(0);
  const prepare = async read => {
    const revision = ++request.current;
    setCandidate(null); setError(""); setBusy(true);
    try {
      const next = validate(await read());
      if (revision === request.current) setCandidate(next);
    } catch (error) {
      if (revision === request.current) setError(error.message);
    } finally {
      if (revision === request.current) setBusy(false);
    }
  };
  return <form onSubmit={event => {
    event.preventDefault();
    try { if (candidate) onLoad(candidate); }
    catch (error) { setError(error.message); }
  }}>
    <p>Current scenario: <b>{current.name}</b></p>
    <p className="note">Loading a scenario starts a fresh demo session. Current drafts, edits and recorded actions are cleared. Appearance stays the same; refreshing restores the default scenario.</p>
    <label className="field"><span>Pick a scenario</span><select aria-label="Demo scenario" defaultValue="" onChange={event => {
      const choice = event.target.value;
      if (!choice) { ++request.current; setCandidate(null); setError(""); setBusy(false); return; }
      prepare(async () => {
        if (choice === defaultScenario.id) return defaultScenario;
        const response = await fetch("/data/scenarios/cedarline.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Cedarline scenario could not load. Try again.");
        return response.json();
      });
    }}><option value="">Choose a scenario</option><option value={defaultScenario.id}>{defaultScenario.name}</option><option value="cedarline-manual-v1">Cedarline manual assessment</option></select></label>
    <label className="field"><span>Or load a scenario JSON file</span><input type="file" accept=".json,application/json" aria-label="Scenario JSON file" onChange={event => {
      const file = event.target.files?.[0];
      if (!file) return;
      prepare(async () => {
        if (file.size > MAX_SCENARIO_BYTES) throw new Error("Choose a scenario JSON smaller than 2 MB.");
        return JSON.parse(await file.text());
      });
    }}/></label>
    {busy && <p role="status">Checking scenario…</p>}
    {error && <p className="data-error" role="alert">{error}</p>}
    {candidate && <div role="status"><h3>{candidate.name}</h3><p>{candidate.description}</p><p>{candidate.workspace.engagements.length} service reviews · {candidate.workspace.requirementReviews.length} evidence conclusions · {candidate.workspace.findings.length} findings</p></div>}
    <div className="form-actions"><button className="button primary" type="submit" disabled={!candidate || busy}>Load scenario</button></div>
  </form>;
}
