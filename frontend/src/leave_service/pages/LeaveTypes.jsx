import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Edit2, CheckCircle2, XCircle, FileText, Tag, Check, ArrowLeft } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { showSuccess, showError } from "../../shared/utils/toast";
import {
  getAllLeaveTypes,
  createLeaveType,
  updateLeaveType,
  activateLeaveType,
  deactivateLeaveType,
} from "../services/leaveApi";

export default function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [annualAllocation, setAnnualAllocation] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [requiresDocument, setRequiresDocument] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllLeaveTypes();
      setLeaveTypes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch leave types", err);
      showError("Failed to fetch leave types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const openCreateModal = () => {
    setEditingType(null);
    setName("");
    setDescription("");
    setAnnualAllocation("12");
    setIsPaid(true);
    setRequiresDocument(false);
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setEditingType(t);
    setName(t.name);
    setDescription(t.description || "");
    setAnnualAllocation(String(t.annual_allocation));
    setIsPaid(t.is_paid);
    setRequiresDocument(t.requires_document);
    setIsActive(t.is_active);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name,
      description: description || undefined,
      annual_allocation: Number(annualAllocation),
      is_paid: isPaid,
      requires_document: requiresDocument,
      is_active: isActive,
    };

    try {
      if (editingType) {
        await updateLeaveType(editingType.id, payload);
        showSuccess("Leave type updated successfully!");
      } else {
        await createLeaveType(payload);
        showSuccess("Leave type created successfully!");
      }
      setShowModal(false);
      fetchTypes();
    } catch (err) {
      console.error("Failed to save leave type", err);
      const errText = err.response?.data?.detail || "Failed to save leave type.";
      showError(errText);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (t) => {
    try {
      if (t.is_active) {
        await deactivateLeaveType(t.id);
        showSuccess(`Deactivated ${t.name}`);
      } else {
        await activateLeaveType(t.id);
        showSuccess(`Activated ${t.name}`);
      }
      fetchTypes();
    } catch (err) {
      console.error("Failed to toggle status", err);
      showError(err.response?.data?.detail || "Failed to toggle status.");
    }
  };

  return (
    <AppLayout title="Leave Type Policy">
      <div className="hrms-page-container" style={{ maxWidth: "1140px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/leaves" role="HR" />

        {/* Page Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Leave Type Policy Configurations</h1>
            <p className="hrms-page-subtitle">
              Define standard leave categories, annual quotas, pay status, and documentation policies
            </p>
          </div>

          <div className="hrms-page-actions">
            <button
              type="button"
              onClick={openCreateModal}
              className="hrms-btn hrms-btn-primary"
            >
              <Plus size={16} strokeWidth={2.2} /> Create Leave Category
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading policy categories...
          </div>
        ) : leaveTypes.length === 0 ? (
          <div className="hrms-card" style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <Tag size={40} style={{ color: "var(--text-muted)", margin: "0 auto 0.75rem auto" }} />
            <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              No Leave Categories Defined
            </h3>
            <p style={{ margin: "0.35rem 0 1.25rem 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Create your organization's first leave policy type above
            </p>
            <button type="button" onClick={openCreateModal} className="hrms-btn hrms-btn-primary">
              <Plus size={16} /> Create Leave Category
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "1.25rem" }}>
            {leaveTypes.map((t) => (
              <div key={t.id} className="hrms-card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {t.name}
                    </h3>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--primary-color)", fontWeight: 700 }}>
                      {t.code || "LEAVE"}
                    </span>
                  </div>

                  <span className={`hrms-badge ${t.is_active ? "hrms-badge-success" : "hrms-badge-neutral"}`}>
                    <span className="hrms-status-dot" /> {t.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <p style={{ margin: "0.5rem 0 1.25rem 0", fontSize: "0.8125rem", color: "var(--text-secondary)", minHeight: "36px", lineHeight: 1.4 }}>
                  {t.description || "Standard company policy leave category."}
                </p>

                <div
                  style={{
                    backgroundColor: "var(--bg-surface-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    padding: "0.875rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                    fontSize: "0.8125rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)" }}>Annual Quota:</span>
                    <strong style={{ fontFamily: "var(--font-mono)", fontSize: "0.9375rem", color: "var(--primary-color)" }}>
                      {t.annual_allocation} days/year
                    </strong>
                  </div>

                  <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)" }}>Compensation:</span>
                    <span className={`hrms-badge ${t.is_paid ? "hrms-badge-info" : "hrms-badge-neutral"}`} style={{ fontSize: "0.7rem" }}>
                      {t.is_paid ? "Paid Leave" : "Unpaid Leave"}
                    </span>
                  </div>

                  <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)" }}>Doctor / Legal Proof:</span>
                    <span style={{ fontWeight: 600, color: t.requires_document ? "var(--warning-color)" : "var(--text-primary)" }}>
                      {t.requires_document ? "Required" : "Optional"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", paddingTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => openEditModal(t)}
                    className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleActive(t)}
                    className={`hrms-btn hrms-btn-sm ${t.is_active ? "hrms-btn-ghost" : "hrms-btn-secondary"}`}
                    style={{
                      flex: 1,
                      color: t.is_active ? "var(--danger-color)" : "var(--success-color)",
                      borderColor: t.is_active ? "var(--danger-border)" : "var(--success-border)",
                    }}
                  >
                    {t.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="hrms-modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="hrms-modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
              <div className="hrms-modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {editingType ? "Edit Leave Category" : "New Leave Category"}
                  </h3>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Set allocation rules and compensation parameters
                  </p>
                </div>
                <button
                  type="button"
                  className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                  onClick={() => setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="hrms-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div>
                    <label className="hrms-label">
                      Leave Type Name <span style={{ color: "var(--danger-color)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="hrms-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Annual Vacation, Sick Leave"
                      required
                    />
                  </div>

                  <div>
                    <label className="hrms-label">Category Description</label>
                    <textarea
                      className="hrms-textarea"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief policy explanation..."
                    />
                  </div>

                  <div>
                    <label className="hrms-label">
                      Annual Allocation (Days / Year) <span style={{ color: "var(--danger-color)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="hrms-input"
                      value={annualAllocation}
                      onChange={(e) => setAnnualAllocation(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", fontSize: "0.875rem" }}>
                      <input
                        type="checkbox"
                        checked={isPaid}
                        onChange={(e) => setIsPaid(e.target.checked)}
                        style={{ width: "16px", height: "16px", accentColor: "var(--primary-color)" }}
                      />
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Paid Leave</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        (Employee retains regular salary compensation)
                      </span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", fontSize: "0.875rem" }}>
                      <input
                        type="checkbox"
                        checked={requiresDocument}
                        onChange={(e) => setRequiresDocument(e.target.checked)}
                        style={{ width: "16px", height: "16px", accentColor: "var(--primary-color)" }}
                      />
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Requires Proof Document</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        (Medical certificate or justification attachment)
                      </span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", fontSize: "0.875rem" }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        style={{ width: "16px", height: "16px", accentColor: "var(--primary-color)" }}
                      />
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Category Active</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        (Available for employee application)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="hrms-modal-footer">
                  <button
                    type="button"
                    className="hrms-btn hrms-btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="hrms-btn hrms-btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : editingType ? "Update Category" : "Create Category"}
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
