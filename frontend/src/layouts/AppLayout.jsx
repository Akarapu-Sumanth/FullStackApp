import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import { useAuth, usePreferences } from "../context/contexts";

function getRefreshExpiry() {
  try {
    const token = localStorage.getItem("refresh_token");
    if (!token) {
      return null;
    }

    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(payload)).exp * 1000;
  } catch {
    return null;
  }
}

function isReminderDue() {
  const expiry = getRefreshExpiry();
  const dismissedExpiry = sessionStorage.getItem("nexusflow-dismissed-session-expiry");
  return Boolean(expiry && expiry > Date.now() && expiry - Date.now() < 86_400_000 && String(expiry) !== dismissedExpiry);
}

export default function AppLayout() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const [showSessionReminder, setShowSessionReminder] = useState(false);

  useEffect(() => {
    const checkReminder = () => {
      setShowSessionReminder(Boolean(user && preferences.sessionReminder && isReminderDue()));
    };
    const timeoutId = window.setTimeout(checkReminder, 0);
    const intervalId = window.setInterval(checkReminder, 60_000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [preferences.sessionReminder, user]);

  const dismissSessionReminder = () => {
    const expiry = getRefreshExpiry();
    if (expiry) {
      sessionStorage.setItem("nexusflow-dismissed-session-expiry", String(expiry));
    }
    setShowSessionReminder(false);
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-shell">
        <Topbar />

        <main className="page-container">
          {showSessionReminder && (
            <div className="session-reminder" role="status">
              <span>Your session refresh token expires within 24 hours. Save your work and sign in again when prompted.</span>
              <button type="button" aria-label="Dismiss session reminder" onClick={dismissSessionReminder}>×</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}