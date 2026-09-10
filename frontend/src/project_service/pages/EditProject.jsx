import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FolderKanban, Save, ArrowLeft, Loader2, Calendar, Sliders } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getProjectById, updateProject } from "../services/projectApi";
import { showSuccess, showError } from "../../shared/utils/toast";

export default function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    priority: "MEDIUM",
    progress_percentage: 0,
  });
  const [projectCode, setProjectCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const res = await getProjectById(id);
        const p = res.data;
        setProjectCode(p.project_code || "");
        setFormData({
          name: p.name || "",
          description: p.description || "",
          start_date: p.start_date || "",
          end_date: p.end_date || "",
          priority: p.priority || "MEDIUM",
          progress_percentage: p.progress_percentage || 0,
        });
      } catch (err) {
        showError(err.response?.data?.detail || "Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description ? formData.description.trim() : null,
        start_date: formData.start_date,
        end_date: formData.end_date ? formData.end_date : null,
        priority: formData.priority,
        progress_percentage: parseInt(formData.progress_percentage, 10),
      };

      await updateProject(id, payload);
      showSuccess(`Project updated successfully!`);
      navigate(`/hr/projects/${id}`);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to update project.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Edit Project">
        <div className="hrms-page-container" style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center", padding: "5rem 1rem" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <Loader2 size={36} className="hrms-spin" style={{ color: "var(--primary-color)" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
              Retrieving project details...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Edit ${formData.name || "Project"}`}>
      <div className="hrms-page-container" style={{ maxWidth: "860px", margin: "0 auto" }}>
        <BackToDashboard to={`/hr/projects/${id}`} role="HR" />

        {/* Header */}
        <div className="hrms-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <h1 className="hrms-page-title">Edit Project Scope</h1>
              {projectCode && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--primary-light)",
                    color: "var(--primary-color)",
                    border: "1px solid var(--primary-border)",
                  }}
                >
                  {projectCode}
                </span>
              )}
            </div>
            <p className="hrms-page-subtitle">
              Adjust timeline dates, priority weighting, and completion milestone progress
            </p>
          </div>

          <div className="hrms-page-actions">
            <button
              type="button"
              onClick={() => navigate(`/hr/projects/${id}`)}
              className="hrms-btn hrms-btn-secondary"
            >
              <ArrowLeft size={16} /> View Details
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="hrms-card" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            <div>
              <label htmlFor="name" className="hrms-label">
                Project Name <span style={{ color: "var(--danger-color)" }}>*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="hrms-input"
              />
            </div>

            <div>
              <label htmlFor="description" className="hrms-label">
                Scope & Objective Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="hrms-textarea"
              />
            </div>

            <div className="hrms-form-grid-2">
              <div>
                <label htmlFor="start_date" className="hrms-label">
                  Start Date <span style={{ color: "var(--danger-color)" }}>*</span>
                </label>
                <input
                  id="start_date"
                  type="date"
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={handleChange}
                  className="hrms-input"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="hrms-label">
                  Target Completion Date
                </label>
                <input
                  id="end_date"
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="hrms-input"
                />
              </div>
            </div>

            <div className="hrms-form-grid-2">
              <div>
                <label htmlFor="priority" className="hrms-label">
                  Priority Level
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="hrms-select"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label htmlFor="progress_percentage" className="hrms-label">
                  Progress Percentage ({formData.progress_percentage}%)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <input
                    id="progress_percentage"
                    type="range"
                    name="progress_percentage"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={handleChange}
                    style={{ flex: 1, accentColor: "var(--primary-color)" }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="progress_percentage"
                    value={formData.progress_percentage}
                    onChange={handleChange}
                    className="hrms-input"
                    style={{ width: "80px", textAlign: "center", fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>
            </div>

            <div
              className="hrms-modal-footer-actions"
              style={{
                marginTop: "0.5rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <button
                type="button"
                onClick={() => navigate(`/hr/projects/${id}`)}
                className="hrms-btn hrms-btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="hrms-btn hrms-btn-primary"
              >
                {submitting ? (
                  "Saving Changes..."
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
