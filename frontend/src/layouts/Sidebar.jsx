import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navigation = [
  {
    label: "Overview",
    path: "/dashboard",
    icon: "⌂",
  },
  {
    label: "Projects",
    path: "/projects",
    icon: "▣",
  },
  {
    label: "Tasks",
    path: "/tasks",
    icon: "✓",
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: "◒",
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: "◉",
  },
];

const secondaryNavigation = [
  {
    label: "Profile",
    path: "/profile",
    icon: "◯",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "⚙",
  },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">N</div>

        <div>
          <div className="brand-name">NexusFlow</div>
          <div className="brand-caption">Workspace</div>
        </div>
      </div>

      <div className="workspace-selector">
        <div className="workspace-avatar">
          {(user?.username || "U").charAt(0).toUpperCase()}
        </div>

        <div className="workspace-info">
          <strong>{user?.username || "User"}'s Workspace</strong>
          <span>Personal workspace</span>
        </div>

        <span className="workspace-arrow">⌄</span>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-label">Workspace</span>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-label">Account</span>

        <nav className="sidebar-nav">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-card">
          <div className="footer-status-dot" />

          <div>
            <strong>System operational</strong>
            <span>All services running</span>
          </div>
        </div>
      </div>
    </aside>
  );
}