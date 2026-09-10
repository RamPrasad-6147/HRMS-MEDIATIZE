import React, { useState, useEffect, useRef } from "react";
import { Menu, ChevronUp, ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../authentication_service/hooks/useAuth";
import NotificationBell from "../../notification_service/components/NotificationBell";
import ThemeToggle from "./ThemeToggle";
import { Avatar } from "./Badge";

export function getUserDisplayName(user) {
  if (!user) return "User";

  const firstName = user.first_name ? user.first_name.trim() : "";
  const lastName = user.last_name ? user.last_name.trim() : "";

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  if (lastName) {
    return lastName;
  }

  return "User";
}

export default function Header({ pageTitle, onOpenMobileMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [now, setNow] = useState(() => new Date());
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /*
   * Close profile dropdown when clicking outside.
   */
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const dateFull = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const dateShort = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const displayName = getUserDisplayName(user);

  /*
   * =========================================================
   * PROFILE PAGE
   * =========================================================
   */
  const handleProfileClick = () => {
    setProfileOpen(false);

    if (user?.role === "HR") {
      navigate("/hr/profile");
      return;
    }

    if (user?.role === "EMPLOYEE") {
      navigate("/employee/profile");
    }
  };

  /*
   * =========================================================
   * LOGOUT
   * Uses existing AuthProvider logout functionality.
   * =========================================================
   */
  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="hrms-header">
      <div className="hrms-header-left">
        <button
          onClick={onOpenMobileMenu}
          className="hrms-hamburger-btn"
          aria-label="Open navigation menu"
          title="Open Menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <h1 className="hrms-page-title">
          {pageTitle || "Mediatize HRMS"}
        </h1>
      </div>

      <div className="hrms-header-right">
        <ThemeToggle />

        <NotificationBell />

        {/* =====================================================
            DATE & TIME
            ===================================================== */}
        <div
          className="hrms-header-datetime"
          aria-label="Current date and time"
        >
          <span className="hrms-header-date hrms-date-full">
            {dateFull}
          </span>

          <span className="hrms-header-date hrms-date-short">
            {dateShort}
          </span>

          <span
            className="hrms-header-time"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "var(--success-color)",
                boxShadow: "0 0 6px var(--success-color)",
              }}
              title="System Active"
            />

            {timeStr}
          </span>
        </div>

        {/* =====================================================
            USER PROFILE + DROPDOWN
            ===================================================== */}
        <div
          className={`hrms-profile-wrapper ${
            profileOpen ? "profile-open" : ""
          }`}
          ref={profileRef}
        >
          {/* Profile Trigger */}
          <button
            type="button"
            className="hrms-user-profile"
            onClick={() => setProfileOpen((previous) => !previous)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Open user profile menu"
            title="Open Profile Menu"
          >
            <Avatar
              src={user?.profile_photo_url}
              name={displayName}
              size="sm"
            />

            <div className="hrms-user-info">
              <span
                className="hrms-user-name"
                title={displayName}
              >
                {displayName}
              </span>

              <span className="hrms-role-badge">
                {user?.role || "EMPLOYEE"}
              </span>
            </div>

            {profileOpen ? (
              <ChevronUp
                className="hrms-profile-chevron"
                size={16}
                strokeWidth={2}
              />
            ) : (
              <ChevronDown
                className="hrms-profile-chevron"
                size={16}
                strokeWidth={2}
              />
            )}
          </button>

          {/* =================================================
              PROFILE DROPDOWN
              ================================================= */}
          {profileOpen && (
            <div
              className="hrms-profile-dropdown"
              role="menu"
            >
              {/* Profile Information */}
              <button
                type="button"
                className="hrms-profile-summary"
                onClick={handleProfileClick}
                role="menuitem"
              >
                <div className="hrms-profile-dropdown-avatar">
                  <Avatar
                    src={user?.profile_photo_url}
                    name={displayName}
                    size="md"
                  />
                </div>

                <div className="hrms-profile-dropdown-info">
                  <span className="hrms-profile-dropdown-name">
                    {displayName}
                  </span>

                  <span className="hrms-profile-dropdown-email">
                    {user?.email || "No email available"}
                  </span>

                  <span className="hrms-profile-dropdown-role">
                    {user?.role || "EMPLOYEE"}
                  </span>
                </div>
              </button>

              {/* Divider */}
              <div className="hrms-profile-dropdown-divider" />

              {/* Sign Out */}
              <button
                type="button"
                className="hrms-profile-logout"
                onClick={handleLogout}
                role="menuitem"
              >
                <LogOut
                  size={19}
                  strokeWidth={2}
                />

                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}