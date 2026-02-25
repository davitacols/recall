import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";

function Login() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");
  const inviteEmail = searchParams.get("email");

  const [isLogin, setIsLogin] = useState(!inviteToken);
  const [credentials, setCredentials] = useState({
    username: inviteEmail || "",
    password: "",
    token: inviteToken || "",
    organization: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (isLogin) {
      const result = await login(credentials);
      if (result.success) {
        addToast("Welcome back!", "success");
        window.location.href = "/";
      } else {
        setError(result.error);
        addToast(result.error, "error");
      }
    } else {
      const result = await register(credentials);
      if (result.success) {
        setIsLogin(true);
        setCredentials({
          username: inviteEmail || "",
          password: "",
          token: "",
          organization: "",
        });
        addToast(
          inviteToken
            ? "Account created! Please sign in."
            : "Organization created! Please sign in.",
          "success"
        );
      } else {
        setError(result.error);
        addToast(result.error, "error");
      }
    }

    setLoading(false);
  };

  return (
    <div style={page}>
      <style>{responsiveStyles}</style>
      <div style={ambientGlowTop} />
      <div style={ambientGlowBottom} />

      <div style={layout}>
        <motion.aside
          className="login-side-panel"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
          style={sidePanel}
        >
          <button onClick={() => navigate("/")} style={brandButton}>
            <span style={brandMark}>K</span>
            <span style={brandText}>Knoledgr</span>
          </button>

          <div>
            <p style={eyebrow}>KNOWLEDGE OPERATING SYSTEM</p>
            <h1 style={headline}>Team memory that compounds every sprint.</h1>
            <p style={supportingCopy}>
              Turn scattered decisions into a durable source of truth. Knoledgr
              keeps context discoverable when stakes are high.
            </p>
          </div>

          <div style={signalList}>
            {[
              "Decision history with source links",
              "Meeting and doc context in one timeline",
              "Clear ownership and auditability",
            ].map((item) => (
              <div key={item} style={signalItem}>
                <span style={signalDot} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.55 }}
          style={formSection}
        >
          <div style={formCard}>
            <div style={formHeader}>
              <p style={formEyebrow}>{isLogin ? "WELCOME BACK" : "GET STARTED"}</p>
              <h2 style={formTitle}>
                {isLogin ? "Sign in to Knoledgr" : inviteToken ? "Join your workspace" : "Create your workspace"}
              </h2>
              <p style={formSubtitle}>
                {isLogin
                  ? "Continue where your team left off."
                  : "Set up your account and start organizing team knowledge."}
              </p>
            </div>

            {!inviteToken && (
              <div style={modeToggleWrap}>
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  style={isLogin ? activeToggleButton : inactiveToggleButton}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  style={!isLogin ? activeToggleButton : inactiveToggleButton}
                >
                  Sign up
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={formStack}>
              {error && <div style={errorBox}>{error}</div>}

              {!isLogin && !inviteToken && (
                <Field label="Organization name">
                  <input
                    type="text"
                    required
                    style={input}
                    placeholder="Acme Inc"
                    value={credentials.organization}
                    onChange={(event) =>
                      setCredentials({
                        ...credentials,
                        organization: event.target.value,
                      })
                    }
                  />
                </Field>
              )}

              <Field label="Email address">
                <input
                  type="email"
                  required
                  disabled={!!inviteToken}
                  style={{ ...input, ...(inviteToken ? disabledInput : {}) }}
                  placeholder="you@company.com"
                  value={credentials.username}
                  onChange={(event) =>
                    setCredentials({ ...credentials, username: event.target.value })
                  }
                />
              </Field>

              <Field label="Password">
                <div style={passwordWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    style={{ ...input, paddingRight: 44 }}
                    placeholder="********"
                    value={credentials.password}
                    onChange={(event) =>
                      setCredentials({ ...credentials, password: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={passwordToggle}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon style={eyeIcon} />
                    ) : (
                      <EyeIcon style={eyeIcon} />
                    )}
                  </button>
                </div>
              </Field>

              <button type="submit" disabled={loading} style={submitButton(loading)}>
                {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
              </button>
            </form>

            <div style={footerActions}>
              {isLogin && !inviteToken && (
                <p style={smallText}>
                  No account?{" "}
                  <button
                    onClick={() => setIsLogin(false)}
                    style={inlineLinkButton}
                    type="button"
                  >
                    Sign up
                  </button>
                </p>
              )}
              <button
                onClick={() => navigate("/")}
                type="button"
                style={backButton}
              >
                {'<'} Back to home
              </button>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={fieldLabelWrap}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

const responsiveStyles = `
  * { box-sizing: border-box; }
  .login-side-panel { display: flex; }
  @media (max-width: 960px) {
    .login-side-panel { display: none !important; }
  }
`;

const page = {
  minHeight: "100vh",
  padding: 20,
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(1200px 500px at 0% 0%, rgba(255,170,80,0.22), transparent 60%), radial-gradient(900px 500px at 100% 100%, rgba(75,190,170,0.16), transparent 60%), #140f11",
  color: "#f7efe3",
  fontFamily: "'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif",
};

const ambientGlowTop = {
  position: "absolute",
  width: 520,
  height: 520,
  top: -180,
  left: -160,
  borderRadius: "50%",
  background: "rgba(255, 160, 95, 0.16)",
  filter: "blur(60px)",
  pointerEvents: "none",
};

const ambientGlowBottom = {
  position: "absolute",
  width: 520,
  height: 520,
  right: -180,
  bottom: -220,
  borderRadius: "50%",
  background: "rgba(96, 221, 198, 0.14)",
  filter: "blur(60px)",
  pointerEvents: "none",
};

const layout = {
  position: "relative",
  zIndex: 1,
  minHeight: "calc(100vh - 40px)",
  width: "min(1160px, 100%)",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "1fr min(500px, 100%)",
  border: "1px solid rgba(255,240,222,0.12)",
  borderRadius: 24,
  overflow: "hidden",
  background: "rgba(14, 10, 12, 0.62)",
  backdropFilter: "blur(8px)",
};

const sidePanel = {
  padding: "44px 44px 40px",
  flexDirection: "column",
  justifyContent: "space-between",
  borderRight: "1px solid rgba(255,240,222,0.08)",
  background:
    "linear-gradient(165deg, rgba(255,157,86,0.12), rgba(255,255,255,0.02) 45%, rgba(93,210,193,0.08))",
};

const brandButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: "inherit",
  fontFamily: "inherit",
};

const brandMark = {
  width: 30,
  height: 30,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, #ffd698, #ff965f)",
  color: "#1f1512",
  fontWeight: 800,
  fontSize: 14,
};

const brandText = {
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const eyebrow = {
  margin: "24px 0 10px",
  fontSize: 12,
  letterSpacing: "0.2em",
  color: "rgba(247,239,227,0.72)",
};

const headline = {
  margin: 0,
  fontSize: "clamp(2rem, 4.8vw, 3.2rem)",
  lineHeight: 1.05,
  letterSpacing: "-0.03em",
};

const supportingCopy = {
  marginTop: 14,
  marginBottom: 0,
  maxWidth: 520,
  color: "rgba(247,239,227,0.8)",
  lineHeight: 1.55,
};

const signalList = {
  display: "grid",
  gap: 12,
  marginTop: 32,
};

const signalItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "rgba(247,239,227,0.84)",
  fontSize: 15,
};

const signalDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#ffb375",
  boxShadow: "0 0 0 5px rgba(255,179,117,0.15)",
};

const formSection = {
  padding: "30px 22px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const formCard = {
  width: "min(430px, 100%)",
  borderRadius: 20,
  border: "1px solid rgba(255,240,222,0.12)",
  background: "rgba(18, 13, 15, 0.82)",
  padding: "26px 22px 24px",
};

const formHeader = {
  marginBottom: 18,
};

const formEyebrow = {
  margin: 0,
  fontSize: 11,
  letterSpacing: "0.17em",
  color: "rgba(247,239,227,0.66)",
};

const formTitle = {
  margin: "10px 0 8px",
  fontSize: "clamp(1.6rem, 3vw, 2.1rem)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
};

const formSubtitle = {
  margin: 0,
  color: "rgba(247,239,227,0.74)",
  lineHeight: 1.5,
};

const modeToggleWrap = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  padding: 6,
  borderRadius: 12,
  border: "1px solid rgba(255,240,222,0.12)",
  background: "rgba(255,255,255,0.02)",
  marginBottom: 16,
};

const baseToggleButton = {
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  padding: "10px 8px",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  transition: "all 0.15s",
};

const activeToggleButton = {
  ...baseToggleButton,
  background: "linear-gradient(135deg, #ffd390, #ff9e62)",
  color: "#1f1512",
};

const inactiveToggleButton = {
  ...baseToggleButton,
  background: "transparent",
  color: "rgba(247,239,227,0.74)",
};

const formStack = {
  display: "grid",
  gap: 14,
};

const fieldLabelWrap = {
  display: "grid",
  gap: 7,
};

const fieldLabel = {
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "rgba(247,239,227,0.76)",
  fontWeight: 600,
};

const input = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid rgba(255,240,222,0.14)",
  background: "rgba(255,255,255,0.03)",
  color: "#f7efe3",
  padding: "12px 12px",
  fontSize: 15,
  fontFamily: "inherit",
  outline: "none",
};

const disabledInput = {
  opacity: 0.6,
  cursor: "not-allowed",
};

const passwordWrap = {
  position: "relative",
};

const passwordToggle = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "transparent",
  color: "rgba(247,239,227,0.72)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const eyeIcon = {
  width: 18,
  height: 18,
};

const errorBox = {
  borderRadius: 10,
  border: "1px solid rgba(255,111,97,0.6)",
  background: "rgba(255,111,97,0.12)",
  color: "#ffd3ce",
  padding: "11px 12px",
  fontSize: 14,
};

const submitButton = (loading) => ({
  marginTop: 2,
  width: "100%",
  border: "none",
  borderRadius: 10,
  padding: "12px 14px",
  cursor: loading ? "not-allowed" : "pointer",
  background: "linear-gradient(135deg, #ffd390, #ff9f62)",
  color: "#1f1512",
  fontWeight: 700,
  fontSize: 15,
  fontFamily: "inherit",
  opacity: loading ? 0.65 : 1,
});

const footerActions = {
  marginTop: 18,
  display: "grid",
  gap: 8,
  justifyItems: "center",
};

const smallText = {
  margin: 0,
  color: "rgba(247,239,227,0.72)",
  fontSize: 14,
};

const inlineLinkButton = {
  background: "transparent",
  border: "none",
  color: "#ffd390",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
  fontFamily: "inherit",
  fontSize: 14,
};

const backButton = {
  background: "transparent",
  border: "none",
  color: "rgba(247,239,227,0.62)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
};

export default Login;
