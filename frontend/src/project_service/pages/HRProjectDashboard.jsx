import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  SlidersHorizontal,
  Briefcase,
  ArrowRight,
  TrendingUp,
  Eye,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getHRProjectMetrics, getProjects } from "../services/projectApi";
import { ProjectStatusBadge, ProjectPriorityBadge, ProjectProgress } from "../components/ProjectBadges";
import { showError } from "../../shared/utils/toast";

export default function HRProjectDashboard() {
  const [metrics, setMetrics] = useState({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    on_hold_projects: 0,
    overdue_projects: 0,
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        getHRProjectMetrics(),
        getProjects({ page: 1, limit: 5 }),
      ]);
      setMetrics(mRes.data);
      setRecentProjects(pRes.data.items || []);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to load project dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppLayout title="Project Management">
      <div className="hrms-page-container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/dashboard" role="HR" />

        {/* Top Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Project Management</h1>
            <p className="hrms-page-subtitle">
              Monitor organization initiatives, lifecycle progress, priority distributions & deliverables
            </p>
          </div>

          <div className="hrms-page-actions">
            <Link to="/hr/project-roles" className="hrms-btn hrms-btn-secondary">
              <SlidersHorizontal size={15} /> Manage Roles
            </Link>
            <Link to="/hr/projects/create" className="hrms-btn hrms-btn-primary">
              <Plus size={16} strokeWidth={2.2} /> Create Project
            </Link>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          <div className="hrms-card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FolderKanban size={22} />
            </div>
            <div>
              <span style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--text-primary)", display: "block", lineHeight: 1.2, fontFamily: "var(--font-mono)" }}>
                {metrics.total_projects}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Total Projects
              </span>
            </div>
          </div>

          <div className="hrms-card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(14, 165, 233, 0.12)",
                color: "var(--info-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <span style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--text-primary)", display: "block", lineHeight: 1.2, fontFamily: "var(--font-mono)" }}>
                {metrics.active_projects}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Active / Running
              </span>
            </div>
          </div>

          <div className="hrms-card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                color: "var(--success-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--text-primary)", display: "block", lineHeight: 1.2, fontFamily: "var(--font-mono)" }}>
                {metrics.completed_projects}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Completed
              </span>
            </div>
          </div>

          <div className="hrms-card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                color: "var(--warning-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Clock size={22} />
            </div>
            <div>
              <span style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--text-primary)", display: "block", lineHeight: 1.2, fontFamily: "var(--font-mono)" }}>
                {metrics.on_hold_projects}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                On Hold
              </span>
            </div>
          </div>

          <div className="hrms-card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                color: "var(--danger-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertCircle size={22} />
            </div>
            <div>
              <span style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--text-primary)", display: "block", lineHeight: 1.2, fontFamily: "var(--font-mono)" }}>
                {metrics.overdue_projects}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Overdue
              </span>
            </div>
          </div>
        </div>

        {/* Recent Projects Section Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1875rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Recent Projects
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "0.2rem 0 0 0" }}>
              Latest corporate client deliverables and internal projects
            </p>
          </div>

          <Link
            to="/hr/projects/list"
            className="hrms-btn hrms-btn-ghost hrms-btn-sm"
            style={{ color: "var(--primary-color)", fontWeight: 600 }}
          >
            View All Projects <ArrowRight size={14} />
          </Link>
        </div>

        {/* Projects Table */}
        <div className="hrms-table-container">
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Loading project metrics...
            </div>
          ) : recentProjects.length === 0 ? (
            <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
              <FolderKanban size={40} style={{ color: "var(--text-muted)", margin: "0 auto 0.75rem auto" }} />
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                No Projects Created Yet
              </h3>
              <p style={{ margin: "0.35rem 0 1.25rem 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Launch your first organization project above
              </p>
              <Link to="/hr/projects/create" className="hrms-btn hrms-btn-primary">
                <Plus size={16} /> Create Project
              </Link>
            </div>
          ) : (
            <div className="hrms-table-wrapper">
              <table className="hrms-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Project Name</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th style={{ minWidth: "160px" }}>Progress</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, color: "var(--primary-color)" }}>
                          {p.project_code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          {p.name}
                        </div>
                        {p.description && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <ProjectPriorityBadge priority={p.priority} />
                      </td>
                      <td>
                        <ProjectStatusBadge status={p.status} />
                      </td>
                      <td>
                        <ProjectProgress percentage={p.progress_percentage} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/hr/projects/${p.id}`)}
                          className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
