import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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
  const { user, logout } = useAuth();

  const [title, subtitle] =
    titles[location.pathname] || titles["/dashboard"];

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <button className="topbar-search">
          <span>⌕</span>
          <span>Search anything</span>
          <kbd>⌘ K</kbd>
        </button>

        <button className="icon-button" title="Notifications">
          ◉
        </button>

        <div className="profile-menu">
          <div className="profile-avatar">
            {(user?.username || "U").charAt(0).toUpperCase()}
          </div>

          <div className="profile-summary">
            <strong>{user?.username || "User"}</strong>
            <span>Member</span>
          </div>

          <button
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