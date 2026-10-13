import { useCallback, useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../api";
import { useNotifications } from "../../context/contexts";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const { unreadCount, refreshUnread } = useNotifications();

  const loadNotifications = useCallback(async () => {
    try {
      const query = filter === "all" ? {} : { read: filter === "read" };
      const response = await api.get("/notifications/", { params: query });
      setNotifications(response.data);
      setError("");
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to load notifications."));
    }
  }, [filter]);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        await loadNotifications();
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [filter, loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/mark_all_read/");
      await loadNotifications();
      await refreshUnread();
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to update notifications."));
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/mark_read/`);
      await loadNotifications();
      await refreshUnread();
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to mark the notification as read."));
    }
  };

  return (
    <div className="section-page">
      <div className="page-toolbar">
        <div>
          <span className="panel-kicker">COMMUNICATION</span>
          <h2>Notifications</h2>
          <p>Stay informed about task, project, and workspace activity.</p>
        </div>

        <button type="button" className="secondary-button" onClick={handleMarkAllRead} disabled={unreadCount === 0}>Mark all as read ({unreadCount})</button>
      </div>

      <div className="toolbar-row">
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All notifications</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {error && <div className="error-state">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading notifications...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="large-empty-state">
          <div className="empty-illustration">◉</div>
          <h3>No notifications yet</h3>
          <p>Task assignments, project updates, and comments will appear here when they happen.</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <article key={notification.id} className={`notification-item ${notification.read ? "read" : "unread"}`}>
              <div className="notification-indicator" />
              <div className="notification-body">
                <div className="notification-header">
                  <strong>{notification.title}</strong>
                  {!notification.read && <span className="badge-dot">Unread</span>}
                </div>
                <p>{notification.message}</p>
                <small>{new Date(notification.created_at).toLocaleString()}</small>
              </div>

              {!notification.read && (
                <button type="button" className="secondary-button" onClick={() => handleMarkRead(notification.id)}>
                  Mark read
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}