import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Circle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChartNoAxesColumn,
  CircleCheck,
  Clock,
  Download,
  Ellipsis,
  FileText,
  Folder,
  Info,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquare,
  PanelsTopLeft,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  X,
  ChevronDown,
  Eye,
} from "lucide-react";
const Icons = {
  Circle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChartNoAxesColumn,
  CircleCheck,
  Clock,
  Download,
  Ellipsis,
  FileText,
  Folder,
  Info,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquare,
  PanelsTopLeft,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  X,
  ChevronDown,
  Eye,
};
import {
  createState,
  recordDecision,
  submitSupplier,
  filterEngagements,
  saveRequirementReview,
  recordQA,
  mergeWorkflowPatch,
  workflowStatus,
  addEvidence,
  filterSupplierServices,
  canCloseCondition,
  closureEvidence,
  closeCondition,
} from "./state.mjs";
import "./styles.css";
import "./visual-system.css";
import "./customer-layouts.css";
import "./case-layouts.css";
import "./operations-layouts.css";
import DataEditor from "./DataEditor.jsx";
import RoleAdmin, { AuditTrail } from "./RoleAdmin.jsx";
import WorkspaceSearch from "./WorkspaceSearch.jsx";
import { sessionUser, scopeWorkspace, actionEntry } from "./access.mjs";
import { createModelValidator, projectWorkspace } from "./data-model.mjs";

const Icon = ({ name, size = 16, ...props }) => {
  const Component = Icons[name] || Icons.Circle;
  return <Component size={size} strokeWidth={1.65} {...props} />;
};
const supplierResponseLabels = { evidence: "Requested evidence", alternative: "Alternative evidence or scoped question", "cannot-provide": "Unable to provide requested evidence" };
const badgeTones = {
  Critical: "red", High: "amber", Medium: "blue", Low: "green",
  Supported: "green", "Partially supported": "amber", Unknown: "neutral", "Needs review": "amber", Contradictory: "red", "Out of scope": "neutral",
  Passed: "green", "Passed with condition": "green", "Rework requested": "amber", "More evidence required": "amber", "Evidence re-review required": "amber", "Analyst revision required": "amber", "Independent QA required": "blue", "Ready for customer decision": "purple",
  Approve: "green", Approved: "green", Active: "green", "Approve with conditions": "amber", "Approved with conditions": "amber", Reject: "red", Rejected: "red", "Return for clarification": "amber",
  "Open condition": "amber", "Proposed condition": "neutral", Closed: "green", Received: "blue", Reviewed: "green", "Awaiting evidence": "amber", "Waiting external": "neutral", "In remediation": "amber", Scheduled: "blue", Overdue: "red", "Due soon": "amber", Signed: "green", "Prepared example": "neutral", "Retry queued (local)": "blue", "Queued (local)": "blue", "Response received": "blue", "Failed delivery": "red",
};
const Badge = ({ children, tone }) => {
  const label = React.Children.toArray(children).map(value => typeof value === "string" || typeof value === "number" ? value : "").join("");
  const color = tone || badgeTones[label] || badgeTones[label.split(": ").at(-1)] || "neutral";
  return <span className={`badge ${color}`}><Icon name={{ green: "Check", red: "TriangleAlert", amber: "Clock", blue: "Info", purple: "Circle" }[color] || "Circle"} size={12} />{children}</span>;
};
const Button = ({ children, onClick, primary, icon, small, ...props }) => (
  <button
    type="button"
    className={`button ${primary ? "primary" : ""} ${small ? "small" : ""}`}
    onClick={onClick}
    {...props}
  >
    {icon && <Icon name={icon} size={14} />}
    {children}
  </button>
);
const Link = ({ children, onClick, ...props }) => (
  <button className="link" onClick={onClick} {...props}>
    {children}
  </button>
);
const Card = ({ title, action, children, className = "" }) => (
  <section className={`card ${className}`}>
    {title && (
      <div className="card-head">
        <h2>{title}</h2>
        {action}
      </div>
    )}
    <div className="card-body">{children}</div>
  </section>
);
const Note = ({ children, warning }) => (
  <div className={`note ${warning ? "warning" : ""}`}>
    <Icon name="Info" size={14} />
    <span>{children}</span>
  </div>
);
const Stats = ({ items }) => (
  <div className="stats">
    {items.map(([value, label, detail]) => (
      <div className="stat" key={label}>
        <strong>{value}</strong>
        <b>{label}</b>
        {detail && <span>{detail}</span>}
      </div>
    ))}
  </div>
);
const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs">
    {tabs.map((tab) => (
      <button
        key={tab}
        className={value === tab ? "active" : ""}
        aria-pressed={value === tab}
        onClick={() => onChange(tab)}
      >
        {tab}
      </button>
    ))}
  </div>
);
const Fields = ({ items }) => (
  <dl className="fields">
    {items.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

function evidenceSummary(requirements) {
  const counts = requirements.reduce((all, row) => ({ ...all, [row.conclusion]: (all[row.conclusion] || 0) + 1 }), {});
  return { total: requirements.length, counts, text: Object.entries(counts).map(([conclusion, count]) => `${count} ${conclusion.toLowerCase()}`).join(" · ") };
}
const Label = ({ title, children, hint }) => (
  <label className="field">
    <span>{title}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

function formatDate(value) {
  if (!value || value === "—") return value || "—";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function projectRequirementEvidence(requirement, state, data) {
  const receipt = state.supplierReceipts?.[data.request.items[requirement.id === "R-07" ? 0 : requirement.id === "IAM-04" ? 1 : -1]];
  const upload = (state.uploads || []).filter(doc => doc.requirement === requirement.id || !doc.requirement)
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0];
  const selected = upload && (!receipt || Date.parse(upload.receivedAt) > Date.parse(receipt.at))
    ? { kind: "upload", record: upload }
    : receipt ? { kind: "receipt", record: receipt } : null;
  const sourceDocument = selected?.kind === "upload"
    ? { name: upload.name, version: upload.version, date: upload.receivedAt, page: "Metadata only · no extraction" }
    : selected?.kind === "receipt"
      ? { name: receipt.fileName || (receipt.responseType === "cannot-provide" ? "Cannot-provide explanation" : "Alternative evidence explanation"), version: receipt.reference, date: receipt.at, page: "Supplier response · no extraction" }
      : data.documents.find(doc => doc.requirement === requirement.id);
  return {
    ...requirement,
    sourceDocument,
    conclusion: state.pendingReviews?.[requirement.id] ? "Needs review" : state.reviews?.[requirement.id]?.conclusion || requirement.conclusion,
    ...(selected?.kind === "receipt" ? {
      source: `${sourceDocument.name} · ${selected.record.reference} · supplier response`,
      passage: selected.record.answer,
      proves: "Supplier claim requiring independent review",
      doesNotProve: "Operational effectiveness without reviewed support",
    } : selected?.kind === "upload" ? {
      source: `${selected.record.name} · ${selected.record.version}`,
      passage: "Only file metadata was supplied. No document contents have been extracted; inspect the original outside this prototype before recording a conclusion.",
      proves: "File metadata received; no content verified",
      doesNotProve: "Scope or effectiveness without independent evidence review",
    } : {}),
  };
}

function Demo({ initialModel, presentation, examples, schema, catalog, validate }) {
  const [model, setModel] = useState(initialModel);
  const [identity, setIdentity] = useState("customer-morgan");
  const [auditLog, setAuditLog] = useState([]);
  const onAudit = entries => setAuditLog(old => [...old, ...structuredClone([entries].flat()).filter(row => !old.some(item => item.id === row.id))]);
  const user = identity === "supplier-contact" ? { id: identity, actorId: identity, name: "CedarCloud contact", role: "supplier", active: true, workspaceIds: ["northstar"] } : sessionUser(model, identity);
  const data = React.useMemo(() => projectWorkspace(model, presentation, examples), [model]);
  return <App data={data} {...{ catalog, model, schema, validate, user, identity, auditLog, onAudit }} onSwitch={setIdentity} onDataChange={setModel} />;
}

function App({ data: baseData, catalog, model, schema, validate, onDataChange, user, identity, onSwitch, auditLog, onAudit }) {
  const initialModel = React.useRef(model);
  const [customerFilter, setCustomerFilter] = useState("all");
  const scopedData = scopeWorkspace(baseData, user, user?.role === "analyst" ? customerFilter : "all");
  let data = scopedData;
  const [state, setState] = useState(() => createState(baseData));
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const currentCondition = state.decision?.condition;
  data = {
    ...scopedData,
    findings: scopedData.findings
      .filter((f) => !(state.decision && !currentCondition && f.id === "F-01"))
      .map((f) =>
        f.id === "F-01" && currentCondition
          ? {
              ...f,
              owner: currentCondition.owner,
              due: currentCondition.due,
              evidence: currentCondition.evidence,
              state: state.conditionClosed ? "Closed" : "Open condition",
            }
          : f.id === "F-01" && !state.decision ? { ...f, state: "Proposed condition" } : f,
      ),
    monitoring: scopedData.monitoring
      .filter(
        (row) =>
          !(
            state.decision &&
            !currentCondition &&
            row.activity === "Recovery condition"
          ),
      )
      .map((row) =>
        row.activity === "Recovery condition" && !state.decision ? { ...row, status: "Proposed condition" } : row.activity === "Recovery condition" && currentCondition
          ? {
              ...row,
              owner: currentCondition.owner,
              date: currentCondition.due,
              status: state.conditionClosed ? "Closed" : row.status,
            }
          : row,
      ),
    requirements: scopedData.requirements.map(r => projectRequirementEvidence(r, state, scopedData)),
    documents: [
      ...scopedData.documents,
      ...Object.entries(state.supplierReceipts || {}).flatMap(
        ([item, latest]) => (state.supplierReceiptHistory?.[item] || [latest]).map(receipt => ({
          name: receipt.fileName || (receipt.responseType === "cannot-provide" ? "Supplier cannot-provide explanation" : "Supplier alternative evidence explanation"),
          status: state.pendingReviews?.[
            item === scopedData.request.items[0] ? "R-07" : "IAM-04"
          ]
            ? "Needs review"
            : "Reviewed",
          version: receipt.reference,
          page: "Supplier metadata · no extraction",
          date: receipt.at,
          requirement: item === scopedData.request.items[0] ? "R-07" : "IAM-04",
        })),
      ),
      ...(state.uploads || []).map(doc => ({ ...doc, status: !state.pendingReviews?.[doc.requirement] && state.reviews?.[doc.requirement]?.evidenceVersions?.includes(doc.version) ? "Reviewed" : "Needs review" })),
    ],
    engagements: [
      ...scopedData.engagements,
      ...(state.extraEngagements || []),
    ].map((e) => ({
      ...e,
      owner: state.owners?.[e.id] || e.owner,
      ...(e.id === "cedar"
        ? { stage: workflowStatus(state).stage }
        : {}),
    })),
  };
  const [screenId, setScreenId] = useState(location.hash.slice(1) || "C01");
  const [drawer, setDrawer] = useState(null);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [demoTools, setDemoTools] = useState(false);
  const [navigationIntent, setNavigationIntent] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const menuButton = React.useRef(null);
  const sidebarRef = React.useRef(null);
  const closeMobileNav = () => { setMobileNav(false); menuButton.current?.focus(); };
  useEffect(() => {
    if (!mobileNav) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = sidebarRef.current;
    sidebar?.querySelector("button")?.focus();
    const trap = e => {
      if (e.key !== "Tab") return;
      const items = [...sidebar.querySelectorAll("a[href], button, select")].filter(el => el.getClientRects().length && !el.disabled);
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); }
      if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); }
    };
    sidebar?.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previousOverflow; sidebar?.removeEventListener("keydown", trap); menuButton.current?.focus(); };
  }, [mobileNav]);
  const baseScreen = screenId === "A01" ? { id: "A01", role: "superadmin", title: "Team & customer access", label: "Administration", subtitle: "Manage analysts, customer assignments and accountability.", nav: "A01" }
    : catalog.screens.find((s) => s.id === screenId) || catalog.screens[0];
  const visualTitles = { C01: ["Know which supplier decisions need you.", "Osura reviews supplier evidence and prepares a clear recommendation. Your team makes the final decision."], C14: ["Find suppliers by the service you actually use", "Approval belongs to a service, not every use of the supplier."], C15: ["Supplier reviews", "See the next owner, review state and exact service scope."], O16: ["Supplier and service directory", "Find the right supplier, service and customer before opening a record."], C06: ["Make your customer decision", "Review Osura’s advice, then record the outcome your organisation accepts."], O04: ["Review evidence and its limits", "Read the source, record your judgement, then compare the prepared proposal."], O07: ["Findings and accountable responses", "Every material issue has a requirement, owner, due date and closure proof."], O14: ["Delivery status you can trust", "Local outbox activity is separate from confirmed supplier delivery."], O15: ["Keep supplier assurance current", "See which obligation is due, who owns it and the evidence needed next."] };
  const screen = { ...baseScreen, ...(visualTitles[baseScreen.id] ? { title: visualTitles[baseScreen.id][0], subtitle: visualTitles[baseScreen.id][1] } : {}), ...(baseScreen.id === "C06" ? { label: workflowStatus(state).label } : {}) };
  if (screen.id === "O06" && !state.supplierReceipt) screen.title = "Supplier response preview · no session response";
  const role = user?.role || "customer";
  const denied = !user?.active || (screen.role !== role && !(role === "analyst" && ["C06","C07","C13"].includes(screen.id)));
  const allowedNames = new Set(model.workspaces.filter(row => user?.workspaceIds.includes(row.id) && (role !== "analyst" || customerFilter === "all" || row.id === customerFilter)).map(row => row.name));
  data.engagements = data.engagements.filter(row => allowedNames.has(row.client));
  const engagement =
    data.engagements.find((e) => e.id === state.selected) ||
    data.directory.find((e) => e.id === state.selected) ||
    data.engagements[0] || { id: "none", supplier: "No accessible supplier", service: "", client: "", workspaceId: null };
  data.activeEngagementId = engagement.id;
  data.assessmentVersion = `${engagement.id}-review-v${state.assessmentRevision || 1}`;
  const commitNavigation = (id) => {
    const current = stateRef.current;
    if (["C14", "C15", "C10", "O01", "O15", "O16"].includes(screenId) && !["C14", "C15", "C10", "O01", "O15", "O16"].includes(id)) {
      stateRef.current = { ...current, returnTo: { route: screenId, selected: state.selected, label: screen.label } };
      setState(stateRef.current);
    }
    location.hash = id;
    setScreenId(id);
    setDrawer(null);
    setMobileNav(false);
    setDemoTools(false);
    window.scrollTo(0, 0);
  };
  const notify = (text) => {
    setToast(text);
  };
  const update = (patch) => {
    const added = (patch.events || []).filter(row => !stateRef.current.events.some(old => old.id === row.id));
    if (added.length) onAudit(added);
    stateRef.current = mergeWorkflowPatch(stateRef.current, patch);
    setState(stateRef.current);
  };
  const currentDraft = () => {
    const current = stateRef.current;
    const collection = { O04: "reviewDrafts", C13: "reviewDrafts", O08: "qaDrafts", C06: "decisionDrafts", O09: "closureDrafts" }[screenId];
    if (!collection) return null;
    const key = collection === "reviewDrafts" ? `${identity}:${state.selectedRequirement || "R-07"}` : identity;
    return current[collection]?.[key] ? { collection, key } : null;
  };
  const requestNavigation = run => {
    const draft = currentDraft();
    if (!draft) { run(); return; }
    // Record links may select their destination before requesting navigation.
    const keys = ["selected", "selectedRequirement", "selectedFinding", "selectedThread", "identityCandidate"].filter(key => stateRef.current[key] !== state[key]);
    const destination = Object.fromEntries(keys.map(key => [key, stateRef.current[key]]));
    if (keys.length) update(Object.fromEntries(keys.map(key => [key, state[key]])));
    setDrawer(null);
    setNavigationIntent({ draft, run: () => { if (keys.length) update(destination); run(); } });
  };
  const navigate = id => requestNavigation(() => commitNavigation(id));
  const switchIdentity = nextId => requestNavigation(() => {
    const nextRole = nextId === "supplier-contact" ? "supplier" : sessionUser(model, nextId)?.role;
    onSwitch(nextId); setCustomerFilter("all"); update({ selected: "cedar" });
    commitNavigation({ customer: "C01", analyst: "O01", superadmin: "A01", supplier: "S01" }[nextRole] || "C01");
  });
  const tour = [
    { role: "customer-morgan", screen: "C01", actor: "Customer", title: "Understand who owns the decision", body: "Osura reviews evidence, independent QA challenges the work, and your organisation makes the final decision." },
    { role: "analyst-01", screen: "O04", actor: "Osura analyst", title: "Read the evidence before recommending", body: "Inspect the exact source version, its limits and service scope. Save independent reasoning before comparing the prepared proposal." },
    { role: "analyst-01", screen: "O05", actor: "Osura analyst", title: "Ask only for the missing proof", body: "Review the scoped supplier packet. The demo outbox never sends external email." },
    { role: "supplier-contact", screen: "S01", actor: "Supplier", title: "Respond to the exact request", body: "Provide service-scoped evidence, an alternative or a cannot-provide explanation. A receipt is delivery, not verification." },
    { role: "analyst-01", screen: "O04", actor: "Osura analyst", title: "Review the changed version", body: "New evidence returns the affected requirement to review. Earlier versions remain part of the history." },
    { role: "analyst-02", screen: "O08", actor: "Independent QA reviewer", title: "Challenge the recommendation", body: "QA must be a different permitted reviewer. Returning work blocks the customer decision until the challenge is addressed." },
    { role: "customer-morgan", screen: "C06", actor: "Customer Decision Owner", title: "Make a deliberate customer decision", body: "Choose your own outcome and rationale, review the named obligation, then confirm. This guide performs no signing or approval." },
    { role: "customer-morgan", screen: "C07", actor: "Customer", title: "Keep the decision record intact", body: "A signed pack freezes its evidence and attribution. An unsigned example stays clearly labelled as prepared." },
    { role: "customer-morgan", screen: "C08", actor: "Customer and Osura", title: "Follow the next obligation", body: "Track the accountable owner, due date and proof needed. Closing a condition never rewrites the original customer decision." },
  ];
  const showTourStep = index => requestNavigation(() => {
    const step = tour[index]; setTourStep(index); onSwitch(step.role); setCustomerFilter("all"); update({ selected: "cedar" }); commitNavigation(step.screen);
  });
  const startTour = () => showTourStep(0);
  const event = (message, patch = {}) => {
    const entry = actionEntry(data, message, message);
    update({ ...patch, events: [entry] });
  };
  useEffect(() => {
    const handler = () => {
      const target = location.hash.slice(1) || "C01";
      if (target === screenId) return;
      const draft = currentDraft();
      if (draft) {
        history.replaceState(null, "", `#${screenId}`);
        setDrawer(null);
        setNavigationIntent({ draft, run: () => commitNavigation(target) });
        return;
      }
      setScreenId(target);
      setDrawer(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [screenId, identity]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.title = `${screen.id === "S02" && state.supplierItem === data.request.items[1] ? "Upload access review evidence" : screen.title.replace("{supplier}", screen.id === "C03" ? state.intake.supplier : engagement.supplier)} · Osura`;
  }, [screen, engagement]);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setDrawer(null);
        closeMobileNav();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setDrawer("search");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const hasWork = auditLog.length || model !== initialModel.current || state.events.length || state.intakeSubmitted || state.uploads?.length || Object.keys(state.supplierDrafts || {}).length || Object.keys(state.reviewDrafts || {}).length || Object.keys(state.qaDrafts || {}).length || Object.keys(state.decisionDrafts || {}).length || Object.keys(state.closureDrafts || {}).length || JSON.stringify(state.intake) !== JSON.stringify(baseData.intake);
    const warn = e => { e.preventDefault(); e.returnValue = ""; };
    if (hasWork) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state, model, auditLog]);
  const ctx = {
    data,
    catalog,
    state: { ...state, selected: engagement.id,
      events: state.events.filter(row => data.engagements.some(item=>item.workspaceId === row.workspaceId)),
      scheduledReviews: (state.scheduledReviews || []).filter(row=>data.engagements.some(item=>item.workspaceId === row.workspaceId)),
      extraFindings: (state.extraFindings || []).filter(row=>data.engagements.some(item=>item.workspaceId === row.workspaceId)),
    },
    user,
    update,
    event,
    navigate,
    notify,
    engagement,
    screen,
    setDrawer,
    startTour,
  };
  const text = (value) =>
    value
      .replaceAll(
        "{supplier}",
        ["C03"].includes(screen.id)
          ? state.intake.supplier
          : engagement.supplier,
      )
      .replaceAll("{service}", engagement.service);
  const isSupplier = role === "supplier";
  const caseScreens = [
    "C06",
    "C07",
    "C09",
    "C13",
    "C08",
    "O02",
    "O03",
    "O04",
    "O05",
    "O06",
    "O08",
    "O09",
    "O12",
  ];
  const secondaryCase =
    engagement.id !== "cedar" && caseScreens.includes(screen.id);
  const action = secondaryCase || ["O07", "O15", "C08", "C05"].includes(screen.id) || (role === "analyst" && screen.id === "C06") ? null : (
    primaryAction(screen.id, ctx)
  );
  return (
    <>
      {!isSupplier && (
        <aside ref={sidebarRef} className={`sidebar ${mobileNav ? "expanded" : ""}`} role={mobileNav ? "dialog" : undefined} aria-modal={mobileNav || undefined} aria-label={mobileNav ? "Workspace navigation" : undefined}>
          <button className="mobile-nav-close" aria-label="Close navigation" onClick={closeMobileNav}><Icon name="X" /> Close navigation</button>
          <a href={`#${role === "superadmin" ? "A01" : role === "analyst" ? "O01" : "C01"}`} className="brand" onClick={e => { e.preventDefault(); navigate(role === "superadmin" ? "A01" : role === "analyst" ? "O01" : "C01"); }}>
            <span className="logo">O</span>
            <b>Osura</b>
            <small>ASSURANCE</small>
          </a>
          <div className="workspace static-workspace">
            <small>{role === "customer" ? "CUSTOMER" : role === "superadmin" ? "OSURA ADMINISTRATION" : "OSURA TEAM"}</small>
            <b>{role === "customer" ? data.workspace.name : user?.name || "Inactive account"}</b>
            {role === "analyst" && <small>{user.workspaceIds.length} assigned customer{user.workspaceIds.length === 1 ? "" : "s"}</small>}
          </div>
          <div className="nav-label">
            {role === "customer" ? "YOUR WORKSPACE" : "DELIVERY WORKSPACE"}
          </div>
          <nav aria-label="Main navigation">
            {(role === "superadmin" ? [["A01", "Team & access", "ShieldCheck"]] : catalog.navigation[role] || []).map(([id, label, icon]) => (
              <a
                key={id}
                href={`#${id}`}
                className={screen.nav === id ? "selected" : ""}
                onClick={e => { e.preventDefault(); navigate(id); }}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button onClick={() => setDrawer("search")}>
              <Icon name="Search" />
              Search workspace <kbd>⌘ K</kbd>
            </button>
            <button onClick={() => setDrawer("audit")}><Icon name="Clock" /> Activity & accountability</button>
            <button onClick={() => setDrawer("settings")}>
              <Icon name="SlidersHorizontal" />
              Settings
            </button>
          </div>
          <div className="profile"><span className="avatar">{role === "customer" ? "NP" : "OS"}</span><span><b>{user?.name || "Inactive account"}</b><small>{role === "superadmin" ? "Superadmin" : role === "analyst" ? `Analyst${user.canQA ? " · Independent QA" : ""}` : "Customer Decision Owner"}</small></span></div>
        </aside>
      )}
      {mobileNav && <button className="nav-backdrop" aria-label="Close navigation backdrop" onClick={closeMobileNav} />}
      <div className={isSupplier ? "supplier-app" : "app"}>
        <header className="topbar">
          {isSupplier ? (
            <div className="portal-brand">
              <b>OSURA</b>
              <small>SECURE SUPPLIER REQUEST</small>
            </div>
          ) : (
            <>
              <button
                ref={menuButton}
                className="mobile-menu"
                aria-label="Open navigation"
                aria-expanded={mobileNav}
                onClick={() => setMobileNav(!mobileNav)}
              >
                <Icon name="Menu" />
              </button>
              <div className="breadcrumb">
                {role === "customer"
                  ? data.workspace.name
                  : role === "superadmin" ? "Team administration" : "Assigned customers"}
                <span>/</span>
                {screen.label}
              </div>
              <button className="workspace-search-trigger" onClick={() => setDrawer("search")}><Icon name="Search" size={16}/><span>Search suppliers, services or pages</span><kbd>⌘ K</kbd></button>
            </>
          )}
          <div className="topbar-end">
            {role === "analyst" && <label className="customer-filter">Customer <select id="customer-filter" aria-label="Customer filter" value={customerFilter} onChange={e=>{const value=e.target.value;requestNavigation(()=>{setCustomerFilter(value);setDrawer(null);});}}><option value="all">All assigned customers</option>{model.workspaces.filter(row=>user.workspaceIds.includes(row.id)).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}

            {isSupplier ? (
              <span>
                <Icon name="LockKeyhole" size={12} />
                Private invitation · {data.workspace.name}
              </span>
            ) : (
              <>
                <span className="synthetic">SYNTHETIC DESIGN EXAMPLE</span>
                <button
                  aria-label="Notifications"
                  onClick={() => setDrawer("notifications")}
                >
                  <Icon name="Bell" />
                </button>
                <span className="avatar">
                  {role === "customer" ? "NP" : "OS"}
                </span>
              </>
            )}
          </div>
        </header>
        <main key={screen.id} data-screen={screen.id}>
          {tourStep != null && <section className="guided-tour" aria-label="Guided example">
            <div><span className="micro-label">PREPARED EXAMPLE · STEP {tourStep + 1} OF {tour.length} · {tour[tourStep].actor}</span><h2>{tour[tourStep].title}</h2><p>{tour[tourStep].body}</p><small>The guide changes the demo perspective only. It never submits evidence, passes QA or signs for you.</small></div>
            <div className="tour-actions"><Button small disabled={tourStep === 0} onClick={() => showTourStep(tourStep - 1)}>Previous</Button><Button small primary onClick={() => tourStep === tour.length - 1 ? setTourStep(null) : showTourStep(tourStep + 1)}>{tourStep === tour.length - 1 ? "Finish guide" : "Next handoff"}</Button><button aria-label="Close guided example" onClick={() => setTourStep(null)}><Icon name="X" /></button></div>
          </section>}
          {state.returnTo && state.returnTo.route !== screen.id && <Link onClick={() => { const back = state.returnTo; update({ selected: back.selected, returnTo: null }); navigate(back.route); }}>← Back to {state.returnTo.label}</Link>}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {isSupplier
                  ? `REQUEST ${data.request.reference}${screen.id === "S02" ? ` · ITEM ${state.supplierItem === data.request.items[1] ? 2 : 1} OF ${data.request.items.length}` : ""}`
                  : `${role === "customer" ? data.workspace.name.toUpperCase() : "OSURA OPERATIONS"} / ${["C02", "C03", "C04", "C05"].includes(screen.id) ? `NEW REQUEST / STEP ${["C02", "C03", "C04", "C05"].indexOf(screen.id) + 1} OF 4` : screen.label.toUpperCase()}`}
              </div>
              <h1>
                {screen.id === "S02" &&
                state.supplierItem === "Privileged access review record"
                  ? "Provide access review evidence"
                  : screen.id === "S03" ? state.supplierReceipts?.[state.supplierItem || data.request.items[0]] ? "Your response was received" : "Prepared receipt example"
                  : screen.id === "C08" && engagement.id === "cedar" ? state.decision?.outcome === "Reject" ? "Rejected service · review history" : state.decision ? "Keep supplier assurance current" : "Assurance preview · no customer decision" : text(screen.title)}
              </h1>
              <p>
                {screen.id === "S02" &&
                state.supplierItem === "Privileged access review record"
                  ? "Provide a recent privileged access review for the contracted service."
                  : text(screen.subtitle)}
              </p>
            </div>
            {!denied && role !== "superadmin" && engagement.id !== "none" && action}
          </div>
          {denied ? <Card title="Access unavailable"><p>This page is outside this demo user’s role or the account is inactive.</p><Button onClick={()=>navigate(role === "superadmin" ? "A01" : role === "analyst" ? "O01" : role === "supplier" ? "S01" : "C01")}>Return to my view</Button></Card>
            : role === "superadmin" ? <RoleAdmin model={model} user={user} validate={validate} auditLog={auditLog} onSave={(next,entry)=>{onDataChange(next);onAudit(entry);}}/>
            : engagement.id === "none" && role !== "supplier" ? <Card title="No customer data to show"><p>No customers are assigned, or the current filter has no engagements. Ask your superadmin to update access.</p></Card>
            : role === "analyst" && !data.engagements.some(row=>row.id === "cedar") && ["O10","O13"].includes(screen.id) ? <Card title="Customer-specific reference"><p>This prepared programme belongs to Northstar Payments. Choose an assigned customer with a prepared programme.</p></Card>
            : <Page {...ctx} />}

          <footer>
            {isSupplier
              ? "Secure access is invitation-only. No internal risk findings or customer decisions are displayed."
              : "Osura · Guided presentation demo · Synthetic data · Changes last until refresh. Milestone acceptance uses the actual V2 application with stored data."}
          </footer>
        </main>
      </div>
      {demoTools && <button className="demo-tools-backdrop" aria-label="Close demo tools" onClick={() => setDemoTools(false)} />}
      <div className={`demo-toolbar ${demoTools ? "open" : ""}`}>
        <button className="demo-tools-toggle" aria-expanded={demoTools} onClick={() => setDemoTools(!demoTools)}><Icon name="SlidersHorizontal" size={16}/>Demo tools<Icon name={demoTools ? "X" : "ChevronDown"} size={14}/></button>
        <span className="demo-dot" />
        <b title="All changes reset on refresh">Demo · until refresh</b>
        <select aria-label="Demo user" value={identity} onChange={e => switchIdentity(e.target.value)}>
          {model.users.map(row=><option key={row.id} value={row.id} disabled={!row.active}>{row.role === "superadmin" ? "Superadmin" : row.role === "analyst" ? "Analyst" : "Customer"} · {sessionUser(model,row.id).name}{!row.active ? " (inactive)" : ""}</option>)}
          <option value="supplier-contact">Supplier · CedarCloud contact</option>
        </select>
        <button onClick={() => setDrawer("screens")}>
          <Icon name="PanelsTopLeft" size={13} />
          {screen.id}
          <span className="toolbar-extra"> · My screens</span>
        </button>
        {role === "superadmin" && <button onClick={() => setDrawer("data")}><Icon name="Folder" size={14} /> Demo data</button>}
        <button onClick={startTour}><Icon name="ArrowRight" size={14}/>Guided example</button>
        <button aria-label="Reset demo" onClick={() => setDrawer("reset")}>
          <Icon name="RotateCcw" size={14} />
        </button>
      </div>
      {drawer && (
        <Dialog title={drawer === "data" ? "Demo data · session editor" : drawer === "audit" ? "Activity & accountability" : dialogTitle(drawer)} wide={drawer === "data"} onClose={() => setDrawer(null)}>
          {drawer === "data" && role === "superadmin" ? <DataEditor model={model} schema={schema} validate={validate} onChange={next=>{
            if (["documentVersions", "requirementReviews", "evidenceCitations"].some(key => JSON.stringify(next[key]) !== JSON.stringify(model[key]))) {
              update({ pendingReviews: Object.fromEntries(baseData.requirements.map(row => [row.id, true])), conclusion: "Needs review", qa: "Evidence re-review required" });
            }
            onDataChange(next);onAudit(actionEntry(data,"Demo base records edited","Updated synthetic records through the superadmin data editor.",{workspaceId:null,customer:"Team administration",role:"superadmin",engagementId:null}));}} /> : drawer === "audit" ? <AuditTrail entries={auditLog} user={user}/> : (
          <Drawer
            kind={drawer}
            {...ctx}
            onReset={() => {
              const nextRevision = (state.assessmentRevision || 1) + 1;
              onAudit(actionEntry(data,"Demo walkthrough reset","Reset the synthetic walkthrough; prior actions remain in session history.",{nextAssessmentVersion:`cedar-review-v${nextRevision}`}));
              stateRef.current = { ...createState(baseData), assessmentRevision: nextRevision };
              setState(stateRef.current);
              commitNavigation({customer:"C01",analyst:"O01",superadmin:"A01",supplier:"S01"}[role]);
              notify("Walkthrough reset. Fixture edits remain until refresh.");
            }}
          />)}
        </Dialog>
      )}
      {navigationIntent && <Dialog title="Leave with unsaved changes?" onClose={() => setNavigationIntent(null)}>
        <p>Your changes have not been recorded yet. Keep editing, or discard this draft before continuing.</p><Note>Saved evidence, QA actions and signed decisions will remain unchanged.</Note>
        <div className="form-actions"><Button primary onClick={() => setNavigationIntent(null)}>Keep editing</Button><Button onClick={() => {
          const { run, draft } = navigationIntent;
          const drafts = { ...stateRef.current[draft.collection] }; delete drafts[draft.key]; update({ [draft.collection]: drafts }); setNavigationIntent(null); run();
        }}>Discard changes and continue</Button></div>
      </Dialog>}
      {toast && (
        <div role="status" className="toast">
          <Icon name="CircleCheck" />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <Icon name="X" size={14} />
          </button>
        </div>
      )}
    </>
  );
}

function primaryAction(id, c) {
  const { navigate, notify, setDrawer, event, state } = c;
  const map = {
    C01: ["Request assessment", "C02"],
    C14: ["Add supplier", "C02"],
    C15: ["Start assessment", "C02"],
    C10: [
      "Export summary",
      () => downloadJSON("portfolio-summary", c.data.engagements),
    ],
    C11: ["Request new review", "C02"],
    C12: ["View completed", () => setDrawer("completed")],
    C13: [
      "Download evidence index",
      () => downloadJSON("evidence-index", c.data.documents),
    ],
    C16: [
      "Export index",
      () => downloadJSON("decision-index", state.signedPack || []),
    ],
    C05: [
      "Submit request",
      () => document.getElementById("intake-form").requestSubmit(),
    ],
    C09: [state.decision ? "Open decision" : workflowStatus(state).ready ? "Review decision" : "View review status", state.decision ? "C07" : "C06"],
    C06: state.decision ? ["Open Decision Pack", "C07"] : null,
    C07: ["Print / Save PDF", () => window.print()],
    C08: ["Report a change", () => setDrawer("change")],
    O01: [
      "Open queue",
      () =>
        document
          .getElementById("queue")
          ?.scrollIntoView({ behavior: "smooth" }),
    ],
    O16: ["Reconcile identity", () => setDrawer("identity")],
    O02: [
      "Next case",
      () => {
        const i = c.data.engagements.findIndex((e) => e.id === state.selected);
        c.update({
          selected: c.data.engagements[(i + 1) % c.data.engagements.length].id,
        });
        notify("Next assessment loaded.");
      },
    ],
    O12: ["Request missing fact", () => setDrawer("missing-fact")],
    O03: ["Add evidence", () => setDrawer("upload")],
    O05: [
      "Queue reviewed packet",
      () => {
        const recipient = state.requestRecipient || c.data.request.recipient;
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ||
          !(state.requestMessage || c.data.request.message).trim()
        ) {
          notify(
            "Enter a valid recipient and a request message before queuing.",
          );
          return;
        }
        event("Reviewed supplier packet queued (local simulation)", {
          requestStatus: "Queued (local)",
        });
        navigate("O14");
        notify("Packet queued in the local demo outbox.");
      },
    ],
    O14: ["New targeted request", "O05"],
    O06: ["Inspect changed result", "O04"],
    O07: ["Create finding", () => setDrawer("finding")],
    O08: [
      "Record QA outcome",
      () => document.getElementById("qa-form").requestSubmit(),
    ],
    O09: [
      "Record verification",
      () => document.getElementById("closure-form").requestSubmit(),
    ],
    O15: ["Create review", () => setDrawer("review")],
    O10: ["Create policy draft", () => setDrawer("policy")],
    O13: ["Preview effect", () => setDrawer("policy-preview")],
    O11: ["Filter customers", () => document.getElementById("customer-filter")?.focus()],
  };
  if (!map[id]) return null;
  const [label, target] = map[id];
  return (
    <Button
      primary={
        ![
          "C10",
          "C12",
          "C13",
          "C16",
          "C08",
          "O01",
          "O16",
          "O12",
          "O03",
          "O07",
          "O15",
          "O10",
          "O13",
          "O11",
        ].includes(id)
      }
      icon={
        /Export|Download|Print/.test(label)
          ? "Download"
          : /Record/.test(label)
            ? "Check"
            : "ArrowRight"
      }
      disabled={
        id === "C06" &&
        !state.decision &&
        (!state.qa.startsWith("Passed") ||
          state.conclusion === "Needs review" ||
          Object.values(state.pendingReviews || {}).some(Boolean))
      }
      onClick={() => (typeof target === "string" ? navigate(target) : target())}
    >
      {id === "C06" && state.decision ? "Open Decision Pack" : label}
    </Button>
  );
}

function Scope({ engagement, data, user }) {
  return (
    <div className="scope">
      {user?.role === "analyst" && <span>Customer <b>{engagement.client}</b></span>}
      <span>
        Supplier identity <b>{engagement.supplier}</b>
      </span>
      <span>
        Service <b>{engagement.service}</b>
      </span>
      <span>
        Review <b>{engagement.plan}</b>
      </span>
    </div>
  );
}
function Entity({ name, service }) {
  return (
    <div className="entity">
      <span className="entity-icon">{name.slice(0, 2).toUpperCase()}</span>
      <span>
        <b>{name}</b>
        {service && <small>{service}</small>}
      </span>
    </div>
  );
}
function Ring({ data }) {
  const rows = data.engagements;
  const distribution = Object.entries(data.riskPalette)
    .map(([label, color]) => ({
      label,
      color,
      count: rows.filter((r) => r.risk === label).length,
    }))
    .filter((r) => r.count);
  let offset = 0;
  const stops = distribution.map((r) => {
    const start = offset;
    offset += (r.count / Math.max(rows.length, 1)) * 100;
    return `${r.color} ${start}% ${offset}%`;
  });
  return (
    <div className="ring-layout">
      <div
        className="ring"
        style={{
          background: stops.length
            ? `conic-gradient(${stops.join(",")})`
            : "#edf0f6",
        }}
      >
        <div>
          <strong>{rows.length}</strong>
          <small>engagements</small>
        </div>
      </div>
      <div className="legend">
        {distribution.map((r) => (
          <div key={r.label}>
            <i style={{ background: r.color }} />
            <span>{r.label}</span>
            <b>{r.count}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
function EngagementTable({
  data,
  state,
  update,
  navigate,
  mode = "customer",
  rows,
  title = "Supplier engagements",
  action,
  register = false,
  assessment = false,
}) {
  const items = rows || data.engagements;
  const open = (row) => {
    update({ selected: row.id });
    navigate(
      mode === "analyst" || mode === "directory"
        ? "O02"
        : register
          ? "C11"
          : "C09",
    );
  };
  return (
    <Card title={title} action={action}>
      <div className="table-wrap engagement-desktop-table">
        <table>
          <thead>
            <tr>
              <th>Supplier / {register ? "services" : "engagement"}</th>
              {mode !== "customer" && <th>Customer</th>}
              {register && <th>Services</th>}
              <th>CTP inherent risk</th>
              <th>Current stage</th>
              {assessment && <th>Plan</th>}
              <th>{register ? "Business owner" : "Owner"}</th>
              {(register || assessment) && <th>Next review / due</th>}
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <Entity name={row.supplier} service={row.service} />
                </td>
                {mode !== "customer" && <td>{row.client}</td>}
                {register && <td>{row.serviceCount}</td>}
                <td>
                  <Badge>{row.risk}</Badge>
                </td>
                <td>
                  <Badge>
                    {row.id === "cedar" && state.decision
                      ? state.decision.outcome === "Reject"
                        ? "Rejected"
                        : "Active"
                      : row.stage}
                  </Badge>
                </td>
                {assessment && (
                  <td>
                    <Badge>{row.plan}</Badge>
                  </td>
                )}
                <td>{row.owner}</td>
                {(register || assessment) && <td>{formatDate(row.due)}</td>}
                <td>
                  <Link onClick={() => open(row)}>
                    {register
                      ? "Open supplier"
                      : mode === "analyst"
                        ? "Open assessment"
                        : "Open service"}{" "}
                    →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <div className="empty">
            <Icon name="Search" />
            <h3>No matching records</h3>
            <p>Try a different supplier name, service or filter.</p>
          </div>
        )}
      </div>
      <div className="engagement-mobile-cards">
        {items.map(row => <article className="mobile-service-card" key={row.id}>
          <div className="mobile-service-heading"><span className="entity-icon">{row.supplier.slice(0, 2).toUpperCase()}</span><div><h3>{row.supplier}</h3><p>{row.service}</p></div></div>
          {mode !== "customer" && <p className="micro-label">{row.client}</p>}
          <div className="mobile-service-badges"><Badge>CTP inherent risk: {row.risk}</Badge><Badge>{row.id === "cedar" ? workflowStatus(state).label : row.stage === "Active" ? "Approved service" : row.stage}</Badge></div>
          <dl><div><dt>Next owner</dt><dd>{row.id === "cedar" ? workflowStatus(state).nextOwner : row.owner}</dd></div>{(register || assessment) && <div><dt>Next review / due</dt><dd>{formatDate(row.due)}</dd></div>}{assessment && <div><dt>Review plan</dt><dd>{row.plan}</dd></div>}</dl>
          <Button primary={row.id === "cedar" && workflowStatus(state).ready} icon="ArrowRight" onClick={() => open(row)}>{register ? "Open supplier services" : row.id === "cedar" && workflowStatus(state).ready ? "Review recommendation" : "Open service review"}</Button>
        </article>)}
        {!items.length && <div className="empty"><h3>No matching service reviews</h3><p>Change the search or filter to find a supplier service.</p></div>}
      </div>
    </Card>
  );
}
function Requirements({ data, navigate, update, state, customer = false }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Requirement</th>
            <th>Current conclusion</th>
            <th>Evidence</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {data.requirements.map((r, i) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>
                <Badge>
                  {r.id === "R-07" && state?.conclusion
                    ? state.conclusion
                    : r.conclusion}
                </Badge>
              </td>
              <td>{r.source}</td>
              <td>
                <Link
                  onClick={() => {
                    update({ selectedRequirement: r.id });
                    navigate(customer ? "C13" : "O04");
                  }}
                >
                  Inspect source →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Page(c) {
  const { screen } = c;
  if (
    c.state.selected !== "cedar" &&
    [
      "C06",
      "C07",
      "C09",
      "C13",
      "C08",
      "O02",
      "O03",
      "O04",
      "O05",
      "O06",
      "O08",
      "O09",
      "O12",
    ].includes(screen.id)
  )
    return <SecondaryCase {...c} />;
  if (["C02", "C03", "C04", "C05"].includes(screen.id))
    return <Intake {...c} />;
  if (["C14", "C15", "C10", "O16"].includes(screen.id))
    return <Registers {...c} />;
  if (screen.id === "C01") return <Overview {...c} />;
  if (screen.id === "C11") return <SupplierRecord {...c} />;
  if (["C12", "O07"].includes(screen.id)) return <Findings {...c} />;
  if (["C13", "O04"].includes(screen.id)) return <EvidenceReview {...c} />;
  if (screen.id === "C16") return <Reports {...c} />;
  if (["C09", "O02"].includes(screen.id)) return <Assessment {...c} />;
  if (screen.id === "C06") return <Decision {...c} />;
  if (screen.id === "C07") return <Pack {...c} />;
  if (["C08", "O15"].includes(screen.id)) return <Monitoring {...c} />;
  if (screen.id === "O01") return <Operations {...c} />;
  if (screen.id === "O12") return <Impact {...c} />;
  if (screen.id === "O03") return <Inventory {...c} />;
  if (screen.id === "O05") return <FollowUp {...c} />;
  if (screen.id === "O14") return <Communications {...c} />;
  if (screen.id === "O06") return <Response {...c} />;
  if (screen.id === "O08") return <Quality {...c} />;
  if (screen.id === "O09") return <Closure {...c} />;
  if (["O10", "O13"].includes(screen.id)) return <Programme {...c} />;
  if (screen.id === "O11") return <ClientHealth {...c} />;
  return <SupplierPortal {...c} />;
}

function Overview(c) {
  const { data, navigate, state, setDrawer } = c;
  const status = workflowStatus(state);
  const cedar = data.engagements.find(row => row.id === "cedar");
  const customerActions = data.overviewActions.filter(action => action.engagement === "cedar" ? status.ready : !state.owners?.[action.engagement]);
  const nextAction = customerActions[0];
  const openAction = (action) => {
    c.update({ selected: action.engagement });
    if (action.route) navigate(action.route);
    else setDrawer(action.dialog);
  };
  return (
    <div className="customer-overview">
      <ol className="responsibility-strip" aria-label="Who does what">
        <li><span>01</span><b>Osura reviews the evidence</b></li>
        <li><span>02</span><b>Independent QA challenges it</b></li>
        <li><span>03</span><b>You record the decision</b></li>
      </ol>
      <section className="next-action-hero" aria-labelledby="next-action-heading">
        <div className="next-action-label">YOUR NEXT ACTION</div>
        <div className="next-action-content">
          <div>
            <Badge>{nextAction?.engagement === "cedar" ? "Your decision is needed" : nextAction ? nextAction.status : "No customer action required"}</Badge>
            <h2 id="next-action-heading">{nextAction?.engagement === "cedar" ? "CedarCloud needs your decision" : nextAction?.title || "Your reviews are with the assurance team"}</h2>
            <p>{nextAction?.engagement === "cedar" ? `${cedar.service} · The review and independent QA are complete. Review the recommendation and choose your own outcome.` : nextAction?.detail || (cedar ? `${status.label}. Next owner: ${status.nextOwner}.` : "No prepared review currently needs your decision in this customer workspace.")}</p>
            {nextAction?.engagement === "cedar" && <div className="review-checks"><span><Icon name="Check" size={16}/> Source review complete</span><span><Icon name="Check" size={16}/> Independent QA complete</span></div>}
            {nextAction && <small>Next owner: {nextAction.engagement === "cedar" ? status.nextOwner : "Customer business owner"}</small>}
          </div>
          {nextAction ? <Button primary icon="ArrowRight" onClick={() => openAction(nextAction)}>{nextAction.engagement === "cedar" ? "Review the recommendation" : nextAction.action}</Button>
            : cedar && <Button icon="ArrowRight" onClick={() => { c.update({ selected: cedar.id }); navigate(state.decision ? "C07" : "C09"); }}>{state.decision ? "Open recorded decision" : "View review status"}</Button>}
        </div>
      </section>
      <div className="overview-explore-grid">
        <Card title="Choose how to explore" className="explore-choices">
          <div className="explore-choice">
            <span className="explore-icon"><Icon name="Eye" size={22}/></span>
            <div><h3>See the complete story</h3><p>Explore a prepared example from evidence review to an owned customer decision. Your current work stays in this session.</p><Button icon="ArrowRight" disabled={!cedar} onClick={() => c.startTour()}>Explore the prepared example</Button></div>
          </div>
          <div className="explore-choice">
            <span className="explore-icon"><Icon name="Building2" size={22}/></span>
            <div><h3>Try your own request</h3><p>Add your business context. Your request remains pending analyst triage in this demo.</p><Button icon="ArrowRight" onClick={() => navigate("C02")}>Start a supplier request</Button></div>
          </div>
        </Card>
        <Card title="Your programme at a glance" className="programme-glance">
          <div className="quiet-metrics">
            <button onClick={() => navigate("C14")}><strong>{new Set(data.engagements.map(row => row.supplier)).size}</strong><span>Suppliers</span><small>View supplier services</small></button>
            <button onClick={() => navigate("C15")}><strong>{data.engagements.filter(row => !["Active", "Rejected"].includes(row.stage)).length}</strong><span>Open reviews</span><small>View assessment register</small></button>
            <button onClick={() => navigate("C16")}><strong>{cedar && status.ready ? 1 : 0}</strong><span>Decision needed</span><small>{cedar && status.ready ? 1 : 0} decision ready · view reports</small></button>
          </div>
          <div className="risk-explainer"><b>What does “CTP inherent risk” mean?</b><p>The service’s exposure before assurance work. It is separate from evidence support, QA readiness and your decision.</p><small>Values are prepared fixtures under the pinned CTP method. This prototype does not calculate risk.</small></div>
          <Link onClick={() => navigate("C08")}>Monitoring plan →</Link>
        </Card>
      </div>
      {customerActions.length > 1 && <Card title="Other actions for your team"><div className="customer-action-list">{customerActions.slice(1).map(action => <div className="action-row" key={action.engagement}><div><b>{action.title}</b><p>{action.detail}</p></div><Badge>{action.status}</Badge><Button onClick={() => openAction(action)} icon="ArrowRight">{action.action}</Button></div>)}</div></Card>}
      <EngagementTable {...c} rows={data.engagements.slice(0, 6)} title="Your service reviews" action={<Link onClick={() => navigate("C14")}>Full supplier register →</Link>}/>
    </div>
  );
}
function Timeline({ items, onClick }) {
  return (
    <div className="timeline">
      {items.map(([title, detail, status]) => (
        <button key={title} onClick={() => onClick?.([title, detail, status])}>
          <span className="timeline-dot" />
          <span>
            <b>{title}</b>
            <small>{detail}</small>
          </span>
          <Badge>{status}</Badge>
        </button>
      ))}
    </div>
  );
}

function Filters({
  search,
  setSearch,
  filter,
  setFilter,
  options = ["All", "Critical", "High", "Medium", "Low"],
  placeholder = "Search supplier, service, owner",
}) {
  return (
    <div className="filters">
      <div className="search-input">
        <Icon name="Search" size={14} />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="filter-chips">
        {options.map((value) => (
          <button
            key={value}
            className={filter === value ? "active" : ""}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value === "All" ? "All risk tiers" : value}
          </button>
        ))}
      </div>
    </div>
  );
}
function Registers(c) {
  const { data, state, screen, navigate } = c;
  const saved = state.registerViews?.[screen.id] || {};
  const [search, changeSearch] = useState(saved.search || "");
  const [filter, changeFilter] = useState(saved.filter || "All");
  const [tab, changeTab] = useState(saved.tab || "All");
  const [stageFilter, changeStageFilter] = useState(saved.stageFilter || "All");
  const [view, changeView] = useState(saved.view || "Suppliers");
  const [client, changeClient] = useState(saved.client || "All customers");
  const [status, changeStatus] = useState(saved.status || "All services");
  const remember = patch => c.update({ registerViews: { ...state.registerViews, [screen.id]: { search, filter, tab, stageFilter, view, client, status, ...patch } } });
  const setSearch = value => { changeSearch(value); remember({ search: value }); };
  const setFilter = value => { changeFilter(value); remember({ filter: value }); };
  const setTab = value => { changeTab(value); remember({ tab: value }); };
  const setStageFilter = value => { changeStageFilter(value); remember({ stageFilter: value }); };
  const supplier = screen.id === "C14";
  const directory = screen.id === "O16";
  const risk = screen.id === "C10";
  const clearFilters = () => {
    changeSearch(""); changeFilter("All"); changeStageFilter("All"); changeClient("All customers"); changeStatus("All services");
    remember({ search: "", filter: "All", stageFilter: "All", client: "All customers", status: "All services" });
  };
  if (supplier || directory) {
    const scopedRows = data.engagements.map(row => ({ ...row, domain: data.suppliers.find(item => item.name === row.supplier)?.domain || "" })).filter(row => client === "All customers" || row.client === client);
    const filterRows = filterEngagements(scopedRows, "", filter).filter(row => status === "Approved services" ? row.stage === "Active" : status === "Needs attention" ? !["Active", "Rejected"].includes(row.stage) : true);
    const matchingRows = filterEngagements(filterRows, search);
    return <div className="service-directory">
      <div className="directory-intro"><p>One supplier can have an approved service and a different service under review. Approval always belongs to a specific use.</p></div>
      <Card className="directory-results">
        <Tabs tabs={directory ? ["Suppliers", "Services", "Identity matches"] : ["Suppliers", "Services"]} value={view} onChange={value => { changeView(value); remember({ view: value }); }}/>
        <div className="directory-controls">
          <div className="search-input"><Icon name="Search" size={18}/><input aria-label="Search supplier services" placeholder="Search supplier, domain or service" value={search} onChange={event => setSearch(event.target.value)}/></div>
          {directory && <label className="field"><span>Customer</span><select aria-label="Directory customer" value={client} onChange={event => { changeClient(event.target.value); remember({ client: event.target.value }); }}><option>All customers</option>{[...new Set(data.engagements.map(row => row.client))].map(name => <option key={name}>{name}</option>)}</select></label>}
          <label className="field"><span>CTP inherent risk</span><select aria-label="Directory risk" value={filter} onChange={event => setFilter(event.target.value)}>{["All", "Critical", "High", "Medium", "Low", "Pending triage"].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className="directory-status" aria-label="Service approval filter">{["All services", "Needs attention", "Approved services"].map(value => <button key={value} aria-pressed={status === value} className={status === value ? "selected" : ""} onClick={() => { changeStatus(value); remember({ status: value }); }}>{value}</button>)}</div>
        <p className="directory-filter-hint">Search, customer and service filters apply to every tab. Other service scopes are shown separately and are not implied to match.</p>
        <DirectoryDetails {...c} tab={view} rows={matchingRows} allRows={data.engagements} filterRows={filterRows} search={search} clearFilters={clearFilters}/>
      </Card>
    </div>;
  }
  const baseRows = screen.id === "C15"
    ? data.engagements.filter(row => tab === "Approved" ? row.stage === "Active" : !["Active", "Rejected"].includes(row.stage))
    : data.engagements;
  const rows = filterEngagements(baseRows, search, filter).filter(row => (stageFilter === "All" || row.stage === stageFilter) && (tab !== "Needs attention" || !["Active", "Rejected"].includes(row.stage)));
  return <>
    <Stats items={[[data.engagements.filter(row => !["Active", "Rejected"].includes(row.stage)).length, "Open assessments"], [data.engagements.filter(row => row.stage === "Evidence").length, "Evidence reviews"], [data.engagements.filter(row => row.stage === "Decision").length, "Customer decisions"], [data.engagements.filter(row => ["Active", "Rejected"].includes(row.stage)).length, "Completed and pinned"]]}/>
    {risk ? <div className="grid equal"><Card title="Reviews by CTP inherent risk and stage"><RiskGrid {...c} onFilter={(riskValue, stage) => { changeFilter(riskValue); changeStageFilter(stage); remember({ filter: riskValue, stageFilter: stage }); }}/></Card><Card title="CTP inherent risk across services"><Ring data={data}/></Card></div> : <Tabs tabs={["All", "Needs attention", "Approved"]} value={tab} onChange={setTab}/>}
    {stageFilter !== "All" && <Note>Showing {filter} · {stageFilter} reviews. <Link onClick={() => { changeFilter("All"); changeStageFilter("All"); remember({ filter: "All", stageFilter: "All" }); }}>Clear selection</Link></Note>}
    <Filters {...{ search, setSearch, filter, setFilter }}/>
    <EngagementTable {...c} rows={rows} assessment={screen.id === "C15"} title={risk ? "Relevant service reviews" : "Review register"}/>
    {!risk && <Note>Each review keeps its own supplier, service, CTP method and published policy. Signed decisions remain pinned to the original evidence and QA.</Note>}
  </>;
}
function RiskGrid(c) {
  const stages = ["Request", "Evidence", "Questions", "Findings", "QA", "Decision"];
  return (
    <div className="risk-grid">
      <div className="risk-grid-row">
        <span>CTP inherent risk</span>
        {stages.map((s) => (
          <small key={s}>{s}</small>
        ))}
      </div>
      {["Critical", "High", "Medium", "Low"].map((r) => (
        <div className="risk-grid-row" key={r}>
          <span>
            <Badge>{r}</Badge>
          </span>
          {stages.map((s) => {
            const count = c.data.engagements.filter(
              (e) => e.risk === r && e.stage === s,
            ).length;
            return (
              <button
                key={s}
                aria-label={`${r} ${s}: ${count} reviews`}
                className={count ? "filled" : ""}
                disabled={!count}
                onClick={() => {
                  c.onFilter?.(r, s);
                  if (!c.onFilter) {
                    const match = c.data.engagements.find(
                      (e) => e.risk === r && e.stage === s,
                    );
                    c.update({ selected: match.id });
                    c.navigate(c.screen.role === "analyst" ? "O02" : "C09");
                  }
                }}
              >
                {count || ""}
              </button>
            );
          })}
        </div>
      ))}
      <small>Current active reviews only · one row per scoped engagement</small>
    </div>
  );
}

function DirectoryDetails(c) {
  const { data, tab, setDrawer, update } = c;
  const allRows = c.allRows || data.engagements;
  const rows = c.rows || allRows;
  const clear = c.clearFilters || (() => {});
  const open = row => { update({ selected: row.id }); c.navigate(c.user?.role === "analyst" ? "O02" : "C09"); };
  const service = (row, matching = true) => <div className={`directory-service ${matching ? "matching-service" : "other-service"}`} key={row.id}>
    <div className="directory-service-main"><span className="service-match-label">{matching ? "Matching service" : "Other scope · outside current filters"}</span><h4>{row.service}</h4><p>{row.owner} · {row.stage === "Active" ? "Approved for this service" : row.stage === "Rejected" ? "Rejected service" : "Separate review · not approved"}</p><small>CTP inherent risk: {row.risk}{c.user?.role === "analyst" ? ` · ${row.client}` : ""}</small></div>
    <Badge>{row.stage === "Active" ? "Approved" : row.stage}</Badge>
    <Button small icon="ArrowRight" onClick={() => open(row)}>{row.stage === "Active" ? "View approved service" : "View current review"}</Button>
  </div>;
  if (tab === "Identity matches") {
    const scopedSuppliers = new Set((c.filterRows || allRows).map(row => row.supplier));
    const query = (c.search || "").toLowerCase();
    const candidates = data.directoryIdentity.filter(row => scopedSuppliers.has(row.supplier) && `${row.supplier} ${row.domain} ${row.candidate}`.toLowerCase().includes(query));
    return <>
      <p className="directory-result-count">{candidates.length} supplier identity {candidates.length === 1 ? "candidate" : "candidates"} · authorised customer scope</p>
      <div className="identity-card-grid">{candidates.map(row => <article className="supplier-identity-card" key={row.supplier}>
        <Entity name={row.supplier} service={row.domain}/><Fields items={[["Legal entity candidate", row.candidate], ["Identity status", <Badge>{row.status}</Badge>]]}/>
        <Button icon="ArrowRight" onClick={() => { const record = (c.filterRows || allRows).find(record => record.supplier === row.supplier); if (!record) { c.notify("No accessible assessment is available for this identity candidate."); return; } update({ selected: record.id, identityCandidate: row }); setDrawer("identity-candidate"); }}>Inspect match</Button>
      </article>)}</div>
      {!candidates.length && <div className="directory-empty"><Icon name="Search" size={28}/><h3>No identity candidates match these filters</h3><p>Try a supplier name, domain or another customer.</p><Button onClick={clear}>Clear filters</Button></div>}
      <Note>Identity confirmation does not transfer control conclusions or approve another service.</Note>
    </>;
  }
  if (tab === "Services") return <>
    <p className="directory-result-count">{rows.length} matching service {rows.length === 1 ? "scope" : "scopes"} · each has its own review and customer decision</p>
    <div className="standalone-service-list">{rows.map(row => <article className="standalone-service-card" key={row.id}><div className="standalone-service-heading"><Entity name={row.supplier} service={row.domain}/>{c.user?.role === "analyst" && <span>{row.client}</span>}</div>{service(row)}</article>)}</div>
    {!rows.length && <div className="directory-empty"><Icon name="Search" size={28}/><h3>No services match this search and filter</h3><p>No unrelated service rows remain visible. Try another supplier, domain or service.</p><Button onClick={clear}>Clear filters</Button></div>}
  </>;
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.workspaceId}:${row.supplier}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return <>
    <p className="directory-result-count">{groups.size} {groups.size === 1 ? "supplier" : "suppliers"} · {rows.length} matching service {rows.length === 1 ? "scope" : "scopes"}</p>
    <div className="supplier-entity-list">{[...groups.entries()].map(([key, matching]) => {
      const entity = matching[0];
      const scopes = allRows.filter(row => row.supplier === entity.supplier && row.workspaceId === entity.workspaceId);
      const other = scopes.filter(row => !matching.some(match => match.id === row.id));
      return <details className="supplier-entity-card" open key={key}>
        <summary><div className="supplier-entity-heading"><Entity name={entity.supplier} service={`${entity.domain || "Confirmed supplier"}${c.user?.role === "analyst" ? ` · ${entity.client}` : ""}`}/><div className="entity-service-count"><b>{scopes.length} service {scopes.length === 1 ? "scope" : "scopes"}</b><span>{scopes.filter(row => row.stage === "Active").length} approved · {scopes.filter(row => row.stage !== "Active").length} not approved</span></div><Icon name="ChevronDown" size={20}/></div></summary>
        <div className="supplier-scope-content">{matching.map(row => service(row))}{other.length > 0 && <div className="other-scopes"><h4>Other services from this supplier</h4><p>Shown for context. These scopes do not match the current filters and carry their own decisions.</p>{other.map(row => service(row, false))}</div>}<div className="service-scope-notice"><Icon name="ShieldCheck" size={16}/><span>Approval applies to the named service only. It does not approve every use of {entity.supplier}.</span></div></div>
      </details>;
    })}</div>
    {!rows.length && <div className="directory-empty"><Icon name="Search" size={28}/><h3>No suppliers match these service filters</h3><p>Try another supplier, domain, customer or service state.</p><Button onClick={clear}>Clear filters</Button></div>}
  </>;
}
function SupplierRecord(c) {
  const { engagement, data, navigate } = c;
  const [tab, setTab] = useState("Services");
  const rows = data.engagements.filter(row => row.supplier === engagement.supplier && row.workspaceId === engagement.workspaceId);
  const approved = rows.filter(row => row.stage === "Active");
  const identity = data.suppliers.find(row => row.name === engagement.supplier);
  return <div className="supplier-profile">
    <section className="supplier-profile-hero">
      <div><span className="micro-label">SUPPLIER LEGAL ENTITY</span><Entity name={engagement.supplier} service={identity?.domain || "Identity reference"}/><p>Assurance is recorded for each service, never as a blanket supplier approval.</p></div>
      <div className="profile-scope-counts"><div><strong>{rows.length}</strong><span>Service scopes</span></div><div><strong>{approved.length}</strong><span>Approved services</span></div></div>
    </section>
    <Tabs tabs={["Overview", "Services", "Assessments", "Evidence", "Findings", "Decisions", "Monitoring"]} value={tab} onChange={setTab}/>
    {["Overview", "Services", "Assessments"].includes(tab) ? <div className="supplier-profile-grid">
      <Card title="Service scopes and independent reviews" action={<Link onClick={() => navigate("C02")}>+ Add service</Link>}>
        <div className="profile-service-list">{rows.map(row => <article className="profile-service-card" key={row.id}>
          <div className="profile-service-top"><div><span className="micro-label">{row.stage === "Active" ? "APPROVED SERVICE SCOPE" : "SEPARATE SERVICE REVIEW"}</span><h3>{row.service}</h3></div><Badge>{row.stage === "Active" ? "Approved" : row.id === "cedar" ? workflowStatus(c.state).label : row.stage}</Badge></div>
          <Fields items={[["CTP inherent risk", row.risk], ["Business owner", row.owner], ["Review plan", row.plan], ["Next review / due", formatDate(row.due)]]}/>
          <Button primary={row.id === "cedar" && workflowStatus(c.state).ready} icon="ArrowRight" onClick={() => { c.update({ selected: row.id }); navigate("C09"); }}>{row.stage === "Active" ? "View approved service" : "View current review"}</Button>
        </article>)}</div>
        <Note>An approved service does not transfer its evidence conclusions or customer decision to another use of {engagement.supplier}.</Note>
      </Card>
      <Card title="Supplier identity and stewardship"><Fields items={[["Legal entity", engagement.supplier], ["Domain", identity?.domain || "Not established"], ["Country", identity?.country || "Not established"], ["Customer", engagement.client], ["Primary business owner", engagement.owner], ["Service relationship", approved.length ? `${approved.length} approved service${approved.length === 1 ? "" : "s"}` : "No approved service relationship"]]}/><Button onClick={() => c.setDrawer("identity")} icon="Building2">Inspect supplier identity</Button><div className="risk-explainer"><b>Identity is not assurance</b><p>Confirming the legal entity does not approve a service or replace a scoped evidence review.</p></div></Card>
    </div> : engagement.id !== "cedar" ? <SecondaryCase {...c}/> : tab === "Evidence" ? <Card title="Service-scoped conclusions"><Requirements {...c} customer/></Card> : tab === "Findings" ? <Findings {...c}/> : tab === "Decisions" ? <Reports {...c}/> : <Monitoring {...c}/>}
    <div className="grid equal">
      <Card title="Evidence reuse requires a scope check"><p>Documents may be relevant to more than one service. The analyst still checks the source version, service applicability and what the evidence actually supports.</p><Button icon="FileText" onClick={() => navigate("C13")}>Review selected service evidence</Button></Card>
      <Card title="Relationship history">{engagement.id === "cedar" ? <Timeline items={data.relationshipHistory} onClick={() => navigate("C16")}/> : <Note>This portfolio preview has no prepared relationship history. Open a service review to inspect its own scope and current state.</Note>}</Card>
    </div>
  </div>;
}
function Intake(c) {
  const { data, state, update, navigate, notify } = c;
  const intake = state.intake;
  const step = ["C02", "C03", "C04", "C05"].indexOf(c.screen.id);
  const [query, setQuery] = useState(intake.supplier);
  const issue = state.intakeIssue?.screen === c.screen.id ? state.intakeIssue : null;
  const [error, setError] = useState(issue?.message || "");
  const [missingQuestion, setMissingQuestion] = useState(issue?.question ?? null);
  useEffect(() => {
    if (!issue) return;
    setError(issue.message);
    setMissingQuestion(issue.question ?? null);
    requestAnimationFrame(() => document.getElementById(issue.target)?.focus());
  }, [issue]);
  const edit = (patch) => {
    setError("");
    setMissingQuestion(null);
    update({ intake: { ...intake, ...patch }, intakeSubmitted: false, intakeIssue: null });
  };
  const questions = [
    "Will the supplier process personal or payment data?",
    "Will the service connect to production systems?",
    "Could an outage interrupt a critical customer journey?",
    "Could the service be replaced within one business day?",
  ];
  const fail = (message, target) => {
    setError(message);
    requestAnimationFrame(() => document.getElementById(target)?.focus());
  };
  const supplier = data.suppliers.find((s) => s.name === intake.supplier);
  const matches = data.suppliers.filter((s) =>
    `${s.name} ${s.domain}`.toLowerCase().includes(query.toLowerCase()),
  );
  const next = () => {
    if (step === 1 && (!intake.use || intake.use === "Another service") && !intake.purpose.trim()) {
      fail("Select an intended use or describe your purpose.", "intake-purpose");
      return;
    }
    const missing = questions.findIndex((_, i) => !["Yes", "No", "Unknown"].includes(intake.answers[i]));
    if (step === 2 && missing !== -1) {
      setMissingQuestion(missing);
      fail(`Answer question ${missing + 1}: ${questions[missing]} Unknown is a valid answer.`, `intake-question-${missing}`);
      return;
    }
    navigate(["C02", "C03", "C04", "C05"][step + 1]);
  };
  const submit = (e) => {
    e.preventDefault();
    if (state.intakeSubmitted) {
      const submitted = state.extraEngagements?.find(row => row.receipt === state.intakeReceipt);
      if (submitted) update({ selected: submitted.id });
      navigate("C09");
      return;
    }
    const missing = questions.findIndex((_, i) => !["Yes", "No", "Unknown"].includes(intake.answers[i]));
    const incomplete = !intake.supplier.trim()
      ? { screen: "C02", target: "intake-supplier", message: "Enter or select the supplier before submitting." }
      : (!intake.use || intake.use === "Another service") && !intake.purpose.trim()
        ? { screen: "C03", target: "intake-purpose", message: "Select an intended use or describe your purpose before submitting." }
        : missing !== -1
          ? { screen: "C04", target: `intake-question-${missing}`, question: missing, message: `Answer question ${missing + 1}: ${questions[missing]} Unknown is a valid answer.` }
          : null;
    if (incomplete) {
      update({ intakeIssue: incomplete });
      navigate(incomplete.screen);
      return;
    }
    const id = `request-${Date.now()}`;
    const receipt = `REQ-${Date.now()}`;
    c.event("Customer intake submitted", {
      intakeSubmitted: true,
      intakeReceipt: receipt,
      selected: id,
      extraEngagements: [
        ...(state.extraEngagements || []),
        {
          id,
          supplier: intake.supplier.trim(),
          service: intake.use === "Another service" ? intake.purpose.trim() : intake.use || intake.purpose.trim(),
          risk: "Pending triage",
          stage: "Intake",
          owner: data.workspace.analyst,
          due: "Pending review",
          plan: "To be confirmed",
          client: data.workspace.name,
          workspaceId: c.user?.workspaceId || "northstar",
          receipt,
          answers: { ...intake.answers },
          attachments: structuredClone(intake.attachments),
        },
      ],
    });
    notify("Request submitted. Your receipt is saved until refresh.");
    navigate("C09");
  };
  return (
    <div className="op-intake">
      <div className="stepper intake-steps">{["Supplier", "Intended use", "Business context", "Review"].map((label, i) => <button key={label} aria-current={i === step ? "step" : undefined} className={i === step ? "current" : i < step ? "done" : ""} disabled={i > step} onClick={() => navigate(["C02", "C03", "C04", "C05"][i])}><span>{i < step ? "✓" : i + 1}</span>{label}</button>)}</div>
      <form id="intake-form" onSubmit={submit}>
        <div className="op-form-layout">
          <Card title={["Find the supplier for this review", `Tell us how you will use ${intake.supplier || "this supplier"}`, "A few facts about this service", "Review your supplier request"][step]}>
            <p className="op-intro">{["Confirm the legal entity before choosing a service.", "Choose one service for this review. A different use can have a different risk profile.", "We ask for facts your organisation can confirm, not a long questionnaire.", "Check the exact scope and facts that the analyst will receive."][step]}</p>
            {error && <div className="op-error-summary" role="alert"><b>One answer to complete</b><p>{error}</p><Link onClick={() => document.getElementById(missingQuestion !== null ? `intake-question-${missingQuestion}` : step === 0 ? "intake-supplier" : "intake-purpose")?.focus()}>Go to the missing {missingQuestion !== null ? "question" : "field"} →</Link></div>}
            {step === 0 && <>
              <Label title="Supplier name or domain · required"><input id="intake-supplier" value={query} onChange={e => { setQuery(e.target.value); setError(""); }} placeholder="Search supplier name or company domain" /></Label>
              <div className="op-supplier-matches">{matches.map(row => <button type="button" className="op-choice-card" key={row.name} onClick={() => { edit({supplier:row.name,domain:row.domain,use:"",purpose:"",product:""});navigate("C03"); }}><Entity name={row.name} service={row.domain}/><span>Use this supplier <Icon name="ArrowRight" size={15}/></span></button>)}</div>
              {!matches.length && <div className="op-empty"><h3>No matching supplier</h3><p>You can request a review for a new supplier. Its identity remains unverified until triage.</p></div>}
              <div className="op-form-footer"><span>New supplier?</span><Button onClick={() => { if(!query.trim()){fail("Enter a supplier name first.","intake-supplier");return;}edit({supplier:query.trim(),domain:"Unverified",use:"",purpose:"",product:""});navigate("C03"); }}>Enter manually →</Button></div>
            </>}
            {step === 1 && <>
              <fieldset className="op-radio-group"><legend>Intended service · required</legend>{[...(supplier?.uses || []),"Another service"].map(use => <label className={`op-radio-row ${intake.use===use?"is-selected":""}`} key={use}><input type="radio" name="intended-service" checked={intake.use===use} onChange={() => edit({use})}/><span>{use}<small>{use==="Another service"?"Describe the specific use below":"One service scope; its approval is independent of other uses."}</small></span></label>)}</fieldset>
              <Label title="Describe another service or add scope context" hint="Name the activity and the information or systems involved."><textarea id="intake-purpose" value={intake.purpose} onChange={e=>edit({purpose:e.target.value})} placeholder="Describe how your organisation will use the service"/></Label>
              <Label title="Product or service line · optional"><input value={intake.product} onChange={e=>edit({product:e.target.value})} placeholder="For example Marketing Hub"/></Label>
            </>}
            {step === 2 && questions.map((q,i) => <fieldset className={`op-business-question ${missingQuestion===i?"has-error":""}`} key={q} id={`intake-question-${i}`} tabIndex={-1} aria-invalid={missingQuestion===i||undefined}><legend>{i+1}. {q} <small>required</small></legend><p>{["Include customer records, staff information and transaction details.","Include a live customer database, payment integration or employee identity system.","Consider the customer journey that depends on this specific service.","Include the time needed to migrate data, reconnect systems and train people."][i]} Unknown is a valid answer.</p><div className="op-radio-stack">{["Yes","No","Unknown"].map(answer=><label className={`op-radio-row ${intake.answers[i]===answer?"is-selected":""}`} key={answer}><input type="radio" name={`business-fact-${i}`} checked={intake.answers[i]===answer} onChange={()=>edit({answers:{...intake.answers,[i]:answer}})}/><span>{answer}</span></label>)}</div>{missingQuestion===i&&<p className="op-field-error">Select Yes, No or Unknown to continue.</p>}</fieldset>)}
            {step === 3 && <>
              <Fields items={[["Supplier",intake.supplier],["Service",intake.use==="Another service"?intake.purpose:intake.use||intake.purpose],["Product",intake.product||"Not specified"],["Business owner",data.workspace.decisionOwner],...questions.map((q,i)=>[q,intake.answers[i]||"Not answered"]) ]}/>
              {Object.values(intake.answers).includes("Unknown")&&<Note warning>Unresolved facts: {questions.filter((_,i)=>intake.answers[i]==="Unknown").join("; ")}. These remain for analyst triage.</Note>}
              <Link onClick={()=>navigate("C04")}>Edit business context →</Link>
              <div className="op-section-rule"><h3>Supporting documents</h3><p>Optional scope descriptions or existing supplier documents.</p><UploadList files={intake.attachments} onChange={attachments=>edit({attachments})}/></div>
            </>}
            {step>0&&<div className="op-form-footer"><span className="op-save-state"><Icon name="Check" size={14}/> Draft kept in this session · until refresh</span><div><Button onClick={()=>navigate(["C02","C03","C04"][step-1])}>Back</Button>{step===3?<Button primary type="submit" icon="ArrowRight">Submit request</Button>:<Button primary icon="ArrowRight" onClick={next}>{step===2?"Continue to review":"Continue to business context"}</Button>}</div></div>}
          </Card>
          <aside className="op-context-rail"><Card title="This request"><Fields items={[["Supplier",intake.supplier||"Not selected"],["Domain",intake.domain||"Not confirmed"],["Service",intake.use==="Another service"?intake.purpose||"Describe the service":intake.use||intake.purpose||"Not selected"],["Business facts",`${Object.keys(intake.answers).length} of ${questions.length} answered`],["Documents",`${intake.attachments.length} attached`]]}/><div className="op-context-note"><h3>Why we ask</h3><p>Different uses of the same supplier can create different risks. Your answers determine the relevant review scope; they do not approve the supplier.</p></div><details className="op-help"><summary>What if I do not know an answer?</summary><p>Choose Unknown. It stays unresolved for an analyst to clarify and is never treated as No or inferred from public research.</p></details></Card><Card title="What happens to these facts?"><p>An assigned analyst confirms scope under the approved programme. Independent QA challenges the recommendation. Your Decision Owner signs the outcome.</p><Note>No risk tier is calculated here. CTP methodology and customer authority remain unchanged.</Note></Card></aside>
        </div>
      </form>
    </div>
  );
}

function UploadList({ files, onChange, removable = true }) {
  return (
    <>
      <label className="upload-zone">
        <Icon name="Upload" size={24} />
        <b>Drop documents here, or choose a file</b>
        <small>PDF / DOCX · stored as demo metadata only</small>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          onChange={(e) => {
            onChange([
              ...files,
              ...Array.from(e.target.files).map((f) => ({
                name: f.name,
                size: f.size,
              })),
            ]);
            e.target.value = "";
          }}
        />
      </label>
      {files.map((file, i) => (
        <div className="list-row" key={`${file.name}-${i}`}>
          <Icon name="FileText" />
          <span>{file.name}</span>
          {removable && <button
            type="button"
            aria-label={`Remove ${file.name}`}
            onClick={() => onChange(files.filter((_, index) => index !== i))}
          >
            <Icon name="X" size={14} />
          </button>}
        </div>
      ))}
    </>
  );
}

function SecondaryCase(c) {
  const { engagement, navigate, update, screen, data } = c;
  if (engagement.receipt) return <div className="op-receipt-page">
    <section className="op-success-hero"><span className="op-success-mark"><Icon name="Check" size={30}/></span><div><div className="eyebrow">REQUEST CONFIRMATION · {engagement.receipt}</div><h2>Your supplier request was received</h2><p>{engagement.supplier} · {engagement.service}</p><small>No supplier decision has been made. Your request is waiting for analyst triage.</small></div><Badge>Awaiting triage</Badge></section>
    <div className="op-form-layout"><Card title="What happens next"><ol className="op-numbered-timeline"><li><b>Osura reviews your business context</b><p>Next owner: {engagement.owner || "assigned Osura analyst"}. Your submitted facts and intended service stay attached to this request.</p></li><li><b>Any missing facts stay with this request</b><p>Unknown answers remain unresolved. This prototype does not send a notification or promise a response time.</p></li><li><b>The review scope is confirmed</b><p>No risk classification, evidence conclusion or customer approval has been invented.</p></li></ol><div className="op-form-footer"><Button onClick={()=>document.getElementById("submitted-request-details")?.scrollIntoView({behavior:"smooth"})} primary>View my request</Button><Button onClick={()=>navigate(screen.role==="analyst"?"O01":"C01")}>Return to my overview</Button></div></Card>
    <Card title="Submitted details" className="op-submitted-details"><div id="submitted-request-details"><Fields items={[["Supplier",engagement.supplier],["Service",engagement.service],["Customer",engagement.client],["Business context",`${Object.keys(engagement.answers||{}).length} answers recorded`],["Documents",engagement.attachments?.map(f=>f.name).join(", ")||"No documents attached"],["Reference",engagement.receipt]]}/><details className="op-help"><summary>View submitted business facts</summary><Fields items={Object.entries(engagement.answers||{}).map(([i,a])=>[`Business fact ${Number(i)+1}`,a])}/></details><Button small icon="Download" onClick={()=>downloadJSON(engagement.receipt,engagement)}>Download this receipt</Button><Note>Receipt and submitted facts are kept until refresh. Download a copy before leaving this session.</Note></div></Card></div>
    {data.engagements.some(row=>row.id==="cedar")&&<Card title="Want to see the complete journey?" className="op-example-invitation"><div><h3>Explore the separate CedarCloud example</h3><p>See evidence review, a customer decision and ongoing assurance. This changes the example, never the status of your request.</p></div><Button onClick={()=>{update({selected:"cedar"});navigate(screen.role==="analyst"?"O02":"C09");}}>Explore the prepared example →</Button></Card>}
  </div>;
  return <><div className="supplier-banner"><Entity name={engagement.supplier} service={engagement.service}/><Badge>CTP inherent risk: {engagement.risk}</Badge><Badge>{engagement.stage}</Badge></div><div className="op-form-layout"><Card title="Service-scoped portfolio preview"><Fields items={[["Customer",engagement.client],["Supplier",engagement.supplier],["Service",engagement.service],["Current stage",engagement.stage],["Owner",engagement.owner],["Assessment plan",engagement.plan],["Next date",formatDate(engagement.due)]]}/><Note>This record has its own supplier, service and review state. CedarCloud evidence and decisions are never used for this service.</Note><Button onClick={()=>navigate(screen.role==="analyst"?"O01":"C15")}>Return to {screen.role==="analyst"?"assigned work":"assessment register"}</Button></Card><Card title="A separate prepared walkthrough"><p>The full source-review and customer-decision journey is prepared for CedarCloud’s payment event processing service.</p>{data.engagements.some(row=>row.id==="cedar")?<Button onClick={()=>{update({selected:"cedar"});navigate(screen.role==="analyst"?"O02":"C09");}}>View CedarCloud example →</Button>:<Note>No full walkthrough is prepared for the current customer selection.</Note>}</Card></div></>;
}

function Assessment(c) {
  const { data, state, engagement, navigate, screen } = c;
  const customer = screen.role === "customer";
  const [tab, setTab] = useState("Summary");
  const status = workflowStatus(state);
  const pending = state.conclusion === "Needs review" || Object.values(state.pendingReviews || {}).some(Boolean);
  const activeStep = status.step;
  const evidence = evidenceSummary(data.requirements);
  const blockers = data.requirements.filter(row => state.pendingReviews?.[row.id] || row.conclusion === "Needs review");
  const needsRevision = status.stage === "Evidence" && !pending;
  const nextRoute = customer ? status.ready ? "C06" : "C13" : status.stage === "QA" ? "O08" : "O04";
  const gateCards = [
    ["Intake & scope", "Recorded", "done"],
    ["Evidence review", pending || needsRevision ? "Action needed" : "Current sources reviewed", pending || needsRevision ? "action" : "done"],
    ["Independent QA", state.qa.startsWith("Passed") && !pending && !needsRevision ? "Passed" : pending || needsRevision ? "Waiting for analyst" : "Action needed", state.qa.startsWith("Passed") && !pending && !needsRevision ? "done" : pending || needsRevision ? "waiting" : "action"],
    ["Customer decision", state.decision ? "Recorded" : status.ready ? "Ready for your decision" : "Blocked", state.decision ? "done" : status.ready ? "action" : "waiting"],
  ];
  const steps = [
    "Intake",
    "CTP & scope",
    "Evidence & follow-up",
    "QA",
    "Decision",
  ];
  return (
    <>
      <Scope {...c} />
      <div className="case-task-heading"><div><span className="case-kicker">CURRENT REVIEW</span><h2>{state.decision ? "Your customer outcome is preserved" : status.ready ? "Your review is ready for a decision" : "Customer decision is paused"}</h2><p>{state.decision ? "The original evidence and customer outcome remain frozen in the Decision Pack." : status.ready ? "Osura’s review and independent QA are ready. The customer chooses the final outcome." : "The current review needs more work before the customer can decide."}</p></div><Badge>CTP inherent risk: {engagement.risk}</Badge></div>
      <div className={`case-readiness ${status.ready || state.decision ? "ready" : "warning"}`}><Icon name={status.ready || state.decision ? "CircleCheck" : "TriangleAlert"} /><div><b>{status.label}</b><p>{pending ? "New evidence requires an analyst review. Independent QA must then confirm the updated recommendation." : needsRevision ? "Address the independent QA challenge with a substantive analyst revision before QA can accept the recommendation." : `Next owner: ${status.nextOwner}. ${customer && !status.ready && !state.decision ? "Osura is reviewing the recommendation. Your decision action becomes available when review is ready." : "The next action follows the current review state."}`}</p></div></div>
      <div className="case-gates">{gateCards.map(([label, detail, gateState]) => <div className={`case-gate ${gateState}`} key={label}><span><Icon name={gateState === "done" ? "CircleCheck" : gateState === "action" ? "Circle" : "Clock"} />{label}</span><b>{detail}</b></div>)}</div>
      {state.clarification && !state.decision && <div className="outcome-receipt clarification"><Icon name="MessageSquare" /><div><span className="case-kicker">RETURNED FOR CLARIFICATION</span><h2>Osura needs to clarify the recommendation</h2><p>{state.clarification.rationale}</p><Fields items={[["Next owner", "Osura analyst"], ["Signed pack", "Not created"], ["Customer outcome", "Neither approved nor rejected"]]} /></div></div>}
      {!state.decision && <div className="case-two-pane readiness-details"><Card title={`The next action belongs to ${status.nextOwner}`}>
        {blockers.length ? blockers.map(row => <div className="case-blocker" key={row.id}><div><b>{row.id} · {row.name}</b><p>{row.source}</p></div><Badge>Needs review</Badge><Button small onClick={() => { c.update({ selectedRequirement: row.id }); navigate(customer ? "C13" : "O04"); }}>{customer ? "Inspect this evidence" : "Review the new evidence"}</Button></div>) : <div className="case-blocker"><div><b>{needsRevision ? "Respond to the independent QA challenge" : status.ready ? "Choose your organisation’s outcome" : "Independently challenge the recommendation"}</b><p>{needsRevision ? state.qaNote : status.ready ? "Read the recommendation, choose an outcome and explain your reasoning." : "A different permitted analyst must record QA before customer consideration."}</p></div><Button primary onClick={() => navigate(nextRoute)}>{customer ? status.ready ? "Make your customer decision" : "Inspect the recommendation" : status.stage === "QA" ? "Open independent QA" : "Revise the assessment"}</Button></div>}
        <div className="case-next-owner"><span>Next owner</span><b>{status.nextOwner}</b></div>
      </Card><Card title="What unblocks the decision?"><ol className="case-unblock-list"><li>Save an independent review of each outstanding requirement.</li><li>Explain any remaining material gap or the resolution of QA feedback.</li><li>A different analyst reviews the recommendation through independent QA.</li><li>The customer records their own outcome and rationale.</li></ol><Link onClick={() => c.setDrawer("audit")}>View the review history →</Link></Card></div>}
      {!customer && (
        <Tabs
          tabs={[
            "Summary",
            "CTP & scope",
            "Requirements",
            "Evidence",
            "Verification",
            "Findings",
            "QA",
            "Decision",
            "Activity",
          ]}
          value={tab}
          onChange={(t) => {
            setTab(t);
            const target = {
              "CTP & scope": "O12",
              Evidence: "O03",
              Verification: "O04",
              Findings: "O07",
              QA: "O08",
              Decision: "C06",
            }[t];
            if (target) navigate(target);
          }}
        />
      )}
      <div
        className={
          customer ? "stepper assessment-steps" : "assessment-path-rail"
        }
      >
        {!customer && <div className="micro-label">ASSESSMENT PATH</div>}
        {steps.map((s, i) => (
          <button
            className={i < activeStep ? "done" : i === activeStep ? "current" : ""}
            aria-current={i === activeStep ? "step" : undefined}
            key={s}
            onClick={() =>
              navigate(
                customer
                  ? ["C05", "C04", "C13", "C09", "C06"][i]
                  : ["O02", "O12", "O03", "O08", "C06"][i],
              )
            }
          >
            {i < activeStep ? "✓ " : ""}
            {s}
          </button>
        ))}
      </div>
      {state.intakeSubmitted && customer && (
        <Note>
          Request {state.intakeReceipt} received for {state.intake.supplier} ·{" "}
          {state.intake.use || state.intake.purpose}. Draft data lasts until refresh. The CedarCloud reference case below is a separate
          prepared walkthrough.
        </Note>
      )}
      {tab === "Activity" ? (
        <Card title="Recorded activity">
          {state.events.length ? (
            <Timeline
              items={state.events.map((e) => [
                e.message,
                formatDate(e.at),
                "Recorded",
              ])}
            />
          ) : (
            <Note>No new actions have been recorded in this browser yet.</Note>
          )}
        </Card>
      ) : tab === "Requirements" ? (
        <Card title="Applicable controls">
          <Requirements {...c} />
        </Card>
      ) : (
        <>
          <div
            className={`grid wide-left ${customer ? "" : "analyst-assessment"}`}
          >
            <Card
              title={customer ? "What has happened" : "Assessment status"}
              action={
                !customer && (
                  <Link onClick={() => navigate("O03")}>
                    Open evidence ledger →
                  </Link>
                )
              }
            >
              {customer ? (
                <Timeline
                  items={[
                    [
                      "Business context and CTP impact recorded",
                      "Customer facts and service scope captured",
                      "Completed",
                    ],
                    [
                      pending ? "Evidence needs independent review" : "Evidence versions checked",
                      "Page-linked source references retained",
                      pending ? "Needs review" : "Completed",
                    ],
                    [
                      state.supplierReceipt ? "Targeted supplier response received" : "Prepared supplier response example",
                      state.supplierReceipt ? "Affected controls require independent review" : "No supplier response submitted in this session",
                      state.supplierReceipt ? pending ? "Needs review" : "Reviewed" : "Prepared example",
                    ],
                    [
                      "Independent QA readiness",
                      "Different reviewer · challenge recorded",
                      state.qa,
                    ],
                    [
                      "Customer decision",
                      state.decision
                        ? "Signed outcome preserved"
                        : `Next owner: ${status.nextOwner}`,
                      state.decision ? "Recorded" : status.label,
                    ],
                  ]}
                  onClick={() => navigate("C13")}
                />
              ) : (
                <>
                  <Note warning>
                    {state.decision
                      ? "Customer decision recorded. The signed pack is preserved."
                      : `Next owner: ${status.nextOwner}. ${status.label}.`}
                  </Note>
                  <Fields
                    items={[
                      ["Scope", engagement.service],
                      ["Assessment set", `${evidence.total} requirements in this demo`],
                      [
                        "Current outcomes",
                        evidence.text,
                      ],
                      ["Decision gate", status.label],
                      ["Next owner", status.nextOwner],
                    ]}
                  />
                </>
              )}
            </Card>
            <Card title={customer ? "Review summary" : "Connected records"}>
              <Fields
                items={[
                  ["CTP inherent risk", <Badge>{engagement.risk}</Badge>],
                  ["Assessment plan", engagement.plan],
                  [
                    "Control coverage",
                    `${evidence.total} demo requirements · ${evidence.text}`,
                  ],
                  [
                    "Open conditions",
                    state.conditionClosed ||
                    (state.decision && !state.decision.condition)
                      ? "0 open"
                      : state.decision
                        ? "1 open"
                        : "1 proposed",
                  ],
                  ["Decision authority", data.workspace.name],
                ]}
              />
              <Button
                primary
                small
                onClick={() => navigate(customer ? "C06" : "C13")}
              >
                Read decision memo
              </Button>
              {!customer && (
                <>
                  <div className="list-row">
                    <b>QA challenge</b>
                    <Link onClick={() => navigate("O08")}>Open →</Link>
                  </div>
                  <div className="list-row">
                    <b>Communications</b>
                    <Link onClick={() => navigate("O14")}>View →</Link>
                  </div>
                </>
              )}
            </Card>
          </div>
          <Card
            title={customer ? "Evidence and outcomes" : "Priority requirements"}
            action={
              <Link onClick={() => navigate(customer ? "C13" : "O03")}>
                All requirements and evidence →
              </Link>
            }
          >
            <Requirements {...c} customer={customer} />
          </Card>
          {!customer && (
            <Card title="Case action">
              <div className="list-row">
                <div>
                  <b>{status.label}</b>
                  <p>
                    Next owner: {status.nextOwner}
                  </p>
                </div>
                <Link onClick={() => navigate("C06")}>
                  Open customer view →
                </Link>
              </div>
              <Button small onClick={() => c.setDrawer("memo")}>
                Inspect decision memo
              </Button>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function Findings(c) {
  const { data, screen, navigate, state, setDrawer } = c;
  const [selectedId, setSelected] = useState(state.selectedFinding || null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const customer = screen.role === "customer";
  const allRows = [...data.findings, ...(state.extraFindings || [])];
  const rows = allRows.filter(row => `${row.issue} ${row.supplier} ${row.owner} ${row.control}`.toLowerCase().includes(search.toLowerCase()) && (filter === "All" || filter === "Open" && row.state !== "Closed" || filter === "Conditions" && /condition/i.test(row.state) || filter === row.state));
  const f = rows.find(row=>row.id===selectedId) || rows.find(row=>row.engagementId===state.selected) || rows[0];
  const requirement = f?.engagementId === "cedar" ? data.requirements.find(row=>row.id===f.control) : null;
  const proposed = f?.id === "F-01" && !state.decision;
  const openEvidence = () => { c.update({ selected:f.engagementId, selectedFinding:f.id, selectedRequirement:f.control }); navigate(customer?"C13":f.id==="F-01"&&state.decision?.condition?"O09":"O04"); };
  return <div className="op-findings-page">
    <section className="op-section-heading"><div><div className="eyebrow">ACCOUNTABLE REMEDIATION</div><h2>Make each finding actionable</h2><p>Evidence, treatment and accountability stay with the exact supplier service.</p></div>{!customer&&<Button primary icon="FileText" onClick={()=>setDrawer("finding")}>Create a finding</Button>}</section>
    <div className="op-metric-strip"><div><strong>{allRows.filter(row=>row.state!=="Closed").length}</strong><span>Open material items</span></div><div><strong>{allRows.filter(row=>row.state==="Open condition").length}</strong><span>Customer-approved conditions</span></div><div><strong>{allRows.filter(row=>row.state==="Closed").length}</strong><span>Closed with reviewed proof</span></div></div>
    <Tabs tabs={["All","Open","Conditions","Closed"]} value={filter} onChange={setFilter}/>
    <div className="op-search-bar"><Icon name="Search"/><input aria-label="Search findings" placeholder="Search supplier, requirement, issue or accountable owner" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<Button small onClick={()=>setSearch("")}>Clear</Button>}</div>
    <div className="op-findings-layout"><Card title={customer?"Findings and obligations":"Finding register"}><div className="op-finding-list">{rows.map(row=><button type="button" className={`op-finding-row ${f?.id===row.id?"is-selected":""}`} key={row.id} onClick={()=>{setSelected(row.id);c.update({selected:row.engagementId,selectedFinding:row.id});}} aria-pressed={f?.id===row.id}><span className="op-finding-reference">{row.control}<small>{row.id}</small></span><span className="op-finding-description"><b>{row.issue}</b><small>{row.supplier} · {row.service}</small><span><Badge>{row.severity}</Badge><Badge>{row.state}</Badge></span></span><span className="op-finding-owner"><b>{row.owner}</b><small>Due {formatDate(row.due)}</small></span><Icon name="ArrowRight" size={16}/></button>)}</div>{!rows.length&&<div className="op-empty"><Icon name="Search" size={28}/><h3>No findings match this view</h3><p>Search “{search}” · {filter}. Other programme work may still be open.</p><Button onClick={()=>{setSearch("");setFilter("All");}}>Clear filters</Button></div>}</Card>
    {f&&<aside className="op-context-rail"><Card title="Selected evidence and treatment"><div className="op-selected-scope"><small>{f.id} · {f.control}</small><h3>{f.supplier}</h3><p>{f.service}</p><Badge>{f.severity} finding severity</Badge></div><h3 className="op-panel-subheading">The unresolved issue</h3><p>{f.issue}</p><Fields items={[["Current support",requirement?.conclusion||"Service-scoped portfolio preview"],["Treatment",proposed?"Proposed condition · no customer decision":f.treatment||f.state],["Accountable owner",f.owner],["Due",formatDate(f.due)]]}/><div className="op-context-note"><h3>Evidence and closure context</h3><p>{f.evidence||f.closureEvidence||"The reviewer must specify the proof needed for closure."}</p>{requirement&&<small>{requirement.source}</small>}</div><Note>{proposed?"A proposal is not a customer-approved obligation. The customer Decision Owner has not signed it.":"A finding severity does not change CTP inherent risk. Source versions and any signed customer record remain unchanged."}</Note><Button primary icon="FileText" onClick={openEvidence}>{f.id==="F-01"&&state.decision?.condition&&!customer?"Review condition closure":"Inspect this service’s evidence"} →</Button></Card></aside>}
    </div>
  </div>;
}

function EvidenceReview(c) {
  const { data, state, update, navigate, screen, notify, setDrawer } = c;
  const customer = screen.role === "customer";
  const [tab, setTab] = useState(customer ? "Evidence conclusions" : "Evidence viewer");
  const [requirementId, setRequirement] = useState(state.selectedRequirement || "R-07");
  const requirement = data.requirements.find(r => r.id === requirementId) || data.requirements[0];
  const savedReview = state.reviews?.[requirement.id];
  const currentConclusion = state.pendingReviews?.[requirement.id] ? "Needs review" : requirement.id === "R-07" ? state.conclusion : savedReview?.conclusion || requirement.conclusion;
  const sourceDocument = requirement.sourceDocument || [...data.documents].reverse().find(doc => doc.requirement === requirement.id);
  const draftKey = `${c.user.id}:${requirement.id}`;
  const draft = state.reviewDrafts?.[draftKey] || { judgement: requirement.id === "R-07" ? state.judgement : savedReview?.judgement || "", conclusion: currentConclusion, reason: savedReview?.reason || "", recommendation: savedReview?.recommendation || "Approve with conditions" };
  const { judgement, conclusion, reason, recommendation } = draft;
  const dirty = Boolean(state.reviewDrafts?.[draftKey]);
  const [showProposal, setShowProposal] = useState(false);
  const [error, setError] = useState("");
  const [pendingRequirement, setPendingRequirement] = useState(null);
  const editDraft = patch => { update({ reviewDrafts: { ...state.reviewDrafts, [draftKey]: { ...draft, ...patch } } }); setError(""); };
  useEffect(() => { setShowProposal(false); setError(""); }, [requirement.id]);
  useEffect(() => { if (state.selectedRequirement) setRequirement(state.selectedRequirement); }, [state.selectedRequirement]);
  const selectRequirement = id => {
    if (id === requirement.id) return;
    if (dirty) { setPendingRequirement(id); return; }
    setRequirement(id); update({ selectedRequirement: id });
  };
  const save = (next = false) => {
    try {
      const reviewDrafts = { ...state.reviewDrafts }; delete reviewDrafts[draftKey];
      const result = saveRequirementReview(state, data, requirement.id, { judgement, conclusion, reason, recommendation });
      const nextRequirement = next && data.requirements[(data.requirements.findIndex(r => r.id === requirement.id) + 1) % data.requirements.length];
      update({ ...result, reviewDrafts, ...(nextRequirement ? { selectedRequirement: nextRequirement.id } : {}) });
      if (nextRequirement) setRequirement(nextRequirement.id);
      notify("Assessment saved in this session."); setError("");
    } catch (error) { setError(error.message); }
  };
  const definitions = {
    Supported: "The evidence supports this requirement for the contracted service. Explain the source and its scope.",
    "Partially supported": "The evidence supports only part of this requirement. Explain the remaining gap.",
    Unknown: "There is not enough evidence to reach a conclusion. Describe what remains unknown.",
    Contradictory: "The available sources disagree. Explain the conflict and its significance.",
    "Out of scope": "This requirement does not apply to this service. Record the scope basis.",
    "Needs review": "A new source version needs your independent assessment before QA can continue.",
  };
  return <div className="case-workspace evidence-workspace">
    <Scope {...c} />
    <div className="case-task-heading"><div><span className="case-kicker">{customer ? "EVIDENCE TRANSPARENCY" : `REQUIREMENT ${requirement.id}`}</span><h2>{customer ? "Understand the evidence and its limits" : `Review ${requirement.name.toLowerCase()}`}</h2><p>Read the source, record your judgement, then compare the prepared proposal.</p></div>
      <Label title="Requirement"><select value={requirement.id} onChange={e => selectRequirement(e.target.value)}>{data.requirements.map(r => <option key={r.id} value={r.id}>{r.id} · {r.name}</option>)}</select></Label>
    </div>
    <Tabs tabs={customer ? ["Evidence conclusions", "Documents", "Questions", "Activity"] : ["Evidence viewer", "Source record", "Version history", "Supplier response"]} value={tab} onChange={setTab} />
    {tab === "Documents" || tab === "Source record" ? <Inventory {...c} embedded /> : tab === "Activity" || tab === "Version history" ? <Card title="Evidence history"><Timeline items={[
      ...data.sourceHistory,
      ...Object.values(state.supplierReceipts || {}).map(receipt => [receipt.fileName, `${receipt.reference} · received ${formatDate(receipt.at)}`, "Supplier response"]),
      ...(state.uploads || []).map(doc => [doc.name, `${doc.version} · received ${formatDate(doc.receivedAt)}`, "Metadata only"]),
    ]} /></Card> : tab === "Questions" || tab === "Supplier response" ? <FollowUp {...c} /> : <div className="case-two-pane evidence-task-grid">
      <Card title="Evidence and its limits" className="evidence-source-card" action={<Link onClick={() => setDrawer("source")}>View source excerpt ↗</Link>}>
        <div className="evidence-source-header"><div><b>{sourceDocument?.name || "No matching source document"}</b><p>{sourceDocument?.version || "Unversioned"} · {sourceDocument?.page || "Page reference unavailable"}</p></div><Badge>Version pinned</Badge></div>
        <div className="document case-source-excerpt"><div className="document-label">{c.engagement.supplier.toUpperCase()} · SYNTHETIC SOURCE EXCERPT</div><h3>{requirement.name}</h3><blockquote>{requirement.passage || "No excerpt is available. Inspect the original document outside this prototype before drawing a conclusion."}</blockquote><small>{requirement.source}</small></div>
        <div className="evidence-meaning support"><Icon name="CircleCheck" /><div><h3>What this source supports</h3><p>{requirement.proves}</p></div></div>
        <div className="evidence-meaning gap"><Icon name="TriangleAlert" /><div><h3>What it does not establish</h3><p>{requirement.doesNotProve}</p></div></div>
        <details className="source-provenance"><summary>Source provenance and version</summary><Fields items={[["File", sourceDocument?.name || "Unavailable"], ["Version", sourceDocument?.version || "Unversioned"], ["Received", formatDate(sourceDocument?.date)], ["Source handling", /metadata|no extraction/i.test(sourceDocument?.page || "") ? "Metadata / supplier answer only · no document extraction" : "Prepared synthetic excerpt"]]} /><Button small onClick={() => setTab("Version history")}>View source history</Button></details>
        <p className="case-session-note">Original PDF viewing is unavailable. This view contains synthetic excerpts or submitted metadata.</p>
      </Card>
      {customer ? <Card title="Current evidence conclusion" className="evidence-assessment-card"><Badge>Evidence support: {currentConclusion}</Badge><h3>{requirement.name}</h3><p>{savedReview?.judgement || (requirement.id === "R-07" ? state.judgement : "Prepared conclusion; no analyst action recorded in this session.")}</p><div className="evidence-definition"><Icon name="Info" /><p>{definitions[currentConclusion]}</p></div><Fields items={[["Reviewed by", savedReview?.actor || "Prepared fixture"], ["Recorded", savedReview ? formatDate(savedReview.at) : "Reference example"], ["Customer service", c.engagement.service]]} /><Note>The analyst evaluates the evidence. Independent QA challenges the recommendation. Your team makes the final customer decision.</Note><Button onClick={() => navigate("C09")}>Return to the review</Button></Card> : <Card title="Your assessment" className="evidence-assessment-card">
        <Label title="Your independent assessment (required)"><textarea className="independent-assessment" required value={judgement} onChange={e => editDraft({ judgement: e.target.value })} placeholder="Explain what the source supports for this service and where uncertainty remains." /></Label>
        <Label title="Evidence conclusion"><select value={conclusion} onChange={e => editDraft({ conclusion: e.target.value })}>{currentConclusion === "Needs review" && <option disabled>Needs review</option>}{["Supported", "Partially supported", "Unknown", "Contradictory", "Out of scope"].map(value => <option key={value}>{value}</option>)}</select></Label>
        <div className="evidence-definition"><Icon name="Info" /><p><b>{conclusion}:</b> {definitions[conclusion]}</p></div>
        {(conclusion !== currentConclusion || state.qaReworkRevision != null || savedReview?.reason) && <Label title={state.qaReworkRevision != null ? "Revision / response to the QA challenge" : "Reason for changing the conclusion"}><textarea value={reason} onChange={e => editDraft({ reason: e.target.value })} placeholder="Explain the changed conclusion or how you resolved the QA challenge." /></Label>}
        <Label title="Suggested customer outcome"><select value={recommendation} onChange={e => editDraft({ recommendation: e.target.value })}>{["Approve", "Approve with conditions", "Reject", "Return for clarification"].map(value => <option key={value}>{value}</option>)}</select></Label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className={`review-save-state ${dirty ? "dirty" : savedReview ? "saved" : ""}`} role="status"><Icon name={dirty ? "Circle" : savedReview ? "CircleCheck" : "Info"} /><div><b>{dirty ? "Unsaved changes" : savedReview ? "Assessment saved" : "No saved assessment"}</b><small>{savedReview ? `${savedReview.actor} · ${formatDate(savedReview.at)} · ${requirement.id} · ${sourceDocument?.version || "Unversioned source"}` : "Prepared advice is separate from your independent assessment."}</small></div></div>
        <div className="review-save-actions"><Button primary onClick={() => save()}>Save assessment</Button><Button onClick={() => save(true)}>Save and review the next requirement →</Button></div>
        <div className="prepared-comparison"><b>Compare the prepared proposal</b><p>Your independent assessment comes first. Prepared text never replaces your judgement.</p><Button small disabled={!savedReview?.judgement} onClick={() => setShowProposal(!showProposal)}>{showProposal ? "Hide prepared proposal" : "Compare prepared proposal"}</Button>{showProposal && <Note warning>{requirement.proposal} Synthetic fixture content, not live AI output.</Note>}</div>
        <p className="case-session-note">Drafts survive navigation in this session. Refresh clears all changes.</p>
      </Card>}
    </div>}
    {pendingRequirement && <Dialog title="Leave with unsaved changes?" onClose={() => setPendingRequirement(null)}><p>Your assessment text has not been saved. Keep editing or discard these changes.</p><div className="form-actions"><Button primary onClick={() => setPendingRequirement(null)}>Keep editing</Button><Button onClick={() => { const reviewDrafts = { ...state.reviewDrafts }; delete reviewDrafts[draftKey]; update({ reviewDrafts, selectedRequirement: pendingRequirement }); setRequirement(pendingRequirement); setPendingRequirement(null); }}>Discard changes</Button></div></Dialog>}
  </div>;
}

function Decision(c) {
  const { state, data, engagement, setDrawer, navigate, notify } = c;
  const draftKey = c.user.id;
  const draft = state.decisionDrafts?.[draftKey] || { choice: "", rationale: "", owner: "", due: "", evidence: "" };
  const { choice, rationale, owner, due, evidence } = draft;
  const status = workflowStatus(state);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const editDraft = patch => { c.update({ decisionDrafts: { ...state.decisionDrafts, [draftKey]: { ...draft, ...patch } } }); setError(""); };
  const submit = e => {
    e.preventDefault();
    if (!choice || !rationale.trim()) { setError("Choose an outcome and enter your own decision rationale."); return; }
    if (choice === "Approve with conditions" && (!owner.trim() || !due || !evidence.trim())) { setError("Complete the condition owner, due date and required evidence."); return; }
    if (!status.ready) { setError(`${status.label}. Next owner: ${status.nextOwner}.`); return; }
    setConfirming(true);
  };
  const confirm = () => {
    try {
      const next = recordDecision(state, data, choice, rationale.trim(), { owner: owner.trim(), due, evidence: evidence.trim() });
      const decisionDrafts = { ...state.decisionDrafts }; delete decisionDrafts[draftKey];
      c.update({ ...next, decisionDrafts }); setConfirming(false);
      notify(choice === "Return for clarification" ? "Returned to the analyst for clarification." : "Customer decision recorded. Decision Pack frozen.");
      navigate(choice === "Return for clarification" ? "C09" : "C07");
    } catch (error) { setConfirming(false); setError(error.message); }
  };
  const recommendation = state.reviews?.["R-07"]?.recommendation || "Approve with conditions";
  const leadRequirement = data.requirements.find(row => row.id === "R-07");
  if (c.user?.role !== "customer") return <div className="case-workspace"><Scope {...c} /><Card title="Customer decision · read only"><Fields items={[["Customer", engagement.client], ["Suggested outcome", recommendation], ["Recommended by", state.reviews?.["R-07"]?.actor || "Prepared fixture"], ["QA outcome", state.qa], ["QA reviewer", state.qaReview?.actor || "Not recorded"], ["Customer decision", state.decision?.outcome || "Not recorded"], ["Decision by", state.decision?.actor || "Customer Decision Owner"]]} /><Note>Only the designated customer Decision Owner can record the final outcome. Analyst and superadmin roles cannot sign for the customer.</Note><Button onClick={() => setDrawer("audit")}>View review history</Button></Card></div>;
  return <div className="case-workspace decision-workspace">
    <Scope {...c} />
    <div className="case-task-heading"><div><span className="case-kicker">CUSTOMER AUTHORITY</span><h2>{state.decision ? "Your customer outcome is recorded" : "Make your customer decision"}</h2><p>Osura prepares the recommendation. Your organisation decides whether to proceed.</p></div><Badge>CTP inherent risk: {engagement.risk}</Badge></div>
    {!status.ready && !state.decision && <div className="case-readiness warning"><Icon name="TriangleAlert" /><div><b>Customer decision is paused</b><p>{status.label}. Next owner: {status.nextOwner}. Your outcome becomes available after the review is ready.</p></div><Button onClick={() => navigate("C09")}>View the review status</Button></div>}
    <div className="stepper assessment-steps decision-stepper">{["Intake", "CTP & scope", "Evidence & follow-up", "QA", "Decision"].map((label, i) => <span key={label} aria-current={i === status.step ? "step" : undefined} className={i < status.step ? "done" : i === status.step ? "current" : ""}>{i < status.step ? "✓ " : ""}{label}</span>)}</div>
    <div className="case-two-pane decision-task-grid">
      <Card title="What Osura recommends" className="decision-advice-card">
        <span className="advice-label">ANALYST RECOMMENDATION · NOT YOUR DECISION</span>
        <h2 className="executive-recommendation">{recommendation === "Approve with conditions" ? "Approve with a recovery-evidence condition" : recommendation}</h2>
        <p>{state.reviews?.["R-07"]?.judgement || state.judgement || "Read the source evidence and its limitations before deciding whether to proceed."}</p>
        <Fields items={[["Material gap", leadRequirement?.doesNotProve || "Review the requirement-specific source limitations"], ["Recommended treatment", recommendation], ["Independent QA", state.qa], ["QA reviewer", state.qaReview?.actor || "Not recorded"]]} />
        <div className="advice-obligation"><h3>Proposed obligation</h3><Fields items={[["Proposed condition owner", data.defaults.conditionOwner || data.workspace.decisionOwner], ["Proposed due date", formatDate(data.defaults.conditionDue)], ["Proposed required evidence", data.defaults.conditionEvidence]]} /></div>
        <div className="case-callout"><b>Evidence is available for your review</b><p>This is read-only advice. Inspect the sources, remaining uncertainty and QA challenge before choosing the outcome your organisation accepts.</p><Link onClick={() => navigate("C13")}>Read the sources and QA rationale →</Link></div>
        <details className="case-details"><summary>Recommendation and QA history</summary><Fields items={[["Recommended by", state.reviews?.["R-07"]?.actor || "Prepared analyst recommendation"], ["QA recorded", state.qaReview?.prepared ? "Prepared fixture" : formatDate(state.qaReview?.at)], ["QA rationale", state.qaNote]]} /><Link onClick={() => setDrawer("audit")}>Inspect review history →</Link></details>
      </Card>
      <Card title={state.decision ? "Recorded customer outcome" : "Your organisation’s outcome"} className="decision-outcome-card">
        {state.decision ? <><div className={`decision-recorded ${state.decision.outcome === "Reject" ? "rejected" : ""}`}><Icon name={state.decision.outcome === "Reject" ? "X" : "CircleCheck"} /><div><Badge>{state.decision.outcome}</Badge><h3>{state.decision.outcome === "Reject" ? "This service is not approved for use" : "Your explicit outcome is preserved"}</h3></div></div><Fields items={[["Recorded by", state.decision.actor], ["Recorded", formatDate(state.decision.at)], ["Your rationale", state.decision.rationale], ["Decision record", "Decision Pack v1 · frozen"]]} /><Button primary onClick={() => navigate("C07")}>Open frozen Decision Pack</Button></> : <form id="decision-form" onSubmit={submit}>
          <p>Choose the outcome your organisation accepts. Nothing is selected for you.</p>
          <fieldset className="decision-options"><legend className="sr-only">Customer outcome</legend>{[["Approve", "No further conditions"], ["Approve with conditions", "Accept with one accountable evidence obligation"], ["Reject", "Do not proceed with this service"], ["Return for clarification", "Ask Osura for further work"]].map(([value, detail]) => <label key={value} className={choice === value ? "chosen" : ""}><input type="radio" name="decision" value={value} required checked={choice === value} onChange={() => editDraft({ choice: value })} /><span><b>{value}</b><small>{detail}</small></span></label>)}</fieldset>
          <Label title="Why is this the right decision for your organisation? (required)"><textarea required value={rationale} onChange={e => editDraft({ rationale: e.target.value })} placeholder="Explain the outcome in your own words." /></Label>
          {choice === "Approve with conditions" && <div className="condition-fields"><h3>Define the evidence obligation</h3><p>Name the accountable owner, due date and evidence needed to close this condition.</p><Button small onClick={() => editDraft({ owner: data.defaults.conditionOwner || data.workspace.decisionOwner, due: data.defaults.conditionDue, evidence: data.defaults.conditionEvidence })}>Use proposed obligation</Button><Label title="Condition owner"><input required value={owner} onChange={e => editDraft({ owner: e.target.value })} /></Label><Label title="Due date"><input type="date" required value={due} onChange={e => editDraft({ due: e.target.value })} /></Label><Label title="Required evidence"><textarea required value={evidence} onChange={e => editDraft({ evidence: e.target.value })} /></Label></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="review-save-state" role="status"><Icon name={state.decisionDrafts?.[draftKey] ? "Circle" : "Info"} /><div><b>{state.decisionDrafts?.[draftKey] ? "Decision draft · not recorded" : "No customer outcome selected"}</b><small>Recording as {c.user.name} · customer Decision Owner</small></div></div>
          <div className="form-actions"><Button primary type="submit" disabled={!status.ready}>Review my decision →</Button></div>
          <p className="case-session-note">You will confirm the final scope, outcome and obligation before anything is recorded. Drafts last until refresh.</p>
        </form>}
      </Card>
    </div>
    {confirming && <Dialog title="Confirm and record this decision?" onClose={() => setConfirming(false)}><div className="decision-confirmation"><Scope {...c} /><Badge>{choice}</Badge><Fields items={[["Customer Decision Owner", c.user.name], ...(choice === "Approve with conditions" ? [["Condition owner", owner], ["Due date", formatDate(due)], ["Required evidence", evidence]] : [["Condition", "None"]])]} /><h3>Your rationale</h3><p>{rationale}</p><div className="case-callout warning"><b>{choice === "Return for clarification" ? "This returns the recommendation for further work" : "This creates a frozen record"}</b><p>{choice === "Return for clarification" ? "Your clarification request returns to Osura. It creates no signed Decision Pack and does not approve or reject the service." : "Decision Pack v1 will preserve this outcome, the reviewed evidence and QA. Later changes require a new review."}</p></div><div className="form-actions"><Button onClick={() => setConfirming(false)}>Keep editing</Button><Button primary onClick={confirm}>Record customer decision</Button></div></div></Dialog>}
  </div>;
}

function Reports(c) {
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const { state, data, navigate } = c;
  const cedar = data.engagements.find(row => row.id === "cedar");
  const status = workflowStatus(state);
  const reports = [
    ...(cedar ? [{
      engagementId: cedar.id,
      supplier: cedar.supplier,
      service: cedar.service,
      status: state.decision?.outcome || status.label,
      date: state.decision
        ? formatDate(state.decision.at)
        : data.workspace.date,
      owner: state.decision?.actor || status.nextOwner,
      file: state.signedPack ? "Pack v1 · published" : "Draft / not signed",
      route: state.signedPack ? "C07" : "C06",
    }] : []),
    ...data.historicalReports,
  ].filter(
    (r) =>
      `${r.supplier} ${r.service}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (tab === "All" ||
        (tab === "Published"
          ? r.file.includes("published")
          : tab === "Decision required"
            ? r.engagementId === "cedar" && status.ready
            : r.file.includes("Historical"))),
  );
  return (
    <>
      <Tabs
        tabs={["All", "Published", "Decision required", "Historical"]}
        value={tab}
        onChange={setTab}
      />
      <div className="search-input full-search">
        <Icon name="Search" size={15} />
        <input
          aria-label="Search suppliers and report versions"
          placeholder="Search suppliers and report versions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card
        title="Decision library"
        action={
          <small className="muted">Historical versions remain accessible</small>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Engagement</th>
                <th>Decision state</th>
                <th>Last updated</th>
                <th>Customer signatory</th>
                <th>File status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.supplier}>
                  <td>
                    {r.supplier} · {r.service}
                  </td>
                  <td>
                    <Badge>{r.status}</Badge>
                  </td>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.owner}</td>
                  <td>{r.file}</td>
                  <td>
                    <Link
                      onClick={() => {
                        if (!r.engagementId) {
                          c.setDrawer(`historical:${r.supplier}`);
                          return;
                        }
                        c.update({ selected: r.engagementId });
                        navigate(r.route);
                      }}
                    >
                      {r.route === "C06" ? "Review" : "Open pack"} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!reports.length && (
            <div className="empty">No reports match this view.</div>
          )}
        </div>
        <Note>
          A draft cannot be described as approved or exported as a signed
          decision until the customer records an outcome.
        </Note>
      </Card>
    </>
  );
}

function Pack(c) {
  const { state, navigate, data } = c;
  const pack = state.signedPack || data.referencePack;
  const preview = !state.signedPack;
  const exportedPack = pack && { ...pack, preparedExample: preview, recordType: preview ? "Prepared reference example · not a current customer decision" : "Session customer decision" };
  return (
    <>
      <Scope {...c} />
      {!preview && pack && <div className={`outcome-receipt ${pack.decision.outcome === "Reject" ? "rejected" : "approved"}`} role="status"><Icon name={pack.decision.outcome === "Reject" ? "X" : "CircleCheck"} /><div><span className="case-kicker">CUSTOMER DECISION RECORDED</span><h2>{pack.decision.outcome === "Reject" ? "This service is not approved for use" : pack.decision.condition ? "Decision recorded. Your next obligation is clear." : "This service is approved without conditions"}</h2><p>{pack.engagement.supplier} · {pack.engagement.service}</p><Fields items={[["Recorded by", pack.decision.actor], ["Decision record", `Pack v${pack.version} · frozen`], ["Open approval conditions", pack.decision.condition && !state.conditionClosed ? "One evidence-backed obligation" : "None"]]} />
        {pack.decision.condition && <div className="next-obligation"><h3>{state.conditionClosed ? "Condition closed" : "Next obligation"}</h3><p>{pack.decision.condition.evidence}</p><Fields items={[["Owner", pack.decision.condition.owner], ["Due", formatDate(pack.decision.condition.due)]]} /><Button onClick={() => { c.update({ selected: pack.engagement.id }); navigate("C08"); }}>View the recovery condition →</Button></div>}
        {pack.decision.outcome === "Reject" && <p>The service is rejected. No active-assurance success route is offered.</p>}
      </div></div>}
      {preview && <>
        <div className="case-task-heading"><div><span className="case-kicker">CURRENT REVIEW AND PREPARED EXAMPLE</span><h2>An example is not your current record</h2><p>A prepared pack shows the reporting format. It does not assert that this service has been approved or signed.</p></div></div>
        <div className="case-two-pane prepared-pack-entry"><Card title="Continue the actual current review"><Badge>Your current review</Badge><h3>No customer decision has been recorded</h3><Fields items={[["Customer outcome", "Awaiting an explicit choice"], ["Current signed pack", "None"], ["Approval conditions", "Available after an applicable customer decision"]]} /><Button primary onClick={() => navigate("C06")}>Review the current recommendation</Button></Card><Card title="Explore a clearly separate example" className="prepared-example-card"><Badge>Prepared example · not your decision</Badge><div className="prepared-example-cover"><span>PREPARED REFERENCE EXAMPLE</span><h3>Illustrative Decision Pack</h3><p>Shows what a completed record will look like. Your current review and request status stay unchanged.</p></div><Button onClick={() => document.getElementById("prepared-pack-document")?.scrollIntoView({ behavior: "smooth" })}>View watermarked example ↓</Button><p className="case-session-note">Example exports carry the same watermark and sample provenance.</p></Card></div>
        <div className="case-callout"><b>Prepared example below · not your current customer record</b><p>Return to the current recommendation to record your own decision. This separate example does not change the case history.</p><Link onClick={() => navigate("C06")}>Return to the current review →</Link></div>
      </>}
      {!pack ? (
        <Card title="Decision Pack is not signed yet">
          <Note warning>
            The reference design shows the post-decision state. Record an
            authorised customer outcome to generate the frozen pack for this
            interactive demo.
          </Note>
          <Button primary onClick={() => navigate("C06")}>
            Review customer decision
          </Button>
        </Card>
      ) : (
        <div className={`case-two-pane pack-task-grid ${preview ? "prepared-pack-document" : ""}`} id={preview ? "prepared-pack-document" : "signed-pack-document"}>
          <Card title="Decision record">
            <article className={`signed-document ${preview ? "example-watermark" : ""}`}>
              <div className="pack-logo">
                OSURA <small>ASSURANCE</small>
              </div>
              <div className="accent-line" />
              {preview && <Note warning>PREPARED REFERENCE EXAMPLE · this is not a decision made in this session.</Note>}
              <div className="eyebrow">SUPPLIER RISK ASSESSMENT</div>
              <h1>{pack.engagement.supplier}</h1>
              <p>
                {pack.engagement.service} · {pack.workspace?.name || pack.engagement.client}
              </p>
              <Badge>{pack.decision.outcome.toUpperCase()}</Badge>
              <Fields
                items={[
                  [
                    "Signed by",
                    `${pack.decision.actor} · customer decision-maker`,
                  ],
                  ["Recorded", formatDate(pack.decision.at)],
                  ["CTP inherent risk", pack.engagement.risk],
                  ["Policy / review", `${pack.overlay} · ${pack.policy}`],
                  [
                    "Report version",
                    `Decision Pack v${pack.version} — immutable`,
                  ],
                ]}
              />
              <h3>Decision rationale</h3>
              <p>{pack.decision.rationale}</p>
              {pack.decision.condition && (
                <>
                  <h3>Condition and obligation</h3>
                  <Fields items={[["Owner", pack.decision.condition.owner], ["Due date", formatDate(pack.decision.condition.due)], ["Required evidence", pack.decision.condition.evidence]]} />
                </>
              )}
              <h3>Evidence index and conclusions</h3>
              {pack.requirements.map((r) => (
                <div className="pack-requirement" key={r.id}>
                  <b>
                    {r.id} · {r.name}
                  </b>
                  <Badge>
                    {r.id === "R-07" ? pack.conclusion : r.conclusion}
                  </Badge>
                  <p>
                    {r.source} · {r.proves}. Not proved: {r.doesNotProve}.
                  </p>
                </div>
              ))}
              <h3>Independent QA</h3>
              <p>
                {pack.qa} · {pack.qaReview?.actor || data.workspace.qaReviewer}
              </p>
              <p>{pack.qaNote}</p><p>{pack.qaReview && !pack.qaReview.prepared ? "Recorded independent QA" : "Prepared fixture QA"} · {pack.qaReview?.at ? formatDate(pack.qaReview.at) : "Reference date"}</p>
              <Note>
                Frozen synthetic preview · no production signature or live
                assurance claim.
              </Note>
            </article>
          </Card>
          <Card title={preview ? "Prepared example contents" : "Frozen pack contents"} className="pack-contents-card">
            <div className="pack-index">
              {[
                "01 · Executive decision",
                "02 · Requirements and evidence",
                "03 · Findings / conditions",
                "04 · Independent QA",
              ].map((item) => (
                <div className="list-row" key={item}>
                  <div>
                    <b>{item}</b>
                    <p>Risk rationale and customer authority</p>
                  </div>
                  <Badge>Included</Badge>
                </div>
              ))}
            </div>
            <Note>
              {preview ? "This prepared example is separate from your session review and is labelled as an example in print and JSON." : "This record is frozen from the current session’s review state. Subsequent condition closure leaves the original pack unchanged."}
            </Note>
            <div className="form-actions">
              <Button
                onClick={() => downloadJSON(preview ? "Prepared-Decision-Pack-example" : "Decision-Pack-v1", exportedPack)}
                icon="Download"
              >
                Download JSON
              </Button>
              <Button primary onClick={() => window.print()} icon="Printer">
                Print / Save PDF
              </Button>
            </div>
            {!preview && ["Approve", "Approve with conditions"].includes(pack.decision.outcome) && <Link onClick={() => { c.update({ selected: pack.engagement.id }); navigate("C08"); }}>Continue to active assurance →</Link>}
            {!preview && pack.decision.outcome === "Reject" && <Note>This service was rejected and has no active assurance relationship.</Note>}
          </Card>
        </div>
      )}
    </>
  );
}

function Monitoring(c) {
  const { screen, state, navigate, setDrawer, data } = c;
  const analyst = screen.role === "analyst";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const today = new Date(); today.setHours(0,0,0,0);
  const entries = [
    ...data.monitoring.map((row,i)=>({...row,id:`monitor-${i}`,engagementId:row.engagementId||data.engagements.find(e=>e.supplier===row.supplier&&e.client===row.client)?.id,proof:row.activity==="Recovery condition"?state.decision?.condition?.evidence||"Prepared recovery exercise proposal":"Review the scoped source and record the next step"})),
    ...(state.scheduledReviews||[]).map(row=>({...row,activity:row.title,status:"Scheduled",proof:row.description})),
    ...state.events.filter(row=>row.message.includes("Material change")).map(row=>({...row,supplier:data.engagements.find(e=>e.id===row.engagementId)?.supplier||"Service change",activity:row.message,date:row.at,status:"Needs triage",owner:row.actor,proof:row.rationale})),
  ].map(row=>({...row,days:Number.isFinite(Date.parse(row.date))?Math.ceil((Date.parse(row.date)-today.getTime())/86400000):null}));
  const openRows = entries.filter(row=>row.status!=="Closed"&&!/proposed|prepared/i.test(row.status));
  const dueNext = [...openRows].filter(row=>row.days!==null).sort((a,b)=>a.days-b.days)[0];
  const visible = entries.filter(row=>`${row.supplier} ${row.activity} ${row.owner}`.toLowerCase().includes(search.toLowerCase())&&(filter==="All"||filter==="Closed"&&row.status==="Closed"||filter==="Proposed"&&/proposed|prepared/i.test(row.status)||row.status!=="Closed"&&!/proposed|prepared/i.test(row.status)&&(filter==="Overdue"&&row.days!==null&&row.days<0||filter==="Due next"&&row.days!==null&&row.days>=0&&row.days<=30||filter==="Upcoming"&&(row.days===null||row.days>30))));
  const openEntry = row => {
    const engagement = data.engagements.find(e=>e.id===row.engagementId)||data.engagements.find(e=>e.supplier===row.supplier);
    if(!engagement)return;
    const finding = data.findings.find(f=>f.engagementId===engagement.id&&(row.activity==="Recovery condition"?f.id==="F-01":true));
    c.update({selected:engagement.id,selectedFinding:finding?.id||null});
    navigate(analyst?(row.activity==="Recovery condition"?"O09":row.route||"O12"):finding?"C12":"C09");
  };
  return <div className="op-monitoring-page">
    {!analyst&&<Scope {...c}/>}
    <section className="op-section-heading"><div><div className="eyebrow">ONGOING ASSURANCE</div><h2>Keep the next obligation visible</h2><p>The signed decision stays frozen. Conditions and scoped follow-up remain actionable.</p></div><Button onClick={()=>setDrawer(analyst?"review":"change")}>{analyst?"Schedule a review":"Report a service change"}</Button></section>
    <Card title={dueNext?"The next obligation or review":"No open scheduled obligation"} className="op-due-hero">{dueNext?<div className="op-due-content"><div><Badge>{dueNext.days<0?"Overdue":dueNext.status}</Badge><h2>{dueNext.activity} {dueNext.days<0?"was due":"is due"} {formatDate(dueNext.date)}</h2><p>{dueNext.supplier} · Owner: {dueNext.owner}</p><p><b>Required proof:</b> {dueNext.proof}</p></div><Button primary onClick={()=>openEntry(dueNext)}>View this {dueNext.activity==="Recovery condition"?"condition":"review"} →</Button></div>:<div className="op-due-content"><div><h2>No open conditions for this decision</h2><p>{state.decision?.outcome==="Reject"?"The service was rejected and has no active assurance relationship.":!state.decision?"Prepared proposals remain separate until a customer decision is recorded.":"Closed obligations remain in the history below."}</p></div><Icon name="CircleCheck" size={36}/></div>}</Card>
    <div className="op-metric-strip"><div><strong>{openRows.filter(row=>row.days!==null&&row.days<0).length}</strong><span>Overdue</span></div><div><strong>{openRows.filter(row=>row.days!==null&&row.days>=0&&row.days<=30).length}</strong><span>Due within 30 days</span></div><div><strong>{entries.filter(row=>row.status==="Closed").length}</strong><span>Closed</span></div><div><strong>{entries.filter(row=>/proposed|prepared/i.test(row.status)).length}</strong><span>Prepared proposals</span></div></div>
    <Tabs tabs={["All","Due next","Overdue","Upcoming","Closed","Proposed"]} value={filter} onChange={setFilter}/>
    <div className="op-search-bar"><Icon name="Search"/><input aria-label="Search obligations" placeholder="Search supplier, obligation or owner" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <Card title="Obligations and review dates" action={analyst?<Link onClick={()=>setDrawer("review")}>Schedule a review →</Link>:<Link onClick={()=>navigate("C12")}>View all conditions →</Link>}><div className="table-wrap"><table><thead><tr><th>Supplier / service</th><th>Task and required proof</th><th>Owner</th><th>Due</th><th>Status</th><th>Exact next step</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td><b>{row.supplier}</b><small className="cell-sub">{data.engagements.find(e=>e.id===row.engagementId)?.service||"Scoped programme activity"}</small></td><td><b>{row.activity}</b><small className="cell-sub">{row.proof}</small></td><td>{row.owner}</td><td>{formatDate(row.date)}</td><td><Badge>{row.status==="Closed"?"Closed":row.days!==null&&row.days<0&&!/proposed|prepared/i.test(row.status)?"Overdue":row.status}</Badge></td><td><Link onClick={()=>openEntry(row)}>View {row.supplier.split(" ")[0]} {row.activity==="Recovery condition"?"condition":"review"} →</Link></td></tr>)}</tbody></table></div>{!visible.length&&<div className="op-empty"><Icon name="CircleCheck" size={28}/><h3>No obligations in this view</h3><p>{filter} · “{search}”. This does not imply all programme work is complete.</p><Button onClick={()=>{setSearch("");setFilter("All");}}>Show all dates</Button></div>}</Card>
    <Card title="Decision and obligation history"><Timeline items={[[state.signedPack?"Customer outcome recorded":"No customer outcome recorded",state.signedPack?`${state.decision.outcome} · ${formatDate(state.decision.at)} · original pack frozen`:"Prepared proposals are not customer obligations",state.signedPack?"Signed":"Prepared"],...(state.events.filter(row=>/Condition|Material change|review scheduled/i.test(row.message)).map(row=>[row.message,`${formatDate(row.at)} · ${row.actor}`,"Recorded"]))]}/></Card>
  </div>;
}

function Operations(c) {
  const { data, navigate, state } = c;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [stage, setStage] = useState("All");
  const open = data.engagements.filter(row=>!["Active","Rejected"].includes(row.stage));
  const rows = filterEngagements(open,search,filter).filter(row=>stage==="All"||row.stage===stage);
  const reset = () => {setSearch("");setFilter("All");setStage("All");};
  const openCase = row => {c.update({selected:row.id});navigate("O02");};
  return <div className="op-work-page">
    <section className="op-section-heading"><div><div className="eyebrow">OSURA OPERATIONS · ASSIGNED WORK</div><h2>Focus on the next accountable action</h2><p>Exceptions, evidence and customer handoffs across your assigned customers.</p></div><Button onClick={()=>navigate("O11")}>View customer portfolios →</Button></section>
    <div className="op-metric-strip"><div><strong>{open.length}</strong><span>Open service reviews</span></div><div><strong>{open.filter(row=>row.stage==="Evidence").length}</strong><span>Evidence to review</span></div><div><strong>{open.filter(row=>row.stage==="QA").length}</strong><span>Independent QA</span></div><div><strong>{open.filter(row=>row.stage==="Decision").length}</strong><span>Customer decisions</span></div></div>
    <div className="op-work-layout"><Card title="My work" className="op-work-queue"><div className="op-search-bar"><Icon name="Search"/><input aria-label="Search assigned work" placeholder="Search customer, supplier or scoped service" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="op-inline-filters"><label>CTP inherent risk<select value={filter} onChange={e=>setFilter(e.target.value)}>{["All","Critical","High","Medium","Low"].map(v=><option key={v}>{v}</option>)}</select></label><label>Current stage<select value={stage} onChange={e=>setStage(e.target.value)}>{["All",...new Set(open.map(row=>row.stage))].map(v=><option key={v}>{v}</option>)}</select></label><Button small onClick={reset}>Clear filters</Button></div><div className="op-filter-summary">{rows.length} results · {filter==="All"?"All risk tiers":`${filter} CTP inherent risk`} · {stage==="All"?"All review stages":stage}{search&&` · “${search}”`}</div>
      {rows.length?<div className="op-queue-list">{rows.map(row=><article key={row.id} className="op-work-row"><div><small>{row.client}</small><h3>{row.supplier}</h3><p>{row.service}</p><div className="badges"><Badge>{row.risk}</Badge><Badge>{row.stage}</Badge></div></div><div className="op-work-attention"><b>{row.id==="cedar"?workflowStatus(state).label:data.operationsAttention[row.id]||"New request awaiting analyst triage"}</b><p>Next owner: {row.id==="cedar"?workflowStatus(state).nextOwner:row.owner}</p><small>Due {formatDate(row.due)}</small></div><Button small onClick={()=>openCase(row)}>Open {row.stage.toLowerCase()} →</Button></article>)}</div>:<div className="op-empty"><Icon name="Search" size={32}/><h3>No work matches these filters</h3><p>There are no matching records for {filter} risk and {stage} stage{search?` containing “${search}”`:""}. This does not mean all programme work is complete.</p><div><Button primary onClick={reset}>Clear filters</Button><Button onClick={reset}>Return to my assigned work</Button></div></div>}
    </Card><aside className="op-context-rail"><Card title="Delivery and handoffs"><div className="op-context-note"><h3>Waiting is a real state</h3><p>Supplier response, internal QA and customer decisions have different owners. A queued message is never a delivery receipt.</p></div>{data.operationsHandoffs.map(([title,detail,owner],i)=><button className="op-handoff" type="button" key={`${title}-${i}`} onClick={()=>{const row=data.engagements.find(e=>title.includes(e.supplier));if(row)openCase(row);}}><span className="op-step-number">{i+1}</span><span><b>{title}</b><small>{detail}</small><Badge>{owner}</Badge></span><Icon name="ArrowRight" size={15}/></button>)}<Button onClick={()=>navigate("O14")}>Review communications →</Button></Card><Card title="Independent human gates"><Fields items={[["Analyst","Records scoped evidence reasoning"],["Independent QA","Challenges another analyst’s work"],["Customer Decision Owner","Signs the final outcome"]]}/></Card></aside></div>
    <Card title="CTP inherent risk × review stage"><RiskGrid {...c}/></Card>
  </div>;
}

function Impact(c) {
  const { data, engagement, navigate } = c;
  return (
    <>
      <Scope {...c} />
      <Card>
        <div className="eyebrow">INHERENT RISK / CTP CORE V1</div>
        <h1 className="risk-heading">{engagement.risk}</h1>
        <p className="muted">
          As shown in the approved reference fixture. This UI preview does not
          recalculate CTP methodology.
        </p>
        <div className="badges">
          <Badge>Confidentiality: High</Badge>
          <Badge>Integrity: High</Badge>
          <Badge>Availability: High</Badge>
        </div>
      </Card>
      <div className="grid wide-left">
        <Card title="Nine triage facts · recorded">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CTP fact</th>
                  <th>Answer</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {data.triage.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.label}
                      <small className="cell-sub">{f.id}</small>
                    </td>
                    <td>
                      <Badge>{f.value}</Badge>
                    </td>
                    <td>Business owner · 31 Oct</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Routing effect">
          <Fields
            items={[
              ["CTP inherent risk", <Badge>{engagement.risk}</Badge>],
              ["Assessment route", engagement.plan],
              ["Control requirements", "Security, privacy and resilience"],
              ["Human gates", "Analyst + independent QA"],
              ["Decision authority", data.workspace.name],
            ]}
          />
          <Note>
            The assessment is pinned to the effective CTP and customer policy
            version. No synthetic tier override is applied by this demo.
          </Note>
          <Link onClick={() => navigate("O13")}>
            Inspect applicable controls →
          </Link>
        </Card>
      </div>
      <Card title="Business impact assessment · 17 answers">
        <div className="bia-grid">
          {Object.entries(data.bia).map(([title, answers]) => (
            <div key={title}>
              <h3>
                {title}
                <small>{answers.length} questions</small>
              </h3>
              {answers.map(([question, value]) => (
                <div className="bia-row" key={question}>
                  <span>{question}</span>
                  <Badge>{value}</Badge>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Inventory(c) {
  const { data, navigate, state } = c;
  const docs = data.documents;
  const evidence = evidenceSummary(data.requirements);
  return (
    <>
      {!c.embedded && (
        <>
          <Scope {...c} />
          <Stats
            items={[
              [docs.length, "Source versions"],
              [evidence.counts.Supported || 0, "Requirements supported"],
              [evidence.counts["Partially supported"] || 0, "Partial coverage"],
              [evidence.counts.Unknown || 0, "Unknown scope"],
              [evidence.counts["Needs review"] || 0, "Pending evidence review"],
            ]}
          />
        </>
      )}
      <div className="grid wide-left">
        <Card title="Documents and provenance">
          {docs.map((doc, i) => (
            <div className="list-row document-row" key={`${doc.name}-${i}`}>
              <span className="entity-icon">
                <Icon name="FileText" size={15} />
              </span>
              <div>
                <Link
                  onClick={() => {
                    c.update({
                      selectedRequirement: doc.requirement || "R-07",
                    });
                    navigate(c.screen.role === "customer" ? "C13" : "O04");
                  }}
                >
                  {doc.name}
                </Link>
                <p>
                  {doc.version} · {doc.page} · source retained
                </p>
              </div>
              <Badge>{doc.status}</Badge>
            </div>
          ))}
        </Card>
        <Card title="Collection routes">
          <div className="list-row">
            <div>
              <b>Reuse existing evidence</b>
              <p>Check approved versions and scope</p>
            </div>
            <Link onClick={() => navigate("O04")}>Review →</Link>
          </div>
          <div className="list-row">
            <div>
              <b>Supplier response</b>
              <p>Linked packet for the exact gaps</p>
            </div>
            <Badge>{state.supplierReceipt ? "Received" : "Awaiting"}</Badge>
          </div>
          <div className="list-row">
            <div>
              <b>Targeted public source</b>
              <p>No broad, unbounded public enumeration</p>
            </div>
            <Badge>Local fixture</Badge>
          </div>
          <Note>
            No request is a control approval. Failed extraction must remain
            visible.
          </Note>
        </Card>
      </div>
      <Card title="Control coverage">
        <Requirements {...c} />
      </Card>
    </>
  );
}

function FollowUp(c) {
  const { data, state, update, navigate } = c;
  const [recipient, setRecipient] = useState(
    state.requestRecipient || data.request.recipient,
  );
  const [message, setMessage] = useState(
    state.requestMessage || data.request.message,
  );
  return (
    <>
      <Scope {...c} />
      <div className="grid equal">
        <Card title="Unresolved requirements">
          {[...data.request.items, "Incident response procedure"].map(
            (item, i) => (
              <div className="list-row" key={item}>
                <div>
                  <b>{item}</b>
                  <p>
                    {i === 0
                      ? "Need a dated exercise covering the contracted payment service"
                      : i === 1
                        ? "Most recent scoped review, or accepted documented alternative"
                        : "Supported · no need to ask again"}
                  </p>
                </div>
                <Badge>{i < 2 ? "Included" : "Excluded"}</Badge>
              </div>
            ),
          )}
          <Note>
            Two requests, deduplicated across four material control questions.
            Existing valid proof is reused.
          </Note>
        </Card>
        <Card title="Supplier packet preview">
          <Entity
            name={data.defaults.supplierTeam}
            service={`Packet ${data.request.reference}`}
          />
          <Label title="Recipient">
            <input
              type="email"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                update({ requestRecipient: e.target.value });
              }}
            />
          </Label>
          <Fields
            items={[
              ["Due date", formatDate(data.request.due)],
              ["Requested requirements", 2],
              ["Messages", "1 consolidated request"],
            ]}
          />
          <Label title="Message">
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                update({ requestMessage: e.target.value });
              }}
            />
          </Label>
          <Button small onClick={() => navigate("S01")} icon="Eye">
            Preview supplier portal
          </Button>
          <Note>Outbox delivery is a local simulation. No email is sent.</Note>
        </Card>
      </div>
    </>
  );
}

function Communications(c) {
  const { state, navigate, data } = c;
  const [tab,setTab] = useState("All");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState(null);
  const threads = data.communications.map(row=>state.retries?.[row[0]]?[...row.slice(0,3),"Retry queued (local)","Session retry recorded",...row.slice(5)]:row[0]===data.request.reference?[...row.slice(0,3),state.requestStatus,...row.slice(4)]:row);
  const visible = threads.filter(row=>(tab==="All"||row[3].toLowerCase().includes(tab.toLowerCase()))&&row.join(" ").toLowerCase().includes(query.toLowerCase()));
  const thread = threads.find(row=>row[0]===selected)||visible[0];
  useEffect(() => {
    const record = thread && data.engagements.find(row => thread[1] === `${row.client} / ${row.supplier}`);
    if (record) c.update({ selected: record.id });
  }, [thread?.[0]]);
  const original = thread&&data.communications.find(row=>row[0]===thread[0]);
  const retry = thread&&state.retries?.[thread[0]];
  const cedar = thread?.[0]===data.request.reference;
  const retryThread = () => {
    if(!thread||state.retries?.[thread[0]])return;
    const at = new Date().toISOString();
    const engagement = data.engagements.find(row => thread[1].includes(row.supplier));
    const entry = actionEntry({ ...data, activeEngagementId: engagement?.id || data.activeEngagementId }, `Local retry queued: ${thread[0]}`, "Retry requested locally; delivery is not confirmed.", { packetReference: thread[0] });
    c.update({ retries: { ...state.retries, [thread[0]]: { at, actor: c.user.name } }, events: [...state.events, entry] });
    c.notify("Retry queued locally. Delivery is not confirmed; no external email was sent.");
  };
  return <div className="op-communications-page"><section className="op-section-heading"><div><div className="eyebrow">COMMUNICATIONS · SESSION OUTBOX</div><h2>Review the selected delivery attempt</h2><p>Read the current state beside the retained attempt history. External sending stays outside this prototype.</p></div><Badge>No external email</Badge></section>
    <div className="op-metric-strip"><div><strong>{threads.length}</strong><span>Scoped conversations</span></div><div><strong>{threads.filter(row=>/queued/i.test(row[3])).length}</strong><span>Queued locally</span></div><div><strong>{threads.filter(row=>/failed/i.test(row[3])).length}</strong><span>Failed fixtures</span></div><div><strong>{Object.keys(state.supplierReceipts||{}).length}</strong><span>Session item responses</span></div></div>
    <Tabs tabs={["All","Draft","Queued","Response received","Failed"]} value={tab} onChange={setTab}/>
    <div className="op-outbox-layout"><Card title="Outbox and supplier responses"><div className="op-search-bar"><Icon name="Search"/><input aria-label="Search communications" placeholder="Search packet, supplier or recipient" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="op-thread-list">{visible.map(row=><button type="button" key={row[0]} className={`op-thread-row ${thread?.[0]===row[0]?"is-selected":""}`} onClick={()=>setSelected(row[0])} aria-pressed={thread?.[0]===row[0]}><span className="op-file-icon"><Icon name={/failed/i.test(row[3])?"TriangleAlert":"MessageSquare"} size={22}/></span><span><small>{row[0]}</small><b>{row[1]}</b><p>{row[2]} · {row[5]}</p><small>{row[4]}</small></span><Badge>{row[3]}</Badge></button>)}</div>{!visible.length&&<div className="op-empty"><Icon name="MessageSquare" size={30}/><h3>No messages match this view</h3><p>{tab} · “{query}”. Changing the view never changes delivery status.</p><Button onClick={()=>{setTab("All");setQuery("");}}>Clear filters</Button><Button onClick={()=>navigate("O01")}>Return to assigned work</Button></div>}</Card>
    {thread&&<aside className="op-context-rail"><Card title="Selected conversation"><div className="op-selected-scope"><small>{thread[0]}</small><h3>{thread[1]}</h3><p>{thread[2]} · {thread[5]}</p><Badge>{thread[3]}</Badge></div><div className={`op-context-note ${/failed/i.test(thread[3])?"op-failure-note":""}`}><h3>{retry?"Retry requested; delivery unconfirmed":/failed/i.test(thread[3])?"Previous attempt failed":cedar&&state.supplierReceipt?"Supplier response received":"Current status is recorded"}</h3><p>{retry?"The retry request is recorded in this session. It is not a transport receipt.":/failed/i.test(thread[3])?"Review the recipient and scoped request before queueing a local retry. The failure remains in history.":"A communication status never changes an evidence conclusion or customer decision."}</p></div><ol className="op-numbered-timeline"><li><b>Request prepared</b><p>{original?.[4]||"Reference fixture"} · {thread[5]}</p><Badge>Recorded</Badge></li>{/failed/i.test(original?.[3]||"")&&<li><b>Delivery attempt failed</b><p>The original failed attempt is retained unchanged.</p><Badge>Failed · fixture</Badge></li>}{retry&&<li><b>Retry requested by {typeof retry==="object"?retry.actor:"an assigned analyst"}</b><p>{typeof retry==="object"?formatDate(retry.at):"This session"} · no external email sent</p><Badge>Retry queued (local)</Badge></li>}{cedar&&state.supplierReceipt&&<li><b>Supplier submitted a response</b><p>{state.supplierReceipt.reference} · {state.supplierReceipt.fileName||"Explanation received"}</p><Badge>Pending independent review</Badge></li>}</ol><div className="op-form-footer">{/failed/i.test(original?.[3]||"")&&<Button primary onClick={retryThread} disabled={Boolean(retry)}>{retry?"Retry queued":"Retry delivery"}</Button>}{cedar&&<Button onClick={()=>{c.update({selected:"cedar"});navigate(state.supplierReceipt?"O06":"O05");}}>{state.supplierReceipt?"Inspect changed response":"Review scoped packet"} →</Button>}</div><Note>No message is sent by this demo. Current queued state and retained failure history stay until refresh.</Note></Card></aside>}
    </div>
  </div>;
}

function Response(c) {
  const { state, navigate, data } = c;
  return (
    <>
      <Scope {...c} />
      {!state.supplierReceipt && <Note warning>Prepared supplier-response preview. No response has been received in this session. The reference file and answer below are separate examples.</Note>}
      <div className="grid wide-left">
        <Card title="Before and after">
          <div className="grid equal">
            <div>
              <div className="micro-label">BEFORE · BCP v2</div>
              <div className="list-row">
                <Icon name="FileText" />
                <b>{data.documents[0].name}</b>
                <Badge>Partially supported</Badge>
              </div>
              <p>
                Recovery target declared. Exercise coverage not demonstrated.
              </p>
            </div>
            <div>
              <div className="micro-label">
                NOW ·{" "}
                {state.supplierReceipt
                  ? "SUPPLIER RESPONSE"
                  : "REFERENCE EXAMPLE"}
              </div>
              <div className="list-row">
                <Icon name="FileText" />
                <b>
                  {state.supplierReceipt ? state.supplierReceipt.fileName || (state.supplierReceipt.responseType === "cannot-provide" ? "Cannot-provide explanation" : "Alternative evidence explanation") : data.referenceReceipt.fileName}
                </b>
                <Badge>Needs review</Badge>
              </div>
              <p>
                {state.supplierReceipt?.answer ||
                  "The prepared example names the payment processing service. Analyst validation is still required."}
              </p>
            </div>
          </div>
        </Card>
        <Card title="Re-verification scope">
          <Fields
            items={[
              ["Impacted control", "Resilience R-07"],
              [
                "Changed source",
                state.supplierReceipt ? state.supplierReceipt.fileName || (state.supplierReceipt.responseType === "cannot-provide" ? "Cannot-provide explanation" : "Alternative evidence explanation") : data.referenceReceipt.fileName,
              ],
              [
                "Source version",
                state.supplierReceipt
                  ? state.supplierReceipt.reference
                  : "v1 · prepared reference",
              ],
              ["Other controls", "Unchanged"],
              ["History", "Previous conclusion retained"],
            ]}
          />
          <Note warning>
            The new document does not automatically mark the requirement as
            supported. A reviewer must evaluate its scope and limitations.
          </Note>
          <Button primary small onClick={() => navigate("O04")}>
            Review changed evidence
          </Button>
        </Card>
      </div>
    </>
  );
}

function Quality(c) {
  const { state, event, notify, data } = c;
  const draft = state.qaDrafts?.[c.user.id] || { outcome: state.qa, note: state.qaNote };
  const { outcome, note } = draft;
  const editDraft = (patch) => { c.update({ qaDrafts: { ...state.qaDrafts, [c.user.id]: { ...draft, ...patch } } }); setError(""); };
  const status = workflowStatus(state);
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (
      outcome.startsWith("Passed") &&
      (state.conclusion === "Needs review" ||
        Object.values(state.pendingReviews || {}).some(Boolean))
    ) {
      setError(
        "Review the new supplier evidence and save an analyst conclusion before passing QA.",
      );
      return;
    }
    if (!note.trim()) {
      setError("Record the QA challenge and rationale.");
      return;
    }
    try {
      const qaDrafts = { ...state.qaDrafts }; delete qaDrafts[c.user.id];
      c.update({ ...recordQA(state, data, outcome, note.trim()), qaDrafts });
    }
    catch (error) { setError(error.message); return; }
    notify(
      outcome.startsWith("Passed")
        ? "QA outcome recorded. Customer decision is available."
        : "Returned to analyst for rework. Customer decision is blocked.",
    );
    setError("");
  };
  return (
    <>
      <Scope {...c} />
      <div className="case-task-heading"><div><span className="case-kicker">INDEPENDENT CHALLENGE</span><h2>Is the recommendation ready for the customer?</h2><p>Challenge the evidence and reasoning. QA confirms review readiness; the customer decides whether to proceed.</p></div></div>
      <div className={`case-readiness ${status.ready ? "ready" : "warning"}`}><Icon name={status.ready ? "CircleCheck" : "TriangleAlert"} /><div><b>{status.label}</b><p>Next owner: {status.nextOwner}. {status.stage === "Evidence" ? "The analyst must address the current evidence or QA challenge before QA can pass." : "Record your independent challenge and a reasoned QA outcome."}</p></div><Button onClick={() => c.navigate("O04")}>Inspect the analyst review</Button></div>
      <div className="case-gates">{[["Intake & scope", "Recorded"], ["Evidence review", status.stage === "Evidence" ? "Action needed" : "Current sources reviewed"], ["Independent QA", state.qa], ["Customer decision", state.decision ? "Recorded" : status.ready ? "Ready" : "Blocked"]].map(([label, detail], index) => <div className={`case-gate ${index === 0 || (index === 1 && status.stage !== "Evidence") || (index === 2 && status.ready) ? "done" : index === 2 ? "action" : "waiting"}`} key={label}><span><Icon name={index === 0 ? "CircleCheck" : "Circle"} />{label}</span><b>{detail}</b></div>)}</div>
      <Note>QA readiness: {status.label}. Next owner: {status.nextOwner}. Drafts stay in this session until refresh.</Note>
      <Note>{state.qaReview?.prepared ? "Prepared fixture QA" : "Latest QA"}: {state.qaReview?.actor || "Not recorded"} · {state.qaReview?.at ? formatDate(state.qaReview.at) : "No timestamp"}. Acting as {c.user?.name}; independent QA permission is required.</Note>
      <div className="case-two-pane qa-review-grid">
        <Card title="Evidence, reasoning and independent challenge" className="qa-challenge-card">
          <div className="list-row">
            <div>
              <b>Material claim</b>
              <p>Payment service recovery exercise coverage</p>
            </div>
            <Badge>Evidence support: {state.conclusion}</Badge>
          </div>
          <div className="list-row">
            <div>
              <b>Analyst conclusion</b>
              <p>
                {state.judgement ||
                  "Policy sets a target; test scope requires confirmation."}
              </p>
            </div>
            <Link onClick={() => c.navigate("O04")}>Inspect reasoning →</Link>
          </div>
          <div className="list-row">
            <div>
              <b>Evidence inspected</b>
              <p>{data.requirements.map(requirement => {
                const doc = requirement.sourceDocument || [...data.documents].reverse().find(row => row.requirement === requirement.id);
                return doc ? `${doc.name} · ${doc.version}` : requirement.source;
              }).join("; ")}</p>
            </div>
            <Link onClick={() => c.navigate("O03")}>View sources →</Link>
          </div>
          <Label title="Independent challenge">
            <textarea
              value={note}
              onChange={(e) => editDraft({ note: e.target.value })}
              form="qa-form"
              required
            />
          </Label>
        </Card>
        <Card title="Your QA outcome" className="qa-outcome-card">
          <form id="qa-form" onSubmit={submit}>
            <Fields
              items={[
                ["Lead analyst", data.workspace.analyst],
                ["Acting QA reviewer", c.user?.name || "Not selected"],
                ["QA permission", c.user?.canQA ? "Enabled" : "Not granted"],
                ["Customer decision-maker", "Northstar sponsor"],
                ["Release rule", "Different reviewer required"],
              ]}
            />
            <Label title="QA state">
              <select
                value={outcome}
                onChange={(e) => editDraft({ outcome: e.target.value })}
              >
                {!["Passed with condition", "Passed", "Rework requested", "More evidence required"].includes(outcome) && <option disabled>{outcome}</option>}
                <option>Passed with condition</option>
                <option>Passed</option>
                <option>Rework requested</option>
                <option>More evidence required</option>
              </select>
            </Label>
            <div className="choices">
              {[
                "Passed with condition",
                "Rework requested",
                "More evidence required",
              ].map((o) => (
                <button
                  type="button"
                  key={o}
                  className={outcome === o ? "chosen" : ""}
                  aria-pressed={outcome === o}
                  onClick={() => editDraft({ outcome: o })}
                >
                  {o === "Passed with condition"
                    ? "Accept with rationale"
                    : o === "Rework requested"
                      ? "Send back"
                      : "Request more evidence"}
                </button>
              ))}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Note>
              QA does not approve the supplier. It establishes whether the
              material recommendation is ready for customer consideration.
              Actors are illustrative in this UI preview.
            </Note>
            <div className={`review-save-state ${state.qaDrafts?.[c.user.id] ? "dirty" : state.qaReview?.prepared ? "" : "saved"}`} role="status"><Icon name={state.qaDrafts?.[c.user.id] ? "Circle" : "CircleCheck"} /><div><b>{state.qaDrafts?.[c.user.id] ? "Unsaved QA changes" : state.qaReview?.prepared ? "Prepared QA · no session action" : "QA outcome saved"}</b><small>{state.qaReview?.prepared ? "Record your own independent challenge." : `${state.qaReview?.actor} · ${formatDate(state.qaReview?.at)}`}</small></div></div>
            <div className="form-actions">
              <Button primary small type="submit">
                Record QA outcome
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

function Closure(c) {
  const { state, event, notify } = c;
  const draft = state.closureDrafts?.[c.user.id] || { decision: "Return for more proof", reason: state.closureReason || "" };
  const { decision, reason } = draft;
  const editDraft = (patch) => { c.update({ closureDrafts: { ...state.closureDrafts, [c.user.id]: { ...draft, ...patch } } }); setError(""); };
  const eligibleEvidence = closureEvidence(state);
  const eligible = Boolean(eligibleEvidence);
  const latestEvidence = [state.supplierReceipt, ...(state.uploads || []).filter(row => row.requirement === "R-07" || !row.requirement)]
    .filter(Boolean).sort((a, b) => Date.parse(b.at || b.receivedAt) - Date.parse(a.at || a.receivedAt))[0];
  const evidence = eligibleEvidence || latestEvidence;
  const review = state.reviews?.["R-07"];
  const reviewedVersion = evidence && review?.evidenceVersions?.includes(evidence.reference || evidence.version) &&
    Date.parse(review.at) >= Date.parse(evidence.at || evidence.receivedAt);
  const condition = state.signedPack?.decision.condition;
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!state.signedPack?.decision.condition) {
      setError(
        "Record a customer decision with a condition before closing it.",
      );
      return;
    }
    if (!reason.trim()) {
      setError("Enter reviewer reasoning.");
      return;
    }
    const closureDrafts = { ...state.closureDrafts }; delete closureDrafts[c.user.id];
    if (decision === "Verify closure") {
      try { c.update({ ...closeCondition(state, c.data, reason.trim()), closureDrafts }); }
      catch (error) { setError(error.message); return; }
    } else {
      event("Condition returned for more proof", { conditionClosed: false, closureReason: reason.trim(), closureDrafts });
    }
    notify(
      decision === "Verify closure"
        ? "Condition closed. Original signed pack remains unchanged."
        : "More proof requested; condition remains open.",
    );
    setError("");
  };
  return (
    <>
      <Scope {...c} />
      <div className="case-task-heading"><div><span className="case-kicker">EVIDENCE-BACKED FOLLOW-UP</span><h2>{state.conditionClosed ? "The condition has been closed" : "Review the condition and its proof"}</h2><p>Verify the evidence against the exact customer obligation. The original decision remains unchanged.</p></div></div>
      <div className={`case-readiness ${eligible || state.conditionClosed ? "ready" : "warning"}`}><Icon name={eligible || state.conditionClosed ? "CircleCheck" : "TriangleAlert"} /><div><b>{state.conditionClosed ? "Closure recorded" : eligible ? "New evidence is ready for closure review" : "Closure is waiting on newer reviewed evidence"}</b><p>{state.conditionClosed ? state.closureReason : `Next owner: ${eligible ? "Assigned analyst" : condition?.owner || "Customer Decision Owner"}. ${eligible ? "Confirm whether the reviewed source fulfils the obligation." : "Evidence must be received after the signed customer decision and independently assessed as Supported."}`}</p></div></div>
      {!eligible && !state.conditionClosed && <Note warning>Closure preview only. Record a conditional customer decision, then receive and independently review newer evidence before verifying closure. Evidence received before the decision cannot close its condition.</Note>}
      <div className="case-two-pane closure-task-grid">
        <Card title="The obligation and its evidence" className="closure-evidence-card">
          <div className="list-row">
            <div>
              <b>Customer condition</b>
              <p>{condition ? `${condition.evidence} · due ${formatDate(condition.due)}` : "Prepared example · no signed customer condition"}</p>
            </div>
            <Badge>{state.conditionClosed ? "Closed" : "Open"}</Badge>
          </div>
          <div className="list-row">
            <div>
              <b>{eligible ? "Evidence used for closure" : "Latest evidence received"}</b>
              <p>{evidence?.fileName || evidence?.name || "No new evidence submitted in this browser"}</p>
              {evidence && <Fields items={[
                ["Evidence version", evidence.reference || evidence.version],
                ["Received", formatDate(evidence.at || evidence.receivedAt)],
                ["Review", reviewedVersion ? `${review.actor || "Assigned analyst"} · ${formatDate(review.at)} · ${review.conclusion}` : "This version requires independent review"],
              ]} />}
            </div>
            <Badge>
              {eligible ? "Reviewed newer evidence" : evidence ? "Received · closure blocked" : "Awaiting evidence"}
            </Badge>
          </div>
          <div className="list-row">
            <div>
              <b>Requirement</b>
              <p>Exercise must cover payment event processing</p>
            </div>
            <Badge>Material</Badge>
          </div>
          <Label title="Reviewer reasoning">
            <textarea
              form="closure-form"
              value={reason}
              onChange={(e) => editDraft({ reason: e.target.value })}
              required
            />
          </Label>
        </Card>
        <Card title="Record the verification" className="closure-outcome-card">
          <form id="closure-form" onSubmit={submit}>
            <Fields
              items={[
                ["Finding", "R-07 · recovery exercise"],
                ["Owner", condition?.owner || "Prepared example"],
                ["Approval condition", condition ? "Recorded in signed pack v1" : "Not recorded"],
                ["Initial state", "Awaiting review"],
              ]}
            />
            <div className="choices">
              {["Verify closure", "Return for more proof"].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={decision === d ? "chosen" : ""}
                  aria-pressed={decision === d}
                  onClick={() => editDraft({ decision: d })}
                >
                  {d}
                </button>
              ))}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Note>
              Closing a condition changes current obligations only. The signed
              assessment and original decision pack remain immutable.
            </Note>
            <div className={`review-save-state ${state.closureDrafts?.[c.user.id] ? "dirty" : state.closureReason ? "saved" : ""}`} role="status"><Icon name={state.closureDrafts?.[c.user.id] ? "Circle" : "CircleCheck"} /><div><b>{state.closureDrafts?.[c.user.id] ? "Unsaved verification reasoning" : state.closureReason ? "Verification reasoning saved" : "No verification recorded"}</b><small>Current obligations change only after an explicit recorded verification.</small></div></div>
            <Button primary small type="submit" disabled={!condition || (decision === "Verify closure" && !eligible)}>
              Record verification
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}

function Programme(c) {
  const { screen, data, navigate } = c;
  const plans = screen.id === "O13";
  const [tab, setTab] = useState(plans ? "Plans" : "Programme");
  const tabs = plans
    ? ["Plans", "Control sets", "Evidence standards", "Publish history"]
    : [
        "Programme",
        "Assessment plans",
        "Control sets",
        "Review rules",
        "Communications",
        "Lifecycle",
      ];
  if (data.programmeTabs[tab])
    return (
      <>
        <Tabs
          tabs={tabs}
          value={tab}
          onChange={(t) => {
            setTab(t);
            if (t === "Assessment plans") navigate("O13");
          }}
        />
        <Card title={data.programmeTabs[tab].title}>
          <Fields items={data.programmeTabs[tab].rows} />
          <Note>
            Published reference configuration. Changes are drafted locally and
            do not rewrite existing assessments.
          </Note>
          {tab === "Control sets" && (
            <Button small onClick={() => navigate("O04")}>
              Inspect a control and evidence
            </Button>
          )}
        </Card>
      </>
    );
  return (
    <>
      <Tabs
        tabs={tabs}
        value={tab}
        onChange={(t) => {
          setTab(t);
          if (t === "Assessment plans") navigate("O13");
        }}
      />
      {plans ? (
        <>
          <div className="grid equal">
            {[
              [
                "Standard review",
                "Published v2",
                "Proportionate evidence-first review",
                "Baseline CTP-mapped controls",
                "Analyst acceptance · policy QA",
              ],
              [
                "Enhanced review",
                "Published v3",
                "Material service exposure",
                "Baseline + approved service overlays",
                "Scoped resilience, data protection, independent QA",
              ],
            ].map(([title, status, headline, line1, line2]) => (
              <Card key={title} title={title} action={<Badge>{status}</Badge>}>
                <h3>{headline}</h3>
                <p>{line1}</p>
                <p>{line2}</p>
                <Link onClick={() => c.setDrawer("plan")}>
                  Read full plan →
                </Link>
              </Card>
            ))}
          </div>
          <div className="grid wide-left">
            <Card
              title="Applicable requirements · Enhanced v3"
              action={
                <Link onClick={() => navigate("O04")}>
                  Inspect selected control →
                </Link>
              }
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Family</th>
                      <th>Requirement ID</th>
                      <th>Expectation</th>
                      <th>Applies when</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requirements.map((r) => (
                      <tr key={r.id}>
                        <td>{r.family}</td>
                        <td>{r.id}</td>
                        <td>{r.expectation}</td>
                        <td>
                          {r.id === "R-07"
                            ? "Critical service"
                            : "Material service"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Impact of plan selection">
              <Fields
                items={[
                  ["New CedarCloud review", "Enhanced v3"],
                  ["New Harbor Analytics review", "Standard v2"],
                  ["Historical decisions", "Unaffected"],
                  ["Control assessment", "Per service and published policy"],
                  [
                    "Supplier questions",
                    "Only genuine outstanding evidence gaps",
                  ],
                ]}
              />
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="grid wide-left">
            <Card
              title={`Published methodology and customer overlay${tab !== "Programme" ? ` · ${tab}` : ""}`}
            >
              <Fields
                items={[
                  [
                    "Authoritative methodology",
                    `${data.workspace.policy} · locked`,
                  ],
                  ["Customer programme", data.workspace.name],
                  [
                    "Effective customer overlay",
                    `${data.workspace.overlay} · published`,
                  ],
                  ["Next change", "Draft only · no retroactive impact"],
                  ["Approval authority", "Customer governance owner"],
                ]}
              />
              <Note>
                Changing an overlay must affect newly started reviews. Existing
                assessments and signed decisions retain their original effective
                versions.
              </Note>
            </Card>
            <Card title="Manage programme">
              {[
                [
                  "CTP routing and appetite",
                  "Nine triage facts, 17 BIA answers, thresholds",
                  "O12",
                ],
                [
                  "Assessment plans",
                  "Versioned applicability, controls and evidence depth",
                  "O13",
                ],
                [
                  "Control requirements",
                  "Service and evidence standards, governed publication",
                  "O13",
                ],
                [
                  "QA and decision rules",
                  "Independent reviewers and customer sign-off",
                  "O08",
                ],
                [
                  "Communications",
                  "Consent, templates, reminders and invitation scope",
                  "O14",
                ],
              ].map(([title, description, to]) => (
                <div className="list-row" key={title}>
                  <div>
                    <b>{title}</b>
                    <p>{description}</p>
                  </div>
                  <Link onClick={() => navigate(to)}>View →</Link>
                </div>
              ))}
            </Card>
          </div>
          <Card title="Policy consequence preview">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Business scope</th>
                    <th>Effective route</th>
                    <th>Review requirements</th>
                  </tr>
                </thead>
                <tbody>
                  {data.policyConsequences.map(
                    ([supplier, scope, plan, requirements]) => (
                      <tr key={supplier}>
                        <td>{supplier}</td>
                        <td>{scope}</td>
                        <td>
                          <Badge>{plan}</Badge>
                        </td>
                        <td>{requirements}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function ClientHealth(c) {
  const customers = [...new Set(c.data.engagements.map(row=>row.client))];
  return <>
    <div className="grid equal">{customers.map(customer=>{
      const rows=c.data.engagements.filter(row=>row.client===customer);
      return <Card key={customer} title={customer}><Fields items={[["Service engagements",rows.length],["Open reviews",rows.filter(row=>!["Active","Rejected"].includes(row.stage)).length],["Awaiting customer decision",rows.filter(row=>row.stage==="Decision").length]]}/></Card>;
    })}</div>
    <Note>Combined data for assigned customers. Use the Customer filter to narrow this view.</Note>
    <EngagementTable {...c} mode="analyst" title="Customer portfolio work" />
  </>;
}

function SupplierPortal(c) {
  const { screen, data, state, update, navigate, notify } = c;
  const item = state.supplierItem || data.request.items[0];
  const actualReceipt = state.supplierReceipts?.[item];
  const revising = state.supplierRevisionItem === item;
  const draftKey = revising ? `revision:${item}` : item;
  const draft = (!revising && actualReceipt) || state.supplierDrafts?.[draftKey] || { fileName: "", answer: "", scope: "", responseType: "evidence", changeReason: "" };
  const responseType = draft.responseType || "evidence";
  const history = state.supplierReceiptHistory?.[item] || (actualReceipt ? [actualReceipt] : []);
  const remainingItems = data.request.items.filter(name => !state.supplierReceipts?.[name]);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState({});
  const errorSummary = React.useRef(null);
  const errorTargets = { fileName: "supplier-file", answer: "supplier-answer", scope: "supplier-scope", changeReason: "supplier-change-reason" };
  const showError = message => { setError(message); requestAnimationFrame(() => errorSummary.current?.focus()); };
  const focusField = key => { const field = document.getElementById(errorTargets[key]); field?.focus(); field?.scrollIntoView({ block: "center", behavior: "smooth" }); };
  const [reviewing, setReviewing] = useState(false);
  const [version, setVersion] = useState(null);
  const receipt = history.find(row => row.reference === version) || actualReceipt;
  useEffect(() => { setReviewing(false); setError(""); setIssues({}); setVersion(null); }, [item, screen.id, revising]);
  const edit = patch => {
    if (actualReceipt && !revising) return;
    setError(""); setReviewing(false);
    setIssues(old => Object.fromEntries(Object.entries(old).filter(([key]) => !Object.hasOwn(patch,key))));
    update({ supplierDraft: { ...draft, ...patch }, supplierDrafts: { ...state.supplierDrafts, [draftKey]: { ...draft, ...patch } } });
  };
  const openItem = name => { update({ supplierItem: name, supplierRevisionItem: null }); navigate("S02"); };
  const beginRevision = () => {
    const values = { fileName: actualReceipt.fileName || "", answer: actualReceipt.answer, scope: actualReceipt.scope, responseType: actualReceipt.responseType || "evidence", changeReason: "" };
    update({ supplierRevisionItem: item, supplierDrafts: { ...state.supplierDrafts, [`revision:${item}`]: state.supplierDrafts?.[`revision:${item}`] || values } });
    navigate("S02");
  };
  const prepare = e => {
    e.preventDefault();
    const missing = {};
    if (responseType === "evidence" && !draft.fileName) missing.fileName = "Choose a file before submitting this item.";
    if (!draft.answer.trim()) missing.answer = "Describe service coverage, the alternative or why this evidence is unavailable.";
    if (!draft.scope) missing.scope = "Tell us whether this response covers the contracted service.";
    if (revising && !draft.changeReason?.trim()) missing.changeReason = "Explain what changed from the recorded response.";
    setIssues(missing);
    if (Object.keys(missing).length) { showError("Complete the highlighted fields before reviewing this item."); return; }
    setReviewing(true);
  };
  const submit = () => {
    try {
      const next = submitSupplier({ ...state, supplierDraft: draft }, item, data.request.items[0], { revision: revising });
      if (next.supplierReceipts?.[item] === actualReceipt) {
        setReviewing(false); showError("This is unchanged from the recorded response. No new version or receipt was created."); return;
      }
      const newReceipt = next.supplierReceipts[item];
      const entry = actionEntry(data, revising ? "Supplier response revised" : "Supplier response submitted", draft.answer, { requestItem: item, receiptReference: newReceipt.reference, responseType, supersedes: newReceipt.supersedes || null });
      update({ ...next, supplierRevisionItem: null, events: [...next.events, entry] });
      notify(`Response received · ${newReceipt.reference}. Pending independent review.`);
      navigate("S03");
    } catch (err) { setReviewing(false); showError(err.message); }
  };
  const progress = <Card title="Your two requested items"><ol className="op-item-progress">{data.request.items.map((name,i) => <li key={name} className={name===item?"is-current":""}><button type="button" onClick={()=>openItem(name)}><span className="op-step-number">{state.supplierReceipts?.[name]?"✓":i+1}</span><span><b>{name}</b><small>{name===item?"Current item · ":""}{state.supplierReceipts?.[name]?`Received · ${state.supplierReceipts[name].reference}`:state.supplierDrafts?.[name]?.answer?"Draft · not submitted":"Not submitted"}</small></span></button><Badge>{state.supplierReceipts?.[name]?"Received":name===item?"Draft":"Required"}</Badge></li>)}</ol><Fields items={[["Customer",data.workspace.name],["Service","Payment event processing"],["Due",formatDate(data.request.due)],["Request",data.request.reference]]}/><div className="op-context-note"><h3>Delivery is not verification</h3><p>The assurance team reviews each response. A receipt never marks a control Supported or approves a supplier.</p></div></Card>;
  const versionHistory = <Card title="Version and receipt history">{history.length ? <ol className="op-numbered-timeline">{history.map((row,i)=><li key={row.reference}><button type="button" className="op-history-choice" onClick={()=>setVersion(row.reference)}><b>{row.reference} · version {row.version || i+1}</b><p>{row.fileName || (row.responseType==="cannot-provide"?"Evidence unavailable · explanation received":"Alternative response")} · {formatDate(row.at)}</p><Badge>{row.reference===actualReceipt?.reference?"Latest received":"Retained · read only"}</Badge></button>{row.changeReason&&<p>What changed: {row.changeReason}</p>}</li>)}</ol>:<p>No response has been submitted for this item.</p>}<Note>Original receipts stay unchanged. Each revision is one new version of the same requested item, never another completed requirement.</Note></Card>;
  if (screen.id === "S01") return <div className="op-supplier-portal"><section className="op-request-banner"><div><div className="eyebrow">SCOPED SUPPLIER REQUEST</div><h2>Two items. One clear request.</h2><p>Provide the requested proof or explain what is available instead.</p></div><div className="op-progress-total"><strong>{data.request.items.length-remainingItems.length}<small> / {data.request.items.length}</small></strong><span>items responded to</span></div></section><div className="op-form-layout"><Card title="Items to provide">{data.request.items.map((name,i)=><article className="op-request-item" key={name}><div className="op-file-icon"><Icon name={state.supplierReceipts?.[name]?"CircleCheck":"FileText"} size={24}/></div><div><small>ITEM {i+1}</small><h3>{name}</h3><p>{i===0?"A dated exercise covering payment event processing. An evidenced test log may be offered as an alternative.":"A recent scoped privileged access review. A dated access export may be offered as an alternative."}</p><Badge>{state.supplierReceipts?.[name]?"Received · awaiting review":"Response required"}</Badge></div><Button small onClick={()=>openItem(name)}>{state.supplierReceipts?.[name]?"View submitted response":"Provide this item"} →</Button></article>)}<Note>Drafts and receipts stay in this session until refresh. File contents are never uploaded.</Note></Card>{progress}</div></div>;
  if (screen.id === "S03" && !receipt) return <div className="op-form-layout"><Card title="No receipt for this item"><h2>{item}</h2><p>This item has not been submitted in this session. Another item’s receipt does not confirm this response.</p><Button primary onClick={()=>navigate("S02")}>Provide this item</Button></Card>{progress}</div>;
  if (screen.id === "S03" || (actualReceipt && !revising)) return <div className="op-supplier-portal">
    <section className="op-success-hero"><span className="op-success-mark"><Icon name="Check" size={30}/></span><div><div className="eyebrow">SUPPLIER RECEIPT · {receipt.reference}</div><h2>{receipt.supersedes?"Revised response received":"This item has been recorded"}</h2><p>{item}</p><small>Your response is awaiting independent review. It has not been marked verified.</small></div><Badge>{receipt.reference===actualReceipt.reference?"Pending review":"Retained version"}</Badge></section>
    <div className="op-form-layout"><div><Card title="Your submitted response"><div className="op-large-file"><span className="op-file-icon"><Icon name="FileText" size={25}/></span><div><h3>{receipt.fileName || (receipt.responseType==="cannot-provide"?"Evidence unavailable · explanation received":"Alternative response received")}</h3><p>{receipt.reference} · version {receipt.version || 1} · {formatDate(receipt.at)}</p></div><Badge>Received</Badge></div><Fields items={[["Service coverage",receipt.scope],["Supplier answer",receipt.answer],["Response type",supplierResponseLabels[receipt.responseType || "evidence"]],...(receipt.changeReason?[["What changed",receipt.changeReason],["Replaces",receipt.supersedes]]:[]) ]}/><div className="op-context-note"><h3>Need to correct this response?</h3><p>Your original receipt and evidence stay unchanged. A revised submission creates a new version and receipt for review.</p><Button onClick={beginRevision}>Create a revised response →</Button></div></Card><Card title={remainingItems.length?`${remainingItems.length} item remains` : "All requested items have a response"}>{data.request.items.map(name=><div className="op-completion-row" key={name}><div><b>{name}</b><p>{state.supplierReceipts?.[name]?.reference || "A response is still required"}</p></div><Badge>{state.supplierReceipts?.[name]?"Received":"Not submitted"}</Badge>{!state.supplierReceipts?.[name]&&<Button small primary onClick={()=>openItem(name)}>Continue to this item →</Button>}</div>)}<Note>{remainingItems.length?"Your request is not complete yet. Each item has its own response and receipt.":"All responses are recorded. Independent evidence review is still required."}</Note><Link onClick={()=>navigate("S01")}>Return to all requested items →</Link></Card></div><aside>{versionHistory}<Card title="What happens next"><ol className="op-numbered-timeline"><li><b>Osura reviews this exact version</b><p>The service scope, source and limitations remain visible.</p></li><li><b>Further questions only when needed</b><p>No message transport is connected in this prototype.</p></li><li><b>The customer decides</b><p>A supplier receipt is never customer approval.</p></li></ol></Card></aside></div></div>;
  return <div className="op-supplier-portal"><div className="op-form-layout"><form id="supplier-form" onSubmit={prepare} noValidate><Card title={reviewing?"Review your response before submitting":revising?"Submit a revised response":item}>
    {revising&&<Note>The original {actualReceipt.reference} stays unchanged. This creates a new version for independent review.</Note>}
    {error&&<div ref={errorSummary} tabIndex={-1} className="op-error-summary" role="alert" aria-labelledby="supplier-error-title"><b id="supplier-error-title">Response not submitted</b><p>{error}</p>{Object.keys(issues).length>0&&<ul>{Object.entries(issues).map(([key,message])=><li key={key}><Link onClick={()=>focusField(key)}>{message}</Link></li>)}</ul>}</div>}
    {reviewing?<><Fields items={[["Requested item",item],["Service","Payment event processing"],["Response type",supplierResponseLabels[responseType]],["Document",draft.fileName || "No file · explanation only"],["Coverage",draft.scope],["Answer",draft.answer],...(revising?[["Original receipt",actualReceipt.reference],["What changed",draft.changeReason]]:[]) ]}/><Note>Confirming records this response only in the current session. It does not verify evidence or send an external message.</Note><div className="op-form-footer"><Button onClick={()=>setReviewing(false)}>Keep editing</Button><Button primary onClick={submit}>{revising?"Submit revised response":"Submit this item"} →</Button></div></>:<>
      <fieldset className="op-radio-group"><legend>How will you respond?</legend><div className="op-response-types">{[["evidence","Provide requested evidence"],["alternative","Offer an alternative or scoped question"],["cannot-provide","I cannot provide this evidence"]].map(([value,label])=><label className={`op-radio-row ${responseType===value?"is-selected":""}`} key={value}><input type="radio" name="response-type" checked={responseType===value} onChange={()=>edit({responseType:value,...(value==="cannot-provide"?{fileName:""}:{})})}/><span>{label}</span></label>)}</div></fieldset>
      {responseType!=="cannot-provide"&&<div className="field"><span>Evidence document · {responseType==="evidence"?"required":"optional alternative"}</span><label className={`op-upload ${issues.fileName?"has-error":""}`}><Icon name="Upload" size={28}/><b>{draft.fileName?"Choose a replacement document":"Choose a document"}</b><small>PDF, DOCX or TXT. Only the filename and your answer are saved.</small><input id="supplier-file" type="file" accept=".pdf,.docx,.txt" aria-label="Evidence document" aria-required={responseType==="evidence"} aria-invalid={Boolean(issues.fileName)} aria-describedby={issues.fileName?"supplier-file-error":undefined} onChange={e=>{const file=e.target.files?.[0];if(file&&!/\.(pdf|docx|txt)$/i.test(file.name)){edit({fileName:""});setIssues(old=>({...old,fileName:"Choose a PDF, DOCX or TXT file."}));showError("Choose a supported file before reviewing this item.");return;}if(file)edit({fileName:file.name});}}/></label>{draft.fileName&&<div className="op-large-file"><Icon name="FileText" size={22}/><div><b>{draft.fileName}</b><small>Selected · metadata only · not yet submitted</small></div><Button small onClick={()=>edit({fileName:""})}>Remove</Button></div>}{issues.fileName&&<p id="supplier-file-error" className="op-field-error">{issues.fileName}</p>}</div>}
      <Label title={responseType==="cannot-provide"?"Why is the evidence unavailable? · required":responseType==="alternative"?"Describe the alternative or scoped question · required":"What service does the evidence cover? · required"} hint="Describe the exact service, date, data and known limits."><textarea id="supplier-answer" aria-required="true" aria-describedby={issues.answer?"supplier-answer-error":undefined} value={draft.answer} onChange={e=>edit({answer:e.target.value})} aria-invalid={Boolean(issues.answer)} placeholder={responseType==="evidence"?"Describe the exercised service, environment and any remaining limits.":"Explain what is unavailable and what can be provided or clarified instead."}/></Label>{issues.answer&&<p id="supplier-answer-error" className="op-field-error">{issues.answer}</p>}
      <fieldset id="supplier-scope" tabIndex={-1} className="op-radio-group" role="radiogroup" aria-label="Contracted service coverage" aria-required="true" aria-invalid={Boolean(issues.scope)} aria-describedby={issues.scope?"supplier-scope-error":undefined}><legend>Does this cover the contracted service? · required</legend>{[["Covers this service","Yes, this service"],["Related service only","A related service only"],["Not sure","I am not sure"]].map(([value,label])=><label className={`op-radio-row ${draft.scope===value?"is-selected":""}`} key={value}><input type="radio" name="service-scope" checked={draft.scope===value} onChange={()=>edit({scope:value})}/><span>{label}</span></label>)}{issues.scope&&<p id="supplier-scope-error" className="op-field-error">{issues.scope}</p>}</fieldset>
      {revising&&<Label title="What changed? · required" hint="Explain the correction. The previous receipt remains read-only."><textarea id="supplier-change-reason" aria-required="true" aria-describedby={issues.changeReason?"supplier-change-reason-error":undefined} value={draft.changeReason || ""} onChange={e=>edit({changeReason:e.target.value})} aria-invalid={Boolean(issues.changeReason)}/>{issues.changeReason&&<small id="supplier-change-reason-error" className="op-field-error">{issues.changeReason}</small>}</Label>}
      {responseType!=="evidence"&&<Note warning>An explanation or alternative is a response, not proof. The requirement returns to independent review and is never automatically Supported.</Note>}
      <div className="op-form-footer"><span className="op-save-state"><Icon name="Check" size={14}/> Draft saved in this session</span><div>{revising&&<Button onClick={()=>{update({supplierRevisionItem:null});navigate("S03");}}>Keep original response</Button>}<Button primary type="submit">{revising?"Review revised response":"Review and submit this item"} →</Button></div></div>
    </>}
  </Card></form><aside className="op-context-rail">{progress}{revising&&versionHistory}</aside></div></div>;
}

function Dialog({ title, children, onClose, wide = false }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.showModal();
    return () => {
      old?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "data-dialog" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="dialog-header">
        <h2>{title}</h2>
        <button aria-label="Close dialog" onClick={onClose}>
          <Icon name="X" />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
function dialogTitle(kind) {
  if (kind.startsWith("historical:")) return "Historical decision reference";
  return (
    {
      screens: "Explore the demo",
      search: "Search your workspace",
      settings: "Demo settings",
      workspace: "Current access",
      notifications: "Your notifications",
      reset: "Reset interactive demo",
      source: "Exact source passage",
      owner: "Confirm business owner",
      upload: "Add evidence",
      finding: "Create finding",
      change: "Report a material change",
      review: "Schedule a review",
      policy: "Create policy draft",
      "policy-preview": "Policy effect preview",
      identity: "Supplier identity",
      thread: "Supplier correspondence",
      submitted: "Submitted response",
      completed: "Completed actions",
      "missing-fact": "Request a business fact",
      memo: "Decision memo",
      plan: "Published assessment plan",
    }[kind] || "Details"
  );
}
function FindingForm(c) {
  const { data, state, engagement, setDrawer } = c;
  const [draft, setDraft] = useState({ control: "", severity: "", owner: "", due: "", issue: "", evidence: "", source: "", closureEvidence: "" });
  const [review, setReview] = useState(false);
  const edit = (key, value) => setDraft({ ...draft, [key]: value });
  const requirement = data.requirements.find(r => r.id === draft.control);
  const sources = data.documents.filter(doc => doc.requirement === draft.control);
  if (engagement.id !== "cedar") return <><Entity name={engagement.supplier} service={engagement.service} /><Note>This portfolio preview has no applicable requirement records available for finding creation. Open a review with scoped requirements first.</Note><Button onClick={() => setDrawer(null)}>Return to findings</Button></>;
  const save = () => {
    c.event(`Finding recorded: ${draft.issue.trim()}`, { extraFindings: [...(state.extraFindings || []), { ...draft, issue: draft.issue.trim(), evidence: draft.evidence.trim(), owner: draft.owner.trim(), closureEvidence: draft.closureEvidence.trim(), id: `F-${crypto.randomUUID()}`, workspaceId: engagement.workspaceId, engagementId: engagement.id, client: engagement.client, supplier: engagement.supplier, service: engagement.service, state: "Open" }] });
    setDrawer(null); c.notify("Finding recorded with the reviewed attributes.");
  };
  return <div className="finding-form"><div className="finding-scope"><span className="eyebrow">PINNED SERVICE SCOPE</span><h3>{engagement.supplier} · {engagement.service}</h3><p>{engagement.client}</p></div>{review ? <><h3>Review this finding before recording it</h3><Fields items={[["Requirement", `${draft.control} · ${requirement.name}`], ["Finding severity", draft.severity], ["Accountable owner", draft.owner], ["Due date", formatDate(draft.due)], ["Unresolved issue", draft.issue], ["Evidence and rationale", draft.evidence], ["Exact source", draft.source], ["Closure proof", draft.closureEvidence || "Not specified"]]} /><Note>Recording a finding does not create a customer-approved condition or change CTP inherent risk.</Note><div className="form-actions"><Button onClick={() => setReview(false)}>Edit finding</Button><Button primary onClick={save}>Record finding</Button></div></> : <form onSubmit={e => { e.preventDefault(); const blank = [...e.currentTarget.querySelectorAll("input[required], textarea[required]")].find(el => !el.value.trim()); if (blank) { blank.setCustomValidity("Enter a non-blank value."); blank.reportValidity(); return; } setReview(true); }}>
    <div className="finding-form-grid"><Label title="Requirement (required)"><select required value={draft.control} onChange={e => setDraft({ ...draft, control: e.target.value, source: "" })}><option value="">Choose an applicable requirement</option>{data.requirements.map(r => <option key={r.id} value={r.id}>{r.id} · {r.name}</option>)}</select></Label><Label title="Finding severity (required)"><select required value={draft.severity} onChange={e => edit("severity", e.target.value)}><option value="">Choose a severity</option>{["High", "Medium", "Low"].map(v => <option key={v}>{v}</option>)}</select><small>Use approved programme guidance. This does not change the service’s CTP tier.</small></Label><Label title="Accountable owner (required)"><input required value={draft.owner} placeholder="Name the accountable owner" onChange={e => { e.target.setCustomValidity(""); edit("owner", e.target.value); }} /></Label><Label title="Due date (required)"><input type="date" required value={draft.due} onChange={e => edit("due", e.target.value)} /></Label></div>
    <Label title="What is the unresolved issue? (required)"><input required value={draft.issue} onChange={e => { e.target.setCustomValidity(""); edit("issue", e.target.value); }} /></Label><Label title="Evidence and rationale (required)"><textarea required value={draft.evidence} onChange={e => { e.target.setCustomValidity(""); edit("evidence", e.target.value); }} /></Label><Label title="Linked source version (required)"><select required value={draft.source} onChange={e => edit("source", e.target.value)}><option value="">Choose the exact source</option>{sources.map(doc => <option key={`${doc.name}-${doc.version}`} value={`${doc.name} · ${doc.version}`}>{doc.name} · {doc.version}</option>)}</select></Label>{requirement && <p className="definition-help">{requirement.source} · {requirement.doesNotProve}</p>}<Label title="What evidence would close this finding?"><textarea value={draft.closureEvidence} onChange={e => edit("closureEvidence", e.target.value)} /></Label><div className="form-actions"><Button onClick={() => setDrawer(null)}>Cancel</Button><Button primary type="submit">Review finding</Button></div>
  </form>}</div>;
}

function Drawer(c) {
  const { kind, data, state, navigate, notify, setDrawer } = c;
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(data.defaults.conditionDue);
  if (kind === "finding") return <FindingForm {...c} />;
  if (kind === "search") return <WorkspaceSearch {...c} />;
  if (kind === "screens")
    return (
      <>
        <div className="search-input full-search">
          <Icon name="Search" size={15} />
          <input
            autoFocus
            placeholder="Find a demo screen"
            aria-label="Search demo screens"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {[c.user?.role].filter(role => ["customer", "analyst", "supplier"].includes(role)).map((role) => (
          <div className="screen-group" key={role}>
            <h3>
              {role === "customer"
                ? "Customer workspace"
                : role === "analyst"
                  ? "Osura operations"
                  : "Supplier portal"}
            </h3>
            <div className="screen-links">
              {c.catalog.screens
                .filter(
                  (s) =>
                    s.role === role &&
                    `${s.label} ${s.id}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      c.update({ selected: s.previewEngagement || "cedar" });
                      navigate(s.id);
                    }}
                  >
                    <span>{s.id}</span>
                    {s.label}
                    <Icon name="ArrowUpRight" size={14} />
                  </button>
                ))}
            </div>
          </div>
        ))}
        {!c.catalog.screens.some(s => s.role === c.user?.role && `${s.label} ${s.id}`.toLowerCase().includes(query.toLowerCase())) && <p role="status">No demo screens match “{query}”. This searches screen names and IDs.</p>}
      </>
    );
  if (kind === "reset")
    return (
      <>
        <p>
          Clear the current walkthrough’s decisions and drafts. Team assignments, fixture edits and accountability history remain until refresh.
        </p>
        <div className="form-actions">
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button primary onClick={c.onReset}>
            Reset demo
          </Button>
        </div>
      </>
    );
  if (kind === "settings" || kind === "workspace")
    return (
      <>
        <Note>
          Interactive UI preview · synthetic data · session memory (resets on refresh) · no
          live AI, email, authentication or production integrations.
        </Note>
        <h3>Current access</h3><p>{c.user?.name} · {c.user?.role}. Demo identities can be selected only in the bottom toolbar.</p>
        <Fields
          items={[
            ["Data files", "/data/workspace.json · schema · presentation · examples"],
            ["Persistence", "This tab until refresh"],
            ["Policy values", "Prepared reference fixture · no risk engine"],
          ]}
        />
        <Button
          onClick={() => downloadJSON("osura-demo-state", state)}
          icon="Download"
        >
          Export saved demo state
        </Button>
      </>
    );
  if (kind === "source") {
    const r =
      data.requirements.find((r) => r.id === state.selectedRequirement) ||
      data.requirements[0];
    return (
      <>
        <Badge>Version pinned</Badge>
        <h3>{r.source}</h3>
        <div className="document">
          <h2>{r.name}</h2>
          <blockquote>{r.passage}</blockquote>
        </div>
        <Fields
          items={[
            ["File", r.sourceDocument?.name || r.source],
            ["Version", r.sourceDocument?.version || "Prepared excerpt"],
            ["Received / source date", formatDate(r.sourceDocument?.date)],
            ["What this proves", r.proves],
            ["Not established", r.doesNotProve],
            [
              "Provenance",
              "Synthetic reference excerpt · not an uploaded original PDF",
            ],
          ]}
        />
      </>
    );
  }
  if (kind === "notifications")
    return (
      <Timeline
        items={[
          ...data.notifications.map(row => /decision/i.test(row[0]) ? [workflowStatus(state).label, `CedarCloud · Next owner: ${workflowStatus(state).nextOwner}`, workflowStatus(state).ready ? "Ready" : "Review"] : row),
          ...state.events.map((e) => [
            e.message,
            formatDate(e.at),
            "Recorded",
          ]),
        ]}
        onClick={item => {
          const record = data.engagements.find(row => item.join(" ").includes(row.supplier));
          if (record) { c.update({ selected: record.id }); navigate("C09"); }
        }}
      />
    );
  if (kind === "submitted")
    return (
      state.supplierReceipts?.[state.supplierItem || data.request.items[0]] ?
      <Fields
        items={Object.entries(
          state.supplierReceipts[state.supplierItem || data.request.items[0]],
        ).map(([key, value]) => [key, String(value)])}
      /> : <Note>No response has been submitted for this item in this session.</Note>
    );
  if (
    kind === "thread" &&
    state.selectedThread?.[1] !== data.engagements[0].supplier &&
    state.selectedThread
  )
    return (
      <>
        <Entity
          name={state.selectedThread[1]}
          service={state.selectedThread[2]}
        />
        <Fields
          items={[
            ["Packet", state.selectedThread[0]],
            ["Delivery / response", state.selectedThread[3]],
            ["Last event", state.selectedThread[4]],
            ["Scope", state.selectedThread[5]],
          ]}
        />
        <Note>
          This is a separate correspondence reference. It contains no CedarCloud
          evidence or receipts.
        </Note>
      </>
    );
  if (kind === "thread")
    return (
      <>
        <Entity
          name={data.defaults.supplierTeam}
          service={data.request.recipient}
        />
        <p>{state.requestMessage || data.request.message}</p>
        <Badge>{state.requestStatus}</Badge>
        <div className="divider" />
        {state.supplierReceipt ? (
          <Fields
            items={[
              ["Reply", state.supplierReceipt.answer],
              ["Document", state.supplierReceipt.fileName],
              ["Receipt", state.supplierReceipt.reference],
            ]}
          />
        ) : (
          <Note>No new response submitted in this browser yet.</Note>
        )}
        <Button primary onClick={() => navigate("S01")}>
          Open supplier request
        </Button>
      </>
    );
  if (kind.startsWith("historical:"))
    return (
      <>
        <Badge>Historical reference</Badge>
        <h3>{kind.split(":")[1]}</h3>
        <p>
          This is a published record in the reference design. Use the CedarCloud
          walkthrough to create, open and export a signed demo pack from your
          own saved actions.
        </p>
        <Button primary onClick={() => navigate("C06")}>
          Open CedarCloud walkthrough
        </Button>
      </>
    );
  if (kind === "identity-candidate")
    return (
      <>
        <Fields
          items={Object.entries(state.identityCandidate || {}).map(
            ([key, value]) => [key, value],
          )}
        />
        <Note>
          This is a candidate legal-entity match. Service assurance and evidence
          conclusions are not transferred by identity confirmation.
        </Note>
        <Button
          primary
          onClick={() => {
            c.event(
              `Identity candidate reviewed: ${state.identityCandidate?.supplier}`,
            );
            setDrawer(null);
            notify("Candidate review recorded locally.");
          }}
        >
          Record review
        </Button>
      </>
    );
  if (kind === "identity")
    return (
      <>
        <Entity
          name={c.engagement.supplier}
          service={
            data.suppliers.find((s) => s.name === c.engagement.supplier)?.domain
          }
        />
        <Fields
          items={[
            ["Identity status", "Confirmed reference fixture"],
            ["Country", "United States"],
            ["Scope", "Entity identity is separate from service assurance"],
          ]}
        />
        <Note>
          Identity editing and real duplicate reconciliation are outside this
          clickable preview.
        </Note>
      </>
    );
  if (["policy-preview", "plan", "memo", "completed"].includes(kind))
    return (
      <>
        <Fields
          items={
            kind === "completed"
              ? [
                  ["Closed conditions", state.conditionClosed ? 1 : 0],
                  ["Published decisions", state.signedPack ? 1 : 0],
                ]
              : kind === "memo"
                ? [
                    ["Recommendation", state.reviews?.["R-07"]?.recommendation || "Prepared: Approve with conditions"],
                    ["Recommended by", state.reviews?.["R-07"]?.actor || "Prepared fixture"],
                    [
                      "Material issue",
                      "Recovery exercise scope remains partial",
                    ],
                    ["QA", state.qa],
                    ["Decision authority", data.workspace.name],
                  ]
                : [
                    ["Methodology", data.workspace.policy],
                    ["Customer overlay", data.workspace.overlay],
                    [
                      "CedarCloud",
                      "Enhanced v3 · scoped resilience · independent QA",
                    ],
                    ["Harbor Analytics", "Standard v2 · baseline evidence"],
                    ["Historical decisions", "Unaffected by future changes"],
                  ]
          }
        />
        <Note>
          Configuration is a synthetic, published reference. This UI does not
          alter approved policy or calculate a new CTP inherent risk.
        </Note>
      </>
    );
  if (kind === "upload")
    return (
      <>
        <UploadList
          files={state.uploads || []}
          removable={false}
          onChange={(uploads) => {
            let next = state;
            for (const file of uploads.filter(f => !(state.uploads || []).some(old => old === f))) {
              next = addEvidence(next, data, { ...file, page: "Not extracted", requirement: state.selectedRequirement || "R-07" });
            }
            c.update(next);
          }}
        />
        <Note>
          Only demo file metadata is stored. New documents remain unverified.
        </Note>
        <Button
          primary
          onClick={() => {
            setDrawer(null);
            notify("Evidence metadata saved. Review is required.");
          }}
        >
          Done
        </Button>
      </>
    );
  const labels = {
    owner: "Business owner",
    finding: "Finding title",
    change: "What changed?",
    review: "Review title",
    policy: "Draft policy name",
    "missing-fact": "Fact to request",
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const inputs = [...e.currentTarget.querySelectorAll("input[required], textarea[required]")];
        const blank = inputs.find(input => !input.value.trim());
        if (blank) { blank.setCustomValidity("Enter a non-blank value."); blank.reportValidity(); return; }
        const title = value.trim();
        const details = description.trim();
        const message =
          kind === "change"
            ? `Material change: ${title}`
            : kind === "owner"
              ? `Business owner confirmed: ${title}`
              : `${dialogTitle(kind)}: ${title}`;
        const patch = {};
        if (kind === "owner")
          patch.owners = { ...(state.owners || {}), [c.engagement.id]: title };
        if (kind === "review")
          patch.scheduledReviews = [
            ...(state.scheduledReviews || []),
            {
              id: `review-${crypto.randomUUID()}`,
              workspaceId: c.engagement.workspaceId,
              engagementId: c.engagement.id,
              client: c.engagement.client,
              supplier: c.engagement.supplier,
              title,
              description: details,
              date,
              owner: data.workspace.decisionOwner,
            },
          ];
        c.event(message, patch);
        setDrawer(null);
        notify(
          kind === "policy"
            ? "Policy draft saved locally; published policy is unchanged."
            : kind === "review"
              ? "Review scheduled in local activity."
              : `${dialogTitle(kind)} saved.`,
        );
      }}
    >
      <Label title={labels[kind] || "Title"}>
        <input
          required
          autoFocus
          value={value}
          onChange={(e) => { e.target.setCustomValidity(""); setValue(e.target.value); }}
        />
      </Label>
      {kind !== "owner" && (
        <>
          <Label title="Details / rationale">
            <textarea
              required
              value={description}
              onChange={(e) => { e.target.setCustomValidity(""); setDescription(e.target.value); }}
            />
          </Label>
          <Label title="Due / effective date">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Label>
        </>
      )}
      <Note>
        Saved in this tab until refresh. No message is sent
        externally.
      </Note>
      <div className="form-actions">
        <Button primary type="submit">
          Save{" "}
          {kind === "owner" ? "owner" : kind === "policy" ? "draft" : "record"}
        </Button>
      </div>
    </form>
  );
}

function downloadJSON(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
Promise.all(
  ["/data/workspace.json", "/data/presentation.json", "/data/examples.json", "/schemas/workspace.schema.json", "/data/screens.json"].map((url) =>
    fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Unable to load ${url}`);
      return r.json();
    }),
  ),
)
  .then(([initialModel, presentation, examples, schema, catalog]) => {
    const validate = createModelValidator(schema, presentation);
    validate(initialModel);
    if (!catalog.screens?.length) throw new Error("Invalid screen catalog");
    createRoot(document.getElementById("root")).render(
      <Demo {...{ initialModel, presentation, examples, schema, catalog, validate }} />,
    );
  })
  .catch((error) => {
    document.getElementById("root").textContent =
      `Demo could not load: ${error.message}. Check public/data and reload.`;
  });
