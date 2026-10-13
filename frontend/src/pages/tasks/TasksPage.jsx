import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../api";

const defaultForm = {
  title: "",
  description: "",
  project_id: "",
  assigned_to_id: "",
  priority: "MEDIUM",
  status: "TODO",
  due_date: "",
};

const statusOrder = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [viewMode, setViewMode] = useState("list");
  const [searchParams, setSearchParams] = useSearchParams();

  const activeProjectFilter = searchParams.get("project") || "";
  const activeStatusFilter = searchParams.get("status") || "";
  const activePriorityFilter = searchParams.get("priority") || "";
  const activeAssigneeFilter = searchParams.get("assigned_to") || "";
  const activeDueDateFilter = searchParams.get("due_date") || "";
  const activeSearch = searchParams.get("search") || "";

  const loadTasks = useCallback(async () => {
    try {
      const params = {};

      if (activeProjectFilter) params.project = activeProjectFilter;
      if (activeStatusFilter) params.status = activeStatusFilter;
      if (activePriorityFilter) params.priority = activePriorityFilter;
      if (activeAssigneeFilter) params.assigned_to = activeAssigneeFilter;
      if (activeDueDateFilter) params.due_date = activeDueDateFilter;
      if (activeSearch) params.search = activeSearch;

      const [tasksResponse, projectsResponse, usersResponse] = await Promise.all([
        api.get("/tasks/", { params }),
        api.get("/projects/"),
        api.get("/users/"),
      ]);

      setTasks(tasksResponse.data);
      setProjects(projectsResponse.data);
      setUsers(usersResponse.data);
      setError("");
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to load tasks."));
    }
  }, [activeProjectFilter, activeStatusFilter, activePriorityFilter, activeAssigneeFilter, activeDueDateFilter, activeSearch]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await loadTasks();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loadTasks]);

  const taskGroups = useMemo(() => {
    return statusOrder.reduce((accumulator, status) => {
      accumulator[status] = tasks.filter((task) => task.status === status);
      return accumulator;
    }, {});
  }, [tasks]);

  const openCreateModal = () => {
    setEditingTaskId(null);
    setForm(defaultForm);
    setShowModal(true);
    setSuccess("");
  };

  const openEditModal = (task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      project_id: task.project?.id || "",
      assigned_to_id: task.assigned_to?.id || "",
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ? task.due_date.slice(0, 16) : "",
    });
    setShowModal(true);
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = {
        title: form.title,
        description: form.description,
        project_id: form.project_id || null,
        assigned_to_id: form.assigned_to_id || null,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
      };

      if (editingTaskId) {
        await api.patch(`/tasks/${editingTaskId}/`, payload);
      } else {
        await api.post("/tasks/", payload);
      }

      setShowModal(false);
      setSuccess(editingTaskId ? "Task updated." : "Task created.");
      await loadTasks();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save the task."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) {
      return;
    }

    try {
      await api.delete(`/tasks/${taskId}/`);
      setSuccess("Task deleted.");
      await loadTasks();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to delete the task."));
    }
  };

  const handleStatusChange = async (task, nextStatus) => {
    try {
      await api.patch(`/tasks/${task.id}/`, { status: nextStatus });
      setSuccess("Task updated.");
      await loadTasks();
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to update task status."));
    }
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="section-page">
      <div className="page-toolbar">
        <div>
          <span className="panel-kicker">EXECUTION</span>
          <h2>Tasks</h2>
          <p>Manage tasks, priorities, assignments, and deadlines across the workspace.</p>
        </div>

        <button type="button" className="primary-button" onClick={openCreateModal}>+ New task</button>
      </div>

      <div className="toolbar-row">
        <select
          value={activeProjectFilter}
          onChange={(event) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), project: event.target.value })}
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>

        <select
          value={activeStatusFilter}
          onChange={(event) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), status: event.target.value })}
        >
          <option value="">All statuses</option>
          {statusOrder.map((status) => (
            <option key={status} value={status}>{status.replace("_", " ")}</option>
          ))}
        </select>

        <select
          value={activePriorityFilter}
          onChange={(event) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), priority: event.target.value })}
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <select
          aria-label="Filter by assignee"
          value={activeAssigneeFilter}
          onChange={(event) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), assigned_to: event.target.value })}
        >
          <option value="">All assignees</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.username}</option>
          ))}
        </select>

        <input
          aria-label="Filter by due date"
          type="date"
          value={activeDueDateFilter}
          onChange={(event) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), due_date: event.target.value })}
        />

        <input
          type="text"
          value={activeSearch}
          onChange={(event) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), search: event.target.value })}
          placeholder="Search task title or description"
        />

        <button type="button" className="secondary-button" onClick={clearFilters}>Clear</button>
      </div>

      <div className="toggle-row">
        <button
          type="button"
          className={viewMode === "list" ? "tab-button active" : "tab-button"}
          onClick={() => setViewMode("list")}
        >
          List
        </button>
        <button
          type="button"
          className={viewMode === "board" ? "tab-button active" : "tab-button"}
          onClick={() => setViewMode("board")}
        >
          Board
        </button>
      </div>

      {error && <div className="error-state">{error}</div>}
      {success && <div className="success-state">{success}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="large-empty-state">
          <div className="empty-illustration">✓</div>
          <h3>No tasks found</h3>
          <p>Try adjusting your filters or create your first task.</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="task-list" style={{ marginTop: 20 }}>
          {tasks.map((task) => (
            <article className="task-row" key={task.id}>
              <button className={`task-checkbox ${task.completed ? "checked" : ""}`} aria-label={task.completed ? "Mark incomplete" : "Mark complete"} onClick={() => handleStatusChange(task, task.completed ? "TODO" : "COMPLETED")}> {task.completed ? "✓" : ""} </button>

              <div className="task-main">
                <h4 className={task.completed ? "task-completed" : ""}>{task.title}</h4>
                <p>{task.description || "No description provided"}</p>
                <span>
                  {task.project?.name || "Standalone task"} · {task.assigned_to ? `Assigned to ${task.assigned_to.username}` : "Unassigned"} · {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}
                </span>
              </div>

              <span className="pill">{task.priority}</span>
              <span className={`status-badge ${task.completed ? "success" : "neutral"}`}>{task.status}</span>

              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => openEditModal(task)}>Edit</button>
                <button type="button" className="danger-button" onClick={() => handleDeleteTask(task.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="kanban-board" style={{ marginTop: 20 }}>
          {statusOrder.map((status) => (
            <div className="kanban-column" key={status}>
              <div className="kanban-header">
                <strong>{status.replace("_", " ")}</strong>
                <span>{taskGroups[status].length}</span>
              </div>

              <div className="kanban-cards">
                {taskGroups[status].length === 0 ? (
                  <div className="empty-minimal">No tasks</div>
                ) : (
                  taskGroups[status].map((task) => (
                    <div className="kanban-card" key={task.id}>
                      <div className="kanban-card-header">
                        <strong>{task.title}</strong>
                        <span className="pill">{task.priority}</span>
                      </div>
                      <p>{task.description || "No description"}</p>
                      <div className="kanban-meta">
                        <span>{task.project?.name || "Standalone"}</span>
                        <span>{task.assigned_to ? task.assigned_to.username : "Unassigned"}</span>
                      </div>
                      <div className="inline-actions compact">
                        <button type="button" className="secondary-button" onClick={() => openEditModal(task)}>Edit</button>
                        <button type="button" className="danger-button" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card modal-wide" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <span className="panel-kicker">{editingTaskId ? "EDIT" : "CREATE"}</span>
                <h3>{editingTaskId ? "Update task" : "Create task"}</h3>
              </div>
              <button type="button" className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <label>
                Title
                <input type="text" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              </label>

              <label>
                Description
                <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>

              <div className="form-grid">
                <label>
                  Project
                  <select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })}>
                    <option value="">Standalone task</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Assignee
                  <select value={form.assigned_to_id} onChange={(event) => setForm({ ...form, assigned_to_id: event.target.value })}>
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Priority
                  <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </label>

                <label>
                  Status
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    {statusOrder.map((status) => (
                      <option key={status} value={status}>{status.replace("_", " ")}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Due date
                <input type="datetime-local" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
              </label>

              {error && <div className="error-state">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : editingTaskId ? "Save task" : "Create task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}