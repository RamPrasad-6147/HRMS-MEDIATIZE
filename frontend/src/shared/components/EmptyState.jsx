import React from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import Button from "./Button";

export function EmptyState({ icon, title = "No records found", description = "There are no items to display at this time.", actionText, onAction }) {
  const displayIcon = icon || <FolderOpen size={36} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />;
  return (
    <div style={styles.container}>
      <div style={styles.icon}>{displayIcon}</div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction} style={{ marginTop: "1rem" }}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ text = "Loading records..." }) {
  return (
    <div style={styles.container}>
      <div style={styles.spinner}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--brand-primary)" }} />
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "0.5rem 0 0 0" }}>{text}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, actionText, onAction, actionVariant = "primary", actionIcon, children }) {
  return (
    <div style={styles.headerRow}>
      <div>
        <h1 style={styles.pageTitle}>{title}</h1>
        {subtitle && <p style={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {children}
        {actionText && onAction && (
          <Button variant={actionVariant} onClick={onAction} icon={actionIcon}>
            {actionText}
          </Button>
        )}
      </div>
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon, badge, trend }) {
  return (
    <div className="hrms-card hrms-card-interactive" style={styles.statCard}>
      <div style={styles.statTop}>
        <span style={styles.statTitle}>{title}</span>
        {icon && <span style={styles.statIcon}>{icon}</span>}
      </div>
      <div style={styles.statValueRow}>
        <span style={styles.statValue}>{value}</span>
        {badge}
      </div>
      {subtitle && <span style={styles.statSubtitle}>{subtitle}</span>}
    </div>
  );
}

const styles = {
  container: {
    padding: "3rem 1.5rem",
    textAlign: "center",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
  },
  icon: {
    fontSize: "2.5rem",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "1.125rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: "0 0 0.375rem 0",
  },
  description: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    margin: 0,
    maxWidth: "400px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  spinner: {
    fontSize: "2rem",
    animation: "spin 1s linear infinite",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1.75rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid var(--border-color)",
  },
  pageTitle: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  pageSubtitle: {
    fontSize: "0.875rem",
    color: "var(--text-muted)",
    margin: "0.25rem 0 0 0",
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  statTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statTitle: {
    fontSize: "0.8125rem",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statIcon: {
    fontSize: "1.25rem",
  },
  statValueRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.625rem",
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: "800",
    color: "var(--text-primary)",
    letterSpacing: "-0.03em",
  },
  statSubtitle: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
};
