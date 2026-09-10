import React, { useState, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  Edit,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  User,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import Button from "../../shared/components/Button";
import { getAllGoals, createGoal, updateGoal } from "../services/performanceApi";
import { getEmployees } from "../../employee_service/services/employeeApi";
import { showSuccess, showError } from "../../shared/utils/toast";

function HRGoals() {
  const [goals, setGoals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formProgress, setFormProgress] = useState(0);
  const [formStatus, setFormStatus] = useState("NOT_STARTED");
  const [submitting, setSubmitting] = useState(false);

  // Load employees list
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await getEmployees({ limit: 100 });
        setEmployees(res.data?.items || []);
      } catch (err) {
        console.error("Failed to load employees", err);
      }
    }
    loadEmployees();
  }, []);

  // Fetch performance goals
  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        status: selectedStatus || undefined,
        employee_id: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
      };
      const res = await getAllGoals(params);
      setGoals(res.data?.items || []);
      setTotalPages(res.data?.total_pages || 1);
    } catch (err) {
      console.error("Failed to fetch goals", err);
      showError("Unable to load performance goals.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedEmployeeId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormEmployeeId(employees[0]?.id || "");
    setFormTitle("");
    setFormDescription("");
    setFormTargetDate("");
    setFormProgress(0);
    setFormStatus("NOT_STARTED");
    setShowModal(true);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setFormEmployeeId(goal.employee_id);
    setFormTitle(goal.title);
    setFormDescription(goal.description || "");
    setFormTargetDate(goal.target_date);
    setFormProgress(goal.progress_percentage || 0);
    setFormStatus(goal.status);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formEmployeeId) {
      showError("Please select an employee.");
      return;
    }
    if (!formTitle.trim()) {
      showError("Goal title is required.");
      return;
    }
    if (!formTargetDate) {
      showError("Target date is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          title: formTitle,
          description: formDescription,
          target_date: formTargetDate,
          progress_percentage: Number(formProgress),
          status: formStatus,
        });
        showSuccess("Goal updated successfully.");
      } else {
        await createGoal({
          employee_id: Number(formEmployeeId),
          title: formTitle,
          description: formDescription,
          target_date: formTargetDate,
          progress_percentage: Number(formProgress),
          status: formStatus,
        });
        showSuccess("Goal created successfully.");
      }
      setShowModal(false);
      fetchGoals();
    } catch (err) {
      console.error("Failed to save goal", err);
      showError(err.response?.data?.detail || "Unable to save goal.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return "hrms-badge hrms-badge-success";
      case "IN_PROGRESS":
        return "hrms-badge hrms-badge-primary";
      case "CANCELLED":
        return "hrms-badge";
      default:
        return "hrms-badge hrms-badge-warning";
    }
  };

  return (
    <AppLayout>
      <div className="hrms-page-container">
        <BackToDashboard />

        {/* Title Header */}
        <div className="hrms-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="hrms-badge hrms-badge-primary">Objectives</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target Metrics</span>
            </div>
            <h1 className="hrms-page-title">Employee Performance Goals & KPIs</h1>
            <p className="hrms-page-subtitle">
              Assign measurable goals, set target completion dates, and track team objective execution.
            </p>
          </div>

          <div className="hrms-page-actions">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={fetchGoals}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={openCreateModal}
            >
              Create Goal
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="hrms-card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              padding: "1rem 1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="hrms-select"
                style={{ minWidth: "160px" }}
              >
                <option value="">All Goal Statuses</option>
                <option value="NOT_STARTED">NOT STARTED</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  setPage(1);
                }}
                className="hrms-select"
                style={{ minWidth: "200px" }}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Goals List Grid */}
        {loading ? (
          <div className="hrms-card" style={{ padding: "3rem", textAlign: "center" }}>
            <RefreshCw className="hrms-spinner" size={32} style={{ margin: "0 auto 1rem", color: "var(--primary-color)" }} />
            <p style={{ color: "var(--text-secondary)" }}>Loading performance goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="hrms-card" style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
            <Target size={44} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
              No goals found
            </h3>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Try adjusting your filter options or assign a new goal to an employee.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
              gap: "1.25rem",
            }}
          >
            {goals.map((g) => (
              <div
                key={g.id}
                className="hrms-card"
                style={{
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--primary-color)",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {g.employee_name} ({g.employee_code})
                      </span>
                      <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.35 }}>
                        {g.title}
                      </h3>
                    </div>
                    <span className={getStatusBadge(g.status)}>
                      {g.status.replace("_", " ")}
                    </span>
                  </div>

                  {g.description && (
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {g.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                      <span>Completion</span>
                      <span>{g.progress_percentage}%</span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "var(--border-color)", borderRadius: "9999px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${g.progress_percentage}%`,
                          background: "var(--primary-color)",
                          borderRadius: "9999px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--border-color)",
                    fontSize: "0.75rem",
                  }}
                >
                  <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Calendar size={14} />
                    Target: {g.target_date}
                  </span>
                  <button
                    onClick={() => openEditModal(g)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--primary-color)",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <Edit size={14} />
                    Edit Goal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="hrms-card" style={{ marginTop: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Page {page} of {totalPages}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CREATE / EDIT GOAL */}
        {showModal && (
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
                  {editingGoal ? "Edit Performance Goal" : "Create Performance Goal"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label className="hrms-label">Employee *</label>
                  <select
                    disabled={!!editingGoal}
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="hrms-select"
                    style={{ width: "100%" }}
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="hrms-label">Goal Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Complete Leave Management APIs"
                    className="hrms-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label className="hrms-label">Description</label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Details about goal scope and deliverables..."
                    className="hrms-textarea"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="hrms-label">Target Date *</label>
                    <input
                      type="date"
                      required
                      value={formTargetDate}
                      onChange={(e) => setFormTargetDate(e.target.value)}
                      className="hrms-input"
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div>
                    <label className="hrms-label">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="hrms-select"
                      style={{ width: "100%" }}
                    >
                      <option value="NOT_STARTED">NOT STARTED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="hrms-label">Progress Percentage (0 - 100%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formProgress}
                    onChange={(e) => setFormProgress(e.target.value)}
                    className="hrms-input"
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
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submitting}
                  >
                    {editingGoal ? "Update Goal" : "Create Goal"}
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

export default HRGoals;
