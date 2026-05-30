import { useState } from "react";
import {
  Calendar,
  Briefcase,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ReceiptIndianRupee,
  Shapes,
  Users,
  X,
} from "lucide-react";
import logoImage from "../../../assets/logo.png";
import Attendance from "./Attendance";
import Category from "./Category";
import DashboardHome from "./DashboardHome";
import Contractor from "./Contractor";
import Reports from "./Reports";
import Expenses from "./Expenses";
import SiteManagement from "./SiteManagement";
import SupervisorCredit from "./SupervisorCredit";
import UserManagement from "./UserManagement";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "User", icon: Users },
  { id: "sites", label: "Site", icon: MapPin },
  { id: "contractors", label: "Contractor", icon: Briefcase },
  { id: "categories", label: "Category", icon: Shapes },
  { id: "supervisor-credit", label: "Supervisor Credit", icon: ReceiptIndianRupee },
  { id: "expenses", label: "Income/Expense", icon: ReceiptIndianRupee },
  { id: "attendance", label: "Attendance", icon: Calendar },
  { id: "reports", label: "Reports", icon: FileText },
];

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    if (activeTab === "dashboard") return <DashboardHome />;
    if (activeTab === "sites") return <SiteManagement />;
    if (activeTab === "users") return <UserManagement />;
    if (activeTab === "attendance") return <Attendance />;
    if (activeTab === "contractors") return <Contractor />;
    if (activeTab === "categories") return <Category />;
    if (activeTab === "supervisor-credit") return <SupervisorCredit />;
    if (activeTab === "expenses") return <Expenses />;
    return <Reports />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F5]">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-[#2B2D33] transition-transform duration-300 md:static md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#4A4D57] p-6 md:justify-start">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-white">Admin Portal</h1>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg p-2 text-gray-300 hover:bg-[#4A4D57] md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-2 p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors"
                  style={{
                    backgroundColor: isActive ? "#3D36BE" : "transparent",
                    color: isActive ? "white" : "#9CA3AF",
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-[#4A4D57] p-4">
            <div className="mb-2 flex items-center gap-3 rounded-lg bg-[#4A4D57] px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3D36BE]">
                <span className="text-sm font-semibold text-white">{user.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{user.name}</p>
                <p className="truncate text-xs capitalize text-gray-400">{user.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-400 transition-colors hover:bg-[#4A4D57] hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-medium text-gray-800">Admin Dashboard</p>
          <div className="h-9 w-9" />
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0">{renderContent()}</main>
      </div>
    </div>
  );
}

export default AdminDashboard;




