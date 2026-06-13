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
    return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  }


  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Dashboard Overview
          </h1>
          <p className="text-gray-600">
            Welcome back! Here&apos;s what&apos;s happening with your
            construction sites.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
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
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D36BE]"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="tillDate">Till Date</option>
          </select>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#3D36BE20" }}
            >
              <ReceiptIndianRupee
                className="h-6 w-6"
                style={{ color: "#3D36BE" }}
              />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>100%</span>
            </div>
          </div>
          <h3 className="mb-1 text-gray-900">₹{totalBudget?.toLocaleString() || 0}</h3>
          <p className="text-sm text-gray-500">Total Budget</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span>{spentPercentage}%</span>
            </div>
          </div>
          <h3 className="mb-1 text-gray-900">₹{totalExpenses?.toLocaleString() || 0}</h3>
          <p className="text-sm text-gray-500">Total Expenses</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <ReceiptIndianRupee className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>{remainingPercentage}%</span>
            </div>
          </div>
          <h3 className="mb-1 text-gray-900">₹{remainingBudget?.toLocaleString() || 0}</h3>
          <p className="text-sm text-gray-500">Remaining Budget</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#2B2D3320" }}
            >
              <MapPin className="h-6 w-6" style={{ color: "#2B2D33" }} />
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <h3 className="mb-1 text-gray-900">{dashboardData?.activeSites || 0}</h3>
          <p className="text-sm text-gray-500">Active Sites</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-gray-900">Expense Trends</h3>
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
                stroke="#EF4444"
                strokeWidth={2}
                name="Expenses"
              />
              <Line
                type="monotone"
                dataKey="budget"
                stroke="#3D36BE"
                strokeWidth={2}
                name="Budget"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-gray-900">Budget vs Actual by Site</h3>
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
                  <Bar dataKey="budget" fill="#3D36BE" name="Budget" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#EF4444" name="Actual Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="p-4 transition-colors hover:bg-gray-50 md:p-6"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span
                      className="rounded-full px-3 py-1 text-sm"
                      style={{ backgroundColor: "#3D36BE20", color: "#3D36BE" }}
                    >
                      {activity.action}
                    </span>
                    <span className="text-gray-900">{activity.site}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {activity.amount && (
                      <span>Amount: ₹{activity.amount.toLocaleString()}</span>
                    )}
                    {activity.workers && (
                      <span>Workers: {activity.workers}</span>
                    )}
                    <span>By: {activity.user}</span>
                  </div>
                </div>
                <span className="text-sm text-gray-400">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
}

export default DashboardHome;




