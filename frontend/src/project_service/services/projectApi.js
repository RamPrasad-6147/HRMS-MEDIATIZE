import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const projectApi = axios.create({
  baseURL: API_BASE_URL,
});

projectApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

projectApi.interceptors.response.use(
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

// Projects Endpoints
export const getProjects = (params) => projectApi.get("/projects", { params });
export const getProjectById = (id) => projectApi.get(`/projects/${id}`);
export const createProject = (data) => projectApi.post("/projects", data);
export const updateProject = (id, data) => projectApi.put(`/projects/${id}`, data);
export const updateProjectStatus = (id, status) => projectApi.patch(`/projects/${id}/status`, { status });
export const updateProjectProgress = (id, progress_percentage) => projectApi.patch(`/projects/${id}/progress`, { progress_percentage });
export const getHRProjectMetrics = () => projectApi.get("/projects/metrics");

// Team Assignment Endpoints
export const assignEmployee = (projectId, data) => projectApi.post(`/projects/${projectId}/assignments`, data);
export const getProjectTeam = (projectId) => projectApi.get(`/projects/${projectId}/assignments`);
export const removeEmployee = (projectId, assignmentId) => projectApi.patch(`/projects/${projectId}/assignments/${assignmentId}/remove`);

// Employee Self-Service Endpoints
export const getMyProjects = () => projectApi.get("/projects/my-projects");
export const getMyProjectDetails = (id) => projectApi.get(`/projects/my-projects/${id}`);

// Project Roles Endpoints
export const getProjectRoles = (params) => projectApi.get("/project-roles", { params });
export const createProjectRole = (data) => projectApi.post("/project-roles", data);
export const updateProjectRole = (id, data) => projectApi.put(`/project-roles/${id}`, data);

export default projectApi;
