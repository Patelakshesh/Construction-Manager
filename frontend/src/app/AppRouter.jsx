import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginScreen from "../modules/auth/components/LoginScreen";
import toast from "react-hot-toast";

const AdminDashboard = lazy(
  () => import("../modules/admin/components/AdminDashboard"),
);
const SupervisorApp = lazy(
  () => import("../modules/supervisor/components/SupervisorApp"),
);

function DashboardLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F5F5F5]">
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 text-gray-700 shadow-sm">
        Loading dashboard...
      </div>
    </div>
  );
}

// Read auth from localStorage synchronously so there is no flash/delay on first render
function getInitialUser() {
  try {
    const token = localStorage.getItem("authToken");
    const raw = localStorage.getItem("authUser");
    if (!token || !raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function AppRouter() {
  const [currentUser, setCurrentUser] = useState(getInitialUser);

  const checkTokenExpiry = () => {
    const expiresOn = localStorage.getItem("authExpiresOn");
    if (expiresOn) {
      const expiryTime = new Date(expiresOn).getTime();
      const currentTime = new Date().getTime();
      if (currentTime >= expiryTime) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        localStorage.removeItem("authExpiresOn");
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("authUser");
        sessionStorage.removeItem("authExpiresOn");
        setCurrentUser(null);
        toast.error("Session expired. Please login again.");
      }
    }
  };

  useEffect(() => {
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 5000);

    // Handle cross-tab logout (storage event) and 401 logout (auth:logout event)
    const syncAuth = () => {
      const token = localStorage.getItem("authToken");
      const raw = localStorage.getItem("authUser");
      if (!token || !raw) {
        setCurrentUser(null);
        return;
      }
      try {
        setCurrentUser(JSON.parse(raw));
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth:logout", syncAuth);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth:logout", syncAuth);
    };
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
