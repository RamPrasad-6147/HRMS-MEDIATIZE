import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { User, Mail, Phone, Calendar, MapPin, ArrowLeft, Edit2, Briefcase, ShieldCheck, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { getEmployeeById } from "../services/employeeApi";
import BackToDashboard from "../../shared/components/BackToDashboard";
import AppLayout from "../../shared/components/AppLayout";
import { showError } from "../../shared/utils/toast";

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await getEmployeeById(id);
        setEmployee(res.data);
      } catch (err) {
        showError(err.response?.data?.detail || "Failed to load employee details.");
        navigate("/hr/employees");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Employee Profile">
        <div className="hrms-page-container" style={{ maxWidth: "940px", margin: "0 auto", textAlign: "center", padding: "5rem 1rem" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <Loader2 size={36} className="hrms-spin" style={{ color: "var(--primary-color)" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
              Loading employee profile...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!employee) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="hrms-badge hrms-badge-success">
            <span className="hrms-status-dot" /> ACTIVE
          </span>
        );
      case "INACTIVE":
        return (
          <span className="hrms-badge hrms-badge-neutral">
            <span className="hrms-status-dot" /> INACTIVE
          </span>
        );
      case "ON_NOTICE":
        return (
          <span className="hrms-badge hrms-badge-warning">
            <span className="hrms-status-dot" /> ON NOTICE
          </span>
        );
      case "TERMINATED":
        return (
          <span className="hrms-badge hrms-badge-danger">
            <span className="hrms-status-dot" /> TERMINATED
          </span>
        );
      default:
        return <span className="hrms-badge hrms-badge-neutral">{status}</span>;
    }
  };

  return (
    <AppLayout title={`${employee.first_name} ${employee.last_name}`}>
      <div className="hrms-page-container" style={{ maxWidth: "940px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/dashboard" role="HR" />

        {/* Page Top Navigation Bar */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Employee Profile</h1>
            <p className="hrms-page-subtitle">
              Comprehensive personnel records and platform credentials
            </p>
          </div>

          <div className="hrms-page-actions">
            <button
              type="button"
              onClick={() => navigate("/hr/employees")}
              className="hrms-btn hrms-btn-secondary"
            >
              <ArrowLeft size={16} /> Back to Directory
            </button>
            <button
              type="button"
              onClick={() => navigate(`/hr/employees/${id}/edit`)}
              className="hrms-btn hrms-btn-primary"
            >
              <Edit2 size={15} /> Edit Employee
            </button>
          </div>
        </div>

        {/* Profile Hero Card */}
        <div
          className="hrms-card"
          style={{
            padding: "2rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={`${employee.first_name} ${employee.last_name}`}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "var(--radius-full)",
                  objectFit: "cover",
                  border: "3px solid var(--primary-border)",
                  boxShadow: "var(--shadow-md)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--primary-color)",
                  color: "var(--text-on-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  boxShadow: "var(--shadow-md)",
                }}
              >
                {employee.first_name?.[0]}
                {employee.last_name?.[0]}
              </div>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                  {employee.first_name} {employee.last_name}
                </h2>
                {getStatusBadge(employee.employment_status)}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    color: "var(--primary-color)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {employee.employee_code}
                </span>

                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {employee.email}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            {employee.user_is_active ? (
              <>
                <CheckCircle2 size={20} style={{ color: "var(--success-color)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--success-color)" }}>
                    Active System Access
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Authorized to access Mediatize portal
                  </div>
                </div>
              </>
            ) : (
              <>
                <ShieldAlert size={20} style={{ color: "var(--danger-color)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--danger-color)" }}>
                    Access Suspended
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Portal login credentials disabled
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detail Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "1.5rem" }}>

          {/* Card 1: Contact & Communication */}
          <div className="hrms-card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(14, 165, 233, 0.12)",
                  color: "var(--info-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mail size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Contact Details
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>Official Email</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600, wordBreak: "break-all" }}>
                  {employee.email}
                </span>
              </div>

              <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>Phone Number</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  {employee.phone || "—"}
                </span>
              </div>

              <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>Residential Address</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", textAlign: "right", maxWidth: "260px" }}>
                  {employee.address || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Employment & Profile */}
          <div className="hrms-card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  color: "var(--success-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Briefcase size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Employment Details
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>Employee Code</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--primary-color)", fontWeight: 700 }}>
                  {employee.employee_code}
                </span>
              </div>

              <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>Joining Date</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  {employee.joining_date || "—"}
                </span>
              </div>

              <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>Date of Birth</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  {employee.date_of_birth || "—"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
