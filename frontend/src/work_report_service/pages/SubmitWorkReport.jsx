import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileText, Upload, ArrowLeft, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { showSuccess, showError, showWarning } from "../../shared/utils/toast";
import { getMyAssignedProjects, submitWorkReport } from "../services/workReportApi";

function SubmitWorkReport() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Form State
  const [projectId, setProjectId] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [problemsFaced, setProblemsFaced] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Get formatted today's date for display
  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    async function fetchAssignedProjects() {
      setLoadingProjects(true);
      try {
        const res = await getMyAssignedProjects();
        setProjects(res.data || []);
        if (res.data && res.data.length > 0) {
          setProjectId(String(res.data[0].project_id));
        }
      } catch (err) {
        console.error("Failed to fetch assigned projects", err);
        showError("Failed to load assigned projects.");
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchAssignedProjects();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validate size (5 MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      showWarning("File size exceeds 5 MB limit. Please select a smaller file.");
      e.target.value = "";
      setFile(null);
      return;
    }

    // Validate extension
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    const allowedExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg"];
    if (!ext || !allowedExts.includes(ext)) {
      showWarning("Invalid file type. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG.");
      e.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!projectId) {
      showWarning("Please select a project.");
      return;
    }

    if (!workDescription || !workDescription.trim()) {
      showWarning("Work description cannot be empty or whitespace only.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("work_description", workDescription.trim());
      if (problemsFaced && problemsFaced.trim()) {
        formData.append("problems_faced", problemsFaced.trim());
      }
      if (file) {
        formData.append("document", file);
      }

      await submitWorkReport(formData);
      showSuccess("Work report submitted successfully!");
      navigate("/employee/work-reports");
    } catch (err) {
      console.error("Failed to submit work report", err);
      const errText = err.response?.data?.detail || "Failed to submit work report.";
      showError(errText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Submit Daily Work Report">
      <div style={styles.container}>
        <BackToDashboard to="/employee/dashboard" role="EMPLOYEE" icon={ArrowLeft} />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Submit Daily Work Report</h1>
            <p style={styles.subtitle}>
              Record your daily project contributions, completed tasks, and encountered blockers
            </p>
          </div>

          <Link to="/employee/work-reports" style={{ ...styles.secondaryNavBtn, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
            <FileText size={16} /> My Reports History
          </Link>
        </div>

        {/* Work Report Form Container */}
        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Report Date (Read-Only) */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Report Date (Auto-generated)</label>
              <div style={styles.readOnlyInput}>
                <span style={{ fontWeight: "600", color: "var(--primary-color)" }}>{todayFormatted}</span>
                <span style={styles.readOnlyBadge}>Server Date</span>
              </div>
            </div>

            {/* Project Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Assigned Project <span style={styles.required}>*</span>
              </label>

              {loadingProjects ? (
                <div style={styles.loadingText}>Loading assigned projects...</div>
              ) : projects.length === 0 ? (
                <div style={styles.alertBox}>
                  <AlertCircle size={18} style={{ flexShrink: 0, color: "var(--danger-color)" }} />
                  <span>
                    You currently have no active project assignments. You can only submit work reports for projects assigned to you.
                  </span>
                </div>
              ) : (
                <select
                  style={styles.select}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name} ({p.project_code}) &bull; {p.role_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Work Description */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Work Description <span style={styles.required}>*</span>
              </label>
              <textarea
                style={styles.textarea}
                rows={5}
                placeholder="Describe the specific tasks, code implementations, or progress completed today..."
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                required
              />
              <span style={styles.helpText}>Be clear and detailed about today's contributions.</span>
            </div>

            {/* Problems Faced */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Problems Faced (Optional)</label>
              <textarea
                style={styles.textarea}
                rows={3}
                placeholder="Detail any technical blockers, dependencies, or challenges encountered (leave empty if none)..."
                value={problemsFaced}
                onChange={(e) => setProblemsFaced(e.target.value)}
              />
            </div>

            {/* Document Upload */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Supporting Document (Optional)</label>
              <div style={styles.fileUploadBox}>
                <Upload size={20} style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }} />
                <input
                  type="file"
                  id="work-report-file"
                  style={styles.fileInput}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                />
                <label htmlFor="work-report-file" style={styles.fileLabel}>
                  {file ? file.name : "Choose File (PDF, DOC, DOCX, PNG, JPG...)"}
                </label>
                <span style={styles.fileHelpText}>Max file size: 5 MB</span>
              </div>
            </div>

            {/* Form Actions */}
            <div style={styles.actions}>
              <Link to="/employee/work-reports" style={styles.cancelBtn}>
                Cancel
              </Link>
              <button
                type="submit"
                style={styles.submitBtn}
                disabled={submitting || projects.length === 0}
              >
                {submitting ? (
                  "Submitting Report..."
                ) : (
                  <>
                    <Send size={16} /> Submit Work Report
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

const styles = {
  container: {
    padding: "0 0 2.5rem 0",
  },
  header: {
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },
  secondaryNavBtn: {
    backgroundColor: "var(--bg-surface-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: "600",
    textDecoration: "none",
    cursor: "pointer",
  },
  card: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "1.75rem",
    maxWidth: "800px",
    margin: "0 auto",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  required: {
    color: "var(--danger-color)",
  },
  readOnlyInput: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "0.625rem 0.875rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.9rem",
  },
  readOnlyBadge: {
    fontSize: "0.75rem",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    color: "var(--text-muted)",
    padding: "0.1rem 0.4rem",
    borderRadius: "var(--radius-sm)",
  },
  select: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    padding: "0.625rem 0.875rem",
    fontSize: "0.9rem",
    outline: "none",
  },
  textarea: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    padding: "0.75rem 0.875rem",
    fontSize: "0.9rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  helpText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  alertBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid var(--danger-color)",
    borderRadius: "var(--radius-md)",
    padding: "0.75rem 1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
  },
  fileUploadBox: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    position: "relative",
  },
  fileInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
  fileLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "var(--primary-color)",
    cursor: "pointer",
  },
  fileHelpText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    marginTop: "0.25rem",
  },
  loadingText: {
    fontSize: "0.875rem",
    color: "var(--text-muted)",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "0.75rem",
    marginTop: "0.75rem",
    paddingTop: "1rem",
    borderTop: "1px solid var(--border-color)",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-color)",
    padding: "0.625rem 1.25rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: "600",
    textDecoration: "none",
    cursor: "pointer",
  },
  submitBtn: {
    backgroundColor: "var(--primary-color)",
    color: "var(--text-on-primary)",
    border: "none",
    padding: "0.625rem 1.25rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
  },
};

export default SubmitWorkReport;
