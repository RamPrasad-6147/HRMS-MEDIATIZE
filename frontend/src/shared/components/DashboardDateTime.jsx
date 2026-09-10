import React, { useState, useEffect } from "react";
import { CalendarDays, Clock3 } from "lucide-react";

export default function DashboardDateTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dateString = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timeString = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div style={styles.container} aria-label="Current date and time">
      <div style={styles.item}>
        <CalendarDays size={15} style={styles.icon} />
        <span style={styles.dateText}>{dateString}</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.item}>
        <Clock3 size={15} style={styles.icon} />
        <span style={styles.timeText}>{timeString}</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.625rem",
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "0.4rem 0.75rem",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    fontWeight: "600",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    flexWrap: "wrap",
  },
  item: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  icon: {
    color: "var(--primary-color)",
    flexShrink: 0,
  },
  dateText: {
    color: "var(--text-primary)",
    letterSpacing: "0.01em",
  },
  timeText: {
    color: "var(--text-primary)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "0.02em",
  },
  divider: {
    width: "1px",
    height: "14px",
    backgroundColor: "var(--border-color)",
  },
};
