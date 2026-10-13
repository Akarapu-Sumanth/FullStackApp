import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../api";

const defaultForm = {
  name: "",
  description: "",
  status: "PLANNING",
  deadline: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [memberForm, setMemberForm] = useState({ username: "", role: "MEMBER" });
  const [searchParams, setSearchParams] = useSearchParams();

  const loadProjects = useCallback(async () => {
    try {
      const projectsResponse = await api.get("/projects/");

      setProjects(projectsResponse.data);
      setSelectedProject((current) =>
        projectsResponse.data.find((project) => project.id === current?.id) ||
        projectsResponse.data[0] ||
        null
      );

      setError("");
    } catch (error) {
      setProjects((current) => current ?? []);
      setError(getApiErrorMessage(error, "Unable to load projects."));
    }
  }, []);

  const loadMembers = useCallback(async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}/members/`);
      setMembers(response.data);
    } catch (error) {
      setMembers([]);
      setError(getApiErrorMessage(error, "Unable to load project members."));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchProjects = async () => {
      try {
        const response = await api.get("/projects/");
        if (!active) {
          return;
        }
        setProjects(response.data);
        setSelectedProject((current) =>
          response.data.find((project) => project.id === current?.id) ||
          response.data[0] ||
          null
        );
        setError("");
      } catch (error) {
        if (active) {
          setProjects([]);
          setError(getApiErrorMessage(error, "Unable to load projects."));
        }
      }
    };

    fetchProjects();
    return () => {
      active = false;
    };
  }, []);

  const loading = projects === null;

  useEffect(() => {
    const projectId = selectedProject?.id;
    if (!projectId) {
      return undefined;
    }

    let active = true;
    const fetchMembers = async () => {
      try {
        const response = await api.get(`/projects/${projectId}/members/`);
        if (active) {
          setMembers(response.data);
        }
      } catch (error) {
        if (active) {
          setMembers([]);
          setError(getApiErrorMessage(error, "Unable to load project members."));
        }
      }
    };

    fetchMembers();
    return () => {
      active = false;
    };
  }, [selectedProject]);

  const statusFilter = searchParams.get("status") || "ALL";
  const searchValue = searchParams.get("search") || "";

  const filteredProjects = useMemo(() => {
    return (projects || []).filter((project) => {
      const matchesStatus = statusFilter === "ALL" || project.status === statusFilter;
      const matchesSearch =
        !searchValue ||
        project.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        project.description.toLowerCase().includes(searchValue.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [projects, statusFilter, searchValue]);

  const openCreateModal = () => {
    setEditingProjectId(null);
    setForm(defaultForm);
    setShowModal(true);
    setSuccess("");
  };

  const openEditModal = (project) => {
    setEditingProjectId(project.id);
    setForm({
      name: project.name,
      description: project.description || "",
      status: project.status,
      deadline: project.deadline ? project.deadline.slice(0, 16) : "",
    });
    setShowModal(true);
    setSuccess("");
  };

  const handleProjectSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = {
        name: form.name,
        description: form.description,
        status: form.status,
        deadline: form.deadline || null,
      };

      if (editingProjectId) {
        await api.put(`/projects/${editingProjectId}/`, payload);
      } else {
        await api.post("/projects/", payload);
      }

      setShowModal(false);
      setSuccess(editingProjectId ? "Project updated." : "Project created.");
      await loadProjects();
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to save the project.");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Delete ${project.name}? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/projects/${project.id}/`);
      setSuccess("Project deleted.");
      setSelectedProject(null);
      await loadProjects();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to delete the project."));
    }
  };

  const handleMemberSubmit = async (event) => {
    event.preventDefault();

    if (!selectedProject || !memberForm.username.trim()) {
      setError("Enter a username before adding a member.");
      return;
    }

    try {
      await api.post(`/projects/${selectedProject.id}/members/`, {
        username: memberForm.username.trim(),
        role: memberForm.role,
      });

      setMemberForm({ username: "", role: "MEMBER" });
      setSuccess("Member updated.");
      await loadMembers(selectedProject.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to add or update the project member."));
    }
  };

  const handleMemberRemove = async (username) => {
    if (!selectedProject || !window.confirm(`Remove ${username} from this project?`)) {
      return;
    }

    try {
      await api.delete(`/projects/${selectedProject.id}/members/`, {
        data: { username },
      });
      setSuccess(`${username} removed from the project.`);
      await loadMembers(selectedProject.id);
      await loadProjects();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to remove the project member."));
    }
  };

  return (
    <div className="section-page">
      <div className="page-toolbar">
        <div>
          <span className="panel-kicker">WORK MANAGEMENT</span>
          <h2>Projects</h2>
          <p>Organize your work into focused projects and initiatives.</p>
        </div>

        <button className="primary-button" onClick={openCreateModal}>+ New project</button>
      </div>

      <div className="toolbar-row">
        <select
          value={statusFilter}
          onChange={(event) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), status: event.target.value })}
        >
          <option value="ALL">All statuses</option>
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), search: event.target.value })}
          placeholder="Search projects"
        />
      </div>

      {error && <div className="error-state">{error}</div>}
      {success && <div className="success-state">{success}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="large-empty-state">
          <div className="empty-illustration">▣</div>
          <h3>No projects found</h3>
          <p>Create a project to start grouping tasks and team work.</p>
        </div>
      ) : (
        <div className="project-layout">
          <div className="project-grid">
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className={`project-card ${selectedProject?.id === project.id ? "selected" : ""}`}
                onClick={() => setSelectedProject(project)}
              >
                <div className="project-card-top">
                  <strong>{project.name}</strong>
                  <span className="status-badge neutral">{project.status}</span>
                </div>

                <p>{project.description || "No description provided."}</p>

                <div className="project-meta">
                  <span>Owner: {project.owner?.username || "Unknown"}</span>
                  <span>Members: {project.members_count || 0}</span>
                </div>

                <div className="project-meta">
                  <span>Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : "No deadline"}</span>
                  <span>Tasks: {project.tasks_count || 0}</span>
                </div>

                <div className="project-actions">
                  <button type="button" className="secondary-button" onClick={(event) => { event.stopPropagation(); openEditModal(project); }}>
                    Edit
                  </button>
                  <button type="button" className="danger-button" onClick={(event) => { event.stopPropagation(); handleDeleteProject(project); }}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          {selectedProject && (
            <aside className="panel project-detail-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">PROJECT DETAIL</span>
                  <h3>{selectedProject.name}</h3>
                </div>
              </div>

              <p className="muted-text">{selectedProject.description || "No description provided."}</p>

              <div className="project-detail-grid">
                <div>
                  <span>Status</span>
                  <strong>{selectedProject.status}</strong>
                </div>
                <div>
                  <span>Deadline</span>
                  <strong>{selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : "No deadline"}</strong>
                </div>
                <div>
                  <span>Tasks</span>
                  <strong>{selectedProject.tasks_count || 0}</strong>
                </div>
                <div>
                  <span>Members</span>
                  <strong>{selectedProject.members_count || 0}</strong>
                </div>
              </div>

              <div className="member-section">
                <h4>Project members</h4>
                {members.length === 0 ? (
                  <p className="muted-text">No members yet.</p>
                ) : (
                  <div className="member-list">
                    {members.map((member) => (
                      <div className="member-item" key={member.id}>
                        <div>
                          <strong>{member.user?.username || "Member"}</strong>
                          <span>{member.role}</span>
                        </div>
                        {member.role !== "OWNER" && (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => handleMemberRemove(member.user.username)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <form className="member-form" onSubmit={handleMemberSubmit}>
                  <input
                    type="text"
                    aria-label="Member username"
                    placeholder="Username to invite"
                    value={memberForm.username}
                    onChange={(event) => setMemberForm({ ...memberForm, username: event.target.value })}
                    required
                  />

                  <select
                    value={memberForm.role}
                    onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>

                  <button type="submit" className="primary-button">Add member</button>
                </form>
              </div>
            </aside>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <span className="panel-kicker">{editingProjectId ? "EDIT" : "CREATE"}</span>
                <h3>{editingProjectId ? "Edit project" : "New project"}</h3>
              </div>
              <button type="button" className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleProjectSubmit} className="modal-form">
              <label>
                Project name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Marketing launch"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={5}
                  placeholder="Project overview"
                />
              </label>

              <div className="form-grid">
                <label>
                  Status
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </label>

                <label>
                  Deadline
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                  />
                </label>
              </div>

              {error && <div className="error-state">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : editingProjectId ? "Save project" : "Create project"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}