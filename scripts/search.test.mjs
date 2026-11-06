import test from "node:test";
import assert from "node:assert/strict";
import { searchWorkspace } from "../src/search.mjs";

const user = { active: true, role: "analyst", workspaceIds: ["northstar"] };
const data = {
  suppliers: [{ name: "HubSpot", domain: "hubspot.com" }, { name: "Private Supplier", domain: "private.example" }],
  engagements: [
    { id: "crm", supplier: "HubSpot", service: "CRM management", workspaceId: "northstar", client: "Northstar", stage: "Active" },
    { id: "marketing", supplier: "HubSpot", service: "Marketing sync", workspaceId: "northstar", client: "Northstar", stage: "Findings" },
    { id: "private", supplier: "Private Supplier", service: "Private service", workspaceId: "ridgeway", client: "Ridgeway", stage: "Active" },
    { id: "other-client-hubspot", supplier: "HubSpot", service: "Private CRM", workspaceId: "ridgeway", client: "Ridgeway", stage: "Active" },
  ],
};
const catalog = { screens: [
  { id: "O03", role: "analyst", label: "Evidence", title: "Evidence and documents" },
  { id: "C06", role: "customer", label: "Customer decision", title: "Record decision" },
] };

test("workspace search groups suppliers after applying assigned-customer access", () => {
  const results = searchWorkspace(data, catalog, user, "hubspot.com");
  assert.equal(results.suppliers.length, 1);
  assert.equal(results.suppliers[0].workspaceId, "northstar");
  assert.equal(results.suppliers[0].serviceCount, 2);
  assert.deepEqual(results.services.map(row => row.id), ["crm", "marketing"]);
  assert.deepEqual(results.suppliers[0].services.map(row => row.id), ["crm", "marketing"]);
  assert.equal(searchWorkspace(data, catalog, user, "private").services.length, 0);
});

test("service search pins its matching engagement and pages stay within role", () => {
  const results = searchWorkspace(data, catalog, user, "  HUBSPOT CRM  ");
  assert.deepEqual(results.services.map(row => row.id), ["crm"]);
  assert.equal(results.suppliers[0].id, "crm");
  assert.equal(results.suppliers[0].serviceCount, 2);
  assert.deepEqual(searchWorkspace(data, catalog, user, "evidence").pages.map(row => row.id), ["O03"]);
  assert.deepEqual(searchWorkspace(data, catalog, user, "decision").pages, []);
});

test("same suppliers in different assigned customers keep separate results; admin search stays administrative", () => {
  const assigned = searchWorkspace(data, catalog, { ...user, workspaceIds: ["northstar", "ridgeway"] }, "hubspot");
  assert.deepEqual(assigned.suppliers.map(row => row.workspaceId), ["northstar", "ridgeway"]);
  const admin = searchWorkspace(data, catalog, { ...user, role: "superadmin" });
  assert.deepEqual(admin.suppliers, []);
  assert.deepEqual(admin.services, []);
  assert.deepEqual(admin.pages.map(page => page.id), ["A01"]);
  assert.deepEqual(searchWorkspace(data, catalog, { ...user, active: false }), { suppliers: [], services: [], pages: [] });
});
