import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Eye, Edit2, UserCheck, UserX, Archive, ChevronLeft, ChevronRight, Mail, Phone, Calendar } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { ConfirmDialog } from "../../shared/components/Modal";
import {
  getEmployees,
  activateEmployee,
  deactivateEmployee,
  archiveEmployee,
} from "../services/employeeApi";
import { showSuccess, showError, showWarning, showInfo } from "../../shared/utils/toast";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [archiveEmpTarget, setArchiveEmpTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const navigate = useNavigate();

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = {
  page,
  page_size: 10,
  ...(search && { search }),
  ...(statusFilter && { employment_status: statusFilter }),
};
      const res = await getEmployees(params);
      setEmployees(res.data.items || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to load employee list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const handleToggleStatus = async (emp) => {
    try {
      if (emp.employment_status === "ACTIVE") {
        await deactivateEmployee(emp.id);
        showInfo(`Employee ${emp.employee_code} deactivated.`);
      } else {
        await activateEmployee(emp.id);
        showSuccess(`Employee ${emp.employee_code} activated.`);
      }
      fetchEmployees();
    } catch (err) {
      showError(err.response?.data?.detail || "Action failed.");
    }
  };

  const confirmArchive = async () => {
    if (!archiveEmpTarget) return;
    setArchiving(true);
    try {
      await archiveEmployee(archiveEmpTarget.id);
      showWarning(`Employee ${archiveEmpTarget.employee_code} archived.`);
      setArchiveEmpTarget(null);
      fetchEmployees();
    } catch (err) {
      showError(err.response?.data?.detail || "Archive failed.");
    } finally {
      setArchiving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="hrms-badge hrms-badge-success">
            <span className="hrms-status-dot" /> ACTIVE
          </span>
        );
      case "INACTIVE":
        return (
          <span className="hrms-badge hrms-badge-neutral">
            <span className="hrms-status-dot" /> INACTIVE
          </span>
        );
      case "ON_NOTICE":
        return (
          <span className="hrms-badge hrms-badge-warning">
            <span className="hrms-status-dot" /> ON NOTICE
          </span>
        );
      case "TERMINATED":
        return (
          <span className="hrms-badge hrms-badge-danger">
            <span className="hrms-status-dot" /> TERMINATED
          </span>
        );
      default:
        return <span className="hrms-badge hrms-badge-neutral">{status}</span>;
    }
  };

  return (
    <AppLayout title="Employee Directory">
      <div style={styles.container}>
        <BackToDashboard to="/hr/dashboard" role="HR" />

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Employee Directory</h1>
            <p style={styles.subtitle}>
              Manage employee profiles, activation status, and credentials ({totalItems} total records)
            </p>
          </div>
          <Link to="/hr/employees/new" className="hrms-btn hrms-btn-primary" style={{ gap: "0.5rem" }}>
            <Plus size={16} strokeWidth={2.2} /> Add New Employee
          </Link>
        </div>

        {/* Filter / Search Bar */}
        <div className="hrms-card" style={styles.filterCard}>
          <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
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
                placeholder="Search by code, name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="hrms-input"
                style={{ paddingLeft: "2.375rem" }}
              />
            </div>
            <button type="submit" className="hrms-btn hrms-btn-secondary">
              Search
            </button>
          </form>

          <div style={styles.filterGroup}>
            <label className="hrms-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="hrms-select"
              style={{ width: "auto", minWidth: "150px" }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_NOTICE">On Notice</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>

        {/* Employee Content */}
        {loading ? (
          <div className="hrms-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <span className="hrms-status-dot" style={{ backgroundColor: "var(--primary-color)", marginRight: "0.5rem" }} />
            Loading employee directory...
          </div>
        ) : employees.length === 0 ? (
          <div className="hrms-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            No employee profiles found matching your search criteria.
          </div>
        ) : (
          <>
            {/* DESKTOP & TABLET TABLE VIEW (≥768px) */}
            <div className="employee-desktop-table hrms-table-container">
              <div className="hrms-table-wrapper">
                <table className="hrms-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: "190px" }}>Employee</th>
                      <th style={{ minWidth: "90px" }}>Code</th>
                      <th style={{ minWidth: "210px" }}>Email</th>
                      <th style={{ minWidth: "120px" }}>Phone</th>
                      <th style={{ minWidth: "115px" }}>Joining Date</th>
                      <th style={{ minWidth: "110px" }}>Status</th>
                      <th style={{ minWidth: "280px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <div style={styles.employeeCell}>
                            {emp.profile_photo_url ? (
                              <img
                                src={emp.profile_photo_url}
                                alt={`${emp.first_name}`}
                                style={styles.avatarImg}
                              />
                            ) : (
                              <div style={styles.avatarPlaceholder}>
                                {emp.first_name?.[0]}
                                {emp.last_name?.[0]}
                              </div>
                            )}
                            <div style={styles.empName}>
                              {emp.first_name} {emp.last_name}
                            </div>
                          </div>
                        </td>
                        <td>
                          <code style={styles.codeBadge}>{emp.employee_code}</code>
                        </td>
                        <td>
                          <span style={styles.emailText} title={emp.email}>
                            {emp.email}
                          </span>
                        </td>
                        <td>{emp.phone || "—"}</td>
                        <td>{emp.joining_date || "—"}</td>
                        <td>{getStatusBadge(emp.employment_status)}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/hr/employees/${emp.id}`)}
                              className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                              title="View Employee Profile"
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/hr/employees/${emp.id}/edit`)}
                              className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                              title="Edit Employee Details"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(emp)}
                              className={`hrms-btn hrms-btn-sm ${
                                emp.employment_status === "ACTIVE"
                                  ? "hrms-btn-ghost"
                                  : "hrms-btn-outline"
                              }`}
                              style={
                                emp.employment_status === "ACTIVE"
                                  ? { color: "var(--warning-color)", border: "1px solid var(--warning-border)" }
                                  : { color: "var(--success-color)", border: "1px solid var(--success-border)" }
                              }
                              title={
                                emp.employment_status === "ACTIVE"
                                  ? "Deactivate Account"
                                  : "Activate Account"
                              }
                            >
                              {emp.employment_status === "ACTIVE" ? (
                                <>
                                  <UserX size={13} /> Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck size={13} /> Activate
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setArchiveEmpTarget(emp)}
                              className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                              style={{ color: "var(--danger-color)" }}
                              title="Archive Employee Record"
                            >
                              <Archive size={13} /> Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE CARDS VIEW (<768px) */}
            <div className="employee-mobile-cards">
              {employees.map((emp) => (
                <div key={emp.id} className="hrms-card" style={{ padding: "1.25rem" }}>
                  <div style={styles.mobileCardHeader}>
                    <div style={styles.mobileEmpIdentity}>
                      {emp.profile_photo_url ? (
                        <img
                          src={emp.profile_photo_url}
                          alt={`${emp.first_name}`}
                          style={styles.avatarImg}
                        />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          {emp.first_name?.[0]}
                          {emp.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <div style={styles.mobileEmpName}>
                          {emp.first_name} {emp.last_name}
                        </div>
                        <code style={styles.codeBadge}>{emp.employee_code}</code>
                      </div>
                    </div>
                    <div>{getStatusBadge(emp.employment_status)}</div>
                  </div>

                  <div style={styles.mobileCardBody}>
                    <div style={styles.mobileField}>
                      <span style={styles.mobileLabel}>Email Address</span>
                      <span style={styles.mobileValueEmail}>{emp.email}</span>
                    </div>

                    <div style={styles.mobileRow2Col}>
                      <div style={styles.mobileField}>
                        <span style={styles.mobileLabel}>Phone</span>
                        <span style={styles.mobileValue}>{emp.phone || "—"}</span>
                      </div>
                      <div style={styles.mobileField}>
                        <span style={styles.mobileLabel}>Joining Date</span>
                        <span style={styles.mobileValue}>{emp.joining_date || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.mobileActionGroup}>
                    <button
                      type="button"
                      onClick={() => navigate(`/hr/employees/${emp.id}`)}
                      className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                      style={{ flex: 1 }}
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/hr/employees/${emp.id}/edit`)}
                      className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                      style={{ flex: 1 }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(emp)}
                      className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                      style={{ flex: 1 }}
                    >
                      {emp.employment_status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setArchiveEmpTarget(emp)}
                      className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                      style={{ color: "var(--danger-color)" }}
                    >
                      <Archive size={13} /> Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="hrms-btn hrms-btn-secondary hrms-btn-sm"
              style={{ gap: "0.35rem" }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={styles.pageInfo}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total)
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="hrms-btn hrms-btn-secondary hrms-btn-sm"
              style={{ gap: "0.35rem" }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}

        <ConfirmDialog
          isOpen={Boolean(archiveEmpTarget)}
          onClose={() => setArchiveEmpTarget(null)}
          onConfirm={confirmArchive}
          title="Archive Employee Record"
          message={`Are you sure you want to archive employee ${archiveEmpTarget?.first_name || ""} ${archiveEmpTarget?.last_name || ""}?`}
          confirmText="Yes, Archive Employee"
          confirmVariant="danger"
          loading={archiving}
        />
      </div>
    </AppLayout>
  );
}

const styles = {
  container: {
    padding: "0 0 2rem 0",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontSize: "clamp(1.35rem, 4vw, 1.875rem)",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
    wordBreak: "break-word",
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },
  createBtn: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    padding: "0.625rem 1.25rem",
    borderRadius: "var(--radius-md)",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "0.875rem",
    boxShadow: "var(--shadow-sm)",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  filterCard: {
    backgroundColor: "var(--bg-surface)",
    padding: "1rem",
    borderRadius: "var(--radius-lg)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    border: "1px solid var(--border-color)",
    flexWrap: "wrap",
    gap: "1rem",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  searchForm: {
    display: "flex",
    gap: "0.5rem",
    flex: "1 1 260px",
    maxWidth: "100%",
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    padding: "0.5rem 0.875rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  searchBtn: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flex: "1 1 180px",
    maxWidth: "100%",
    minWidth: 0,
  },
  filterLabel: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  },
  selectInput: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    padding: "0.5rem 0.875rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  tableWrapper: {
    backgroundColor: "var(--bg-surface)",
    borderRadius: "var(--radius-lg)",
    overflowX: "auto",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    border: "1px solid var(--border-color)",
    boxSizing: "border-box",
  },
  table: {
    width: "100%",
    minWidth: "1080px",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-muted)",
    padding: "0.625rem 0.75rem",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  tr: {
    borderBottom: "1px solid var(--border-color)",
    height: "64px",
  },
  td: {
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  employeeCell: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  },
  avatarImg: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-color)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "0.875rem",
    flexShrink: 0,
  },
  empName: {
    fontWeight: "600",
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
  },
  codeBadge: {
    backgroundColor: "var(--bg-surface-elevated)",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    color: "var(--primary-color)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    display: "inline-block",
    whiteSpace: "nowrap",
  },
  emailText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "block",
    maxWidth: "220px",
  },
  badgeActive: {
    backgroundColor: "var(--success-bg)",
    color: "var(--success-color)",
    border: "1px solid var(--success-border)",
    padding: "0.25rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  badgeInactive: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-color)",
    padding: "0.25rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  badgeNotice: {
    backgroundColor: "var(--warning-bg)",
    color: "var(--warning-color)",
    border: "1px solid var(--warning-border)",
    padding: "0.25rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  badgeTerminated: {
    backgroundColor: "var(--danger-bg)",
    color: "var(--danger-color)",
    border: "1px solid var(--danger-border)",
    padding: "0.25rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  actionGroup: {
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    whiteSpace: "nowrap",
    gap: "0.375rem",
  },
  actionBtnView: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.35rem 0.625rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  actionBtnEdit: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.35rem 0.625rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  actionBtnActivate: {
    backgroundColor: "var(--success-color)",
    color: "#ffffff",
    border: "none",
    padding: "0.35rem 0.625rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  actionBtnDeactivate: {
    backgroundColor: "var(--warning-color)",
    color: "#ffffff",
    border: "none",
    padding: "0.35rem 0.625rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  actionBtnArchive: {
    backgroundColor: "var(--danger-color)",
    color: "#ffffff",
    border: "none",
    padding: "0.35rem 0.625rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  /* MOBILE CARDS STYLING */
  mobileCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.875rem",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    boxShadow: "var(--shadow-sm)",
  },
  mobileCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  mobileEmpIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flex: 1,
    minWidth: 0,
  },
  mobileEmpName: {
    fontWeight: "700",
    fontSize: "1rem",
    color: "var(--text-primary)",
    wordBreak: "break-word",
    lineHeight: "1.25",
    marginBottom: "0.25rem",
  },
  mobileCardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "0.625rem",
    padding: "0.75rem 0",
    borderTop: "1px solid var(--border-color)",
    borderBottom: "1px solid var(--border-color)",
  },
  mobileField: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
    minWidth: 0,
  },
  mobileRow2Col: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "0.625rem",
  },
  mobileLabel: {
    fontSize: "0.7rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
  },
  mobileValue: {
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    fontWeight: "500",
    wordBreak: "break-word",
  },
  mobileValueEmail: {
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    fontWeight: "500",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  mobileActionGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.5rem",
    width: "100%",
  },
  mobileBtnView: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8125rem",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
  },
  mobileBtnEdit: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.5rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8125rem",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
  },
  mobileBtnActivate: {
    backgroundColor: "var(--success-color)",
    color: "#ffffff",
    border: "none",
    padding: "0.5rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8125rem",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
  },
  mobileBtnDeactivate: {
    backgroundColor: "var(--warning-color)",
    color: "#ffffff",
    border: "none",
    padding: "0.5rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8125rem",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
  },
  mobileBtnArchive: {
    backgroundColor: "var(--danger-color)",
    color: "#ffffff",
    border: "none",
    padding: "0.5rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8125rem",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
  },

  loadingState: {
    textAlign: "center",
    padding: "3rem",
    color: "var(--text-muted)",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem",
    backgroundColor: "var(--bg-surface)",
    borderRadius: "var(--radius-lg)",
    color: "var(--text-muted)",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
  pageBtn: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontWeight: "500",
  },
  pageBtnDisabled: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-muted)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    cursor: "not-allowed",
  },
  pageInfo: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
};
