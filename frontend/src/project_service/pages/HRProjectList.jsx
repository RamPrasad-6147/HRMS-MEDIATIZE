import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Filter, SlidersHorizontal, ArrowLeft, ArrowRight, Eye, Edit2, RotateCcw, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getProjects } from "../services/projectApi";
import { ProjectStatusBadge, ProjectPriorityBadge, ProjectProgress } from "../components/ProjectBadges";
import { showError } from "../../shared/utils/toast";

export default function HRProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        ...(search.trim() && { search: search.trim() }),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
      };
      const res = await getProjects(params);
      setProjects(res.data.items || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to load project directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setPage(1);
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
    <AppLayout title="All Projects">
      <div className="hrms-page-container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/projects" role="HR" />

        {/* Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Project Directory</h1>
            <p className="hrms-page-subtitle">
              Manage organization deliverables, status lifecycles, and team allocations ({totalItems} total records)
            </p>
          </div>

          <div className="hrms-page-actions">
            <Link to="/hr/projects/create" className="hrms-btn hrms-btn-primary">
              <Plus size={16} strokeWidth={2.2} /> Create Project
            </Link>
          </div>
        </div>

        {/* Filters Card */}
        <div className="hrms-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 280px" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search project code, name, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="hrms-input"
                  style={{ paddingLeft: "2.35rem" }}
                />
              </div>

              <button type="submit" className="hrms-btn hrms-btn-primary">
                Search
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 180px" }}>
                <label className="hrms-label">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="hrms-select"
                >
                  <option value="">All Statuses</option>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div style={{ flex: "1 1 180px" }}>
                <label className="hrms-label">Priority Filter</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="hrms-select"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              {(search || statusFilter || priorityFilter) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                  style={{ height: "38px" }}
                >
                  <RotateCcw size={14} /> Reset Filters
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Content Table */}
        <div className="hrms-table-container">
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: "3.5rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
              No projects found matching search criteria.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="employee-desktop-table hrms-table-wrapper">
                <table className="hrms-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Project Name</th>
                      <th>Timeline</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th style={{ minWidth: "160px" }}>Progress</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
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
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.description}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                          {formatDate(p.start_date)} to {formatDate(p.end_date)}
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
                          <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/hr/projects/${p.id}`)}
                              className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/hr/projects/${p.id}/edit`)}
                              className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="employee-mobile-cards" style={{ padding: "1rem" }}>
                {projects.map((p) => (
                  <div key={p.id} className="hrms-card" style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-color)" }}>
                          {p.project_code}
                        </span>
                        <h3 style={{ margin: "0.2rem 0", fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {p.name}
                        </h3>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
                      <ProjectPriorityBadge priority={p.priority} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formatDate(p.start_date)} - {formatDate(p.end_date)}
                      </span>
                    </div>

                    <div style={{ margin: "0.75rem 0" }}>
                      <ProjectProgress percentage={p.progress_percentage} />
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/hr/projects/${p.id}`)}
                        className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                        style={{ flex: 1 }}
                      >
                        <Eye size={13} /> View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/hr/projects/${p.id}/edit`)}
                        className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                        style={{ flex: 1 }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.875rem 1.25rem",
                    borderTop: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-surface)",
                  }}
                >
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} projects)
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
