import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import Breadcrumbs from "./Breadcrumbs";
import NLCommandBar from "./NLCommandBar";
import NotificationBell from "./NotificationBell";
import QuickActions from "./QuickActions";
import UnifiedNav from "./UnifiedNav";

export default function UnifiedLayout({ children }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            pageBg: "#0f0b0d",
            panelBg: "#171215",
            panelBgAlt: "#1d171b",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            hover: "rgba(255,255,255,0.06)",
          }
        : {
            pageBg: "#f6f1ea",
            panelBg: "#fffaf3",
            panelBgAlt: "#ffffff",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            hover: "rgba(35,24,20,0.06)",
          },
    [darkMode]
  );

  const avatar = user?.avatar;
  const initial = user?.full_name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div style={{ ...page, background: palette.pageBg }}>
      <div style={ambientGlowOne} />
      <div style={ambientGlowTwo} />

      <UnifiedNav
        darkMode={darkMode}
        rightActions={
          <>
            <QuickActions darkMode={darkMode} />

            <button
              onClick={toggleDarkMode}
              style={{
                ...iconButton,
                color: palette.text,
                background: palette.hover,
                border: `1px solid ${palette.border}`,
              }}
              aria-label="Toggle theme"
            >
              {darkMode ? <SunIcon style={icon16} /> : <MoonIcon style={icon16} />}
            </button>

            <NotificationBell />

            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowProfile((value) => !value)}
                style={{ ...avatarButton, border: `1px solid ${palette.border}` }}
                aria-label="Open profile menu"
              >
                {avatar ? (
                  <img src={avatar} alt={user?.full_name || "User"} style={avatarImage} />
                ) : (
                  <span style={avatarInitial}>{initial}</span>
                )}
              </button>

              {showProfile && (
                <div
                  style={{
                    ...profileMenu,
                    background: palette.panelBgAlt,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <div style={{ ...profileHead, borderBottom: `1px solid ${palette.border}` }}>
                    <p style={{ ...nameLine, color: palette.text }}>{user?.full_name || "User"}</p>
                    <p style={{ ...emailLine, color: palette.muted }}>{user?.email || ""}</p>
                  </div>

                  <button
                    onClick={() => {
                      navigate("/profile");
                      setShowProfile(false);
                    }}
                    style={{ ...menuButton, color: palette.text }}
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      navigate("/settings");
                      setShowProfile(false);
                    }}
                    style={{ ...menuButton, color: palette.text }}
                  >
                    Settings
                  </button>

                  <button onClick={logout} style={{ ...menuButton, color: "#ef4444" }}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        }
      />
      <NLCommandBar darkMode={darkMode} />

      <main style={main}>
        <div style={contentContainer}>
          <Breadcrumbs darkMode={darkMode} />
          {children}
        </div>
      </main>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
};

const ambientGlowOne = {
  position: "fixed",
  width: 500,
  height: 500,
  top: -220,
  left: -170,
  borderRadius: "50%",
  pointerEvents: "none",
  background: "rgba(255,170,80,0.14)",
  filter: "blur(60px)",
};

const ambientGlowTwo = {
  position: "fixed",
  width: 540,
  height: 540,
  right: -220,
  bottom: -260,
  borderRadius: "50%",
  pointerEvents: "none",
  background: "rgba(88,210,189,0.12)",
  filter: "blur(60px)",
};

const iconButton = {
  width: 32,
  height: 32,
  borderRadius: 9,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const avatarButton = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  padding: 0,
  background: "linear-gradient(135deg, #ffcf8f, #ff965f)",
  color: "#261812",
  fontWeight: 800,
  cursor: "pointer",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarInitial = {
  fontSize: 13,
};

const profileMenu = {
  position: "absolute",
  right: 0,
  top: 40,
  minWidth: 190,
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
};

const profileHead = {
  padding: "10px 12px",
};

const nameLine = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
};

const emailLine = {
  margin: "3px 0 0",
  fontSize: 11,
};

const menuButton = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  padding: "10px 12px",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const main = {
  position: "relative",
  zIndex: 1,
  paddingTop: 56,
  minHeight: "100vh",
};

const contentContainer = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "0 clamp(14px, 2vw, 24px) 24px",
};

const icon16 = { width: 16, height: 16 };
