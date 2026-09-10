import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const announcementApi = axios.create({
  baseURL: API_BASE_URL,
});

announcementApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

announcementApi.interceptors.response.use(
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

// Search Projects for Project Announcement (HR Only)
export const searchProjectsForAnnouncement = (params) =>
  announcementApi.get("/announcements/projects/search", { params });

// HR Announcements List (HR Only)
export const getHRAnnouncements = (params) =>
  announcementApi.get("/announcements/hr", { params });

// Employee Announcements Feed
export const getEmployeeAnnouncements = (params) =>
  announcementApi.get("/announcements/employee", { params });

// Get Announcement Details by ID
export const getAnnouncementById = (id) =>
  announcementApi.get(`/announcements/${id}`);

// Create Announcement (HR Only)
export const createAnnouncement = (data) =>
  announcementApi.post("/announcements", data);

// Update Announcement (HR Only)
export const updateAnnouncement = (id, data) =>
  announcementApi.put(`/announcements/${id}`, data);

// Publish Announcement (HR Only)
export const publishAnnouncement = (id) =>
  announcementApi.post(`/announcements/${id}/publish`);

// Archive Announcement (HR Only)
export const archiveAnnouncement = (id) =>
  announcementApi.post(`/announcements/${id}/archive`);

// Mark Announcement as Read
export const markAnnouncementAsRead = (id) =>
  announcementApi.post(`/announcements/${id}/read`);

export default announcementApi;
