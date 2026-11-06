import React, { useState } from "react";
import { Search, ArrowUpRight, Building2, FileText, PanelsTopLeft } from "lucide-react";
import { searchWorkspace } from "./search.mjs";

function Highlight({ value, query }) {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!terms.length) return value;
  const expression = new RegExp(`(${terms.join("|")})`, "gi");
  return String(value).split(expression).map((part, index) => index % 2 ? <mark key={index}>{part}</mark> : part);
}

export default function WorkspaceSearch({ data, catalog, user, update, navigate }) {
  const [query, setQuery] = useState("");
  const results = searchWorkspace(data, catalog, user, query);
  const total = results.suppliers.length + results.services.length + results.pages.length;
  const customers = [...new Set(data.engagements.filter(row => user?.workspaceIds.includes(row.workspaceId)).map(row => row.client))];
  const openRecord = (row, supplier) => {
    update({ selected: row.id });
    navigate(user.role === "analyst" ? "O02" : supplier ? "C11" : "C09");
  };
  const text = value => <Highlight value={value} query={query}/>;
  return <div className="workspace-search">
    <p className="search-scope">{user?.role === "superadmin" ? "Team administration" : user?.role === "supplier" ? "Supplier invitation pages" : customers.join(" · ") || "No assigned customers"} · authorised records only</p>
    <div className="search-input full-search"><Search size={18}/><input autoFocus aria-label="Search suppliers, services or pages" placeholder="Search suppliers, services or pages" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear workspace search">Clear</button>}</div>
    <p className="search-scope">{query.trim() ? `${total} matching results for “${query.trim()}”` : "Browse suppliers, individual service reviews and pages in your current customer scope."}</p>
    {results.suppliers.length > 0 && <section className="search-result-group" aria-label="Supplier results"><h3>Suppliers · {results.suppliers.length}</h3>{results.suppliers.map(row => <button type="button" className="search-result" key={row.key} onClick={() => openRecord(row, true)}><Building2 size={19}/><span><b>{text(row.supplier)}</b><small>{text(`${row.domain} · ${row.client}`)}</small><small>{row.serviceCount} service {row.serviceCount === 1 ? "scope" : "scopes"} · {row.services.length} matching</small></span><span className="search-result-kind">Supplier</span><ArrowUpRight size={16}/></button>)}</section>}
    {results.services.length > 0 && <section className="search-result-group" aria-label="Service review results"><h3>Service reviews · {results.services.length}</h3>{results.services.map(row => <button type="button" className="search-result" key={row.id} onClick={() => openRecord(row, false)}><FileText size={19}/><span><b>{text(row.service)}</b><small>{text(`${row.client} / ${row.supplier}`)}</small><small>{text(`${row.stage} · CTP inherent risk: ${row.risk}`)}</small></span><span className="search-result-kind">Service review</span><ArrowUpRight size={16}/></button>)}</section>}
    {results.pages.length > 0 && <section className="search-result-group" aria-label="Page results"><h3>Pages · {results.pages.length}</h3>{results.pages.map(page => <button type="button" className="search-result" key={page.id} onClick={() => navigate(page.id)}><PanelsTopLeft size={19}/><span><b>{text(page.label)}</b><small>{text(`${page.id} · ${page.title || page.label}`)}</small></span><span className="search-result-kind">Page</span><ArrowUpRight size={16}/></button>)}</section>}
    {!total && <div className="directory-empty" role="status"><Search size={28}/><h3>No matching suppliers, services or pages</h3><p>No results for “{query.trim()}” in your current scope. Try a company name, domain or service.</p><button type="button" className="button" onClick={() => setQuery("")}>Clear search</button>{user?.role === "customer" && <button type="button" className="button primary" onClick={() => navigate("C02")}>Start a supplier request</button>}</div>}
  </div>;
}
