import { useState, useEffect } from "react";
import { Home, LogOut, ReceiptIndianRupee, Users, MapPin } from "lucide-react";
import logoImage from "../../../assets/logo.png";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";
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
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await apiClient.post(
          "/graphql",
          {
            query: `
              query GetSites {
                sites {
                  id
                  siteName
                  contactPerson
                  enable
                }
              }
            `
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data?.data?.sites) {
          const activeSites = response.data.data.sites.filter(s => {
            if (!s.enable) return false;
            if (!s.contactPerson) return false;
            // Split the contactPerson string by comma and check if user.name is in it
            const supervisors = s.contactPerson.split(',').map(name => name.trim().toLowerCase());
            return supervisors.includes(user.name.toLowerCase());
          });
          setSites(activeSites);
          if (activeSites.length > 0) {
            setSelectedSiteId(String(activeSites[0].id));
          }
        }
      } catch (error) {
        toast.error(error?.message || "Failed to load sites");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSites();
  }, []);

  const selectedSite = sites.find(s => String(s.id) === selectedSiteId);

  return (
    <div className="flex h-dvh flex-col bg-[#F6F5FF] font-sans overflow-hidden">
      {/* Top Header - White Background, Premium Border */}
      <div className="border-b border-[#E5E9F1] bg-white p-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 flex-1">
            <h2 className="truncate text-lg text-[#353535] font-bold font-sans hidden md:block">
              Supervision Portal
            </h2>
            <div className="flex items-center gap-1.5 bg-[#F6F5FF] border border-[#EBE9FD] rounded-full px-3 py-1.5 text-gray-600 shrink-0">
              <MapPin className="h-3.5 w-3.5 text-[#3D35BE] shrink-0" />
              {isLoading ? (
                <span className="text-xs font-sans">Loading...</span>
              ) : (
                <span className="text-xs font-bold text-[#3D35BE] uppercase tracking-wider font-sans">
                  {selectedSite ? selectedSite.siteName : "No Site Assigned"}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg p-2 transition-colors hover:bg-red-50 text-[#717579] hover:text-red-600 shrink-0"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#F6F5FF]">
        <div className="pb-28 md:pb-6">
          {activeTab === "home" && <SupervisorHome selectedSite={selectedSite} user={user} />}
          {activeTab === "expenses" && (
            <ExpenseManagement selectedSite={selectedSite} user={user} />
          )}
          {activeTab === "attendance" && (
            <AttendanceManagement selectedSite={selectedSite} user={user} />
          )}
        </div>
      </div>

      <div className="border-t border-[#E5E9F1] bg-white px-2 py-2 safe-area-bottom shrink-0 md:sticky md:bottom-auto">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors font-sans"
                style={{ color: isActive ? "#3D35BE" : "#717579" }}
              >
                <Icon className={`h-6 w-6 ${isActive ? "text-[#3D35BE]" : "text-[#717579]"}`} />
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SupervisorApp;
