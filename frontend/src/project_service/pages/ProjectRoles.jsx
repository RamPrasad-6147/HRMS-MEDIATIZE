import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  ShieldAlert,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  Briefcase,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import Modal from "../../shared/components/Modal";
import Input, { TextArea } from "../../shared/components/Input";
import Button from "../../shared/components/Button";
import { RoleStatusBadge } from "../components/ProjectBadges";
import { getProjectRoles, createProjectRole, updateProjectRole } from "../services/projectApi";

export default function ProjectRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", is_active: true });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await getProjectRoles();
      setRoles(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load project roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateErrors({});
    if (!createForm.name.trim()) {
      setCreateErrors({ name: "Role name is required" });
      return;
    }
    setSubmittingCreate(true);
    try {
      await createProjectRole(createForm);
      toast.success("Project role created successfully!");
      setIsCreateOpen(false);
      setCreateForm({ name: "", description: "" });
      fetchRoles();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to create project role";
      toast.error(msg);
      if (typeof msg === "string" && msg.toLowerCase().includes("name")) {
        setCreateErrors({ name: msg });
      }
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleOpenEdit = (role) => {
    setSelectedRole(role);
    setEditForm({
      name: role.name,
      description: role.description || "",
      is_active: role.is_active,
    });
    setEditErrors({});
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setEditErrors({});
    if (!editForm.name.trim()) {
      setEditErrors({ name: "Role name is required" });
      return;
    }
    setSubmittingEdit(true);
    try {
      await updateProjectRole(selectedRole.id, editForm);
      toast.success("Project role updated successfully!");
      setIsEditOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to update project role";
      toast.error(msg);
      if (typeof msg === "string" && msg.toLowerCase().includes("name")) {
        setEditErrors({ name: msg });
      }
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (role) => {
    const nextStatus = !role.is_active;
    try {
      await updateProjectRole(role.id, { is_active: nextStatus });
      toast.success(`Role ${nextStatus ? "activated" : "deactivated"} successfully`);
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change role status");
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRoles = roles.length;
  const activeRoles = roles.filter((r) => r.is_active).length;
  const inactiveRoles = totalRoles - activeRoles;

  return (
    <AppLayout>
      <div className="hrms-page-container">
        <BackToDashboard />

        {/* Page Header */}
        <div className="hrms-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="hrms-badge hrms-badge-primary">Governance</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Role Matrix</span>
            </div>
            <h1 className="hrms-page-title">Project Roles</h1>
            <p className="hrms-page-subtitle">
              Define standard delivery roles and permissions for project member assignments (e.g. Lead, Developer, QA).
            </p>
          </div>
          <div className="hrms-page-actions">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={fetchRoles}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setCreateForm({ name: "", description: "" });
                setCreateErrors({});
                setIsCreateOpen(true);
              }}
            >
              Create Role
            </Button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div className="hrms-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>Total Defined Roles</span>
              <Briefcase size={18} style={{ color: "var(--primary-color)" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {totalRoles}
            </div>
          </div>

          <div className="hrms-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>Active for Assignment</span>
              <CheckCircle2 size={18} style={{ color: "var(--success-color, #10b981)" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--success-color, #10b981)" }}>
              {activeRoles}
            </div>
          </div>

          <div className="hrms-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>Archived / Inactive</span>
              <XCircle size={18} style={{ color: "var(--text-muted)" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              {inactiveRoles}
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="hrms-card" style={{ marginBottom: "1.5rem" }}>
          <div className="hrms-card-body" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ position: "relative", maxWidth: "420px" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                className="hrms-input"
                placeholder="Search roles by title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "2.35rem", width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Table / List View */}
        <div className="hrms-card">
          <div className="hrms-card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <Loader2 className="hrms-spinner" size={32} style={{ margin: "0 auto 1rem", color: "var(--primary-color)" }} />
                <p style={{ color: "var(--text-secondary)" }}>Loading project roles...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                <Briefcase size={40} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
                  {search ? "No matching roles found" : "No project roles created yet"}
                </h3>
                <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                  {search
                    ? "Try adjusting your search query to find the desired role."
                    : "Create standardized project roles (like Lead, Architect, Developer) to assign to team members when allocating projects."}
                </p>
                {!search && (
                  <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => setIsCreateOpen(true)}
                  >
                    Create First Role
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop View (>= 768px) */}
                <div className="employee-desktop-table hrms-table-container">
                  <table className="hrms-table">
                    <thead>
                      <tr>
                        <th>Role Name</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoles.map((role) => (
                        <tr key={role.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "8px",
                                  background: role.is_active ? "var(--primary-subtle, rgba(99, 102, 241, 0.1))" : "var(--bg-surface-elevated)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: role.is_active ? "var(--primary-color)" : "var(--text-muted)",
                                  fontWeight: 600,
                                  fontSize: "0.8125rem",
                                }}
                              >
                                {role.name ? role.name.charAt(0).toUpperCase() : "R"}
                              </div>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {role.name}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: "var(--text-secondary)", maxWidth: "340px" }}>
                            {role.description || <span style={{ fontStyle: "italic", opacity: 0.6 }}>No description</span>}
                          </td>
                          <td>
                            <RoleStatusBadge isActive={role.is_active} />
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            {new Date(role.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={Edit2}
                                onClick={() => handleOpenEdit(role)}
                                title="Edit Role"
                              >
                                Edit
                              </Button>
                              <Button
                                variant={role.is_active ? "outline" : "primary"}
                                size="sm"
                                icon={role.is_active ? XCircle : CheckCircle2}
                                onClick={() => handleToggleStatus(role)}
                                title={role.is_active ? "Deactivate Role" : "Activate Role"}
                              >
                                {role.is_active ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (< 768px) */}
                <div className="employee-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}>
                  {filteredRoles.map((role) => (
                    <div
                      key={role.id}
                      style={{
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "var(--bg-surface-elevated, #ffffff)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                            {role.name}
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                            {role.description || <span style={{ fontStyle: "italic", opacity: 0.6 }}>No description</span>}
                          </div>
                        </div>
                        <RoleStatusBadge isActive={role.is_active} />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                        <span>Created: {new Date(role.created_at).toLocaleDateString()}</span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Edit2}
                            onClick={() => handleOpenEdit(role)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={role.is_active ? "outline" : "primary"}
                            size="sm"
                            icon={role.is_active ? XCircle : CheckCircle2}
                            onClick={() => handleToggleStatus(role)}
                          >
                            {role.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CREATE ROLE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Project Role"
      >
        <form onSubmit={handleCreateSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Input
              label="Role Name *"
              placeholder="e.g. Lead Engineer, UI/UX Designer, QA Specialist"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              error={createErrors.name}
              required
            />
            <TextArea
              label="Description (Optional)"
              rows={4}
              placeholder="Briefly describe the key responsibilities of this project role..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={submittingCreate}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingCreate}
                icon={Plus}
              >
                Create Role
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT ROLE MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Project Role"
      >
        <form onSubmit={handleEditSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Input
              label="Role Name *"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              error={editErrors.name}
              required
            />
            <TextArea
              label="Description"
              rows={4}
              placeholder="Briefly describe the key responsibilities..."
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                type="checkbox"
                id="edit_role_is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                style={{ width: "18px", height: "18px", cursor: "pointer", flexShrink: 0 }}
              />
              <label htmlFor="edit_role_is_active" style={{ cursor: "pointer", fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                Active Status (Allow assignment to projects)
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={submittingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingEdit}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
