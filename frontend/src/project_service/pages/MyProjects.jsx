import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FolderGit2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  UserCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import Modal from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import {
  ProjectStatusBadge,
  ProjectPriorityBadge,
  ProgressBar,
} from "../components/ProjectBadges";
import { getMyProjects, getMyProjectDetails } from "../services/projectApi";

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected project detail modal state
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const fetchMyProjects = async () => {
    setLoading(true);
    try {
      const res = await getMyProjects();
      setProjects(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load assigned projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const handleOpenDetail = async (projectId) => {
    setCurrentProjectId(projectId);
    setIsDetailOpen(true);
    setLoadingDetails(true);
    setDetailError(null);
    setSelectedProject(null);
    try {
      const res = await getMyProjectDetails(projectId);
      setSelectedProject(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to load project details";
      setDetailError(msg);
      toast.error(msg);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.project_role_name && p.project_role_name.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  const totalAssigned = projects.length;
  const inProgressCount = projects.filter((p) => p.status === "IN_PROGRESS").length;
  const completedCount = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <AppLayout>
      <div className="hrms-page-container">
        <BackToDashboard role="EMPLOYEE" />

        {/* Page Header */}
        <div className="hrms-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="hrms-badge hrms-badge-primary">Workspaces</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Assignments</span>
            </div>
            <h1 className="hrms-page-title">My Projects</h1>
            <p className="hrms-page-subtitle">
              Track deliverables, milestones, and your specific team roles across assigned client projects.
            </p>
          </div>
          <div className="hrms-page-actions">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={fetchMyProjects}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Metrics */}
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
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>Assigned Projects</span>
              <FolderGit2 size={18} style={{ color: "var(--primary-color)" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {totalAssigned}
            </div>
          </div>

          <div className="hrms-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>Currently Active</span>
              <Clock size={18} style={{ color: "var(--info-color, #0284c7)" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--info-color, #0284c7)" }}>
              {inProgressCount}
            </div>
          </div>

          <div className="hrms-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>Successfully Delivered</span>
              <CheckCircle2 size={18} style={{ color: "var(--success-color, #10b981)" }} />
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--success-color, #10b981)" }}>
              {completedCount}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="hrms-card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              padding: "1rem 1.25rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              width: "100%",
            }}
          >
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 0, width: "100%" }}>
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
                placeholder="Search by project name, code or your role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "2.35rem", width: "100%" }}
              />
            </div>

            {/* Status Filter Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { label: "All Status", val: "ALL" },
                { label: "In Progress", val: "IN_PROGRESS" },
                { label: "Completed", val: "COMPLETED" },
                { label: "On Hold", val: "ON_HOLD" },
                { label: "Planned", val: "PLANNED" },
              ].map((st) => (
                <button
                  key={st.val}
                  type="button"
                  onClick={() => setStatusFilter(st.val)}
                  className={`hrms-btn ${
                    statusFilter === st.val ? "hrms-btn-primary" : "hrms-btn-secondary"
                  }`}
                  style={{
                    padding: "0.4rem 0.85rem",
                    fontSize: "0.8125rem",
                    borderRadius: "8px",
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Grid / Empty State */}
        {loading ? (
          <div className="hrms-card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <Loader2 className="hrms-spinner" size={32} style={{ margin: "0 auto 1rem", color: "var(--primary-color)" }} />
            <p style={{ color: "var(--text-secondary)" }}>Loading your assigned projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="hrms-card" style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <FolderGit2 size={44} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
              {search || statusFilter !== "ALL"
                ? "No projects match your filter"
                : "No Assigned Projects"}
            </h3>
            <p style={{ color: "var(--text-secondary)", margin: 0, maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
              {search || statusFilter !== "ALL"
                ? "Try clearing filters or search terms to see more projects."
                : "You are currently not assigned to any project. Check with your delivery manager or HR team."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
              gap: "1.25rem",
              width: "100%",
              minWidth: 0,
            }}
          >
            {filteredProjects.map((p) => (
              <div
                key={p.project_id}
                className="hrms-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                  overflow: "hidden",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <div style={{ padding: "1.25rem", flex: 1, minWidth: 0 }}>
                  {/* Top Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.85rem",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        padding: "0.25rem 0.55rem",
                        borderRadius: "6px",
                        background: "var(--primary-subtle, rgba(99, 102, 241, 0.1))",
                        color: "var(--primary-color)",
                        wordBreak: "break-all",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      {p.project_code}
                    </span>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                  </div>

                  {/* Project Name */}
                  <h3
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      margin: "0 0 0.5rem",
                      color: "var(--text-primary)",
                      lineHeight: "1.4",
                      wordWrap: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {p.name}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      margin: "0 0 1rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      wordWrap: "break-word",
                      overflowWrap: "anywhere",
                      minHeight: "2.625rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {p.description || "No project description provided."}
                  </p>

                  {/* My Role Pill */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-color)",
                      marginBottom: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <UserCheck size={16} style={{ color: "var(--primary-color)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Designation:</span>
                    <strong style={{ fontSize: "0.875rem", color: "var(--text-primary)", wordBreak: "break-word" }}>
                      {p.project_role_name}
                    </strong>
                  </div>

                  {/* Meta details */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      marginBottom: "1.25rem",
                      padding: "0.75rem",
                      background: "var(--bg-app)",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Calendar size={14} style={{ color: "var(--text-muted)" }} /> Kick-off:
                      </span>
                      <strong style={{ color: "var(--text-primary)" }}>{formatDate(p.start_date)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Clock size={14} style={{ color: "var(--text-muted)" }} /> Due Date:
                      </span>
                      <strong style={{ color: p.is_overdue ? "var(--danger-color, #ef4444)" : "var(--text-primary)" }}>
                        {formatDate(p.end_date) || "Ongoing"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Users size={14} style={{ color: "var(--text-muted)" }} /> Team:
                      </span>
                      <strong style={{ color: "var(--text-primary)" }}>{p.team_members_count} members</strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: "auto", width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Completion</span>
                      <span style={{ color: "var(--text-primary)" }}>{p.progress_percentage}%</span>
                    </div>
                    <ProgressBar percentage={p.progress_percentage} height={6} />
                  </div>
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    padding: "0.85rem 1.25rem",
                    borderTop: "1px solid var(--border-color)",
                    background: "var(--bg-surface-elevated)",
                    display: "flex",
                    justifyContent: "flex-end",
                    width: "100%",
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Eye}
                    onClick={() => handleOpenDetail(p.project_id)}
                    style={{ width: "100%" }}
                  >
                    View Project Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PROJECT DETAILS MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProject(null);
          setDetailError(null);
        }}
        title="Project Assignment Details"
        maxWidth="560px"
      >
        {loadingDetails ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <Loader2 className="hrms-spinner" size={32} style={{ margin: "0 auto 0.75rem", color: "var(--primary-color)" }} />
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>
              Loading project details...
            </p>
          </div>
        ) : detailError ? (
          <div style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
            <AlertTriangle size={36} style={{ color: "var(--danger-color, #ef4444)", margin: "0 auto 0.75rem" }} />
            <h4 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
              Unable to load project details
            </h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.25rem", wordBreak: "break-word" }}>
              {detailError}
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => handleOpenDetail(currentProjectId)}
              style={{ margin: "0 auto" }}
            >
              Retry
            </Button>
          </div>
        ) : selectedProject ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", minWidth: 0 }}>
            {/* Header info */}
            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    background: "var(--primary-subtle, rgba(99, 102, 241, 0.1))",
                    color: "var(--primary-color)",
                    wordBreak: "break-all",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {selectedProject.project?.project_code}
                </span>
                <ProjectStatusBadge status={selectedProject.project?.status} />
                {selectedProject.project?.priority && (
                  <ProjectPriorityBadge priority={selectedProject.project?.priority} />
                )}
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", wordWrap: "break-word", overflowWrap: "anywhere", lineHeight: 1.35 }}>
                {selectedProject.project?.name}
              </h2>
            </div>

            {/* Description */}
            <div>
              <h4 style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.4rem" }}>
                Deliverables Scope
              </h4>
              <p style={{ fontSize: "0.9375rem", color: selectedProject.project?.description ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.5, margin: 0, wordWrap: "break-word", overflowWrap: "anywhere" }}>
                {selectedProject.project?.description || "No description provided for this project."}
              </p>
            </div>

            {/* Role & Timeline Information Card */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
                gap: "1rem 0.75rem",
                padding: "1rem",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.2rem" }}>My Role</span>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", wordBreak: "break-word" }}>
                  {selectedProject.my_role || "N/A"}
                </div>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.2rem" }}>Assigned On</span>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {formatDate(selectedProject.assigned_date)}
                </div>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.2rem" }}>Start Date</span>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {formatDate(selectedProject.project?.start_date)}
                </div>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.2rem" }}>Target Completion</span>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: selectedProject.project?.is_overdue ? "var(--danger-color, #ef4444)" : "var(--text-primary)" }}>
                  {formatDate(selectedProject.project?.end_date)}
                </div>
              </div>
            </div>

            {/* Overall Progress */}
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Overall Project Progress</span>
                <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)" }}>
                  {selectedProject.project?.progress_percentage !== null && selectedProject.project?.progress_percentage !== undefined
                    ? `${selectedProject.project.progress_percentage}%`
                    : "N/A"}
                </span>
              </div>
              <ProgressBar
                percentage={
                  typeof selectedProject.project?.progress_percentage === "number"
                    ? selectedProject.project.progress_percentage
                    : 0
                }
                height={8}
              />
            </div>

            {/* Footer Close Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem", width: "100%" }}>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedProject(null);
                }}
                style={{ width: "100%" }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AppLayout>
  );
}
