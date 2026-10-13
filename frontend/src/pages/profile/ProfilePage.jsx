import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../api";
import { useAuth } from "../../context/contexts";

export default function ProfilePage() {
  const { user, refreshSession } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    timezone: "Asia/Kolkata",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/profile/");
        setProfile(response.data);
        setForm({
          display_name: response.data.display_name || "",
          bio: response.data.bio || "",
          timezone: response.data.timezone || "Asia/Kolkata",
        });
      } catch (error) {
        setError(getApiErrorMessage(error, "Unable to load your profile."));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = new FormData();
      payload.append("display_name", form.display_name);
      payload.append("bio", form.bio);
      payload.append("timezone", form.timezone);

      if (avatarFile) {
        payload.append("avatar", avatarFile);
      }

      const response = await api.patch("/profile/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfile(response.data);
      await refreshSession();
      setSuccess("Profile updated.");
      setAvatarFile(null);
      setAvatarPreview("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="section-page">
      <div className="page-toolbar">
        <div>
          <span className="panel-kicker">ACCOUNT</span>
          <h2>Profile</h2>
          <p>Manage your personal workspace identity.</p>
        </div>
      </div>

      {error && <div className="error-state">{error}</div>}
      {success && <div className="success-state">{success}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading profile...</span>
        </div>
      ) : (
        <div className="profile-layout">
          <div className="profile-card panel">
            <div className="large-avatar">
              {(avatarPreview || profile?.avatar) ? (
                <img src={avatarPreview || profile.avatar} alt={`${profile?.display_name || user?.username || "User"} avatar`} />
              ) : (user?.username || "U").charAt(0).toUpperCase()}
            </div>
            <div className="profile-details">
              <span className="panel-kicker">USER ACCOUNT</span>
              <h3>{profile?.display_name || user?.username || "User"}</h3>
              <p>{user?.email || "No email provided"}</p>
            </div>
          </div>

          <form className="panel profile-form" onSubmit={handleSubmit}>
            <div className="panel-header">
              <div>
                <span className="panel-kicker">DETAILS</span>
                <h3>Profile settings</h3>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Display name
                <input type="text" value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} />
              </label>

              <label>
                Timezone
                <input type="text" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
              </label>
            </div>

            <label>
              Bio
              <textarea rows={5} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
            </label>

            <label>
              Avatar
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setAvatarPreview(file ? URL.createObjectURL(file) : "");
                setAvatarFile(file);
              }} />
              <span className="field-hint">JPEG, PNG, or WebP; maximum 5 MB and 4096 × 4096 pixels.</span>
            </label>

            <div className="modal-actions">
              <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}