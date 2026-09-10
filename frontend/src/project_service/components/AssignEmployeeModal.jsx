import React, { useEffect, useState } from "react";
import { UserRound, UserPlus } from "lucide-react";
import { Modal } from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import { getEmployees } from "../../employee_service/services/employeeApi";
import { getProjectRoles, assignEmployee } from "../services/projectApi";
import { showSuccess, showError } from "../../shared/utils/toast";

export default function AssignEmployeeModal({ isOpen, onClose, projectId, onAssignmentSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, roleRes] = await Promise.all([
        getEmployees({ limit: 100, employment_status: "ACTIVE" }),
        getProjectRoles({ active_only: true }),
      ]);
      setEmployees(empRes.data.items || []);
      setRoles(roleRes.data || []);
      if (roleRes.data?.length > 0) {
        setSelectedRoleId(roleRes.data[0].id);
      }
    } catch (err) {
      showError("Failed to load options for employee assignment.");
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployeeObj = employees.find((e) => String(e.id) === String(selectedEmployeeId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      showError("Please select an employee to assign.");
      return;
    }
    if (!selectedRoleId) {
      showError("Please select a project role.");
      return;
    }

    setSubmitting(true);
    try {
      await assignEmployee(projectId, {
        employee_id: parseInt(selectedEmployeeId, 10),
        project_role_id: parseInt(selectedRoleId, 10),
        assigned_date: assignedDate,
      });
      showSuccess("Employee assigned to project successfully!");
      onClose();
      if (onAssignmentSuccess) onAssignmentSuccess();
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to assign employee.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Employee to Project"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Assign Employee
          </Button>
        </>
      }
    >
      {loading ? (
        <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading employees & roles...
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Employee Select */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              Select Active Employee *
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              required
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                padding: "0.625rem 0.875rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                width: "100%",
              }}
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          {/* Project Role Select */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              Project Role *
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              required
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                padding: "0.625rem 0.875rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                width: "100%",
              }}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Date */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              Assigned Date *
            </label>
            <input
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
              required
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                padding: "0.625rem 0.875rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                width: "100%",
              }}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
