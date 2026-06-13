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
  { id: "users", label: "User Management", icon: Users },
  { id: "sites", label: "Site Management", icon: MapPin },
  { id: "contractors", label: "Contractor Management", icon: Briefcase },
  { id: "categories", label: "Category Management", icon: Shapes },
  { id: "supervisor-credit", label: "Supervisor Credit", icon: ReceiptIndianRupee },
  { id: "expenses", label: "Income & Expense", icon: ReceiptIndianRupee },
  { id: "attendance", label: "Attendance", icon: Calendar },
  { id: "reports", label: "Reports", icon: FileText },
];

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("users");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const activeItem = menuItems.find((item) => item.id === activeTab);

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
    <div className="flex h-dvh overflow-hidden bg-[#F6F5FF] font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-35 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 w-[300px] transform bg-white border-r border-[#E5E9F1] transition-transform duration-300 md:static md:translate-x-0 flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Sidebar Logo Header */}
        <div className="flex h-[88px] items-center justify-between border-b border-[#E5E9F1] px-8 shrink-0">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="HRL Projects" className="h-16 object-contain" />
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1.5 p-6">
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
                className="flex w-full items-center gap-3.5 rounded-lg px-4 py-3.5 transition-all font-sans font-medium text-sm"
                style={{
                  backgroundColor: isActive ? "#3D35BE" : "transparent",
                  color: isActive ? "white" : "#5B6065",
                }}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-[#717579]"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header - Desktop & Mobile */}
        <header className="flex h-[88px] items-center justify-between border-b border-[#E5E9F1] bg-white px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-[22px] font-bold text-[#353535] font-sans leading-none">
              {activeItem ? activeItem.label : "User Management"}
            </h2>
          </div>

          {/* User profile and logout dropdown on the right */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Profile Dropdown Trigger */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-sm focus:outline-none"
                style={{ 
                  background: 'linear-gradient(86deg, #3C368D 0%, #857FF4 100%)',
                  outline: '1px #6862CF solid',
                  outlineOffset: '-1px'
                }}
              >
                <span>{user.name?.slice(0, 2).toUpperCase()}</span>
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <>
                  {/* Invisible Backdrop to close the dropdown when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    onClick={() => setIsProfileOpen(false)}
                  />
                  
                  {/* Dropdown Box */}
                  <div className="absolute right-0 mt-2.5 w-64 origin-top-right rounded-xl border border-[#E5E9F1] bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Profile Card inside Dropdown */}
                    <div className="mb-3 flex items-center gap-3 rounded-lg bg-[#F6F5FF] border border-[#EBE9FD] px-4 py-3 select-none">
                      <div 
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold shadow-sm"
                        style={{ background: 'linear-gradient(86deg, #3C368D 0%, #857FF4 100%)' }}
                      >
                        <span>{user.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800 leading-normal">{user.name}</p>
                        <p className="truncate text-xs capitalize text-gray-500 font-medium leading-normal">{user.role}</p>
                      </div>
                    </div>

                    {/* Action Link: Logout */}
                    <div className="border-t border-[#E5E9F1] pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onLogout();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[#5B6065] transition-colors hover:bg-red-50 hover:text-red-600 font-sans font-semibold text-sm"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto bg-[#F6F5FF]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
