import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "./shared/context/ThemeContext";

import Welcome from "./authentication_service/pages/Welcome";
import Login from "./authentication_service/pages/Login";

import HRDashboard from "./authentication_service/pages/HRDashboard";
import HRProfile from "./authentication_service/pages/HRProfile";
import EmployeeDashboard from "./authentication_service/pages/EmployeeDashboard";

import EmployeeList from "./employee_service/pages/EmployeeList";
import CreateEmployee from "./employee_service/pages/CreateEmployee";
import EditEmployee from "./employee_service/pages/EditEmployee";
import EmployeeDetails from "./employee_service/pages/EmployeeDetails";
import MyProfile from "./employee_service/pages/MyProfile";
import AuditLogs from "./audit_service/pages/AuditLogs";
import Attendance from "./attendance_service/pages/Attendance";
import Leave from "./leave_service/pages/Leave";
import HRLeave from "./leave_service/pages/HRLeave";
import LeaveTypes from "./leave_service/pages/LeaveTypes";
import LeaveBalances from "./leave_service/pages/LeaveBalances";
import HRAttendance from "./attendance_service/pages/HRAttendance";
import Notifications from "./notification_service/pages/Notifications";

import HRProjectDashboard from "./project_service/pages/HRProjectDashboard";
import HRProjectList from "./project_service/pages/HRProjectList";
import CreateProject from "./project_service/pages/CreateProject";
import EditProject from "./project_service/pages/EditProject";
import HRProjectDetails from "./project_service/pages/HRProjectDetails";
import ProjectRoles from "./project_service/pages/ProjectRoles";
import MyProjects from "./project_service/pages/MyProjects";

import HRAnnouncements from "./announcement_service/components/HRAnnouncements";
import EmployeeAnnouncements from "./announcement_service/components/EmployeeAnnouncements";

import SubmitWorkReport from "./work_report_service/pages/SubmitWorkReport";
import MyWorkReports from "./work_report_service/pages/MyWorkReports";
import HRWorkReports from "./work_report_service/pages/HRWorkReports";

import SubmitComplaint from "./complaint_service/pages/SubmitComplaint";
import MyComplaints from "./complaint_service/pages/MyComplaints";
import HRComplaints from "./complaint_service/pages/HRComplaints";
import HRComplaintCategories from "./complaint_service/pages/HRComplaintCategories";

import MyPerformance from "./performance_service/pages/MyPerformance";
import HRPerformanceDashboard from "./performance_service/pages/HRPerformanceDashboard";
import HRPerformanceReviews from "./performance_service/pages/HRPerformanceReviews";
import HRGoals from "./performance_service/pages/HRGoals";

import ProtectedRoute from "./authentication_service/routes/ProtectedRoute";
import RoleProtectedRoute from "./authentication_service/routes/RoleProtectedRoute";
import PublicOnlyRoute from "./authentication_service/routes/PublicOnlyRoute";



function App() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            PUBLIC / ANONYMOUS ONLY ROUTES
            Redirects authenticated users to their dashboard
        ===================================================== */}

        <Route element={<PublicOnlyRoute />}>
          <Route
            path="/"
            element={<Welcome />}
          />

          <Route
            path="/login"
            element={<Login />}
          />
        </Route>

        {/* =====================================================
            NORMAL PROTECTED ROUTES
        ===================================================== */}

        <Route element={<ProtectedRoute />}>

          {/* =================================================
              HR ROUTES
          ================================================= */}

          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["HR"]}
              />
            }
          >
            <Route
              path="/hr/dashboard"
              element={<HRDashboard />}
            />
            <Route
              path="/hr/profile"
              element={<HRProfile editMode={false} />}
            />
            <Route
              path="/hr/profile/edit"
              element={<HRProfile editMode={true} />}
            />
            <Route
              path="/hr/employees"
              element={<EmployeeList />}
            />
            <Route
              path="/hr/employees/new"
              element={<CreateEmployee />}
            />
            <Route
              path="/hr/employees/create"
              element={<CreateEmployee />}
            />
            <Route
              path="/hr/employees/:id"
              element={<EmployeeDetails />}
            />
            <Route
              path="/hr/employees/:id/edit"
              element={<EditEmployee />}
            />
            <Route
              path="/hr/audit-logs"
              element={<AuditLogs />}
            />
            <Route
              path="/hr/attendance"
              element={<HRAttendance />}
            />
            <Route
              path="/hr/leaves"
              element={<HRLeave />}
            />
            <Route
              path="/hr/leave-types"
              element={<LeaveTypes />}
            />
            <Route
              path="/hr/leave-balances"
              element={<LeaveBalances />}
            />
            <Route
              path="/hr/projects"
              element={<HRProjectDashboard />}
            />
            <Route
              path="/hr/projects/list"
              element={<HRProjectList />}
            />
            <Route
              path="/hr/projects/create"
              element={<CreateProject />}
            />
            <Route
              path="/hr/projects/:id"
              element={<HRProjectDetails />}
            />
            <Route
              path="/hr/projects/:id/edit"
              element={<EditProject />}
            />
            <Route
              path="/hr/project-roles"
              element={<ProjectRoles />}
            />
            <Route
              path="/hr/announcements"
              element={<HRAnnouncements />}
            />
            <Route
              path="/hr/work-reports"
              element={<HRWorkReports />}
            />
            <Route
              path="/hr/complaints"
              element={<HRComplaints />}
            />
            <Route
              path="/hr/complaint-categories"
              element={<HRComplaintCategories />}
            />
            <Route
              path="/hr/performance"
              element={<HRPerformanceDashboard />}
            />
            <Route
              path="/hr/performance/reviews"
              element={<HRPerformanceReviews />}
            />
            <Route
              path="/hr/performance/goals"
              element={<HRGoals />}
            />
          </Route>

          {/* =================================================
              EMPLOYEE ROUTES
          ================================================= */}

          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["EMPLOYEE"]}
              />
            }
          >
            <Route
              path="/employee/dashboard"
              element={<EmployeeDashboard />}
            />
            <Route
              path="/employee/profile"
              element={<MyProfile />}
            />
            <Route
              path="/employee/attendance"
              element={<Attendance />}
            />
            <Route
              path="/employee/leave"
              element={<Leave />}
            />
            <Route
              path="/employee/projects"
              element={<MyProjects />}
            />
            <Route
              path="/employee/announcements"
              element={<EmployeeAnnouncements />}
            />
            <Route
              path="/employee/work-reports"
              element={<MyWorkReports />}
            />
            <Route
              path="/employee/work-reports/new"
              element={<SubmitWorkReport />}
            />
            <Route
              path="/employee/work-reports/submit"
              element={<SubmitWorkReport />}
            />
            <Route
              path="/employee/complaints"
              element={<MyComplaints />}
            />
            <Route
              path="/employee/complaints/new"
              element={<SubmitComplaint />}
            />
            <Route
              path="/employee/complaints/submit"
              element={<SubmitComplaint />}
            />
            <Route
              path="/employee/performance"
              element={<MyPerformance />}
            />
            <Route
              path="/employee/performance/goals"
              element={<MyPerformance />}
            />
          </Route>


          {/* =================================================
              SHARED AUTHENTICATED ROUTES
          ================================================= */}

          <Route
            path="/notifications"
            element={<Notifications />}
          />

        </Route>


      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={theme}
      />

    </BrowserRouter>
  );
}

export default App;