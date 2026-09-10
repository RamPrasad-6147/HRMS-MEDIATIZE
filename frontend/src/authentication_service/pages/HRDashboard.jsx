
import { Link } from "react-router-dom";
import {
  Users,
  Clock3,
  CalendarDays,
  Tags,
  ClipboardList,
  ShieldCheck,
  ArrowRight,
  Plus,
  FileText,
  AlertCircle,
  Award,
  FolderGit2,
  FolderKanban,
  Megaphone,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import "./HRProfile.css";
import AppLayout from "../../shared/components/AppLayout";
import DashboardDateTime from "../../shared/components/DashboardDateTime";
import { getUserDisplayName } from "../../shared/components/Header";
import { useAuth } from "../hooks/useAuth";

export default function HRDashboard() {
  const { user } = useAuth();
  const displayName = getUserDisplayName(user);

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppLayout title="HR Administration Portal">
      {/* =====================================================
          DASHBOARD PAGE STYLES
          ===================================================== */}

      <style>{`
        .hr-dashboard {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* =====================================================
           WELCOME BANNER
           ===================================================== */

        .hr-welcome-banner {
          position: relative;
          overflow: hidden;

          display: flex;
          justify-content: space-between;
          align-items: center;

          gap: 2rem;

          padding: 2rem 2.25rem;
          margin-bottom: 2.5rem;

          border: 1px solid var(--border-color);
          border-radius: 24px;

          background:
            linear-gradient(
              135deg,
              rgba(15, 118, 110, 0.08),
              rgba(20, 184, 166, 0.025)
            ),
            var(--bg-surface);

          box-shadow:
            0 12px 35px rgba(15, 118, 110, 0.06);

          transition:
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .hr-welcome-banner::after {
          content: "";

          position: absolute;

          width: 240px;
          height: 240px;

          right: -100px;
          top: -120px;

          border-radius: 50%;

          background: rgba(20, 184, 166, 0.08);

          pointer-events: none;
        }

        .dark .hr-welcome-banner {
          background:
            linear-gradient(
              135deg,
              rgba(15, 118, 110, 0.15),
              rgba(20, 184, 166, 0.035)
            ),
            var(--bg-surface);

          box-shadow:
            0 18px 45px rgba(0, 0, 0, 0.16);
        }

        .hr-welcome-content {
          min-width: 0;
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .hr-badge-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.65rem;

          margin-bottom: 0.75rem;
        }

        .hr-suite-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;

          padding: 0.38rem 0.7rem;

          border: 1px solid rgba(20, 184, 166, 0.2);
          border-radius: 999px;

          background: rgba(20, 184, 166, 0.08);

          color: #0f766e;

          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .dark .hr-suite-badge {
          color: #5eead4;
          background: rgba(20, 184, 166, 0.10);
        }

        .hr-enterprise-label {
          color: var(--text-muted);
          font-size: 0.76rem;
          font-weight: 500;
        }

        .hr-welcome-title {
          margin: 0;

          color: var(--text-primary);

          font-size: clamp(1.45rem, 2vw, 1.85rem);
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: -0.035em;
        }

        .hr-welcome-name {
          color: var(--primary-color);
        }

        .hr-welcome-description {
          max-width: 760px;

          margin: 0.65rem 0 0;

          color: var(--text-secondary);

          font-size: 0.9rem;
          line-height: 1.6;
        }

        .hr-welcome-right {
          position: relative;
          z-index: 1;

          flex-shrink: 0;

          display: flex;
          flex-direction: column;
          align-items: flex-end;

          gap: 0.7rem;
        }

        .hr-access-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;

          padding: 0.45rem 0.8rem;

          border: 1px solid var(--border-color);
          border-radius: 999px;

          background: var(--bg-surface-elevated);

          color: var(--text-secondary);

          font-size: 0.75rem;
        }

        .hr-access-role {
          color: var(--primary-color);
          font-weight: 700;
        }


        /* =====================================================
           SECTION HEADERS
           ===================================================== */

        .hr-section {
          margin-bottom: 2.5rem;
        }

        .hr-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;

          gap: 1rem;

          margin-bottom: 1rem;
        }

        .hr-section-heading {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }

        .hr-section-marker {
          width: 4px;
          height: 25px;

          flex-shrink: 0;

          border-radius: 999px;

          background: linear-gradient(
            180deg,
            #0f766e,
            #14b8a6
          );
        }

        .hr-section-title {
          margin: 0;

          color: var(--text-primary);

          font-size: 1.12rem;
          font-weight: 750;
          letter-spacing: -0.015em;
        }

        .hr-section-caption {
          margin: 0.25rem 0 0;

          color: var(--text-muted);

          font-size: 0.78rem;
          line-height: 1.45;
        }


        /* =====================================================
           CARD GRID
           ===================================================== */

        .hr-card-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(min(100%, 300px), 1fr)
            );

          gap: 1.15rem;
        }


        /* =====================================================
           DASHBOARD CARD
           ===================================================== */

        .hr-dashboard-card {
          position: relative;

          min-width: 0;
          min-height: 210px;

          display: flex;
          flex-direction: column;
          justify-content: space-between;

          gap: 1.35rem;

          padding: 1.35rem;

          border: 1px solid var(--border-color);
          border-radius: 18px;

          background: var(--bg-surface);

          box-shadow:
            0 5px 18px rgba(15, 23, 42, 0.035);

          overflow: hidden;

          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .hr-dashboard-card::before {
          content: "";

          position: absolute;

          left: 0;
          top: 0;

          width: 100%;
          height: 2px;

          background: linear-gradient(
            90deg,
            transparent,
            rgba(20, 184, 166, 0.35),
            transparent
          );

          opacity: 0;

          transition: opacity 0.25s ease;
        }

        .hr-dashboard-card:hover {
          transform: translateY(-4px);

          border-color: rgba(20, 184, 166, 0.24);

          box-shadow:
            0 14px 32px rgba(15, 118, 110, 0.08);
        }

        .hr-dashboard-card:hover::before {
          opacity: 1;
        }

        .dark .hr-dashboard-card {
          box-shadow:
            0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .dark .hr-dashboard-card:hover {
          border-color: rgba(45, 212, 191, 0.20);

          box-shadow:
            0 16px 38px rgba(0, 0, 0, 0.22);
        }


        /* =====================================================
           CARD HEADER
           ===================================================== */

        .hr-card-header {
          display: flex;
          align-items: flex-start;

          gap: 0.9rem;

          min-width: 0;
        }

        .hr-icon-box {
          width: 46px;
          height: 46px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background: rgba(20, 184, 166, 0.09);
          color: #0f766e;

          transition:
            transform 0.25s ease,
            background 0.25s ease;
        }

        .dark .hr-icon-box {
          color: #5eead4;
          background: rgba(20, 184, 166, 0.12);
        }

        .hr-dashboard-card:hover .hr-icon-box {
          transform: scale(1.05);
          background: rgba(20, 184, 166, 0.14);
        }

        .hr-card-heading {
          min-width: 0;
        }

        .hr-card-title {
          margin: 0;

          color: var(--text-primary);

          font-size: 0.98rem;
          line-height: 1.35;
          font-weight: 700;
        }

        .hr-card-description {
          margin: 0.35rem 0 0;

          color: var(--text-muted);

          font-size: 0.77rem;
          line-height: 1.5;
        }


        /* =====================================================
           CARD ACTIONS
           ===================================================== */

        .hr-card-actions {
          display: flex;
          flex-direction: column;

          gap: 0.55rem;
        }

        .hr-action-button {
          width: 100%;

          min-height: 38px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 0.45rem;

          padding: 0.55rem 0.8rem;

          border-radius: 10px;

          text-decoration: none;

          font-size: 0.76rem;
          font-weight: 650;

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .hr-action-button:hover {
          transform: translateY(-1px);
        }


        /* =====================================================
           SECURITY CARD
           ===================================================== */

        .hr-info-box {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 0.7rem;

          padding: 0.7rem 0.85rem;

          border: 1px solid var(--border-color);
          border-radius: 11px;

          background: var(--bg-surface-elevated);
        }

        .hr-info-label {
          color: var(--text-secondary);

          font-size: 0.76rem;
          font-weight: 500;
        }

        .hr-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;

          white-space: nowrap;

          font-size: 0.7rem;
        }


        /* =====================================================
           TABLET
           ===================================================== */

        @media (max-width: 1024px) {
          .hr-welcome-banner {
            padding: 1.6rem 1.5rem;
            gap: 1.5rem;
          }

          .hr-welcome-description {
            font-size: 0.84rem;
          }

          .hr-card-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }


        /* =====================================================
           PHONE / MOBILE
           ===================================================== */

        @media (max-width: 700px) {
          .hr-welcome-banner {
            flex-direction: column;
            align-items: stretch;

            padding: 1.35rem;

            border-radius: 18px;

            gap: 1.2rem;

            margin-bottom: 2rem;
          }

          .hr-welcome-right {
            align-items: flex-start;
          }

          .hr-welcome-title {
            font-size: 1.4rem;
          }

          .hr-welcome-description {
            font-size: 0.8rem;
          }

          .hr-section {
            margin-bottom: 2rem;
          }

          .hr-section-header {
            align-items: flex-start;
            flex-direction: column;
            gap: 0.35rem;
          }

          .hr-section-title {
            font-size: 1rem;
          }

          .hr-section-caption {
            font-size: 0.74rem;
          }

          .hr-card-grid {
            grid-template-columns: 1fr;
            gap: 0.9rem;
          }

          .hr-dashboard-card {
            min-height: 0;
            padding: 1.15rem;
          }
        }


        /* =====================================================
           SMALL PHONE
           ===================================================== */

        @media (max-width: 420px) {
          .hr-welcome-banner {
            padding: 1.1rem;
          }

          .hr-badge-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 0.4rem;
          }

          .hr-welcome-title {
            font-size: 1.28rem;
          }

          .hr-welcome-description {
            font-size: 0.76rem;
          }

          .hr-access-tag {
            width: 100%;
            justify-content: center;
          }

          .hr-card-header {
            gap: 0.7rem;
          }

          .hr-icon-box {
            width: 42px;
            height: 42px;
            border-radius: 11px;
          }

          .hr-card-title {
            font-size: 0.92rem;
          }

          .hr-card-description {
            font-size: 0.73rem;
          }

          .hr-info-box {
            align-items: flex-start;
            flex-direction: column;
          }
        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .hr-dashboard-card,
          .hr-icon-box,
          .hr-action-button {
            transition: none !important;
          }

          .hr-dashboard-card:hover,
          .hr-action-button:hover {
            transform: none !important;
          }
        }
      `}</style>

      <div className="hr-dashboard">

        {/* =====================================================
            WELCOME
            ===================================================== */}

        <section className="hr-welcome-banner">

          <div className="hr-welcome-content">

            <div className="hr-badge-row">
              <span className="hr-suite-badge">
                <Sparkles size={12} />
                HR Administrative Suite
              </span>

              <span className="hr-enterprise-label">
                Enterprise Workspace
              </span>
            </div>

            <h2 className="hr-welcome-title">
              {getGreeting()},{" "}
              <span className="hr-welcome-name">
                {displayName !== "User"
                  ? displayName
                  : "Administrator"}
              </span>
            </h2>

            <p className="hr-welcome-description">
              Manage your workforce, employee operations,
              talent development, projects, approvals, and
              organizational administration from one central
              workspace.
            </p>

          </div>

          <div className="hr-welcome-right">

            <DashboardDateTime />

            <div className="hr-access-tag">
              <span>Access Level:</span>

              <strong className="hr-access-role">
                {user?.role || "HR"} Administrator
              </strong>
            </div>

          </div>

        </section>


        {/* =====================================================
            SECTION 1 — WORKFORCE
            ===================================================== */}

        <section className="hr-section">

          <div className="hr-section-header">

            <div>
              <div className="hr-section-heading">
                <span className="hr-section-marker" />

                <h3 className="hr-section-title">
                  Workforce & Attendance
                </h3>
              </div>

              <p className="hr-section-caption">
                Employee records, attendance, leave requests,
                and workforce administration
              </p>
            </div>

          </div>


          <div className="hr-card-grid">

            {/* Employee Directory */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <Users size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Employee Directory
                  </h4>

                  <p className="hr-card-description">
                    Manage employee profiles, records,
                    credentials, and workforce information.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/employees"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  Manage Employees
                  <ArrowRight size={14} />
                </Link>

                <Link
                  to="/hr/employees/new"
                  className="hrms-btn hrms-btn-secondary hr-action-button"
                >
                  <Plus size={14} />
                  Add Employee
                </Link>

              </div>

            </div>


            {/* Attendance */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <Clock3 size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Attendance Center
                  </h4>

                  <p className="hr-card-description">
                    Monitor employee attendance,
                    working hours, and daily time records.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/attendance"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  View Attendance
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>


            {/* Leave Requests */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <CalendarDays size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Leave Applications
                  </h4>

                  <p className="hr-card-description">
                    Review employee leave requests
                    and manage approval decisions.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/leaves"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  Review Requests
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>


            {/* Leave Types */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <Tags size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Leave Types & Balances
                  </h4>

                  <p className="hr-card-description">
                    Configure leave categories,
                    quotas, and employee allocations.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/leave-types"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  Manage Leave Types
                  <ArrowRight size={14} />
                </Link>

                <Link
                  to="/hr/leave-balances"
                  className="hrms-btn hrms-btn-secondary hr-action-button"
                >
                  Employee Balances
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            SECTION 2 — PROJECTS & PERFORMANCE
            ===================================================== */}

        <section className="hr-section">

          <div className="hr-section-header">

            <div>
              <div className="hr-section-heading">
                <span className="hr-section-marker" />

                <h3 className="hr-section-title">
                  Projects, Performance & Updates
                </h3>
              </div>

              <p className="hr-section-caption">
                Projects, employee performance, company
                communication, and work progress
              </p>
            </div>

          </div>


          <div className="hr-card-grid">

            {/* Projects */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <FolderGit2 size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Project Management
                  </h4>

                  <p className="hr-card-description">
                    Manage projects, team assignments,
                    milestones, and organizational deliverables.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/projects"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  Project Dashboard
                  <ArrowRight size={14} />
                </Link>

                <Link
                  to="/hr/project-roles"
                  className="hrms-btn hrms-btn-secondary hr-action-button"
                >
                  <FolderKanban size={14} />
                  Project Roles
                </Link>

              </div>

            </div>


            {/* Performance */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <Award size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Performance & Goals
                  </h4>

                  <p className="hr-card-description">
                    Manage appraisals, KPIs, employee ratings,
                    and performance goals.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/performance"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  Performance Center
                  <ArrowRight size={14} />
                </Link>

                <Link
                  to="/hr/performance/reviews"
                  className="hrms-btn hrms-btn-secondary hr-action-button"
                >
                  Manage Appraisals
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>


            {/* Announcements */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <Megaphone size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Company Announcements
                  </h4>

                  <p className="hr-card-description">
                    Publish important company news,
                    policies, and organizational updates.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/announcements"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  View Announcements
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>


            {/* Work Reports */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <FileText size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Daily Work Reports
                  </h4>

                  <p className="hr-card-description">
                    Monitor daily submissions,
                    progress updates, and reported blockers.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/work-reports"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  View Work Reports
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            SECTION 3 — GOVERNANCE
            ===================================================== */}

        <section className="hr-section">

          <div className="hr-section-header">

            <div>
              <div className="hr-section-heading">
                <span className="hr-section-marker" />

                <h3 className="hr-section-title">
                  Governance & Accountability
                </h3>
              </div>

              <p className="hr-section-caption">
                Workplace concerns, system activity,
                security, and administrative controls
              </p>
            </div>

          </div>


          <div className="hr-card-grid">

            {/* Complaints */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <AlertCircle size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Workplace Complaints
                  </h4>

                  <p className="hr-card-description">
                    Review employee concerns,
                    manage grievances, and track resolutions.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/complaints"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  Review Complaints
                  <ArrowRight size={14} />
                </Link>

                <Link
                  to="/hr/complaint-categories"
                  className="hrms-btn hrms-btn-secondary hr-action-button"
                >
                  Manage Categories
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>


            {/* Audit Logs */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <ClipboardList size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    System Audit Logs
                  </h4>

                  <p className="hr-card-description">
                    Review authentication activity,
                    system events, and administrative actions.
                  </p>
                </div>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/audit-logs"
                  className="hrms-btn hrms-btn-primary hr-action-button"
                >
                  View Audit Logs
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>


            {/* Security */}

            <div className="hr-dashboard-card">

              <div className="hr-card-header">

                <div className="hr-icon-box">
                  <ShieldCheck size={21} strokeWidth={2.1} />
                </div>

                <div className="hr-card-heading">
                  <h4 className="hr-card-title">
                    Security & Privileges
                  </h4>

                  <p className="hr-card-description">
                    Review administrator access
                    and account authorization status.
                  </p>
                </div>

              </div>

              <div className="hr-info-box">

                <span className="hr-info-label">
                  Current Status
                </span>

                <span className="hrms-badge hrms-badge-success hr-status-badge">
                  <CheckCircle2 size={12} />
                  Active Authorized
                </span>

              </div>

              <div className="hr-card-actions">

                <Link
                  to="/hr/profile"
                  className="hrms-btn hrms-btn-secondary hr-action-button"
                >
                  View HR Profile
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>

          </div>

        </section>

      </div>
    </AppLayout>
  );
}