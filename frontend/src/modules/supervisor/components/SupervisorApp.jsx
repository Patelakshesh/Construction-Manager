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
    <div className="flex h-dvh flex-col bg-gray-50">
      <div className="border-b border-gray-700 bg-[#2B2D33] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 flex-1">
            <h2 className="truncate text-lg text-white font-semibold hidden md:block">
              Supervision Portal
            </h2>
            <div className="flex items-center gap-1.5 bg-[#3F4149]/60 rounded-md px-2.5 py-1 text-gray-300 shrink-0">
              <MapPin className="h-3.5 w-3.5 text-[#3D36BE] shrink-0" />
              {isLoading ? (
                <span className="text-xs">Loading...</span>
              ) : (
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  {selectedSite ? selectedSite.siteName : "No Site Assigned"}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg p-2 transition-colors hover:bg-[#4A4D57] shrink-0"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
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
