import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  MapPin,
  ReceiptIndianRupee,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import apiClient from "../../../shared/services/apiClient";

function DashboardHome() {
  const [filterSite, setFilterSite] = useState("all");
  const [filterDate, setFilterDate] = useState("last7days");
  const [siteOptions, setSiteOptions] = useState(["all"]);
  
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [filterSite, filterDate]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post(
        "/graphql",
        {
          query: `
            query GetDashboard($dateFilter: String, $siteName: String) {
              dashboardStats(dateFilter: $dateFilter, siteName: $siteName) {
                totalBudget
                totalExpenses
                remainingBudget
                activeSites
                expenseTrends {
                  month
                  expenses
                  budget
                }
                budgetComparisons {
                  site
                  budget
                  actual
                }
              }
            }
          `,
          variables: {
            dateFilter: filterDate,
            siteName: filterSite
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response?.data?.data?.dashboardStats) {
        const stats = response.data.data.dashboardStats;
        setDashboardData(stats);
        if (siteOptions.length <= 1 && stats.budgetComparisons) {
          const loadedSites = stats.budgetComparisons.map((i) => i.site) || [];
          setSiteOptions(["all", ...new Set(loadedSites)]);
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard data", error);
      toast.error(error?.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const sites = siteOptions;

  const totalBudget = dashboardData?.totalBudget || 0;
  const totalExpenses = dashboardData?.totalExpenses || 0;
  const remainingBudget = dashboardData?.remainingBudget || 0;

  const spentPercentage = totalBudget > 0 ? ((totalExpenses / totalBudget) * 100).toFixed(1) : "0.0";
  const remainingPercentage = totalBudget > 0 ? ((remainingBudget / totalBudget) * 100).toFixed(1) : "0.0";

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 font-sans">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F6F5FF] font-sans">
      {/* Date Filters */}
      <div className="mb-8 flex justify-end w-full">
        <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:flex-row sm:items-center sm:w-auto">
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="rounded-lg border border-[#C8D9EF] bg-white px-4 py-2.5 text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans font-medium w-full"
          >
            {sites.map((site) => (
              <option key={site} value={site}>
                {site === "all" ? "All Sites" : site}
              </option>
            ))}
          </select>

          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-lg border border-[#C8D9EF] bg-white px-4 py-2.5 text-sm text-[#717579] focus:outline-none focus:ring-2 focus:ring-[#3D35BE] font-sans font-medium w-full"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="tillDate">Till Date</option>
          </select>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Budget Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3D35BE 0deg, #3C378B 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <ReceiptIndianRupee className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[28px] font-bold text-[#353535] leading-none">₹{totalBudget?.toLocaleString() || 0}</span>
            <span className="text-sm text-[#4E5159] font-normal">Total Income</span>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #F15F7F 0deg, #F15F7F 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[28px] font-bold text-[#353535] leading-none">₹{totalExpenses?.toLocaleString() || 0}</span>
            <span className="text-sm text-[#4E5159] font-normal">Total Expenses ({spentPercentage}%)</span>
          </div>
        </div>

        {/* Remaining Budget Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #01B6A8 0deg, #01B6A8 360deg)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[28px] font-bold text-[#353535] leading-none">₹{remainingBudget?.toLocaleString() || 0}</span>
            <span className="text-sm text-[#4E5159] font-normal">Remaining Fund ({remainingPercentage}%)</span>
          </div>
        </div>

        {/* Active Sites Card */}
        <div className="flex flex-1 gap-6 p-6 bg-white rounded-lg border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]">
          <div 
            className="p-2 rounded-lg shadow-[2px_4px_10px_rgba(0,38,73.56,0.25)] border border-[#EBE9FD] flex items-center justify-center shrink-0" 
            style={{ 
              width: 56, 
              height: 56, 
              background: 'conic-gradient(from 134deg at 50.00% 50.00%, #3C368D 0deg, #857FF4 100%)' 
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[28px] font-bold text-[#353535] leading-none">{dashboardData?.activeSites || 0}</span>
            <span className="text-sm text-[#4E5159] font-normal">Active Sites</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Expense Trends */}
        <div 
          className="bg-white flex flex-col gap-5 border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]" 
          style={{ 
            padding: 24,
            borderTopRightRadius: 20, 
            borderBottomRightRadius: 20, 
            borderBottomLeftRadius: 20 
          }}
        >
          <h3 className="text-xl font-bold text-[#353535] font-sans">Expense Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData?.expenseTrends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#F15F7F"
                strokeWidth={3}
                name="Expenses"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="budget"
                stroke="#3D35BE"
                strokeWidth={3}
                name="Budget"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Budget vs Actual by Site */}
        <div 
          className="bg-white flex flex-col gap-5 border border-[#EBE9FD] shadow-[0px_2px_10px_#D9DAE2]" 
          style={{ 
            padding: 24,
            borderTopRightRadius: 20, 
            borderBottomRightRadius: 20, 
            borderBottomLeftRadius: 20 
          }}
        >
          <h3 className="text-xl font-bold text-[#353535] font-sans">Budget vs Actual by Site</h3>
          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: Math.max(600, (dashboardData?.budgetComparisons?.length || 0) * 120), height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData?.budgetComparisons || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="site"
                    stroke="#6B7280"
                    angle={-20}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="budget" fill="#3D35BE" name="Budget" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#F15F7F" name="Actual Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
