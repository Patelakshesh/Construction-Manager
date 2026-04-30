import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginScreen from "../modules/auth/components/LoginScreen";

const AdminDashboard = lazy(
  () => import("../modules/admin/components/AdminDashboard"),
);
const SupervisorApp = lazy(
  () => import("../modules/supervisor/components/SupervisorApp"),
);

function DashboardLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 text-gray-700 shadow-sm">
        Loading dashboard...
      </div>
    </div>
  );
}

function AppRouter() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (role, user) => {
    setCurrentUser({ ...user, role });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const defaultPath = currentUser.role === "admin" ? "/admin" : "/supervisor";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultPath} replace />} />
      <Route
        path="/admin"
        element={
          currentUser.role === "admin" ? (
            <Suspense fallback={<DashboardLoader />}>
              <AdminDashboard user={currentUser} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/supervisor" replace />
          )
        }
      />
      <Route
        path="/supervisor"
        element={
          currentUser.role === "supervisor" ? (
            <Suspense fallback={<DashboardLoader />}>
              <SupervisorApp user={currentUser} onLogout={handleLogout} />
            </Suspense>
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
}

export default AppRouter;
