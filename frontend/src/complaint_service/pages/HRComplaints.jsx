import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Eye,
  Paperclip,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  SlidersHorizontal,
  Tags,
  Check,
  Ban,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import {
  getAllComplaints,
  getAllComplaintCategories,
  updateComplaintStatus,
  updateComplaintPriority,
  respondComplaint,
  resolveComplaint,
  closeComplaint,
} from "../services/complaintApi";
import { getEmployees } from "../../employee_service/services/employeeApi";
import { showSuccess, showError } from "../../shared/utils/toast";

function HRComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dropdown Filter Options
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modal States
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [respondModalComplaint, setRespondModalComplaint] = useState(null);
  const [resolveModalComplaint, setResolveModalComplaint] = useState(null);
  const [hrResponseInput, setHrResponseInput] = useState("");
  const [resolutionInput, setResolutionInput] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Fetch Employees and Categories for filter dropdowns
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [empRes, catRes] = await Promise.allSettled([
          getEmployees({ limit: 100 }),
          getAllComplaintCategories(),
        ]);

        if (empRes.status === "fulfilled") {
          setEmployees(empRes.value.data?.items || []);
        }
        if (catRes.status === "fulfilled") {
          setCategories(catRes.value.data || []);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadFilterOptions();
  }, []);

  // Fetch HR Complaints with pagination & filters
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        employee_id: selectedEmployeeId || undefined,
        category_id: selectedCategoryId || undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        search: searchTerm.trim() || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };

      const res = await getAllComplaints(params);
      setComplaints(res.data?.items || []);
      setTotalPages(res.data?.pages || 1);
      setTotalItems(res.data?.total || 0);
    } catch (err) {
      console.error("Failed to fetch HR complaints", err);
      showError("Failed to load workplace complaints.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedEmployeeId, selectedCategoryId, selectedStatus, selectedPriority, searchTerm, fromDate, toDate]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedEmployeeId("");
    setSelectedCategoryId("");
    setSelectedStatus("");
    setSelectedPriority("");
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  // Status Change Handler
  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await updateComplaintStatus(complaintId, newStatus);
      showSuccess(`Status updated to ${newStatus}`);
      fetchComplaints();
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        setSelectedComplaint((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Failed to update status", err);
      showError(err.response?.data?.detail || "Failed to update complaint status.");
    }
  };

  // Priority Change Handler
  const handlePriorityChange = async (complaintId, newPriority) => {
    try {
      await updateComplaintPriority(complaintId, newPriority);
      showSuccess(`Priority updated to ${newPriority}`);
      fetchComplaints();
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        setSelectedComplaint((prev) => ({ ...prev, priority: newPriority }));
      }
    } catch (err) {
      console.error("Failed to update priority", err);
      showError(err.response?.data?.detail || "Failed to update complaint priority.");
    }
  };

  // HR Respond Handler
  const handleRespondSubmit = async (e) => {
    e.preventDefault();
    if (!hrResponseInput || !hrResponseInput.trim()) {
      showError("Please enter an HR response.");
      return;
    }

    setActionSubmitting(true);
    try {
      await respondComplaint(respondModalComplaint.id, hrResponseInput.trim());
      showSuccess("HR response saved successfully.");
      setRespondModalComplaint(null);
      setHrResponseInput("");
      fetchComplaints();
    } catch (err) {
      console.error("Failed to submit HR response", err);
      showError(err.response?.data?.detail || "Failed to submit response.");
    } finally {
      setActionSubmitting(false);
    }
  };

  // HR Resolve Handler
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionInput || !resolutionInput.trim()) {
      showError("Please enter resolution details.");
      return;
    }

    setActionSubmitting(true);
    try {
      await resolveComplaint(resolveModalComplaint.id, resolutionInput.trim());
      showSuccess("Complaint resolved successfully!");
      setResolveModalComplaint(null);
      setResolutionInput("");
      fetchComplaints();
    } catch (err) {
      console.error("Failed to resolve complaint", err);
      showError(err.response?.data?.detail || "Failed to resolve complaint.");
    } finally {
      setActionSubmitting(false);
    }
  };

  // HR Close Handler
  const handleCloseComplaint = async (complaintId) => {
    if (!window.confirm("Are you sure you want to close this resolved complaint?")) return;

    try {
      await closeComplaint(complaintId);
      showSuccess("Complaint closed.");
      fetchComplaints();
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        setSelectedComplaint((prev) => ({ ...prev, status: "CLOSED" }));
      }
    } catch (err) {
      console.error("Failed to close complaint", err);
      showError(err.response?.data?.detail || "Failed to close complaint.");
    }
  };

  // Badge rendering helpers
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
    <AppLayout title="HR Workplace Complaints Management">
      <div style={styles.container}>
        <BackToDashboard to="/hr/dashboard" role="HR" icon={ArrowLeft} />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Workplace Complaints Management</h1>
            <p style={styles.subtitle}>
              Monitor employee grievances, manage status workflows, respond to inquiries & record resolutions
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link
              to="/hr/complaint-categories"
              style={{ ...styles.secondaryNavBtn, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Tags size={16} /> Manage Categories
            </Link>
            <button
              style={{ ...styles.secondaryNavBtn, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
              onClick={fetchComplaints}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div style={styles.filterCard}>
          <div style={styles.filterRow}>
            {/* Search Input */}
            <div style={styles.searchWrapper}>
              <Search size={16} style={styles.searchIcon} />
              <input
                type="text"
                style={styles.searchInput}
                placeholder="Search by complaint code, subject, employee name, or description..."
                value={searchTerm}
                onChange={handleSearchChange}
                aria-label="Search complaints"
              />
            </div>

            {/* Status Filter */}
            <select
              style={styles.select}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Priority Filter */}
            <select
              style={styles.select}
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by priority"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Category Filter */}
            <select
              style={styles.select}
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Employee Filter */}
            <select
              style={styles.select}
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by employee"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.employee_code})
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(selectedEmployeeId || selectedCategoryId || selectedStatus || selectedPriority || searchTerm || fromDate || toDate) && (
              <button style={styles.resetBtn} onClick={handleResetFilters}>
                Clear Filters
              </button>
            )}
          </div>

          <div style={styles.summaryBadge}>
            Showing <strong>{complaints.length}</strong> of <strong>{totalItems}</strong> complaints
          </div>
        </div>

        {/* Desktop Table View (≥768px) */}
        {loading ? (
          <div style={styles.emptyState}>Loading workplace complaints...</div>
        ) : complaints.length === 0 ? (
          <div style={styles.emptyCard}>
            <FileText size={40} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
            <h3 style={styles.emptyTitle}>No Complaints Found</h3>
            <p style={styles.emptySubtitle}>
              No workplace complaints match the specified search or filter criteria.
            </p>
          </div>
        ) : (
          <div>
            <div className="employee-desktop-table" style={styles.tableWrapper}>
              <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Code</th>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Subject & Details</th>
                      <th style={styles.th}>Priority</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Submitted</th>
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
                          <div style={{ fontWeight: "700" }}>{c.employee_name || "Employee"}</div>
                          <span style={styles.subText}>{c.employee_code}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.categoryTag}>{c.category_name || "General"}</span>
                        </td>
                        <td style={{ ...styles.td, maxWidth: "260px" }}>
                          <div style={{ fontWeight: "600" }}>{c.subject}</div>
                          <div style={styles.descriptionSnippet}>{c.description}</div>
                        </td>
                        <td style={styles.td}>
                          <select
                            style={styles.inlineSelect}
                            value={c.priority}
                            onChange={(e) => handlePriorityChange(c.id, e.target.value)}
                            title="Change Priority"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </td>
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
                          <div style={{ display: "flex", gap: "0.375rem" }}>
                            <button
                              style={styles.viewBtn}
                              onClick={() => setSelectedComplaint(c)}
                              title="View Details"
                            >
                              <Eye size={14} /> Details
                            </button>

                            <button
                              style={styles.actionIconBtn}
                              onClick={() => {
                                setRespondModalComplaint(c);
                                setHrResponseInput(c.hr_response || "");
                              }}
                              title="Provide HR Response"
                            >
                              <MessageSquare size={14} /> Respond
                            </button>

                            {c.status !== "RESOLVED" && c.status !== "CLOSED" && c.status !== "REJECTED" && (
                              <button
                                style={{ ...styles.actionIconBtn, color: "var(--success-color)", borderColor: "rgba(34, 197, 94, 0.3)" }}
                                onClick={() => {
                                  setResolveModalComplaint(c);
                                  setResolutionInput(c.resolution || "");
                                }}
                                title="Resolve Case"
                              >
                                <CheckCircle size={14} /> Resolve
                              </button>
                            )}

                            {c.status === "RESOLVED" && (
                              <button
                                style={{ ...styles.actionIconBtn, color: "var(--text-muted)" }}
                                onClick={() => handleCloseComplaint(c.id)}
                                title="Close Case"
                              >
                                <Ban size={14} /> Close
                              </button>
                            )}
                          </div>
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
                        <strong style={{ color: "var(--primary-color)" }}>{c.complaint_code}</strong>
                        <span style={styles.categoryTag}>{c.category_name}</span>
                      </div>
                      <h4 style={styles.mobileCardTitle}>{c.subject}</h4>
                      <span style={styles.subText}>{c.employee_name} ({c.employee_code})</span>
                    </div>
                    <div>{getStatusBadge(c.status)}</div>
                  </div>
                  <div style={styles.mobileCardBody}>
                    <p style={styles.mobileDesc}>{c.description}</p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      <button style={styles.viewBtn} onClick={() => setSelectedComplaint(c)}>
                        <Eye size={14} /> View
                      </button>
                      <button
                        style={styles.actionIconBtn}
                        onClick={() => {
                          setRespondModalComplaint(c);
                          setHrResponseInput(c.hr_response || "");
                        }}
                      >
                        <MessageSquare size={14} /> Respond
                      </button>
                      {c.status !== "RESOLVED" && c.status !== "CLOSED" && c.status !== "REJECTED" && (
                        <button
                          style={{ ...styles.actionIconBtn, color: "var(--success-color)" }}
                          onClick={() => {
                            setResolveModalComplaint(c);
                            setResolutionInput(c.resolution || "");
                          }}
                        >
                          <CheckCircle size={14} /> Resolve
                        </button>
                      )}
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

        {/* HR Complaint Detail Modal */}
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
                    <label style={styles.detailLabel}>Employee</label>
                    <div style={styles.detailValue}>
                      {selectedComplaint.employee_name} <span style={styles.subText}>({selectedComplaint.employee_code})</span>
                    </div>
                  </div>

                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Category</label>
                    <div style={styles.detailValue}>{selectedComplaint.category_name}</div>
                  </div>

                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Priority</label>
                    <div>{getPriorityBadge(selectedComplaint.priority)}</div>
                  </div>

                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Change Case Status</label>
                    <select
                      style={styles.select}
                      value={selectedComplaint.status}
                      onChange={(e) => handleStatusChange(selectedComplaint.id, e.target.value)}
                    >
                      <option value="OPEN">Open</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Subject</label>
                  <div style={{ ...styles.detailValue, fontSize: "1.05rem" }}>{selectedComplaint.subject}</div>
                </div>

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Description</label>
                  <div style={styles.detailTextContent}>{selectedComplaint.description}</div>
                </div>

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>HR Response</label>
                  <div style={selectedComplaint.hr_response ? styles.hrResponseBox : styles.detailTextContent}>
                    {selectedComplaint.hr_response ? selectedComplaint.hr_response : "No HR response recorded yet."}
                  </div>
                </div>

                {selectedComplaint.resolution && (
                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Resolution Details</label>
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

                <div style={styles.detailRow}>
                  <label style={styles.detailLabel}>Attachment</label>
                  <div>
                    {selectedComplaint.attachment_url ? (
                      <a
                        href={selectedComplaint.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.attachmentButton}
                      >
                        <Paperclip size={16} /> Open {selectedComplaint.attachment_name || "Attachment"}
                      </a>
                    ) : (
                      <span style={styles.subText}>No attachment provided</span>
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

        {/* HR Respond Modal */}
        {respondModalComplaint && (
          <div style={styles.modalOverlay} onClick={() => setRespondModalComplaint(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={styles.modalTitle}>Provide HR Response</h3>
                  <span style={styles.modalSub}>
                    Case [{respondModalComplaint.complaint_code}] &bull; {respondModalComplaint.employee_name}
                  </span>
                </div>
                <button style={styles.closeBtn} onClick={() => setRespondModalComplaint(null)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleRespondSubmit}>
                <div style={styles.modalBody}>
                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Complaint Subject</label>
                    <div style={styles.detailValue}>{respondModalComplaint.subject}</div>
                  </div>

                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>HR Response / Remarks *</label>
                    <textarea
                      style={styles.textarea}
                      rows={5}
                      placeholder="Enter official HR response, inquiry updates, or requested actions..."
                      value={hrResponseInput}
                      onChange={(e) => setHrResponseInput(e.target.value)}
                      required
                    />
                    <span style={styles.subText}>
                      Providing an HR response automatically advances status to "Under Review" if currently Open.
                    </span>
                  </div>
                </div>
                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => setRespondModalComplaint(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryBtn} disabled={actionSubmitting}>
                    {actionSubmitting ? "Saving..." : "Save HR Response"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* HR Resolve Modal */}
        {resolveModalComplaint && (
          <div style={styles.modalOverlay} onClick={() => setResolveModalComplaint(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={styles.modalTitle}>Resolve Workplace Complaint</h3>
                  <span style={styles.modalSub}>
                    Case [{resolveModalComplaint.complaint_code}] &bull; {resolveModalComplaint.employee_name}
                  </span>
                </div>
                <button style={styles.closeBtn} onClick={() => setResolveModalComplaint(null)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleResolveSubmit}>
                <div style={styles.modalBody}>
                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Complaint Subject</label>
                    <div style={styles.detailValue}>{resolveModalComplaint.subject}</div>
                  </div>

                  <div style={styles.detailRow}>
                    <label style={styles.detailLabel}>Final Resolution Details *</label>
                    <textarea
                      style={styles.textarea}
                      rows={5}
                      placeholder="Detail the official resolution, actions taken, policy decisions, or outcomes..."
                      value={resolutionInput}
                      onChange={(e) => setResolutionInput(e.target.value)}
                      required
                    />
                    <span style={styles.subText}>
                      Saving resolution marks the complaint status as RESOLVED.
                    </span>
                  </div>
                </div>
                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => setResolveModalComplaint(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryBtn} disabled={actionSubmitting}>
                    {actionSubmitting ? "Resolving..." : "Mark as Resolved"}
                  </button>
                </div>
              </form>
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
    textDecoration: "none",
    cursor: "pointer",
  },
  filterCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "1.25rem",
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.875rem",
    alignItems: "center",
  },
  searchWrapper: {
    position: "relative",
    flex: "1 1 280px",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "0.75rem",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    padding: "0.5rem 0.75rem 0.5rem 2.25rem",
    fontSize: "0.875rem",
    outline: "none",
  },
  select: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
    flex: "1 1 150px",
  },
  inlineSelect: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)",
    padding: "0.2rem 0.4rem",
    fontSize: "0.75rem",
    outline: "none",
  },
  resetBtn: {
    backgroundColor: "transparent",
    color: "var(--danger-color)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 0.875rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
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
    padding: "0.35rem 0.6rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  actionIconBtn: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--primary-color)",
    border: "1px solid var(--border-color)",
    padding: "0.35rem 0.6rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
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
    width: "min(92vw, 620px)",
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
  textarea: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    padding: "0.75rem 0.875rem",
    fontSize: "0.9rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
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
    gap: "0.75rem",
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
  primaryBtn: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.5rem 1.25rem",
    borderRadius: "var(--radius-md)",
    fontWeight: "600",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
};

export default HRComplaints;
