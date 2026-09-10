import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const complaintApi = axios.create({
  baseURL: API_BASE_URL,
});

complaintApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

complaintApi.interceptors.response.use(
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

// Employee Complaint APIs
export const getActiveComplaintCategories = () => complaintApi.get("/complaints/active-categories");
export const submitComplaint = (formData) => complaintApi.post("/complaints", formData);
export const getMyComplaints = (params) => complaintApi.get("/complaints/my", { params });
export const getMyComplaintDetails = (id) => complaintApi.get(`/complaints/my/${id}`);

// HR Category Management APIs
export const getAllComplaintCategories = () => complaintApi.get("/complaints/categories");
export const createComplaintCategory = (data) => complaintApi.post("/complaints/categories", data);
export const updateComplaintCategory = (id, data) => complaintApi.put(`/complaints/categories/${id}`, data);
export const toggleComplaintCategoryStatus = (id) => complaintApi.patch(`/complaints/categories/${id}/toggle-status`);

// HR Complaint Case Management APIs
export const getAllComplaints = (params) => complaintApi.get("/complaints", { params });
export const getComplaintDetailsHR = (id) => complaintApi.get(`/complaints/${id}`);
export const updateComplaintStatus = (id, status) => complaintApi.patch(`/complaints/${id}/status`, { status });
export const updateComplaintPriority = (id, priority) => complaintApi.patch(`/complaints/${id}/priority`, { priority });
export const respondComplaint = (id, hr_response) => complaintApi.patch(`/complaints/${id}/respond`, { hr_response });
export const resolveComplaint = (id, resolution) => complaintApi.patch(`/complaints/${id}/resolve`, { resolution });
export const closeComplaint = (id) => complaintApi.patch(`/complaints/${id}/close`);

export default complaintApi;
