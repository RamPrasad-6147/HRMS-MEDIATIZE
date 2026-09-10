import React, { useEffect, useState } from "react";
import { AlertCircle, Search, Calendar, Filter, RotateCcw, ChevronLeft, ChevronRight, User, Clock, CheckCircle2 } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getHRAttendance } from "../services/attendanceApi";
import { showError } from "../../shared/utils/toast";

export default function HRAttendance() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await getHRAttendance(params);
      const data = res.data;
      setLogs(data.items || []);
      setPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error fetching HR attendance list:", err);
      const msg = err.response?.data?.detail || "Failed to load employee attendance records.";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [page, statusFilter, fromDate, toDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAttendance();
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "—";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dt = new Date(year, month, day);
        return dt.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatWorkingHours = (minutes) => {
    if (minutes === null || minutes === undefined) return "—";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PRESENT":
        return (
          <span className="hrms-badge hrms-badge-success">
            <span className="hrms-status-dot" /> PRESENT
          </span>
        );
      case "LATE":
        return (
          <span className="hrms-badge hrms-badge-warning">
            <span className="hrms-status-dot" /> LATE
          </span>
        );
      case "HALF_DAY":
        return (
          <span className="hrms-badge hrms-badge-warning">
            <span className="hrms-status-dot" /> HALF DAY
          </span>
        );
      case "ABSENT":
        return (
          <span className="hrms-badge hrms-badge-danger">
            <span className="hrms-status-dot" /> ABSENT
          </span>
        );
      default:
        return <span className="hrms-badge hrms-badge-neutral">{status || "UNKNOWN"}</span>;
    }
  };

  return (
    <AppLayout title="HR Attendance">
      <div className="hrms-page-container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/dashboard" role="HR" />

        {/* Page Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Attendance Monitoring</h1>
            <p className="hrms-page-subtitle">
              Audit workforce shift logs, verify punch times, and track punctuality ({total} total entries)
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <div className="hrms-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Search Input */}
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
                  placeholder="Search by employee name, code, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="hrms-input"
                  style={{ paddingLeft: "2.35rem" }}
                />
              </div>

              <button type="submit" className="hrms-btn hrms-btn-primary">
                Search Records
              </button>
            </div>

            {/* Filter Row */}
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
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                </select>
              </div>

              <div style={{ flex: "1 1 180px" }}>
                <label className="hrms-label">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="hrms-input"
                />
              </div>

              <div style={{ flex: "1 1 180px" }}>
                <label className="hrms-label">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="hrms-input"
                />
              </div>

              {(search || statusFilter || fromDate || toDate) && (
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

        {/* Table Container */}
        <div className="hrms-table-container">
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Retrieving attendance logs...
            </div>
          ) : error ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ color: "var(--danger-color)", marginBottom: "1rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={18} /> {error}
              </div>
              <div>
                <button type="button" onClick={fetchAttendance} className="hrms-btn hrms-btn-secondary hrms-btn-sm">
                  Retry
                </button>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              No attendance logs found matching filter criteria.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="employee-desktop-table hrms-table-wrapper">
                <table className="hrms-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Code</th>
                      <th>Shift Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            {row.first_name} {row.last_name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {row.email}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              color: "var(--primary-color)",
                            }}
                          >
                            {row.employee_code}
                          </span>
                        </td>
                        <td>{formatDate(row.attendance_date)}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{formatTime(row.check_in)}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{formatTime(row.check_out)}</td>
                        <td>{getStatusBadge(row.status)}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary-color)" }}>
                          {formatWorkingHours(row.working_minutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="employee-mobile-cards" style={{ padding: "1rem" }}>
                {logs.map((row) => (
                  <div key={row.id} className="hrms-card" style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                          {row.first_name} {row.last_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {row.employee_code} • {row.email}
                        </div>
                      </div>
                      {getStatusBadge(row.status)}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", fontSize: "0.8125rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>Date</div>
                        <div style={{ fontWeight: 600 }}>{formatDate(row.attendance_date)}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>In / Out</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                          {formatTime(row.check_in)} - {formatTime(row.check_out)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>Hours</div>
                        <div style={{ fontFamily: "var(--font-mono)", color: "var(--primary-color)", fontWeight: 700 }}>
                          {formatWorkingHours(row.working_minutes)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
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
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} records)
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
