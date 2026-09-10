import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Folder,
  Search,
  Filter,
  Eye,
  Edit,
  Send,
  Archive,
  RefreshCw,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
  Building2,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getHRAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
} from "../services/announcementApi";
import Button from "../../shared/components/Button";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import ProjectSearchModal from "./ProjectSearchModal";
import AnnouncementFormModal from "./AnnouncementFormModal";
import AnnouncementDetailModal from "./AnnouncementDetailModal";

const HRAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, COMPANY, PROJECT, DRAFT, PUBLISHED, ARCHIVED
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isProjectSearchOpen, setIsProjectSearchOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10, search: search.trim() || undefined };
      if (activeTab === "COMPANY") params.scope = "COMPANY";
      if (activeTab === "PROJECT") params.scope = "PROJECT";
      if (activeTab === "DRAFT") params.status = "DRAFT";
      if (activeTab === "PUBLISHED") params.status = "PUBLISHED";
      if (activeTab === "ARCHIVED") params.status = "ARCHIVED";

      const res = await getHRAnnouncements(params);
      setAnnouncements(res.data.items || []);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load announcements.");
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleOpenCompanyCreate = () => {
    setSelectedProject(null);
    setEditingAnnouncement(null);
    setIsFormOpen(true);
  };

  const handleProjectSelect = (proj) => {
    setIsProjectSearchOpen(false);
    setSelectedProject(proj);
    setEditingAnnouncement(null);
    setIsFormOpen(true);
  };

  const handleEdit = (announcement) => {
    setSelectedProject(null);
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (payload, announcementId) => {
    setSubmitting(true);
    try {
      if (announcementId) {
        await updateAnnouncement(announcementId, {
          title: payload.title,
          content: payload.content,
          announcement_type: payload.announcement_type,
          priority: payload.priority,
          expires_at: payload.expires_at,
        });
        toast.success("Announcement updated successfully.");
      } else {
        await createAnnouncement(payload);
        toast.success(
          payload.publish_now
            ? "Announcement published successfully!"
            : "Announcement saved as draft."
        );
      }
      setIsFormOpen(false);
      setSelectedProject(null);
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishAnnouncement(id);
      toast.success("Announcement published successfully.");
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to publish announcement.");
    }
  };

  const handleArchive = async (id) => {
    try {
      await archiveAnnouncement(id);
      toast.success("Announcement archived.");
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to archive announcement.");
    }
  };

  return (
    <AppLayout title="Announcements Management">
      <div className="hrms-page-container">
        {/* Back to Dashboard Button */}
        <BackToDashboard role="HR" />

        {/* Page Header */}
        <div className="hrms-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="hrms-badge hrms-badge-primary">Communications</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Broadcast Hub</span>
            </div>
            <h1 className="hrms-page-title">Announcements Management</h1>
            <p className="hrms-page-subtitle">
              Draft, broadcast, and track company-wide memos or project-specific team updates.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="hrms-page-actions">
            <Button
              variant="outline"
              icon={Folder}
              onClick={() => setIsProjectSearchOpen(true)}
            >
              Project Announcement
            </Button>

            <Button
              variant="primary"
              icon={Plus}
              onClick={handleOpenCompanyCreate}
            >
              Company Announcement
            </Button>
          </div>
        </div>

        {/* Filter Pills & Search Bar Container */}
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
            {/* Tabs Filter Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: 1, minWidth: "260px" }}>
              {[
                { id: "ALL", label: "All" },
                { id: "COMPANY", label: "Company Wide" },
                { id: "PROJECT", label: "Project Teams" },
                { id: "DRAFT", label: "Drafts" },
                { id: "PUBLISHED", label: "Published" },
                { id: "ARCHIVED", label: "Archived" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`hrms-btn ${
                    activeTab === tab.id ? "hrms-btn-primary" : "hrms-btn-secondary"
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

        {/* Main List / Table */}
        {loading ? (
          <div className="hrms-card" style={{ padding: "3rem", textAlign: "center" }}>
            <RefreshCw className="hrms-spinner" size={32} style={{ margin: "0 auto 1rem", color: "var(--primary-color)" }} />
            <p style={{ color: "var(--text-secondary)" }}>Loading announcements...</p>
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
              No announcements found
            </h3>
            <p style={{ color: "var(--text-secondary)", margin: "0 auto 1.25rem", maxWidth: "420px" }}>
              {search
                ? "No matching announcements match your search term. Try adjusting filters."
                : "No announcements created under this category filter yet."}
            </p>
            {!search && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={handleOpenCompanyCreate}
              >
                Create Announcement
              </Button>
            )}
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
                  className="hrms-card"
                  style={{
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                    transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  {/* Card Top Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      {/* Scope Badge */}
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

                      {/* Status Badge */}
                      <span
                        className="hrms-badge"
                        style={{
                          background: ann.status === "PUBLISHED" ? "rgba(16, 185, 129, 0.12)" : ann.status === "DRAFT" ? "rgba(14, 165, 233, 0.12)" : "var(--bg-surface-elevated)",
                          color: ann.status === "PUBLISHED" ? "var(--success-color, #10b981)" : ann.status === "DRAFT" ? "#0284c7" : "var(--text-muted)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        {ann.status}
                      </span>
                    </div>

                    {/* Read Count Badge */}
                    {ann.read_count !== null && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--primary-color)",
                          background: "var(--primary-subtle, rgba(99, 102, 241, 0.08))",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "6px",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <Eye size={14} />
                        <span><strong>{ann.read_count}</strong> read{ann.read_count !== 1 ? "s" : ""}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Preview */}
                  <div>
                    <h3
                      onClick={() => setViewingAnnouncement(ann)}
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: "0 0 0.4rem",
                        cursor: "pointer",
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
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {ann.content}
                    </p>
                  </div>

                  {/* Footer Bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid var(--border-color)",
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Calendar size={14} />
                        {ann.published_at ? new Date(ann.published_at).toLocaleDateString() : "Not published"}
                      </span>
                      {ann.expires_at && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--warning-color, #f59e0b)" }}>
                          <Clock size={14} />
                          Expires: {new Date(ann.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingAnnouncement(ann)}
                      >
                        View
                      </Button>

                      {ann.status !== "ARCHIVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Edit}
                          onClick={() => handleEdit(ann)}
                        >
                          Edit
                        </Button>
                      )}

                      {ann.status === "DRAFT" && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Send}
                          onClick={() => handlePublish(ann.id)}
                        >
                          Publish
                        </Button>
                      )}

                      {ann.status !== "ARCHIVED" && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Archive}
                          onClick={() => handleArchive(ann.id)}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
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

        {/* Project Search Modal */}
        <ProjectSearchModal
          isOpen={isProjectSearchOpen}
          onClose={() => setIsProjectSearchOpen(false)}
          onSelectProject={handleProjectSelect}
        />

        {/* Form Modal */}
        <AnnouncementFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedProject(null);
            setEditingAnnouncement(null);
          }}
          onSubmit={handleFormSubmit}
          selectedProject={selectedProject}
          editingAnnouncement={editingAnnouncement}
          loading={submitting}
        />

        {/* Detail Modal */}
        <AnnouncementDetailModal
          isOpen={!!viewingAnnouncement}
          onClose={() => setViewingAnnouncement(null)}
          announcement={viewingAnnouncement}
        />
      </div>
    </AppLayout>
  );
};

export default HRAnnouncements;
