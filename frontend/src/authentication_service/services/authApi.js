import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * =========================================================
 * REQUEST INTERCEPTOR
 * =========================================================
 *
 * Automatically attaches the JWT to authenticated requests.
 */

authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*
 * =========================================================
 * RESPONSE INTERCEPTOR
 * =========================================================
 *
 * Handles expired or invalid authenticated sessions.
 */

authApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("hrms_token");

      if (token) {
        localStorage.removeItem("hrms_token");

        window.dispatchEvent(
          new Event("hrms:unauthorized")
        );
      }
    }

    return Promise.reject(error);
  }
);

export const requestOTP = (email) =>
  authApi.post("/request-otp", { email });

export const verifyOTP = (email, otp) =>
  authApi.post("/verify-otp", { email, otp });

export const getHRProfile = () =>
  authApi.get("/hr/profile");

export const updateHRProfile = (data) =>
  authApi.put("/hr/profile", data);

export const uploadHRProfilePhoto = (formData) =>
  authApi.post("/hr/profile/photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const deleteHRProfilePhoto = () =>
  authApi.delete("/hr/profile/photo");

export default authApi;