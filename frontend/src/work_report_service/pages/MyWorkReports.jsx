import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye, Paperclip, FileText, ChevronLeft, ChevronRight, X, ArrowLeft, RefreshCw } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getMyWorkReports, getMyAssignedProjects } from "../services/workReportApi";
import { showError } from "../../shared/utils/toast";

function MyWorkReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Detail Modal State
  const [selectedReport, setSelectedReport] = useState(null);

  // Fetch assigned projects for filter dropdown
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await getMyAssignedProjects();
        setProjects(res.data || []);
      } catch (err) {
        console.error("Failed to load projects for filter", err);
      }
    }
    loadProjects();
  }, []);

  // Fetch employee's work reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        project_id: selectedProjectId || undefined,
      };
      const res = await getMyWorkReports(params);
      setReports(res.data?.items || []);
      setTotalPages(res.data?.pages || 1);
      setTotalItems(res.data?.total || 0);
    } catch (err) {
      console.error("Failed to fetch work reports", err);
      showError("Failed to load work reports.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedProjectId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <AppLayout title="My Work Reports">
      <div style={styles.container}>
        <BackToDashboard to="/employee/dashboard" role="EMPLOYEE" icon={ArrowLeft} />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Work Reports</h1>
            <p style={styles.subtitle}>
              Track and review all your submitted daily work reports and task progress
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              style={{ ...styles.secondaryNavBtn, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
              onClick={fetchReports}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
            </button>
            <Link
              to="/employee/work-reports/new"
              style={{ ...styles.primaryNavBtn, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Plus size={16} /> Submit Today's Report
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={styles.filterCard}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Filter by Project:</label>
            <select
              style={styles.select}
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Assigned Projects</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name} ({p.project_code})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.summaryBadge}>
            Total Reports: <strong>{totalItems}</strong>
          </div>
        </div>

        {/* Reports Table View (Desktop ≥768px) */}
        {loading ? (
          <div style={styles.emptyState}>Loading work reports...</div>
        ) : reports.length === 0 ? (
          <div style={styles.emptyCard}>
            <FileText size={40} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
            <h3 style={styles.emptyTitle}>No Work Reports Found</h3>
            <p style={styles.emptySubtitle}>
              {selectedProjectId
                ? "No work reports submitted for the selected project filter."
                : "You have not submitted any daily work reports yet."}
            </p>
            <Link to="/employee/work-reports/new" style={{ ...styles.primaryNavBtn, marginTop: "1rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
              <Plus size={16} /> Submit Your First Report
            </Link>
          </div>
        ) : (
          <div>
            <div className="employee-desktop-table" style={styles.tableWrapper}>
              <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Report Date</th>
                      <th style={styles.th}>Project</th>
                      <th style={styles.th}>Work Description</th>
                      <th style={styles.th}>Attachment</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} style={styles.tr}>
                        <td style={styles.td}>
                          <strong>{r.report_date}</strong>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: "600" }}>{r.project_name || "Project"}</div>
                          <span style={styles.subText}>{r.project_code}</span>
                        </td>
                        <td style={{ ...styles.td, maxWidth: "300px" }}>
                          <div style={styles.descriptionSnippet}>
                            {r.work_description}
                          </div>
                          {r.problems_faced && (
                            <span style={styles.blockerBadge} title={r.problems_faced}>
                              Blockers Reported
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {r.document_url ? (
                            <a
                              href={r.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.attachmentLink}
                            >
                              <Paperclip size={14} /> {r.document_name || "Attachment"}
                            </a>
                          ) : (
                            <span style={styles.subText}>No attachment</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <button
                            style={styles.viewBtn}
                            onClick={() => setSelectedReport(r)}
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View (<768px) */}
            <div className="employee-mobile-cards" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {reports.map((r) => (
                <div key={r.id} style={styles.mobileCard}>
                  <div style={styles.mobileCardHeader}>
                    <div>
                      <h4 style={styles.mobileCardTitle}>{r.project_name || "Project"}</h4>
                      <span style={styles.subText}>{r.report_date} &bull; {r.project_code}</span>
                    </div>
                    <button style={styles.viewBtn} onClick={() => setSelectedReport(r)}>
                      <Eye size={14} /> View
                    </button>
                  </div>
                  <div style={styles.mobileCardBody}>
                    <p style={styles.mobileDesc}>{r.work_description}</p>
                    {r.problems_faced && (
                      <div style={styles.mobileBlocker}>
                        <strong>Problems Faced:</strong> {r.problems_faced}
                      </div>
                    )}
                    {r.document_url && (
                      <div style={{ marginTop: "0.375rem" }}>
                        <a href={r.document_url} target="_blank" rel="noopener noreferrer" style={styles.attachmentLink}>
                          <Paperclip size={14} /> {r.document_name || "View Attachment"}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={styles.paginationRow}>
                <span style={styles.pageInfo}>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total)
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    style={styles.pageBtn}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button
                    style={styles.pageBtn}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Report Details Modal */}
        {selectedReport && (
          <div style={styles.modalOverlay} onClick={() => setSelectedReport(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={styles.modalTitle}>Work Report Details</h3>
                  <span style={styles.modalSub}>{selectedReport.report_date}</span>
                </div>
                <button style={styles.closeBtn} onClick={() => setSelectedReport(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Project</label>
                  <div style={styles.detailValue}>
                    {selectedReport.project_name} ({selectedReport.project_code})
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Work Description</label>
                  <div style={styles.detailTextContent}>
                    {selectedReport.work_description}
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Problems Faced</label>
                  <div style={styles.detailTextContent}>
                    {selectedReport.problems_faced ? selectedReport.problems_faced : "None reported."}
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Attachment</label>
                  <div>
                    {selectedReport.document_url ? (
                      <a
                        href={selectedReport.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.attachmentButton}
                      >
                        <Paperclip size={16} /> Download / View {selectedReport.document_name || "Attachment"}
                      </a>
                    ) : (
                      <span style={styles.subText}>No attachment uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button style={styles.secondaryBtn} onClick={() => setSelectedReport(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const styles = {
  container: {
    padding: "0 0 2.5rem 0",
  },
  header: {
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },
  secondaryNavBtn: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  primaryNavBtn: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: "600",
    textDecoration: "none",
    cursor: "pointer",
  },
  filterCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "1rem 1.25rem",
    marginBottom: "1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  filterLabel: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-secondary)",
  },
  select: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
  },
  summaryBadge: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  tableWrapper: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    overflowX: "auto",
    maxWidth: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "0.9rem",
  },
  th: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-muted)",
    padding: "0.875rem 1rem",
    fontWeight: "600",
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--border-color)",
  },
  tr: {
    borderBottom: "1px solid var(--border-color)",
  },
  td: {
    padding: "0.875rem 1rem",
    color: "var(--text-primary)",
  },
  subText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  descriptionSnippet: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    lineHeight: "1.4",
  },
  blockerBadge: {
    display: "inline-block",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "var(--danger-color)",
    fontSize: "0.7rem",
    fontWeight: "700",
    padding: "0.1rem 0.4rem",
    borderRadius: "var(--radius-sm)",
    marginTop: "0.25rem",
  },
  attachmentLink: {
    color: "var(--primary-color)",
    fontSize: "0.85rem",
    fontWeight: "600",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  viewBtn: {
    backgroundColor: "transparent",
    color: "var(--primary-color)",
    border: "1px solid var(--border-color)",
    padding: "0.35rem 0.75rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
  },
  emptyState: {
    padding: "3rem",
    textAlign: "center",
    color: "var(--text-muted)",
  },
  emptyCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "3.5rem 1.5rem",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    margin: "0 0 0.375rem 0",
  },
  emptySubtitle: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    margin: 0,
  },
  mobileCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "1rem 1.25rem",
  },
  mobileCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.625rem",
    marginBottom: "0.625rem",
  },
  mobileCardTitle: {
    fontSize: "1rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
  },
  mobileCardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  mobileDesc: {
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    margin: 0,
    lineHeight: "1.4",
  },
  mobileBlocker: {
    fontSize: "0.8rem",
    color: "var(--danger-color)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: "0.375rem 0.625rem",
    borderRadius: "var(--radius-sm)",
  },
  paginationRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "1.25rem",
    padding: "0.5rem 0",
  },
  pageInfo: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  pageBtn: {
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.375rem 0.75rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-xl)",
    width: "min(92vw, 560px)",
    maxHeight: "calc(100vh - 32px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "var(--shadow-overlay)",
  },
  modalHeader: {
    padding: "1.25rem 1.5rem",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--bg-surface-elevated)",
  },
  modalTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
  },
  modalSub: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "0.375rem",
  },
  modalBody: {
    padding: "1.5rem",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  detailRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  detailLabel: {
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--text-muted)",
  },
  detailValue: {
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  detailTextContent: {
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "0.875rem",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
  },
  attachmentButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--primary-color)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 0.875rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.85rem",
    fontWeight: "600",
    textDecoration: "none",
  },
  modalFooter: {
    padding: "1rem 1.5rem",
    borderTop: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface-elevated)",
    display: "flex",
    justifyContent: "flex-end",
  },
  secondaryBtn: {
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1.25rem",
    borderRadius: "var(--radius-md)",
    fontWeight: "600",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
};

export default MyWorkReports;
