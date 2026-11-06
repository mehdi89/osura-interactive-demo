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
import DataEditor from "./DataEditor.jsx";
import RoleAdmin, { AuditTrail } from "./RoleAdmin.jsx";
import { sessionUser, scopeWorkspace, actionEntry } from "./access.mjs";
import { createModelValidator, projectWorkspace } from "./data-model.mjs";

const Icon = ({ name, size = 16, ...props }) => {
  const Component = Icons[name] || Icons.Circle;
  return <Component size={size} strokeWidth={1.65} {...props} />;
};
const Badge = ({ children }) => (
  <span
    className={`badge ${/critical|reject|failed|overdue/i.test(children) ? "red" : /high|partial|condition|waiting|due|review|open|draft/i.test(children) ? "amber" : /low|supported|active|approved|verified|received|completed|passed|closed|published|signed|yes/i.test(children) && !/unknown/i.test(children) ? "green" : /medium|evidence|decision|scheduled|findings|questions|included|queued/i.test(children) ? "blue" : "neutral"}`}
  >
    {children}
  </span>
);
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
      ? { name: receipt.fileName, version: receipt.reference, date: receipt.at, page: "Supplier response · no extraction" }
      : data.documents.find(doc => doc.requirement === requirement.id);
  return {
    ...requirement,
    sourceDocument,
    conclusion: state.pendingReviews?.[requirement.id] ? "Needs review" : state.reviews?.[requirement.id]?.conclusion || requirement.conclusion,
    ...(selected?.kind === "receipt" ? {
      source: `${selected.record.fileName} · ${selected.record.reference} · supplier response`,
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
      ...Object.entries(state.supplierReceipts || {}).map(
        ([item, receipt]) => ({
          name: receipt.fileName,
          status: state.pendingReviews?.[
            item === scopedData.request.items[0] ? "R-07" : "IAM-04"
          ]
            ? "Needs review"
            : "Reviewed",
          version: receipt.reference,
          page: "Supplier metadata · no extraction",
          date: receipt.at,
          requirement: item === scopedData.request.items[0] ? "R-07" : "IAM-04",
        }),
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
  const menuButton = React.useRef(null);
  const closeMobileNav = () => { setMobileNav(false); menuButton.current?.focus(); };
  const baseScreen = screenId === "A01" ? { id: "A01", role: "superadmin", title: "Team & customer access", label: "Administration", subtitle: "Manage analysts, customer assignments and accountability.", nav: "A01" }
    : catalog.screens.find((s) => s.id === screenId) || catalog.screens[0];
  const screen = baseScreen.id === "C06" ? { ...baseScreen, label: workflowStatus(state).label } : baseScreen;
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
  const navigate = (id) => {
    location.hash = id;
    setScreenId(id);
    setDrawer(null);
    setMobileNav(false);
    window.scrollTo(0, 0);
  };
  const notify = (text) => {
    setToast(text);
  };
  const update = (patch) => {
    const added = (patch.events || []).filter(row => !state.events.some(old => old.id === row.id));
    if (added.length) onAudit(added);
    setState(old => mergeWorkflowPatch(old, patch));
  };
  const event = (message, patch = {}) => {
    const entry = actionEntry(data, message, message);
    onAudit(entry);
    setState(old => mergeWorkflowPatch(old, { ...patch, events: [entry] }));
  };
  useEffect(() => {
    const handler = () => {
      setScreenId(location.hash.slice(1) || "C01");
      setDrawer(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
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
    "O07",
    "O08",
    "O09",
    "O12",
    "O14",
  ];
  const secondaryCase =
    engagement.id !== "cedar" && caseScreens.includes(screen.id);
  const action = secondaryCase || (role === "analyst" && screen.id === "C06") ? null : (
    primaryAction(screen.id, ctx)
  );
  return (
    <>
      {!isSupplier && (
        <aside className={`sidebar ${mobileNav ? "expanded" : ""}`}>
          <button className="mobile-nav-close" aria-label="Close navigation" onClick={closeMobileNav}><Icon name="X" /> Close navigation</button>
          <a href={`#${role === "superadmin" ? "A01" : role === "analyst" ? "O01" : "C01"}`} className="brand">
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
                onClick={() => setMobileNav(false)}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button onClick={() => setDrawer("search")}>
              <Icon name="Search" />
              Find a demo screen <kbd>⌘ K</kbd>
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
            </>
          )}
          <div className="topbar-end">
            {role === "analyst" && <label className="customer-filter">Customer <select id="customer-filter" aria-label="Customer filter" value={customerFilter} onChange={e=>{setCustomerFilter(e.target.value);setDrawer(null);}}><option value="all">All assigned customers</option>{model.workspaces.filter(row=>user.workspaceIds.includes(row.id)).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}

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
                  ? "Upload access review evidence"
                  : screen.id === "C08" && engagement.id === "cedar" ? state.decision?.outcome === "Reject" ? "Rejected service · review history" : state.decision ? "Active supplier assurance" : "Assurance preview · no customer decision" : text(screen.title)}
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
      <div className="demo-toolbar">
        <span className="demo-dot" />
        <b title="All changes reset on refresh">Demo · until refresh</b>
        <select aria-label="Demo user" value={identity} onChange={e => {
          const nextId = e.target.value;
          const nextRole = nextId === "supplier-contact" ? "supplier" : sessionUser(model, nextId)?.role;
          onSwitch(nextId); setCustomerFilter("all"); update({ selected: "cedar" });
          navigate({ customer: "C01", analyst: "O01", superadmin: "A01", supplier: "S01" }[nextRole] || "C01");
        }}>
          {model.users.map(row=><option key={row.id} value={row.id} disabled={!row.active}>{row.role === "superadmin" ? "Superadmin" : row.role === "analyst" ? "Analyst" : "Customer"} · {sessionUser(model,row.id).name}{!row.active ? " (inactive)" : ""}</option>)}
          <option value="supplier-contact">Supplier · CedarCloud contact</option>
        </select>
        <button onClick={() => setDrawer("screens")}>
          <Icon name="PanelsTopLeft" size={13} />
          {screen.id}
          <span className="toolbar-extra"> · My screens</span>
        </button>
        {role === "superadmin" && <button onClick={() => setDrawer("data")}><Icon name="Folder" size={14} /> Demo data</button>}
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
              setState({ ...createState(baseData), assessmentRevision: nextRevision });
              navigate({customer:"C01",analyst:"O01",superadmin:"A01",supplier:"S01"}[role]);
              notify("Walkthrough reset. Fixture edits remain until refresh.");
            }}
          />)}
        </Dialog>
      )}
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
      <div className="table-wrap">
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
      "O07",
      "O08",
      "O09",
      "O12",
      "O14",
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
  const customerActions = data.overviewActions.filter(action => action.engagement === "cedar" ? status.ready : !state.owners?.[action.engagement]);
  return (
    <>
      <Card title="Evidence reviewed. Your team decides.">
        <p>Osura reviews supplier evidence and prepares a clear recommendation. Your team makes the final decision.</p>
        <Note>CTP inherent risk describes the service’s exposure before assurance work. Evidence support, independent QA and the customer outcome are separate.</Note>
        {data.engagements.some(row => row.id === "cedar") && <p><b>Prepared CedarCloud example:</b> {status.label}. Next owner: {status.nextOwner}. <Link onClick={() => { c.update({ selected: "cedar" }); navigate(state.decision ? "C07" : "C09"); }}>View example review →</Link></p>}
      </Card>
      <Stats
        items={[
          [
            new Set(data.engagements.map((e) => e.supplier)).size,
            "Suppliers",
            `${data.engagements.length} distinct service engagements`,
          ],
          [
            data.engagements.filter(
              (e) => !["Active", "Rejected"].includes(e.stage),
            ).length,
            "Active assessments",
            status.ready ? "CedarCloud decision ready" : status.label,
          ],
          [
            data.engagements.filter((e) =>
              ["High", "Critical"].includes(e.risk),
            ).length,
            "High / Critical exposures",
            `Across ${data.engagements.filter((e) => ["High", "Critical"].includes(e.risk)).length} engagements`,
          ],
          [
            customerActions.length,
            "Actions for your team",
            `${customerActions.filter(action => action.engagement === "cedar").length} decision ready · ${customerActions.filter(action => action.engagement !== "cedar").length} business follow-up`,
          ],
        ]}
      />
      <div className="grid overview-top">
        <Card
          title="Your actions"
          action={<Link onClick={() => navigate("C15")}>All actions →</Link>}
        >
          {customerActions.map((action) => (
            <div className="action-row" key={action.engagement}>
              <div>
                <b>{action.engagement === "cedar" ? status.label : action.title}</b>
                <p>
                  {action.engagement === "cedar" ? `Next owner: ${status.nextOwner}. ${status.label}.` : action.engagement === "atlas" && state.owners?.atlas
                    ? `Business owner: ${state.owners.atlas}`
                    : action.detail}
                </p>
              </div>
              <Badge>{action.engagement === "cedar" ? status.label : action.status}</Badge>
              {action.route ? (
                <Button
                  small
                  icon="ArrowRight"
                  onClick={() => {
                    c.update({ selected: action.engagement });
                    navigate(
                      action.engagement === "cedar" && state.decision
                        ? "C07"
                        : action.route,
                    );
                  }}
                >
                  {action.engagement === "cedar" && state.decision
                    ? "Open decision"
                    : action.action}
                </Button>
              ) : (
                <Link onClick={() => { c.update({ selected: action.engagement }); setDrawer(action.dialog); }}>
                  {action.action} →
                </Link>
              )}
            </div>
          ))}
          {!customerActions.length && <Note>No customer action is currently required. Review status and next ownership are shown in the prepared example above.</Note>}
        </Card>
        <Card
          title="Engagement exposure"
          action={
            <Link onClick={() => navigate("C10")}>Explore risk by stage →</Link>
          }
        >
          <Ring data={data} />
          <Note>
            CTP inherent risk values are prepared fixtures for each service, using the pinned CTP method; this prototype does not calculate risk. {" "}
            {data.engagements.length} engagements,{" "}
            {new Set(data.engagements.map((e) => e.supplier)).size} suppliers.
          </Note>
        </Card>
      </div>
      <div className="grid equal">
        <Card
          title="Assessment activity"
          action={
            <Link onClick={() => navigate("C15")}>Assessment register →</Link>
          }
        >
          <div className="activity">
            {data.assessmentActivity
              .map((item) => [
                item.label,
                data.engagements.filter((e) => e.stage === item.stage).length,
                item.detail,
              ])
              .map(([label, value, detail]) => (
                <button key={label} onClick={() => navigate("C15")}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{detail}</small>
                </button>
              ))}
          </div>
        </Card>
        <Card
          title="Upcoming assurance"
          action={
            <Link onClick={() => navigate("C08")}>Monitoring plan →</Link>
          }
        >
          <Timeline
            items={data.upcomingAssurance}
            onClick={item => {
              const record = data.engagements.find(row => item[1].includes(row.supplier));
              if (record) { c.update({ selected: record.id }); navigate("C08"); }
            }}
          />
        </Card>
      </div>
      <EngagementTable
        {...c}
        rows={data.engagements.slice(0, 6)}
        action={
          <Link onClick={() => navigate("C14")}>Full supplier register →</Link>
        }
      />
    </>
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [tab, setTab] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const baseRows =
    screen.id === "O16"
      ? tab === "Engagements"
        ? [
            ...data.engagements,
            ...data.directory.filter((e) => !data.engagements.some(row => row.id === e.id)),
          ]
        : data.directory
      : screen.id === "C15"
          ? data.engagements.filter((e) =>
              tab === "Approved" ? e.stage === "Active" : !["Active", "Rejected"].includes(e.stage),
            )
          : data.engagements;
  let rows = filterEngagements(baseRows, search, filter).filter(
    (e) => stageFilter === "All" || e.stage === stageFilter,
  );
  if (tab === "Approved") rows = rows.filter((e) => e.stage === "Active");
  if (tab === "Needs attention")
    rows = rows.filter((e) => !["Active", "Rejected"].includes(e.stage));
  if (screen.id === "C14") rows = filterSupplierServices(data.engagements, search, filter, tab, stageFilter);
  const supplier = screen.id === "C14",
    risk = screen.id === "C10",
    directory = screen.id === "O16";
  return (
    <>
      {!directory && (
        <Stats
          items={
            supplier
              ? [
                  [
                    new Set(data.engagements.map((e) => e.supplier)).size,
                    "Supplier entities",
                  ],
                  [data.engagements.length, "Service engagements"],
                  [
                    data.engagements.filter(
                      (e) => !["Active", "Rejected"].includes(e.stage),
                    ).length,
                    "Reviews in progress",
                  ],
                  [
                    data.engagements.filter((e) => e.stage === "Active").length,
                    "Approved relationships",
                  ],
                ]
              : risk
                ? [
                    [
                      data.engagements.filter((e) => e.risk === "Critical")
                        .length,
                      "Critical engagement",
                    ],
                    [
                      data.engagements.filter((e) => e.risk === "High").length,
                      "High engagements",
                    ],
                    [
                      data.engagements.filter(
                        (e) => !["Active", "Rejected"].includes(e.stage),
                      ).length,
                      "Active reviews",
                    ],
                    [
                      data.engagements.filter(
                        (e) => e.risk === "Pending triage",
                      ).length,
                      "Unclassified engagements",
                    ],
                  ]
                : [
                    [
                      data.engagements.filter(
                        (e) => !["Active", "Rejected"].includes(e.stage),
                      ).length,
                      "Open assessments",
                    ],
                    [2, "Waiting on supplier"],
                    [
                      data.engagements.filter((e) => e.stage === "Decision")
                        .length,
                      "Decision with customer",
                    ],
                    [
                      data.engagements.filter((e) =>
                        ["Active", "Rejected"].includes(e.stage),
                      ).length,
                      "Completed and pinned",
                    ],
                  ]
          }
        />
      )}
      {risk && (
        <div className="grid equal">
          <Card title="Reviews by risk and stage">
            <RiskGrid
              {...c}
              onFilter={(risk, stage) => {
                setFilter(risk);
                setStageFilter(stage);
              }}
            />
          </Card>
          <Card title="CTP inherent risk across services">
            <Ring data={data} />
          </Card>
        </div>
      )}
      {!risk && (
        <Tabs
          tabs={
            supplier
              ? ["All", "Needs attention", "Approved"]
              : directory
                ? ["All", "Engagements", "Services", "Identity matches"]
                : ["All", "Needs attention", "Approved"]
          }
          value={tab}
          onChange={setTab}
        />
      )}
      {risk && stageFilter !== "All" && (
        <Note>
          Showing {filter} · {stageFilter} reviews.{" "}
          <Link
            onClick={() => {
              setFilter("All");
              setStageFilter("All");
            }}
          >
            Clear selection
          </Link>
        </Note>
      )}
      {!(directory && ["Services", "Identity matches"].includes(tab)) && <Filters
        {...{ search, setSearch, filter, setFilter }}
        options={
          directory
            ? ["All", ...new Set(data.directory.map((e) => e.client))]
            : undefined
        }
      />}
      {directory && ["Services", "Identity matches"].includes(tab) ? (
        <DirectoryDetails {...c} tab={tab} />
      ) : (
        <EngagementTable
          {...c}
          rows={rows}
          register={supplier}
          assessment={screen.id === "C15"}
          mode={directory ? "directory" : "customer"}
          title={
            directory
              ? "Cross-client directory"
              : supplier
                ? "Supplier register"
                : risk
                  ? "Relevant reviews"
                  : "Review register"
          }
        />
      )}
      {tab === "Identity matches" && (
        <Note>
          Supplier identity is confirmed by domain. Reconcile candidates before
          reusing evidence across services.
        </Note>
      )}
      {!risk && !directory && (
        <div className="summary-lines">
          <Fields
            items={
              supplier
                ? [
                    ["Identity and duplication", "Confirmed or flagged"],
                    [
                      "Service-specific risk",
                      "No universal supplier risk score",
                    ],
                    [
                      "Opening a supplier",
                      "Legal entity + Services + Reviews + Evidence + Decisions",
                    ],
                  ]
                : [
                    [
                      "Progress is state-based",
                      "No decorative completion percentages",
                    ],
                    [
                      "View history",
                      "Past reviews and signed packs stay pinned",
                    ],
                    [
                      "Review detail",
                      "CTP + Controls + Sources + Findings + QA + Decision",
                    ],
                  ]
            }
          />
        </div>
      )}
    </>
  );
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
  if (tab === "Identity matches")
    return (
      <Card title="Supplier identity candidates">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Domain</th>
                <th>Legal entity candidate</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.directoryIdentity.map((row) => (
                <tr key={row.supplier}>
                  <td>{row.supplier}</td>
                  <td>{row.domain}</td>
                  <td>{row.candidate}</td>
                  <td>
                    <Badge>{row.status}</Badge>
                  </td>
                  <td>
                    <Link
                      onClick={() => {
                        const record = data.engagements.find(record => record.supplier === row.supplier);
                        if (!record) {
                          c.notify("No accessible assessment is available for this identity candidate.");
                          return;
                        }
                        update({ selected: record.id, identityCandidate: row });
                        setDrawer("identity-candidate");
                      }}
                    >
                      Inspect match →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  return (
    <Card title="Service scopes across authorised clients">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Supplier</th>
              <th>Client</th>
              <th>CTP inherent risk</th>
              <th>Review state</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...data.engagements,
              ...data.directory.filter((e) => !data.engagements.some(row => row.id === e.id)),
            ].map((row) => (
              <tr key={row.id}>
                <td>{row.service}</td>
                <td>{row.supplier}</td>
                <td>{row.client}</td>
                <td>
                  <Badge>{row.risk}</Badge>
                </td>
                <td>
                  <Badge>{row.stage}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        Each service is assessed independently, even when its supplier has
        another approved relationship.
      </Note>
    </Card>
  );
}

function SupplierRecord(c) {
  const { engagement, data, navigate } = c;
  const [tab, setTab] = useState("Services");
  const rows = data.engagements.filter(
    (e) => e.supplier === engagement.supplier,
  );
  return (
    <>
      <div className="supplier-banner">
        <Entity name={engagement.supplier} service="Legal entity · confirmed" />
        <Badge>{rows.some(row => row.stage === "Active") ? "Active service relationship" : "No approved service relationship"}</Badge>
        <span>
          {rows.length} service {rows.length === 1 ? "scope" : "scopes"}
        </span>
      </div>
      <Tabs
        tabs={[
          "Overview",
          "Services",
          "Assessments",
          "Evidence",
          "Findings",
          "Decisions",
          "Monitoring",
        ]}
        value={tab}
        onChange={setTab}
      />
      {["Overview", "Services", "Assessments"].includes(tab) ? (
        <div className="grid wide-left">
          <EngagementTable
            {...c}
            rows={rows}
            title="Services and risk are assessed independently"
            action={<Link onClick={() => navigate("C02")}>+ Add service</Link>}
          />
          <Card title="Supplier identity and stewardship">
            <Fields
              items={[
                [
                  "Entity / domain",
                  `${engagement.supplier} · ${data.suppliers.find((s) => s.name === engagement.supplier)?.domain || "confirmed"}`,
                ],
                ["Country", "United States"],
                ["Primary business owner", engagement.owner],
                ["Services", rows.length],
                ["Identity confidence", <Badge>Confirmed</Badge>],
              ]}
            />
            <Link onClick={() => c.setDrawer("identity")}>Edit profile →</Link>
          </Card>
        </div>
      ) : engagement.id !== "cedar" ? (
        <SecondaryCase {...c} />
      ) : tab === "Evidence" ? (
        <Card title="Service-scoped conclusions">
          <Requirements {...c} customer />
        </Card>
      ) : tab === "Findings" ? (
        <Findings {...c} />
      ) : tab === "Decisions" ? (
        <Reports {...c} />
      ) : (
        <Monitoring {...c} />
      )}
      <div className="grid equal">
        <Card title="Shared evidence candidates">
          <div className="list-row">
            <div>
              <b>SOC 2 report · current version</b>
              <p>
                Candidate for other engagements; applicability must be checked
              </p>
            </div>
            <Button small onClick={() => navigate("C13")}>
              Review scope
            </Button>
          </div>
          <div className="list-row">
            <div>
              <b>Data-processing terms</b>
              <p>Valid for current service only</p>
            </div>
            <Badge>Pinned</Badge>
          </div>
          <Note>
            A document can be reused. A control conclusion cannot be copied to
            another service without checking applicability.
          </Note>
        </Card>
        <Card title="Relationship history">
          <Timeline
            items={data.relationshipHistory}
            onClick={() => navigate("C16")}
          />
        </Card>
      </div>
    </>
  );
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
    if (step === 1 && !intake.use && !intake.purpose.trim()) {
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
      : !intake.use && !intake.purpose.trim()
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
          service: intake.use || intake.purpose.trim(),
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
    <>
      <div className="stepper intake-steps">
        {["Supplier", "Intended use", "Business context", "Review"].map(
          (label, i) => (
            <button
              key={label}
              aria-current={i === step ? "step" : undefined}
              className={i === step ? "current" : i < step ? "done" : ""}
              onClick={() => {
                if (i <= step) navigate(["C02", "C03", "C04", "C05"][i]);
              }}
              disabled={i > step}
            >
              {i + 1}. {label}
            </button>
          ),
        )}
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <form id="intake-form" onSubmit={submit}>
        <div className={`grid ${step === 2 ? "wide-left" : "intake-grid"}`}>
          <Card
            title={
              [
                "Find the supplier",
                "Intended use",
                "Business impact",
                "Request summary",
              ][step]
            }
          >
            {step === 0 && (
              <>
                <Label title="Supplier name or website">
                  <div className="search-input">
                    <Icon name="Search" size={15} />
                    <input
                      id="intake-supplier"
                      value={query}
                      placeholder="Search supplier or website"
                      onChange={(e) => {
                        setQuery(e.target.value);
                        edit({
                          supplier: "",
                          domain: "",
                          use: "",
                          purpose: "",
                          product: "",
                        });
                      }}
                    />
                  </div>
                </Label>
                <div className="supplier-matches">
                  {matches.map((s) => (
                    <div className="match" key={s.name}>
                      <div>
                        <b>
                          {s.name} · {s.domain}
                        </b>
                        <p>Software company · {s.country}</p>
                      </div>
                      <Badge>Suggested match</Badge>
                      <Button
                        small
                        primary
                        icon="ArrowRight"
                        onClick={() => {
                          edit({
                            supplier: s.name,
                            domain: s.domain,
                            use: "",
                            purpose: "",
                            product: "",
                          });
                          navigate("C03");
                        }}
                      >
                        Use {s.name}
                      </Button>
                    </div>
                  ))}
                </div>
                {!matches.length && (
                  <Note>
                    No confirmed match. Enter the supplier manually; identity
                    will remain unverified.
                  </Note>
                )}
                <Button
                  small
                  onClick={() => {
                    if (!query.trim()) {
                      setError("Enter a supplier name first.");
                      return;
                    }
                    edit({
                      supplier: query.trim(),
                      domain: "Unverified",
                      use: "",
                      purpose: "",
                      product: "",
                    });
                    navigate("C03");
                  }}
                >
                  Enter manually
                </Button>
              </>
            )}
            {step === 1 && (
              <>
                <Entity
                  name={intake.supplier || "Supplier"}
                  service={intake.domain}
                />
                <p className="micro-label">
                  Suggested for {intake.supplier} · nothing selected by default
                </p>
                <div className="choices">
                  {(supplier?.uses || ["Other service"]).map((use) => (
                    <button
                      type="button"
                      key={use}
                      aria-pressed={intake.use === use}
                      className={intake.use === use ? "chosen" : ""}
                      onClick={() => edit({ use })}
                    >
                      {use}
                    </button>
                  ))}
                </div>
                <Label title="Another purpose">
                  <textarea
                    id="intake-purpose"
                    value={intake.purpose}
                    onChange={(e) => edit({ purpose: e.target.value })}
                    placeholder="Describe how your organisation will use the service"
                  />
                </Label>
                <Label title="Optional product or service line">
                  <div className="choices">
                    {[
                      "Sales Hub",
                      "Marketing Hub",
                      "Service Hub",
                      "Other / not sure",
                    ].map((product) => (
                      <button
                        type="button"
                        key={product}
                        aria-pressed={intake.product === product}
                        className={intake.product === product ? "chosen" : ""}
                        onClick={() => edit({ product })}
                      >
                        {product}
                      </button>
                    ))}
                  </div>
                </Label>
              </>
            )}
            {step === 2 && <Note>Choose Unknown when a fact is not confirmed. It stays unresolved for analyst triage; it is not treated as No or inferred from public research.</Note>}
            {step === 2 &&
              questions.map((q, i) => (
                <div className="question" key={q} id={`intake-question-${i}`} tabIndex={-1} role="group" aria-labelledby={`intake-question-label-${i}`} aria-invalid={missingQuestion === i || undefined}>
                  <div>
                    <b id={`intake-question-label-${i}`}>{i + 1}. {q}</b>
                    <small>
                      Confirmed by the business owner · not inferred from public
                      research
                    </small>
                  </div>
                  <div className="segmented">
                    {["Yes", "No", "Unknown"].map((answer) => (
                      <button
                        type="button"
                        key={answer}
                        aria-pressed={intake.answers[i] === answer}
                        className={intake.answers[i] === answer ? "chosen" : ""}
                        onClick={() =>
                          edit({ answers: { ...intake.answers, [i]: answer } })
                        }
                      >
                        {answer}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            {step === 3 && (
              <>
                <Fields
                  items={[
                    [
                      "Supplier",
                      <Entity
                        name={intake.supplier || "Not selected"}
                        service={intake.domain}
                      />,
                    ],
                    ["Service", intake.use || intake.purpose],
                    ["Business owner", data.workspace.decisionOwner],
                    ["Product", intake.product || "Not specified"],
                    ...questions.map((q, i) => [
                      q,
                      intake.answers[i] || "Not answered",
                    ]),
                  ]}
                />
                {Object.values(intake.answers).includes("Unknown") && <Note warning>Unresolved facts: {questions.filter((_, i) => intake.answers[i] === "Unknown").join("; ")} These remain for analyst triage.</Note>}
                <Link onClick={() => navigate("C04")}>Edit details</Link>
              </>
            )}
            {step > 0 && step < 3 && (
              <div className="form-actions">
                <Button
                  onClick={() => navigate(["C02", "C03", "C04"][step - 1])}
                >
                  Back
                </Button>
                <Button primary icon="ArrowRight" onClick={next}>
                  {step === 2 ? "Continue to review" : "Continue"}
                </Button>
              </div>
            )}
          </Card>
          <Card
            title={
              [
                "Identity check",
                "Relevant context",
                "Assessment context",
                "Proposed review path",
              ][step]
            }
          >
            {step === 0 ? (
              <>
                <Entity
                  name={intake.supplier || "Find a supplier"}
                  service={intake.domain || "Confirm the legal entity first"}
                />
                <Fields
                  items={[
                    [
                      "Name / domain match",
                      intake.supplier
                        ? "Confirmed candidate"
                        : "Not yet confirmed",
                    ],
                    [
                      "Existing record",
                      supplier
                        ? `${supplier.name} already known`
                        : "Unverified",
                    ],
                    [
                      "Recorded services",
                      supplier?.uses[0] || "Not established",
                    ],
                    ["What happens next", "Choose this request’s intended use"],
                  ]}
                />
                <Note>
                  Your assessment is service-specific. An existing approved CRM
                  use does not automatically approve another use.
                </Note>
              </>
            ) : step === 1 ? (
              <>
                <div className="list-row">
                  <div>
                    <b>Existing relationship</b>
                    <p>CRM management is already recorded</p>
                  </div>
                  <Badge>Existing</Badge>
                </div>
                <div className="list-row">
                  <div>
                    <b>New assessment scope</b>
                    <p>
                      {intake.use ||
                        intake.purpose ||
                        "Select the activity that describes this service"}
                    </p>
                  </div>
                  <Badge>
                    {intake.use || intake.purpose ? "Selected" : "Not selected"}
                  </Badge>
                </div>
                <Note>
                  Suggested uses are not facts about your organisation. Select
                  only what you intend to do.
                </Note>
              </>
            ) : step === 2 ? (
              <>
                <Fields
                  items={[
                    ["Supplier", intake.supplier],
                    ["Use", intake.use || intake.purpose || "Not selected"],
                    [
                      "Confirmed answers",
                      `${Object.values(intake.answers).filter(value => value === "Yes" || value === "No").length} customer-provided facts`,
                    ],
                    [
                      "Customer-only answers",
                      `${4 - Object.keys(intake.answers).length} required`,
                    ],
                    ["Unresolved facts", `${Object.values(intake.answers).filter(value => value === "Unknown").length} Unknown`],
                  ]}
                />
                <Note>
                  CTP’s nine triage facts and full impact assessment remain
                  governed inputs. This clickable preview does not calculate or
                  publish a risk tier.
                </Note>
              </>
            ) : (
              <>
                <Badge>Proposed · requires analyst review</Badge>
                <h3>CTP-mapped assessment</h3>
                <p>
                  Scope is determined by the approved programme and your
                  confirmed business context.
                </p>
                <Fields
                  items={[
                    ["Policy", data.workspace.policy],
                    ["Review route", "Confirm under published policy"],
                    ["Human gates", "Analyst review + independent QA"],
                    ["Final decision", "Authorised customer only"],
                  ]}
                />
                <Note>
                  The exact plan and applicable controls are confirmed under the
                  approved customer policy.
                </Note>
              </>
            )}
          </Card>
        </div>
        {step === 3 && (
          <div className="grid intake-grid">
            <Card title="Documents attached">
              <UploadList
                files={intake.attachments}
                onChange={(attachments) => edit({ attachments })}
              />
              <Note>
                Demo attachments store names and metadata locally. No files are
                sent to a server.
              </Note>
            </Card>
            <div className="form-actions">
              <Button onClick={() => navigate("C04")}>Back</Button>
              <Button onClick={() => notify("Draft saved until refresh.")}>
                Save draft
              </Button>
              <Button primary type="submit" icon="ArrowRight">
                {state.intakeSubmitted
                  ? "View submitted request"
                  : "Submit request"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </>
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
  const { engagement, state, navigate, update, screen } = c;
  return (
    <>
      <div className="supplier-banner">
        <Entity name={engagement.supplier} service={engagement.service} />
        <Badge>CTP inherent risk: {engagement.risk}</Badge>
        <Badge>{engagement.stage}</Badge>
      </div>
      <div className="grid wide-left">
        <Card
          title={
            engagement.receipt
              ? "Request received"
              : "Service assessment"
          }
        >
          <Fields
            items={[
              ["Customer", engagement.client],
              ["Supplier", engagement.supplier],
              ["Service", engagement.service],
              ["Stage", engagement.stage],
              ["Owner", engagement.owner],
              ["Assessment plan", engagement.plan],
              ["Next date", formatDate(engagement.due)],
              ...(engagement.receipt
                ? [["Request receipt", engagement.receipt]]
                : []),
            ]}
          />
          {engagement.receipt && (
            <>
              <h3>Submitted business context</h3>
              <Fields
                items={Object.entries(engagement.answers || {}).map(
                  ([i, a]) => [`Business fact ${Number(i) + 1}`, a],
                )}
              />
              <h3>Attachments</h3>
              {engagement.attachments?.length ? (
                engagement.attachments.map((f) => <p key={f.name}>{f.name}</p>)
              ) : (
                <p>No attachments supplied.</p>
              )}
            </>
          )}
          <Note>
            {engagement.receipt
              ? "Your request is in the assessment register and operations queue, awaiting analyst triage. This receipt and the submitted facts last until refresh. No risk classification or evidence conclusion has been invented."
              : "This is a portfolio reference record. The full source-review and decision walkthrough uses CedarCloud’s payment service. Its evidence and decision state are kept separate from this record."}
          </Note>
        </Card>
        <Card title="Next step">
          <h3>
            {engagement.receipt
              ? "Awaiting analyst triage"
              : `${engagement.stage} review`}
          </h3>
          {c.data.engagements.some(row=>row.id === "cedar") ? <>
            <p>{engagement.receipt ? "Next owner: an assigned analyst will triage this request. No response time or notification is promised in this demo." : "This service is a scoped portfolio preview."}</p>
            <p>Separate prepared example: CedarCloud’s evidence, QA and customer decision walkthrough.</p>
            <Button onClick={()=>{update({selected:"cedar"});navigate(c.user?.role === "analyst" ? "O02" : "C09");}}>View CedarCloud example</Button>
          </> : <p>No full evidence walkthrough is prepared in the current customer selection. This portfolio record remains separate from other customers’ evidence.</p>}
          <div className="divider" />
          <Link
            onClick={() => navigate(screen.role === "analyst" ? "O01" : "C15")}
          >
            Return to{" "}
            {screen.role === "analyst"
              ? "operations queue"
              : "assessment register"}{" "}
            →
          </Link>
        </Card>
      </div>
    </>
  );
}

function Assessment(c) {
  const { data, state, engagement, navigate, screen } = c;
  const customer = screen.role === "customer";
  const [tab, setTab] = useState("Summary");
  const status = workflowStatus(state);
  const pending = state.conclusion === "Needs review" || Object.values(state.pendingReviews || {}).some(Boolean);
  const activeStep = status.step;
  const evidence = evidenceSummary(data.requirements);
  const steps = [
    "Intake",
    "CTP & scope",
    "Evidence & follow-up",
    "QA",
    "Decision",
  ];
  return (
    <>
      <div className="supplier-banner">
        <Entity name={engagement.supplier} service={engagement.service} />
        <Badge>CTP inherent risk: {engagement.risk}</Badge>
        <Badge>
          {status.label}
        </Badge>
      </div>
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
  const rows = [...data.findings, ...(state.extraFindings || [])].filter(
    (f) =>
      `${f.issue} ${f.supplier} ${f.owner}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "All" ||
        (filter === "Conditions"
          ? f.state.includes("condition")
          : f.state === filter)),
  );
  const f = rows.find(row => row.id === selectedId) || rows.find(row => row.engagementId === state.selected) || rows[0];
  const selectFinding = row => { setSelected(row.id); c.update({ selected: row.engagementId, selectedFinding: row.id }); };
  return (
    <>
      {customer && <Scope {...c} />}
      <Stats
        items={[
          [
            data.findings.length + (state.extraFindings?.length || 0),
            "Open material items",
          ],
          [
            data.findings.filter(row => row.state === "Open condition").length,
            "Customer approval conditions",
          ],
          [
            1,
            "Overdue",
            customer ? "Synthetic review example" : "Requires triage",
          ],
        ]}
      />
      <Filters
        {...{ search, setSearch, filter, setFilter }}
        options={["All", "Conditions", "Awaiting evidence", "In remediation"]}
        placeholder="Search client, supplier, control or finding"
      />
      <div className={`grid ${customer ? "wide-left" : "findings-layout"}`}>
        <Card title={customer ? "Open findings" : "Finding register"}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {!customer && <th>Engagement</th>}
                  <th>Issue / treatment</th>
                  <th>Severity</th>
                  <th>Owner</th>
                  <th>State</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={f?.id === row.id ? "selected-row" : ""}
                    onClick={() => selectFinding(row)}
                  >
                    {!customer && <td>{row.client || data.workspace.name} / {row.supplier}</td>}
                    <td>
                      <Link onClick={() => selectFinding(row)}>{row.issue}</Link>
                      {customer && (
                        <small className="cell-sub">
                          {row.supplier} · {row.service}
                        </small>
                      )}
                    </td>
                    <td>
                      <Badge>{row.severity}</Badge>
                    </td>
                    <td>{row.owner}</td>
                    <td>
                      <Badge>
                        {state.conditionClosed && row.id === "F-01"
                          ? "Closed"
                          : row.state}
                      </Badge>
                    </td>
                    <td>{formatDate(row.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <div className="empty">No findings match this filter.</div>
            )}
          </div>
        </Card>
        {f && (
          <Card
            title={
              customer
                ? "Selected condition"
                : `Selected finding · ${f.supplier}`
            }
          >
            <Fields
              items={[
                ["Supplier", f.supplier],
                ["Service", f.service],
                ["Requirement", `${f.control} · ${f.issue}`],
                ["Treatment", f.id === "F-01" && !state.decision ? "Proposed condition · no customer decision" : f.state === "Open condition" || (f.id === "F-01" && state.decision?.condition) ? "Customer approval condition" : f.state],
                ["Owner", f.owner],
                ["Due", formatDate(f.due)],
                ["Closure requires", f.evidence],
              ]}
            />
            <p className="muted">
              The original decision will remain unchanged when closure evidence
              is reviewed.
            </p>
            <Button
              small
              onClick={() => { c.update({ selected: f.engagementId || "cedar", selectedRequirement: f.control }); navigate(customer ? "C13" : f.id === "F-01" ? "O09" : "O04"); }}
              icon="FileText"
            >
              {customer
                ? "View supporting evidence"
                : "Review condition closure"}
            </Button>
          </Card>
        )}
        {!customer && (
          <Card title="Cross-assessment patterns">
            <div className="list-row">
              <b>Recovery testing / resilience</b>
              <Badge>3</Badge>
            </div>
            <div className="list-row">
              <b>Data retention / deletion</b>
              <Badge>2</Badge>
            </div>
            <Note>
              Pattern analysis groups existing findings. It does not create new
              risk classifications.
            </Note>
            <Link onClick={() => setDrawer("finding")}>
              Create an accountable finding →
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}

function EvidenceReview(c) {
  const { data, state, update, navigate, screen, notify, setDrawer } = c;
  const customer = screen.role === "customer";
  const [tab, setTab] = useState(
    customer ? "Evidence conclusions" : "Evidence viewer",
  );
  const [requirementId, setRequirement] = useState(
    state.selectedRequirement || "R-07",
  );
  const baseRequirement =
    data.requirements.find((r) => r.id === requirementId) ||
    data.requirements[0];
  const requirement = baseRequirement;
  const savedReview = state.reviews?.[requirementId];
  const currentConclusion = state.pendingReviews?.[requirementId]
    ? "Needs review"
    : requirementId === "R-07"
      ? state.conclusion
      : savedReview?.conclusion || baseRequirement.conclusion;
  const sourceDocument = requirement.sourceDocument || [...data.documents].reverse().find(
    (doc) => doc.requirement === requirementId,
  );
  const draftKey = `${c.user.id}:${requirementId}`;
  const draft = state.reviewDrafts?.[draftKey] || {
    judgement: requirementId === "R-07" ? state.judgement : savedReview?.judgement || "",
    conclusion: currentConclusion,
    reason: savedReview?.reason || "",
    recommendation: savedReview?.recommendation || "Approve with conditions",
  };
  const { judgement, conclusion, reason, recommendation } = draft;
  const editDraft = (patch) => {
    update({ reviewDrafts: { ...state.reviewDrafts, [draftKey]: { ...draft, ...patch } } });
    setError("");
  };
  const [showProposal, setShowProposal] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setShowProposal(false); setError(""); }, [requirementId]);
  const save = () => {
    try {
      const reviewDrafts = { ...state.reviewDrafts };
      delete reviewDrafts[draftKey];
      update({ ...saveRequirementReview(state, data, requirementId, {
          judgement,
          conclusion,
          reason,
          recommendation,
        }), reviewDrafts });
      notify("Independent judgement saved.");
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };
  return (
    <>
      <Scope {...c} />
      <Note>Review drafts stay in this session until refresh. Source excerpts are synthetic; original PDF viewing is unavailable.</Note>
      <Note>{savedReview ? `Last recommendation: ${savedReview.actor} · ${formatDate(savedReview.at)}` : "Prepared conclusion · no analyst action recorded in this session."}</Note>
      <Tabs
        tabs={
          customer
            ? ["Evidence conclusions", "Documents", "Questions", "Activity"]
            : [
                "Evidence viewer",
                "Source record",
                "Version history",
                "Supplier response",
              ]
        }
        value={tab}
        onChange={setTab}
      />
      {tab === "Documents" || tab === "Source record" ? (
        <Inventory {...c} embedded />
      ) : tab === "Activity" || tab === "Version history" ? (
        <Card title="Evidence history">
          <Timeline
            items={[
              ...data.sourceHistory,
              ...(state.supplierReceipt
                ? [
                    [
                      state.supplierReceipt.fileName,
                      `Received ${formatDate(state.supplierReceipt.at)}`,
                      "Needs review",
                    ],
                  ]
                : []),
            ]}
          />
        </Card>
      ) : tab === "Questions" || tab === "Supplier response" ? (
        <FollowUp {...c} />
      ) : (
        <div
          className={`grid ${customer ? "evidence-customer" : "evidence-analyst"}`}
        >
          {customer && (
            <Card
              title="Assurance findings"
              action={<span className="muted">Relevant controls only</span>}
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Current conclusion</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requirements.map((r) => (
                      <tr
                        key={r.id}
                        className={
                          r.id === requirement.id ? "selected-row" : ""
                        }
                      >
                        <td>
                          <Link
                            onClick={() => {
                              setRequirement(r.id);
                              update({ selectedRequirement: r.id });
                            }}
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td>
                          <Badge>
                            {r.id === "R-07" ? state.conclusion : r.conclusion}
                          </Badge>
                        </td>
                        <td>{r.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <Card
            title={
              customer
                ? "Source inspection"
                : "Source excerpt · exact source version"
            }
            action={
              <Link onClick={() => setDrawer("source")}>View source excerpt ↗</Link>
            }
          >
            <div className="source-caption">
              <span>{requirement.source}</span>
              <Badge>Version pinned</Badge>
            </div>
            <div className="document">
              <div className="document-label">
                CEDARCLOUD · EVIDENCE DOCUMENT
              </div>
              <h3>
                {requirement.id === "R-07"
                  ? "Service recovery objectives"
                  : requirement.name}
              </h3>
              <div className="fake-line" />
              <div className="fake-line short" />
              <blockquote>“{requirement.passage}”</blockquote>
              <div className="fake-line" />
              <div className="fake-line short" />
              <small>
                Authorised synthetic source excerpt · {requirement.source}
              </small>
            </div>
            <Fields
              items={[
                ["What this proves", requirement.proves],
                ["What is not yet proved", requirement.doesNotProve],
              ]}
            />
            {customer && (
              <Button small onClick={() => setDrawer("source")}>
                Inspect exact passage
              </Button>
            )}
          </Card>
          {!customer && (
            <div>
              <Card title="Independent analyst judgement">
                <small className="micro-label">
                  REQUIREMENT: {requirement.id} · {requirement.name}
                </small>
                <h3>
                  {requirement.id === "R-07"
                    ? "Has a recovery exercise been demonstrated for this service?"
                    : `Does the evidence support ${requirement.name.toLowerCase()} for this service?`}
                </h3>
                <Fields
                  items={[
                    ["Customer service", c.engagement.service],
                    [
                      "Potential evidence",
                      "A dated exercise with exact service coverage",
                    ],
                    ["Source status", <Badge>Document received</Badge>],
                  ]}
                />
                <Label title="Your initial conclusion">
                  <textarea
                    value={judgement}
                    onChange={(e) => editDraft({ judgement: e.target.value })}
                    placeholder="Record your independent reading before viewing the prepared proposal."
                  />
                </Label>
                <Label title="Evidence conclusion">
                  <select
                    value={conclusion}
                    onChange={(e) => editDraft({ conclusion: e.target.value })}
                  >
                    {currentConclusion === "Needs review" && (
                      <option value="Needs review" disabled>
                        Needs review · select a conclusion
                      </option>
                    )}
                    {[
                      "Supported",
                      "Partially supported",
                      "Unknown",
                      "Contradictory",
                      "Out of scope",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Label>
                {(conclusion !== currentConclusion || state.qaReworkRevision != null) && (
                  <Label title={conclusion !== currentConclusion ? "Reason for changing the conclusion" : "Response to QA challenge"}>
                    <textarea
                      value={reason}
                      onChange={(e) => editDraft({ reason: e.target.value })}
                    />
                  </Label>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <Label title="Suggested customer outcome">
                  <select aria-label="Suggested customer outcome" value={recommendation} onChange={e=>editDraft({ recommendation: e.target.value })}>
                    {["Approve","Approve with conditions","Reject","Return for clarification"].map(value=><option key={value}>{value}</option>)}
                  </select>
                  <small>A recommendation only; the customer records the final decision.</small>
                </Label>
                <Button primary small icon="Check" onClick={save}>
                  Save my independent judgement
                </Button>
                <div className="divider" />
                <Button
                  small
                  disabled={
                    !(requirementId === "R-07"
                      ? state.judgement
                      : savedReview?.judgement)
                  }
                  onClick={() => setShowProposal(!showProposal)}
                >
                  {showProposal ? "Hide" : "Compare"} prepared proposal
                </Button>
                {!(requirementId === "R-07"
                  ? state.judgement
                  : savedReview?.judgement) && (
                  <small className="helper">
                    Save your independent judgement first.
                  </small>
                )}
                {showProposal && (
                  <Note warning>
                    Prepared proposal: {baseRequirement.proposal} This is
                    synthetic fixture content, not live AI output.
                  </Note>
                )}
              </Card>
              <Card title="Source provenance">
                <Fields
                  items={[
                    [
                      "File",
                      sourceDocument?.name || "No matching document",
                    ],
                    [
                      "Source / upload",
                      `Supplier · ${sourceDocument?.date ? formatDate(sourceDocument.date) : "Date unavailable"}`,
                    ],
                    [
                      "Pin / version",
                      `${sourceDocument?.version || "Unversioned"} · pinned source`,
                    ],
                    ["Extraction", /metadata|no extraction/i.test(sourceDocument?.page || "") ? "Supplier metadata and answer · no extraction" : "Prepared synthetic excerpt"],
                    ["Sensitivity", <Badge>Supplier evidence</Badge>],
                    ["Reuse confidence", <Badge>Not assumed</Badge>],
                  ]}
                />
                <Link onClick={() => setTab("Version history")}>
                  Compare source versions →
                </Link>
                <div className="divider" />
                <Link onClick={() => navigate("O05")}>
                  Request remaining evidence →
                </Link>
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Decision(c) {
  const { state, data, engagement, setDrawer, navigate, notify } = c;
  const draftKey = c.user.id;
  const draft = state.decisionDrafts?.[draftKey] || { choice: "", rationale: "", owner: "", due: "", evidence: "" };
  const { choice, rationale, owner, due, evidence } = draft;
  const editDraft = (patch) => {
    c.update({ decisionDrafts: { ...state.decisionDrafts, [draftKey]: { ...draft, ...patch } } });
    setError("");
  };
  const status = workflowStatus(state);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!choice || !rationale.trim()) { setError("Choose an outcome and enter your own decision rationale."); return; }
    if (choice === "Approve with conditions" && (!owner.trim() || !due || !evidence.trim())) { setError("Complete the condition owner, due date and required evidence."); return; }
    if (!status.ready) { setError(`${status.label}. Next owner: ${status.nextOwner}.`); return; }
    setConfirming(true);
  };
  const confirm = () => {
    try {
      const next = recordDecision(state, data, choice, rationale.trim(), {
        owner: owner.trim(), due, evidence: evidence.trim(),
      });
      const decisionDrafts = { ...state.decisionDrafts };
      delete decisionDrafts[draftKey];
      c.update({ ...next, decisionDrafts });
      setConfirming(false);
      notify(choice === "Return for clarification" ? "Returned to the analyst for clarification." : "Customer decision recorded. Decision Pack frozen.");
      navigate(choice === "Return for clarification" ? "C09" : "C07");
    } catch (err) { setConfirming(false); setError(err.message); }
  };
  if (c.user?.role !== "customer") return <>
    <Scope {...c}/><Card title="Customer decision · read only">
      <Fields items={[["Customer",engagement.client],["Suggested outcome",state.reviews?.["R-07"]?.recommendation || "Prepared: Approve with conditions"],["Recommended by",state.reviews?.["R-07"]?.actor || "Prepared fixture"],["QA outcome",state.qa],["QA reviewer",state.qaReview?.actor || "Not recorded"],["Customer decision",state.decision?.outcome || "Not recorded"],["Decision by",state.decision?.actor || "Customer Decision Owner"]]}/>
      <Note>Only the designated customer Decision Owner can record the final outcome. Analyst and superadmin roles cannot sign for the customer.</Note>
      <Button onClick={()=>setDrawer("audit")}>View review history</Button>
    </Card>
  </>;
  return (
    <>
      <div className="supplier-banner">
        <Entity name={engagement.supplier} service={engagement.service} />
        <Badge>CTP inherent risk: {engagement.risk}</Badge>
        <Badge>
          {status.label}
        </Badge>
      </div>
      <div className="stepper assessment-steps">
        {[
          "Intake",
          "CTP & scope",
          "Evidence & follow-up",
          "QA",
          "Decision",
        ].map((s, i) => (
          <span key={s} aria-current={i === status.step ? "step" : undefined} className={i < status.step ? "done" : i === status.step ? "current" : ""}>
            {i < status.step ? "✓ " : ""}
            {s}
          </span>
        ))}
      </div>
      <div className="grid equal">
        <Card title="Decision memo">
          <div className="badges">
            <Badge>CTP inherent risk: {engagement.risk}</Badge>
            <Badge>{engagement.plan}</Badge>
            <Badge>QA: {state.qa}</Badge>
          </div>
          <h2 className="memo-title">{state.reviews?.["R-07"]?.recommendation || "Approve with conditions"}</h2>
          <small>{state.reviews?.["R-07"] ? `Recommended by ${state.reviews["R-07"].actor} · ${formatDate(state.reviews["R-07"].at)}` : "Prepared analyst recommendation · no session action recorded"}</small>
          <p>
            {state.reviews?.["R-07"]?.judgement || `${engagement.supplier} is material to payment operations. The prepared recommendation is conditional because the exercise evidence does not establish full service coverage.`}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Evidence / source</th>
                  <th>Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {data.requirements.slice(0, 3).map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      <Link
                        onClick={() => {
                          c.update({ selectedRequirement: r.id });
                          navigate("C13");
                        }}
                      >
                        {r.source}
                      </Link>
                    </td>
                    <td>
                      <Badge>
                        {r.id === "R-07" ? state.conclusion : r.conclusion}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Fields items={[["Proposed condition owner", data.defaults.conditionOwner || data.workspace.decisionOwner], ["Proposed due date", formatDate(data.defaults.conditionDue)], ["Proposed required evidence", data.defaults.conditionEvidence]]}/>
          <Note>The analyst recommendation and proposed obligation are read-only advice. Choose your own customer outcome and rationale.</Note>
          <Fields items={[["QA reviewer",state.qaReview?.actor || "Not recorded"],["QA recorded",state.qaReview?.prepared ? "Prepared fixture" : state.qaReview?.at ? formatDate(state.qaReview.at) : "Not recorded"],["QA rationale",state.qaNote]]}/>
          <Link onClick={() => c.setDrawer("audit")}>Inspect review history →</Link>
          <Link onClick={() => navigate("C13")}>Inspect complete evidence →</Link>
        </Card>
        <Card
          title={
            state.decision
              ? "Recorded customer outcome"
              : "Record a customer-authorised outcome"
          }
        >
          {state.decision ? (
            <>
              <Badge>{state.decision.outcome}</Badge>
              <Fields
                items={[
                  ["Signed by", state.decision.actor],
                  ["Recorded", formatDate(state.decision.at)],
                  ["Rationale", state.decision.rationale],
                ]}
              />
              <Button primary onClick={() => navigate("C07")}>
                Open frozen Decision Pack
              </Button>
            </>
          ) : (
            <form id="decision-form" onSubmit={submit}>
              <div className="decision-options">
                {[
                  ["Approve", "No further conditions"],
                  [
                    "Approve with conditions",
                    "Accept and track one evidence-backed obligation",
                  ],
                  ["Reject", "Do not proceed with this service"],
                  [
                    "Return for clarification",
                    "Request further work from Osura",
                  ],
                ].map(([value, detail]) => (
                  <label
                    key={value}
                    className={choice === value ? "chosen" : ""}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={value}
                      required
                      checked={choice === value}
                      onChange={() => editDraft({ choice: value })}
                    />
                    <span>
                      <b>{value}</b>
                      <small>{detail}</small>
                    </span>
                  </label>
                ))}
              </div>
              <Label title="Decision rationale">
                <textarea
                  required
                  value={rationale}
                  onChange={(e) => editDraft({ rationale: e.target.value })}
                />
              </Label>
              {choice === "Approve with conditions" && (
                <>
                  <Button small onClick={() => editDraft({ owner: data.defaults.conditionOwner || data.workspace.decisionOwner, due: data.defaults.conditionDue, evidence: data.defaults.conditionEvidence })}>Use proposed obligation</Button>
                  <Label title="Condition owner">
                    <input
                      required
                      value={owner}
                      onChange={(e) => editDraft({ owner: e.target.value })}
                    />
                  </Label>
                  <Label title="Due date">
                    <input
                      type="date"
                      required
                      value={due}
                      onChange={(e) => editDraft({ due: e.target.value })}
                    />
                  </Label>
                  <Label title="Required evidence">
                    <input
                      required
                      value={evidence}
                      onChange={(e) => editDraft({ evidence: e.target.value })}
                    />
                  </Label>
                </>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Note>
                The customer decision creates a frozen record. No AI or analyst
                action may sign in your place. Demo actor:{" "}
                {data.workspace.decisionOwner}.
              </Note>
              <div className="form-actions">
                <Button
                  primary
                  type="submit"
                  icon="Check"
                  disabled={!status.ready}
                >
                  Record decision
                </Button>
              </div>
              {!status.ready && <Note warning>{status.label}. Next owner: {status.nextOwner}.</Note>}
            </form>
          )}
        </Card>
      </div>
      {confirming && <Dialog title="Confirm customer decision" onClose={() => setConfirming(false)}>
        <Fields items={[["Customer", engagement.client], ["Supplier", engagement.supplier], ["Service", engagement.service], ["Acting Decision Owner", c.user.name], ["Outcome", choice], ["Customer rationale", rationale], ...(choice === "Approve with conditions" ? [["Condition owner", owner], ["Due date", formatDate(due)], ["Required evidence", evidence]] : [["Condition", "None"]])]} />
        <Note>{choice === "Return for clarification" ? "This requests analyst rework and creates no signed Decision Pack." : "Confirming attributes the outcome to you and freezes the evidence, QA and decision in a Decision Pack. Later changes do not rewrite this record."}</Note>
        <div className="form-actions"><Button onClick={() => setConfirming(false)}>Keep editing</Button><Button primary onClick={confirm}>Confirm outcome</Button></div>
      </Dialog>}
    </>
  );
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
      {preview && (
        <Note warning>
          Reference post-decision preview · this is a separate prepared example.{" "}
          <Link onClick={() => navigate("C06")}>
            Record your own customer decision →
          </Link>
        </Note>
      )}
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
        <div className="grid wide-left">
          <Card title="Decision record">
            <article className="signed-document">
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
          <Card title="Pack contents">
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
  const entries = [
    ...c.data.monitoring.map((row) => [
      analyst ? `${row.client} / ${row.supplier}` : row.supplier,
      row.activity,
      row.date,
      row.owner,
      row.activity === "Recovery condition" && state.conditionClosed
        ? "Closed"
        : row.status,
      row.route,
      row.engagementId || data.engagements.find(e => e.supplier === row.supplier && e.client === row.client)?.id,
    ]),
    ...(state.scheduledReviews || []).map((r) => [
      r.supplier,
      r.title,
      r.date,
      r.owner,
      "Scheduled",
      "O12",
      r.engagementId,
    ]),
    ...state.events
      .filter((e) => e.message.includes("Material change"))
      .map((e) => [
        "CedarCloud",
        e.message,
            e.at,
        "A. Morgan",
        "Needs triage",
        "O12",
        e.engagementId,
      ]),
  ].filter(
    (row) =>
      row.join(" ").toLowerCase().includes(search.toLowerCase()) &&
      (filter === "All" || row[4] === filter),
  );
  return (
    <>
      {!analyst && <Scope {...c} />}
      <Stats
        items={
          analyst
            ? [
                [3, "Conditions due"],
                [2, "Evidence expiry"],
                [
                  state.events.filter((e) =>
                    e.message.includes("Material change"),
                  ).length + 1,
                  "Changes needing triage",
                ],
                [4, "Scheduled reviews"],
              ]
            : [
                [
                  state.decision?.condition && !state.conditionClosed ? 1 : 0,
                  "Open condition",
                  state.decision ? "Customer decision recorded" : "Proposed recovery condition · not signed",
                ],
                [
                  formatDate(state.decision?.condition?.due),
                  "Next condition due",
                  state.decision?.condition ? `Owner: ${state.decision.condition.owner}` : "No signed customer condition",
                ],
                [3, "Evidence due within 90d", "Actions programme"],
                [
                  state.signedPack ? 1 : 0,
                  "Current signed pack",
                  state.signedPack
                    ? formatDate(state.decision.at)
                    : "Awaiting customer decision",
                ],
              ]
        }
      />
      {!state.decision && <Note>Recovery condition shown below is a prepared proposal. It becomes a customer obligation only after conditional approval is signed.</Note>}
      {analyst && (
        <Filters
          {...{ search, setSearch, filter, setFilter }}
          options={["All", "Awaiting evidence", "Scheduled", "Needs triage"]}
          placeholder="Search engagement or condition"
        />
      )}
      <div className={`grid ${analyst ? "monitoring-layout" : "wide-left"}`}>
        <Card
          title={
            analyst
              ? "Assurance activity schedule"
              : "Conditions and obligations"
          }
          action={
            <Link onClick={() => analyst ? setDrawer("review") : navigate("C12")}>
              {analyst ? "Schedule a review" : "View all conditions"} →
            </Link>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Engagement / item</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .slice(0, analyst ? entries.length : 2)
                  .map((row, i) => (
                    <tr key={i}>
                      <td>
                        <b>{row[0]}</b>
                        <small className="cell-sub">{row[1]}</small>
                      </td>
                      <td>{row[3]}</td>
                      <td>{formatDate(row[2])}</td>
                      <td>
                        <Badge>{row[4]}</Badge>
                      </td>
                      <td>
                        <Link
                          onClick={() => {
                            const supplier = row[0].split(" / ").at(-1);
                            const record = data.engagements.find(e => e.id === row[6]) || data.engagements.find(e => e.supplier === supplier && (row[1] === "Recovery condition" ? e.id === "cedar" : true));
                            if (!record) { c.notify("No accessible assessment is linked to this item."); return; }
                            const finding = [...data.findings, ...(state.extraFindings || [])].find(f => f.engagementId === record.id);
                            c.update({ selected: record.id, selectedFinding: finding?.id || null });
                            navigate(analyst ? row[5] : finding ? "C12" : "C09");
                          }}
                        >
                          View {/condition/i.test(row[1]) ? "condition" : "review"} →
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title={analyst ? "Governed cadence" : "Event and review history"}>
          <Timeline
            items={[
              [
                state.signedPack
                  ? "Decision signed · pack v1"
                  : "Decision awaits customer",
                state.signedPack
                  ? "Frozen historical customer outcome"
                  : "No signed record yet",
                state.signedPack ? "Signed" : "Waiting",
              ],
              [
                "Recovery document expires soon",
                "New evidence will create targeted work",
                "Due soon",
              ],
              [
                "Material change report",
                `${state.events.filter((e) => e.message.includes("Material change")).length} change reports recorded`,
                "Recorded",
              ],
            ]}
            onClick={() => navigate("C16")}
          />
          <Note>
            Historical reports stay pinned to their original policy and evidence
            versions.
          </Note>
        </Card>
        {analyst && (
          <Card title="Material change · targeted reassessment">
            <Timeline
              items={[
                [
                  "Prior decision · pack v1",
                  "Frozen at the earlier review",
                  "Immutable",
                ],
                [
                  "Evidence expires / service changes",
                  "Record with scope and effective context",
                  "Trigger",
                ],
                [
                  "New targeted review created",
                  "Keep original evidence and conditions",
                  "New version",
                ],
                [
                  "Customer outcome recorded",
                  "New decision after full review",
                  "Authorised",
                ],
              ]}
            />
          </Card>
        )}
      </div>
    </>
  );
}

function Operations(c) {
  const { data, navigate } = c;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const rows = filterEngagements(data.engagements.filter(e => !["Active", "Rejected"].includes(e.stage)), search, filter);
  return (
    <>
      <Stats
        items={[
          [new Set(data.engagements.map(row=>row.workspaceId)).size, "Customers in view", "Assigned access only"],
          [data.engagements.length, "Service engagements", "All selected customers"],
          [data.engagements.filter(row=>!["Active","Rejected"].includes(row.stage)).length, "Open reviews", "Scoped work list"],
          [data.engagements.filter(row=>row.stage === "Decision").length, "Customer decisions", "Customer retains authority"],
        ]}
      />
      <div id="queue">
        <Filters
          {...{ search, setSearch, filter, setFilter }}
          options={["All", "High", "Medium"]}
          placeholder="Search client, supplier or exception"
        />
        <Card
          title="Priority exceptions"
          action={
            <Link onClick={() => navigate("O11")}>Client service health →</Link>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client / engagement</th>
                  <th>Why human attention is required</th>
                  <th>CTP inherent risk</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>
                      <Entity
                        name={`${r.client} / ${r.supplier}`}
                        service={r.service}
                      />
                    </td>
                    <td>
                      {(r.id === "cedar" ? `${workflowStatus(c.state).label} · ${workflowStatus(c.state).nextOwner}` : data.operationsAttention[r.id]) ||
                        "New request awaiting triage"}
                    </td>
                    <td>
                      <Badge>{r.risk}</Badge>
                    </td>
                    <td>{r.owner}</td>
                    <td>{formatDate(r.due)}</td>
                    <td>
                      <Link
                        onClick={() => {
                          c.update({ selected: r.id });
                          navigate("O02");
                        }}
                      >
                        Open {r.stage.toLowerCase()} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="empty" role="status">No exceptions match “{search}” and {filter}. Try another search or risk filter.</div>}
        </Card>
      </div>
      <div className="grid equal">
        <Card title="CTP risk × current review stage">
          <RiskGrid {...c} />
        </Card>
        <Card title="Delivery handoffs">
          <Timeline
            items={data.operationsHandoffs}
            onClick={item => {
              const record = data.engagements.find(row => item[0].includes(row.supplier));
              if (record) { c.update({ selected: record.id }); navigate("O02"); }
            }}
          />
        </Card>
      </div>
    </>
  );
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
  const [tab, setTab] = useState("All");
  const threads = c.data.communications
    .map((row, i) =>
      state.retries?.[row[0]] ? [...row.slice(0, 3), "Retry queued (local)", "Session retry recorded", ...row.slice(5)] : i === 0
        ? [...row.slice(0, 3), state.requestStatus, ...row.slice(4)]
        : row,
    )
    .filter(
      (r) => tab === "All" || r[3].toLowerCase().includes(tab.toLowerCase()),
    );
  return (
    <>
      <Stats
        items={[
          [state.requestStatus.includes("Queued") ? 2 : 1, "Queued"],
          [threads.filter(row => row[3].includes("Failed")).length, "Failed delivery"],
          [state.supplierReceipt ? 3 : 2, "Supplier replies"],
          [0, "Unknown send status"],
        ]}
      />
      <Tabs
        tabs={["All", "Draft", "Queued", "Response received", "Failed"]}
        value={tab}
        onChange={setTab}
      />
      <div className="grid wide-left">
        <Card title="Communication register">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Packet</th>
                  <th>Supplier</th>
                  <th>Recipient</th>
                  <th>Delivery / response</th>
                  <th>Last event</th>
                </tr>
              </thead>
              <tbody>
                {threads.map((r, i) => (
                  <tr key={r[0]}>
                    <td>
                      <Link
                        onClick={() => {
                          c.update({ selectedThread: r });
                          c.setDrawer("thread");
                        }}
                      >
                        {r[0]}
                      </Link>
                    </td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>
                      <Badge>{r[3]}</Badge>
                    </td>
                    <td>
                      {r[4]}{" "}
                      {r[3].includes("Failed") && (
                        <Link
                          onClick={() => {
                            c.event("Local simulated retry queued", { retries: { ...state.retries, [r[0]]: true } });
                            c.notify(
                              "Retry queued locally. No external email was sent.",
                            );
                          }}
                        >
                          Retry →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!threads.length && (
              <div className="empty">No messages in this status.</div>
            )}
          </div>
        </Card>
        <Card title="Selected thread">
          <Entity
            name={data.engagements[0].supplier}
            service={`Packet ${c.data.request.reference}`}
          />
          <Timeline
            items={[
              [
                "Evidence requested · v1",
                "30 Oct · sent (reference fixture)",
                "Recorded",
              ],
              [
                state.supplierReceipt
                  ? "Supplier replied"
                  : "Supplier response pending",
                state.supplierReceipt
                  ? state.supplierReceipt.fileName
                  : "No new response in this browser",
                state.supplierReceipt ? "Received" : "Waiting",
              ],
              [
                "Targeted re-check",
                state.supplierReceipt
                  ? "Review the changed service scope"
                  : "Wait for supplier evidence",
                state.supplierReceipt ? "Needs review" : "Waiting",
              ],
            ]}
            onClick={() => navigate("O06")}
          />
          <div className="form-actions">
            <Button small onClick={() => navigate("S01")}>
              Open supplier portal
            </Button>
            <Button small primary onClick={() => navigate("O06")}>
              Inspect response
            </Button>
          </div>
          <Link
            onClick={() => {
              c.update({ selectedThread: null });
              c.setDrawer("thread");
            }}
          >
            Open full correspondence →
          </Link>
        </Card>
      </div>
    </>
  );
}

function Response(c) {
  const { state, navigate, data } = c;
  return (
    <>
      <Scope {...c} />
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
                  {state.supplierReceipt?.fileName ||
                    data.referenceReceipt.fileName}
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
                state.supplierReceipt?.fileName ||
                  data.referenceReceipt.fileName,
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
      <Note>QA readiness: {status.label}. Next owner: {status.nextOwner}. Drafts stay in this session until refresh.</Note>
      <Note>{state.qaReview?.prepared ? "Prepared fixture QA" : "Latest QA"}: {state.qaReview?.actor || "Not recorded"} · {state.qaReview?.at ? formatDate(state.qaReview.at) : "No timestamp"}. Acting as {c.user?.name}; independent QA permission is required.</Note>
      <div className="grid equal">
        <Card title="Challenge brief">
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
        <Card title="Review authority">
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
  const draft = state.closureDrafts?.[c.user.id] || { decision: "Return for more proof", reason: "" };
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
    if (decision === "Verify closure") {
      try { c.update(closeCondition(state, c.data, reason.trim())); }
      catch (error) { setError(error.message); return; }
    } else {
      event("Condition returned for more proof", { conditionClosed: false, closureReason: reason.trim() });
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
      {!eligible && !state.conditionClosed && <Note warning>Closure preview only. Record a conditional customer decision, then receive and independently review newer evidence before verifying closure. Evidence received before the decision cannot close its condition.</Note>}
      <div className="grid equal">
        <Card title="Condition evidence">
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
        <Card title="Closure decision">
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
  const draft = actualReceipt || state.supplierDrafts?.[item] || { fileName: "", answer: "", scope: "" };
  const remainingItems = data.request.items.filter(name => !state.supplierReceipts?.[name]);
  const [error, setError] = useState("");
  const edit = (patch) => {
    if (actualReceipt) return;
    setError("");
    update({
      supplierDraft: { ...draft, ...patch },
      supplierDrafts: {
        ...(state.supplierDrafts || {}),
        [item]: { ...draft, ...patch },
      },
    });
  };
  const submit = (e) => {
    e.preventDefault();
    if (actualReceipt) {
      navigate("S03");
      return;
    }
    try {
      const next = submitSupplier(
        { ...state, supplierDraft: draft },
        item,
        data.request.items[0],
      );
      update(next);
      if (next.supplierReceipts?.[item] !== state.supplierReceipts?.[item])
        notify("Your response was received. Receipt saved until refresh.");
      navigate("S03");
    } catch (err) {
      setError(err.message);
    }
  };
  const receipt = actualReceipt || data.referenceReceipt;
  if (screen.id === "S01")
    return (
      <div className="grid wide-left">
        <Card title="Items to provide">
          {data.request.items.map((name, i) => (
            <div className="list-row" key={name}>
              <div>
                <b>{name}</b>
                <p>
                  {i === 0
                    ? "A dated exercise covering payment event processing"
                    : "Most recent scoped review, or accepted alternative"}
                </p>
              </div>
              <Badge>
                {state.supplierReceipts?.[name] ? "Received" : "Required"}
              </Badge>
              <Button
                small
                onClick={() => {
                  update({ supplierItem: name });
                  navigate("S02");
                }}
                icon="ArrowRight"
              >
                {state.supplierReceipts?.[name] ? "View submitted response" : "Open"}
              </Button>
            </div>
          ))}
          <Note>
            You can save a draft. Submission is only confirmed when a receipt
            appears.
          </Note>
        </Card>
        <Card title="Your request">
          <Fields
            items={[
              ["Customer", data.workspace.name],
              ["Request reference", data.request.reference],
              ["Due", formatDate(data.request.due)],
              [
                "Completed",
                `${Object.keys(state.supplierReceipts || {}).length} of ${data.request.items.length} items`,
              ],
              ["Contact", "Assurance team"],
            ]}
          />
          <Button
            primary
            onClick={() => {
              update({ supplierItem: remainingItems[0] || item });
              navigate(remainingItems.length ? "S02" : "S03");
            }}
          >
            {remainingItems.length ? `Provide ${remainingItems[0]}` : "View receipt"}
          </Button>
        </Card>
      </div>
    );
  if (screen.id === "S03" && !actualReceipt && item !== data.request.items[0])
    return <Card title="No submission receipt for this item"><p>{item} has not been submitted. Another item’s receipt does not confirm this response.</p><Button primary onClick={() => navigate("S02")}>Provide {item}</Button><Button onClick={() => navigate("S01")}>Return to all requested items</Button></Card>;
  if (screen.id === "S03")
    return (
      <>
        {!actualReceipt && (
          <Note warning>
            Prepared receipt preview · {item} has not been submitted in this session. The example is not a receipt for this item.{" "}
            <Link onClick={() => navigate("S02")}>
              Submit your own response →
            </Link>
          </Note>
        )}
        <div className="success-icon">
          <Icon name="Check" size={23} />
        </div>
        <div className="grid wide-left">
          <Card title={actualReceipt ? "Submission receipt" : "Prepared receipt example"}>
            <Fields
              items={[
                ["Reference", receipt.reference],
                ["Received", formatDate(receipt.at)],
                ["Item", actualReceipt ? item : receipt.item || data.request.items[0]],
                ["Service", "Payment event processing"],
                ["Submitted by", data.defaults.supplierTeam],
                ["Review state", <Badge>Pending independent review</Badge>],
              ]}
            />
            <div className="list-row">
              <Icon name="FileText" />
              <b>{receipt.fileName}</b>
              <Badge>Received</Badge>
            </div>
            <Button small onClick={() => c.setDrawer("submitted")}>
              View submitted items
            </Button>
            <div className="divider" />
            <Note>Submitted items are read-only. Corrections and cannot-provide responses are unavailable in this prototype. Session receipts are cleared on refresh.</Note>
            {remainingItems.length > 0 && <div className="form-actions"><Button primary onClick={() => { update({ supplierItem: remainingItems[0] }); navigate("S02"); }}>Provide {remainingItems[0]}</Button></div>}
            <p>{actualReceipt ? `Submitted: ${item}.` : "No receipt for the selected item."} Remaining: {remainingItems.join(", ") || "None"}.</p>
            <Link onClick={() => navigate("S01")}>
              Return to all requested items →
            </Link>
          </Card>
          <Card title="What happens next">
            <div className="list-row">
              <div>
                <b>Osura reviews the evidence</b>
                <p>
                  Controls are checked against the service-specific requirement
                </p>
              </div>
              <Badge>Next</Badge>
            </div>
            <div className="list-row">
              <div>
                <b>Further questions if needed</b>
                <p>
                  We will reference a new, scoped request if something is
                  unclear
                </p>
              </div>
              <Badge>Conditional</Badge>
            </div>
            <Note>
              This receipt confirms delivery, not customer approval or a
              successful control assessment.
            </Note>
          </Card>
        </div>
      </>
    );
  return (
    <form id="supplier-form" onSubmit={submit}>
      <div className="grid wide-left">
        <Card title="Provide the requested information">
          {actualReceipt && <><Note>Submitted response · {actualReceipt.reference}. This item is read-only. Corrections are unavailable in this prototype.</Note><Button onClick={() => navigate("S03")}>View this item’s receipt</Button></>}
          <fieldset disabled={Boolean(actualReceipt)} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <div className="field">
            <span>Document upload</span>
            <UploadList
              files={draft.fileName ? [{ name: draft.fileName }] : []}
              onChange={(files) => edit({ fileName: files[0]?.name || "" })}
            />
          </div>
          <Label
            title={
              item === data.request.items[0]
                ? "What service did the test cover?"
                : "What service and accounts did the review cover?"
            }
          >
            <textarea
              required
              value={draft.answer}
              onChange={(e) => edit({ answer: e.target.value })}
              placeholder="Describe the exercised service, date and any known limits."
            />
          </Label>
          <Label title="Supporting details">
            <div className="choices">
              {["Covers this service", "Related service only", "Not sure"].map(
                (scope) => (
                  <button
                    type="button"
                    key={scope}
                    aria-pressed={draft.scope === scope}
                    className={draft.scope === scope ? "chosen" : ""}
                    onClick={() => edit({ scope })}
                  >
                    {scope}
                  </button>
                ),
              )}
            </div>
          </Label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              onClick={() =>
                notify(
                  "Draft saved until refresh. Your response has not been submitted.",
                )
              }
            >
              Save draft
            </Button>
            <Button primary type="submit" icon="ArrowRight">
              Submit response
            </Button>
          </div>
          </fieldset>
        </Card>
        <Card title="Requirement details">
          <Fields
            items={[
              ["Item", state.supplierItem || item],
              ["Due", formatDate(data.request.due)],
              [
                "Acceptable proof",
                item === data.request.items[0]
                  ? "Exercise report or evidenced test log"
                  : "Dated access review or scoped access export",
              ],
              [
                "Status",
                <Badge>
                  {state.supplierReceipts?.[item]
                    ? "Submitted"
                    : "Not submitted"}
                </Badge>,
              ],
            ]}
          />
          <Note>
            Your answer and files will be reviewed. Uploading does not
            automatically satisfy the customer’s requirement.
          </Note>
          <Note>
            Local demo: only file metadata and answers are saved. File contents
            are not uploaded.
          </Note>
        </Card>
      </div>
    </form>
  );
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
      search: "Find a demo screen",
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
function Drawer(c) {
  const { kind, data, state, navigate, notify, setDrawer } = c;
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(data.defaults.conditionDue);
  const [control, setControl] = useState("");
  const [severity, setSeverity] = useState("");
  const [owner, setOwner] = useState("");
  if (kind === "screens" || kind === "search")
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
        if (kind === "finding")
          patch.extraFindings = [
            ...(state.extraFindings || []),
            {
              id: `F-${Date.now()}`,
              workspaceId: c.engagement.workspaceId,
              engagementId: c.engagement.id,
              client: c.engagement.client,
              supplier: c.engagement.supplier,
              service: c.engagement.service,
              issue: title,
              control,
              severity,
              owner: owner.trim(),
              state: "Open",
              due: date,
              evidence: details,
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
      {kind === "finding" && <>
        <Label title="Requirement"><select required value={control} onChange={e => setControl(e.target.value)}><option value="">Select requirement</option>{data.requirements.map(r => <option key={r.id} value={r.id}>{r.id} · {r.name}</option>)}</select></Label>
        <Label title="Severity"><select required value={severity} onChange={e => setSeverity(e.target.value)}><option value="">Select severity</option>{["Low", "Medium", "High", "Critical"].map(s => <option key={s}>{s}</option>)}</select></Label>
        <Label title="Finding owner"><input required value={owner} onChange={e => { e.target.setCustomValidity(""); setOwner(e.target.value); }} /></Label>
      </>}
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
