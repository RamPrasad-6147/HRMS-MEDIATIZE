import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Tags,
  WalletCards,
  ClipboardList,
  Bell,
  UserRound,
  FolderGit2,
  FolderKanban,
  Megaphone,
  FileText,
  AlertCircle,
  Award,
  TrendingUp,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../../authentication_service/hooks/useAuth";

export default function MobileMenu({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || "EMPLOYEE";

  const handleLogout = () => {
    onClose();
    logout();
    navigate("/login");
  };

  const navItems =
    role === "HR"
      ? [
          { label: "Dashboard", path: "/hr/dashboard", icon: LayoutDashboard },
          { label: "HR Profile", path: "/hr/profile", icon: UserRound },
          { label: "Employees", path: "/hr/employees", icon: Users },
          { label: "Performance", path: "/hr/performance", icon: TrendingUp },
          { label: "Projects", path: "/hr/projects", icon: FolderGit2 },
          { label: "Project Roles", path: "/hr/project-roles", icon: FolderKanban },
          { label: "Announcements", path: "/hr/announcements", icon: Megaphone },
          { label: "Work Reports", path: "/hr/work-reports", icon: FileText },
          { label: "Complaints", path: "/hr/complaints", icon: AlertCircle },
          { label: "Attendance", path: "/hr/attendance", icon: CalendarCheck },
          { label: "Leave Requests", path: "/hr/leaves", icon: CalendarDays },
          { label: "Leave Types", path: "/hr/leave-types", icon: Tags },
          { label: "Leave Balances", path: "/hr/leave-balances", icon: WalletCards },
          { label: "Audit Logs", path: "/hr/audit-logs", icon: ClipboardList },
          { label: "Notifications", path: "/notifications", icon: Bell },
        ]
      : [
          { label: "Dashboard", path: "/employee/dashboard", icon: LayoutDashboard },
          { label: "My Profile", path: "/employee/profile", icon: UserRound },
          { label: "My Performance", path: "/employee/performance", icon: Award },
          { label: "My Projects", path: "/employee/projects", icon: FolderGit2 },
          { label: "Announcements", path: "/employee/announcements", icon: Megaphone },
          { label: "Work Reports", path: "/employee/work-reports", icon: FileText },
          { label: "Complaints", path: "/employee/complaints", icon: AlertCircle },
          { label: "Attendance", path: "/employee/attendance", icon: CalendarCheck },
          { label: "Apply for Leave", path: "/employee/leave", icon: CalendarDays },
          { label: "Notifications", path: "/notifications", icon: Bell },
        ];

  return (
    <>
      <div
        className={`hrms-mobile-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`hrms-mobile-drawer ${isOpen ? "open" : ""}`}>
        <div className="hrms-mobile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div className="hrms-brand-logo">M</div>
            <span className="hrms-brand-title">Mediatize HRMS</span>
          </div>
          <button
            onClick={onClose}
            className="hrms-close-drawer-btn"
            aria-label="Close navigation menu"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <nav className="hrms-sidebar-nav">
          <div className="hrms-nav-section-title">Navigation</div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`hrms-nav-item ${isActive ? "active" : ""}`}
                onClick={onClose}
              >
                <IconComponent className="hrms-nav-icon" size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hrms-sidebar-footer">
          <button onClick={handleLogout} className="hrms-logout-btn">
            <LogOut size={18} strokeWidth={2} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
