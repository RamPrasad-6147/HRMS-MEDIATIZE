import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const employeeApi = axios.create({
  baseURL: `${API_BASE_URL}/employees`,
});

employeeApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

employeeApi.interceptors.response.use(
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

export const getEmployees = (params) => employeeApi.get("", { params });
export const getEmployeeById = (id) => employeeApi.get(`/${id}`);
export const createEmployee = (data) => employeeApi.post("", data);
export const updateEmployee = (id, data) => employeeApi.put(`/${id}`, data);
export const archiveEmployee = (id) => employeeApi.delete(`/${id}`);
export const activateEmployee = (id) => employeeApi.patch(`/${id}/activate`);
export const deactivateEmployee = (id) => employeeApi.patch(`/${id}/deactivate`);

export const getMyProfile = () => employeeApi.get("/me");
export const updateMyProfile = (data) => employeeApi.put("/me", data);
export const uploadProfilePhoto = (formData) =>
  employeeApi.post("/me/profile-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteProfilePhoto = () => employeeApi.delete("/me/profile-photo");

export default employeeApi;
