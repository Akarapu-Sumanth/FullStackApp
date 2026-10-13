import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-brand">
          <div className="brand-mark">N</div>
          <strong>NexusFlow</strong>
        </div>

        <div className="landing-nav-actions">
          <Link to="/login" className="nav-link">
            Sign in
          </Link>

          <Link to="/register" className="primary-button small">
            Get started
          </Link>
        </div>
      </nav>

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-content">
            <span className="hero-badge">
              PRODUCTIVITY WORKSPACE
            </span>

            <h1>
              Turn scattered work into
              <span> focused execution.</span>
            </h1>

            <p>
              NexusFlow brings projects, tasks, collaboration,
              analytics, and workspace activity together in one
              intelligent productivity platform.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="primary-button large">
                Start building
              </Link>

              <Link to="/login" className="secondary-button large">
                Sign in
              </Link>
            </div>

            <div className="hero-trust">
              <span>✓ Structured workflows</span>
              <span>✓ Real-time API data</span>
              <span>✓ Secure authentication</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-window">
              <div className="window-header">
                <div className="window-dots">
                  <span />
                  <span />
                  <span />
                </div>

                <span>NexusFlow / Overview</span>
              </div>

              <div className="mock-dashboard">
                <div className="mock-sidebar" />

                <div className="mock-content">
                  <div className="mock-heading" />

                  <div className="mock-stat-row">
                    <div />
                    <div />
                    <div />
                  </div>

                  <div className="mock-panels">
                    <div className="mock-large-panel">
                      <div className="mock-chart">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>

                    <div className="mock-small-panel">
                      <div />
                      <div />
                      <div />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-strip">
          <div>
            <strong>Projects</strong>
            <span>Organize work into focused initiatives.</span>
          </div>

          <div>
            <strong>Tasks</strong>
            <span>Track execution from backlog to completion.</span>
          </div>

          <div>
            <strong>Analytics</strong>
            <span>Understand progress using real workspace data.</span>
          </div>

          <div>
            <strong>Activity</strong>
            <span>Keep an auditable history of important actions.</span>
          </div>
        </section>
      </main>
    </div>
  );
}