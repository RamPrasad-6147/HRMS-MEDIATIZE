import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Megaphone,
  Star,
  Clock,
  ClipboardList,
  Bell,
  ArrowRight,
} from "lucide-react";
import { markNotificationAsRead, markAllNotificationsAsRead } from "../services/notificationApi";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
}

function getNotificationIcon(type) {
  switch (type) {
    case "LEAVE_REQUEST":
    case "LEAVE_APPROVED":
    case "LEAVE_REJECTED":
    case "LEAVE_CANCELLED":
      return <CalendarDays size={18} className="text-primary" />;
    case "HOLIDAY_ANNOUNCEMENT":
      return <Megaphone size={18} className="text-warning" />;
    case "PERFORMANCE_UPDATE":
      return <Star size={18} className="text-warning" />;
    case "ATTENDANCE_UPDATE":
      return <Clock size={18} className="text-info" />;
    case "PROJECT_UPDATE":
    case "TASK_UPDATE":
      return <ClipboardList size={18} className="text-primary" />;
    default:
      return <Bell size={18} className="text-primary" />;
  }
}

function NotificationDropdown({ notifications, unreadCount, onClose, onRefresh }) {
  const navigate = useNavigate();

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await markNotificationAsRead(item.id);
        onRefresh();
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    }
    onClose();
    if (
      item.notification_type === "LEAVE_REQUEST" ||
      item.reference_type === "LEAVE"
    ) {
      navigate("/hr/leaves");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      onRefresh();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleViewAll = () => {
    onClose();
    navigate("/notifications");
  };

  return (
    <div style={styles.dropdown} onClick={(e) => e.stopPropagation()}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.title}>Notifications</span>
          {unreadCount > 0 && <span style={styles.badge}>{unreadCount} unread</span>}
        </div>
        {unreadCount > 0 && (
          <button style={styles.markAllBtn} onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="hrms-custom-scrollbar" style={styles.list}>
        {notifications.length === 0 ? (
          <div style={styles.emptyState}>
            <Bell size={28} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
            <p style={styles.emptyText}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.item,
                backgroundColor: item.is_read ? "var(--bg-surface)" : "var(--bg-surface-elevated)",
              }}
              onClick={() => handleItemClick(item)}
            >
              <div style={styles.iconBox}>{getNotificationIcon(item.notification_type)}</div>
              <div style={styles.content}>
                <div style={styles.itemHeader}>
                  <span style={styles.itemTitle}>{item.title}</span>
                  {!item.is_read && <span style={styles.unreadDot} title="Unread" />}
                </div>
                <p style={styles.itemMessage}>{item.message}</p>
                <span style={styles.itemTime}>{formatRelativeTime(item.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.footer}>
        <button style={styles.viewAllBtn} onClick={handleViewAll}>
          <span>View all notifications</span>
          <ArrowRight size={14} style={{ marginLeft: "0.25rem" }} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  dropdown: {
    position: "absolute",
    top: "calc(100% + 0.5rem)",
    right: 0,
    width: "360px",
    maxHeight: "480px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-overlay)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "0.875rem 1rem",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--bg-surface-elevated)",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  badge: {
    backgroundColor: "var(--primary-color)",
    color: "#ffffff",
    fontSize: "0.75rem",
    fontWeight: "600",
    padding: "0.125rem 0.5rem",
    borderRadius: "9999px",
  },
  markAllBtn: {
    background: "none",
    border: "none",
    color: "var(--primary-color)",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
  },
  list: {
    overflowY: "auto",
    maxHeight: "350px",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  emptyState: {
    padding: "2rem 1rem",
    textAlign: "center",
    color: "var(--text-muted)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  emptyText: {
    fontSize: "0.875rem",
    margin: 0,
  },
  item: {
    padding: "0.875rem 1rem",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    gap: "0.75rem",
    cursor: "pointer",
    transition: "background-color var(--transition-fast)",
  },
  iconBox: {
    display: "flex",
    alignItems: "flex-start",
    paddingTop: "0.125rem",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  unreadDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-color)",
  },
  itemMessage: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.3,
  },
  itemTime: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    marginTop: "0.25rem",
  },
  footer: {
    padding: "0.75rem",
    borderTop: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface-elevated)",
    textAlign: "center",
  },
  viewAllBtn: {
    background: "none",
    border: "none",
    color: "var(--primary-color)",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default NotificationDropdown;
