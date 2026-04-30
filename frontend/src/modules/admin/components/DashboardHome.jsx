import { useState } from "react";
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

const expenseData = [
  { month: "Jan", expenses: 45000, budget: 50000 },
  { month: "Feb", expenses: 52000, budget: 55000 },
  { month: "Mar", expenses: 48000, budget: 50000 },
  { month: "Apr", expenses: 61000, budget: 60000 },
  { month: "May", expenses: 55000, budget: 65000 },
  { month: "Jun", expenses: 67000, budget: 70000 },
];

const budgetComparison = [
  { site: "Downtown Plaza", budget: 500000, actual: 420000 },
  { site: "Riverside Complex", budget: 750000, actual: 680000 },
  { site: "Industrial Park", budget: 300000, actual: 310000 },
  { site: "Suburban Mall", budget: 600000, actual: 550000 },
];

const recentActivity = [
  {
    id: 1,
    action: "Expense Added",
    site: "Downtown Plaza",
    amount: 5200,
    user: "John Doe",
    time: "2 hours ago",
  },
  {
    id: 2,
    action: "Attendance Submitted",
    site: "Riverside Complex",
    workers: 25,
    user: "Jane Smith",
    time: "3 hours ago",
  },
  {
    id: 3,
    action: "Budget Updated",
    site: "Industrial Park",
    amount: 15000,
    user: "Admin",
    time: "5 hours ago",
  },
  {
    id: 4,
    action: "New Supervisor Added",
    site: "Suburban Mall",
    user: "Admin",
    time: "1 day ago",
  },
];

function DashboardHome() {
  const [filterSite, setFilterSite] = useState("all");
  const [filterDate, setFilterDate] = useState("last7days");

  const sites = ["all", ...new Set(budgetComparison.map((i) => i.site))];

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
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
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
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FDB71A]"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
          </select>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#FDB71A20" }}
            >
              <ReceiptIndianRupee
                className="h-6 w-6"
                style={{ color: "#FDB71A" }}
              />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>12%</span>
            </div>
          </div>
          <h3 className="mb-1 text-gray-900">₹2,450,000</h3>
          <p className="text-sm text-gray-500">Total Budget</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>85%</span>
            </div>
          </div>
          <h3 className="mb-1 text-gray-900">₹2,080,000</h3>
          <p className="text-sm text-gray-500">Total Expenses</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <ReceiptIndianRupee className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>15%</span>
            </div>
          </div>
          <h3 className="mb-1 text-gray-900">₹370,000</h3>
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
          <h3 className="mb-1 text-gray-900">8</h3>
          <p className="text-sm text-gray-500">Active Sites</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-gray-900">Expense Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={expenseData}>
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
                stroke="#FDB71A"
                strokeWidth={2}
                name="Budget"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-gray-900">Budget vs Actual by Site</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetComparison}>
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
              <Bar dataKey="budget" fill="#FDB71A" name="Budget" />
              <Bar dataKey="actual" fill="#2B2D33" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
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
                      style={{ backgroundColor: "#FDB71A20", color: "#FDB71A" }}
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
