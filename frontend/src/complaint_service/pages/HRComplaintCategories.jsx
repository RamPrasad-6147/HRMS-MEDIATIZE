import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit2, ArrowLeft, RefreshCw, X, Check, Power, Tags, FileText } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import Button from "../../shared/components/Button";
import {
  getAllComplaintCategories,
  createComplaintCategory,
  updateComplaintCategory,
  toggleComplaintCategoryStatus,
} from "../services/complaintApi";
import { showSuccess, showError } from "../../shared/utils/toast";

function HRComplaintCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllComplaintCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch complaint categories", err);
      showError("Failed to load complaint categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setNameInput("");
    setDescriptionInput("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setNameInput(cat.name);
    setDescriptionInput(cat.description || "");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!nameInput || !nameInput.trim()) {
      showError("Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await updateComplaintCategory(editingCategory.id, {
          name: nameInput.trim(),
          description: descriptionInput.trim() || undefined,
        });
        showSuccess("Category updated successfully.");
      } else {
        await createComplaintCategory({
          name: nameInput.trim(),
          description: descriptionInput.trim() || undefined,
        });
        showSuccess("New complaint category created.");
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error("Failed to save category", err);
      showError(err.response?.data?.detail || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    const actionText = cat.is_active ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${actionText} category '${cat.name}'?`)) return;

    try {
      await toggleComplaintCategoryStatus(cat.id);
      showSuccess(`Category '${cat.name}' ${cat.is_active ? "deactivated" : "activated"}.`);
      fetchCategories();
    } catch (err) {
      console.error("Failed to toggle category status", err);
      showError(err.response?.data?.detail || "Failed to update category status.");
    }
  };

  return (
    <AppLayout title="HR Complaint Categories Configuration">
      <div className="hrms-page-container">
        <BackToDashboard to="/hr/complaints" role="HR" icon={ArrowLeft} />

        <div className="hrms-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="hrms-badge hrms-badge-primary">Grievance Setup</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Topic Taxonomies</span>
            </div>
            <h1 className="hrms-page-title">Complaint Categories</h1>
            <p className="hrms-page-subtitle">
              Manage workplace grievance categories and toggle availability of reporting topics.
            </p>
          </div>

          <div className="hrms-page-actions">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={fetchCategories}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleOpenCreateModal}
            >
              Add New Category
            </Button>
          </div>
        </div>

        {/* Categories Container */}
        <div className="hrms-card">
          <div className="hrms-card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <RefreshCw className="hrms-spinner" size={32} style={{ margin: "0 auto 1rem", color: "var(--primary-color)" }} />
                <p style={{ color: "var(--text-secondary)" }}>Loading complaint categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
                <Tags size={44} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
                  No Categories Configured
                </h3>
                <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem" }}>
                  Create standard topics like Workplace, Payroll, or Facilities.
                </p>
                <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
                  Create First Category
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop View (>= 768px) */}
                <div className="employee-desktop-table hrms-table-container">
                  <table className="hrms-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong style={{ color: "var(--text-primary)" }}>{c.name}</strong>
                          </td>
                          <td style={{ color: "var(--text-secondary)", maxWidth: "340px" }}>
                            {c.description || <span style={{ opacity: 0.6, fontStyle: "italic" }}>No description</span>}
                          </td>
                          <td>
                            <span className={`hrms-badge ${c.is_active ? "hrms-badge-success" : ""}`}>
                              {c.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            {new Date(c.created_at).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={Edit2}
                                onClick={() => handleOpenEditModal(c)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant={c.is_active ? "outline" : "primary"}
                                size="sm"
                                icon={Power}
                                onClick={() => handleToggleStatus(c)}
                              >
                                {c.is_active ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (< 768px) */}
                <div className="employee-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "0.875rem", padding: "1rem" }}>
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                            {c.description || <span style={{ opacity: 0.6, fontStyle: "italic" }}>No description</span>}
                          </div>
                        </div>
                        <span className={`hrms-badge ${c.is_active ? "hrms-badge-success" : ""}`}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Edit2}
                            onClick={() => handleOpenEditModal(c)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={c.is_active ? "outline" : "primary"}
                            size="sm"
                            icon={Power}
                            onClick={() => handleToggleStatus(c)}
                          >
                            {c.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Create / Edit Category Modal */}
        {isModalOpen && (
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
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "480px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
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
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  {editingCategory ? "Edit Category" : "Add New Complaint Category"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label className="hrms-label">Category Name *</label>
                  <input
                    type="text"
                    className="hrms-input"
                    placeholder="e.g. WORKPLACE, PAYROLL, FACILITIES..."
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label className="hrms-label">Description (Optional)</label>
                  <textarea
                    className="hrms-textarea"
                    rows={3}
                    placeholder="Short explanation of what types of complaints fall under this topic..."
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.75rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submitting}
                  >
                    {editingCategory ? "Save Changes" : "Create Category"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default HRComplaintCategories;
