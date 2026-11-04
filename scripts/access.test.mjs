import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadModelFiles } from "./database.mjs";
import { createModelValidator, projectWorkspace } from "../src/data-model.mjs";
import { sessionUser, scopeWorkspace, saveAnalyst, visibleAudit } from "../src/access.mjs";
import { createState, saveRequirementReview, recordQA, recordDecision, mergeWorkflowPatch } from "../src/state.mjs";
const { schema, data: model, presentation } = await loadModelFiles();
const examples = JSON.parse(await readFile(new URL("../public/data/examples.json", import.meta.url)));
const base = projectWorkspace(model, presentation, examples);
const validate = createModelValidator(schema, presentation);
const admin = sessionUser(model, "superadmin");
const context = id => scopeWorkspace(base, sessionUser(model,id));
const review = { recommendation: "Approve with conditions", judgement: "Independently inspected service scope", conclusion: "Partially supported", reason: "Scope remains partial" };

test("customers see one company; analysts combine all and only assigned customers", () => {
  const customer = context("customer-morgan");
  assert.deepEqual([...new Set(customer.engagements.map(row=>row.workspaceId))],["northstar"]);
  const analyst = context("analyst-01");
  assert.equal(analyst.engagements.length,11);
  assert.equal(context("analyst-02").engagements.length,9);
  const filtered = scopeWorkspace(base,sessionUser(model,"analyst-01"),"ridgeway");
  assert.equal(filtered.engagements.length,2);
  assert.equal(filtered.findings.length,0);assert.equal(filtered.documents.length,0);assert.equal(filtered.requirements.length,0);
  assert.equal(filtered.communications.some(row=>row[1]==="CedarCloud"),false);
});

test("superadmin creates, changes and deactivates analysts; access follows assignments immediately", () => {
  const result = saveAnalyst(model,admin,{name:"New Analyst",email:"new@osura.example",active:true,canQA:false,workspaceIds:["ridgeway"]},validate);
  let user = sessionUser(result.model,result.userId);
  assert.equal(scopeWorkspace(base,user).engagements.length,2);
  const updated = saveAnalyst(result.model,admin,{id:user.id,name:user.name,email:user.email,active:true,canQA:true,workspaceIds:["northstar"]},validate);
  user = sessionUser(updated.model,user.id);assert.equal(scopeWorkspace(base,user).engagements.length,9);assert.equal(user.canQA,true);
  const deactivated = saveAnalyst(updated.model,admin,{id:user.id,name:user.name,email:user.email,active:false,canQA:true,workspaceIds:["northstar"]},validate);
  assert.equal(scopeWorkspace(base,sessionUser(deactivated.model,user.id)).engagements.length,0);
  assert.equal(model.users.length,4);
});

test("assignment administration rejects non-admins, duplicates and invalid references", () => {
  const values={name:"Analyst",email:"analyst01@osura.example",active:true,canQA:false,workspaceIds:["northstar"]};
  assert.throws(()=>saveAnalyst(model,sessionUser(model,"analyst-01"),values,validate),/Superadmin/);
  assert.throws(()=>saveAnalyst(model,admin,values,validate),/unique/);
  assert.throws(()=>saveAnalyst(model,admin,{...values,email:"new@osura.example",workspaceIds:["missing"]},validate),/valid customer/);
  const invalid=structuredClone(model);invalid.users.find(row=>row.role==="superadmin").active=false;
  assert.throws(()=>validate(invalid),/active superadmin/);
});

test("recommendations require an assigned analyst and retain a named immutable action", () => {
  const customer=context("customer-morgan");const initial=createState(customer);
  assert.throws(()=>saveRequirementReview(initial,customer,"R-07",review),/assigned analyst/);
  assert.throws(()=>saveRequirementReview(initial,context("superadmin"),"R-07",review),/assigned analyst/);
  const next=saveRequirementReview(initial,context("analyst-01"),"R-07",review);
  assert.equal(next.reviews["R-07"].actorId,"osura-analyst-01");assert.equal(next.qa,"Rework requested");
  const entry=next.events.at(-1);assert.equal(entry.workspaceId,"northstar");assert.equal(entry.engagementId,"cedar");
  assert.equal(entry.recommendation,"Approve with conditions");assert.equal(entry.role,"analyst");assert.equal(entry.rationale,review.judgement);assert.ok(entry.at);assert.equal(entry.evidenceVersions.length,5);
  assert.equal(initial.events.length,0);
  const noAccess={...context("analyst-01"),access:{...sessionUser(model,"analyst-01"),workspaceIds:["ridgeway"]}};
  assert.throws(()=>saveRequirementReview(initial,noAccess,"R-07",review),/do not have access/);
});

test("QA requires permission, a different reviewer and no unreviewed new evidence", () => {
  const initial=createState(base);
  assert.throws(()=>recordQA(initial,context("analyst-01"),"Passed","Checked"),/permission/);
  const self={...context("analyst-01"),access:{...sessionUser(model,"analyst-01"),canQA:true}};
  assert.throws(()=>recordQA(initial,self,"Passed","Checked"),/own analysis/);
  assert.throws(()=>recordQA(initial,context("superadmin"),"Passed","Checked"),/permission/);
  const byReviewer=saveRequirementReview(initial,context("analyst-02"),"IAM-04",{...review,conclusion:"Unknown"});
  assert.throws(()=>recordQA(byReviewer,context("analyst-02"),"Passed","Checked"),/own analysis/);
  assert.throws(()=>recordQA({...initial,pendingReviews:{"R-07":true}},context("analyst-02"),"Passed","Checked"),/new evidence/);
  const next=recordQA(initial,context("analyst-02"),"Passed with condition","Checked the scoped evidence");
  assert.equal(next.qaReview.actorId,"qa-reviewer-02");assert.equal(next.qaReview.prepared,false);
});

test("only customer Decision Owner signs; pack freezes review attribution and history", () => {
  const state=recordQA(createState(base),context("analyst-02"),"Passed","Independent challenge completed");
  assert.throws(()=>recordDecision(state,context("superadmin"),"Approve","Proceed",null),/Decision Owner/);
  assert.throws(()=>recordDecision(state,context("analyst-01"),"Approve","Proceed",null),/Decision Owner/);
  const next=recordDecision(state,context("customer-morgan"),"Approve","Customer accepts",null);
  assert.equal(next.decision.actorId,"a-morgan");assert.equal(next.signedPack.qaReview.actorId,"qa-reviewer-02");
  state.qaReview.actor="Changed later";assert.notEqual(next.signedPack.qaReview.actor,"Changed later");
  assert.equal(next.events.at(-1).role,"customer");
});

test("audit visibility follows access while administrative history stays with superadmin", () => {
  const events=[{id:"a",workspaceId:"northstar",role:"analyst"},{id:"b",workspaceId:"ridgeway",role:"analyst"},{id:"c",workspaceId:null,role:"superadmin"}];
  assert.equal(visibleAudit(events,admin).length,3);
  assert.equal(visibleAudit(events,sessionUser(model,"analyst-01")).length,2);
  assert.deepEqual(visibleAudit(events,sessionUser(model,"customer-morgan")).map(row=>row.id),["a"]);
  assert.equal(visibleAudit(events,{...admin,active:false}).length,0);
});


test("case mutations cannot attribute Cedar evidence to another customer's engagement", () => {
  const state={...createState(base),selected:"clearbridge"};
  const other={...context("analyst-01"),activeEngagementId:"clearbridge"};
  assert.throws(()=>saveRequirementReview(state,other,"R-07",review),/scoped/);
  const qa={...other,access:{...other.access,canQA:true}};
  assert.throws(()=>recordQA(state,qa,"Passed","Checked"),/scoped/);
});


test("static panels use customer ownership even when customers share a supplier", () => {
  const shared={...base,allEngagements:[...base.allEngagements,{...base.allEngagements[0],id:"other-cedar",workspaceId:"ridgeway",client:"Ridgeway Finance"}]};
  const view=scopeWorkspace(shared,sessionUser(model,"analyst-01"),"ridgeway");
  assert.ok(view.engagements.some(row=>row.supplier==="CedarCloud"));
  assert.equal(view.monitoring.some(row=>row.workspaceId==="northstar"),false);
  assert.equal(view.communications.some(row=>row[0]==="CC-2026-104"),false);
  assert.equal(view.historicalReports.length,0);
});


test("saving from a filtered view preserves other customers' workflow records and immutable events", () => {
  const first={id:"event-1",workspaceId:"northstar",actor:"Original actor"};
  const initial={events:[first],scheduledReviews:[{id:"northstar-review",workspaceId:"northstar"}],extraFindings:[{id:"ridgeway-finding",workspaceId:"ridgeway"}]};
  const next=mergeWorkflowPatch(initial,{events:[{...first,actor:"Changed"},{id:"event-2",workspaceId:"ridgeway"}],scheduledReviews:[{id:"ridgeway-review",workspaceId:"ridgeway"}],extraFindings:[]});
  assert.equal(next.scheduledReviews.length,2);assert.equal(next.extraFindings.length,1);assert.equal(next.events.length,2);assert.equal(next.events[0].actor,"Original actor");assert.equal(initial.events.length,1);
});
