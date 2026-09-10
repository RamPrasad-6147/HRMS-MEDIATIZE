import React from "react";
import { X, Calendar, User, Folder, Clock, CheckCircle2, Eye, ShieldAlert } from "lucide-react";
import Button from "../../shared/components/Button";

const AnnouncementDetailModal = ({ isOpen, onClose, announcement }) => {
  if (!isOpen || !announcement) return null;

  const isProjectScope = announcement.announcement_scope === "PROJECT";
  const isUrgent = announcement.priority === "URGENT";
  const isImportant = announcement.priority === "IMPORTANT";

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
          maxHeight: "90vh",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-surface-elevated)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                {/* Scope Badge */}
                <span
                  className="hrms-badge"
                  style={{
                    background: isProjectScope ? "rgba(168, 85, 247, 0.12)" : "rgba(59, 130, 246, 0.12)",
                    color: isProjectScope ? "#9333ea" : "#2563eb",
                    border: isProjectScope ? "1px solid rgba(168, 85, 247, 0.25)" : "1px solid rgba(59, 130, 246, 0.25)",
                  }}
                >
                  {isProjectScope ? `PROJECT • ${announcement.project_code || "PRJ"}` : "COMPANY-WIDE"}
                </span>

                {/* Priority Badge */}
                <span
                  className="hrms-badge"
                  style={{
                    background: isUrgent ? "rgba(239, 68, 68, 0.12)" : isImportant ? "rgba(245, 158, 11, 0.12)" : "var(--bg-surface)",
                    color: isUrgent ? "var(--danger-color, #ef4444)" : isImportant ? "#d97706" : "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {announcement.priority}
                </span>

                {/* Type Tag */}
                <span
                  className="hrms-badge"
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {announcement.announcement_type}
                </span>
              </div>

              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {announcement.title}
              </h2>
            </div>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
              }}
              aria-label="Close details modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Meta Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <User size={14} />
              <span>Posted by <strong>{announcement.creator_name || "HR Admin"}</strong></span>
            </span>

            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Calendar size={14} />
              <span>
                {announcement.published_at
                  ? new Date(announcement.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "Draft"}
              </span>
            </span>

            {announcement.expires_at && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--warning-color, #f59e0b)" }}>
                <Clock size={14} />
                <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
              </span>
            )}

            {announcement.read_count !== null && announcement.read_count !== undefined && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--primary-color)", fontWeight: 600 }}>
                <Eye size={14} />
                <span>{announcement.read_count} employee read{announcement.read_count !== 1 ? "s" : ""}</span>
              </span>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div
          style={{
            padding: "1.5rem",
            overflowY: "auto",
            flex: 1,
            color: "var(--text-primary)",
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {isProjectScope && announcement.project_name && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-color)",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1rem",
              }}
            >
              <Folder size={16} style={{ color: "var(--primary-color)", flexShrink: 0 }} />
              <span>
                Targeted exclusively to active members of <strong>{announcement.project_name}</strong> ({announcement.project_code}).
              </span>
            </div>
          )}

          <div style={{ wordBreak: "break-word" }}>
            {announcement.content}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--success-color, #10b981)", fontWeight: 600 }}>
            <CheckCircle2 size={16} />
            <span>Marked as Read</span>
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailModal;
