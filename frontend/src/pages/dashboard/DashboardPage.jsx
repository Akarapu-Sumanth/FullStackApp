import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../api";
import StatCard from "../../components/dashboard/StatCard";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);

        const [analyticsResponse, projectsResponse, tasksResponse, activityResponse] =
          await Promise.all([
            api.get("/analytics/"),
            api.get("/projects/?ordering=-created_at"),
            api.get("/tasks/?ordering=-created_at"),
            api.get("/activity/?ordering=-created_at"),
          ]);

        setAnalytics(analyticsResponse.data);
        setProjects(projectsResponse.data);
        setTasks(tasksResponse.data);
        setActivity(activityResponse.data);
        setError("");
      } catch (error) {
        setError(getApiErrorMessage(error, "Unable to load your workspace data. Please try again."));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const recentTasks = tasks.slice(0, 5);
  const recentProjects = projects.slice(0, 4);
  const upcomingTasks = [...tasks]
    .filter((task) => task.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const stats = analytics?.tasks || {
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    completion_rate: 0,
  };

  return (
    <div className="dashboard-page">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">WORKSPACE OVERVIEW</span>
          <h2>Build momentum with focused work.</h2>
          <p>
            Keep projects organized, track execution, and understand what needs your
            attention next.
          </p>
        </div>

        <div className="welcome-decoration">
          <div className="decoration-orbit orbit-one" />
          <div className="decoration-orbit orbit-two" />
          <div className="decoration-core">N</div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Total projects"
          value={loading ? "—" : analytics?.projects?.total ?? 0}
          description="Projects in your workspace"
          icon="▣"
        />
        <StatCard
          label="Active projects"
          value={loading ? "—" : analytics?.projects?.active ?? 0}
          description="Projects currently active"
          icon="◔"
        />
        <StatCard
          label="Total tasks"
          value={loading ? "—" : stats.total}
          description="Tasks tracked in the workspace"
          icon="✓"
        />
        <StatCard
          label="Completion rate"
          value={loading ? "—" : `${Math.round(stats.completion_rate || 0)}%`}
          description="Based on completed vs total tasks"
          icon="%"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">TASK ACTIVITY</span>
              <h3>Recent tasks</h3>
            </div>
            <Link to="/tasks" className="panel-link">View all →</Link>
          </div>

          {error && <div className="error-state">{error}</div>}

          {!loading && !error && recentTasks.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h4>No tasks yet</h4>
              <p>Create your first task to start building your workspace activity.</p>
              <Link to="/tasks" className="primary-button">Create a task</Link>
            </div>
          )}

          {!loading && !error && recentTasks.length > 0 && (
            <div className="task-preview-list">
              {recentTasks.map((task) => (
                <div className="task-preview" key={task.id}>
                  <div className={`task-status ${task.completed ? "completed" : "pending"}`}>
                    {task.completed ? "✓" : ""}
                  </div>

                  <div className="task-preview-content">
                    <strong>{task.title}</strong>
                    <span>{task.description || "No description provided"}</span>
                  </div>

                  <span className={`status-badge ${task.completed ? "success" : "neutral"}`}>
                    {task.completed ? "Completed" : task.status || "Open"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">WORKSPACE HEALTH</span>
              <h3>Execution summary</h3>
            </div>
          </div>

          <div className="progress-summary">
            <div className="progress-ring">
              <div className="progress-ring-inner">
                {loading ? "—" : `${Math.round(stats.completion_rate || 0)}%`}
              </div>
            </div>

            <div>
              <strong>Task completion</strong>
              <p>
                Your current completion rate reflects the live tasks stored in the backend.
              </p>
            </div>
          </div>

          <div className="summary-divider" />
          <div className="summary-row">
            <span>Completed tasks</span>
            <strong>{loading ? "—" : stats.completed}</strong>
          </div>
          <div className="summary-row">
            <span>Pending tasks</span>
            <strong>{loading ? "—" : stats.pending}</strong>
          </div>
          <div className="summary-row">
            <span>Overdue tasks</span>
            <strong>{loading ? "—" : stats.overdue}</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-grid" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">PORTFOLIO</span>
              <h3>Recent projects</h3>
            </div>
            <Link to="/projects" className="panel-link">Open all →</Link>
          </div>

          {!loading && recentProjects.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">▣</div>
              <h4>No projects yet</h4>
              <p>Create your first project to start organizing work.</p>
              <Link to="/projects" className="primary-button">New project</Link>
            </div>
          )}

          {recentProjects.length > 0 && (
            <div className="stacked-list">
              {recentProjects.map((project) => (
                <div className="stacked-item" key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <p>{project.description || "No description provided."}</p>
                  </div>
                  <span className="status-badge neutral">{project.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">UPCOMING</span>
              <h3>Upcoming deadlines</h3>
            </div>
          </div>

          {!loading && upcomingTasks.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">◔</div>
              <h4>No upcoming deadlines</h4>
              <p>Your due dates will appear here as soon as tasks are scheduled.</p>
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div className="stacked-list">
              {upcomingTasks.map((task) => (
                <div className="stacked-item" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}</p>
                  </div>
                  <span className="status-badge neutral">{task.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-grid" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">ACTIVITY</span>
              <h3>Recent activity</h3>
            </div>
          </div>

          {!loading && activity.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">◌</div>
              <h4>No activity yet</h4>
              <p>Your workspace events will appear here as you create or update work.</p>
            </div>
          )}

          {activity.length > 0 && (
            <div className="timeline-list">
              {activity.slice(0, 6).map((item) => (
                <div className="timeline-item" key={item.id}>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{item.action.replace("_", " ")}</strong>
                    <p>{item.description}</p>
                    <small>{new Date(item.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">DISTRIBUTION</span>
              <h3>Task status</h3>
            </div>
          </div>

          {analytics && (
            <div className="distribution-list">
              {Object.entries(analytics.task_status_distribution || {}).map(([status, count]) => (
                <div className="distribution-row" key={status}>
                  <div className="distribution-label-row">
                    <span>{status}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="distribution-bar">
                    <span style={{ width: `${Math.max((count / Math.max(stats.total || 1, 1)) * 100, count ? 10 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
