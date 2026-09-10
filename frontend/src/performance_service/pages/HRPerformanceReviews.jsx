import React, { useState, useEffect, useCallback } from "react";
import {
  Award,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  CheckCircle2,
  Star,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Clock,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import Button from "../../shared/components/Button";
import {
  getAllPerformanceReviews,
  createPerformanceReview,
  updatePerformanceReview,
  completePerformanceReview,
} from "../services/performanceApi";
import { getEmployees } from "../../employee_service/services/employeeApi";
import { showSuccess, showError } from "../../shared/utils/toast";

const DEFAULT_CATEGORIES = [
  "Technical Skills",
  "Work Quality",
  "Task Completion",
  "Problem Solving",
  "Communication",
  "Teamwork",
  "Project Contribution",
  "Initiative",
];

function HRPerformanceReviews() {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [viewingReview, setViewingReview] = useState(null);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formFeedback, setFormFeedback] = useState("");
  const [categoryRatings, setCategoryRatings] = useState(
    DEFAULT_CATEGORIES.map((cat) => ({ category: cat, rating: 3, comments: "" }))
  );
  const [submitting, setSubmitting] = useState(false);

  // Load employees for selector
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await getEmployees({ limit: 100 });
        setEmployees(res.data?.items || []);
      } catch (err) {
        console.error("Failed to load employees list", err);
      }
    }
    loadEmployees();
  }, []);

  // Fetch performance reviews
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        status: selectedStatus || undefined,
        employee_id: selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
      };
      const res = await getAllPerformanceReviews(params);
      setReviews(res.data?.items || []);
      setTotalPages(res.data?.total_pages || 1);
    } catch (err) {
      console.error("Failed to fetch performance reviews", err);
      showError("Unable to load performance reviews.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedEmployeeId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingReview(null);
    setFormEmployeeId(employees[0]?.id || "");
    setFormStartDate("");
    setFormEndDate("");
    setFormFeedback("");
    setCategoryRatings(DEFAULT_CATEGORIES.map((cat) => ({ category: cat, rating: 3, comments: "" })));
    setShowCreateModal(true);
  };

  // Open Edit Modal for Draft Review
  const openEditModal = (review) => {
    setEditingReview(review);
    setFormEmployeeId(review.employee_id);
    setFormStartDate(review.review_start_date);
    setFormEndDate(review.review_end_date);
    setFormFeedback(review.overall_feedback || "");
    
    // Map existing ratings or fill missing categories
    const existingMap = new Map(review.ratings.map((r) => [r.category, r]));
    const mapped = DEFAULT_CATEGORIES.map((cat) => {
      const found = existingMap.get(cat);
      return {
        category: cat,
        rating: found ? found.rating : 3,
        comments: found ? found.comments || "" : "",
      };
    });
    setCategoryRatings(mapped);
    setShowCreateModal(true);
  };

  const handleRatingChange = (idx, rating) => {
    const next = [...categoryRatings];
    next[idx].rating = rating;
    setCategoryRatings(next);
  };

  const handleCommentChange = (idx, comments) => {
    const next = [...categoryRatings];
    next[idx].comments = comments;
    setCategoryRatings(next);
  };

  // Save Review (Draft or Immediate Complete)
  const handleSaveReview = async (shouldComplete = false) => {
    if (!formEmployeeId) {
      showError("Please select an employee.");
      return;
    }
    if (!formStartDate || !formEndDate) {
      showError("Please select review start and end dates.");
      return;
    }
    if (new Date(formStartDate) > new Date(formEndDate)) {
      showError("Review start date must be on or before end date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_id: Number(formEmployeeId),
        review_start_date: formStartDate,
        review_end_date: formEndDate,
        overall_feedback: formFeedback,
        ratings: categoryRatings,
      };

      let savedReview;
      if (editingReview) {
        const res = await updatePerformanceReview(editingReview.id, {
          review_start_date: formStartDate,
          review_end_date: formEndDate,
          overall_feedback: formFeedback,
          ratings: categoryRatings,
        });
        savedReview = res.data;
        showSuccess("Draft performance review updated.");
      } else {
        const res = await createPerformanceReview(payload);
        savedReview = res.data;
        showSuccess("Draft performance review created.");
      }

      // If user clicked "Complete Evaluation"
      if (shouldComplete && savedReview) {
        await completePerformanceReview(savedReview.id);
        showSuccess("Performance evaluation completed successfully!");
      }

      setShowCreateModal(false);
      fetchReviews();
    } catch (err) {
      console.error("Failed to save performance review", err);
      showError(err.response?.data?.detail || "Unable to save performance review.");
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Complete Action from Table
  const handleCompleteReviewDirect = async (reviewId) => {
    try {
      await completePerformanceReview(reviewId);
      showSuccess("Performance review completed successfully!");
      fetchReviews();
    } catch (err) {
      console.error("Failed to complete review", err);
      showError(err.response?.data?.detail || "Unable to complete performance review.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return "hrms-badge hrms-badge-success";
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
              <span className="hrms-badge hrms-badge-primary">Appraisals</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Quarterly & Annual</span>
            </div>
            <h1 className="hrms-page-title">Employee Performance Reviews</h1>
            <p className="hrms-page-subtitle">
              Draft evaluations, score 8 core performance categories, and finalize formal employee appraisals.
            </p>
          </div>

          <div className="hrms-page-actions">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={fetchReviews}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={openCreateModal}
            >
              Create Review
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
              {/* Filter by Status */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="hrms-select"
                style={{ minWidth: "160px" }}
              >
                <option value="">All Review Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>

              {/* Filter by Employee */}
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

        {/* Reviews Container */}
        <div className="hrms-card">
          <div className="hrms-card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <RefreshCw className="hrms-spinner" size={32} style={{ margin: "0 auto 1rem", color: "var(--primary-color)" }} />
                <p style={{ color: "var(--text-secondary)" }}>Loading performance reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
                <Award size={44} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
                  No performance reviews found
                </h3>
                <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                  Try changing your status or employee filter, or start a new appraisal.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop View (>= 768px) */}
                <div className="employee-desktop-table hrms-table-container">
                  <table className="hrms-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Review Period</th>
                        <th>Status</th>
                        <th>Overall Rating</th>
                        <th>Completed Date</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((rev) => (
                        <tr key={rev.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {rev.employee_name}
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {rev.employee_code}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {rev.review_start_date} to {rev.review_end_date}
                          </td>
                          <td>
                            <span className={getStatusBadge(rev.status)}>
                              {rev.status}
                            </span>
                          </td>
                          <td>
                            {rev.overall_rating ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: 700, color: "var(--primary-color)" }}>
                                <Star size={15} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
                                {rev.overall_rating.toFixed(1)} / 5.0
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Draft</span>
                            )}
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            {rev.completed_at ? new Date(rev.completed_at).toLocaleDateString() : "-"}
                          </td>
                          <td>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={Eye}
                                onClick={() => setViewingReview(rev)}
                              >
                                View
                              </Button>

                              {rev.status === "DRAFT" && (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Edit}
                                    onClick={() => openEditModal(rev)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={CheckCircle2}
                                    onClick={() => handleCompleteReviewDirect(rev.id)}
                                  >
                                    Complete
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (< 768px) */}
                <div className="employee-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "0.875rem", padding: "1rem" }}>
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
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
                            {rev.employee_name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {rev.employee_code} &bull; {rev.review_start_date} to {rev.review_end_date}
                          </div>
                        </div>
                        <span className={getStatusBadge(rev.status)}>
                          {rev.status}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)" }}>
                        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Rating Score</span>
                        <div>
                          {rev.overall_rating ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 700, color: "var(--primary-color)" }}>
                              <Star size={14} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
                              {rev.overall_rating.toFixed(1)} / 5.0
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Draft In Progress</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => setViewingReview(rev)}
                        >
                          View
                        </Button>

                        {rev.status === "DRAFT" && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit}
                              onClick={() => openEditModal(rev)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => handleCompleteReviewDirect(rev.id)}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderTop: "1px solid var(--border-color)" }}>
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
            )}
          </div>
        </div>

        {/* MODAL: CREATE / EDIT PERFORMANCE REVIEW */}
        {showCreateModal && (
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
                maxWidth: "768px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
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
                  {editingReview ? "Edit Draft Performance Review" : "Create Performance Review"}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.25rem" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: "1.5rem", spaceY: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1 }}>
                {/* Employee & Date Selection */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label className="hrms-label">Employee *</label>
                    <select
                      disabled={!!editingReview}
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
                    <label className="hrms-label">Start Date *</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="hrms-input"
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div>
                    <label className="hrms-label">End Date *</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="hrms-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* 8 Category Ratings Selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                    Evaluation Category Ratings (1 - 5 Scale)
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {categoryRatings.map((item, idx) => (
                      <div
                        key={item.category}
                        style={{
                          background: "var(--bg-surface-elevated)",
                          padding: "1rem",
                          borderRadius: "10px",
                          border: "1px solid var(--border-color)",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                        }}
                      >
                        <div style={{ flex: "1 1 180px" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            {item.category}
                          </span>
                        </div>

                        {/* 1-5 Rating Button Selector */}
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleRatingChange(idx, score)}
                              style={{
                                width: "36px",
                                height: "36px",
                                fontSize: "0.8125rem",
                                fontWeight: 700,
                                borderRadius: "8px",
                                border: item.rating === score ? "1px solid var(--primary-color)" : "1px solid var(--border-color)",
                                background: item.rating === score ? "var(--primary-color)" : "var(--bg-surface)",
                                color: item.rating === score ? "#ffffff" : "var(--text-primary)",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {score}
                            </button>
                          ))}
                        </div>

                        {/* Optional Comment */}
                        <div style={{ flex: "1 1 200px" }}>
                          <input
                            type="text"
                            placeholder="Comments (optional)"
                            value={item.comments}
                            onChange={(e) => handleCommentChange(idx, e.target.value)}
                            className="hrms-input"
                            style={{ width: "100%", fontSize: "0.8125rem" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Feedback */}
                <div>
                  <label className="hrms-label">Overall HR Feedback & Comments</label>
                  <textarea
                    rows={4}
                    value={formFeedback}
                    onChange={(e) => setFormFeedback(e.target.value)}
                    placeholder="Enter comprehensive evaluation summary and recommendations..."
                    className="hrms-textarea"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  borderTop: "1px solid var(--border-color)",
                  background: "var(--bg-surface-elevated)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => handleSaveReview(false)}
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  disabled={submitting}
                  onClick={() => handleSaveReview(true)}
                  loading={submitting}
                >
                  Save & Complete Evaluation
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: VIEW REVIEW DETAILS */}
        {viewingReview && (
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
                maxWidth: "640px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
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
                <div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    {viewingReview.employee_name} ({viewingReview.employee_code})
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                    Period: {viewingReview.review_start_date} to {viewingReview.review_end_date}
                  </p>
                </div>
                <button
                  onClick={() => setViewingReview(null)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.25rem" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1 }}>
                <div
                  style={{
                    background: "var(--primary-subtle, rgba(99, 102, 241, 0.08))",
                    border: "1px solid var(--border-color)",
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--primary-color)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Overall Rating
                    </span>
                    <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: "0.25rem 0 0" }}>
                      {viewingReview.overall_rating ? `${viewingReview.overall_rating.toFixed(1)} / 5.0` : "Draft (Pending)"}
                    </p>
                  </div>
                  <span className={getStatusBadge(viewingReview.status)}>
                    {viewingReview.status}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
                  {viewingReview.ratings.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        background: "var(--bg-surface-elevated)",
                        padding: "0.85rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {r.category}
                        </span>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--primary-color)" }}>
                          {r.rating} / 5
                        </span>
                      </div>
                      {r.comments && (
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", fontStyle: "italic" }}>
                          "{r.comments}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {viewingReview.overall_feedback && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                      HR Feedback
                    </h4>
                    <div
                      style={{
                        background: "var(--bg-surface-elevated)",
                        padding: "1rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        fontSize: "0.875rem",
                        color: "var(--text-primary)",
                        whiteSpace: "pre-line",
                        lineHeight: 1.5,
                      }}
                    >
                      {viewingReview.overall_feedback}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "1rem 1.5rem",
                  borderTop: "1px solid var(--border-color)",
                  background: "var(--bg-surface-elevated)",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => setViewingReview(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default HRPerformanceReviews;
