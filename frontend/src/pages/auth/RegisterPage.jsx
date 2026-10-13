import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/contexts";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setLoading(true);

      await register(
        form.username,
        form.email,
        form.password
      );

      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;

      if (data) {
        const firstError = Object.values(data)[0];

        setError(
          Array.isArray(firstError)
            ? firstError[0]
            : "Unable to create account."
        );
      } else {
        setError("Unable to create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="brand-mark">N</div>
        <span>NexusFlow</span>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">GET STARTED</span>

          <h1>Create your workspace</h1>

          <p>
            Start organizing projects, tasks, and productivity
            from a single professional workspace.
          </p>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Username

            <input
              type="text"
              value={form.username}
              onChange={(event) =>
                setForm({
                  ...form,
                  username: event.target.value,
                })
              }
              placeholder="Choose a username"
              required
            />
          </label>

          <label>
            Email

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({
                  ...form,
                  password: event.target.value,
                })
              }
              placeholder="Create a secure password"
              required
            />
          </label>

          <button
            className="primary-button auth-submit"
            disabled={loading}
          >
            {loading
              ? "Creating workspace..."
              : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}