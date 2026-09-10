import {
  useEffect,
  useState,
} from "react";

import AuthContext from "./AuthContext";
import authApi, { requestOTP as requestOTPApi, verifyOTP as verifyOTPApi } from "../services/authApi";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    localStorage.getItem("hrms_token")
  );

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(() =>
    Boolean(
      localStorage.getItem("hrms_token")
    )
  );

  /*
   * =========================================================
   * REQUEST OTP
   * =========================================================
   */

  const requestOTP = async (email) => {
    const response = await requestOTPApi(email);
    return response.data;
  };

  /*
   * =========================================================
   * LOGIN (VERIFY OTP)
   * =========================================================
   *
   * 1. Verify OTP with backend
   * 2. Store JWT in localStorage (hrms_token)
   * 3. GET /auth/me
   * 4. Store authenticated user
   * 5. Return authenticated user for role-based navigation
   */

  const login = async (email, otp) => {
    const response = await verifyOTPApi(email, otp);
    const accessToken = response.data.access_token;

    localStorage.setItem("hrms_token", accessToken);
    setToken(accessToken);

    const meResponse = await authApi.get("/me");
    const authenticatedUser = meResponse.data;

    setUser(authenticatedUser);
    setLoading(false);

    return authenticatedUser;
  };

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  const logout = () => {
    localStorage.removeItem("hrms_token");
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  /*
   * =========================================================
   * HANDLE UNAUTHORIZED SESSION
   * =========================================================
   */

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem("hrms_token");
      setToken(null);
      setUser(null);
      setLoading(false);
    };

    window.addEventListener("hrms:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("hrms:unauthorized", handleUnauthorized);
    };
  }, []);

  /*
   * =========================================================
   * MULTI-TAB STORAGE SYNCHRONIZATION
   * =========================================================
   */

  useEffect(() => {
    const handleStorageChange = async (event) => {
      if (event.key === "hrms_token") {
        const newToken = event.newValue;

        if (!newToken) {
          setToken(null);
          setUser(null);
          setLoading(false);
        } else if (newToken !== token) {
          setToken(newToken);
          setLoading(true);

          try {
            const response = await authApi.get("/me");
            setUser(response.data);
          } catch (error) {
            console.error("Failed to restore session from updated tab storage token", error);
            localStorage.removeItem("hrms_token");
            setToken(null);
            setUser(null);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [token]);

  /*
   * =========================================================
   * RESTORE LOGIN SESSION
   * =========================================================
   */

  useEffect(() => {
    const storedToken = localStorage.getItem("hrms_token");

    if (!storedToken) {
      return;
    }

    let cancelled = false;

    const restoreSession = async () => {
      try {
        const response = await authApi.get("/me");

        if (cancelled) {
          return;
        }

        setUser(response.data);
        setLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to restore authentication session:", error);

        localStorage.removeItem("hrms_token");
        setToken(null);
        setUser(null);
        setLoading(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = async () => {
    try {
      const response = await authApi.get("/me");
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to refresh user profile:", error);
    }
  };

  /*
   * =========================================================
   * AUTH CONTEXT VALUE
   * =========================================================
   */

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    requestOTP,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}