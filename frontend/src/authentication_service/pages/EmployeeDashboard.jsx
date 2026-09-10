import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  UserRound,
  ArrowRight,
  AlertCircle,
  Award,
  FolderGit2,
  Megaphone,
  FileText,
  Sparkles,
  CalendarCheck,
} from "lucide-react";

import AppLayout from "../../shared/components/AppLayout";
import DashboardDateTime from "../../shared/components/DashboardDateTime";
import { getUserDisplayName } from "../../shared/components/Header";
import { useAuth } from "../hooks/useAuth";
import { getMyLeaveBalance } from "../../leave_service/services/leaveApi";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const displayName = getUserDisplayName(user);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await getMyLeaveBalance();
        setBalances(res.data || []);
      } catch (err) {
        console.error("Failed to fetch leave balance summary", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  return (
    <AppLayout title="Employee Self-Service Portal">
      {/* Welcome Banner */}
      <div style={styles.welcomeBanner}>
        <div>
          <div style={styles.badgeRow}>
            <span className="hrms-badge hrms-badge-info" style={{ gap: "0.35rem" }}>
              <Sparkles size={12} /> Employee Self-Service
            </span>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: "500" }}>
              Personal Workspace
            </span>
          </div>
          <h2 style={styles.welcomeTitle}>
            {getGreeting()},{" "}
            <span style={styles.highlight}>
              {displayName !== "User" ? displayName : "Team Member"}
            </span>
          </h2>
          <p style={styles.welcomeSubtitle}>
            Welcome to your self-service dashboard. Check leave allowances, log attendance, and manage tasks.
          </p>
        </div>
        <div style={styles.welcomeRight}>
          <DashboardDateTime />
          <div style={styles.roleTag}>
            <span style={{ color: "var(--text-muted)" }}>Role:</span>{" "}
            <strong style={{ color: "var(--primary-color)", fontWeight: "700" }}>
              {user?.role || "EMPLOYEE"}
            </strong>
          </div>
        </div>
      </div>

      {/* Leave Balances Summary */}
      <div style={styles.sectionHeaderRow}>
        <h3 style={styles.sectionHeader}>Leave Entitlements &amp; Quotas</h3>
        <span style={styles.sectionCaption}>Your real-time assigned leave allowances for the current calendar year</span>
      </div>

      <div style={styles.grid}>
        {loading ? (
          <div style={styles.loadingCard}>
            <span className="hrms-status-dot" style={{ backgroundColor: "var(--primary-color)", marginRight: "0.5rem" }} />
            Loading leave balance allocations...
          </div>
        ) : balances.length === 0 ? (
          <div style={styles.infoCard}>
            <div style={styles.infoTitle}>Annual Leave Entitlement</div>
            <div style={styles.infoSub}>No active leave balances assigned yet. Please contact HR administration.</div>
          </div>
        ) : (
          balances.map((b) => {
            const remaining = Number(b.allocated_days - b.used_days - b.pending_days).toFixed(1);
            return (
              <div key={b.id || b.leave_type_id} className="hrms-card hrms-card-interactive" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricTitle}>{b.leave_type_name}</span>
                  <span className="hrms-badge hrms-badge-neutral">Year {b.year}</span>
                </div>
                <div style={styles.metricNum}>{remaining}</div>
                <div style={styles.metricLabel}>Days Remaining Available</div>
                <div style={styles.metricFooter}>
                  <span>Total Allocated: <strong>{b.allocated_days}</strong></span>
                  <span>Used: <strong>{b.used_days}</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Actions Hub */}
      <div style={styles.sectionHeaderRow}>
        <h3 style={styles.sectionHeader}>Quick Actions &amp; Services</h3>
        <span style={styles.sectionCaption}>Direct access to attendance check-ins, leave requests, and reports</span>
      </div>

      <div style={styles.grid}>
        {/* Prominent Apply for Leave Card */}
        <div className="hrms-card hrms-card-interactive" style={{ ...styles.actionCard, borderColor: "var(--primary-border)" }}>
          <div style={styles.cardTop}>
            <div style={{ ...styles.iconBox, backgroundColor: "var(--primary-light)", color: "var(--primary-color)" }}>
              <CalendarDays size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={styles.cardTitle}>Apply for Leave</h4>
              <p style={styles.cardSub}>Submit leave applications &amp; check approval status</p>
            </div>
          </div>
          <Link to="/employee/leave" className="hrms-btn hrms-btn-primary" style={styles.actionBtn}>
            <span>Request Time Off</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* View Attendance Card */}
        <div className="hrms-card hrms-card-interactive" style={styles.actionCard}>
          <div style={styles.cardTop}>
            <div style={{ ...styles.iconBox, backgroundColor: "var(--success-bg)", color: "var(--success-color)" }}>
              <Clock size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={styles.cardTitle}>Daily Attendance</h4>
              <p style={styles.cardSub}>Log daily check-ins, check-outs &amp; working hours</p>
            </div>
          </div>
          <Link to="/employee/attendance" className="hrms-btn hrms-btn-secondary" style={styles.actionBtn}>
            <span>Attendance Center</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* My Performance Card */}
        <div className="hrms-card hrms-card-interactive" style={styles.actionCard}>
          <div style={styles.cardTop}>
            <div style={{ ...styles.iconBox, backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}>
              <Award size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={styles.cardTitle}>Performance &amp; Goals</h4>
              <p style={styles.cardSub}>Review appraisals, ratings &amp; professional objectives</p>
            </div>
          </div>
          <Link to="/employee/performance" className="hrms-btn hrms-btn-secondary" style={styles.actionBtn}>
            <span>View Performance</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* My Projects Card */}
        <div className="hrms-card hrms-card-interactive" style={styles.actionCard}>
          <div style={styles.cardTop}>
            <div style={{ ...styles.iconBox, backgroundColor: "rgba(14, 165, 233, 0.15)", color: "var(--info-color)" }}>
              <FolderGit2 size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={styles.cardTitle}>My Assigned Projects</h4>
              <p style={styles.cardSub}>View your active deliverables &amp; project teams</p>
            </div>
          </div>
          <Link to="/employee/projects" className="hrms-btn hrms-btn-secondary" style={styles.actionBtn}>
            <span>View Projects</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Daily Work Reports Card */}
        <div className="hrms-card hrms-card-interactive" style={styles.actionCard}>
          <div style={styles.cardTop}>
            <div style={{ ...styles.iconBox, backgroundColor: "var(--info-bg)", color: "var(--info-color)" }}>
              <FileText size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={styles.cardTitle}>Work Reports</h4>
              <p style={styles.cardSub}>Submit daily progress reports and track past submissions</p>
            </div>
          </div>
          <Link to="/employee/work-reports" className="hrms-btn hrms-btn-secondary" style={styles.actionBtn}>
            <span>My Work Reports</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Submit Complaint Card */}
        <div className="hrms-card hrms-card-interactive" style={styles.actionCard}>
          <div style={styles.cardTop}>
            <div style={{ ...styles.iconBox, backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--danger-color)" }}>
              <AlertCircle size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={styles.cardTitle}>Grievance &amp; Complaints</h4>
              <p style={styles.cardSub}>Submit confidential feedback &amp; monitor resolution</p>
            </div>
          </div>
          <Link to="/employee/complaints" className="hrms-btn hrms-btn-secondary" style={styles.actionBtn}>
            <span>Manage Complaints</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Company Announcements Card */}
        <div className="hrms-card hrms-card-interactive" style={styles.actionCard}>
          <div style={styles.cardTop}>
            <div style={{ ...styles.iconBox, backgroundColor: "rgba(245, 158, 11, 0.15)", color: "var(--warning-color)" }}>
              <Megaphone size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={styles.cardTitle}>Announcements</h4>
              <p style={styles.cardSub}>Stay informed on company updates, policies &amp; news</p>
            </div>
          </div>
          <Link to="/employee/announcements" className="hrms-btn hrms-btn-secondary" style={styles.actionBtn}>
            <span>Read Announcements</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* My Profile Card */}
        <div className="hrms-card hrms-card-interactive" style={styles.actionCard}>
          <div style={styles.cardTop}>
            <div style={{ ...styles.iconBox, backgroundColor: "var(--bg-surface-elevated)", color: "var(--text-secondary)" }}>
              <UserRound size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={styles.cardTitle}>My Employee Profile</h4>
              <p style={styles.cardSub}>View contact info, job role, and account credentials</p>
            </div>
          </div>
          <Link to="/employee/profile" className="hrms-btn hrms-btn-secondary" style={styles.actionBtn}>
            <span>View Profile</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  welcomeBanner: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-xl)",
    padding: "1.75rem 2rem",
    marginBottom: "2.25rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1.5rem",
    boxShadow: "var(--shadow-xs)",
  },
  badgeRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "0.5rem",
    flexWrap: "wrap",
  },
  welcomeTitle: {
    fontSize: "1.65rem",
    fontWeight: "800",
    color: "var(--text-primary)",
    margin: 0,
    letterSpacing: "-0.025em",
  },
  welcomeSubtitle: {
    fontSize: "0.9375rem",
    color: "var(--text-secondary)",
    marginTop: "0.5rem",
    margin: 0,
    maxWidth: "680px",
    lineHeight: 1.5,
  },
  highlight: {
    color: "var(--primary-color)",
  },
  welcomeRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.75rem",
  },
  roleTag: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    padding: "0.4rem 0.875rem",
    borderRadius: "var(--radius-full)",
    fontSize: "0.8125rem",
    color: "var(--text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  sectionHeaderRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    marginBottom: "1rem",
    marginTop: "1.25rem",
  },
  sectionHeader: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  sectionCaption: {
    fontSize: "0.8125rem",
    color: "var(--text-muted)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: "1.25rem",
    marginBottom: "2.25rem",
  },
  metricCard: {
    display: "flex",
    flexDirection: "column",
    gap: "0.625rem",
    padding: "1.5rem",
  },
  metricHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricTitle: {
    fontWeight: "700",
    fontSize: "1.0625rem",
    color: "var(--text-primary)",
  },
  metricNum: {
    fontSize: "2.5rem",
    fontWeight: "800",
    color: "var(--primary-color)",
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
  },
  metricLabel: {
    fontSize: "0.8125rem",
    color: "var(--text-muted)",
    fontWeight: "500",
  },
  metricFooter: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.78125rem",
    color: "var(--text-secondary)",
    borderTop: "1px solid var(--border-color)",
    paddingTop: "0.75rem",
    marginTop: "0.5rem",
  },
  actionCard: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "1.5rem",
    padding: "1.5rem",
  },
  cardTop: {
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
  },
  iconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "var(--radius-lg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: "1.0625rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
    lineHeight: 1.3,
  },
  cardSub: {
    fontSize: "0.8125rem",
    color: "var(--text-muted)",
    marginTop: "0.35rem",
    margin: 0,
    lineHeight: 1.45,
  },
  actionBtn: {
    textAlign: "center",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
  },
  loadingCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-xl)",
    padding: "2.5rem",
    color: "var(--text-secondary)",
    gridColumn: "1 / -1",
    textAlign: "center",
    fontSize: "0.9375rem",
    fontWeight: "500",
  },
  infoCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-xl)",
    padding: "2rem",
    gridColumn: "1 / -1",
  },
  infoTitle: {
    color: "var(--text-primary)",
    fontWeight: "700",
    fontSize: "1rem",
  },
  infoSub: {
    color: "var(--text-muted)",
    fontSize: "0.875rem",
    marginTop: "0.375rem",
  },
};