import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckCircleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const PLAN_ORDER = { free: 0, starter: 1, professional: 2, enterprise: 3 };
const FEATURES = [
  ["projects", "Projects and issue tracking"],
  ["basic_sprints", "Sprint workflows"],
  ["advanced_analytics", "Advanced analytics"],
  ["decision_twin", "Decision Twin"],
  ["decision_debt_ledger", "Decision Debt Ledger"],
  ["api_access", "API access"],
  ["priority_support", "Priority support"],
  ["sso_saml", "SSO / SAML"],
  ["custom_integrations", "Custom integrations"],
];
const PLAN_COPY = {
  free: "Best for very small teams validating the workflow and keeping the decision trail lightweight.",
  starter: "Adds room for a growing team that wants more seats and storage without enterprise overhead.",
  professional: "Unlocks the full decision-grade operating layer: analytics, Decision Twin, debt tracking, and API access.",
  enterprise: "For governance, procurement, identity rollout, and custom deployment support.",
};
const PLAN_HIGHLIGHTS = {
  free: ["Small team validation", "Basic sprint workflows", "Light storage footprint"],
  starter: ["Growing team seats", "More storage runway", "Operational basics without procurement"],
  professional: ["Decision-grade workflows", "Analytics and AI operating layer", "API and priority support"],
  enterprise: ["Identity and governance", "Custom rollout support", "Enterprise security and procurement"],
};
const PAYPAL_SDK_SCRIPT_ID = "paypal-js-sdk";

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function comparePlans(left, right) {
  return (PLAN_ORDER[left?.name] || 0) - (PLAN_ORDER[right?.name] || 0);
}

function isLocalBillingEnvironment() {
  if (typeof window === "undefined") return false;
  return process.env.NODE_ENV !== "production" || ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function loadPayPalSdk(clientId) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PayPal checkout is only available in the browser."));
  }
  if (!clientId) {
    return Promise.reject(new Error("PayPal client ID is missing from the frontend environment."));
  }
  if (window.paypal?.Buttons) {
    return Promise.resolve(window.paypal);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(PAYPAL_SDK_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.paypal), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load the PayPal checkout SDK.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = PAYPAL_SDK_SCRIPT_ID;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons&vault=true&intent=subscription`;
    script.async = true;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error("Unable to load the PayPal checkout SDK."));
    document.body.appendChild(script);
  });
}

function planSupports(plan, featureKey) {
  return Boolean(plan?.features?.[featureKey]);
}

function Banner({ palette, tone, text }) {
  const tones = {
    success: { bg: "rgba(47,127,95,0.12)", color: palette.success },
    warn: { bg: "rgba(168,116,57,0.14)", color: palette.warn },
    danger: { bg: "rgba(200,86,93,0.14)", color: palette.danger },
    info: { bg: palette.accentSoft, color: palette.accent },
  };
  const selected = tones[tone] || tones.info;
  return (
    <div style={{ borderRadius: 16, padding: "12px 14px", background: selected.bg, color: selected.color, fontSize: 13, lineHeight: 1.55 }}>
      {text}
    </div>
  );
}

function UsageMeter({ palette, label, value, helper, progress }) {
  return (
    <div style={{ borderRadius: 20, padding: 16, border: `1px solid ${palette.border}`, background: palette.cardAlt, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1, letterSpacing: "-0.03em", color: palette.text, fontWeight: 800 }}>
          {value}
        </p>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: palette.progressTrack, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(Math.max(Number(progress || 0), 0), 100)}%`, height: "100%", borderRadius: 999, background: palette.ctaGradient }} />
      </div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: palette.muted }}>
        {helper}
      </p>
    </div>
  );
}

function UpgradeCue({ palette, icon: Icon, title, body }) {
  return (
    <article style={{ borderRadius: 20, padding: 16, border: `1px solid ${palette.border}`, background: palette.cardAlt, display: "grid", gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 14, display: "grid", placeItems: "center", background: palette.accentSoft, color: palette.accent }}>
        <Icon style={{ width: 18, height: 18 }} />
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{title}</p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{body}</p>
      </div>
    </article>
  );
}

function PlanCard({ palette, ui, plan, currentPlanName, actionState, handlePlanAction, canManageBilling }) {
  const isCurrent = plan.name === currentPlanName;
  const isBusy = actionState.loading && actionState.plan === plan.name;
  const isDisabled = isCurrent || isBusy || !canManageBilling;
  const currentRank = PLAN_ORDER[currentPlanName] || 0;
  const isUpgrade = (PLAN_ORDER[plan.name] || 0) > currentRank;
  const isRecommended = plan.name === "professional";

  return (
    <article
      style={{
        borderRadius: 24,
        padding: 18,
        display: "grid",
        gap: 14,
        border: `1px solid ${isRecommended ? palette.accent : palette.border}`,
        background: isRecommended ? palette.card : palette.cardAlt,
        boxShadow: isRecommended ? "var(--ui-shadow-sm)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted }}>
            {plan.name}
          </p>
          <h3 style={{ margin: 0, fontSize: 28, lineHeight: 0.95, letterSpacing: "-0.05em", color: palette.text, fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            {plan.display_name}
          </h3>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {isRecommended ? (
            <span style={{ borderRadius: 999, padding: "6px 10px", background: palette.accentSoft, color: palette.accent, fontSize: 11, fontWeight: 800 }}>
              Recommended
            </span>
          ) : null}
          {isCurrent ? (
            <span style={{ borderRadius: 999, padding: "6px 10px", background: "rgba(47,127,95,0.12)", color: palette.success, fontSize: 11, fontWeight: 800 }}>
              Current
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 38, fontWeight: 800, color: palette.text }}>{formatMoney(plan.price_per_user)}</span>
        <span style={{ fontSize: 13, color: palette.muted }}>/member/mo</span>
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: palette.muted }}>
        {PLAN_COPY[plan.name] || "Plan details unavailable."}
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {(PLAN_HIGHLIGHTS[plan.name] || []).map((item) => (
          <div key={item} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: palette.text }}>
            <CheckCircleIcon style={{ width: 14, height: 14, color: palette.success, flexShrink: 0 }} />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 6, fontSize: 12, color: palette.muted }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <UserGroupIcon style={{ width: 14, height: 14, color: palette.info }} />
          <span>{plan.max_users ? `Up to ${plan.max_users} users` : "Unlimited users"}</span>
        </div>
        <div>{plan.storage_gb}GB storage</div>
        <div>{(plan.features_included || []).length} enabled capabilities</div>
      </div>

      <button
        className="ui-btn-polish ui-focus-ring"
        onClick={() => handlePlanAction(plan)}
        disabled={isDisabled}
        style={{
          ...(plan.name === "professional" ? ui.primaryButton : ui.secondaryButton),
          justifyContent: "center",
          opacity: isDisabled ? 0.7 : 1,
        }}
      >
        {isBusy ? (
          <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
        ) : isUpgrade ? (
          <SparklesIcon style={{ width: 14, height: 14 }} />
        ) : (
          <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />
        )}
        {!canManageBilling
          ? "Admins manage billing"
          : isCurrent
          ? "Current plan"
          : plan.name === "enterprise"
            ? "Talk to sales"
            : plan.name === "free"
              ? "Move to Free"
              : isUpgrade
                ? `Upgrade to ${plan.display_name}`
                : `Switch to ${plan.display_name}`}
      </button>
    </article>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const canManageBilling = user?.role === "admin";
  const paypalClientId = (process.env.REACT_APP_PAYPAL_CLIENT_ID || "").trim();

  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [conversion, setConversion] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({ loading: false, plan: "", error: "" });
  const [billingBusy, setBillingBusy] = useState(false);
  const [paypalBusy, setPaypalBusy] = useState(false);
  const [paypalError, setPaypalError] = useState("");
  const [paypalPendingPlan, setPaypalPendingPlan] = useState(null);
  const paypalButtonHostRef = useRef(null);
  const paypalButtonsRef = useRef(null);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setNotice({ tone: "success", text: "Checkout completed. Billing will refresh shortly." });
    }
    if (searchParams.get("canceled") === "true") {
      setNotice({ tone: "warn", text: "Checkout was canceled. The current plan did not change." });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [canManageBilling]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    const [subRes, planRes, invoiceRes, conversionRes, stripeRes, paypalRes] = await Promise.allSettled([
      api.get("/api/organizations/subscription/"),
      api.get("/api/organizations/plans/"),
      api.get("/api/organizations/invoices/"),
      api.get("/api/organizations/subscription/conversion/"),
      api.get("/api/organizations/stripe/status/"),
      canManageBilling ? api.get("/api/organizations/paypal/config/") : Promise.resolve({ data: null }),
    ]);

    if (subRes.status === "fulfilled") setSubscription(subRes.value.data || null);
    else setError(subRes.reason?.response?.data?.error || "Unable to load subscription.");

    if (planRes.status === "fulfilled") setPlans([...(planRes.value.data || [])].sort(comparePlans));
    else setPlans([]);

    setInvoices(invoiceRes.status === "fulfilled" ? invoiceRes.value.data || [] : []);
    setConversion(conversionRes.status === "fulfilled" ? conversionRes.value.data || null : null);
    setStripeStatus(stripeRes.status === "fulfilled" ? stripeRes.value.data || null : null);
    setPaypalConfig(paypalRes.status === "fulfilled" ? paypalRes.value.data || null : null);
    setLoading(false);
  };

  const switchPlanDirect = async (plan) => {
    await api.post("/api/organizations/subscription/upgrade/", { plan_id: plan.id });
    await fetchData();
  };

  const handlePlanAction = async (plan) => {
    if (!subscription || actionState.loading || paypalBusy || plan.name === subscription.plan.name) return;
    if (!canManageBilling) {
      setActionState({ loading: false, plan: "", error: "Only workspace admins can change billing." });
      return;
    }
    if (plan.name === "enterprise") {
      navigate("/enterprise");
      return;
    }

    const currentRank = PLAN_ORDER[subscription.plan.name] || 0;
    const nextRank = PLAN_ORDER[plan.name] || 0;
    const directSwitch = plan.name === "free" || nextRank <= currentRank;
    const provider = subscription?.billing?.provider || "manual";
    setActionState({ loading: true, plan: plan.name, error: "" });
    setPaypalError("");

    try {
      if (directSwitch && subscription?.billing?.has_payment_profile) {
        if (provider === "stripe") {
          throw new Error("Use the billing portal to downgrade or cancel Stripe-managed plans.");
        }
        if (provider === "paypal") {
          throw new Error("Manage PayPal subscription downgrades or cancellations in PayPal first, then refresh this workspace.");
        }
      }
      if (directSwitch) {
        setPaypalPendingPlan(null);
        await switchPlanDirect(plan);
        setNotice({ tone: "success", text: `${plan.display_name} is now active for this workspace.` });
      } else if (provider === "paypal") {
        const planId = paypalConfig?.plan_ids?.[plan.name];
        if (!paypalClientId || !planId) {
          throw new Error("PayPal checkout is not configured for this plan yet.");
        }
        setPaypalPendingPlan(plan);
        setNotice({
          tone: "info",
          text: `Finish ${plan.display_name} in PayPal. The workspace plan updates after server-side verification.`,
        });
      } else {
        const response = await api.post("/api/organizations/stripe/checkout/", {
          plan: plan.name,
          success_url: `${window.location.origin}/subscription?success=true`,
          cancel_url: `${window.location.origin}/subscription?canceled=true`,
        });
        if (!response?.data?.url) throw new Error("Billing checkout is unavailable.");
        window.location.assign(response.data.url);
        return;
      }
    } catch (actionError) {
      const message = actionError?.response?.data?.error || actionError?.message || "Unable to change the plan right now.";
      if (!directSwitch && isLocalBillingEnvironment()) {
        try {
          await switchPlanDirect(plan);
          setNotice({
            tone: "info",
            text: `${plan.display_name} was applied directly because billing checkout is not configured in this environment.`,
          });
          setActionState({ loading: false, plan: "", error: "" });
          return;
        } catch (fallbackError) {
          setActionState({
            loading: false,
            plan: "",
            error: fallbackError?.response?.data?.error || message,
          });
          return;
        }
      }
      setActionState({ loading: false, plan: "", error: message });
      return;
    }

    setActionState({ loading: false, plan: "", error: "" });
  };

  useEffect(() => {
    if (!paypalPendingPlan || !canManageBilling) return undefined;

    const planId = paypalConfig?.plan_ids?.[paypalPendingPlan.name];
    const host = paypalButtonHostRef.current;
    if (!paypalClientId || !planId || !host) return undefined;

    let active = true;
    host.innerHTML = "";

    const renderButtons = async () => {
      try {
        const paypal = await loadPayPalSdk(paypalClientId);
        if (!active || !paypal?.Buttons || !paypalButtonHostRef.current) return;

        if (paypalButtonsRef.current?.close) {
          try {
            paypalButtonsRef.current.close();
          } catch (closeError) {
            // Ignore stale button cleanup failures.
          }
        }

        const buttons = paypal.Buttons({
          style: {
            layout: "vertical",
            shape: "rect",
            label: "subscribe",
          },
          createSubscription(data, actions) {
            return actions.subscription.create({
              plan_id: planId,
            });
          },
          async onApprove(data) {
            if (!active) return;
            setPaypalBusy(true);
            setPaypalError("");
            try {
              await api.post("/api/organizations/paypal/activate/", {
                plan: paypalPendingPlan.name,
                subscription_id: data.subscriptionID,
              });
              setPaypalPendingPlan(null);
              setNotice({
                tone: "success",
                text: `${paypalPendingPlan.display_name} is now active via PayPal.`,
              });
              await fetchData();
            } catch (approveError) {
              const message =
                approveError?.response?.data?.error ||
                approveError?.message ||
                "PayPal checkout was approved, but the workspace plan could not be activated.";
              setPaypalError(message);
            } finally {
              if (active) setPaypalBusy(false);
            }
          },
          onCancel() {
            if (!active) return;
            setNotice({
              tone: "warn",
              text: "PayPal checkout was canceled. The workspace plan did not change.",
            });
          },
          onError(buttonError) {
            if (!active) return;
            setPaypalError(buttonError?.message || "Unable to start PayPal checkout.");
          },
        });

        paypalButtonsRef.current = buttons;
        if (typeof buttons.isEligible === "function" && !buttons.isEligible()) {
          setPaypalError("PayPal checkout is not eligible in this browser session.");
          return;
        }
        await buttons.render(paypalButtonHostRef.current);
      } catch (sdkError) {
        if (!active) return;
        setPaypalError(sdkError?.message || "Unable to load PayPal checkout.");
      }
    };

    renderButtons();

    return () => {
      active = false;
      if (paypalButtonsRef.current?.close) {
        try {
          paypalButtonsRef.current.close();
        } catch (closeError) {
          // Ignore cleanup issues during rerender/unmount.
        }
      }
      paypalButtonsRef.current = null;
      if (host) host.innerHTML = "";
    };
  }, [canManageBilling, paypalClientId, paypalConfig, paypalPendingPlan]);

  const handleBillingPortal = async () => {
    setBillingBusy(true);
    try {
      const response = await api.post("/api/organizations/stripe/portal/", {});
      if (!response?.data?.url) throw new Error("Billing portal is unavailable.");
      window.location.assign(response.data.url);
    } catch (portalError) {
      setNotice({
        tone: "warn",
        text: portalError?.response?.data?.error || portalError?.message || "Unable to open billing management.",
      });
    } finally {
      setBillingBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ height: 180, borderRadius: 24, background: palette.card, border: `1px solid ${palette.border}` }} />
        <div style={{ height: 360, borderRadius: 24, background: palette.card, border: `1px solid ${palette.border}` }} />
      </div>
    );
  }

  if (!subscription) {
    return (
      <WorkspaceEmptyState
        palette={palette}
        title="Pricing is unavailable"
        description={error || "The workspace subscription could not be loaded."}
        action={<button className="ui-btn-polish ui-focus-ring" onClick={fetchData} style={ui.primaryButton}>Retry</button>}
      />
    );
  }

  const currentPlan = subscription.plan;
  const activeBillingProvider = subscription?.billing?.provider || "manual";
  const currentUsers = Number(subscription.user_count || 0);
  const seatSummary = subscription.seat_summary || {};
  const seatLimit = seatSummary.seat_limit;
  const reservedSeats = seatSummary.reserved_seats ?? currentUsers;
  const pendingInvites = seatSummary.pending_invitations ?? 0;
  const monthlyRunRate = Number(currentPlan.price_per_user || 0) * currentUsers;
  const storageUsedGb = Number(subscription.storage_used_mb || 0) / 1024;
  const storageProgress = Math.min(Number(subscription.storage_percentage || 0), 100);
  const hasBillingPortal = activeBillingProvider === "stripe" && Boolean(subscription?.billing?.portal_enabled || stripeStatus?.has_subscription);
  const recommendedPlan = plans.find((plan) => plan.name === conversion?.recommended_plan) || plans.find((plan) => plan.name === "professional");
  const matrixColumns = `minmax(0,1.5fr) repeat(${Math.max(plans.length, 1)}, minmax(78px, 0.7fr))`;
  const topNudges = (conversion?.nudges || []).slice(0, 3);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Pricing & Upgrade"
        title="Pricing that matches your team's operating depth."
        description="Move from lightweight workspace validation into a full decision-grade operating layer without losing sight of seats, storage, and the upgrade moments happening inside the product."
        stats={[
          { label: "Current Plan", value: currentPlan.display_name, helper: subscription.status === "trial" ? `${subscription.trial_days_left || 0} trial day(s) left` : String(subscription.status || "").toUpperCase(), tone: palette.accent },
          { label: "Reserved Seats", value: seatLimit ? `${reservedSeats}/${seatLimit}` : reservedSeats, helper: `${currentUsers} active, ${pendingInvites} pending invites`, tone: palette.text },
          { label: "Run Rate", value: formatMoney(monthlyRunRate), helper: `${formatMoney(currentPlan.price_per_user)} per active member`, tone: palette.success },
          { label: "Storage", value: `${storageUsedGb.toFixed(1)}GB`, helper: `of ${currentPlan.storage_gb}GB used`, tone: palette.info },
        ]}
        aside={
          <div style={{ borderRadius: 24, padding: 18, border: `1px solid ${palette.border}`, background: palette.card, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: palette.muted }}>
                Recommended Next Move
              </p>
              <h3 style={{ margin: 0, fontSize: 24, lineHeight: 1.02, letterSpacing: "-0.05em", color: palette.text, fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {recommendedPlan?.display_name || "Review plans"}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                {recommendedPlan ? PLAN_COPY[recommendedPlan.name] : "Upgrade cues become clearer once the team starts using projects, sprints, and decision workflows."}
              </p>
            </div>
            {topNudges.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {topNudges.map((nudge) => (
                  <div key={nudge} style={{ borderRadius: 16, padding: "10px 12px", border: `1px solid ${palette.border}`, background: palette.cardAlt, fontSize: 12, lineHeight: 1.55, color: palette.text }}>
                    {nudge}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        }
        actions={
          <>
            {canManageBilling && hasBillingPortal ? (
              <button className="ui-btn-polish ui-focus-ring" onClick={handleBillingPortal} disabled={billingBusy} style={ui.primaryButton}>
                <CreditCardIcon style={{ width: 14, height: 14 }} />
                {billingBusy ? "Opening..." : "Manage Billing"}
              </button>
            ) : null}
            <Link className="ui-btn-polish ui-focus-ring" to="/enterprise" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              <BuildingOffice2Icon style={{ width: 14, height: 14 }} />
              Enterprise
            </Link>
            <button className="ui-btn-polish ui-focus-ring" onClick={fetchData} style={ui.secondaryButton}>
              <ArrowPathIcon style={{ width: 14, height: 14 }} />
              Refresh
            </button>
          </>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "grid", gap: 10 }}>
          {notice ? <Banner palette={palette} tone={notice.tone} text={notice.text} /> : null}
          {actionState.error ? <Banner palette={palette} tone="danger" text={actionState.error} /> : null}
          {!canManageBilling ? (
            <Banner palette={palette} tone="info" text="Only workspace admins can change plans or open billing checkout." />
          ) : null}
          {canManageBilling && activeBillingProvider === "paypal" ? (
            <Banner
              palette={palette}
              tone="info"
              text="PayPal is the active self-serve billing provider for this workspace. Paid plan changes are verified server-side after PayPal approval."
            />
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
              Upgrade nudges now come from actual usage: members, invites, storage, sprint workflows, and decision tooling.
            </p>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/projects")} style={ui.secondaryButton}>
              <SparklesIcon style={{ width: 14, height: 14 }} />
              Continue Setup
            </button>
          </div>
        </div>
      </WorkspaceToolbar>

      {paypalPendingPlan ? (
        <WorkspacePanel
          palette={palette}
          eyebrow="PayPal Checkout"
          title={`Finish ${paypalPendingPlan.display_name} in PayPal`}
          description="Use the PayPal subscription button below. Once PayPal approves the subscription, the workspace plan is verified on the server before the billing state refreshes."
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
                Plan target: <strong>{paypalPendingPlan.display_name}</strong>
              </p>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={() => {
                  setPaypalPendingPlan(null);
                  setPaypalError("");
                }}
                disabled={paypalBusy}
                style={ui.secondaryButton}
              >
                Cancel
              </button>
            </div>
            {paypalError ? <Banner palette={palette} tone="danger" text={paypalError} /> : null}
            {paypalBusy ? <Banner palette={palette} tone="info" text="Finalizing PayPal approval and refreshing workspace billing…" /> : null}
            <div
              ref={paypalButtonHostRef}
              style={{
                minHeight: 48,
                borderRadius: 18,
                border: `1px dashed ${palette.border}`,
                background: palette.cardAlt,
                padding: 12,
              }}
            />
          </div>
        </WorkspacePanel>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(320px,0.8fr)", gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Usage Runway"
          title="Watch seat and storage pressure before it becomes friction"
          description="The strongest upgrade cues are the ones teams can feel in their day-to-day workflow. Show them clearly."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <UsageMeter
              palette={palette}
              label="Seat usage"
              value={seatLimit ? `${reservedSeats}/${seatLimit}` : `${reservedSeats}`}
              helper={seatLimit ? `${currentUsers} active members and ${pendingInvites} pending invitations reserving seats.` : "Unlimited seats on the current plan."}
              progress={seatLimit ? Number(seatSummary.occupancy_percentage || 0) : 100}
            />
            <UsageMeter
              palette={palette}
              label="Storage usage"
              value={`${storageUsedGb.toFixed(1)}GB`}
              helper={`Current plan includes ${currentPlan.storage_gb}GB of workspace storage.`}
              progress={storageProgress}
            />
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Upgrade Moments"
          title="What usually triggers a plan change"
          description="These signals map the billing story to real product behavior instead of generic pricing copy."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <UpgradeCue
              palette={palette}
              icon={UserGroupIcon}
              title="Team expansion"
              body={seatLimit ? `Reserved seats are at ${reservedSeats}/${seatLimit}. Pending invites now count toward capacity.` : "Unlimited seats keep invite pressure low on this plan."}
            />
            <UpgradeCue
              palette={palette}
              icon={ChartBarIcon}
              title="Decision-grade operations"
              body="Professional becomes the natural step once analytics, Decision Twin, and decision debt signals matter to delivery."
            />
            <UpgradeCue
              palette={palette}
              icon={ShieldCheckIcon}
              title="Governance and rollout"
              body="Enterprise is the path when security review, SSO, procurement, or custom deployment expectations appear."
            />
          </div>
        </WorkspacePanel>
      </div>

      <WorkspacePanel
        palette={palette}
        eyebrow="Plan Lineup"
        title="Choose the billing posture that matches the workspace"
        description="Self-serve plans handle direct switching and checkout. Enterprise routes into a dedicated rollout surface."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              palette={palette}
              ui={ui}
              plan={plan}
              currentPlanName={currentPlan.name}
              actionState={actionState}
              handlePlanAction={handlePlanAction}
              canManageBilling={canManageBilling}
            />
          ))}
        </div>
      </WorkspacePanel>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(320px,0.85fr)", gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Capability Matrix"
          title="Where the plans actually diverge"
          description="Use a tighter view of the capabilities that genuinely influence an upgrade decision."
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: matrixColumns, gap: 8, alignItems: "center", padding: "0 10px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted }}>
              <span>Capability</span>
              {plans.map((plan) => (
                <span key={`label-${plan.id}`} style={{ textAlign: "center" }}>
                  {plan.display_name}
                </span>
              ))}
            </div>
            {FEATURES.map(([key, label]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: matrixColumns, gap: 8, alignItems: "center", borderRadius: 16, padding: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: palette.text }}>{label}</span>
                {plans.map((plan) => (
                  <span key={`${key}-${plan.id}`} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: planSupports(plan, key) ? palette.success : palette.muted }}>
                    {planSupports(plan, key) ? "Included" : "-"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Billing History"
          title="Recent invoices"
          description="Keep billing review close to the pricing decisions instead of buried in a separate admin trail."
        >
          {invoices.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No invoices yet"
              description="Invoices appear once the workspace moves onto a paid billing cycle."
            />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {invoices.map((invoice) => (
                <article
                  key={invoice.id}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    border: `1px solid ${palette.border}`,
                    background: palette.cardAlt,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>
                        {formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                        Due {formatDate(invoice.due_date)}
                      </p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{formatMoney(invoice.amount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: invoice.status === "paid" ? palette.success : palette.warn }}>
                      {String(invoice.status || "open").toUpperCase()}
                    </span>
                    {invoice.invoice_pdf ? (
                      <a href={invoice.invoice_pdf} target="_blank" rel="noreferrer" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                        <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />
                        Open PDF
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: palette.muted }}>No PDF yet</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}
