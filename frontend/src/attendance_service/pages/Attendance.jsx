import React, { useEffect, useState } from "react";
import { Check, ArrowLeft, ArrowRight, Clock, Calendar, Filter, RotateCcw, CheckCircle2, LogIn, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import {
  checkIn,
  checkOut,
  getMyAttendanceHistory,
  getTodayAttendance,
} from "../services/attendanceApi";
import { showSuccess, showError } from "../../shared/utils/toast";

export default function Attendance() {
  const [todayStatus, setTodayStatus] = useState({
    has_checked_in: false,
    has_checked_out: false,
    attendance: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchToday = async () => {
    try {
      const res = await getTodayAttendance();
      setTodayStatus(res.data);
    } catch (err) {
      console.error("Failed to load today's attendance status:", err);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (statusFilter) params.status = statusFilter;

      const res = await getMyAttendanceHistory(params);
      setHistory(res.data.items || []);
      setPage(res.data.page || 1);
      setTotalPages(res.data.total_pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to load attendance history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [page, fromDate, toDate, statusFilter]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await checkIn();
      showSuccess("Checked in successfully!");
      await fetchToday();
      await fetchHistory();
    } catch (err) {
      showError(err.response?.data?.detail || "Check-in failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await checkOut();
      showSuccess("Checked out successfully!");
      await fetchToday();
      await fetchHistory();
    } catch (err) {
      showError(err.response?.data?.detail || "Check-out failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
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

  const formatWorkingMinutes = (minutes) => {
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
    <AppLayout title="My Attendance">
      <div className="hrms-page-container" style={{ maxWidth: "1080px", margin: "0 auto" }}>
        <BackToDashboard to="/employee/dashboard" role="EMPLOYEE" />

        {/* Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Attendance Management</h1>
            <p className="hrms-page-subtitle">
              Record your daily work shifts and track past attendance records
            </p>
          </div>
        </div>

        {/* Today's Shift Card */}
        <div
          className="hrms-card"
          style={{
            padding: "1.75rem",
            marginBottom: "2rem",
            background: "linear-gradient(to bottom right, var(--bg-surface), var(--bg-surface-elevated))",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.5rem",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-color)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Current Shift
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

            <div>
              {todayStatus.attendance && getStatusBadge(todayStatus.attendance.status)}
            </div>
          </div>

          {/* Today Times Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: "1rem",
              marginBottom: "1.75rem",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Punch In Time
              </span>
              <span style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {todayStatus.attendance?.check_in ? formatTime(todayStatus.attendance.check_in) : "—:—"}
              </span>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Punch Out Time
              </span>
              <span style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {todayStatus.attendance?.check_out ? formatTime(todayStatus.attendance.check_out) : "—:—"}
              </span>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Effective Work Hours
              </span>
              <span style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--primary-color)", fontFamily: "var(--font-mono)" }}>
                {formatWorkingMinutes(todayStatus.attendance?.working_minutes)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={todayStatus.has_checked_in || actionLoading}
              className={`hrms-btn ${todayStatus.has_checked_in ? "hrms-btn-secondary" : "hrms-btn-primary"}`}
              style={{ flex: "1 1 200px", padding: "0.875rem 1.25rem", fontSize: "0.9375rem" }}
            >
              {actionLoading ? (
                "Processing..."
              ) : todayStatus.has_checked_in ? (
                <>
                  <Check size={16} /> Checked In Successfully
                </>
              ) : (
                <>
                  <LogIn size={16} /> Punch In Now
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCheckOut}
              disabled={!todayStatus.has_checked_in || todayStatus.has_checked_out || actionLoading}
              className={`hrms-btn ${!todayStatus.has_checked_in || todayStatus.has_checked_out ? "hrms-btn-secondary" : "hrms-btn-primary"}`}
              style={{
                flex: "1 1 200px",
                padding: "0.875rem 1.25rem",
                fontSize: "0.9375rem",
                ...(todayStatus.has_checked_in && !todayStatus.has_checked_out ? { background: "var(--warning-color)", color: "#000" } : {}),
              }}
            >
              {actionLoading ? (
                "Processing..."
              ) : todayStatus.has_checked_out ? (
                <>
                  <Check size={16} /> Checked Out Successfully
                </>
              ) : (
                <>
                  <LogOut size={16} /> Punch Out
                </>
              )}
            </button>
          </div>
        </div>

        {/* History Section Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1875rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Attendance Records
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "0.2rem 0 0 0" }}>
              Log of recorded shifts ({total} total entries)
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="hrms-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
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

            {(fromDate || toDate || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                style={{ height: "38px" }}
              >
                <RotateCcw size={14} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* History Table Container */}
        <div className="hrms-table-container">
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Loading attendance history...
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              No attendance records found for selected dates.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="employee-desktop-table hrms-table-wrapper">
                <table className="hrms-table">
                  <thead>
                    <tr>
                      <th>Shift Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{formatDate(item.attendance_date)}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{formatTime(item.check_in)}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{formatTime(item.check_out)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "var(--primary-color)", fontWeight: 700 }}>
                          {formatWorkingMinutes(item.working_minutes)}
                        </td>
                        <td>{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="employee-mobile-cards" style={{ padding: "1rem" }}>
                {history.map((item) => (
                  <div key={item.id} className="hrms-card" style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{formatDate(item.attendance_date)}</span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", fontSize: "0.8125rem" }}>
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>In</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatTime(item.check_in)}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>Out</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatTime(item.check_out)}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>Hours</div>
                        <div style={{ fontFamily: "var(--font-mono)", color: "var(--primary-color)", fontWeight: 700 }}>
                          {formatWorkingMinutes(item.working_minutes)}
                        </div>
                      </div>
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
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
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
