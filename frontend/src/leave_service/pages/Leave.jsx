import React, { useState, useEffect, useCallback } from "react";
import { CalendarDays, X, Plus, Calendar, FileText, Paperclip, AlertCircle, RotateCcw, Clock, ArrowRight, Check } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getLeaveTypes, getMyLeaveBalance, getMyLeaves, applyLeave, cancelLeave } from "../services/leaveApi";
import { showSuccess, showError, showWarning } from "../../shared/utils/toast";

export default function Leave() {
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Form fields
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [leaveDuration, setLeaveDuration] = useState("SINGLE"); // "SINGLE" or "MULTI"

  // Single Day state
  const [singleDate, setSingleDate] = useState("");
  const [singleDayType, setSingleDayType] = useState("FULL_DAY");

  // Multi Day state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDayType, setStartDayType] = useState("FULL_DAY");
  const [endDayType, setEndDayType] = useState("FULL_DAY");

  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, balanceRes, leavesRes] = await Promise.allSettled([
        getLeaveTypes(),
        getMyLeaveBalance(),
        getMyLeaves({ page: 1, limit: 20 }),
      ]);

      if (typesRes.status === "fulfilled") {
        setLeaveTypes(typesRes.value?.data || []);
      }
      if (balanceRes.status === "fulfilled") {
        setBalances(balanceRes.value?.data || []);
      }
      if (leavesRes.status === "fulfilled") {
        setLeaveRequests(leavesRes.value?.data?.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch leave data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDurationChange = (mode) => {
    setLeaveDuration(mode);
    if (mode === "SINGLE") {
      if (startDate) {
        setSingleDate(startDate);
      }
      setSingleDayType("FULL_DAY");
      setStartDate("");
      setEndDate("");
      setStartDayType("FULL_DAY");
      setEndDayType("FULL_DAY");
    } else {
      if (singleDate) {
        setStartDate(singleDate);
      }
      setSingleDate("");
      setSingleDayType("FULL_DAY");
      setStartDayType("FULL_DAY");
      setEndDayType("FULL_DAY");
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!leaveTypeId || !reason) {
      showWarning("Please fill in all required fields.");
      return;
    }

    let finalStartDate = "";
    let finalEndDate = "";
    let finalStartDayType = "FULL_DAY";
    let finalEndDayType = "FULL_DAY";

    if (leaveDuration === "SINGLE") {
      if (!singleDate) {
        showWarning("Please select a date.");
        return;
      }
      finalStartDate = singleDate;
      finalEndDate = singleDate;
      finalStartDayType = singleDayType;
      finalEndDayType = singleDayType;
    } else {
      if (!startDate || !endDate) {
        showWarning("Please select both start and end dates.");
        return;
      }
      if (endDate < startDate) {
        showWarning("End Date cannot be before Start Date.");
        return;
      }
      finalStartDate = startDate;
      finalEndDate = endDate;
      finalStartDayType = startDayType;
      finalEndDayType = endDayType;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("leave_type_id", leaveTypeId);
      formData.append("start_date", finalStartDate);
      formData.append("end_date", finalEndDate);
      formData.append("start_day_type", finalStartDayType);
      formData.append("end_day_type", finalEndDayType);
      formData.append("reason", reason);
      if (file) {
        formData.append("document", file);
      }

      await applyLeave(formData);
      showSuccess("Leave request submitted successfully!");
      setShowApplyModal(false);
      resetForm();
      fetchData();

      window.dispatchEvent(new Event("hrms:notification_update"));
    } catch (err) {
      console.error("Failed to apply for leave", err);
      const errText = err.response?.data?.detail || "Failed to submit leave request. Please check inputs.";
      showError(errText);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancelRequest = async (e) => {
    if (e) e.preventDefault();
    if (!cancelTargetId) return;
    if (!cancellationReason.trim()) {
      showWarning("Cancellation reason is required.");
      return;
    }
    setCancelling(true);
    try {
      await cancelLeave(cancelTargetId, { cancellation_reason: cancellationReason.trim() });
      showSuccess("Leave request cancelled successfully.");
      setCancelTargetId(null);
      setCancellationReason("");
      fetchData();
    } catch (err) {
      console.error("Failed to cancel leave request", err);
      const errText = err.response?.data?.detail || "Unable to cancel leave request.";
      showError(errText);
    } finally {
      setCancelling(false);
    }
  };

  const resetForm = () => {
    setLeaveTypeId("");
    setLeaveDuration("SINGLE");
    setSingleDate("");
    setSingleDayType("FULL_DAY");
    setStartDate("");
    setEndDate("");
    setStartDayType("FULL_DAY");
    setEndDayType("FULL_DAY");
    setReason("");
    setFile(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="hrms-badge hrms-badge-success">
            <span className="hrms-status-dot" /> APPROVED
          </span>
        );
      case "REJECTED":
        return (
          <span className="hrms-badge hrms-badge-danger">
            <span className="hrms-status-dot" /> REJECTED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="hrms-badge hrms-badge-neutral">
            <span className="hrms-status-dot" /> CANCELLED
          </span>
        );
      case "REVOKED":
        return (
          <span className="hrms-badge hrms-badge-warning">
            <span className="hrms-status-dot" /> REVOKED
          </span>
        );
      default:
        return (
          <span className="hrms-badge hrms-badge-warning">
            <span className="hrms-status-dot" /> PENDING
          </span>
        );
    }
  };

  return (
    <AppLayout title="Apply for Leave">
      <div className="hrms-page-container" style={{ maxWidth: "1140px", margin: "0 auto" }}>
        <BackToDashboard to="/employee/dashboard" role="EMPLOYEE" />

        {/* Page Top Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Leave & Time Off</h1>
            <p className="hrms-page-subtitle">
              Monitor leave quota balances, submit new time-off requests, and track approval states
            </p>
          </div>

          <div className="hrms-page-actions">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowApplyModal(true);
              }}
              className="hrms-btn hrms-btn-primary"
            >
              <Plus size={16} strokeWidth={2.2} /> Apply for Leave
            </button>
          </div>
        </div>

        {/* Leave Balances Grid */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.875rem" }}>
            Available Quota Balances
          </div>

          {balances.length === 0 ? (
            <div className="hrms-card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              No leave balances currently allocated for this calendar year. Please contact HR to initialize quota.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "1.25rem" }}>
              {balances.map((b) => {
                const remaining = Number(b.allocated_days - b.used_days - b.pending_days);
                return (
                  <div key={b.id || b.leave_type_id} className="hrms-card hrms-card-interactive" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {b.leave_type_name || "Leave"}
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Year {b.year}
                        </span>
                      </div>
                      <span className="hrms-badge hrms-badge-neutral" style={{ fontSize: "0.7rem" }}>
                        {b.allocated_days} Total
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", margin: "1rem 0" }}>
                      <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary-color)", fontFamily: "var(--font-mono)", letterSpacing: "-0.03em" }}>
                        {remaining.toFixed(1)}
                      </span>
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                        days left
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
                      <span>Used: <strong style={{ color: "var(--text-primary)" }}>{b.used_days}</strong></span>
                      <span>Pending: <strong style={{ color: "var(--warning-color)" }}>{b.pending_days}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Requests Table Section */}
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.875rem" }}>
            My Leave Request History
          </div>

          <div className="hrms-table-container">
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Loading leave request records...
              </div>
            ) : leaveRequests.length === 0 ? (
              <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
                <CalendarDays size={40} style={{ color: "var(--text-muted)", margin: "0 auto 0.75rem auto" }} />
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  No Leave Requests Yet
                </h3>
                <p style={{ margin: "0.35rem 0 1.25rem 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Submit a new request above to take time off
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowApplyModal(true);
                  }}
                  className="hrms-btn hrms-btn-primary"
                >
                  <Plus size={16} /> Apply for Leave
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="employee-desktop-table hrms-table-wrapper">
                  <table className="hrms-table">
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Dates Requested</th>
                        <th>Duration</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((req) => (
                        <tr key={req.id}>
                          <td>
                            <strong style={{ color: "var(--text-primary)" }}>{req.leave_type_name || "Leave"}</strong>
                          </td>
                          <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                            {req.start_date} <ArrowRight size={12} style={{ display: "inline-block", margin: "0 2px" }} /> {req.end_date}
                          </td>
                          <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                            {req.duration} {req.duration === 1 ? "day" : "days"}
                          </td>
                          <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {req.reason}
                          </td>
                          <td>{getStatusBadge(req.status)}</td>
                          <td style={{ textAlign: "right" }}>
                            {(req.status === "PENDING" || req.status === "APPROVED") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelTargetId(req.id);
                                  setCancellationReason("");
                                }}
                                className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                                style={{ color: "var(--danger-color)" }}
                              >
                                Cancel Request
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (<768px) */}
                <div className="employee-mobile-cards" style={{ padding: "1rem" }}>
                  {leaveRequests.map((req) => (
                    <div key={req.id} className="hrms-card" style={{ padding: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                            {req.leave_type_name || "Leave"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {req.start_date} to {req.end_date} • {req.duration} day(s)
                          </div>
                        </div>
                        {getStatusBadge(req.status)}
                      </div>

                      <p style={{ margin: "0.5rem 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {req.reason}
                      </p>

                      {(req.status === "PENDING" || req.status === "APPROVED") && (
                        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelTargetId(req.id);
                              setCancellationReason("");
                            }}
                            className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                            style={{ color: "var(--danger-color)", width: "100%" }}
                          >
                            Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Apply Leave Modal */}
        {showApplyModal && (
          <div className="hrms-modal-backdrop" onClick={() => setShowApplyModal(false)}>
            <div className="hrms-modal" style={{ maxWidth: "580px" }} onClick={(e) => e.stopPropagation()}>
              <div className="hrms-modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Apply for Leave
                  </h3>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Submit time-off details for manager and HR approval
                  </p>
                </div>
                <button
                  type="button"
                  className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                  onClick={() => setShowApplyModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleApplySubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div className="hrms-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Leave Type */}
                  <div>
                    <label className="hrms-label">
                      Leave Type <span style={{ color: "var(--danger-color)" }}>*</span>
                    </label>
                    <select
                      className="hrms-select"
                      value={leaveTypeId}
                      onChange={(e) => setLeaveTypeId(e.target.value)}
                      required
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes
                        .filter((t) => t.is_active)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code}) — {t.max_days_per_year} days/yr
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Duration Toggle Buttons */}
                  <div>
                    <label className="hrms-label">Duration Type</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleDurationChange("SINGLE")}
                        className={`hrms-btn ${leaveDuration === "SINGLE" ? "hrms-btn-primary" : "hrms-btn-secondary"}`}
                        style={{ flex: 1 }}
                      >
                        Single Day (1 Day)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDurationChange("MULTI")}
                        className={`hrms-btn ${leaveDuration === "MULTI" ? "hrms-btn-primary" : "hrms-btn-secondary"}`}
                        style={{ flex: 1 }}
                      >
                        Multiple Days
                      </button>
                    </div>
                  </div>

                  {/* Conditional Date Pickers */}
                  {leaveDuration === "SINGLE" ? (
                    <div className="hrms-form-grid-2">
                      <div>
                        <label className="hrms-label">
                          Date <span style={{ color: "var(--danger-color)" }}>*</span>
                        </label>
                        <input
                          type="date"
                          className="hrms-input"
                          value={singleDate}
                          onChange={(e) => setSingleDate(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="hrms-label">Shift Portion</label>
                        <select
                          className="hrms-select"
                          value={singleDayType}
                          onChange={(e) => setSingleDayType(e.target.value)}
                        >
                          <option value="FULL_DAY">Full Day</option>
                          <option value="FIRST_HALF">First Half (Morning)</option>
                          <option value="SECOND_HALF">Second Half (Afternoon)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="hrms-form-grid-2">
                        <div>
                          <label className="hrms-label">
                            Start Date <span style={{ color: "var(--danger-color)" }}>*</span>
                          </label>
                          <input
                            type="date"
                            className="hrms-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="hrms-label">Start Day Portion</label>
                          <select
                            className="hrms-select"
                            value={startDayType}
                            onChange={(e) => setStartDayType(e.target.value)}
                          >
                            <option value="FULL_DAY">Full Day</option>
                            <option value="FIRST_HALF">First Half (Morning)</option>
                            <option value="SECOND_HALF">Second Half (Afternoon)</option>
                          </select>
                        </div>
                      </div>

                      <div className="hrms-form-grid-2">
                        <div>
                          <label className="hrms-label">
                            End Date <span style={{ color: "var(--danger-color)" }}>*</span>
                          </label>
                          <input
                            type="date"
                            className="hrms-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="hrms-label">End Day Portion</label>
                          <select
                            className="hrms-select"
                            value={endDayType}
                            onChange={(e) => setEndDayType(e.target.value)}
                          >
                            <option value="FULL_DAY">Full Day</option>
                            <option value="FIRST_HALF">First Half (Morning)</option>
                            <option value="SECOND_HALF">Second Half (Afternoon)</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Reason */}
                  <div>
                    <label className="hrms-label">
                      Reason for Time Off <span style={{ color: "var(--danger-color)" }}>*</span>
                    </label>
                    <textarea
                      className="hrms-textarea"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Please describe reason for leave..."
                      required
                    />
                  </div>

                  {/* Supporting Document */}
                  <div>
                    <label className="hrms-label">Attachment / Document (Optional)</label>
                    <input
                      type="file"
                      className="hrms-input"
                      onChange={(e) => setFile(e.target.files[0] || null)}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                  </div>
                </div>

                <div className="hrms-modal-footer">
                  <button
                    type="button"
                    className="hrms-btn hrms-btn-secondary"
                    onClick={() => setShowApplyModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="hrms-btn hrms-btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting Request..." : "Submit Leave Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {Boolean(cancelTargetId) && (
          <div className="hrms-modal-backdrop" onClick={() => setCancelTargetId(null)}>
            <div className="hrms-modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
              <div className="hrms-modal-header">
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Cancel Leave Request
                </h3>
                <button
                  type="button"
                  className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                  onClick={() => setCancelTargetId(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={confirmCancelRequest} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="hrms-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    Please provide an explanation for cancelling this request:
                  </p>

                  <div>
                    <label className="hrms-label">
                      Cancellation Reason <span style={{ color: "var(--danger-color)" }}>*</span>
                    </label>
                    <textarea
                      className="hrms-textarea"
                      rows={3}
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="e.g. Travel postponed, personal plan changed..."
                      required
                    />
                  </div>
                </div>

                <div className="hrms-modal-footer">
                  <button
                    type="button"
                    className="hrms-btn hrms-btn-secondary"
                    onClick={() => setCancelTargetId(null)}
                    disabled={cancelling}
                  >
                    Keep Leave
                  </button>
                  <button
                    type="submit"
                    className="hrms-btn hrms-btn-danger"
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling..." : "Confirm Cancellation"}
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
