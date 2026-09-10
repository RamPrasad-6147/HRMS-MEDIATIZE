import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Search,
  CheckCircle2,
  Bell,
  Calendar,
  AlertCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Folder,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getEmployeeAnnouncements,
  markAnnouncementAsRead,
} from "../services/announcementApi";
import Button from "../../shared/components/Button";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import AnnouncementDetailModal from "./AnnouncementDetailModal";

const EmployeeAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL, UNREAD, COMPANY, PROJECT
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10, search: search.trim() || undefined };
      if (filter === "UNREAD") params.unread_only = true;
      if (filter === "COMPANY") params.scope = "COMPANY";
      if (filter === "PROJECT") params.scope = "PROJECT";

      const res = await getEmployeeAnnouncements(params);
      setAnnouncements(res.data.items || []);
      setUnreadCount(res.data.unread_count || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load announcements.");
      toast.error("Failed to load announcements feed");
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleOpenDetail = async (announcement) => {
    setSelectedAnnouncement(announcement);

    // If unread, mark as read on demand
    if (!announcement.is_read) {
      try {
        await markAnnouncementAsRead(announcement.id);
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === announcement.id ? { ...a, is_read: true } : a))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // Silent fail or non-blocking
      }
    }
  };

  return (
    <AppLayout title="Announcements">
      <div className="hrms-page-container">
        {/* Back to Dashboard Button */}
        <BackToDashboard role="EMPLOYEE" />

        {/* Page Header */}
        <div className="hrms-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="hrms-badge hrms-badge-primary">Noticeboard</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Official Bulletins</span>
            </div>
            <h1 className="hrms-page-title">Announcements</h1>
            <p className="hrms-page-subtitle">
              Stay informed with official company alerts, holiday schedules, and your project updates.
            </p>
          </div>

          {/* Unread Count Badge */}
          {unreadCount > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 0.9rem",
                borderRadius: "9999px",
                background: "var(--primary-subtle, rgba(99, 102, 241, 0.1))",
                border: "1px solid var(--border-color)",
                color: "var(--primary-color)",
                fontSize: "0.8125rem",
                fontWeight: 600,
              }}
            >
              <Bell size={16} style={{ animation: "pulse 2s infinite" }} />
              <span>{unreadCount} Unread Announcement{unreadCount !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Tabs & Search Container */}
        <div className="hrms-card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              padding: "1rem 1.25rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              width: "100%",
            }}
          >
            {/* Filter Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: 1, minWidth: "260px" }}>
              {[
                { id: "ALL", label: "All Updates" },
                { id: "UNREAD", label: `Unread (${unreadCount})` },
                { id: "COMPANY", label: "Company Wide" },
                { id: "PROJECT", label: "My Projects" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilter(tab.id);
                    setPage(1);
                  }}
                  className={`hrms-btn ${
                    filter === tab.id ? "hrms-btn-primary" : "hrms-btn-secondary"
                  }`}
                  style={{
                    padding: "0.4rem 0.85rem",
                    fontSize: "0.8125rem",
                    borderRadius: "8px",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Refresh */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: "260px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search announcements..."
                  className="hrms-input"
                  style={{ paddingLeft: "2.25rem", width: "100%" }}
                />
              </div>

              <Button
                variant="outline"
                icon={RefreshCw}
                onClick={fetchAnnouncements}
                disabled={loading}
                title="Refresh feed"
              />
            </div>
          </div>
        </div>

        {/* Feed Cards List */}
        {loading ? (
          <div className="hrms-card" style={{ padding: "3rem", textAlign: "center" }}>
            <RefreshCw className="hrms-spinner" size={32} style={{ margin: "0 auto 1rem", color: "var(--primary-color)" }} />
            <p style={{ color: "var(--text-secondary)" }}>Loading announcements feed...</p>
          </div>
        ) : error ? (
          <div
            className="hrms-card"
            style={{
              padding: "1.25rem",
              background: "var(--danger-subtle, rgba(239, 68, 68, 0.1))",
              border: "1px solid var(--danger-color, #ef4444)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              color: "var(--danger-color, #ef4444)",
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="hrms-card" style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <Megaphone size={44} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
              No announcements available
            </h3>
            <p style={{ color: "var(--text-secondary)", margin: "0 auto", maxWidth: "420px" }}>
              {filter === "UNREAD"
                ? "You have caught up with all current announcements!"
                : "No active announcements published for this filter category."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {announcements.map((ann) => {
              const isProject = ann.announcement_scope === "PROJECT";
              const isUrgent = ann.priority === "URGENT";
              const isImportant = ann.priority === "IMPORTANT";

              return (
                <div
                  key={ann.id}
                  onClick={() => handleOpenDetail(ann)}
                  className="hrms-card"
                  style={{
                    padding: "1.25rem 1.5rem",
                    cursor: "pointer",
                    position: "relative",
                    borderLeft: !ann.is_read ? "4px solid var(--primary-color)" : undefined,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  {/* Unread Indicator Pill */}
                  {!ann.is_read && (
                    <span
                      style={{
                        position: "absolute",
                        top: "1.25rem",
                        right: "1.25rem",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "var(--primary-color)",
                      }}
                    />
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {/* Top Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", paddingRight: "1.5rem" }}>
                      {/* Scope Tag */}
                      <span
                        className="hrms-badge"
                        style={{
                          background: isProject ? "rgba(168, 85, 247, 0.12)" : "rgba(59, 130, 246, 0.12)",
                          color: isProject ? "#9333ea" : "#2563eb",
                          border: isProject ? "1px solid rgba(168, 85, 247, 0.25)" : "1px solid rgba(59, 130, 246, 0.25)",
                        }}
                      >
                        {isProject ? `PROJECT • ${ann.project_code || "PRJ"}` : "COMPANY-WIDE"}
                      </span>

                      {/* Priority Badge */}
                      <span
                        className="hrms-badge"
                        style={{
                          background: isUrgent ? "rgba(239, 68, 68, 0.12)" : isImportant ? "rgba(245, 158, 11, 0.12)" : "var(--bg-surface-elevated)",
                          color: isUrgent ? "var(--danger-color, #ef4444)" : isImportant ? "#d97706" : "var(--text-secondary)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        {ann.priority}
                      </span>

                      {/* Type Tag */}
                      <span
                        className="hrms-badge"
                        style={{
                          background: "var(--bg-surface-elevated)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        {ann.announcement_type}
                      </span>
                    </div>

                    {/* Title & Preview */}
                    <div>
                      <h3
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: !ann.is_read ? 700 : 600,
                          color: "var(--text-primary)",
                          margin: "0 0 0.35rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {ann.title}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text-secondary)",
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.5,
                        }}
                      >
                        {ann.content}
                      </p>
                    </div>

                    {/* Footer Meta */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--border-color)",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Calendar size={14} />
                          Published: {ann.published_at ? new Date(ann.published_at).toLocaleDateString() : "Recent"}
                        </span>
                        {ann.creator_name && (
                          <span>By {ann.creator_name}</span>
                        )}
                      </div>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "var(--primary-color)",
                          fontWeight: 600,
                        }}
                      >
                        Read full update <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0" }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        <AnnouncementDetailModal
          isOpen={!!selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
          announcement={selectedAnnouncement}
        />
      </div>
    </AppLayout>
  );
};

export default EmployeeAnnouncements;
