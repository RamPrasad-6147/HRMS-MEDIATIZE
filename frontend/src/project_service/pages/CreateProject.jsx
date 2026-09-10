import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, FolderKanban, Calendar, AlertCircle, ArrowLeft, Check, Sparkles } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { createProject } from "../services/projectApi";
import { showSuccess, showError } from "../../shared/utils/toast";

export default function CreateProject() {
  const [formData, setFormData] = useState({
    name: "",
    project_code: "",
    description: "",
    start_date: "",
    end_date: "",
    priority: "MEDIUM",
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        ...(formData.project_code && { project_code: formData.project_code.trim() }),
        ...(formData.description && { description: formData.description.trim() }),
        start_date: formData.start_date,
        ...(formData.end_date && { end_date: formData.end_date }),
        priority: formData.priority,
      };

      const res = await createProject(payload);
      showSuccess(`Project '${res.data.name}' (${res.data.project_code}) created successfully!`);
      navigate(`/hr/projects/${res.data.id}`);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Create Project">
      <div className="hrms-page-container" style={{ maxWidth: "860px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/projects/list" role="HR" />

        {/* Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Initiate New Project</h1>
            <p className="hrms-page-subtitle">
              Define project deliverables, expected timeline milestones, and initial priority level
            </p>
          </div>

          <div className="hrms-page-actions">
            <button
              type="button"
              onClick={() => navigate("/hr/projects/list")}
              className="hrms-btn hrms-btn-secondary"
            >
              <ArrowLeft size={16} /> Back to Projects
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="hrms-card" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            <div className="hrms-form-grid-2">
              <div>
                <label htmlFor="name" className="hrms-label">
                  Project Title <span style={{ color: "var(--danger-color)" }}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="hrms-input"
                  placeholder="e.g. Mediatize Cloud Platform"
                />
              </div>

              <div>
                <label htmlFor="project_code" className="hrms-label">
                  Project Code (Optional)
                </label>
                <input
                  id="project_code"
                  type="text"
                  name="project_code"
                  value={formData.project_code}
                  onChange={handleChange}
                  className="hrms-input"
                  placeholder="Auto-assigned if blank (e.g. PRJ001)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="hrms-label">
                Project Scope & Objectives
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="hrms-textarea"
                placeholder="Outline the core deliverables, client specifications, and goals..."
              />
            </div>

            <div className="hrms-form-grid-2">
              <div>
                <label htmlFor="start_date" className="hrms-label">
                  Project Start Date <span style={{ color: "var(--danger-color)" }}>*</span>
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

            <div>
              <label htmlFor="priority" className="hrms-label">
                Initial Priority Level
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="hrms-select"
                style={{ maxWidth: "320px" }}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
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
                onClick={() => navigate("/hr/projects/list")}
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
                  "Initiating Project..."
                ) : (
                  <>
                    <FolderPlus size={16} /> Create Project
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
