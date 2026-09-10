import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const leaveApi = axios.create({
  baseURL: API_BASE_URL,
});

leaveApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

leaveApi.interceptors.response.use(
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

// Employee Leave APIs
export const getLeaveTypes = () => leaveApi.get("/leave-types");
export const getMyLeaveBalance = (params) => leaveApi.get("/leaves/me/balance", { params });
export const getMyLeaves = (params) => leaveApi.get("/leaves/me", { params });
export const getMyLeaveDetails = (id) => leaveApi.get(`/leaves/me/${id}`);
export const applyLeave = (formData) => leaveApi.post("/leaves", formData);
export const cancelLeave = (id, data) => leaveApi.patch(`/leaves/${id}/cancel`, data);

// HR Leave & Leave Type APIs
export const getAllLeaveTypes = () => leaveApi.get("/leave-types/all");
export const createLeaveType = (data) => leaveApi.post("/leave-types", data);
export const updateLeaveType = (id, data) => leaveApi.put(`/leave-types/${id}`, data);
export const activateLeaveType = (id) => leaveApi.patch(`/leave-types/${id}/activate`);
export const deactivateLeaveType = (id) => leaveApi.patch(`/leave-types/${id}/deactivate`);

export const getAllLeaves = (params) => leaveApi.get("/leaves", { params });
export const getLeaveDetails = (id) => leaveApi.get(`/leaves/${id}`);
export const approveLeave = (id, data) => leaveApi.patch(`/leaves/${id}/approve`, data);
export const rejectLeave = (id, data) => leaveApi.patch(`/leaves/${id}/reject`, data);
export const revokeLeave = (id, data) => leaveApi.patch(`/leaves/${id}/revoke`, data);

export const getEmployeeBalances = (employeeId, params) => leaveApi.get(`/leave-balances/${employeeId}`, { params });
export const updateEmployeeBalance = (employeeId, leaveTypeId, data, params) => leaveApi.put(`/leave-balances/${employeeId}/${leaveTypeId}`, data, { params });

export default leaveApi;
