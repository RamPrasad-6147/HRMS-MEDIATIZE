import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="hrms-btn hrms-btn-ghost hrms-btn-sm"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={styles.toggleBtn}
    >
      {isDark ? (
        <Sun size={16} strokeWidth={2} style={{ color: "#f59e0b" }} />
      ) : (
        <Moon size={16} strokeWidth={2} style={{ color: "#6366f1" }} />
      )}
      <span className="hrms-theme-text" style={styles.text}>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

const styles = {
  toggleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.375rem 0.625rem",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    fontSize: "0.8125rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  text: {
    fontSize: "0.8125rem",
  },
};
