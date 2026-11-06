export function searchWorkspace(data, catalog, user, query = "") {
  if (!user?.active) return { suppliers: [], services: [], pages: [] };
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = text => terms.every(term => text.toLowerCase().includes(term));
  const records = ["customer", "analyst"].includes(user.role)
    ? data.engagements.filter(row => user.workspaceIds.includes(row.workspaceId))
    : [];
  const services = records.filter(row => matches(`${row.supplier} ${data.suppliers.find(supplier => supplier.name === row.supplier)?.domain || ""} ${row.service} ${row.client} ${row.stage}`));
  const groups = new Map();
  for (const row of services) {
    const key = `${row.workspaceId}:${row.supplier}`;
    if (!groups.has(key)) groups.set(key, {
      id: row.id, key, supplier: row.supplier, client: row.client, workspaceId: row.workspaceId,
      domain: data.suppliers.find(supplier => supplier.name === row.supplier)?.domain || "",
      services: [],
      serviceCount: records.filter(record => record.workspaceId === row.workspaceId && record.supplier === row.supplier).length,
    });
    groups.get(key).services.push(row);
  }
  const pages = user.role === "superadmin"
    ? [{ id: "A01", role: "superadmin", label: "Team & customer access", title: "Manage analysts, customer assignments and activity" }]
    : catalog.screens.filter(page => page.role === user.role);
  return { suppliers: [...groups.values()], services, pages: pages.filter(page => matches(`${page.id} ${page.label} ${page.title || ""} ${page.subtitle || ""}`)) };
}
