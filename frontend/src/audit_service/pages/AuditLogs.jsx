import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getAuditLogs } from "../services/auditApi";
import { showError } from "../../shared/utils/toast";

const AUDIT_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "OTP_REQUESTED",
  "OTP_VERIFY_SUCCESS",
  "OTP_VERIFY_FAILURE",
  "OTP_EXPIRED",
  "OTP_ATTEMPT_LIMIT_REACHED",
  "PASSWORD_CHANGE",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_APPROVED",
  "PASSWORD_RESET_REJECTED",
  "LOGOUT",
  "ACCOUNT_DEACTIVATED",
];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      if (fromDate) params.from_date = new Date(fromDate).toISOString();
      if (toDate) params.to_date = new Date(toDate).toISOString();

      const res = await getAuditLogs(params);
      const data = res.data;
      setLogs(data.items || []);
      setPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      const msg = err.response?.data?.detail || "Failed to load system audit logs.";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, fromDate, toDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearch("");
    setActionFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return "--";
    try {
      return new Date(isoStr).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const getActionBadgeStyle = (action) => {
    if (action.includes("FAILURE") || action.includes("REJECTED") || action.includes("DEACTIVATED")) {
      return { backgroundColor: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b" };
    }
    if (action.includes("SUCCESS") || action.includes("APPROVED")) {
      return { backgroundColor: "#065f46", color: "#6ee7b7", border: "1px solid #047857" };
    }
    return { backgroundColor: "#1e3a8a", color: "#93c5fd", border: "1px solid #1d4ed8" };
  };

  return (
    <AppLayout title="System Audit Logs">
      <div style={styles.container}>
        <BackToDashboard to="/hr/dashboard" role="HR" />

        <div style={styles.headerArea}>
          <div>
            <h1 style={styles.title}>System Audit Logs</h1>
            <p style={styles.subtitle}>
              Read-only security & operational event monitoring for HR Administrators
            </p>
          </div>
          <div style={styles.countBadge}>
            Total Records: <strong>{total}</strong>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={styles.filterCard}>
          <form onSubmit={handleSearchSubmit} style={styles.filterForm}>
            <div style={styles.searchGroup}>
              <input
                type="text"
                placeholder="Search user email, employee code, or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              <button type="submit" style={styles.searchBtn}>
                Search
              </button>
            </div>

            <div style={styles.filterRow}>
              <div style={styles.filterItem}>
                <label style={styles.filterLabel}>Action Filter</label>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                  }}
                  style={styles.selectInput}
                >
                  <option value="">All Audit Actions</option>
                  {AUDIT_ACTIONS.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.filterItem}>
                <label style={styles.filterLabel}>From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  style={styles.dateInput}
                />
              </div>

              <div style={styles.filterItem}>
                <label style={styles.filterLabel}>To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  style={styles.dateInput}
                />
              </div>

              {(search || actionFilter || fromDate || toDate) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  style={styles.clearBtn}
                >
                  Reset Filters
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Main Content Area */}
        <div style={styles.tableCard}>
          {loading ? (
            <div style={styles.stateContainer}>
              <div style={styles.loadingSpinner}>Loading system audit logs...</div>
            </div>
          ) : error ? (
            <div style={styles.stateContainer}>
              <div style={styles.errorText}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <AlertCircle size={18} /> {error}
                </span>
              </div>
              <button onClick={fetchLogs} style={styles.retryBtn}>
                Retry
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div style={styles.stateContainer}>
              <div style={styles.emptyText}>No audit logs found matching your criteria.</div>
            </div>
          ) : (
            <>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date & Time</th>
                      <th style={styles.th}>User Email</th>
                      <th style={styles.th}>Employee Code</th>
                      <th style={styles.th}>Event Action</th>
                      <th style={styles.th}>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} style={styles.tr}>
                        <td style={styles.tdTime}>{formatTimestamp(log.created_at)}</td>
                        <td style={styles.tdEmail}>
                          {log.user_email || <span style={styles.noneText}>System / Anonymous</span>}
                        </td>
                        <td style={styles.tdCode}>
                          {log.employee_code ? (
                            <span style={styles.codeBadge}>{log.employee_code}</span>
                          ) : (
                            <span style={styles.noneText}>—</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badgeBase,
                              ...getActionBadgeStyle(log.action),
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={styles.tdIp}>
                          {log.ip_address || <span style={styles.noneText}>Internal</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={styles.paginationRow}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  style={{ ...(page <= 1 ? styles.pageBtnDisabled : styles.pageBtn), display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                >
                  <ArrowLeft size={14} /> Previous
                </button>

                <span style={styles.pageInfo}>
                  Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  style={{ ...(page >= totalPages ? styles.pageBtnDisabled : styles.pageBtn), display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  container: {
    padding: "0 0 2rem 0",
  },
  headerArea: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },
  countBadge: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  filterCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "1.25rem",
    marginBottom: "1.5rem",
  },
  filterForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  searchGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    padding: "0.625rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
  },
  searchBtn: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.625rem 1.25rem",
    borderRadius: "var(--radius-md)",
    fontWeight: "600",
    cursor: "pointer",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "flex-end",
  },
  filterItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  filterLabel: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  selectInput: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    minWidth: "200px",
  },
  dateInput: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
  },
  clearBtn: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    cursor: "pointer",
    alignSelf: "flex-end",
  },
  tableCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "0.875rem 1.25rem",
    borderBottom: "1px solid var(--border-color)",
  },
  tr: {
    borderBottom: "1px solid var(--border-color)",
  },
  td: {
    padding: "0.875rem 1.25rem",
    fontSize: "0.875rem",
  },
  tdTime: {
    padding: "0.875rem 1.25rem",
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    whiteSpace: "nowrap",
  },
  tdEmail: {
    padding: "0.875rem 1.25rem",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    fontWeight: "500",
  },
  tdCode: {
    padding: "0.875rem 1.25rem",
    fontSize: "0.875rem",
  },
  tdIp: {
    padding: "0.875rem 1.25rem",
    fontSize: "0.875rem",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
  },
  codeBadge: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--primary-color)",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8125rem",
  },
  noneText: {
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  badgeBase: {
    display: "inline-block",
    padding: "0.25rem 0.625rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.75rem",
    fontWeight: "600",
    fontFamily: "var(--font-mono)",
  },
  paginationRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
    backgroundColor: "var(--bg-surface-elevated)",
    borderTop: "1px solid var(--border-color)",
  },
  pageBtn: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "600",
  },
  pageBtnDisabled: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-muted)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    cursor: "not-allowed",
    fontSize: "0.875rem",
  },
  pageInfo: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  stateContainer: {
    padding: "4rem 2rem",
    textAlign: "center",
  },
  loadingSpinner: {
    color: "var(--primary-color)",
    fontSize: "1rem",
  },
  emptyText: {
    color: "var(--text-muted)",
    fontSize: "1rem",
  },
  errorText: {
    color: "var(--danger-color)",
    fontSize: "1rem",
    marginBottom: "1rem",
  },
  retryBtn: {
    backgroundColor: "var(--danger-color)",
    color: "#ffffff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
  },
};
