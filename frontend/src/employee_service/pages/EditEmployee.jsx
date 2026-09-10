import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { User, Mail, Phone, Calendar, MapPin, ArrowLeft, Save, Briefcase, ShieldCheck, Loader2 } from "lucide-react";
import { getEmployeeById, updateEmployee } from "../services/employeeApi";
import BackToDashboard from "../../shared/components/BackToDashboard";
import AppLayout from "../../shared/components/AppLayout";
import { showSuccess, showError } from "../../shared/utils/toast";

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    joining_date: "",
    employment_status: "ACTIVE",
  });
  const [employeeCode, setEmployeeCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await getEmployeeById(id);
        const emp = res.data;
        setEmployeeCode(emp.employee_code);
        setFormData({
          first_name: emp.first_name || "",
          last_name: emp.last_name || "",
          email: emp.email || "",
          phone: emp.phone || "",
          date_of_birth: emp.date_of_birth || "",
          address: emp.address || "",
          joining_date: emp.joining_date || "",
          employment_status: emp.employment_status || "ACTIVE",
        });
      } catch (err) {
        showError(err.response?.data?.detail || "Failed to load employee.");
        navigate("/hr/employees");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateEmployee(id, formData);
      showSuccess(`Employee ${employeeCode} updated successfully!`);
      navigate(`/hr/employees/${id}`);
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to update employee.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Edit Employee">
        <div className="hrms-page-container" style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center", padding: "4rem 1rem" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <Loader2 size={36} className="hrms-spin" style={{ color: "var(--primary-color)" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
              Retrieving employee profile details...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Edit ${formData.first_name || "Employee"}`}>
      <div className="hrms-page-container" style={{ maxWidth: "860px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/dashboard" role="HR" />

        {/* Header */}
        <div className="hrms-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <h1 className="hrms-page-title">Edit Employee Profile</h1>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--primary-light)",
                  color: "var(--primary-color)",
                  border: "1px solid var(--primary-border)",
                }}
              >
                {employeeCode}
              </span>
            </div>
            <p className="hrms-page-subtitle">
              Modify account credentials, employment status, and contact records
            </p>
          </div>

          <div className="hrms-page-actions">
            <button
              type="button"
              onClick={() => navigate(`/hr/employees/${id}`)}
              className="hrms-btn hrms-btn-secondary"
            >
              <ArrowLeft size={16} /> View Profile
            </button>
          </div>
        </div>

        {/* Edit Form Card */}
        <div className="hrms-card" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

            {/* Section 1: Personal Details */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--primary-light)",
                    color: "var(--primary-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Personal Details
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Employee legal name and date of birth
                  </p>
                </div>
              </div>

              <div className="hrms-form-grid-2">
                <div>
                  <label htmlFor="first_name" className="hrms-label">
                    First Name <span style={{ color: "var(--danger-color)" }}>*</span>
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    name="first_name"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className="hrms-input"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="hrms-label">
                    Last Name <span style={{ color: "var(--danger-color)" }}>*</span>
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    name="last_name"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className="hrms-input"
                  />
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="hrms-label">
                    Date of Birth
                  </label>
                  <input
                    id="date_of_birth"
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="hrms-input"
                  />
                </div>
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

            {/* Section 2: Contact Details */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(14, 165, 233, 0.12)",
                    color: "var(--info-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mail size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Contact & Communication
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Primary email address, mobile number, and address
                  </p>
                </div>
              </div>

              <div className="hrms-form-grid-2">
                <div>
                  <label htmlFor="email" className="hrms-label">
                    Email Address <span style={{ color: "var(--danger-color)" }}>*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="hrms-input"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="hrms-label">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="hrms-input"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="address" className="hrms-label">
                    Residential Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    className="hrms-textarea"
                  />
                </div>
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

            {/* Section 3: Employment Status & Timeline */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    color: "var(--success-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Employment Status & Timeline
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Official employment standing and hire date
                  </p>
                </div>
              </div>

              <div className="hrms-form-grid-2">
                <div>
                  <label htmlFor="employment_status" className="hrms-label">
                    Employment Status
                  </label>
                  <select
                    id="employment_status"
                    name="employment_status"
                    value={formData.employment_status}
                    onChange={handleChange}
                    className="hrms-select"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ON_NOTICE">ON NOTICE</option>
                    <option value="TERMINATED">TERMINATED</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="joining_date" className="hrms-label">
                    Joining Date
                  </label>
                  <input
                    id="joining_date"
                    type="date"
                    name="joining_date"
                    value={formData.joining_date}
                    onChange={handleChange}
                    className="hrms-input"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
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
                onClick={() => navigate(`/hr/employees/${id}`)}
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
