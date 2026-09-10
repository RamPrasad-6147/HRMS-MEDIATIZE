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
  KeyRound,
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "../../authentication_service/hooks/useAuth";

export default function Sidebar({ isCollapsed, onToggleCollapse, onItemClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || "EMPLOYEE";

  const handleLogout = () => {
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
    <aside className={`hrms-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="hrms-sidebar-brand">
        <div className="hrms-brand-left">
          <div className="hrms-brand-logo" title="Mediatize HRMS">
            <span>M</span>
          </div>
          {!isCollapsed && (
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span className="hrms-brand-title">Mediatize</span>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: "600", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Enterprise HRMS
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="hrms-sidebar-toggle-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={16} strokeWidth={2.2} />
          ) : (
            <ChevronLeft size={16} strokeWidth={2.2} />
          )}
        </button>
      </div>

      <nav className="hrms-sidebar-nav hrms-custom-scrollbar">
        {!isCollapsed && <div className="hrms-nav-section-title">Main Menu</div>}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`hrms-nav-item ${isActive ? "active" : ""}`}
              onClick={onItemClick}
              title={isCollapsed ? item.label : undefined}
            >
              <IconComponent className="hrms-nav-icon" size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              {!isCollapsed && <span>{item.label}</span>}
              {!isCollapsed && isActive && (
                <span
                  style={{
                    marginLeft: "auto",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--primary-color)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="hrms-sidebar-footer">
        <button
          type="button"
          onClick={handleLogout}
          className="hrms-logout-btn"
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut size={17} strokeWidth={2} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
