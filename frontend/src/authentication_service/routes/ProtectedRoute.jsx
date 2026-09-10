import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import AuthLoadingScreen from "../../shared/components/AuthLoadingScreen";

function ProtectedRoute() {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  const location = useLocation();

  /*
   * Wait until AuthProvider finishes restoring
   * the authentication session.
   */
  if (loading) {
    return <AuthLoadingScreen />;
  }

  /*
   * User is not authenticated.
   */
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  /*
   * User is authenticated and allowed to access protected routes.
   */
  return <Outlet />;
}

export default ProtectedRoute;