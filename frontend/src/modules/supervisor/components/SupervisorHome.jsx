import { useState, useEffect } from "react";
import {
  Calendar,
  Receipt,
  ReceiptIndianRupee,
  TrendingDown,
} from "lucide-react";
import apiClient from "../../../shared/services/apiClient";
import toast from "react-hot-toast";

function SupervisorHome({ selectedSite, user }) {
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Hardcoded for now until budget is dynamically retrieved from site
  const totalBudget = 500000;

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!selectedSite) return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem("authToken");

        const expensesResponse = apiClient.post(
          "/graphql",
          {
            query: `
              query GetRecentExpenses($pageSize: Int!, $siteId: Int) {
                expensesPage(pageNumber: 1, pageSize: $pageSize, siteId: $siteId) {
                  items {
                    id
                    amount
                    category { name }
                    date
                    title
                    siteId
                  }
                }
              }
            `,
            variables: { pageSize: 1000, siteId: parseInt(selectedSite.id) },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const attendanceResponse = apiClient.post(
          "/graphql",
          {
            query: `
              query GetRecentAttendance($pageSize: Int!, $siteId: Int) {
                attendancesPage(pageNumber: 1, pageSize: $pageSize, siteId: $siteId) {
                  items {
                    id
                    date
                    skilledWorkers
                    semiSkilledWorkers
                    unskilledWorkers
                    contractor { contractorName }
                    siteId
                  }
                }
              }
            `,
            variables: { pageSize: 5, siteId: parseInt(selectedSite.id) },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const [expensesRes, attendanceRes] = await Promise.all([expensesResponse, attendanceResponse]);

        // Process Expenses for the selected site
        if (expensesRes.data?.data?.expensesPage?.items) {
          const siteExpenses = expensesRes.data.data.expensesPage.items;
          const total = siteExpenses.reduce((sum, e) => sum + e.amount, 0);
          setTotalExpenses(total);
          setRecentExpenses(siteExpenses.slice(0, 5));
        }

        // Process Attendance for the selected site
        if (attendanceRes.data?.data?.attendancesPage?.items) {
          setRecentAttendance(attendanceRes.data.data.attendancesPage.items);
        }

      } catch (error) {
        toast.error(error?.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedSite]);

  const remaining = totalBudget - totalExpenses;
  const budgetPercentage = Math.min((totalExpenses / totalBudget) * 100, 100).toFixed(1);

  if (!selectedSite) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-gray-500">
        Please select a site from the top menu to view the dashboard.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-gray-900">Budget Overview</h3>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 font-medium">
            {selectedSite.siteName}
          </span>
        </div>

        <div className="space-y-4">
          <div
            className="flex items-center justify-between rounded-lg p-4"
            style={{ backgroundColor: "#3D36BE20" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ backgroundColor: "#3D36BE" }}
              >
                <ReceiptIndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Site Budget</p>
                <h3 className="text-gray-900">
                  ₹{totalBudget.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <h3 className="text-gray-900">
                  ₹{totalExpenses.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <ReceiptIndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <h3 className="text-gray-900">₹{remaining.toLocaleString("en-IN")}</h3>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-600">Budget Used</span>
              <span className="text-gray-900 font-medium">{budgetPercentage}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${budgetPercentage}%`,
                  backgroundColor: budgetPercentage >= 100 ? "#DC2626" : budgetPercentage > 80 ? "#F59E0B" : "#10B981"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-gray-900">Recent Expenses</h3>
          <ReceiptIndianRupee className="h-5 w-5 text-gray-400" />
        </div>
        <div className="divide-y divide-gray-200">
          {recentExpenses.length === 0 ? (
             <div className="p-4 text-center text-sm text-gray-500">No expenses recorded for this site yet.</div>
          ) : (
            recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-gray-900 font-medium">{expense.title || "No description"}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-2 py-1 text-xs"
                        style={{ backgroundColor: "#3D36BE20", color: "#3D36BE" }}
                      >
                        {expense.category?.name || "Uncategorized"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    ₹{expense.amount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-gray-900">Recent Attendance</h3>
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <div className="divide-y divide-gray-200">
          {recentAttendance.length === 0 ? (
             <div className="p-4 text-center text-sm text-gray-500">No attendance recorded for this site yet.</div>
          ) : (
            recentAttendance.map((record) => {
              const totalWorkers = (record.skilledWorkers || 0) + 
                                   (record.semiSkilledWorkers || 0) + 
                                   (record.unskilledWorkers || 0);
              return (
                <div
                  key={record.id}
                  className="p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-gray-900 font-medium">{record.contractor?.contractorName || "Unknown Contractor"}</p>
                      <p className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-semibold">{totalWorkers} workers</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default SupervisorHome;
