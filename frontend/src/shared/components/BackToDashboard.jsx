import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackToDashboard({ to, role = "HR", label = "Back to Dashboard" }) {
  const targetPath = to || (role === "EMPLOYEE" ? "/employee/dashboard" : "/hr/dashboard");

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <Link
        to={targetPath}
        className="hrms-btn hrms-btn-ghost hrms-btn-sm"
        style={{
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-secondary)",
          gap: "0.5rem",
          fontWeight: "600",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <ArrowLeft size={15} strokeWidth={2.2} />
        <span>{label}</span>
      </Link>
    </div>
  );
}
