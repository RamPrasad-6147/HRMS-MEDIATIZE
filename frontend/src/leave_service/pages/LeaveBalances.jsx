import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  UserRound,
  CalendarDays,
  Pencil,
  X,
  ChevronDown,
  WalletCards,
  RefreshCw,
  ArrowLeft,
  Calendar,
  User,
  Sliders,
  Check,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { showSuccess, showError } from "../../shared/utils/toast";
import { getEmployeeBalances, updateEmployeeBalance } from "../services/leaveApi";
import { getEmployees } from "../../employee_service/services/employeeApi";

export default function LeaveBalances() {
  const currentYear = new Date().getFullYear();

  // Employee Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Selected Context State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Balances & Loading State
  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Edit Modal State
  const [editingBalance, setEditingBalance] = useState(null);
  const [allocatedDays, setAllocatedDays] = useState("");
  const [usedDays, setUsedDays] = useState("");
  const [pendingDays, setPendingDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const searchRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch employee options for dropdown
  const fetchEmployeeOptions = useCallback(async (query) => {
    setSearchLoading(true);
    try {
      const params = { limit: 12 };
      if (query && query.trim()) {
        params.search = query.trim();
      }
      const res = await getEmployees(params);
      setSearchResults(res.data?.items || []);
    } catch (err) {
      console.error("Failed to search employees:", err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployeeOptions("");
  }, [fetchEmployeeOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (dropdownOpen) {
        fetchEmployeeOptions(searchTerm);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, dropdownOpen, fetchEmployeeOptions]);

  // Fetch balances for selected employee & year
  const fetchBalances = useCallback(async (employeeId, year) => {
    if (!employeeId) return;
    setBalancesLoading(true);
    setHasSearched(true);

    try {
      const res = await getEmployeeBalances(employeeId, { year });
      setBalances(res.data || []);
    } catch (err) {
      console.error("Failed to fetch employee balances", err);
      const errText = err.response?.data?.detail || "Failed to load leave balances.";
      showError(errText);
      setBalances([]);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSearchTerm(`${emp.first_name} ${emp.last_name} (${emp.employee_code})`);
    setDropdownOpen(false);
    fetchBalances(emp.id, selectedYear);
  };

  const handleYearChange = (e) => {
    const newYear = Number(e.target.value);
    setSelectedYear(newYear);
    if (selectedEmployee) {
      fetchBalances(selectedEmployee.id, newYear);
    }
  };

  const openEditModal = (b) => {
    setEditingBalance(b);
    setAllocatedDays(String(b.allocated_days));
    setUsedDays(String(b.used_days));
    setPendingDays(String(b.pending_days));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingBalance || !selectedEmployee) return;

    setSubmitting(true);

    try {
      await updateEmployeeBalance(
        selectedEmployee.id,
        editingBalance.leave_type_id,
        {
          allocated_days: Number(allocatedDays),
          used_days: Number(editingBalance.used_days),
          pending_days: Number(editingBalance.pending_days),
        },
        { year: selectedYear }
      );

      showSuccess("Leave balance updated successfully.");
      setEditingBalance(null);
      fetchBalances(selectedEmployee.id, selectedYear);
    } catch (err) {
      console.error("Failed to update balance", err);
      const errText = err.response?.data?.detail || "Failed to update leave balance.";
      showError(errText);
    } finally {
      setSubmitting(false);
    }
  };

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const calcAllocated = Number(allocatedDays) || 0;
  const calcUsed = Number(editingBalance?.used_days) || 0;
  const calcPending = Number(editingBalance?.pending_days) || 0;
  const calculatedRemaining = Number((calcAllocated - calcUsed - calcPending).toFixed(2));

  return (
    <AppLayout title="Employee Leave Balances">
      <div className="hrms-page-container" style={{ maxWidth: "1140px", margin: "0 auto" }}>
        <BackToDashboard to="/hr/leaves" role="HR" />

        {/* Page Top Header */}
        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">Employee Leave Balance Adjustments</h1>
            <p className="hrms-page-subtitle">
              Select an employee to inspect current year allocations, used days, and adjust quotas
            </p>
          </div>
        </div>

        {/* Search & Year Control Card */}
        <div className="hrms-card" style={{ padding: "1.5rem", marginBottom: "1.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1.25rem", alignItems: "flex-end" }}>

            {/* Employee Search Autocomplete */}
            <div style={{ position: "relative" }} ref={searchRef}>
              <label className="hrms-label">Select Employee</label>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  className="hrms-input"
                  style={{ paddingLeft: "2.35rem", paddingRight: "2rem" }}
                  placeholder="Search name, code, or email..."
                  value={searchTerm}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setDropdownOpen(true);
                  }}
                />
                <ChevronDown
                  size={16}
                  style={{
                    position: "absolute",
                    right: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* Dropdown Results */}
              {dropdownOpen && (
                <div
                  className="hrms-card"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    zIndex: 120,
                    maxHeight: "280px",
                    overflowY: "auto",
                    padding: "0.5rem",
                    boxShadow: "var(--shadow-overlay)",
                  }}
                >
                  {searchLoading ? (
                    <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      Searching employees...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      No matching employee records found
                    </div>
                  ) : (
                    searchResults.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        style={{
                          padding: "0.625rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          cursor: "pointer",
                          backgroundColor: selectedEmployee?.id === emp.id ? "var(--bg-surface-elevated)" : "transparent",
                          transition: "background-color var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-surface-elevated)")}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            selectedEmployee?.id === emp.id ? "var(--bg-surface-elevated)" : "transparent")
                        }
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "var(--radius-full)",
                            backgroundColor: "var(--primary-color)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {emp.first_name?.[0]}
                          {emp.last_name?.[0]}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {emp.employee_code} • {emp.email}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Calendar Year Selector */}
            <div style={{ maxWidth: "200px" }}>
              <label className="hrms-label">Calendar Year</label>
              <select
                className="hrms-select"
                value={selectedYear}
                onChange={handleYearChange}
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            {selectedEmployee && (
              <div>
                <button
                  type="button"
                  onClick={() => fetchBalances(selectedEmployee.id, selectedYear)}
                  className="hrms-btn hrms-btn-secondary"
                  style={{ height: "42px" }}
                >
                  <RefreshCw size={14} className={balancesLoading ? "hrms-spin" : ""} /> Refresh Balances
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Selected Context Card or Empty State */}
        {!selectedEmployee ? (
          <div className="hrms-card" style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
            <WalletCards size={44} style={{ color: "var(--text-muted)", margin: "0 auto 1rem auto" }} />
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              No Employee Selected
            </h3>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
              Please type an employee's name or code in the search bar above to load their quota allocations
            </p>
          </div>
        ) : balancesLoading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading leave quota balances...
          </div>
        ) : balances.length === 0 ? (
          <div className="hrms-card" style={{ padding: "3rem", textAlign: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
              No Leave Balances Assigned
            </h3>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              No quota balances found for {selectedEmployee.first_name} in year {selectedYear}.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "1.25rem" }}>
            {balances.map((b) => {
              const remaining = Number(b.allocated_days - b.used_days - b.pending_days);
              return (
                <div key={b.id || b.leave_type_id} className="hrms-card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {b.leave_type_name}
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Year {b.year} Allocation
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="hrms-btn hrms-btn-secondary hrms-btn-sm"
                    >
                      <Pencil size={13} /> Adjust
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", margin: "1rem 0" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary-color)", fontFamily: "var(--font-mono)" }}>
                      {remaining.toFixed(1)}
                    </span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      days available
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      padding: "0.75rem 1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                      marginTop: "auto",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Allocated</div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{b.allocated_days}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Used</div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{b.used_days}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Pending</div>
                      <div style={{ fontWeight: 700, color: "var(--warning-color)" }}>{b.pending_days}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit / Adjust Balance Modal */}
        {editingBalance && (
          <div className="hrms-modal-backdrop" onClick={() => setEditingBalance(null)}>
            <div className="hrms-modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
              <div className="hrms-modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Adjust Leave Allocation
                  </h3>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {selectedEmployee?.first_name} {selectedEmployee?.last_name} • {editingBalance.leave_type_name}
                  </p>
                </div>
                <button
                  type="button"
                  className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                  onClick={() => setEditingBalance(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="hrms-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div>
                    <label className="hrms-label">
                      Total Annual Allocated Days <span style={{ color: "var(--danger-color)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="hrms-input"
                      value={allocatedDays}
                      onChange={(e) => setAllocatedDays(e.target.value)}
                      required
                    />
                  </div>

                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Already Used:</span>
                      <strong>{editingBalance.used_days} days</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Pending Approval:</span>
                      <strong style={{ color: "var(--warning-color)" }}>{editingBalance.pending_days} days</strong>
                    </div>
                    <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>New Net Remaining:</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 800, color: "var(--primary-color)" }}>
                        {calculatedRemaining} days
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hrms-modal-footer">
                  <button
                    type="button"
                    className="hrms-btn hrms-btn-secondary"
                    onClick={() => setEditingBalance(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="hrms-btn hrms-btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Updating..." : "Save Allocation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
