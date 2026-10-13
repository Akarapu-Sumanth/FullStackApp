import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../api";
import { AuthContext, NotificationContext, PreferencesContext } from "./contexts";

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const { preferences } = useContext(PreferencesContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const knownNotificationIds = useRef(null);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await api.get("/notifications/", {
        params: { read: false },
      });
      setUnreadCount(response.data.length);
    } catch {
      // Keep the last known count when the API is temporarily unavailable.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      knownNotificationIds.current = null;
      return undefined;
    }

    let active = true;
    const pollNotifications = async () => {
      try {
        const response = await api.get("/notifications/", {
          params: { read: false },
        });
        if (!active) {
          return;
        }

        const notifications = response.data;
        const previousIds = knownNotificationIds.current;
        setUnreadCount(notifications.length);

        if (previousIds && preferences.desktopNotifications &&
            "Notification" in window && Notification.permission === "granted") {
          notifications
            .filter((item) => !previousIds.has(item.id))
            .forEach((item) => {
              const browserNotification = new Notification(item.title, {
                body: item.message,
                tag: `nexusflow-notification-${item.id}`,
              });
              browserNotification.onclick = () => {
                window.focus();
                window.location.assign("/notifications");
              };
            });
        }

        knownNotificationIds.current = new Set(notifications.map((item) => item.id));
      } catch {
        // Polling is best-effort; the notifications page shows request errors.
      }
    };

    pollNotifications();
    const intervalId = window.setInterval(pollNotifications, 60_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, preferences.desktopNotifications]);

  const value = useMemo(
    () => ({ unreadCount: isAuthenticated ? unreadCount : 0, refreshUnread }),
    [isAuthenticated, unreadCount, refreshUnread]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
