import React, { useState, useEffect } from "react";
import { Search, X, Users, Folder, AlertCircle } from "lucide-react";
import { searchProjectsForAnnouncement } from "../services/announcementApi";
import Button from "../../shared/components/Button";

const ProjectSearchModal = ({ isOpen, onClose, onSelectProject }) => {
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects("");
    } else {
      setSearch("");
      setProjects([]);
      setError(null);
    }
  }, [isOpen]);

  const fetchProjects = async (searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchProjectsForAnnouncement({ search: searchTerm });
      setProjects(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to search projects.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearch(term);
    fetchProjects(term);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="hrms-modal"
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "var(--bg-surface)",
          borderRadius: "16px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-search-title"
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "var(--primary-subtle, rgba(99, 102, 241, 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary-color)",
              }}
            >
              <Folder size={20} />
            </div>
            <div>
              <h2 id="project-search-title" style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Select Project for Announcement
              </h2>
              <p style={{ fontSize: "0.75rem", margin: "0.15rem 0 0", color: "var(--text-muted)" }}>
                Broadcast targeted announcement directly to active team members.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.25rem",
              borderRadius: "6px",
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-color)", background: "var(--bg-surface)" }}>
          <div style={{ position: "relative" }}>
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
              onChange={handleSearchChange}
              placeholder="Search by project name or code (e.g. PRJ001)..."
              className="hrms-input"
              style={{ paddingLeft: "2.25rem", paddingRight: search ? "2.25rem" : "1rem", width: "100%" }}
              autoFocus
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  fetchProjects("");
                }}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Project Results List */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 0", gap: "0.5rem" }}>
              <div className="hrms-spinner" style={{ width: "28px", height: "28px", border: "3px solid var(--primary-color)", borderTopColor: "transparent", borderRadius: "50%" }}></div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>Searching projects...</p>
            </div>
          ) : error ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                borderRadius: "8px",
                background: "var(--danger-subtle, rgba(239, 68, 68, 0.1))",
                color: "var(--danger-color, #ef4444)",
                fontSize: "0.875rem",
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
              <Folder size={36} style={{ color: "var(--text-muted)", margin: "0 auto 0.5rem" }} />
              <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 0.25rem" }}>No projects found</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
                Try refining your search keyword or project code.
              </p>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface-elevated)",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        background: "var(--primary-subtle, rgba(99, 102, 241, 0.1))",
                        color: "var(--primary-color)",
                      }}
                    >
                      {proj.project_code}
                    </span>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {proj.name}
                    </h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Users size={14} />
                      <strong>{proj.member_count}</strong> active member{proj.member_count !== 1 ? "s" : ""}
                    </span>
                    <span className="hrms-badge hrms-badge-success" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
                      {proj.status}
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onSelectProject(proj)}
                >
                  Select Project
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-surface-elevated)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSearchModal;
