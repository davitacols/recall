import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";

const PLAN_ORDER = { free: 0, professional: 1, business: 2, enterprise: 3 };

function comparePlans(a, b) {
  return (PLAN_ORDER[a.name] || 0) - (PLAN_ORDER[b.name] || 0);
}

function money(amount, currency = "USD") {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch (_) {
    return `${amount} ${currency}`;
  }
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Subscription() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = ["admin", "owner"].includes(user?.role) || user?.is_admin;
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({ loading: false, plan: "" });
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    const [subRes, planRes, invoiceRes] = await Promise.allSettled([
      api.get("/api/organizations/subscription/"),
      api.get("/api/organizations/plans/"),
      api.get("/api/organizations/invoices/"),
    ]);
    if (subRes.status === "fulfilled") setSubscription(subRes.value.data || null);
    else setError(subRes.reason?.response?.data?.error || "Unable to load subscription.");
    setPlans(planRes.status === "fulfilled" ? [...(planRes.value.data || [])].sort(comparePlans) : []);
    setInvoices(invoiceRes.status === "fulfilled" ? invoiceRes.value.data || [] : []);
    setLoading(false);
  };

  const currentPlanName = subscription?.plan?.name;

  const handlePlanAction = async (plan) => {
    if (!canManage) {
      setError("Only workspace admins can change billing.");
      return;
    }
    if (plan.name === currentPlanName) return;
    if (plan.name === "enterprise") {
      navigate("/enterprise");
      return;
    }
    setActionState({ loading: true, plan: plan.name });
    setError("");
    setNotice(null);
    try {
      if (plan.name === "free") {
        await api.post("/api/organizations/subscription/upgrade/", { plan_id: plan.id });
        setNotice({ tone: "success", text: `${plan.display_name || plan.name} is now active.` });
        await fetchAll();
      } else {
        const res = await api.post("/api/organizations/stripe/checkout/", {
          plan: plan.name,
          success_url: `${window.location.origin}/subscription?success=true`,
          cancel_url: `${window.location.origin}/subscription?canceled=true`,
        });
        if (res?.data?.url) {
          window.location.assign(res.data.url);
          return;
        }
        throw new Error("Billing checkout is unavailable.");
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to change plan");
    } finally {
      setActionState({ loading: false, plan: "" });
    }
  };

  const openPortal = async () => {
    try {
      const res = await api.post("/api/organizations/stripe/portal/", {});
      if (res?.data?.url) {
        window.location.assign(res.data.url);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to open billing portal");
    }
  };

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Subscription" }]}
        title="Subscription & billing"
        subtitle="Manage your workspace plan, billing, and invoices."
        actions={
          subscription?.billing?.has_payment_profile ? (
            <Button appearance="subtle" iconBefore={<CreditCardIcon style={{ width: 14, height: 14 }} />} onClick={openPortal}>
              Billing portal
            </Button>
          ) : null
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}
      {notice ? <SectionMessage tone={notice.tone || "info"} style={{ marginTop: 16 }}>{notice.text}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16, height: 240, background: "var(--n20)", borderRadius: 4 }} />
      ) : (
        <>
          <CurrentPlanCard subscription={subscription} />
          <PlanGrid plans={plans} current={currentPlanName} canManage={canManage} action={handlePlanAction} actionState={actionState} />
          <InvoicesTable invoices={invoices} />
        </>
      )}
    </div>
  );
}

function CurrentPlanCard({ subscription }) {
  if (!subscription) return null;
  const plan = subscription.plan || {};
  return (
    <section style={{ marginTop: 16, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 24, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <p style={panelEyebrow}>Current plan</p>
        <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 500 }}>{plan.display_name || plan.name}</p>
        {subscription.status ? <Lozenge variant={subscription.status === "active" ? "success" : "moved"}>{subscription.status}</Lozenge> : null}
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={panelEyebrow}>Renews</p>
        <p style={{ margin: "4px 0 0", fontSize: 14 }}>{formatDate(subscription.current_period_end || subscription.renews_at)}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--app-muted)" }}>
          {subscription.billing?.provider ? `Billing via ${subscription.billing.provider}` : ""}
        </p>
      </div>
    </section>
  );
}

function PlanGrid({ plans, current, canManage, action, actionState }) {
  if (!plans.length) {
    return (
      <section style={{ marginTop: 16 }}>
        <EmptyState title="No plans configured" description="Contact your workspace administrator." />
      </section>
    );
  }
  return (
    <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      {plans.map((p) => {
        const isCurrent = p.name === current;
        const isLoading = actionState.loading && actionState.plan === p.name;
        return (
          <article key={p.name} style={{
            background: "var(--app-surface)",
            border: isCurrent ? "2px solid var(--b400)" : "1px solid var(--app-border)",
            borderRadius: 4,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.display_name || p.name}</p>
                {isCurrent ? <Lozenge variant="inprogress">Current</Lozenge> : null}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 500 }}>
                {p.price_cents ? money(p.price_cents / 100, p.currency || "USD") : p.name === "free" ? "Free" : "—"}
                {p.price_cents ? <span style={{ fontSize: 13, color: "var(--app-muted)" }}> /month</span> : null}
              </p>
            </div>
            {p.description ? <p style={{ margin: 0, fontSize: 13, color: "var(--app-muted)" }}>{p.description}</p> : null}
            {Array.isArray(p.features) && p.features.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                {p.features.slice(0, 6).map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <CheckIcon style={{ width: 14, height: 14, color: "var(--g500)", marginTop: 2, flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
              {isCurrent ? (
                <Button appearance="subtle" isDisabled>
                  Current plan
                </Button>
              ) : p.name === "enterprise" ? (
                <Button appearance="default" onClick={() => action(p)}>Contact sales</Button>
              ) : (
                <Button appearance="primary" onClick={() => action(p)} isDisabled={!canManage || isLoading}>
                  {isLoading ? "Working…" : `Switch to ${p.display_name || p.name}`}
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function InvoicesTable({ invoices }) {
  if (!invoices.length) {
    return null;
  }
  return (
    <section style={{ marginTop: 16 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Invoices</h2>
      <div style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--app-surface-alt)" }}>
              <th style={th}>Number</th>
              <th style={th}>Status</th>
              <th style={th}>Amount</th>
              <th style={th}>Date</th>
              <th style={{ ...th, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                <td style={td}>{inv.number || inv.id}</td>
                <td style={td}><Lozenge variant={inv.status === "paid" ? "success" : inv.status === "open" ? "inprogress" : "default"}>{inv.status}</Lozenge></td>
                <td style={td}>{money((inv.amount_due ?? inv.total ?? 0) / 100, inv.currency || "USD")}</td>
                <td style={td}><span style={{ color: "var(--app-muted)", fontSize: 13 }}>{formatDate(inv.created_at || inv.created)}</span></td>
                <td style={{ ...td, textAlign: "right" }}>
                  {inv.hosted_invoice_url || inv.pdf_url ? (
                    <Button appearance="subtle" size="sm" iconBefore={<ArrowDownTrayIcon style={{ width: 12, height: 12 }} />} onClick={() => window.open(inv.hosted_invoice_url || inv.pdf_url)}>
                      Download
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const panelEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--app-muted)",
};

const th = { textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--app-muted)", padding: "10px 16px", borderBottom: "1px solid var(--app-border)" };
const td = { padding: "10px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };
