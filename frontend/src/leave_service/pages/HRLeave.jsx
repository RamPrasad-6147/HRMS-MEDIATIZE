import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Tags, WalletCards, X, RotateCcw, Check, Ban, AlertTriangle, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getAllLeaves, approveLeave, rejectLeave, revokeLeave } from "../services/leaveApi";
import { showSuccess, showError, showWarning } from "../../shared/utils/toast";

export default function HRLeave() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState(""); // "APPROVE", "REJECT", "REVOKE"
  const [hrRemarks, setHrRemarks] = useState("");
  const [revocationReason, setRevocationReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllLeaves({
        page,
        limit: 20,
        status: statusFilter || undefined,
      });
      setLeaves(res.data?.items || []);
      setTotalPages(res.data?.pages || 1);
    } catch (err) {
      console.error("Failed to fetch leave requests", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeave) return;

    if (actionType === "REVOKE" && !revocationReason.trim()) {
      showWarning("Revocation reason is required.");
      return;
    }

    setSubmitting(true);

    try {
      if (actionType === "APPROVE") {
        await approveLeave(selectedLeave.id, { hr_remarks: hrRemarks });
        showSuccess("Leave request approved successfully!");
      } else if (actionType === "REJECT") {
        await rejectLeave(selectedLeave.id, { hr_remarks: hrRemarks });
        showSuccess("Leave request rejected successfully.");
      } else if (actionType === "REVOKE") {
        await revokeLeave(selectedLeave.id, { revocation_reason: revocationReason.trim() });
        showSuccess("Leave decision revoked successfully.");
      }
      setSelectedLeave(null);
      setHrRemarks("");
      setRevocationReason("");
      fetchLeaves();
    } catch (err) {
      console.error("Failed to update leave request", err);
      const errText = err.response?.data?.detail || "Action failed.";
      showError(errText);
    } finally {
      setSubmitting(false);
    }
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
    <AppLayout title="Leave Applications">
      <div className="hrms-page-container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/dashboard" role="HR" />

        {/* Page Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Leave Request Management</h1>
            <p className="hrms-page-subtitle">
              Review and act on employee time-off requests, manage policy quotas, and configure leave types
            </p>
          </div>

          <div className="hrms-page-actions">
            <Link to="/hr/leave-types" className="hrms-btn hrms-btn-secondary">
              <Tags size={15} /> Configure Leave Types
            </Link>
            <Link to="/hr/leave-balances" className="hrms-btn hrms-btn-secondary">
              <WalletCards size={15} /> Employee Balances
            </Link>
          </div>
        </div>

        {/* Filter Card */}
        <div className="hrms-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Filter by Status:
            </span>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {["", "PENDING", "APPROVED", "REJECTED", "CANCELLED", "REVOKED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`hrms-btn hrms-btn-sm ${statusFilter === st ? "hrms-btn-primary" : "hrms-btn-secondary"}`}
                >
                  {st === "" ? "All Statuses" : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="hrms-table-container">
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Retrieving leave requests...
            </div>
          ) : leaves.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              No leave requests found matching filter criteria.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="employee-desktop-table hrms-table-wrapper">
                <table className="hrms-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Dates Requested</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            {req.employee_name}
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {req.employee_code}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{req.leave_type_name}</span>
                        </td>
                        <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                          {req.start_date} <ArrowRight size={12} style={{ display: "inline-block", margin: "0 2px" }} /> {req.end_date}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {req.duration} {req.duration === 1 ? "day" : "days"}
                        </td>
                        <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {req.reason}
                        </td>
                        <td>{getStatusBadge(req.status)}</td>
                        <td style={{ textAlign: "right" }}>
                          {req.status === "PENDING" && (
                            <div style={{ display: "inline-flex", gap: "0.375rem" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLeave(req);
                                  setActionType("APPROVE");
                                  setHrRemarks("");
                                }}
                                className="hrms-btn hrms-btn-sm"
                                style={{ backgroundColor: "var(--success-bg)", color: "var(--success-color)", border: "1px solid var(--success-border)" }}
                              >
                                <Check size={13} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLeave(req);
                                  setActionType("REJECT");
                                  setHrRemarks("");
                                }}
                                className="hrms-btn hrms-btn-sm"
                                style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger-color)", border: "1px solid var(--danger-border)" }}
                              >
                                <Ban size={13} /> Reject
                              </button>
                            </div>
                          )}

                          {(req.status === "APPROVED" || req.status === "REJECTED") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeave(req);
                                setActionType("REVOKE");
                                setRevocationReason("");
                              }}
                              className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                              style={{ color: "var(--warning-color)" }}
                            >
                              <RotateCcw size={13} /> Revoke Decision
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="employee-mobile-cards" style={{ padding: "1rem" }}>
                {leaves.map((req) => (
                  <div key={req.id} className="hrms-card" style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                          {req.employee_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {req.employee_code} • {req.leave_type_name}
                        </div>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      <strong>Dates:</strong> {req.start_date} to {req.end_date} ({req.duration} day/s)
                    </div>

                    <p style={{ margin: "0.5rem 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      <strong>Reason:</strong> {req.reason}
                    </p>

                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)", display: "flex", gap: "0.5rem" }}>
                      {req.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeave(req);
                              setActionType("APPROVE");
                              setHrRemarks("");
                            }}
                            className="hrms-btn hrms-btn-sm"
                            style={{ flex: 1, backgroundColor: "var(--success-bg)", color: "var(--success-color)", border: "1px solid var(--success-border)" }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeave(req);
                              setActionType("REJECT");
                              setHrRemarks("");
                            }}
                            className="hrms-btn hrms-btn-sm"
                            style={{ flex: 1, backgroundColor: "var(--danger-bg)", color: "var(--danger-color)", border: "1px solid var(--danger-border)" }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {(req.status === "APPROVED" || req.status === "REJECTED") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLeave(req);
                            setActionType("REVOKE");
                            setRevocationReason("");
                          }}
                          className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                          style={{ color: "var(--warning-color)", width: "100%" }}
                        >
                          <RotateCcw size={13} /> Revoke Decision
                        </button>
                      )}
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

        {/* Action Modal (Approve / Reject / Revoke) */}
        {selectedLeave && (
          <div className="hrms-modal-backdrop" onClick={() => setSelectedLeave(null)}>
            <div className="hrms-modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
              <div className="hrms-modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {actionType === "APPROVE"
                      ? "Approve Leave Request"
                      : actionType === "REJECT"
                      ? "Reject Leave Request"
                      : "Revoke Leave Decision"}
                  </h3>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {selectedLeave.employee_name} ({selectedLeave.employee_code})
                  </p>
                </div>
                <button
                  type="button"
                  className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                  onClick={() => setSelectedLeave(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleActionSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="hrms-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div
                    style={{
                      padding: "0.875rem 1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.8125rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                    }}
                  >
                    <div><strong>Leave Type:</strong> {selectedLeave.leave_type_name}</div>
                    <div><strong>Duration:</strong> {selectedLeave.start_date} to {selectedLeave.end_date} ({selectedLeave.duration} days)</div>
                    <div><strong>Reason:</strong> {selectedLeave.reason}</div>
                  </div>

                  {actionType === "REVOKE" ? (
                    <div>
                      <label className="hrms-label">
                        Reason for Revoking Decision <span style={{ color: "var(--danger-color)" }}>*</span>
                      </label>
                      <textarea
                        className="hrms-textarea"
                        rows={3}
                        value={revocationReason}
                        onChange={(e) => setRevocationReason(e.target.value)}
                        placeholder="Explain why this approved/rejected decision is being revoked..."
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="hrms-label">HR Remarks (Optional)</label>
                      <textarea
                        className="hrms-textarea"
                        rows={3}
                        value={hrRemarks}
                        onChange={(e) => setHrRemarks(e.target.value)}
                        placeholder="Add optional notes for the employee..."
                      />
                    </div>
                  )}
                </div>

                <div className="hrms-modal-footer">
                  <button
                    type="button"
                    className="hrms-btn hrms-btn-secondary"
                    onClick={() => setSelectedLeave(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`hrms-btn ${
                      actionType === "APPROVE"
                        ? "hrms-btn-primary"
                        : actionType === "REJECT"
                        ? "hrms-btn-danger"
                        : "hrms-btn-secondary"
                    }`}
                    style={actionType === "REVOKE" ? { backgroundColor: "var(--warning-color)", color: "#000" } : {}}
                  >
                    {submitting
                      ? "Processing..."
                      : actionType === "APPROVE"
                      ? "Confirm Approval"
                      : actionType === "REJECT"
                      ? "Confirm Rejection"
                      : "Confirm Revocation"}
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
