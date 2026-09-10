import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye, Paperclip, FileText, ChevronLeft, ChevronRight, X, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getMyComplaints, getActiveComplaintCategories } from "../services/complaintApi";
import { showError } from "../../shared/utils/toast";

function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Detail Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Load categories for filter dropdown
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await getActiveComplaintCategories();
        setCategories(res.data || []);
      } catch (err) {
        console.error("Failed to load categories for filter", err);
      }
    }
    loadCategories();
  }, []);

  // Fetch employee's complaints
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        status: selectedStatus || undefined,
        category_id: selectedCategoryId || undefined,
      };
      const res = await getMyComplaints(params);
      setComplaints(res.data?.items || []);
      setTotalPages(res.data?.pages || 1);
      setTotalItems(res.data?.total || 0);
    } catch (err) {
      console.error("Failed to fetch complaints", err);
      showError("Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedCategoryId]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Helper badge color functions
  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN":
        return <span style={{ ...styles.badge, backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>Open</span>;
      case "UNDER_REVIEW":
        return <span style={{ ...styles.badge, backgroundColor: "rgba(234, 179, 8, 0.15)", color: "#eab308" }}>Under Review</span>;
      case "IN_PROGRESS":
        return <span style={{ ...styles.badge, backgroundColor: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>In Progress</span>;
      case "RESOLVED":
        return <span style={{ ...styles.badge, backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}>Resolved</span>;
      case "CLOSED":
        return <span style={{ ...styles.badge, backgroundColor: "var(--bg-surface-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>Closed</span>;
      case "REJECTED":
        return <span style={{ ...styles.badge, backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>Rejected</span>;
      default:
        return <span style={styles.badge}>{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "URGENT":
        return <span style={{ ...styles.priorityBadge, color: "#ef4444", fontWeight: "700" }}>● Urgent</span>;
      case "HIGH":
        return <span style={{ ...styles.priorityBadge, color: "#f97316", fontWeight: "600" }}>● High</span>;
      case "MEDIUM":
        return <span style={{ ...styles.priorityBadge, color: "#3b82f6", fontWeight: "500" }}>● Medium</span>;
      case "LOW":
        return <span style={{ ...styles.priorityBadge, color: "var(--text-muted)", fontWeight: "400" }}>● Low</span>;
      default:
        return <span>{priority}</span>;
    }
  };

  return (
    <AppLayout title="My Complaints Log">
      <div style={styles.container}>
        <BackToDashboard to="/employee/dashboard" role="EMPLOYEE" icon={ArrowLeft} />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Complaints Log</h1>
            <p style={styles.subtitle}>
              Track progress, HR updates, and resolution statuses of your submitted workplace grievances
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              style={{ ...styles.secondaryNavBtn, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
              onClick={fetchComplaints}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
            </button>
            <Link
              to="/employee/complaints/new"
              style={{ ...styles.primaryNavBtn, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Plus size={16} /> Submit New Complaint
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={styles.filterCard}>
          <div style={styles.filterRow}>
            {/* Status Filter */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Status:</label>
              <select
                style={styles.select}
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Category Filter */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Category:</label>
              <select
                style={styles.select}
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.summaryBadge}>
            Total Submitted: <strong>{totalItems}</strong>
          </div>
        </div>

        {/* Reports Table View (Desktop ≥768px) */}
        {loading ? (
          <div style={styles.emptyState}>Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div style={styles.emptyCard}>
            <FileText size={40} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
            <h3 style={styles.emptyTitle}>No Complaints Found</h3>
            <p style={styles.emptySubtitle}>
              {selectedStatus || selectedCategoryId
                ? "No complaints match the specified status or category filters."
                : "You have not submitted any complaints yet."}
            </p>
            <Link to="/employee/complaints/new" style={{ ...styles.primaryNavBtn, marginTop: "1rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
              <Plus size={16} /> Submit Your First Complaint
            </Link>
          </div>
        ) : (
          <div>
            <div className="employee-desktop-table" style={styles.tableWrapper}>
              <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Code</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Subject & Details</th>
                      <th style={styles.th}>Priority</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.id} style={styles.tr}>
                        <td style={styles.td}>
                          <strong style={{ color: "var(--primary-color)" }}>{c.complaint_code}</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.categoryTag}>{c.category_name || "General"}</span>
                        </td>
                        <td style={{ ...styles.td, maxWidth: "280px" }}>
                          <div style={{ fontWeight: "600" }}>{c.subject}</div>
                          <div style={styles.descriptionSnippet}>
                            {c.description}
                          </div>
                        </td>
                        <td style={styles.td}>{getPriorityBadge(c.priority)}</td>
                        <td style={styles.td}>{getStatusBadge(c.status)}</td>
                        <td style={styles.td}>
                          <span style={styles.subText}>
                            {new Date(c.created_at).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button
                            style={styles.viewBtn}
                            onClick={() => setSelectedComplaint(c)}
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
              {complaints.map((c) => (
                <div key={c.id} style={styles.mobileCard}>
                  <div style={styles.mobileCardHeader}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <strong style={{ color: "var(--primary-color)", fontSize: "0.95rem" }}>{c.complaint_code}</strong>
                        <span style={styles.categoryTag}>{c.category_name}</span>
                      </div>
                      <h4 style={styles.mobileCardTitle}>{c.subject}</h4>
                    </div>
                    <button style={styles.viewBtn} onClick={() => setSelectedComplaint(c)}>
                      <Eye size={14} /> View
                    </button>
                  </div>
                  <div style={styles.mobileCardBody}>
                    <p style={styles.mobileDesc}>{c.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                      <div>{getPriorityBadge(c.priority)}</div>
                      <div>{getStatusBadge(c.status)}</div>
                    </div>
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

        {/* Complaint Details Modal */}
        {selectedComplaint && (
          <div style={styles.modalOverlay} onClick={() => setSelectedComplaint(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: "700", color: "var(--primary-color)", fontSize: "1.1rem" }}>
                      {selectedComplaint.complaint_code}
                    </span>
                    {getStatusBadge(selectedComplaint.status)}
                  </div>
                  <span style={styles.modalSub}>
                    Submitted on {new Date(selectedComplaint.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <button style={styles.closeBtn} onClick={() => setSelectedComplaint(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.detailGrid}>
                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Category</label>
                    <div style={styles.detailValue}>{selectedComplaint.category_name}</div>
                  </div>

                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Priority</label>
                    <div>{getPriorityBadge(selectedComplaint.priority)}</div>
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Subject</label>
                  <div style={{ ...styles.detailValue, fontSize: "1.05rem" }}>{selectedComplaint.subject}</div>
                </div>

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Description</label>
                  <div style={styles.detailTextContent}>
                    {selectedComplaint.description}
                  </div>
                </div>

                {/* HR Response Section */}
                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>HR Response</label>
                  <div style={selectedComplaint.hr_response ? styles.hrResponseBox : styles.detailTextContent}>
                    {selectedComplaint.hr_response ? selectedComplaint.hr_response : "No response provided by HR yet."}
                  </div>
                </div>

                {/* Resolution Section */}
                {selectedComplaint.resolution && (
                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Final Resolution</label>
                    <div style={styles.resolutionBox}>
                      <CheckCircle size={16} style={{ color: "var(--success-color)", flexShrink: 0, marginTop: "0.2rem" }} />
                      <div>
                        <div>{selectedComplaint.resolution}</div>
                        {selectedComplaint.resolved_at && (
                          <span style={styles.subText}>
                            Resolved on {new Date(selectedComplaint.resolved_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachment Section */}
                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Supporting Attachment</label>
                  <div>
                    {selectedComplaint.attachment_url ? (
                      <a
                        href={selectedComplaint.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.attachmentButton}
                      >
                        <Paperclip size={16} /> View / Download {selectedComplaint.attachment_name || "Attachment"}
                      </a>
                    ) : (
                      <span style={styles.subText}>No attachment uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button style={styles.secondaryBtn} onClick={() => setSelectedComplaint(null)}>
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
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
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
    padding: "0.45rem 0.75rem",
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
  categoryTag: {
    display: "inline-block",
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    fontSize: "0.75rem",
    fontWeight: "600",
    padding: "0.15rem 0.5rem",
    borderRadius: "var(--radius-sm)",
  },
  badge: {
    display: "inline-block",
    fontSize: "0.75rem",
    fontWeight: "700",
    padding: "0.2rem 0.6rem",
    borderRadius: "var(--radius-sm)",
  },
  priorityBadge: {
    fontSize: "0.85rem",
  },
  descriptionSnippet: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    lineHeight: "1.4",
    fontSize: "0.825rem",
    color: "var(--text-muted)",
    marginTop: "0.2rem",
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
    width: "min(92vw, 600px)",
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
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
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
  hrResponseBox: {
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "var(--radius-md)",
    padding: "0.875rem",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
  },
  resolutionBox: {
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderRadius: "var(--radius-md)",
    padding: "0.875rem",
    display: "flex",
    gap: "0.625rem",
    alignItems: "flex-start",
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

export default MyComplaints;
