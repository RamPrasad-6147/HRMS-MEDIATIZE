import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  UserPlus,
  Edit2,
  UserX,
  UserRound,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ArrowLeft,
  Briefcase,
  Users,
  Check,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { ConfirmDialog } from "../../shared/components/Modal";
import {
  getProjectById,
  getProjectTeam,
  updateProjectStatus,
  updateProjectProgress,
  removeEmployee,
} from "../services/projectApi";
import { ProjectStatusBadge, ProjectPriorityBadge, ProjectProgress } from "../components/ProjectBadges";
import AssignEmployeeModal from "../components/AssignEmployeeModal";
import { showSuccess, showError } from "../../shared/utils/toast";

export default function HRProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressVal, setProgressVal] = useState(0);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([getProjectById(id), getProjectTeam(id)]);
      setProject(pRes.data);
      setProgressVal(pRes.data.progress_percentage || 0);
      setTeam(tRes.data || []);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to load project details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await updateProjectStatus(id, newStatus);
      setProject(res.data);
      showSuccess(`Project status updated to ${newStatus}`);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleProgressSave = async () => {
    try {
      const res = await updateProjectProgress(id, progressVal);
      setProject(res.data);
      setEditingProgress(false);
      showSuccess("Project progress updated successfully!");
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to update progress.");
    }
  };

  const confirmRemoveEmployee = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeEmployee(id, removeTarget.assignment_id);
      showSuccess(`Removed ${removeTarget.employee_name} from project.`);
      setRemoveTarget(null);
      loadProjectData();
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to remove employee.");
    } finally {
      setRemoving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const dt = new Date(dateStr);
      return dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout title="Project Details">
      <div className="hrms-page-container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/projects/list" role="HR" />

        {loading || !project ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading project details...
          </div>
        ) : (
          <>
            {/* Top Header Card */}
            <div className="hrms-card" style={{ padding: "2rem", marginBottom: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--primary-light)", color: "var(--primary-color)", border: "1px solid var(--primary-border)" }}>
                      {project.project_code}
                    </span>
                    <ProjectStatusBadge status={project.status} />
                    <ProjectPriorityBadge priority={project.priority} />
                    {project.is_overdue && (
                      <span className="hrms-badge hrms-badge-danger">
                        <AlertCircle size={12} /> OVERDUE
                      </span>
                    )}
                  </div>

                  <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.5rem 0", letterSpacing: "-0.02em" }}>
                    {project.name}
                  </h1>
                </div>

                <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/hr/projects/${id}/edit`)}
                    className="hrms-btn hrms-btn-secondary"
                  >
                    <Edit2 size={15} /> Edit Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(true)}
                    className="hrms-btn hrms-btn-primary"
                  >
                    <UserPlus size={15} /> Assign Employee
                  </button>
                </div>
              </div>

              {project.description && (
                <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "800px" }}>
                  {project.description}
                </p>
              )}

              {/* Timeline & Progress Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                  gap: "1.25rem",
                  padding: "1.25rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-color)",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", backgroundColor: "var(--primary-light)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                      Start Date
                    </span>
                    <strong style={{ fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                      {formatDate(project.start_date)}
                    </strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", backgroundColor: "rgba(14, 165, 233, 0.12)", color: "var(--info-color)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                      Target End Date
                    </span>
                    <strong style={{ fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                      {formatDate(project.end_date) || "Ongoing"}
                    </strong>
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1", paddingTop: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      Overall Progress
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingProgress(!editingProgress)}
                      className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    >
                      {editingProgress ? "Done Adjusting" : "Adjust Progress"}
                    </button>
                  </div>

                  {editingProgress ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={progressVal}
                        onChange={(e) => setProgressVal(parseInt(e.target.value, 10))}
                        style={{ flex: 1, accentColor: "var(--primary-color)" }}
                      />
                      <button
                        type="button"
                        onClick={handleProgressSave}
                        className="hrms-btn hrms-btn-primary hrms-btn-sm"
                      >
                        Save ({progressVal}%)
                      </button>
                    </div>
                  ) : (
                    <ProjectProgress percentage={project.progress_percentage} />
                  )}
                </div>
              </div>

              {/* Status Switcher Bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", paddingTop: "0.5rem" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Change Project Status:
                </span>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={project.status === st || updatingStatus}
                      onClick={() => handleStatusChange(st)}
                      className={`hrms-btn hrms-btn-sm ${project.status === st ? "hrms-btn-primary" : "hrms-btn-secondary"}`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Roster Section Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.1875rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Project Team ({team.filter((t) => t.assignment_status === "ACTIVE").length} active members)
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "0.2rem 0 0 0" }}>
                  Engineers and leads currently assigned to deliver this initiative
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="hrms-btn hrms-btn-primary hrms-btn-sm"
              >
                <UserPlus size={14} /> Assign Team Member
              </button>
            </div>

            {/* Team Table */}
            <div className="hrms-table-container">
              {team.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                  No employees assigned to this project yet.
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="employee-desktop-table hrms-table-wrapper">
                    <table className="hrms-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Project Role</th>
                          <th>Assigned Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.map((m) => (
                          <tr key={m.assignment_id || m.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", backgroundColor: "var(--primary-color)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                                  {m.employee_name?.[0]}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                    {m.employee_name}
                                  </div>
                                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    {m.employee_code} • {m.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "var(--primary-color)" }}>
                                {m.project_role_name}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                              {formatDate(m.assigned_date)}
                            </td>
                            <td>
                              <span className={`hrms-badge ${m.assignment_status === "ACTIVE" ? "hrms-badge-success" : "hrms-badge-neutral"}`}>
                                <span className="hrms-status-dot" /> {m.assignment_status}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => setRemoveTarget(m)}
                                className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                                style={{ color: "var(--danger-color)" }}
                              >
                                <UserX size={14} /> Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="employee-mobile-cards" style={{ padding: "1rem" }}>
                    {team.map((m) => (
                      <div key={m.assignment_id || m.id} className="hrms-card" style={{ padding: "1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                              {m.employee_name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {m.employee_code} • {m.email}
                            </div>
                          </div>
                          <span className={`hrms-badge ${m.assignment_status === "ACTIVE" ? "hrms-badge-success" : "hrms-badge-neutral"}`}>
                            {m.assignment_status}
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>Role:</span>
                          <span style={{ fontWeight: 600, color: "var(--primary-color)" }}>{m.project_role_name}</span>
                        </div>

                        <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(m)}
                            className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                            style={{ color: "var(--danger-color)", width: "100%" }}
                          >
                            <UserX size={14} /> Remove Member
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Assign Employee Modal */}
            <AssignEmployeeModal
              isOpen={assignModalOpen}
              onClose={() => setAssignModalOpen(false)}
              projectId={id}
              onAssigned={() => {
                setAssignModalOpen(false);
                loadProjectData();
              }}
            />

            {/* Confirm Remove Dialog */}
            <ConfirmDialog
              isOpen={Boolean(removeTarget)}
              onClose={() => setRemoveTarget(null)}
              onConfirm={confirmRemoveEmployee}
              title="Remove Team Member"
              message={`Are you sure you want to remove ${removeTarget?.employee_name} from this project?`}
              confirmText="Yes, Remove Member"
              confirmVariant="danger"
              loading={removing}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
