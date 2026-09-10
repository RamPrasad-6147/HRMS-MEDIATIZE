import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, FileText, Send, Upload } from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { showSuccess, showError, showWarning } from "../../shared/utils/toast";
import { getActiveComplaintCategories, submitComplaint } from "../services/complaintApi";

function SubmitComplaint() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form State
  const [categoryId, setCategoryId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      setLoadingCategories(true);
      try {
        const res = await getActiveComplaintCategories();
        setCategories(res.data || []);
        if (res.data && res.data.length > 0) {
          setCategoryId(String(res.data[0].id));
        }
      } catch (err) {
        console.error("Failed to fetch complaint categories", err);
        showError("Failed to load complaint categories.");
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
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

    if (!categoryId) {
      showWarning("Please select a complaint category.");
      return;
    }

    if (!subject || subject.trim().length < 3) {
      showWarning("Subject must be at least 3 characters long.");
      return;
    }

    if (!description || description.trim().length < 10) {
      showWarning("Description must be at least 10 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("category_id", categoryId);
      formData.append("subject", subject.trim());
      formData.append("description", description.trim());
      formData.append("priority", priority);
      if (file) {
        formData.append("attachment", file);
      }

      await submitComplaint(formData);
      showSuccess("Complaint submitted successfully! HR has been notified.");
      navigate("/employee/complaints");
    } catch (err) {
      console.error("Failed to submit complaint", err);
      const errText = err.response?.data?.detail || "Failed to submit complaint.";
      showError(errText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Submit Workplace Complaint">
      <div style={styles.container}>
        <BackToDashboard to="/employee/dashboard" role="EMPLOYEE" icon={ArrowLeft} />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Submit Workplace Complaint</h1>
            <p style={styles.subtitle}>
              Report workplace grievances, policy violations, facilities issues, or HR inquiries securely
            </p>
          </div>

          <Link to="/employee/complaints" style={{ ...styles.secondaryNavBtn, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
            <FileText size={16} /> My Complaints History
          </Link>
        </div>

        {/* Complaint Form Container */}
        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Category Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Complaint Category <span style={styles.required}>*</span>
              </label>

              {loadingCategories ? (
                <div style={styles.loadingText}>Loading active categories...</div>
              ) : categories.length === 0 ? (
                <div style={styles.alertBox}>
                  <AlertCircle size={18} style={{ flexShrink: 0, color: "var(--danger-color)" }} />
                  <span>
                    No active complaint categories are currently available. Please contact HR administration.
                  </span>
                </div>
              ) : (
                <select
                  style={styles.select}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.description ? `— ${c.description}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Priority Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Priority Level <span style={styles.required}>*</span>
              </label>
              <select
                style={styles.select}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
              >
                <option value="LOW">Low — Non-urgent query or suggestion</option>
                <option value="MEDIUM">Medium — Standard grievance needing attention</option>
                <option value="HIGH">High — Significant issue affecting work</option>
                <option value="URGENT">Urgent — Severe policy violation or immediate blocker</option>
              </select>
              <span style={styles.helpText}>HR may adjust priority based on policy evaluation.</span>
            </div>

            {/* Subject */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Subject / Summary <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                style={styles.input}
                placeholder="Brief summary of the complaint or grievance..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={255}
                required
              />
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Detailed Description <span style={styles.required}>*</span>
              </label>
              <textarea
                style={styles.textarea}
                rows={6}
                placeholder="Provide a detailed, clear description of the issue, dates, individuals involved, and any relevant context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <span style={styles.helpText}>Minimum 10 characters required.</span>
            </div>

            {/* Document Upload */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Supporting Document (Optional)</label>
              <div style={styles.fileUploadBox}>
                <Upload size={20} style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }} />
                <input
                  type="file"
                  id="complaint-file"
                  style={styles.fileInput}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                />
                <label htmlFor="complaint-file" style={styles.fileLabel}>
                  {file ? file.name : "Choose File (PDF, DOC, DOCX, PNG, JPG...)"}
                </label>
                <span style={styles.fileHelpText}>Max file size: 5 MB</span>
              </div>
            </div>

            {/* Form Actions */}
            <div style={styles.actions}>
              <Link to="/employee/complaints" style={styles.cancelBtn}>
                Cancel
              </Link>
              <button
                type="submit"
                style={styles.submitBtn}
                disabled={submitting || categories.length === 0}
              >
                {submitting ? (
                  "Submitting Complaint..."
                ) : (
                  <>
                    <Send size={16} /> Submit Complaint
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
  input: {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    padding: "0.625rem 0.875rem",
    fontSize: "0.9rem",
    outline: "none",
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

export default SubmitComplaint;
