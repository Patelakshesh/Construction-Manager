import { lazy, Suspense, useEffect, useState } from "react";
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

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("authUser");
    if (!storedToken || !storedUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key && event.key !== "authToken" && event.key !== "authUser") {
        return;
      }

      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("authUser");
      if (!storedToken || !storedUser) {
        setCurrentUser(null);
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleLogin = (role, user) => {
    setCurrentUser({ ...user, role });
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("authExpiresOn");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    sessionStorage.removeItem("authExpiresOn");
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
