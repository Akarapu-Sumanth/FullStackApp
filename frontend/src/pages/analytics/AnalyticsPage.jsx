import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../api";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const response = await api.get("/analytics/");
        setAnalytics(response.data);
        setError("");
      } catch (error) {
        setError(getApiErrorMessage(error, "Unable to load analytics."));
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const analyticsSummary = analytics?.tasks || {
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    completion_rate: 0,
  };

  return (
    <div className="section-page">
      <div className="page-toolbar">
        <div>
          <span className="panel-kicker">PERFORMANCE</span>
          <h2>Analytics</h2>
          <p>Productivity insights generated from your live workspace data.</p>
        </div>
      </div>

      {error && <div className="error-state">{error}</div>}

      <div className="analytics-grid">
        <div className="analytics-card">
          <span>Projects</span>
          <strong>{loading ? "—" : analytics?.projects?.total ?? 0}</strong>
          <small>Total projects</small>
        </div>

        <div className="analytics-card">
          <span>Active</span>
          <strong>{loading ? "—" : analytics?.projects?.active ?? 0}</strong>
          <small>Live projects</small>
        </div>

        <div className="analytics-card">
          <span>Overdue</span>
          <strong>{loading ? "—" : analyticsSummary.overdue}</strong>
          <small>Tasks past due</small>
        </div>

        <div className="analytics-card">
          <span>Completion rate</span>
          <strong>{loading ? "—" : `${Math.round(analyticsSummary.completion_rate || 0)}%`}</strong>
          <small>Completed vs total tasks</small>
        </div>
      </div>

      <div className="panel analytics-panel">
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
                  <span style={{ width: `${(count / Math.max(analyticsSummary.total || 1, 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-grid" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">PRIORITY</span>
              <h3>Task priority breakdown</h3>
            </div>
          </div>

          {analytics && (
            <div className="distribution-list">
              {Object.entries(analytics.task_priority_distribution || {}).map(([priority, count]) => (
                <div className="distribution-row" key={priority}>
                  <div className="distribution-label-row">
                    <span>{priority}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="distribution-bar neutral">
                    <span style={{ width: `${(count / Math.max(analyticsSummary.total || 1, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">PROJECTS</span>
              <h3>Project status</h3>
            </div>
          </div>

          {analytics && (
            <div className="distribution-list">
              {Object.entries(analytics.project_status_distribution || {}).map(([status, count]) => (
                <div className="distribution-row" key={status}>
                  <div className="distribution-label-row">
                    <span>{status}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="distribution-bar">
                    <span style={{ width: `${(count / Math.max(analytics?.projects?.total || 1, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}