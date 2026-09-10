import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import { useAuth } from "../../authentication_service/hooks/useAuth";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../services/notificationApi";
import { showSuccess, showError } from "../../shared/utils/toast";

function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDateTime(dateString);
}

function getNotificationTypeBadge(type) {
  switch (type) {
    case "LEAVE_REQUEST":
    case "LEAVE_APPROVED":
    case "LEAVE_REJECTED":
    case "LEAVE_CANCELLED":
      return { label: "Leave", bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" };
    case "HOLIDAY_ANNOUNCEMENT":
      return { label: "Holiday", bg: "rgba(234, 179, 8, 0.2)", color: "#facc15" };
    case "PERFORMANCE_UPDATE":
      return { label: "Performance", bg: "rgba(168, 85, 247, 0.2)", color: "#c084fc" };
    case "ATTENDANCE_UPDATE":
      return { label: "Attendance", bg: "rgba(34, 197, 94, 0.2)", color: "#4ade80" };
    case "PROJECT_UPDATE":
      return { label: "Project", bg: "rgba(14, 165, 233, 0.2)", color: "#38bdf8" };
    case "TASK_UPDATE":
      return { label: "Task", bg: "rgba(249, 115, 22, 0.2)", color: "#fb923c" };
    default:
      return { label: "General", bg: "rgba(100, 116, 139, 0.2)", color: "#94a3b8" };
  }
}

function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Added only for opening a notification
  const [selectedNotification, setSelectedNotification] = useState(null);

  const limit = 15;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications({
        page,
        limit,
        unread_only: unreadOnly,
      });
      const data = res.data || {};
      const totalItems = data.total || 0;
      const computedPages = data.pages || (limit > 0 ? Math.ceil(totalItems / limit) : 1) || 1;

      setNotifications(data.items || []);
      setTotal(totalItems);
      setPages(computedPages);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to load notifications", err);
      setError("Failed to load notifications.");
      showError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      showSuccess("Notification marked as read.");
      fetchNotifications();
      window.dispatchEvent(new Event("hrms:notification_update"));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      showError("Failed to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      showSuccess("All notifications marked as read.");
      fetchNotifications();
      window.dispatchEvent(new Event("hrms:notification_update"));
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
      showError("Failed to mark all notifications as read.");
    }
  };

  const totalPages = Math.max(1, pages);
  const backTarget = user?.role === "HR" ? "/hr/dashboard" : "/employee/dashboard";

  return (
    <AppLayout title="Notifications Center">
      <div style={styles.container}>
        <BackToDashboard to={backTarget} role={user?.role} />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Notifications Center</h1>
            <p style={styles.subtitle}>View system notifications and real-time activity updates</p>
          </div>

          {unreadCount > 0 && (
            <button
              style={{
                ...styles.markAllBtn,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={16} /> Mark all as read ({unreadCount})
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={styles.tabsRow}>
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(unreadOnly ? {} : styles.activeTab),
              }}
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
            >
              All Notifications ({total})
            </button>

            <button
              style={{
                ...styles.tab,
                ...(unreadOnly ? styles.activeTab : {}),
              }}
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.emptyCard}>Loading notifications...</div>
        ) : error ? (
          <div style={styles.emptyCard}>{error}</div>
        ) : notifications.length === 0 ? (
          <div style={styles.emptyCard}>
            <Bell
              size={40}
              style={{
                marginBottom: "0.5rem",
                color: "var(--text-muted)",
              }}
            />
            <h3
              style={{
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              No notifications found
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                marginTop: "0.25rem",
              }}
            >
              {unreadOnly
                ? "You have no unread notifications."
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {notifications.map((item) => {
              const typeBadge = getNotificationTypeBadge(item.notification_type);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedNotification(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedNotification(item);
                    }
                  }}
                  style={{
                    ...styles.card,
                    backgroundColor: item.is_read
                      ? "var(--bg-surface)"
                      : "var(--bg-surface-elevated)",
                    borderColor: item.is_read
                      ? "var(--border-color)"
                      : "var(--primary-color)",
                    cursor: "pointer",
                  }}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.typeBadgeRow}>
                      <span
                        style={{
                          ...styles.typeBadge,
                          backgroundColor: typeBadge.bg,
                          color: typeBadge.color,
                        }}
                      >
                        {typeBadge.label}
                      </span>

                      {!item.is_read && (
                        <span style={styles.unreadTag}>NEW</span>
                      )}
                    </div>

                    <span style={styles.timeText}>
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>

                  <h3 style={styles.itemTitle}>{item.title}</h3>

                  <p style={styles.itemMessage}>{item.message}</p>

                  <div style={styles.cardFooter}>
                    {!item.is_read ? (
                      <button
                        style={styles.readBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(item.id);
                        }}
                      >
                        Mark as read
                      </button>
                    ) : (
                      <span style={styles.readAtText}>
                        Read {item.read_at ? formatTimeAgo(item.read_at) : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              style={{
                ...styles.pageBtn,
                opacity: page === 1 ? 0.5 : 1,
                cursor: page === 1 ? "not-allowed" : "pointer",
              }}
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            <span style={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>

            <button
              style={{
                ...styles.pageBtn,
                opacity: page === totalPages ? 0.5 : 1,
                cursor: page === totalPages ? "not-allowed" : "pointer",
              }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}

        {/* Notification Details Modal */}
        {selectedNotification && (
          <div
            style={styles.modalOverlay}
            onClick={() => setSelectedNotification(null)}
          >
            <div
              style={styles.notificationModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div style={styles.modalTypeRow}>
                  <span
                    style={{
                      ...styles.typeBadge,
                      backgroundColor: getNotificationTypeBadge(
                        selectedNotification.notification_type
                      ).bg,
                      color: getNotificationTypeBadge(
                        selectedNotification.notification_type
                      ).color,
                    }}
                  >
                    {
                      getNotificationTypeBadge(
                        selectedNotification.notification_type
                      ).label
                    }
                  </span>

                  {!selectedNotification.is_read && (
                    <span style={styles.unreadTag}>NEW</span>
                  )}
                </div>

                <button
                  type="button"
                  style={styles.modalCloseBtn}
                  onClick={() => setSelectedNotification(null)}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>

              <h2 style={styles.modalTitle}>
                {selectedNotification.title}
              </h2>

              <div style={styles.modalTime}>
                {formatDateTime(selectedNotification.created_at)}
              </div>

              <div style={styles.modalMessage}>
                {selectedNotification.message}
              </div>

              <div style={styles.modalFooter}>
                {!selectedNotification.is_read ? (
                  <button
                    type="button"
                    style={styles.readBtn}
                    onClick={() => {
                      handleMarkRead(selectedNotification.id);
                      setSelectedNotification(null);
                    }}
                  >
                    Mark as read
                  </button>
                ) : (
                  <span style={styles.readAtText}>
                    Read{" "}
                    {selectedNotification.read_at
                      ? formatTimeAgo(selectedNotification.read_at)
                      : ""}
                  </span>
                )}

                <button
                  type="button"
                  style={styles.modalCloseAction}
                  onClick={() => setSelectedNotification(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "none",
    minWidth: 0,
    padding: "0 0 2rem 0",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid var(--border-color)",
    flexWrap: "wrap",
    gap: "1rem",
  },

  title: {
    fontSize: "1.875rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
  },

  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },

  markAllBtn: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    fontWeight: "600",
    fontSize: "0.85rem",
    cursor: "pointer",
  },

  tabsRow: {
    marginBottom: "1.5rem",
  },

  tabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.5rem",
  },

  tab: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },

  activeTab: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--primary-color)",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },

  card: {
    border: "1px solid",
    borderRadius: "var(--radius-lg)",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  typeBadgeRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },

  typeBadge: {
    fontSize: "0.75rem",
    fontWeight: "700",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    textTransform: "uppercase",
  },

  unreadTag: {
    backgroundColor: "var(--primary-color)",
    color: "#ffffff",
    fontSize: "0.65rem",
    fontWeight: "700",
    padding: "0.15rem 0.4rem",
    borderRadius: "9999px",
  },

  timeText: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },

  itemTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    margin: "0.25rem 0 0 0",
  },

  itemMessage: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
    margin: 0,
  },

  cardFooter: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "0.5rem",
  },

  readBtn: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--primary-color)",
    border: "1px solid var(--border-color)",
    padding: "0.35rem 0.85rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
  },

  readAtText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontStyle: "italic",
  },

  emptyCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "3rem 1.5rem",
    textAlign: "center",
    color: "var(--text-muted)",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
    marginTop: "2rem",
  },

  pageBtn: {
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
  },

  pageInfo: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },

  /* Added only for notification details popup */
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.25rem",
    boxSizing: "border-box",
  },

  notificationModal: {
    width: "100%",
    maxWidth: "720px",
    maxHeight: "85vh",
    overflowY: "auto",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "0 25px 70px rgba(0, 0, 0, 0.35)",
    padding: "1.5rem",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1.25rem",
  },

  modalTypeRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
  },

  modalCloseBtn: {
    width: "34px",
    height: "34px",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "50%",
    fontSize: "1.35rem",
    lineHeight: 1,
    cursor: "pointer",
  },

  modalTitle: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: "clamp(1.2rem, 2vw, 1.5rem)",
    fontWeight: "700",
    lineHeight: 1.35,
    wordBreak: "break-word",
  },

  modalTime: {
    marginTop: "0.5rem",
    color: "var(--text-muted)",
    fontSize: "0.8rem",
  },

  modalMessage: {
    marginTop: "1.25rem",
    padding: "1rem",
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "0.75rem",
    flexWrap: "wrap",
    marginTop: "1.25rem",
  },

  modalCloseAction: {
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default Notifications;