import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import AuthLoadingScreen from "../../shared/components/AuthLoadingScreen";

function RoleProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  /*
   * Wait until AuthProvider finishes restoring
   * the authentication session.
   */
  if (loading) {
    return <AuthLoadingScreen />;
  }

  /*
   * No authenticated user.
   * Send the user back to login.
   */
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /*
   * Check whether the user's role is allowed
   * to access this route.
   */
  if (!allowedRoles.includes(user.role)) {
    /*
     * User is authenticated but does not have
     * permission for this route.
     */
    if (user.role === "HR") {
      return (
        <Navigate
          to="/hr/dashboard"
          replace
        />
      );
    }

    if (user.role === "EMPLOYEE") {
      return (
        <Navigate
          to="/employee/dashboard"
          replace
        />
      );
    }

    /*
     * Unknown role.
     */
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /*
   * User has the required role.
   */
  return <Outlet />;
}

export default RoleProtectedRoute;