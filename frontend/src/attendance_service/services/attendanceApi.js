import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const attendanceApi = axios.create({
  baseURL: `${API_BASE_URL}/attendance`,
});

attendanceApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

attendanceApi.interceptors.response.use(
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

export const checkIn = () => attendanceApi.post("/check-in");
export const checkOut = () => attendanceApi.post("/check-out");
export const getTodayAttendance = () => attendanceApi.get("/me/today");
export const getMyAttendanceHistory = (params) => attendanceApi.get("/me", { params });

export const getHRAttendance = (params) => attendanceApi.get("", { params });
export const getAttendanceById = (id) => attendanceApi.get(`/${id}`);

export default attendanceApi;
