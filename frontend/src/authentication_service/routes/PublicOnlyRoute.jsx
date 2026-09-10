import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import AuthLoadingScreen from "../../shared/components/AuthLoadingScreen";

function PublicOnlyRoute() {
  const { isAuthenticated, user, loading } = useAuth();

  /*
   * Wait until AuthProvider finishes restoring
   * the stored authentication token.
   */
  if (loading) {
    return <AuthLoadingScreen />;
  }

  /*
   * If user is already authenticated, redirect away
   * from public landing/login pages to their dashboard.
   */
  if (isAuthenticated && user) {
    if (user.role === "HR") {
      return <Navigate to="/hr/dashboard" replace />;
    }

    if (user.role === "EMPLOYEE") {
      return <Navigate to="/employee/dashboard" replace />;
    }
  }

  /*
   * User is unauthenticated.
   * Allow access to public routes (Welcome, Login).
   */
  return <Outlet />;
}

export default PublicOnlyRoute;
