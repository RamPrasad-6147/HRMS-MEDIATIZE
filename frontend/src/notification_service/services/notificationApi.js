import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const notificationApi = axios.create({
  baseURL: `${API_BASE_URL}/notifications`,
});

notificationApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

notificationApi.interceptors.response.use(
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

export const getNotifications = (params) => notificationApi.get("", { params });
export const getUnreadCount = () => notificationApi.get("/unread-count");
export const markNotificationAsRead = (id) => notificationApi.patch(`/${id}/read`);
export const markAllNotificationsAsRead = () => notificationApi.patch("/read-all");

export default notificationApi;
