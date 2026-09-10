import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const performanceApi = axios.create({
  baseURL: API_BASE_URL,
});

performanceApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

performanceApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("hrms_token");
      if (token) {
        localStorage.removeItem("hrms_token");
        window.dispatchEvent(new Event("hrms:unauthorized"));
      }
    }
    return Promise.reject(error);
  }
);

// Employee Performance APIs
export const getMyPerformanceSummary = () => performanceApi.get("/performance/my/summary");
export const getMyPerformanceReviews = (params) => performanceApi.get("/performance/my/reviews", { params });
export const getMyPerformanceReviewDetails = (id) => performanceApi.get(`/performance/my/reviews/${id}`);
export const getMyGoals = (params) => performanceApi.get("/performance/my/goals", { params });
export const updateMyGoalStatus = (id, data) => performanceApi.patch(`/performance/my/goals/${id}/status`, data);

// HR Performance APIs
export const getHRPerformanceDashboard = () => performanceApi.get("/performance/dashboard");
export const getHRPerformanceAnalytics = () => performanceApi.get("/performance/analytics");
export const getEmployeePerformanceDetails = (employeeId) => performanceApi.get(`/performance/employees/${employeeId}`);
export const getAllPerformanceReviews = (params) => performanceApi.get("/performance/reviews", { params });
export const createPerformanceReview = (data) => performanceApi.post("/performance/reviews", data);
export const getPerformanceReviewDetails = (id) => performanceApi.get(`/performance/reviews/${id}`);
export const updatePerformanceReview = (id, data) => performanceApi.put(`/performance/reviews/${id}`, data);
export const completePerformanceReview = (id) => performanceApi.patch(`/performance/reviews/${id}/complete`);
export const getAllGoals = (params) => performanceApi.get("/performance/goals", { params });
export const createGoal = (data) => performanceApi.post("/performance/goals", data);
export const updateGoal = (id, data) => performanceApi.put(`/performance/goals/${id}`, data);
export const updateGoalStatus = (id, data) => performanceApi.patch(`/performance/goals/${id}/status`, data);

export default performanceApi;
