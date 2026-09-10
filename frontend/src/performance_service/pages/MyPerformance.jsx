import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Target,
  Briefcase,
  FileText,
  Calendar,
  Clock,
  Star,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  CircleDot,
  ClipboardCheck,
  Timer,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import Button from "../../shared/components/Button";
import {
  getMyPerformanceSummary,
  getMyPerformanceReviews,
  getMyGoals,
  updateMyGoalStatus,
} from "../services/performanceApi";
import { showSuccess, showError } from "../../shared/utils/toast";

function MyPerformance() {
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState("overview");

  // Modals
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goalStatusInput, setGoalStatusInput] = useState("IN_PROGRESS");
  const [goalProgressInput, setGoalProgressInput] = useState(0);
  const [updatingGoal, setUpdatingGoal] = useState(false);

  // Pagination for reviews & goals
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);

  // Fetch performance data
  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [sumRes, revRes, goalRes] = await Promise.all([
        getMyPerformanceSummary(),
        getMyPerformanceReviews({ page: reviewPage, limit: 5 }),
        getMyGoals({ page: 1, limit: 10 }),
      ]);

      setSummary(sumRes.data);
      setReviews(revRes.data?.items || []);
      setReviewTotalPages(revRes.data?.total_pages || 1);
      setGoals(goalRes.data?.items || []);
    } catch (err) {
      console.error("Failed to fetch performance data", err);
      showError("Unable to load performance overview.");
    } finally {
      setLoading(false);
    }
  }, [reviewPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Goal Status Update
  const handleUpdateGoalStatus = async (e) => {
    e.preventDefault();

    if (!selectedGoal) return;

    setUpdatingGoal(true);

    try {
      await updateMyGoalStatus(selectedGoal.id, {
        status: goalStatusInput,
        progress_percentage: Number(goalProgressInput),
      });

      showSuccess("Goal status updated successfully.");
      setSelectedGoal(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update goal status", err);
      showError("Unable to update goal status.");
    } finally {
      setUpdatingGoal(false);
    }
  };

  const openGoalModal = (goal) => {
    setSelectedGoal(goal);
    setGoalStatusInput(goal.status);
    setGoalProgressInput(goal.progress_percentage || 0);
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

  /*
   * ============================================================
   * VISUAL DATA
   * These values are derived ONLY from the data already returned
   * by the existing APIs. No backend data is invented.
   * ============================================================
   */

  const performanceTrendData = useMemo(() => {
    if (!reviews.length) return [];

    return [...reviews]
      .filter((review) => review.overall_rating !== null && review.overall_rating !== undefined)
      .reverse()
      .map((review, index) => ({
        name: review.review_start_date
          ? new Date(review.review_start_date).toLocaleDateString(undefined, {
              month: "short",
              year: "2-digit",
            })
          : `Review ${index + 1}`,
        rating: Number(review.overall_rating),
      }));
  }, [reviews]);

  const goalAnalytics = useMemo(() => {
    const total = goals.length;

    const completed = goals.filter(
      (goal) => goal.status === "COMPLETED"
    ).length;

    const inProgress = goals.filter(
      (goal) => goal.status === "IN_PROGRESS"
    ).length;

    const notStarted = goals.filter(
      (goal) => goal.status === "NOT_STARTED"
    ).length;

    const cancelled = goals.filter(
      (goal) => goal.status === "CANCELLED"
    ).length;

    const averageProgress =
      total > 0
        ? Math.round(
            goals.reduce(
              (sum, goal) =>
                sum + Number(goal.progress_percentage || 0),
              0
            ) / total
          )
        : 0;

    return {
      total,
      completed,
      inProgress,
      notStarted,
      cancelled,
      averageProgress,
    };
  }, [goals]);

  const goalStatusChartData = useMemo(() => {
    const data = [];

    if (goalAnalytics.completed > 0) {
      data.push({
        name: "Completed",
        value: goalAnalytics.completed,
        type: "completed",
      });
    }

    if (goalAnalytics.inProgress > 0) {
      data.push({
        name: "In Progress",
        value: goalAnalytics.inProgress,
        type: "inProgress",
      });
    }

    if (goalAnalytics.notStarted > 0) {
      data.push({
        name: "Not Started",
        value: goalAnalytics.notStarted,
        type: "notStarted",
      });
    }

    if (goalAnalytics.cancelled > 0) {
      data.push({
        name: "Cancelled",
        value: goalAnalytics.cancelled,
        type: "cancelled",
      });
    }

    return data;
  }, [goalAnalytics]);

  const goalProgressData = useMemo(() => {
    return goals.slice(0, 6).map((goal) => ({
      name:
        goal.title?.length > 18
          ? `${goal.title.substring(0, 18)}...`
          : goal.title || "Goal",
      progress: Number(goal.progress_percentage || 0),
    }));
  }, [goals]);

  const attendancePercentage = useMemo(() => {
    if (!summary?.attendance?.working_days) return 0;

    return Math.min(
      100,
      Math.max(
        0,
        (Number(summary.attendance.present_days || 0) /
          Number(summary.attendance.working_days)) *
          100
      )
    );
  }, [summary]);

  const projectStatusData = useMemo(() => {
    if (!summary?.projects) return [];

    const data = [];

    if (Number(summary.projects.active || 0) > 0) {
      data.push({
        name: "Active",
        value: Number(summary.projects.active || 0),
        type: "active",
      });
    }

    if (Number(summary.projects.completed || 0) > 0) {
      data.push({
        name: "Completed",
        value: Number(summary.projects.completed || 0),
        type: "completed",
      });
    }

    return data;
  }, [summary]);

  const averageReviewRating = useMemo(() => {
    const ratings = reviews
      .map((review) => Number(review.overall_rating))
      .filter((rating) => Number.isFinite(rating));

    if (!ratings.length) return null;

    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }, [reviews]);

  const latestRating = summary?.latest_rating
    ? Number(summary.latest_rating)
    : null;

  const ratingPercentage = latestRating
    ? Math.min(100, Math.max(0, (latestRating / 5) * 100))
    : 0;

  const getGoalProgressClass = (percentage) => {
    if (percentage >= 80) return "performance-progress-high";
    if (percentage >= 50) return "performance-progress-medium";
    return "performance-progress-low";
  };

  return (
    <AppLayout>
      <div className="hrms-page-container performance-page">
        <style>{`
          .performance-page {
            width: 100%;
            max-width: none;
            min-width: 0;
            padding-bottom: 2.5rem;
            overflow-x: hidden;
          }

          .performance-page *,
          .performance-page *::before,
          .performance-page *::after {
            box-sizing: border-box;
          }

          .performance-hero {
            position: relative;
            overflow: hidden;
            border: 1px solid var(--border-color);
            border-radius: 18px;
            background:
              radial-gradient(
                circle at 88% 18%,
                rgba(16, 185, 129, 0.12),
                transparent 28%
              ),
              var(--bg-surface);
            padding: 1.35rem 1.5rem;
            margin: 1rem 0 1.25rem;
          }

          .performance-hero::after {
            content: "";
            position: absolute;
            width: 180px;
            height: 180px;
            right: -80px;
            bottom: -100px;
            border-radius: 50%;
            border: 1px solid rgba(16, 185, 129, 0.12);
            pointer-events: none;
          }

          .performance-header-row {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
          }

          .performance-kicker {
            display: flex;
            align-items: center;
            gap: 0.55rem;
            margin-bottom: 0.55rem;
            flex-wrap: wrap;
          }

          .performance-kicker-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--primary-color);
            box-shadow: 0 0 0 5px var(--primary-light);
          }

          .performance-title {
            margin: 0;
            color: var(--text-primary);
            font-size: clamp(1.45rem, 2vw, 2rem);
            line-height: 1.2;
            font-weight: 800;
            letter-spacing: -0.03em;
          }

          .performance-subtitle {
            margin: 0.45rem 0 0;
            max-width: 760px;
            color: var(--text-secondary);
            font-size: 0.9rem;
            line-height: 1.6;
          }

          .performance-refresh {
            flex-shrink: 0;
          }

          .performance-refresh svg {
            transition: transform 0.35s ease;
          }

          .performance-refresh:hover svg {
            transform: rotate(180deg);
          }

          .performance-kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 1rem;
            margin-bottom: 1.25rem;
          }

          .performance-kpi {
            position: relative;
            overflow: hidden;
            min-width: 0;
            padding: 1.15rem;
            border: 1px solid var(--border-color);
            border-radius: 16px;
            background: var(--bg-surface);
            transition:
              transform 0.22s ease,
              border-color 0.22s ease,
              box-shadow 0.22s ease;
          }

          .performance-kpi:hover {
            transform: translateY(-3px);
            border-color: var(--primary-border);
            box-shadow: 0 14px 35px rgba(0, 0, 0, 0.08);
          }

          .performance-kpi::after {
            content: "";
            position: absolute;
            width: 90px;
            height: 90px;
            right: -42px;
            top: -45px;
            border-radius: 50%;
            background: var(--primary-light);
            pointer-events: none;
          }

          .performance-kpi-top {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem;
          }

          .performance-kpi-label {
            color: var(--text-secondary);
            font-size: 0.78rem;
            font-weight: 650;
          }

          .performance-kpi-icon {
            width: 36px;
            height: 36px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border-radius: 10px;
            color: var(--primary-color);
            background: var(--primary-light);
          }

          .performance-kpi-value {
            position: relative;
            z-index: 1;
            margin-top: 0.75rem;
            color: var(--text-primary);
            font-size: 1.9rem;
            line-height: 1;
            font-weight: 850;
            letter-spacing: -0.04em;
          }

          .performance-kpi-meta {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            margin-top: 0.65rem;
            color: var(--text-muted);
            font-size: 0.74rem;
            line-height: 1.45;
          }

          .performance-kpi-meta.success {
            color: var(--success-color, #10b981);
          }

          .performance-rating-bar {
            position: relative;
            z-index: 1;
            height: 5px;
            margin-top: 0.8rem;
            overflow: hidden;
            border-radius: 999px;
            background: var(--border-color);
          }

          .performance-rating-fill {
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(
              90deg,
              var(--primary-color),
              var(--primary-hover, #059669)
            );
            transition: width 0.7s ease;
          }

          .performance-tabs {
            display: flex;
            gap: 0.45rem;
            padding: 0.35rem;
            margin-bottom: 1.25rem;
            overflow-x: auto;
            border: 1px solid var(--border-color);
            border-radius: 13px;
            background: var(--bg-surface);
            scrollbar-width: thin;
          }

          .performance-tab {
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.45rem;
            min-height: 38px;
            padding: 0.55rem 0.9rem;
            border: 1px solid transparent;
            border-radius: 9px;
            background: transparent;
            color: var(--text-secondary);
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            transition:
              background 0.2s ease,
              color 0.2s ease,
              transform 0.2s ease;
          }

          .performance-tab:hover {
            color: var(--text-primary);
            background: var(--bg-surface-elevated);
          }

          .performance-tab.active {
            color: #ffffff;
            background: var(--primary-color);
            box-shadow: 0 5px 14px rgba(16, 185, 129, 0.2);
          }

          .performance-section-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
            gap: 1.25rem;
          }

          .performance-section-grid.equal {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .performance-card {
            min-width: 0;
            border: 1px solid var(--border-color);
            border-radius: 16px;
            background: var(--bg-surface);
            overflow: hidden;
          }

          .performance-card-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
            padding: 1.2rem 1.25rem 0;
          }

          .performance-card-heading {
            display: flex;
            align-items: flex-start;
            gap: 0.7rem;
            min-width: 0;
          }

          .performance-card-icon {
            width: 34px;
            height: 34px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border-radius: 9px;
            color: var(--primary-color);
            background: var(--primary-light);
          }

          .performance-card-title {
            margin: 0;
            color: var(--text-primary);
            font-size: 1rem;
            font-weight: 750;
          }

          .performance-card-description {
            margin: 0.3rem 0 0;
            color: var(--text-muted);
            font-size: 0.74rem;
            line-height: 1.45;
          }

          .performance-card-body {
            padding: 1rem 1.25rem 1.25rem;
          }

          .performance-chart {
            width: 100%;
            height: 260px;
            min-width: 0;
          }

          .performance-chart.small {
            height: 215px;
          }

          .performance-chart-empty {
            height: 260px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 0.5rem;
            padding: 1rem;
            text-align: center;
            color: var(--text-muted);
          }

          .performance-chart-empty svg {
            opacity: 0.45;
          }

          .performance-chart-empty strong {
            color: var(--text-secondary);
            font-size: 0.85rem;
          }

          .performance-chart-empty span {
            max-width: 390px;
            font-size: 0.75rem;
            line-height: 1.5;
          }

          .performance-mini-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
          }

          .performance-mini-card {
            min-width: 0;
            padding: 0.95rem;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            background: var(--bg-surface-elevated);
          }

          .performance-mini-label {
            display: block;
            color: var(--text-secondary);
            font-size: 0.73rem;
            font-weight: 650;
          }

          .performance-mini-value {
            margin-top: 0.3rem;
            color: var(--text-primary);
            font-size: 1.35rem;
            font-weight: 800;
          }

          .performance-mini-meta {
            margin-top: 0.2rem;
            color: var(--text-muted);
            font-size: 0.7rem;
          }

          .performance-progress {
            height: 8px;
            margin-top: 0.75rem;
            overflow: hidden;
            border-radius: 999px;
            background: var(--border-color);
          }

          .performance-progress > div {
            height: 100%;
            border-radius: inherit;
            transition: width 0.7s ease;
          }

          .performance-progress-high {
            background: var(--primary-color);
          }

          .performance-progress-medium {
            background: var(--warning-color, #f59e0b);
          }

          .performance-progress-low {
            background: var(--danger-color, #ef4444);
          }

          .performance-attendance-summary {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 13px;
            background: var(--bg-surface-elevated);
          }

          .performance-attendance-ring {
            position: relative;
            width: 76px;
            height: 76px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background:
              conic-gradient(
                var(--primary-color) ${attendancePercentage}%,
                var(--border-color) ${attendancePercentage}% 100%
              );
          }

          .performance-attendance-ring::after {
            content: "";
            position: absolute;
            inset: 8px;
            border-radius: 50%;
            background: var(--bg-surface-elevated);
          }

          .performance-attendance-ring span {
            position: relative;
            z-index: 1;
            color: var(--text-primary);
            font-size: 0.78rem;
            font-weight: 800;
          }

          .performance-context-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
          }

          .performance-context-item {
            padding: 0.85rem;
            border: 1px solid var(--border-color);
            border-radius: 11px;
            background: var(--bg-surface-elevated);
          }

          .performance-context-label {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            color: var(--text-secondary);
            font-size: 0.72rem;
            font-weight: 650;
          }

          .performance-context-value {
            margin-top: 0.35rem;
            color: var(--text-primary);
            font-size: 1.15rem;
            font-weight: 800;
          }

          .performance-goal-list {
            display: flex;
            flex-direction: column;
            gap: 0.7rem;
            margin-top: 0.9rem;
          }

          .performance-goal-item {
            padding: 0.9rem;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            background: var(--bg-surface-elevated);
          }

          .performance-goal-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .performance-goal-name {
            min-width: 0;
            color: var(--text-primary);
            font-size: 0.8rem;
            font-weight: 700;
            line-height: 1.4;
          }

          .performance-goal-percent {
            flex-shrink: 0;
            color: var(--primary-color);
            font-size: 0.78rem;
            font-weight: 800;
          }

          .performance-insights {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.85rem;
          }

          .performance-insight {
            min-width: 0;
            padding: 1rem;
            border-radius: 12px;
            border: 1px solid var(--border-color);
            background: var(--bg-surface-elevated);
          }

          .performance-insight-header {
            display: flex;
            align-items: center;
            gap: 0.45rem;
            color: var(--text-primary);
            font-size: 0.8rem;
            font-weight: 750;
          }

          .performance-insight p {
            margin: 0.55rem 0 0;
            color: var(--text-secondary);
            font-size: 0.75rem;
            line-height: 1.55;
          }

          .performance-table-wrap {
            width: 100%;
            overflow-x: auto;
          }

          .performance-table-wrap .hrms-table {
            min-width: 720px;
          }

          .performance-mobile-cards {
            display: none;
          }

          .performance-review-card {
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            background: var(--bg-surface-elevated);
          }

          .performance-review-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.75rem;
          }

          .performance-review-period {
            color: var(--text-primary);
            font-size: 0.84rem;
            font-weight: 750;
          }

          .performance-review-date {
            margin-top: 0.25rem;
            color: var(--text-muted);
            font-size: 0.7rem;
          }

          .performance-review-rating {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            color: var(--primary-color);
            font-size: 0.82rem;
            font-weight: 800;
          }

          .performance-goals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
            gap: 1rem;
          }

          .performance-goal-detail {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-width: 0;
            padding: 1.15rem;
            border: 1px solid var(--border-color);
            border-radius: 15px;
            background: var(--bg-surface);
            transition:
              transform 0.2s ease,
              border-color 0.2s ease,
              box-shadow 0.2s ease;
          }

          .performance-goal-detail:hover {
            transform: translateY(-2px);
            border-color: var(--primary-border);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.07);
          }

          .performance-goal-detail-title {
            min-width: 0;
            margin: 0;
            color: var(--text-primary);
            font-size: 0.95rem;
            font-weight: 750;
            line-height: 1.4;
          }

          .performance-goal-detail-description {
            margin: 0.5rem 0 0;
            color: var(--text-secondary);
            font-size: 0.74rem;
            line-height: 1.5;
          }

          .performance-goal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding-top: 0.8rem;
            margin-top: 0.9rem;
            border-top: 1px solid var(--border-color);
          }

          .performance-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 1050;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: rgba(0, 0, 0, 0.68);
            backdrop-filter: blur(7px);
          }

          .performance-modal {
            width: 100%;
            max-width: 680px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid var(--border-color);
            border-radius: 18px;
            background: var(--bg-surface);
            box-shadow: 0 28px 70px rgba(0, 0, 0, 0.35);
          }

          .performance-modal.small {
            max-width: 440px;
          }

          .performance-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 1.1rem 1.3rem;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-surface-elevated);
          }

          .performance-modal-header h3 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1rem;
            font-weight: 750;
          }

          .performance-modal-header p {
            margin: 0.25rem 0 0;
            color: var(--text-muted);
            font-size: 0.7rem;
          }

          .performance-modal-close {
            width: 34px;
            height: 34px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border: 1px solid var(--border-color);
            border-radius: 9px;
            background: transparent;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .performance-modal-close:hover {
            color: var(--text-primary);
            background: var(--bg-surface);
            transform: rotate(4deg);
          }

          .performance-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 1.25rem;
          }

          .performance-rating-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 1rem 1.1rem;
            border: 1px solid var(--primary-border);
            border-radius: 13px;
            background: var(--primary-light);
          }

          .performance-rating-banner-label {
            color: var(--primary-color);
            font-size: 0.68rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .performance-rating-banner-value {
            margin: 0.25rem 0 0;
            color: var(--text-primary);
            font-size: 1.5rem;
            font-weight: 850;
          }

          .performance-category-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 0.7rem;
          }

          .performance-category {
            padding: 0.85rem;
            border: 1px solid var(--border-color);
            border-radius: 11px;
            background: var(--bg-surface-elevated);
          }

          .performance-category-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
          }

          .performance-category-name {
            color: var(--text-primary);
            font-size: 0.78rem;
            font-weight: 650;
          }

          .performance-category-score {
            color: var(--primary-color);
            font-size: 0.78rem;
            font-weight: 800;
          }

          .performance-feedback {
            padding: 0.95rem;
            border: 1px solid var(--border-color);
            border-radius: 11px;
            background: var(--bg-surface-elevated);
            color: var(--text-primary);
            font-size: 0.8rem;
            line-height: 1.6;
            white-space: pre-line;
          }

          .performance-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.65rem;
            padding: 0.9rem 1.25rem;
            border-top: 1px solid var(--border-color);
            background: var(--bg-surface-elevated);
          }

          .performance-loading {
            min-height: 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.65rem;
            color: var(--text-secondary);
          }

          .performance-empty {
            min-height: 260px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            text-align: center;
          }

          .performance-empty-icon {
            width: 56px;
            height: 56px;
            display: grid;
            place-items: center;
            margin-bottom: 0.8rem;
            border-radius: 15px;
            color: var(--text-muted);
            background: var(--bg-surface-elevated);
          }

          .performance-empty h3 {
            margin: 0 0 0.4rem;
            color: var(--text-primary);
            font-size: 1rem;
            font-weight: 700;
          }

          .performance-empty p {
            max-width: 460px;
            margin: 0;
            color: var(--text-secondary);
            font-size: 0.76rem;
            line-height: 1.55;
          }

          .performance-donut-wrap {
            position: relative;
            width: 100%;
            height: 215px;
          }

          .performance-donut-center {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            pointer-events: none;
          }

          .performance-donut-center strong {
            color: var(--text-primary);
            font-size: 1.5rem;
            font-weight: 850;
          }

          .performance-donut-center span {
            color: var(--text-muted);
            font-size: 0.68rem;
          }

          .performance-legend {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: -0.35rem;
          }

          .performance-legend-item {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            color: var(--text-secondary);
            font-size: 0.68rem;
          }

          .performance-legend-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--primary-color);
          }

          @media (max-width: 1200px) {
            .performance-kpi-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .performance-section-grid {
              grid-template-columns: minmax(0, 1fr);
            }

            .performance-section-grid.equal {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 800px) {
            .performance-header-row {
              flex-direction: column;
            }

            .performance-refresh {
              align-self: flex-start;
            }

            .performance-section-grid.equal {
              grid-template-columns: minmax(0, 1fr);
            }

            .performance-insights {
              grid-template-columns: minmax(0, 1fr);
            }

            .performance-desktop-table {
              display: none;
            }

            .performance-mobile-cards {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
              padding: 1rem;
            }
          }

          @media (max-width: 600px) {
            .performance-page {
              padding-bottom: 1.5rem;
            }

            .performance-hero {
              padding: 1rem;
              border-radius: 14px;
            }

            .performance-kpi-grid {
              grid-template-columns: minmax(0, 1fr);
            }

            .performance-kpi {
              padding: 1rem;
            }

            .performance-tabs {
              margin-left: -0.1rem;
              margin-right: -0.1rem;
            }

            .performance-card-header {
              padding: 1rem 1rem 0;
            }

            .performance-card-body {
              padding: 0.85rem 1rem 1rem;
            }

            .performance-chart {
              height: 230px;
            }

            .performance-chart-empty {
              height: 230px;
            }

            .performance-mini-grid,
            .performance-context-grid {
              grid-template-columns: minmax(0, 1fr);
            }

            .performance-modal-overlay {
              padding: 0.55rem;
            }

            .performance-modal {
              max-height: 94vh;
              border-radius: 15px;
            }

            .performance-modal-body {
              padding: 1rem;
            }

            .performance-rating-banner {
              align-items: flex-start;
              flex-direction: column;
            }

            .performance-goal-footer {
              align-items: flex-start;
              flex-direction: column;
            }
          }

          @media (max-width: 380px) {
            .performance-title {
              font-size: 1.3rem;
            }

            .performance-kpi-value {
              font-size: 1.65rem;
            }

            .performance-tab {
              padding-left: 0.7rem;
              padding-right: 0.7rem;
              font-size: 0.73rem;
            }

            .performance-card-title {
              font-size: 0.92rem;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .performance-page *,
            .performance-page *::before,
            .performance-page *::after {
              scroll-behavior: auto !important;
              transition-duration: 0.01ms !important;
              animation-duration: 0.01ms !important;
            }
          }
        `}</style>

        <BackToDashboard role="EMPLOYEE" />

        {/* ============================================================
            HEADER
        ============================================================ */}
        <div className="performance-hero">
          <div className="performance-header-row">
            <div>
              <div className="performance-kicker">
                <span className="performance-kicker-dot" />
                <span className="hrms-badge hrms-badge-primary">
                  Growth
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  My Appraisals & KPIs
                </span>
              </div>

              <h1 className="performance-title">
                My Performance & Analytics
              </h1>

              <p className="performance-subtitle">
                Review your appraisal scorecards, assigned targets, and
                operational milestones.
              </p>
            </div>

            <div className="performance-refresh">
              <Button
                variant="outline"
                icon={RefreshCw}
                onClick={fetchData}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* ============================================================
            SUMMARY KPI CARDS
        ============================================================ */}
        {summary && (
          <div className="performance-kpi-grid">
            {/* Latest Rating */}
            <div className="performance-kpi">
              <div className="performance-kpi-top">
                <span className="performance-kpi-label">
                  Latest HR Rating
                </span>

                <div className="performance-kpi-icon">
                  <Star size={18} />
                </div>
              </div>

              <div className="performance-kpi-value">
                {summary.latest_rating
                  ? summary.latest_rating.toFixed(1)
                  : "N/A"}
                {summary.latest_rating && (
                  <span
                    style={{
                      marginLeft: "0.25rem",
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    / 5.0
                  </span>
                )}
              </div>

              <div className="performance-kpi-meta">
                <ClipboardCheck size={13} />
                {summary.completed_reviews_count} completed HR evaluation(s)
              </div>

              {summary.latest_rating && (
                <div className="performance-rating-bar">
                  <div
                    className="performance-rating-fill"
                    style={{ width: `${ratingPercentage}%` }}
                  />
                </div>
              )}
            </div>

            {/* Goals */}
            <div className="performance-kpi">
              <div className="performance-kpi-top">
                <span className="performance-kpi-label">
                  Active Goals
                </span>

                <div className="performance-kpi-icon">
                  <Target size={18} />
                </div>
              </div>

              <div className="performance-kpi-value">
                {summary.active_goals_count}
              </div>

              <div className="performance-kpi-meta success">
                <CheckCircle2 size={13} />
                {summary.completed_goals_count} goals completed
              </div>
            </div>

            {/* Projects */}
            <div className="performance-kpi">
              <div className="performance-kpi-top">
                <span className="performance-kpi-label">
                  Assigned Projects
                </span>

                <div className="performance-kpi-icon">
                  <Briefcase size={18} />
                </div>
              </div>

              <div className="performance-kpi-value">
                {summary.projects.assigned}
              </div>

              <div className="performance-kpi-meta">
                <Activity size={13} />
                {summary.projects.active} active ·{" "}
                {summary.projects.completed} completed
              </div>
            </div>

            {/* Work Reports */}
            <div className="performance-kpi">
              <div className="performance-kpi-top">
                <span className="performance-kpi-label">
                  Work Reports
                </span>

                <div className="performance-kpi-icon">
                  <FileText size={18} />
                </div>
              </div>

              <div className="performance-kpi-value">
                {summary.work_reports.submitted}
              </div>

              <div className="performance-kpi-meta">
                <FileText size={13} />
                {summary.work_reports.submitted_this_month} submitted this
                month
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            NAVIGATION TABS
        ============================================================ */}
        <div className="performance-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`performance-tab ${
              activeTab === "overview" ? "active" : ""
            }`}
          >
            <BarChart3 size={15} />
            Overview & Context
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`performance-tab ${
              activeTab === "reviews" ? "active" : ""
            }`}
          >
            <Award size={15} />
            Performance Reviews ({reviews.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("goals")}
            className={`performance-tab ${
              activeTab === "goals" ? "active" : ""
            }`}
          >
            <Target size={15} />
            Goals & KPIs ({goals.length})
          </button>
        </div>

        {/* ============================================================
            TAB 1 — OVERVIEW
        ============================================================ */}
        {activeTab === "overview" && summary && (
          <>
            {/* Performance Trend + Goal Overview */}
            <div className="performance-section-grid">
              {/* Performance Trend */}
              <div className="performance-card">
                <div className="performance-card-header">
                  <div className="performance-card-heading">
                    <div className="performance-card-icon">
                      <TrendingUp size={17} />
                    </div>

                    <div>
                      <h2 className="performance-card-title">
                        Performance Trend
                      </h2>

                      <p className="performance-card-description">
                        Historical HR review ratings available from your
                        existing performance records.
                      </p>
                    </div>
                  </div>

                  {averageReviewRating !== null && (
                    <div
                      style={{
                        flexShrink: 0,
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          color: "var(--text-primary)",
                          fontSize: "1rem",
                          fontWeight: 800,
                        }}
                      >
                        {averageReviewRating.toFixed(1)}
                      </div>

                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.65rem",
                        }}
                      >
                        Avg. visible rating
                      </div>
                    </div>
                  )}
                </div>

                <div className="performance-card-body">
                  {performanceTrendData.length >= 2 ? (
                    <div className="performance-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={performanceTrendData}
                          margin={{
                            top: 10,
                            right: 12,
                            left: -18,
                            bottom: 4,
                          }}
                        >
                          <CartesianGrid
                            stroke="var(--border-color)"
                            strokeDasharray="3 3"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="name"
                            tick={{
                              fill: "var(--text-muted)",
                              fontSize: 11,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            domain={[0, 5]}
                            tick={{
                              fill: "var(--text-muted)",
                              fontSize: 10,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            contentStyle={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              color: "var(--text-primary)",
                              fontSize: "0.75rem",
                              boxShadow:
                                "0 10px 30px rgba(0,0,0,.15)",
                            }}
                            formatter={(value) => [
                              `${Number(value).toFixed(1)} / 5`,
                              "Rating",
                            ]}
                          />

                          <Line
                            type="monotone"
                            dataKey="rating"
                            stroke="var(--primary-color)"
                            strokeWidth={3}
                            dot={{
                              r: 4,
                              fill: "var(--primary-color)",
                              stroke: "var(--bg-surface)",
                              strokeWidth: 2,
                            }}
                            activeDot={{
                              r: 6,
                            }}
                            animationDuration={700}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="performance-chart-empty">
                      <div className="performance-empty-icon">
                        <TrendingUp size={25} />
                      </div>

                      <strong>
                        Performance history will appear here
                      </strong>

                      <span>
                        Additional completed performance reviews are needed
                        to display a meaningful performance trend.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Goal Overview */}
              <div className="performance-card">
                <div className="performance-card-header">
                  <div className="performance-card-heading">
                    <div className="performance-card-icon">
                      <Target size={17} />
                    </div>

                    <div>
                      <h2 className="performance-card-title">
                        Goals Progress
                      </h2>

                      <p className="performance-card-description">
                        Current goal status and progress based on your
                        assigned goals.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="performance-card-body">
                  {goals.length > 0 ? (
                    <>
                      <div className="performance-mini-grid">
                        <div className="performance-mini-card">
                          <span className="performance-mini-label">
                            Total Goals
                          </span>
                          <div className="performance-mini-value">
                            {goalAnalytics.total}
                          </div>
                        </div>

                        <div className="performance-mini-card">
                          <span className="performance-mini-label">
                            Avg. Progress
                          </span>
                          <div className="performance-mini-value">
                            {goalAnalytics.averageProgress}%
                          </div>
                          <div className="performance-progress">
                            <div
                              className={getGoalProgressClass(
                                goalAnalytics.averageProgress
                              )}
                              style={{
                                width: `${goalAnalytics.averageProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="performance-goal-list">
                        {goals.slice(0, 4).map((goal) => (
                          <div
                            key={goal.id}
                            className="performance-goal-item"
                          >
                            <div className="performance-goal-row">
                              <span className="performance-goal-name">
                                {goal.title}
                              </span>

                              <span className="performance-goal-percent">
                                {goal.progress_percentage || 0}%
                              </span>
                            </div>

                            <div className="performance-progress">
                              <div
                                className={getGoalProgressClass(
                                  Number(goal.progress_percentage || 0)
                                )}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      Number(
                                        goal.progress_percentage || 0
                                      )
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="performance-chart-empty">
                      <div className="performance-empty-icon">
                        <Target size={25} />
                      </div>

                      <strong>No active goals are currently assigned.</strong>

                      <span>
                        Assigned objectives and milestones will appear here
                        when they become available.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance + Delivery */}
            <div
              className="performance-section-grid equal"
              style={{ marginTop: "1.25rem" }}
            >
              {/* Attendance */}
              <div className="performance-card">
                <div className="performance-card-header">
                  <div className="performance-card-heading">
                    <div className="performance-card-icon">
                      <Calendar size={17} />
                    </div>

                    <div>
                      <h2 className="performance-card-title">
                        Attendance & Leave
                      </h2>

                      <p className="performance-card-description">
                        Operational attendance and approved leave context
                        already provided by the system.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="performance-card-body">
                  <div className="performance-attendance-summary">
                    <div className="performance-attendance-ring">
                      <span>
                        {summary.attendance.working_days > 0
                          ? `${Math.round(attendancePercentage)}%`
                          : "—"}
                      </span>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: "var(--text-primary)",
                          fontSize: "0.9rem",
                          fontWeight: 750,
                        }}
                      >
                        Attendance coverage
                      </div>

                      <div
                        style={{
                          marginTop: "0.3rem",
                          color: "var(--text-secondary)",
                          fontSize: "0.73rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {summary.attendance.working_days > 0
                          ? `${summary.attendance.present_days} of ${summary.attendance.working_days} working days recorded`
                          : "No attendance data recorded"}
                      </div>
                    </div>
                  </div>

                  <div className="performance-context-grid">
                    <div className="performance-context-item">
                      <div className="performance-context-label">
                        <CheckCircle2
                          size={13}
                          style={{ color: "var(--primary-color)" }}
                        />
                        Present Days
                      </div>

                      <div className="performance-context-value">
                        {summary.attendance.working_days > 0
                          ? `${summary.attendance.present_days} / ${summary.attendance.working_days}`
                          : "—"}
                      </div>
                    </div>

                    <div className="performance-context-item">
                      <div className="performance-context-label">
                        <Timer
                          size={13}
                          style={{
                            color:
                              "var(--warning-color, #f59e0b)",
                          }}
                        />
                        Late Punches
                      </div>

                      <div className="performance-context-value">
                        {summary.attendance.late_days}
                      </div>
                    </div>

                    <div className="performance-context-item">
                      <div className="performance-context-label">
                        <Calendar
                          size={13}
                          style={{ color: "var(--primary-color)" }}
                        />
                        Approved Leave
                      </div>

                      <div className="performance-context-value">
                        {summary.leave.approved_days}
                      </div>

                      <div className="performance-mini-meta">
                        day(s)
                      </div>
                    </div>

                    <div className="performance-context-item">
                      <div className="performance-context-label">
                        <Clock
                          size={13}
                          style={{ color: "var(--text-muted)" }}
                        />
                        Pending Requests
                      </div>

                      <div className="performance-context-value">
                        {summary.leave.pending_requests}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="performance-card">
                <div className="performance-card-header">
                  <div className="performance-card-heading">
                    <div className="performance-card-icon">
                      <Briefcase size={17} />
                    </div>

                    <div>
                      <h2 className="performance-card-title">
                        Delivery & Output
                      </h2>

                      <p className="performance-card-description">
                        Project engagement and work-report activity from
                        existing performance data.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="performance-card-body">
                  <div className="performance-mini-grid">
                    <div className="performance-mini-card">
                      <span className="performance-mini-label">
                        Assigned Projects
                      </span>

                      <div className="performance-mini-value">
                        {summary.projects.assigned}
                      </div>

                      <div className="performance-mini-meta">
                        total assigned
                      </div>
                    </div>

                    <div className="performance-mini-card">
                      <span className="performance-mini-label">
                        Work Reports
                      </span>

                      <div className="performance-mini-value">
                        {summary.work_reports.submitted}
                      </div>

                      <div className="performance-mini-meta">
                        total submitted
                      </div>
                    </div>
                  </div>

                  {projectStatusData.length > 0 ? (
                    <>
                      <div className="performance-donut-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={projectStatusData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={78}
                              paddingAngle={4}
                              stroke="var(--bg-surface)"
                              strokeWidth={3}
                            >
                              {projectStatusData.map((entry, index) => (
                                <Cell
                                  key={`project-cell-${index}`}
                                  fill={
                                    entry.type === "active"
                                      ? "var(--primary-color)"
                                      : "var(--success-color, #10b981)"
                                  }
                                />
                              ))}
                            </Pie>

                            <Tooltip
                              contentStyle={{
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "10px",
                                fontSize: "0.72rem",
                              }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>

                        <div className="performance-donut-center">
                          <strong>
                            {Number(summary.projects.assigned || 0)}
                          </strong>
                          <span>Projects</span>
                        </div>
                      </div>

                      <div className="performance-legend">
                        {projectStatusData.map((item) => (
                          <div
                            className="performance-legend-item"
                            key={item.name}
                          >
                            <span className="performance-legend-dot" />
                            {item.name}: {item.value}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "1rem",
                        textAlign: "center",
                        borderRadius: "12px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface-elevated)",
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                      }}
                    >
                      No project status data is currently available.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Goal Progress + Performance Insights */}
            <div
              className="performance-section-grid equal"
              style={{ marginTop: "1.25rem" }}
            >
              {/* Goal Progress */}
              <div className="performance-card">
                <div className="performance-card-header">
                  <div className="performance-card-heading">
                    <div className="performance-card-icon">
                      <BarChart3 size={17} />
                    </div>

                    <div>
                      <h2 className="performance-card-title">
                        Goal Progress Breakdown
                      </h2>

                      <p className="performance-card-description">
                        Individual goal progress using the goals already
                        returned by the API.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="performance-card-body">
                  {goalProgressData.length > 0 ? (
                    <div className="performance-chart small">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={goalProgressData}
                          layout="vertical"
                          margin={{
                            top: 4,
                            right: 15,
                            left: 8,
                            bottom: 4,
                          }}
                        >
                          <CartesianGrid
                            stroke="var(--border-color)"
                            strokeDasharray="3 3"
                            horizontal={false}
                          />

                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{
                              fill: "var(--text-muted)",
                              fontSize: 10,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            type="category"
                            dataKey="name"
                            width={105}
                            tick={{
                              fill: "var(--text-secondary)",
                              fontSize: 10,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            contentStyle={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              fontSize: "0.72rem",
                            }}
                            formatter={(value) => [
                              `${value}%`,
                              "Progress",
                            ]}
                          />

                          <Bar
                            dataKey="progress"
                            fill="var(--primary-color)"
                            radius={[0, 6, 6, 0]}
                            barSize={14}
                            animationDuration={700}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="performance-chart-empty">
                      <div className="performance-empty-icon">
                        <Target size={25} />
                      </div>

                      <strong>No goal analytics available yet.</strong>

                      <span>
                        Goal progress will appear here after goals are
                        assigned.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Insights */}
              <div className="performance-card">
                <div className="performance-card-header">
                  <div className="performance-card-heading">
                    <div className="performance-card-icon">
                      <Activity size={17} />
                    </div>

                    <div>
                      <h2 className="performance-card-title">
                        Performance Insights
                      </h2>

                      <p className="performance-card-description">
                        Data-based observations from your current performance
                        information.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="performance-card-body">
                  {summary || goals.length > 0 || reviews.length > 0 ? (
                    <div className="performance-insights">
                      <div className="performance-insight">
                        <div className="performance-insight-header">
                          <CheckCircle2
                            size={16}
                            style={{
                              color: "var(--primary-color)",
                            }}
                          />
                          Current Progress
                        </div>

                        <p>
                          {goalAnalytics.total > 0
                            ? `${goalAnalytics.averageProgress}% average progress across your currently loaded goals.`
                            : "No goal progress data is currently available."}
                        </p>
                      </div>

                      <div className="performance-insight">
                        <div className="performance-insight-header">
                          <Award
                            size={16}
                            style={{
                              color: "var(--primary-color)",
                            }}
                          />
                          Review Status
                        </div>

                        <p>
                          {summary.completed_reviews_count > 0
                            ? `${summary.completed_reviews_count} completed HR evaluation(s) are available in your performance history.`
                            : "No completed HR evaluations are currently available."}
                        </p>
                      </div>

                      <div className="performance-insight">
                        <div className="performance-insight-header">
                          <Briefcase
                            size={16}
                            style={{
                              color: "var(--primary-color)",
                            }}
                          />
                          Project Engagement
                        </div>

                        <p>
                          {summary.projects.assigned > 0
                            ? `${summary.projects.active} active project(s) are currently assigned to you.`
                            : "No assigned projects are currently recorded."}
                        </p>
                      </div>

                      <div className="performance-insight">
                        <div className="performance-insight-header">
                          <Calendar
                            size={16}
                            style={{
                              color: "var(--primary-color)",
                            }}
                          />
                          Attendance Context
                        </div>

                        <p>
                          {summary.attendance.working_days > 0
                            ? `${summary.attendance.present_days} of ${summary.attendance.working_days} working days are currently recorded.`
                            : "No attendance history is currently available."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="performance-empty">
                      <div className="performance-empty-icon">
                        <Activity size={26} />
                      </div>

                      <h3>No performance insights yet</h3>

                      <p>
                        More performance insights will appear as additional
                        data becomes available.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================
            TAB 2 — PERFORMANCE REVIEWS
        ============================================================ */}
        {activeTab === "reviews" && (
          <div className="performance-card">
            <div className="performance-card-header">
              <div className="performance-card-heading">
                <div className="performance-card-icon">
                  <Award size={17} />
                </div>

                <div>
                  <h2 className="performance-card-title">
                    Performance Reviews
                  </h2>

                  <p className="performance-card-description">
                    Review history, ratings, status, and detailed HR
                    evaluation breakdowns.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="performance-card-body"
              style={{ paddingTop: "1rem" }}
            >
              {loading ? (
                <div className="performance-loading">
                  <RefreshCw
                    className="hrms-spinner"
                    size={30}
                    style={{
                      color: "var(--primary-color)",
                    }}
                  />

                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                    }}
                  >
                    Loading performance evaluations...
                  </p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="performance-empty">
                  <div className="performance-empty-icon">
                    <Award size={27} />
                  </div>

                  <h3>
                    No completed performance reviews available yet
                  </h3>

                  <p>
                    Official evaluations will appear here once finalized by
                    HR.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="performance-desktop-table performance-table-wrap">
                    <table className="hrms-table">
                      <thead>
                        <tr>
                          <th>Review Period</th>
                          <th>Overall Rating</th>
                          <th>Status</th>
                          <th>Completed Date</th>
                          <th style={{ textAlign: "right" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {reviews.map((rev) => (
                          <tr key={rev.id}>
                            <td
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              {rev.review_start_date} to{" "}
                              {rev.review_end_date}
                            </td>

                            <td>
                              {rev.overall_rating ? (
                                <span className="performance-review-rating">
                                  <Star
                                    size={15}
                                    style={{
                                      color: "#f59e0b",
                                      fill: "#f59e0b",
                                    }}
                                  />

                                  {rev.overall_rating.toFixed(1)} / 5.0
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  N/A
                                </span>
                              )}
                            </td>

                            <td>
                              <span
                                className={getStatusBadge(rev.status)}
                              >
                                {rev.status}
                              </span>
                            </td>

                            <td
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.875rem",
                              }}
                            >
                              {rev.completed_at
                                ? new Date(
                                    rev.completed_at
                                  ).toLocaleDateString()
                                : "-"}
                            </td>

                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() =>
                                    setSelectedReview(rev)
                                  }
                                >
                                  View Breakdown
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="performance-mobile-cards">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="performance-review-card"
                      >
                        <div className="performance-review-top">
                          <div>
                            <div className="performance-review-period">
                              {rev.review_start_date} to{" "}
                              {rev.review_end_date}
                            </div>

                            <div className="performance-review-date">
                              Completed:{" "}
                              {rev.completed_at
                                ? new Date(
                                    rev.completed_at
                                  ).toLocaleDateString()
                                : "-"}
                            </div>
                          </div>

                          <span
                            className={getStatusBadge(rev.status)}
                          >
                            {rev.status}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: "0.8rem",
                            paddingTop: "0.7rem",
                            borderTop:
                              "1px solid var(--border-color)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Overall Rating
                          </span>

                          {rev.overall_rating ? (
                            <span className="performance-review-rating">
                              <Star
                                size={14}
                                style={{
                                  color: "#f59e0b",
                                  fill: "#f59e0b",
                                }}
                              />

                              {rev.overall_rating.toFixed(1)} / 5.0
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              N/A
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: "0.8rem",
                          }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Eye}
                            onClick={() =>
                              setSelectedReview(rev)
                            }
                          >
                            View Breakdown
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination */}
              {reviewTotalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Page {reviewPage} of {reviewTotalPages}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reviewPage <= 1}
                      onClick={() =>
                        setReviewPage((p) => p - 1)
                      }
                    >
                      <ChevronLeft size={15} />
                      Previous
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reviewPage >= reviewTotalPages}
                      onClick={() =>
                        setReviewPage((p) => p + 1)
                      }
                    >
                      Next
                      <ChevronRight size={15} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3 — GOALS & KPIs
        ============================================================ */}
        {activeTab === "goals" && (
          <>
            {/* Goal Summary */}
            <div className="performance-kpi-grid">
              <div className="performance-kpi">
                <div className="performance-kpi-top">
                  <span className="performance-kpi-label">
                    Total Goals
                  </span>

                  <div className="performance-kpi-icon">
                    <Target size={18} />
                  </div>
                </div>

                <div className="performance-kpi-value">
                  {goalAnalytics.total}
                </div>

                <div className="performance-kpi-meta">
                  <Target size={13} />
                  currently loaded goals
                </div>
              </div>

              <div className="performance-kpi">
                <div className="performance-kpi-top">
                  <span className="performance-kpi-label">
                    Completed
                  </span>

                  <div className="performance-kpi-icon">
                    <CheckCircle2 size={18} />
                  </div>
                </div>

                <div className="performance-kpi-value">
                  {goalAnalytics.completed}
                </div>

                <div className="performance-kpi-meta success">
                  {goalAnalytics.total > 0
                    ? `${Math.round(
                        (goalAnalytics.completed /
                          goalAnalytics.total) *
                          100
                      )}% of loaded goals`
                    : "No goals"}
                </div>
              </div>

              <div className="performance-kpi">
                <div className="performance-kpi-top">
                  <span className="performance-kpi-label">
                    In Progress
                  </span>

                  <div className="performance-kpi-icon">
                    <Activity size={18} />
                  </div>
                </div>

                <div className="performance-kpi-value">
                  {goalAnalytics.inProgress}
                </div>

                <div className="performance-kpi-meta">
                  <TrendingUp size={13} />
                  active objectives
                </div>
              </div>

              <div className="performance-kpi">
                <div className="performance-kpi-top">
                  <span className="performance-kpi-label">
                    Average Progress
                  </span>

                  <div className="performance-kpi-icon">
                    <BarChart3 size={18} />
                  </div>
                </div>

                <div className="performance-kpi-value">
                  {goalAnalytics.averageProgress}%
                </div>

                <div className="performance-rating-bar">
                  <div
                    className="performance-rating-fill"
                    style={{
                      width: `${goalAnalytics.averageProgress}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {goals.length === 0 ? (
              <div className="performance-card">
                <div className="performance-empty">
                  <div className="performance-empty-icon">
                    <Target size={27} />
                  </div>

                  <h3>No performance goals assigned yet</h3>

                  <p>
                    Assigned objectives and quarterly milestones will be
                    displayed here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Goal Analytics */}
                <div
                  className="performance-section-grid equal"
                  style={{ marginBottom: "1.25rem" }}
                >
                  <div className="performance-card">
                    <div className="performance-card-header">
                      <div className="performance-card-heading">
                        <div className="performance-card-icon">
                          <PieChart size={17} />
                        </div>

                        <div>
                          <h2 className="performance-card-title">
                            Goal Status
                          </h2>

                          <p className="performance-card-description">
                            Distribution of the currently loaded goals by
                            status.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="performance-card-body">
                      {goalStatusChartData.length > 0 ? (
                        <>
                          <div className="performance-donut-wrap">
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                            >
                              <RechartsPieChart>
                                <Pie
                                  data={goalStatusChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={78}
                                  paddingAngle={4}
                                  stroke="var(--bg-surface)"
                                  strokeWidth={3}
                                >
                                  {goalStatusChartData.map(
                                    (entry, index) => (
                                      <Cell
                                        key={`goal-cell-${index}`}
                                        fill={
                                          entry.type === "completed"
                                            ? "var(--primary-color)"
                                            : entry.type ===
                                              "inProgress"
                                            ? "var(--warning-color, #f59e0b)"
                                            : entry.type ===
                                              "notStarted"
                                            ? "var(--text-muted)"
                                            : "var(--danger-color, #ef4444)"
                                        }
                                      />
                                    )
                                  )}
                                </Pie>

                                <Tooltip
                                  contentStyle={{
                                    background:
                                      "var(--bg-surface)",
                                    border:
                                      "1px solid var(--border-color)",
                                    borderRadius: "10px",
                                    fontSize: "0.72rem",
                                  }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>

                            <div className="performance-donut-center">
                              <strong>
                                {goalAnalytics.total}
                              </strong>
                              <span>Total Goals</span>
                            </div>
                          </div>

                          <div className="performance-legend">
                            {goalStatusChartData.map((item) => (
                              <div
                                className="performance-legend-item"
                                key={item.name}
                              >
                                <span className="performance-legend-dot" />
                                {item.name}: {item.value}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="performance-chart-empty">
                          <CircleDot size={28} />
                          <strong>No goal status data</strong>
                          <span>
                            Goal status visualization will appear when
                            goal data is available.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="performance-card">
                    <div className="performance-card-header">
                      <div className="performance-card-heading">
                        <div className="performance-card-icon">
                          <BarChart3 size={17} />
                        </div>

                        <div>
                          <h2 className="performance-card-title">
                            Individual Progress
                          </h2>

                          <p className="performance-card-description">
                            Progress percentages for your currently loaded
                            goals.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="performance-card-body">
                      <div className="performance-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={goalProgressData}
                            layout="vertical"
                            margin={{
                              top: 5,
                              right: 12,
                              left: 5,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid
                              stroke="var(--border-color)"
                              strokeDasharray="3 3"
                              horizontal={false}
                            />

                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              tick={{
                                fill: "var(--text-muted)",
                                fontSize: 10,
                              }}
                              axisLine={false}
                              tickLine={false}
                            />

                            <YAxis
                              type="category"
                              dataKey="name"
                              width={110}
                              tick={{
                                fill: "var(--text-secondary)",
                                fontSize: 10,
                              }}
                              axisLine={false}
                              tickLine={false}
                            />

                            <Tooltip
                              contentStyle={{
                                background: "var(--bg-surface)",
                                border:
                                  "1px solid var(--border-color)",
                                borderRadius: "10px",
                                fontSize: "0.72rem",
                              }}
                              formatter={(value) => [
                                `${value}%`,
                                "Progress",
                              ]}
                            />

                            <Bar
                              dataKey="progress"
                              fill="var(--primary-color)"
                              radius={[0, 6, 6, 0]}
                              barSize={15}
                              animationDuration={700}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Goal Cards */}
                <div className="performance-goals-grid">
                  {goals.map((g) => {
                    const progress = Math.min(
                      100,
                      Math.max(
                        0,
                        Number(g.progress_percentage || 0)
                      )
                    );

                    return (
                      <div
                        key={g.id}
                        className="performance-goal-detail"
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "0.6rem",
                            }}
                          >
                            <h3 className="performance-goal-detail-title">
                              {g.title}
                            </h3>

                            <span
                              className={getStatusBadge(g.status)}
                            >
                              {g.status.replace("_", " ")}
                            </span>
                          </div>

                          {g.description && (
                            <p className="performance-goal-detail-description">
                              {g.description}
                            </p>
                          )}

                          <div style={{ marginTop: "1rem" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "0.5rem",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: "var(--text-secondary)",
                              }}
                            >
                              <span>My Progress</span>
                              <span
                                style={{
                                  color: "var(--primary-color)",
                                }}
                              >
                                {progress}%
                              </span>
                            </div>

                            <div className="performance-progress">
                              <div
                                className={getGoalProgressClass(
                                  progress
                                )}
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="performance-goal-footer">
                          <span
                            style={{
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              fontSize: "0.7rem",
                            }}
                          >
                            <Calendar size={13} />
                            Target: {g.target_date}
                          </span>

                          <button
                            type="button"
                            onClick={() => openGoalModal(g)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--primary-color)",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            Update Progress
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ============================================================
            DETAIL MODAL — PERFORMANCE REVIEW
        ============================================================ */}
        {selectedReview && (
          <div
            className="performance-modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedReview(null);
              }
            }}
          >
            <div className="performance-modal">
              <div className="performance-modal-header">
                <div>
                  <h3>Performance Review Breakdown</h3>

                  <p>
                    Period: {selectedReview.review_start_date} to{" "}
                    {selectedReview.review_end_date}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="performance-modal-close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="performance-modal-body">
                {/* Overall Rating */}
                <div className="performance-rating-banner">
                  <div>
                    <div className="performance-rating-banner-label">
                      Official Overall Rating
                    </div>

                    <p className="performance-rating-banner-value">
                      {selectedReview.overall_rating
                        ? `${selectedReview.overall_rating.toFixed(
                            1
                          )} / 5.0`
                        : "N/A"}
                    </p>
                  </div>

                  <span
                    className={getStatusBadge(
                      selectedReview.status
                    )}
                  >
                    {selectedReview.status}
                  </span>
                </div>

                {/* Category Ratings */}
                <div
                  style={{
                    marginTop: "1.15rem",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 0.7rem",
                      color: "var(--text-muted)",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Category Breakdown
                  </h4>

                  <div className="performance-category-grid">
                    {selectedReview.ratings.map((r) => (
                      <div
                        key={r.id}
                        className="performance-category"
                      >
                        <div className="performance-category-row">
                          <span className="performance-category-name">
                            {r.category}
                          </span>

                          <span className="performance-category-score">
                            {r.rating} / 5
                          </span>
                        </div>

                        <div
                          className="performance-progress"
                          style={{ marginTop: "0.6rem" }}
                        >
                          <div
                            className="performance-progress-high"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  (Number(r.rating) / 5) * 100
                                )
                              )}%`,
                            }}
                          />
                        </div>

                        {r.comments && (
                          <p
                            style={{
                              margin:
                                "0.55rem 0 0",
                              color:
                                "var(--text-secondary)",
                              fontSize: "0.72rem",
                              lineHeight: 1.5,
                              fontStyle: "italic",
                            }}
                          >
                            "{r.comments}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Feedback */}
                {selectedReview.overall_feedback && (
                  <div
                    style={{
                      marginTop: "1.15rem",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 0.7rem",
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      HR Feedback
                    </h4>

                    <div className="performance-feedback">
                      {selectedReview.overall_feedback}
                    </div>
                  </div>
                )}
              </div>

              <div className="performance-modal-footer">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReview(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            MODAL — UPDATE GOAL STATUS
        ============================================================ */}
        {selectedGoal && (
          <div
            className="performance-modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedGoal(null);
              }
            }}
          >
            <div className="performance-modal small">
              <div className="performance-modal-header">
                <h3>Update Goal Progress</h3>

                <button
                  type="button"
                  onClick={() => setSelectedGoal(null)}
                  className="performance-modal-close"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handleUpdateGoalStatus}
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="performance-modal-body">
                  <div>
                    <label className="hrms-label">
                      Goal Title
                    </label>

                    <p
                      style={{
                        margin: 0,
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        lineHeight: 1.45,
                      }}
                    >
                      {selectedGoal.title}
                    </p>
                  </div>

                  <div style={{ marginTop: "1.15rem" }}>
                    <label className="hrms-label">
                      Status *
                    </label>

                    <select
                      value={goalStatusInput}
                      onChange={(e) =>
                        setGoalStatusInput(e.target.value)
                      }
                      className="hrms-select"
                      style={{ width: "100%" }}
                    >
                      <option value="NOT_STARTED">
                        NOT STARTED
                      </option>

                      <option value="IN_PROGRESS">
                        IN PROGRESS
                      </option>

                      <option value="COMPLETED">
                        COMPLETED
                      </option>

                      <option value="CANCELLED">
                        CANCELLED
                      </option>
                    </select>
                  </div>

                  <div style={{ marginTop: "1.15rem" }}>
                    <label className="hrms-label">
                      Progress Percentage (0 - 100%)
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={goalProgressInput}
                      onChange={(e) =>
                        setGoalProgressInput(e.target.value)
                      }
                      className="hrms-input"
                      style={{ width: "100%" }}
                    />

                    <div
                      className="performance-progress"
                      style={{ marginTop: "0.7rem" }}
                    >
                      <div
                        className="performance-progress-high"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              Number(goalProgressInput || 0)
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="performance-modal-footer">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedGoal(null)}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={updatingGoal}
                  >
                    Save Progress
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

export default MyPerformance;