import React, { useState, useEffect } from "react";
import { X, Megaphone, Folder, Calendar, AlertCircle, Send, Save } from "lucide-react";
import Button from "../../shared/components/Button";

const ANNOUNCEMENT_TYPES = [
  { value: "GENERAL", label: "General Announcement" },
  { value: "COMPANY_UPDATE", label: "Company Update" },
  { value: "HR_NOTICE", label: "HR Notice" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "SALARY", label: "Salary / Payroll Notice" },
];

const PRIORITIES = [
  { value: "NORMAL", label: "Normal" },
  { value: "IMPORTANT", label: "Important" },
  { value: "URGENT", label: "Urgent" },
];

const AnnouncementFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  selectedProject = null, // If passed, scope is PROJECT and pre-associated
  editingAnnouncement = null, // If editing existing
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    announcement_type: "GENERAL",
    priority: "NORMAL",
    announcement_scope: "COMPANY",
    expires_at: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingAnnouncement) {
      setFormData({
        title: editingAnnouncement.title || "",
        content: editingAnnouncement.content || "",
        announcement_type: editingAnnouncement.announcement_type || "GENERAL",
        priority: editingAnnouncement.priority || "NORMAL",
        announcement_scope: editingAnnouncement.announcement_scope || "COMPANY",
        expires_at: editingAnnouncement.expires_at
          ? new Date(editingAnnouncement.expires_at).toISOString().slice(0, 16)
          : "",
      });
    } else if (selectedProject) {
      setFormData({
        title: "",
        content: "",
        announcement_type: "GENERAL",
        priority: "NORMAL",
        announcement_scope: "PROJECT",
        expires_at: "",
      });
    } else {
      setFormData({
        title: "",
        content: "",
        announcement_type: "GENERAL",
        priority: "NORMAL",
        announcement_scope: "COMPANY",
        expires_at: "",
      });
    }
    setErrors({});
  }, [isOpen, selectedProject, editingAnnouncement]);

  if (!isOpen) return null;

  const isProjectScope = selectedProject || formData.announcement_scope === "PROJECT";

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = "Title is required.";
    if (!formData.content.trim()) errs.content = "Message content is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (publishNow) => {
    if (!validate()) return;

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      announcement_type: formData.announcement_type,
      priority: formData.priority,
      announcement_scope: isProjectScope ? "PROJECT" : "COMPANY",
      project_id: isProjectScope ? (selectedProject ? selectedProject.id : editingAnnouncement?.project_id) : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      publish_now: publishNow,
    };

    onSubmit(payload, editingAnnouncement?.id);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="hrms-modal"
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "var(--bg-surface)",
          borderRadius: "16px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: isProjectScope ? "rgba(168, 85, 247, 0.12)" : "var(--primary-subtle, rgba(99, 102, 241, 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isProjectScope ? "#9333ea" : "var(--primary-color)",
              }}
            >
              <Megaphone size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                {editingAnnouncement ? "Edit Announcement" : isProjectScope ? "Make Project Announcement" : "Create Company Announcement"}
              </h2>
              <p style={{ fontSize: "0.75rem", margin: "0.15rem 0 0", color: "var(--text-muted)" }}>
                {isProjectScope ? "Targeted to active project team members only" : "Visible to all active employees company-wide"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.25rem",
              borderRadius: "6px",
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1 }}>
          {/* Selected Project Summary Card */}
          {selectedProject && (
            <div
              style={{
                padding: "1rem",
                borderRadius: "10px",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                background: "rgba(245, 158, 11, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#d97706" }}>
                <Folder size={16} />
                <span>ASSOCIATED PROJECT</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {selectedProject.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#b45309",
                  }}
                >
                  {selectedProject.project_code}
                </span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
                {selectedProject.member_count} active team member{selectedProject.member_count !== 1 ? "s" : ""} will receive this announcement.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="hrms-label">
              Announcement Title <span style={{ color: "var(--danger-color, #ef4444)" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. Q3 Town Hall Scheduled / Sprint Release Notes"
              className="hrms-input"
              style={{ width: "100%", borderColor: errors.title ? "var(--danger-color, #ef4444)" : undefined }}
            />
            {errors.title && <p style={{ color: "var(--danger-color, #ef4444)", fontSize: "0.75rem", margin: "0.25rem 0 0" }}>{errors.title}</p>}
          </div>

          {/* Type & Priority Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {/* Type */}
            <div>
              <label className="hrms-label">Announcement Type</label>
              <select
                value={formData.announcement_type}
                onChange={(e) => handleChange("announcement_type", e.target.value)}
                className="hrms-select"
                style={{ width: "100%" }}
              >
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="hrms-label">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
                className="hrms-select"
                style={{ width: "100%" }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Expiry Date */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label className="hrms-label" style={{ margin: 0 }}>Optional Expiry Date & Time</label>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Leave blank if no expiry</span>
            </div>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => handleChange("expires_at", e.target.value)}
              className="hrms-input"
              style={{ width: "100%" }}
            />
          </div>

          {/* Content / Message */}
          <div>
            <label className="hrms-label">
              Message Content <span style={{ color: "var(--danger-color, #ef4444)" }}>*</span>
            </label>
            <textarea
              rows={5}
              value={formData.content}
              onChange={(e) => handleChange("content", e.target.value)}
              placeholder="Write announcement details here..."
              className="hrms-textarea"
              style={{ width: "100%", borderColor: errors.content ? "var(--danger-color, #ef4444)" : undefined }}
            />
            {errors.content && <p style={{ color: "var(--danger-color, #ef4444)", fontSize: "0.75rem", margin: "0.25rem 0 0" }}>{errors.content}</p>}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {!editingAnnouncement && (
              <Button
                variant="outline"
                icon={Save}
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                Save as Draft
              </Button>
            )}

            <Button
              variant="primary"
              icon={Send}
              onClick={() => handleSubmit(true)}
              loading={loading}
            >
              {editingAnnouncement ? "Save Changes" : "Publish Announcement"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementFormModal;
