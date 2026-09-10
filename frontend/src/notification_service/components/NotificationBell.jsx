import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { getNotifications, getUnreadCount } from "../services/notificationApi";
import NotificationDropdown from "./NotificationDropdown";

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch unread notification count", err);
    }
  }, []);

  const fetchRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ page: 1, limit: 10 });
      setNotifications(res.data.items || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchRecentNotifications();
    fetchUnreadCount();
  }, [fetchRecentNotifications, fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();

    const handleCustomUpdate = () => {
      handleRefresh();
    };

    window.addEventListener("hrms:notification_update", handleCustomUpdate);
    return () => {
      window.removeEventListener("hrms:notification_update", handleCustomUpdate);
    };
  }, [fetchUnreadCount, handleRefresh]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchRecentNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div style={styles.container} ref={containerRef}>
      <button
        style={styles.bellBtn}
        onClick={toggleDropdown}
        aria-label="Notifications"
        title="Notifications"
        className="hrms-btn hrms-btn-ghost hrms-btn-sm"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setIsOpen(false)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    display: "inline-block",
  },
  bellBtn: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    borderRadius: "var(--radius-md)",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    position: "relative",
    transition: "background-color var(--transition-fast)",
  },
  bellIcon: {
    fontSize: "1.1rem",
    lineHeight: 1,
  },
  badge: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    backgroundColor: "var(--danger-color)",
    color: "#ffffff",
    fontSize: "0.65rem",
    fontWeight: "700",
    borderRadius: "9999px",
    minWidth: "18px",
    height: "18px",
    padding: "0 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid var(--bg-surface)",
  },
};

export default NotificationBell;
