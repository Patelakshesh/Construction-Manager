import { useState } from "react";
import { Home, LogOut, ReceiptIndianRupee, Users } from "lucide-react";
import logoImage from "../../../assets/logo.png";
import AttendanceManagement from "./AttendanceManagement";
import ExpenseManagement from "./ExpenseManagement";
import SupervisorHome from "./SupervisorHome";

const menuItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "expenses", label: "Expenses", icon: ReceiptIndianRupee },
  { id: "attendance", label: "Attendance", icon: Users },
];

function SupervisorApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <div className="border-b border-gray-700 bg-[#2B2D33] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoImage} alt="BuildManager logo" className="h-14 w-14 rounded-lg object-contain shrink-0" />
            <div className="min-w-0">
              <h2 className="truncate text-lg text-white">
                {user.assignedSite}
              </h2>
              <p className="truncate text-sm text-gray-400">Supervision Dashboard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg p-2 transition-colors hover:bg-[#4A4D57]"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24 md:pb-6">
        {activeTab === "home" && <SupervisorHome site={user.assignedSite} />}
        {activeTab === "expenses" && (
          <ExpenseManagement site={user.assignedSite} />
        )}
        {activeTab === "attendance" && (
          <AttendanceManagement site={user.assignedSite} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-2 py-3 safe-area-bottom md:sticky md:bottom-auto">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors"
                style={{ color: isActive ? "#3D36BE" : "#6B7280" }}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SupervisorApp;
