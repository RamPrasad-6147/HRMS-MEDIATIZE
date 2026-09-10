import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const workReportApi = axios.create({
  baseURL: API_BASE_URL,
});

workReportApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

workReportApi.interceptors.response.use(
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

// Employee Work Report APIs
export const getMyAssignedProjects = () => workReportApi.get("/work-reports/my/projects");
export const submitWorkReport = (formData) => workReportApi.post("/work-reports", formData);
export const getMyWorkReports = (params) => workReportApi.get("/work-reports/my", { params });
export const getMyWorkReportDetails = (id) => workReportApi.get(`/work-reports/my/${id}`);

// HR Work Report APIs
export const getTodaysWorkReportsSummary = () => workReportApi.get("/work-reports/today");
export const getAllWorkReports = (params) => workReportApi.get("/work-reports", { params });
export const getWorkReportDetailsHR = (id) => workReportApi.get(`/work-reports/${id}`);

export default workReportApi;
