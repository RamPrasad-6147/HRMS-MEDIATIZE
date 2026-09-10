import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, User, Mail, Phone, Calendar, MapPin, ArrowLeft, Briefcase, Sparkles } from "lucide-react";
import BackToDashboard from "../../shared/components/BackToDashboard";
import AppLayout from "../../shared/components/AppLayout";
import { createEmployee } from "../services/employeeApi";
import { showSuccess, showError } from "../../shared/utils/toast";

export default function CreateEmployee() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    joining_date: "",
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
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address || null,
        joining_date: formData.joining_date || null,
      };

      const res = await createEmployee(payload);
      showSuccess(`Employee ${res.data.employee_code} created successfully! Welcome email sent.`);
      navigate("/hr/employees");
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to create employee.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Register Employee">
      <div className="hrms-page-container" style={{ maxWidth: "860px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/dashboard" role="HR" />

        {/* Page Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Register New Employee</h1>
            <p className="hrms-page-subtitle">
              Provision a new workforce profile and automatically dispatch onboarding credentials
            </p>
          </div>
          <div className="hrms-page-actions">
            <button
              type="button"
              onClick={() => navigate("/hr/employees")}
              className="hrms-btn hrms-btn-secondary"
            >
              <ArrowLeft size={16} /> Back to Directory
            </button>
          </div>
        </div>

        {/* Main Form Card */}
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
                    Employee full legal name and birth date
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
                    placeholder="e.g. John"
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
                    placeholder="e.g. Doe"
                  />
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="hrms-label">
                    Date of Birth
                  </label>
                  <div style={{ position: "relative" }}>
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
            </div>

            <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

            {/* Section 2: Contact Information */}
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
                    Official email and phone number for account access and verification
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
                    placeholder="e.g. john.doe@mediatize.com"
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
                    placeholder="e.g. +91 9876543210"
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
                    placeholder="e.g. Suite 402, Innovate Tower, Cyber City, Bangalore"
                  />
                </div>
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

            {/* Section 3: Joining Date */}
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
                    Employment Timeline
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Official date of joining Mediatize
                  </p>
                </div>
              </div>

              <div style={{ maxWidth: "380px" }}>
                <label htmlFor="joining_date" className="hrms-label">
                  Official Joining Date
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
                onClick={() => navigate("/hr/employees")}
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
                  "Registering Employee..."
                ) : (
                  <>
                    <UserPlus size={16} /> Register Employee Account
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
