import React from "react";

export function ProjectStatusBadge({ status }) {
  const getStyle = () => {
    switch (status) {
      case "PLANNED":
        return {
          bg: "var(--bg-surface-elevated)",
          color: "var(--text-secondary)",
          border: "var(--border-color)",
          label: "PLANNED",
        };
      case "IN_PROGRESS":
        return {
          bg: "var(--info-bg, rgba(59, 130, 246, 0.12))",
          color: "var(--info-color, #3b82f6)",
          border: "rgba(59, 130, 246, 0.3)",
          label: "IN PROGRESS",
        };
      case "ON_HOLD":
        return {
          bg: "var(--warning-bg)",
          color: "var(--warning-color)",
          border: "var(--warning-border)",
          label: "ON HOLD",
        };
      case "COMPLETED":
        return {
          bg: "var(--success-bg)",
          color: "var(--success-color)",
          border: "var(--success-border)",
          label: "COMPLETED",
        };
      case "CANCELLED":
        return {
          bg: "var(--danger-bg)",
          color: "var(--danger-color)",
          border: "var(--danger-border)",
          label: "CANCELLED",
        };
      default:
        return {
          bg: "var(--bg-surface-elevated)",
          color: "var(--text-primary)",
          border: "var(--border-color)",
          label: status,
        };
    }
  };

  const style = getStyle();

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: "0.25rem 0.625rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: "700",
        whiteSpace: "nowrap",
        letterSpacing: "0.03em",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {style.label}
    </span>
  );
}

export function ProjectPriorityBadge({ priority }) {
  const getStyle = () => {
    switch (priority) {
      case "LOW":
        return { color: "var(--text-secondary)", bg: "var(--bg-surface-elevated)" };
      case "MEDIUM":
        return { color: "var(--info-color, #3b82f6)", bg: "rgba(59, 130, 246, 0.1)" };
      case "HIGH":
        return { color: "var(--warning-color)", bg: "var(--warning-bg)" };
      case "CRITICAL":
        return { color: "var(--danger-color)", bg: "var(--danger-bg)" };
      default:
        return { color: "var(--text-primary)", bg: "var(--bg-surface-elevated)" };
    }
  };

  const style = getStyle();

  return (
    <span
      style={{
        color: style.color,
        backgroundColor: style.bg,
        padding: "0.2rem 0.5rem",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.75rem",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {priority}
    </span>
  );
}

export function ProjectProgress({ percentage }) {
  const safePercent = Math.min(Math.max(percentage || 0, 0), 100);

  const getBarColor = () => {
    if (safePercent >= 100) return "var(--success-color)";
    if (safePercent >= 60) return "var(--primary-color)";
    if (safePercent >= 30) return "var(--warning-color)";
    return "var(--danger-color)";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%", minWidth: "100px" }}>
      <div
        style={{
          flex: 1,
          height: "8px",
          backgroundColor: "var(--bg-surface-elevated)",
          borderRadius: "9999px",
          overflow: "hidden",
          border: "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${safePercent}%`,
            backgroundColor: getBarColor(),
            borderRadius: "9999px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--text-primary)", minWidth: "35px", textAlign: "right" }}>
        {safePercent}%
      </span>
    </div>
  );
}

export const ProgressBar = ProjectProgress;

export function RoleStatusBadge({ isActive }) {
  return (
    <span
      style={{
        backgroundColor: isActive ? "var(--success-bg, rgba(34, 197, 94, 0.12))" : "var(--danger-bg, rgba(239, 68, 68, 0.12))",
        color: isActive ? "var(--success-color, #22c55e)" : "var(--danger-color, #ef4444)",
        border: `1px solid ${isActive ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
        padding: "0.2rem 0.6rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: "700",
      }}
    >
      {isActive ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}
