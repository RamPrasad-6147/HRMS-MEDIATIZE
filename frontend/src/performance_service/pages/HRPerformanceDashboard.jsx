import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Users,
  CheckCircle2,
  Clock,
  Star,
  Target,
  FileText,
  Plus,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  BarChart2,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { getHRPerformanceDashboard, getHRPerformanceAnalytics } from "../services/performanceApi";
import { showError } from "../../shared/utils/toast";

const GOAL_COLORS = {
  COMPLETED: "#10B981",
  IN_PROGRESS: "#3B82F6",
  NOT_STARTED: "#F59E0B",
  CANCELLED: "#EF4444",
};

const REVIEW_COLORS = {
  COMPLETED: "#10B981",
  DRAFT: "#F59E0B",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-lg text-xs space-y-1">
        <p className="font-bold text-gray-900 dark:text-white">{label || payload[0]?.name}</p>
        {payload.map((item, idx) => (
          <p key={idx} style={{ color: item.color || item.fill }} className="font-semibold">
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function HRPerformanceDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, analyticsRes] = await Promise.all([
        getHRPerformanceDashboard(),
        getHRPerformanceAnalytics(),
      ]);
      setMetrics(dashRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error("Failed to load HR performance analytics", err);
      showError("Unable to load performance metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <BackToDashboard />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              HR Performance & Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Executive performance metrics, employee evaluations, rating trends, and goal analytics.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>

        {/* KPI Summary Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Active Employees */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Active Employees
                </span>
                <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">
                {metrics.total_employees}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Active headcount</p>
            </div>

            {/* Completed Reviews */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reviews Completed
                </span>
                <div className="p-2 bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">
                {metrics.reviews_completed}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                {metrics.reviews_pending} draft review(s) pending
              </p>
            </div>

            {/* System Average Rating */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  Average Rating
                </span>
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {metrics.average_rating ? `${metrics.average_rating.toFixed(1)}` : "N/A"}
                </span>
                {metrics.average_rating && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ 5.0</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Across completed evaluations</p>
            </div>

            {/* Goals Completed */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Goals Completed
                </span>
                <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-lg">
                  <Target className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">
                {metrics.goals_completed}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {metrics.goals_in_progress} in progress
              </p>
            </div>
          </div>
        )}

        {/* Interactive Analytics Section */}
        {analytics && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
              <BarChart2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Performance Analytics & Visual Insights
              </h2>
            </div>

            {/* Row 1: Employee Rating & Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employee Rating Chart */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Performance Rating by Employee
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Completed Reviews</span>
                </div>

                {analytics.ratings_by_employee && analytics.ratings_by_employee.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.ratings_by_employee} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                          dataKey="employee_name"
                          tick={{ fontSize: 11 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="average_rating"
                          name="Average Rating"
                          fill="#6366F1"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={50}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <Users className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Employee Ratings Yet</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Complete performance reviews to visualize rating averages by employee.
                    </p>
                  </div>
                )}
              </div>

              {/* Performance Trend Line Chart */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Performance Rating Trend Over Time
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Monthly Averages</span>
                </div>

                {analytics.performance_trends && analytics.performance_trends.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.performance_trends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="average_rating"
                          name="System Avg Rating"
                          stroke="#10B981"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "#10B981" }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <TrendingUp className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Trend History Available</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Historical rating trends will appear here as reviews are finalized over time.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Performance Category Analysis */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-500" />
                  Category Rating Analysis Across Employees
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">8 Core Competencies</span>
              </div>

              {analytics.category_ratings && analytics.category_ratings.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={analytics.category_ratings}
                      margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="average_rating"
                        name="Category Avg Rating"
                        fill="#8B5CF6"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                  <Star className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Category Data</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Evaluated categories will display average competency scores once reviews are completed.
                  </p>
                </div>
              )}
            </div>

            {/* Row 3: Goal Status & Review Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Goal Status Distribution */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-500" />
                    Goal / KPI Status Distribution
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Execution Breakdown</span>
                </div>

                {analytics.goal_status_distribution &&
                analytics.goal_status_distribution.some((g) => g.count > 0) ? (
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.goal_status_distribution}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={4}
                          label={({ label, count }) => (count > 0 ? `${label}: ${count}` : "")}
                        >
                          {analytics.goal_status_distribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={GOAL_COLORS[entry.status] || "#9CA3AF"}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <Target className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Goals Assigned</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Assign employee performance goals to view progress distribution charts.
                    </p>
                  </div>
                )}
              </div>

              {/* Review Status Distribution */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-amber-500" />
                    Review Status Distribution
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Completed vs Draft</span>
                </div>

                {analytics.review_status_distribution &&
                analytics.review_status_distribution.some((r) => r.count > 0) ? (
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.review_status_distribution}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={4}
                          label={({ label, count }) => (count > 0 ? `${label}: ${count}` : "")}
                        >
                          {analytics.review_status_distribution.map((entry, index) => (
                            <Cell
                              key={`cell-rev-${index}`}
                              fill={REVIEW_COLORS[entry.status] || "#9CA3AF"}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <PieChartIcon className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Review Data</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Create draft or completed evaluations to view review status metrics.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <Link
            to="/hr/performance/reviews"
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 shadow-sm transition flex items-center justify-between"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-2">
                <Award className="w-5 h-5" />
                Manage Performance Reviews
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Draft evaluations, rate 8 core categories, and complete formal employee appraisals.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            to="/hr/performance/goals"
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 shadow-sm transition flex items-center justify-between"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-2">
                <Target className="w-5 h-5" />
                Manage Employee Goals / KPIs
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create goals, set progress targets, and track objective execution across team.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export default HRPerformanceDashboard;
