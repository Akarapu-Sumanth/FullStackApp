import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, useNotifications } from "../../context/contexts";

const titles = {
  "/dashboard": ["Overview", "Your workspace at a glance"],
  "/projects": ["Projects", "Plan and organize your work"],
  "/tasks": ["Tasks", "Track everything that needs to get done"],
  "/analytics": ["Analytics", "Understand your productivity"],
  "/notifications": ["Notifications", "Stay updated on workspace activity"],
  "/profile": ["Profile", "Manage your personal information"],
  "/settings": ["Settings", "Configure your workspace"],
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [searchValue, setSearchValue] = useState("");

  const [title, subtitle] =
    titles[location.pathname] || titles["/dashboard"];

  const initial = (user?.username || "U").charAt(0).toUpperCase();

  useEffect(() => {
    const handleGlobalSearchShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("global-search-input")?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();

    const nextQuery = searchValue.trim();
    const route = location.pathname.startsWith("/tasks") ? "/tasks" : "/projects";

    if (!nextQuery) {
      navigate(route);
      return;
    }

    navigate(`${route}?search=${encodeURIComponent(nextQuery)}`);
  };

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <form className="topbar-search" onSubmit={handleSearch}>
          <span>⌕</span>
          <input
            id="global-search-input"
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search projects or tasks"
            aria-label="Search projects or tasks"
          />
          <kbd>⌘ K</kbd>
        </form>

        <button
          type="button"
          className="icon-button"
          title="Notifications"
          onClick={() => navigate("/notifications")}
        >
          ◉
          {unreadCount > 0 && (
            <span className="notification-count" aria-label={`${unreadCount} unread notifications`}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div className="profile-menu">
          <div className="profile-avatar">
            {user?.profile?.avatar ? <img src={user.profile.avatar} alt={`${user.username} avatar`} /> : initial}
          </div>

          <div className="profile-summary">
            <strong>{user?.username || "User"}</strong>
            <span>Member</span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
            title="Logout"
          >
            ↪
          </button>
        </div>
      </div>
    </header>
  );
}