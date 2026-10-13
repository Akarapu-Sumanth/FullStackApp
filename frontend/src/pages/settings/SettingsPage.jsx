import { useState } from "react";
import { usePreferences } from "../../context/contexts";

export default function SettingsPage() {
  const { preferences, updatePreferences } = usePreferences();
  const [feedback, setFeedback] = useState("");
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const notificationPermission = notificationSupported ? Notification.permission : "unsupported";

  const handleDesktopNotifications = async () => {
    if (!notificationSupported) {
      setFeedback("This browser does not support desktop notifications.");
      return;
    }

    if (preferences.desktopNotifications) {
      updatePreferences({ desktopNotifications: false });
      setFeedback("Desktop notifications disabled.");
      return;
    }

    if (notificationPermission === "denied") {
      setFeedback("Notifications are blocked by the browser. Allow them in this site's browser settings, then return here.");
      return;
    }

    const permission = notificationPermission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    updatePreferences({ desktopNotifications: permission === "granted" });
    setFeedback(permission === "granted"
      ? "Desktop notifications enabled for new notifications while NexusFlow is open."
      : "Notification permission was not granted.");
  };

  const handleThemeChange = (event) => {
    updatePreferences({ defaultTheme: event.target.value });
    setFeedback("Theme preference saved.");
  };

  return (
    <div className="section-page">
      <div className="page-toolbar">
        <div>
          <span className="panel-kicker">CONFIGURATION</span>
          <h2>Settings</h2>
          <p>Adjust your workspace preferences and local experience.</p>
        </div>
      </div>

      {feedback && <div className="success-state" role="status">{feedback}</div>}

      <div className="settings-list">
        <div className="settings-item">
          <div>
            <strong>Workspace name</strong>
            <span>Appears across the product experience.</span>
          </div>

          <input
            type="text"
            aria-label="Workspace name"
            value={preferences.workspaceName}
            onChange={(event) => updatePreferences({ workspaceName: event.target.value })}
          />
        </div>

        <div className="settings-item">
          <div>
            <strong>Theme</strong>
            <span>Choose the default interface setting.</span>
          </div>

          <select aria-label="Theme" value={preferences.defaultTheme} onChange={handleThemeChange}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="settings-item">
          <div>
            <strong>Email digest</strong>
            <span>Email delivery is unavailable until an email provider and scheduled digest worker are configured.</span>
          </div>

          <span className="status-badge neutral">Not configured</span>
        </div>

        <div className="settings-item">
          <div>
            <strong>Desktop notifications</strong>
            <span>
              {notificationPermission === "denied"
                ? "Permission is blocked in browser settings."
                : "Receive a browser alert for new notifications while the app is open."}
            </span>
          </div>

          <button type="button" className={preferences.desktopNotifications ? "secondary-button" : "primary-button"} onClick={handleDesktopNotifications} disabled={!notificationSupported || notificationPermission === "denied"}>
            {preferences.desktopNotifications ? "Disable" : notificationPermission === "denied" ? "Permission blocked" : "Allow notifications"}
          </button>
        </div>

        <div className="settings-item">
          <div>
            <strong>Session reminder</strong>
            <span>Show an in-app reminder during the final 24 hours of the 7-day refresh-token lifetime.</span>
          </div>

          <label className="switch">
            <input type="checkbox" checked={preferences.sessionReminder} onChange={(event) => updatePreferences({ sessionReminder: event.target.checked })} />
            <span />
          </label>
        </div>
      </div>

      <p className="settings-note">Workspace, theme, and session preferences save in this browser. Email digests require backend email delivery and a scheduled worker; they are not active.</p>
    </div>
  );
}